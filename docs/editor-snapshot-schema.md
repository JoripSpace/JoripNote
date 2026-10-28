# Canonical Snapshot

문서와 외부 포맷 사이의 기준 모델은 `engine/document-model.js`의 `DocumentSnapshot`과 `BlockSnapshot`이다.

각 블록은 다음 정보를 가진다.

- `id`, `type`, `parentId`, `children`
- `props`, `inlineContent`, `content`
- `checked`, `indent_level`
- `source`: Notion page/block/data source ID와 원본 타입
- `version`

알 수 없는 블록은 삭제하지 않고 `unsupported` 타입으로 보존한다. Notion 속성과 관계형 데이터는 database data source의 `source_id`, `sourceType`, `sourceId`에 유지한다.

## Notion API 원본 트리

Notion API에서 가져온 원본 객체는 편집기용 `document_blocks` 투영과 별도로 `notion_api_snapshots`와 `notion_api_objects`에 보존한다. 객체별 원본 JSON, 원본 ID, 부모 타입·ID, 부모 발생 키, 형제 순서를 저장하므로 지원하지 않는 블록과 Notion 전용 속성도 버리지 않는다. `object_key`는 한 스냅샷 안의 트리 발생을 식별하며, 동기화 블록처럼 같은 Notion ID가 여러 위치에 나오는 경우도 각각 저장한다. 블록 자식은 Notion API의 페이지네이션을 끝까지 따라가며 재귀적으로 저장한다.

`documents.active_notion_snapshot_id`는 해당 문서에 연결된 최신 원본 스냅샷을 가리킨다. API 가져오기에서 보기나 보기 상세 정보를 읽지 못하거나 블록 순환을 만나면 스냅샷의 `complete`와 `warning_codes_json`에 미완료 상태를 기록한다. 편집기용 `document_blocks`는 현재 UI 호환 투영이며 원본 객체의 완전한 표현으로 간주하지 않는다.
