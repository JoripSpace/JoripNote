# Service Brief

- Project: qwerty
- Service name: JoripNote
- Description: 로그인한 프로젝트 멤버가 계층형 문서를 만들고 블록 단위로 작성하며 함께 관리하는 협업 문서 서비스
- Main features: 최초 관리자 설치 마법사, 문서 트리·목록의 휴지통 이동, 24종 블록 편집기, 인라인 서식, 충돌 방지 자동 저장, 제목·본문 전체 검색, 최근·즐겨찾기·휴지통, 멤버 초대 및 역할 관리, 문서 버전 기록·복원, 블록 연결 댓글·멘션, 활동·개인 알림, 문서 템플릿, 문서별 보기·편집 권한
- Rich blocks: 표, 간단 데이터 표, 콜아웃, 목차, 수식, URL 기반 이미지·동영상·오디오·파일 링크·북마크·지원 사이트 임베드
- Public documents: Owner와 Admin이 문서를 웹에 게시하거나 게시 취소할 수 있으며 공개 링크는 로그인 없이 읽기 전용으로 제공
- Version history: 문서별 최근 100개 저장 버전을 보존하며 이전 버전을 미리 보고 새 버전으로 안전하게 복원
- Comments and mentions: 문서·블록 댓글, 해결 처리, 작성자 삭제, @아이디 개인 알림
- Files: 10MB 이하 이미지·동영상·오디오·일반 파일을 스토리지에 저장하고 인증된 문서 멤버에게만 제공. HTML·SVG 업로드 차단
- Notifications/activity: 개인 알림 읽음 처리와 접근 가능한 문서의 워크스페이스 활동 기록
- Templates: 회의록·업무일지·프로젝트 계획서 기본 템플릿 및 현재 문서 기반 사용자 템플릿
- Per-document access: 전체 워크스페이스 공개 또는 제한 공개, 멤버별 보기·편집 권한. Owner·Admin과 문서 작성자가 관리
- Login/membership: 초대 전용 가입. 기존 계정 중 최초 계정은 Owner, 나머지는 Member로 이관
- Roles: Owner(전체 관리), Admin(문서 관리·Member/Viewer 초대 및 역할 변경), Member(문서 작성), Viewer(읽기 전용)
- Admin/owner: Owner만 Admin 지정과 멤버 제거 가능. 마지막 Owner 보호
- Email: 초대 이메일 주소는 암호화하고 중복 검색용 blind index를 별도 저장. 프로젝트 메일이 연결되지 않은 환경에서는 초대 링크만 제공
- Excluded: 결제, 실시간 공동 편집 커서, 캘린더·타임라인 데이터베이스 뷰, 외부 서비스 계정 동기화, AI 작성

## Route inventory

- UI kind: multi-screen
- Document lists: `/`, `/all`, `/recent`, `/favorites`, `/trash`, `/search?q={query}`
- Workspace management: `/members`, `/settings`
- Notifications and activity: `/notifications`
- Document templates: `/templates`
- Document detail: `/doc/:documentId`
- Invitation acceptance: `/invite/:token`
- Public read-only document: `/public/:documentId`
- Unknown paths: HTTP 404 with a friendly message
