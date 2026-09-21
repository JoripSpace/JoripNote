# Canonical Snapshot

문서와 외부 포맷 사이의 기준 모델은 `engine/document-model.js`의 `DocumentSnapshot`과 `BlockSnapshot`이다.

각 블록은 다음 정보를 가진다.

- `id`, `type`, `parentId`, `children`
- `props`, `inlineContent`, `content`
- `checked`, `indent_level`
- `source`: Notion page/block/data source ID와 원본 타입
- `version`

알 수 없는 블록은 삭제하지 않고 `unsupported` 타입으로 보존한다. Notion 속성과 관계형 데이터는 database data source의 `source_id`, `sourceType`, `sourceId`에 유지한다.
