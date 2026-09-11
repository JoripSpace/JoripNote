# Notion 가져오기 정합성 전수조사

- 조사일: 2026-09-11 (KST)
- 프로젝트: `cf-notion-st`
- 운영 URL: <https://cf-notion-st.joripspace.run/>
- 기준 배포: `dep_mtwdzmcvtrab2y2y` (성공)
- 조사 방식: 운영 DB 읽기 전용 SQL 계측, 관리자 심층 감사 API, 코드/테스트 점검, 운영 브라우저 검증

## 요약

관리자 세션에서 Notion API 증분 가져오기를 완료했고, 기존 문서와 관리자 계정은 삭제하지 않았습니다. 원본 Notion ID를 upsert 키로 사용하므로 같은 데이터를 다시 가져와도 중복 문서가 생기지 않습니다.

현재 활성 스냅샷에는 **2,079개 문서**, **37개 data source**, **39개 database 블록(청크 포함)**, **1,070개 행**이 있습니다. 모든 활성 database 블록은 version 3이며, 원본과 가져온 행 수 및 뷰 구성이 일치한 data source는 37/37개 PASS입니다.

`작업 목록`은 513행을 두 저장 청크에서 한 화면의 데이터베이스로 합쳐 표시하고, 원본 뷰 순서인 `timeline → 프로젝트 → 캘린더 → board`를 유지합니다.

## 운영 계측 결과

| 항목 | 결과 | 판정 |
| --- | ---: | --- |
| 활성 문서 | 2,079 | PASS |
| 활성 data source | 37 | PASS |
| 활성 database 블록 | 39 (37개 source, 청크 포함) | PASS |
| 활성 database 모델 | version 3: 39 | PASS |
| 활성 가져오기 행 | 1,070 | PASS |
| `작업 목록` 행 / 청크 | 513 / 2 | PASS |
| `팀 작업` 행 / 청크 | 404 / 2 | PASS |
| 심층 원격 행 합계 | 1,070 | PASS |
| 심층 감사 data source | 37 PASS · 0 WARN · 0 FAIL | PASS |

심층 감사 API는 `GET /api/import/notion-api/audit?deep=1`이며 관리자 세션이 필요합니다. 감사 결과는 원본 data source의 행 수, 속성 수/타입, 뷰 ID·이름·순서·종류와 저장된 version 3 모델을 비교합니다. 감사 SQL은 과거 스냅샷을 제외하고 각 문서의 `active_snapshot_id`만 집계하도록 수정했습니다.

## 구현된 정합성 개선

- Notion Views API `GET /v1/views?data_source_id=...` 및 `GET /v1/views/{view_id}` 페이지네이션·상세 조회
- `table`, `board`, `calendar`, `timeline`, `gallery`, `list` 뷰 이름·순서·필터·정렬·quick filters·configuration 보존
- version 2 파서와 version 3 모델의 호환, 원본 ID·`last_edited_time` 기반 증분 upsert
- 저장 용량 때문에 나뉜 database 청크를 편집기에서 하나의 데이터베이스로 합쳐 표시하고 저장 시 다시 분할
- 원본 기본 뷰 및 calendar `date_property_id` 복원
- 월간 42칸 캘린더, 이전/다음/오늘, 시작일·종료일 범위, 날짜 없음 목록, 화면 밖 날짜 구분
- 카드·캘린더 일정 클릭 시 `source_id` 기반 가져온 원본 페이지(`/doc/doc_notion_<id>`) 열기
- title/rich_text/number/select/multi_select/status/date/checkbox/url/email/phone/people/files/relation/rollup/formula/unique_id 및 생성·수정 메타 타입 보존
- 담당자 UUID를 카드 폭에 노출하지 않고 `사용자 정보 권한 필요` 상태로 표시
- 보드 내부 가로 스크롤, 긴 제목 2줄 말줄임, 좁은 화면 툴바 줄바꿈, 100개 초과 카드 점진 표시
- “보드에서 제거”는 그룹 값만 비우며 원본 문서 삭제와 분리
- 사용자 화면의 전체 API 가져오기 버튼은 숨기고 관리자 내부 실행 경로만 유지
- Notion의 `feed`처럼 상세 API가 400을 반환하는 뷰도 목록 메타데이터를 보존해 전체 가져오기를 중단하지 않음

## 실제 운영 검증

- `작업 목록`: database-block 1개, `513개 작업 · 4개 뷰` 확인
- 캘린더 탭: `2026년 9월`, 이벤트 30건, 날짜 없음 31건 확인
- `김세헌 주간 목표` 일정 클릭: `/doc/doc_notion_3cdc7b1cfe21809088ecde2760340f22`로 이동 확인
- `김태윤 주간 목표`, `송시한 주간 목표`의 `2026-09-07 → 2026-09-11` 범위 표시 확인
- 담당자 값은 권한 부족 시 UUID 대신 `사용자 정보 권한 필요` 안내 표시
- 원본 Notion의 `작업 목록` 뷰 순서와 JoripNote 탭 순서 일치 확인

## 남은 WARN/FAIL 및 범위

현재 행·속성·뷰 정합성 감사에는 FAIL이 없습니다. 다만 다음은 Notion 권한/원본 응답에 의존하는 제한입니다.

1. **WARN — people 이름 권한**: integration에 사용자 조회 권한이 없으면 이름을 복원할 수 없습니다. 앱은 이를 숨기지 않고 안내하며 권한을 자동 변경하지 않습니다.
2. **WARN — 고급 Notion 동작**: 타임라인의 고급 줌/드래그, rollup 재계산, 외부 첨부파일의 영구 재호스팅은 API 응답과 스토리지 정책 범위에서 부분 지원됩니다.
3. **감사 범위 참고**: `audit`의 PASS는 data source 행·속성·뷰 저장 정합성을 뜻합니다. 페이지 본문/첨부파일/unknown block의 세부 개수는 페이지 markdown 응답과 별도 파일 저장 결과에 기록되며, 권한으로 원문을 읽지 못한 항목은 조용히 삭제하지 않고 가져오기 실패 목록으로 남깁니다.

## 테스트·배포

- `npm test`: 23/23 통과
- `npm run lint`: 통과
- `npm run build`: 통과 (`dist/worker.js`, 약 449 KB)
- 배포: `dep_mtwdzmcvtrab2y2y` / <https://cf-notion-st.joripspace.run>
- 운영 URL·캘린더·보드·원본 행 페이지 링크를 브라우저에서 확인

## Notion에서 사용자가 할 일

- 가져올 모든 페이지와 data source/database를 해당 integration에 공유
- 담당자 이름을 표시하려면 Notion 사용자 정보 조회 권한을 별도로 승인
- 권한을 바꾼 뒤에는 운영 URL의 관리자 세션에서 내부 증분 가져오기를 다시 실행

재가져오기는 기존 문서와 첨부파일을 원본 ID 및 `last_edited_time`으로 재사용하며, 관리자 계정이나 기존 문서를 삭제하지 않습니다.
