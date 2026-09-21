# JoripNote 편집 엔진 아키텍처

JoripNote는 문서 저장 모델과 화면 렌더러를 분리하는 범용 블록 엔진 방향으로 이동한다. 현재 운영 Worker와 기존 API를 유지하면서 `engine/` 모듈을 호환 계층으로 도입했다.

## 계층

- `engine/document-model.js`: DocumentSnapshot, BlockSnapshot, source metadata
- `engine/block-registry.js`: 블록 타입별 schema/normalize/validate/render 계약
- `engine/commands.js`: 삽입·수정·삭제·이동 transaction 명령
- `engine/transformers.js`: 기존 D1 문서와 canonical snapshot 간 변환
- `worker.js`: 기존 HTTP API와 UI 번들, 점진적으로 엔진 호출로 이전

새 기능은 DOM을 직접 저장하지 않고 canonical snapshot과 command를 거쳐야 한다. 기존 저장 데이터는 legacy adapter로 읽고, 원본 Notion ID와 블록 ID를 유지한다.

## 다음 단계

1. UI 블록 렌더러를 registry dispatch로 이전
2. selection/clipboard/undo-redo를 command 계층에 연결
3. database view를 동일 data source의 projection으로 통합
4. 필요할 때만 Yjs 동기화 adapter 추가
