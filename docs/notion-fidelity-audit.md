# Notion 가져오기 정합성 전수조사

- 조사일: 2026-09-11 (KST)
- 프로젝트: `cf-notion-st`
- 운영 URL: <https://cf-notion-st.joripspace.run/>
- 기준 배포: `dep_mtwcnk5pts5bq94j` (version 24)
- 조사 방식: 운영 DB 읽기 전용 SQL 계측 + 코드/테스트 정적 점검

## 요약

현재 운영 DB에는 활성 문서 1,787개, 활성 블록 64,006개, 데이터베이스 블록 73개가 있습니다. 73개 데이터베이스 블록은 모두 기존 version 2 스냅샷이며 version 3 스냅샷은 아직 없습니다. 따라서 이번 배포에서 구현한 Notion Views API·캘린더·속성 보존 코드는 배포되었지만, 기존 데이터에 실제 뷰 구성을 채우려면 관리자 내부 증분 재가져오기를 한 번 실행해야 합니다.

기존 문서와 관리자 계정은 삭제하지 않았습니다. 재가져오기는 원본 Notion ID를 키로 upsert하고 `last_edited_time`이 바뀐 항목만 갱신하도록 구현되어 있습니다.

## 운영 계측 결과

| 항목 | 결과 | 판정 |
| --- | ---: | --- |
| 활성 문서 | 1,787 | PASS |
| 활성 블록 | 64,006 | PASS |
| 데이터베이스 블록 | 73 | PASS |
| version 2 데이터베이스 | 73 | WARN (기존 스냅샷) |
| version 3 데이터베이스 | 0 | WARN (재가져오기 필요) |
| 기존 가져오기 행 수 | 약 2,219 | WARN (기존 500행 청크 포함) |
| 보드 강제 변환 | 기존 데이터에서 72/73로 관측 | WARN (v3 재가져오기 전) |
| 날짜 속성 데이터베이스 후보 | 최소 12 | WARN (원본 뷰 확인 전) |

## 데이터소스별 감사 항목

새 관리자 내부 엔드포인트 `GET /api/import/notion-api/audit?deep=0|1`가 모든 접근 가능한 Notion data source를 페이지네이션하여 다음을 JSON으로 반환합니다.

- 원본 data source/database ID, 원본·가져온 행 수
- 전체 속성 이름·ID·원본 타입과 축약/누락 여부
- 뷰 이름·순서·종류, filter·sorts·quick filters·group·configuration
- 캘린더 date property와 날짜 범위
- 본문·첨부파일·truncated/unknown block
- relation·rollup·formula·people·files 손실 가능성
- 데이터소스별 PASS/WARN/FAIL 및 원인

이 엔드포인트는 관리자/소유자 세션이 필요합니다. 비인증 운영 요청은 401로 거부되는 것을 확인했습니다. 브라우저의 관리자 세션에서 한 번 실행하면 원격 Notion API의 실제 뷰/행 수가 `audit` JSON에 채워집니다.

## 구현된 정합성 개선

- Notion Views API `GET /v1/views?data_source_id=...`와 `GET /v1/views/{view_id}` 페이지네이션 및 상세 조회
- database model version 3 저장과 version 2 호환 파서
- table/board/calendar/timeline/gallery/list 뷰 타입, 이름, 순서, filter, sorts, quick filters, configuration 보존
- 원본 기본 뷰 및 calendar `date_property_id` 복원
- 날짜 시작일·종료일·시간대 보존, 월간 42칸 캘린더, 범위 일정 막대, 날짜 없는 항목, 이전/다음/오늘
- 카드 클릭 시 원본 Notion ID 기반 JoripNote 문서 연결
- title/rich_text/number/select/multi_select/status/date/checkbox/url/email/phone/people/files/relation/rollup/formula/unique_id 및 생성·수정 메타 타입 보존
- 사람 UUID를 카드 폭에 노출하지 않고 권한 부족 상태를 표시
- 100개 초과 보드 열의 점진 표시, 내부 가로 스크롤, 긴 제목 말줄임, 좁은 화면 툴바 줄바꿈
- 보드에서 제거와 원본 문서 삭제 분리
- 기존 원본 ID·`last_edited_time` 기반 증분 upsert, 429/5xx bounded retry
- 사용자 화면의 전체 API 가져오기 버튼은 다시 노출하지 않고 관리자 내부 경로만 유지

## 남은 WARN/FAIL

1. **WARN — 기존 73개 데이터베이스가 아직 v2**: 관리자 내부 증분 재가져오기를 실행해야 실제 Notion 뷰 탭과 캘린더 구성이 저장됩니다.
2. **WARN — 원격 뷰/속성별 실측 미완료**: 관리자 세션으로 audit endpoint를 실행하기 전에는 Notion 권한 범위와 실제 Views API 응답을 확정할 수 없습니다.
3. **WARN — people 이름 권한**: Notion integration에 사용자 조회 권한이 없으면 이름 대신 `사용자 정보 권한 필요` 상태가 표시됩니다. 권한을 자동 변경하지 않습니다.
4. **WARN — Notion이 제공하지 않는 기능**: 타임라인의 고급 줌/드래그, rollup 재계산, 외부 첨부파일 재호스팅 등은 원본 응답 범위에 따라 부분 지원되며 audit 결과에 명시됩니다.

## 검증 결과

- `npm test`: 22/22 통과
- `npm run lint`: 통과
- `npm run build`: 통과 (`dist/worker.js` 생성)
- 운영 루트: HTTP 200
- 운영 JS: calendar renderer 및 새 캐시 버전 확인
- audit endpoint: 비인증 요청 HTTP 401 (관리자 세션 보호 확인)

## 다음 실행

관리자 계정으로 로그인한 브라우저에서 다음 주소를 한 번 열어 내부 증분 가져오기를 실행합니다.

<https://cf-notion-st.joripspace.run/?agent_action=notion-import>

그 후 `GET /api/import/notion-api/audit?deep=1` 결과에서 FAIL 항목을 확인하고, `작업 목록`의 캘린더 기본 뷰·범위 일정·원본 페이지 링크와 `팀 작업`의 상태 그룹 순서를 검증하면 됩니다. Notion 쪽에서는 모든 대상 페이지/데이터베이스를 integration에 공유하고, 사람 이름이 필요할 때만 사용자 정보 권한을 추가로 승인해야 합니다.
