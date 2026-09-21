# AFFiNE·BlockSuite 참고 기록

참고 저장소:

- https://github.com/toeverything/AFFiNE
- https://github.com/toeverything/blocksuite

## 참고한 개념

- 데이터 계층(store)과 UI 컴포넌트 분리
- block schema/service/view 계약
- selection과 command를 데이터 흐름으로 관리
- snapshot/transformer를 통한 Markdown·HTML 변환
- 하나의 문서를 여러 view로 표현하는 구조

## 적용하지 않은 범위

- AFFiNE 전체 앱·백엔드·Electron 코드 직접 이식
- AI 기능과 화이트보드
- 이번 단계의 실시간 공동 편집/Yjs 도입

## 라이선스 및 구현 경계

BlockSuite 저장소와 AFFiNE 저장소는 구성 요소별 라이선스가 다를 수 있으므로 코드를 복사하지 않고 설계 개념만 독립 구현한다. 외부 패키지를 추가할 경우 package 단위 라이선스를 별도로 기록한다.
