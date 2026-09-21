# 편집 엔진 단계적 마이그레이션

## 호환 원칙

- 기존 `/api/documents/*`와 운영 URL을 유지한다.
- 기존 블록 JSON을 legacy adapter로 읽는다.
- 원본 Notion ID와 문서 ID를 변경하지 않는다.
- dry-run 감사 없이 기존 데이터를 일괄 삭제하거나 재생성하지 않는다.

## 단계

1. canonical snapshot과 registry를 병행 도입한다.
2. 새 importer는 snapshot을 만들고 기존 API 저장 형식으로 내린다.
3. paragraph/heading/list/todo부터 registry 렌더러로 교체한다.
4. table/database view를 같은 data source projection으로 통합한다.
5. selection, command, undo/redo를 연결한다.
6. 남은 legacy 경로를 감사 보고서로 분류하고 제거 여부를 결정한다.
