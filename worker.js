const PROJECT_ID = 'qwerty';
const SESSION_COOKIE = 'qwerty_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const INVITE_TTL_SECONDS = 60 * 60 * 24 * 7;
const PASSWORD_ITERATIONS = 100000;
const CAPTCHA_TTL_SECONDS = 60 * 5;
const BLOCK_TYPES = new Set(['text', 'heading1', 'heading2', 'heading3', 'heading4', 'bullet', 'numbered', 'todo', 'quote', 'code', 'divider', 'toggle', 'callout', 'table', 'database', 'toc', 'math', 'bookmark', 'image', 'video', 'audio', 'file', 'embed', 'page_link']);
const EDIT_ROLES = new Set(['owner', 'admin', 'member']);
const MANAGE_ROLES = new Set(['owner', 'admin']);
const BUILTIN_TEMPLATES = [
  ['tpl_meeting', '회의록', '안건, 논의 내용과 할 일을 정리합니다.', '🗒️', [{ type: 'heading2', content: '회의 정보' }, { type: 'bullet', content: '일시: ' }, { type: 'bullet', content: '참석자: ' }, { type: 'heading2', content: '안건' }, { type: 'text', content: '논의할 안건을 입력하세요.' }, { type: 'heading2', content: '결정 및 할 일' }, { type: 'todo', content: '담당자와 기한을 적어 주세요.' }]],
  ['tpl_daily', '업무일지', '오늘의 목표와 진행 상황을 기록합니다.', '✅', [{ type: 'heading2', content: '오늘의 목표' }, { type: 'todo', content: '가장 중요한 일을 적어 주세요.' }, { type: 'heading2', content: '진행 내용' }, { type: 'text', content: '진행한 내용을 적어 주세요.' }, { type: 'heading2', content: '내일 할 일' }, { type: 'todo', content: '다음 할 일을 적어 주세요.' }]],
  ['tpl_project', '프로젝트 계획서', '목표, 일정, 담당자와 위험 요소를 정리합니다.', '🚀', [{ type: 'heading2', content: '프로젝트 목표' }, { type: 'text', content: '달성하려는 목표를 적어 주세요.' }, { type: 'heading2', content: '주요 일정' }, { type: 'todo', content: '일정과 담당자를 적어 주세요.' }, { type: 'heading2', content: '위험 요소' }, { type: 'callout', content: '예상되는 위험과 대응 방법을 적어 주세요.' }]]
];
const encoder = new TextEncoder();

const HTML = String.raw`<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f7f7f5">
  <title>JoripNote</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/variable/woff2/SUIT-Variable.css">
  <link rel="stylesheet" href="/app.css?v=20260819-joripnote-1">
</head>
<body>
  <svg class="icon-sprite" aria-hidden="true">
    <symbol id="brand-workspace-note" viewBox="0 0 56 56">
      <rect x="3" y="3" width="50" height="50" rx="15" fill="#2d2d2a" stroke="none"/>
      <path d="M17 13h15l8 8v22H17z" fill="#fff" stroke="none"/>
      <path d="M32 13v8h8" fill="#deddd7" stroke="none"/>
      <path d="M22 27h13M22 32h13M22 37h9" fill="none" stroke="#55544f" stroke-width="2" stroke-linecap="round"/>
    </symbol>
    <symbol id="icon-chevron-left" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></symbol>
    <symbol id="icon-chevron-right" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></symbol>
    <symbol id="icon-close" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></symbol>
    <symbol id="icon-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></symbol>
    <symbol id="icon-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></symbol>
    <symbol id="icon-star" viewBox="0 0 24 24"><path d="m12 2.75 2.86 5.8 6.4.93-4.63 4.51 1.09 6.38L12 17.36l-5.72 3.01 1.09-6.38-4.63-4.51 6.4-.93L12 2.75Z"/></symbol>
    <symbol id="icon-files" viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6z"/><path d="M9 3v5h9M9 12h6M9 16h6"/></symbol>
    <symbol id="icon-trash" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></symbol>
    <symbol id="icon-users" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 2.5-6 6-6s6 2 6 6M16 5a3 3 0 0 1 0 6M17 14c2.5.3 4 2.2 4 5"/></symbol>
    <symbol id="icon-settings" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></symbol>
    <symbol id="icon-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
    <symbol id="icon-logout" viewBox="0 0 24 24"><path d="M10 5H5v14h5M14 8l4 4-4 4M9 12h9"/></symbol>
    <symbol id="icon-menu" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></symbol>
    <symbol id="icon-grip" viewBox="0 0 24 24"><circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/></symbol>
    <symbol id="icon-type" viewBox="0 0 24 24"><path d="M5 5h14M12 5v14M8 19h8"/></symbol>
    <symbol id="icon-list" viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></symbol>
    <symbol id="icon-list-ordered" viewBox="0 0 24 24"><path d="M10 6h10M10 12h10M10 18h10M4 4h2v4M4 11h2l-2 3h2M4 17h2v3H4"/></symbol>
    <symbol id="icon-check-square" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="m7 12 3 3 7-7"/></symbol>
    <symbol id="icon-quote" viewBox="0 0 24 24"><path d="M7 17H4v-5a5 5 0 0 1 5-5v3a2 2 0 0 0-2 2ZM17 17h-3v-5a5 5 0 0 1 5-5v3a2 2 0 0 0-2 2Z"/></symbol>
    <symbol id="icon-code" viewBox="0 0 24 24"><path d="m8 9-3 3 3 3M16 9l3 3-3 3M14 5l-4 14"/></symbol>
    <symbol id="icon-minus" viewBox="0 0 24 24"><path d="M5 12h14"/></symbol>
    <symbol id="icon-alert" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 17h.01"/></symbol>
    <symbol id="icon-copy" viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></symbol>
    <symbol id="icon-link" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15M14 11a5 5 0 0 0-7.54-.54l-2 2a5 5 0 0 0 7.07 7.07l1.15-1.15"/></symbol>
    <symbol id="icon-arrow-up" viewBox="0 0 24 24"><path d="m6 10 6-6 6 6M12 4v16"/></symbol>
    <symbol id="icon-arrow-down" viewBox="0 0 24 24"><path d="m6 14 6 6 6-6M12 20V4"/></symbol>
    <symbol id="icon-bell" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></symbol>
    <symbol id="icon-template" viewBox="0 0 24 24"><path d="M4 4h16v16H4zM4 10h16M10 10v10"/></symbol>
    <symbol id="icon-comment" viewBox="0 0 24 24"><path d="M4 5h16v12H8l-4 4z"/></symbol>
    <symbol id="icon-history" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2"/></symbol>
    <symbol id="icon-upload" viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></symbol>
    <symbol id="icon-lock" viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></symbol>
  </svg>
  <div id="toast" class="toast" role="status" hidden></div>
  <main id="boot-view" class="boot-shell" aria-busy="true" aria-live="polite">
    <span class="boot-spinner" aria-hidden="true"></span><span>워크스페이스를 여는 중</span>
  </main>
  <main id="setup-view" class="setup-shell" hidden>
    <section class="setup-intro" aria-labelledby="setup-title">
      <div class="setup-brand"><svg class="workspace-note-logo" aria-hidden="true"><use href="#brand-workspace-note"/></svg><strong>JoripNote</strong></div>
      <div class="setup-copy">
        <span class="setup-step">처음 한 번만 설정해요</span>
        <h1 id="setup-title">당신의 문서 공간을<br>시작해 볼까요?</h1>
        <p>첫 관리자는 모든 문서와 멤버를 관리하는 Owner가 됩니다. 설치 후에는 초대받은 멤버만 참여할 수 있어요.</p>
      </div>
      <ul class="setup-benefits" aria-label="설치 후 제공 기능">
        <li><span>1</span><div><strong>안전한 개인 공간</strong><small>로그인한 멤버만 접근</small></div></li>
        <li><span>2</span><div><strong>Notion처럼 유연하게</strong><small>계층형 문서와 블록 편집</small></div></li>
        <li><span>3</span><div><strong>팀과 함께</strong><small>초대, 권한, 댓글과 버전 기록</small></div></li>
      </ul>
    </section>
    <section class="setup-panel">
      <form id="setup-form" class="setup-card">
        <div class="setup-progress"><span class="active"></span><span></span><span></span></div>
        <header><p class="eyebrow">ADMIN SETUP</p><h2>관리자 계정 만들기</h2><p>이 계정은 JoripNote의 최고 관리자입니다.</p></header>
        <div id="setup-alert" class="alert" role="alert" hidden></div>
        <label>관리자 아이디<input name="username" autocomplete="username" minlength="3" maxlength="20" pattern="[A-Za-z0-9_]+" placeholder="영문, 숫자, 밑줄 3–20자" required></label>
        <label>비밀번호<input name="password" type="password" autocomplete="new-password" minlength="8" maxlength="72" placeholder="8자 이상" required></label>
        <label>비밀번호 확인<input name="password_confirmation" type="password" autocomplete="new-password" minlength="8" maxlength="72" required></label>
        <button class="button primary setup-submit" type="submit"><span>JoripNote 시작하기</span><span aria-hidden="true">→</span></button>
        <p class="setup-security">비밀번호는 복구할 수 없도록 안전하게 암호화해 저장합니다.</p>
      </form>
    </section>
  </main>
  <main id="auth-view" class="auth-shell" hidden>
    <section class="auth-panel">
      <form id="login-form" class="auth-card">
        <div class="login-brand"><svg class="workspace-note-logo" aria-hidden="true"><use href="#brand-workspace-note"/></svg><strong class="wordmark">JoripNote</strong></div>
        <div id="auth-alert" class="alert" role="alert" hidden></div>
        <label>아이디<input name="username" autocomplete="username" minlength="3" maxlength="20" required></label>
        <label>비밀번호<input name="password" type="password" autocomplete="current-password" minlength="8" maxlength="72" required></label>
        <button class="button primary" type="submit">워크스페이스 열기</button>
        <p class="form-note">새 계정은 멤버 초대를 통해서만 만들 수 있습니다.</p>
      </form>
      <form id="invite-form" class="auth-card" hidden>
        <div class="login-brand"><svg class="workspace-note-logo" aria-hidden="true"><use href="#brand-workspace-note"/></svg><strong class="wordmark">JoripNote</strong></div>
        <h2>워크스페이스 참여</h2>
        <p id="invite-summary" class="invite-summary">초대를 확인하고 있습니다.</p>
        <div id="invite-alert" class="alert" role="alert" hidden></div>
        <label>사용할 아이디<input name="username" autocomplete="username" minlength="3" maxlength="20" pattern="[A-Za-z0-9_]+" required></label>
        <label>비밀번호<input name="password" type="password" autocomplete="new-password" minlength="8" maxlength="72" required></label>
        <button class="button primary" type="submit">초대 수락하고 시작하기</button>
      </form>
    </section>
  </main>

  <main id="public-view" class="public-shell" hidden>
    <header class="public-header"><a href="/" class="public-brand"><svg class="workspace-note-logo" aria-hidden="true"><use href="#brand-workspace-note"/></svg><strong>JoripNote</strong></a><span>공개 문서</span></header>
    <article class="document-editor public-document"><h1 id="public-title" class="public-title"></h1><div id="public-block-editor" class="block-editor public-block-editor"></div></article>
  </main>

  <main id="app-view" class="app-shell" hidden>
    <a class="skip-link" href="#main-content">본문으로 건너뛰기</a>
    <div id="sidebar-backdrop" class="sidebar-backdrop" hidden></div>
    <aside id="sidebar" class="sidebar">
      <header class="workspace-header">
        <button id="workspace-home" class="workspace-button" type="button">
          <span class="workspace-avatar">J</span><span><strong>JoripNote</strong><small id="sidebar-role"></small></span>
        </button>
        <button id="sidebar-collapse" class="icon-button desktop-only" type="button" aria-label="사이드바 축소" data-tooltip="사이드바 축소"><svg class="ui-icon" aria-hidden="true"><use href="#icon-chevron-left"/></svg></button>
        <button id="sidebar-close" class="icon-button mobile-only" type="button" aria-label="사이드바 닫기" data-tooltip="사이드바 닫기"><svg class="ui-icon" aria-hidden="true"><use href="#icon-close"/></svg></button>
      </header>
      <nav class="main-nav" aria-label="워크스페이스">
        <button data-view="search" type="button" aria-label="검색" data-tooltip="문서 검색"><span class="nav-icon"><svg class="ui-icon" aria-hidden="true"><use href="#icon-search"/></svg></span><span class="nav-label">검색</span></button>
        <button data-view="recent" type="button" aria-label="최근 문서" data-tooltip="최근 문서"><span class="nav-icon"><svg class="ui-icon" aria-hidden="true"><use href="#icon-clock"/></svg></span><span class="nav-label">최근 문서</span></button>
        <button data-view="favorites" type="button" aria-label="즐겨찾기" data-tooltip="즐겨찾기"><span class="nav-icon"><svg class="star-icon" aria-hidden="true"><use href="#icon-star"/></svg></span><span class="nav-label">즐겨찾기</span></button>
        <button data-view="all" class="active" type="button" aria-label="전체 문서" data-tooltip="전체 문서"><span class="nav-icon"><svg class="ui-icon" aria-hidden="true"><use href="#icon-files"/></svg></span><span class="nav-label">전체 문서</span></button>
        <button data-view="trash" type="button" aria-label="휴지통" data-tooltip="휴지통"><span class="nav-icon"><svg class="ui-icon" aria-hidden="true"><use href="#icon-trash"/></svg></span><span class="nav-label">휴지통</span></button>
        <button data-view="notifications" type="button" aria-label="알림과 활동" data-tooltip="알림과 활동"><span class="nav-icon"><svg class="ui-icon" aria-hidden="true"><use href="#icon-bell"/></svg></span><span class="nav-label">알림·활동</span><span id="notification-badge" class="notification-badge" hidden></span></button>
        <button data-view="templates" type="button" aria-label="문서 템플릿" data-tooltip="문서 템플릿"><span class="nav-icon"><svg class="ui-icon" aria-hidden="true"><use href="#icon-template"/></svg></span><span class="nav-label">템플릿</span></button>
      </nav>
      <div class="tree-heading"><span class="nav-label">문서</span><button id="new-root-document" class="icon-button" type="button" aria-label="새 문서" data-tooltip="새 문서"><svg class="ui-icon" aria-hidden="true"><use href="#icon-plus"/></svg></button></div>
      <div id="document-tree" class="document-tree"></div>
      <nav class="main-nav bottom-nav" aria-label="워크스페이스 관리">
        <button data-view="members" type="button" aria-label="멤버 관리" data-tooltip="멤버 관리"><span class="nav-icon"><svg class="ui-icon" aria-hidden="true"><use href="#icon-users"/></svg></span><span class="nav-label">멤버 관리</span></button>
        <button data-view="settings" type="button" aria-label="설정" data-tooltip="설정"><span class="nav-icon"><svg class="ui-icon" aria-hidden="true"><use href="#icon-settings"/></svg></span><span class="nav-label">설정</span></button>
      </nav>
      <footer class="profile-footer">
        <span id="profile-avatar" class="avatar"></span>
        <span class="profile-copy"><strong id="profile-name"></strong><small id="profile-role"></small></span>
        <button id="logout-button" class="icon-button" type="button" aria-label="로그아웃" data-tooltip="로그아웃"><svg class="ui-icon" aria-hidden="true"><use href="#icon-logout"/></svg></button>
      </footer>
    </aside>

    <section id="main-content" class="main-pane" tabindex="-1">
      <header class="mobile-header">
        <button id="sidebar-open" class="icon-button" type="button" aria-label="사이드바 열기" data-tooltip="사이드바 열기"><svg class="ui-icon" aria-hidden="true"><use href="#icon-menu"/></svg></button>
        <strong>JoripNote</strong>
        <span id="mobile-save-state" role="status" aria-live="polite"></span>
      </header>

      <section id="editor-view" class="editor-view" hidden>
        <header class="editor-toolbar">
          <div class="breadcrumbs"><button id="breadcrumb-home" type="button">JoripNote</button><span>/</span><span id="breadcrumb-title">제목 없음</span></div>
          <div class="toolbar-actions">
            <span id="save-state" class="save-state" role="status" aria-live="polite"></span>
            <button id="favorite-button" class="icon-button favorite-toggle" type="button" aria-label="즐겨찾기 추가" data-tooltip="즐겨찾기 추가"><svg class="star-icon" aria-hidden="true"><use href="#icon-star"/></svg></button>
            <button id="comments-button" class="button subtle" type="button">댓글</button>
            <button id="history-button" class="button subtle" type="button">버전</button>
            <label id="upload-button" class="button subtle upload-button">파일<input id="file-upload-input" type="file" hidden></label>
            <button id="access-button" class="button subtle" type="button">권한</button>
            <button id="publish-button" class="button subtle" type="button">공유</button>
            <button id="duplicate-button" class="button subtle" type="button">복제</button>
            <button id="new-child-button" class="button subtle" type="button">하위 문서</button>
            <button id="trash-button" class="icon-button danger-text" type="button" aria-label="휴지통으로 이동" data-tooltip="휴지통으로 이동"><svg class="ui-icon" aria-hidden="true"><use href="#icon-trash"/></svg></button>
          </div>
        </header>
        <article class="document-editor" aria-label="문서 편집기">
          <textarea id="document-title" class="document-title" maxlength="160" rows="1" placeholder="제목 없음" aria-label="문서 제목"></textarea>
          <div id="readonly-notice" class="notice" hidden>Viewer 권한에서는 문서를 읽을 수만 있습니다.</div>
          <div id="block-editor" class="block-editor" role="group" aria-label="문서 본문 블록"></div>
          <button id="append-block" class="append-block" type="button"><svg class="ui-icon" aria-hidden="true"><use href="#icon-plus"/></svg><span>블록 추가</span></button>
        </article>
      </section>

      <section id="list-view" class="page-view">
        <header class="page-header">
          <div><p class="eyebrow">JoripNote</p><h1 id="list-title">전체 문서</h1><p id="list-description">워크스페이스의 최상위 문서입니다.</p></div>
          <button id="list-new-document" class="button primary compact" type="button">새 문서</button>
        </header>
        <form id="search-form" class="search-panel" hidden>
          <input id="search-input" type="search" maxlength="80" placeholder="문서 제목으로 검색" aria-label="문서 제목 검색">
          <button class="button primary compact" type="submit">검색</button>
        </form>
        <div id="list-alert" class="alert" role="alert" hidden></div>
        <div id="document-list" class="document-list"></div>
        <button id="load-more-documents" class="button subtle load-more" type="button" hidden>더 보기</button>
      </section>

      <section id="members-view" class="page-view" hidden>
        <header class="page-header">
          <div><p class="eyebrow">WORKSPACE</p><h1>멤버 관리</h1><p>역할과 대기 중인 초대를 관리합니다.</p></div>
          <button id="open-invite" class="button primary compact" type="button">멤버 초대</button>
        </header>
        <div id="members-permission" class="notice" hidden>멤버 관리 권한이 없습니다.</div>
        <section class="panel">
          <div class="section-title"><h2>멤버</h2><span id="member-count"></span></div>
          <div id="member-list" class="member-list"></div>
          <button id="load-more-members" class="button subtle load-more" type="button" hidden>멤버 더 보기</button>
        </section>
        <section class="panel">
          <div class="section-title"><h2>대기 중인 초대</h2><span id="invite-count"></span></div>
          <div id="invite-list" class="member-list"></div>
          <button id="load-more-invites" class="button subtle load-more" type="button" hidden>초대 더 보기</button>
        </section>
      </section>

      <section id="settings-view" class="page-view" hidden>
        <header class="page-header"><div><p class="eyebrow">WORKSPACE</p><h1>설정</h1><p>현재 워크스페이스 정보를 확인합니다.</p></div></header>
        <div class="settings-grid">
          <div class="settings-card"><span class="workspace-avatar large">J</span><div><h2>JoripNote</h2><p>로그인한 멤버만 접근할 수 있는 협업 문서 공간</p></div></div>
          <div class="settings-card import-card">
            <div><h2>Notion에서 가져오기</h2><p>Notion에서 내보낸 Markdown(.md) 파일을 문서와 블록으로 변환합니다.</p><small>현재는 Markdown 한 파일의 텍스트·제목·목록·할 일·인용·코드·구분선을 지원합니다. 첨부파일, 데이터베이스, 댓글은 가져오지 않습니다.</small></div>
            <label id="notion-import-button" class="button subtle compact import-button">Markdown 선택<input id="notion-import-input" type="file" accept=".md,text/markdown,text/plain" hidden></label>
          </div>
        </div>
      </section>

      <section id="notifications-view" class="page-view" hidden>
        <header class="page-header"><div><p class="eyebrow">WORKSPACE</p><h1>알림과 활동</h1><p>나를 부른 댓글과 워크스페이스 변경 사항을 확인합니다.</p></div><button id="mark-notifications-read" class="button subtle compact" type="button">모두 읽음</button></header>
        <div class="two-column-feed"><section class="panel"><div class="section-title"><h2>내 알림</h2></div><div id="notification-list" class="feed-list"></div></section><section class="panel"><div class="section-title"><h2>최근 활동</h2></div><div id="activity-list" class="feed-list"></div></section></div>
      </section>

      <section id="templates-view" class="page-view" hidden>
        <header class="page-header"><div><p class="eyebrow">WORKSPACE</p><h1>문서 템플릿</h1><p>반복해서 쓰는 문서를 한 번에 시작합니다.</p></div><button id="new-template-button" class="button primary compact" type="button">현재 문서를 템플릿으로</button></header>
        <div id="template-list" class="template-grid"></div>
      </section>
    </section>
  </main>

  <dialog id="invite-dialog" aria-labelledby="invite-dialog-title">
    <form id="create-invite-form" method="dialog" class="dialog-card">
      <header><div><h2 id="invite-dialog-title">멤버 초대</h2><p>초대는 7일 동안 유효합니다.</p></div><button id="close-invite" class="icon-button" type="button" aria-label="초대 창 닫기" data-tooltip="닫기"><svg class="ui-icon" aria-hidden="true"><use href="#icon-close"/></svg></button></header>
      <div id="create-invite-alert" class="alert" hidden></div>
      <label>이메일<input name="email" type="email" autocomplete="email" maxlength="254" required></label>
      <label>역할<select id="invite-role" name="role"></select></label>
      <button class="button primary" type="submit">초대 만들기</button>
      <div id="invite-link-result" class="invite-link-result" hidden><p>메일 연결 전에는 아래 링크를 안전하게 전달하세요.</p><div><input readonly aria-label="초대 링크"><button class="button subtle compact" type="button">복사</button></div></div>
    </form>
  </dialog>

  <dialog id="global-search-dialog" class="search-dialog" aria-label="워크스페이스 전체 검색">
    <section class="global-search-card">
      <header><svg class="ui-icon" aria-hidden="true"><use href="#icon-search"/></svg><input id="global-search-input" type="search" maxlength="80" placeholder="워크스페이스에서 검색" role="combobox" aria-label="워크스페이스에서 검색" aria-autocomplete="list" aria-controls="global-search-results" aria-expanded="true"><kbd>Esc</kbd></header>
      <div id="global-search-results" class="global-search-results" role="listbox" aria-label="검색 결과"></div>
      <footer><span>↑↓ 이동</span><span>Enter 열기</span><span>Ctrl+K 검색</span></footer>
    </section>
  </dialog>

  <dialog id="publish-dialog" aria-labelledby="publish-dialog-title">
    <section class="dialog-card publish-card">
      <header><div><h2 id="publish-dialog-title">웹에 게시</h2><p>링크를 가진 누구나 로그인 없이 문서를 읽을 수 있습니다.</p></div><button id="close-publish" class="icon-button" type="button" aria-label="공개 설정 닫기" data-tooltip="닫기"><svg class="ui-icon" aria-hidden="true"><use href="#icon-close"/></svg></button></header>
      <div id="publish-alert" class="alert" hidden></div>
      <div class="publication-row"><div><strong id="publication-title">비공개</strong><small id="publication-description">현재 워크스페이스 멤버만 볼 수 있습니다.</small></div><button id="publication-toggle" class="button primary compact" type="button">게시</button></div>
      <div id="publication-link" class="invite-link-result" hidden><p>공개 링크</p><div><input readonly aria-label="공개 문서 링크"><button class="button subtle compact" type="button">복사</button></div></div>
    </section>
  </dialog>

  <dialog id="link-dialog" aria-labelledby="link-dialog-title">
    <form id="link-form" class="dialog-card link-dialog-card">
      <header><div><h2 id="link-dialog-title">링크 추가</h2><p>선택한 텍스트에 연결할 웹 주소를 입력하세요.</p></div><button id="close-link-dialog" class="icon-button" type="button" aria-label="링크 창 닫기" data-tooltip="닫기"><svg class="ui-icon" aria-hidden="true"><use href="#icon-close"/></svg></button></header>
      <div id="link-alert" class="alert" role="alert" hidden></div>
      <label for="link-url">웹 주소<input id="link-url" name="url" type="url" inputmode="url" autocomplete="url" maxlength="2000" placeholder="https://example.com" required></label>
      <footer class="link-dialog-actions"><button id="cancel-link-dialog" class="button subtle" type="button">취소</button><button class="button primary" type="submit">링크 적용</button></footer>
    </form>
  </dialog>

  <dialog id="history-dialog" aria-labelledby="history-dialog-title"><section class="dialog-card wide-dialog"><header><div><h2 id="history-dialog-title">버전 기록</h2><p>이전 내용을 미리 보고 새 버전으로 복원합니다.</p></div><button id="close-history" class="icon-button" type="button" aria-label="닫기"><svg class="ui-icon"><use href="#icon-close"/></svg></button></header><div id="history-list" class="feed-list"></div></section></dialog>
  <dialog id="comments-dialog" aria-labelledby="comments-dialog-title"><section class="dialog-card wide-dialog"><header><div><h2 id="comments-dialog-title">댓글</h2><p>@아이디로 멤버를 언급할 수 있습니다.</p></div><button id="close-comments" class="icon-button" type="button" aria-label="닫기"><svg class="ui-icon"><use href="#icon-close"/></svg></button></header><form id="comment-form" class="comment-form"><textarea id="comment-body" maxlength="2000" placeholder="댓글을 입력하세요. 예: @minsu 확인 부탁해요." required></textarea><button class="button primary compact" type="submit">댓글 작성</button></form><div id="comment-list" class="feed-list"></div></section></dialog>
  <dialog id="access-dialog" aria-labelledby="access-dialog-title"><section class="dialog-card wide-dialog"><header><div><h2 id="access-dialog-title">문서별 권한</h2><p>워크스페이스 역할과 별도로 이 문서 접근을 제한합니다.</p></div><button id="close-access" class="icon-button" type="button" aria-label="닫기"><svg class="ui-icon"><use href="#icon-close"/></svg></button></header><label>공개 범위<select id="access-visibility"><option value="workspace">모든 워크스페이스 멤버</option><option value="restricted">선택한 멤버만</option></select></label><div id="grant-list" class="grant-list"></div><button id="save-access" class="button primary" type="button">권한 저장</button></section></dialog>

  <div id="slash-menu" class="slash-menu" role="menu" aria-label="블록 유형 선택" hidden></div>
  <div id="block-menu" class="block-menu" role="menu" aria-label="블록 메뉴" hidden></div>
  <div id="url-paste-menu" class="url-paste-menu" role="menu" aria-label="URL 붙여넣기 방식 선택" hidden></div>
  <div id="inline-toolbar" class="inline-toolbar" role="toolbar" aria-label="인라인 서식" hidden>
    <button type="button" data-inline-command="bold" aria-label="굵게" data-tooltip="굵게 (Ctrl+B)"><strong>B</strong></button>
    <button type="button" data-inline-command="italic" aria-label="기울임" data-tooltip="기울임 (Ctrl+I)"><em>I</em></button>
    <button type="button" data-inline-command="underline" aria-label="밑줄" data-tooltip="밑줄 (Ctrl+U)"><u>U</u></button>
    <button type="button" data-inline-command="strikeThrough" aria-label="취소선" data-tooltip="취소선"><s>S</s></button>
    <button type="button" data-inline-command="inlineCode" aria-label="인라인 코드" data-tooltip="인라인 코드">&lt;/&gt;</button>
    <button type="button" data-inline-command="createLink" aria-label="링크" data-tooltip="링크 추가"><svg class="ui-icon" aria-hidden="true"><use href="#icon-link"/></svg></button>
  </div>
  <script src="/app.js?v=20260819-joripnote-1" defer></script>
</body>
</html>`;

const CSS = String.raw`:root{color-scheme:light;--bg:#fff;--sidebar:#f7f7f5;--ink:#272725;--muted:#77766f;--line:#e8e7e2;--hover:#efefec;--accent:#2f6feb;--danger:#c43d3d;--success:#28865a;font-family:Inter,Pretendard,"Noto Sans KR",system-ui,-apple-system,sans-serif}*{box-sizing:border-box}body{margin:0;min-width:320px;min-height:100vh;background:var(--bg);color:var(--ink)}button,input,textarea,select{font:inherit;color:inherit}button{cursor:pointer}[hidden]{display:none!important}.muted{display:block;color:var(--muted);font-size:13px}.eyebrow{margin:0 0 8px;color:#8b8a84;font-size:11px;font-weight:800;letter-spacing:.14em}.auth-shell{display:grid;grid-template-columns:1.1fr .9fr;min-height:100vh}.auth-copy{display:flex;flex-direction:column;justify-content:center;padding:clamp(56px,8vw,120px);background:#f4f3ef}.auth-copy h1{margin:0;font-family:Georgia,"Noto Serif KR",serif;font-size:clamp(48px,6vw,82px);line-height:1.05;letter-spacing:-.055em}.auth-copy>p:last-child{max-width:500px;margin:28px 0 0;color:#66645d;font-size:17px;line-height:1.75}.brand-glyph{display:flex;align-items:end;gap:4px;width:46px;height:38px;margin-bottom:36px}.brand-glyph span{width:11px;border:2px solid #30302e;border-radius:3px}.brand-glyph span:nth-child(1){height:24px}.brand-glyph span:nth-child(2){height:36px}.brand-glyph span:nth-child(3){height:29px}.auth-panel{display:grid;place-items:center;padding:40px}.auth-card{display:grid;gap:18px;width:min(100%,390px)}.wordmark{display:block;font-size:24px;letter-spacing:-.04em}.auth-card h2{margin:18px 0 2px;font-size:30px;letter-spacing:-.04em}.auth-card label,.dialog-card label{display:grid;gap:8px;font-size:13px;font-weight:700}.auth-card input,.dialog-card input,.dialog-card select,.search-panel input{width:100%;height:46px;padding:0 13px;border:1px solid #d8d7d2;border-radius:8px;background:#fff;outline:none}.auth-card input:focus,.dialog-card input:focus,.dialog-card select:focus,.search-panel input:focus{border-color:#808078;box-shadow:0 0 0 3px rgba(40,40,38,.08)}.button{min-height:40px;padding:0 16px;border:1px solid transparent;border-radius:7px;background:#fff;font-weight:700}.button.primary{background:#2e2e2b;color:#fff}.button.primary:hover{background:#111}.button.subtle{border-color:var(--line);background:#fff}.button.subtle:hover{background:var(--hover)}.button.compact{min-height:36px;padding:0 13px;font-size:13px}.button:disabled,.icon-button:disabled{cursor:not-allowed;opacity:.45}.form-note{margin:0;color:var(--muted);font-size:12px;text-align:center}.alert{padding:11px 13px;border:1px solid #edcaca;border-radius:7px;background:#fff4f4;color:#9c2929;font-size:13px;line-height:1.5}.invite-summary{padding:13px;border-radius:8px;background:#f5f5f2;color:#595851;font-size:14px;line-height:1.55}.app-shell{min-height:100vh}.sidebar{position:fixed;z-index:20;inset:0 auto 0 0;display:flex;flex-direction:column;width:264px;border-right:1px solid var(--line);background:var(--sidebar)}.workspace-header{display:flex;align-items:center;justify-content:space-between;padding:10px 11px 8px}.workspace-button{display:flex;align-items:center;gap:10px;min-width:0;flex:1;padding:5px;border:0;border-radius:6px;background:transparent;text-align:left}.workspace-button:hover{background:var(--hover)}.workspace-button>span:nth-child(2){min-width:0}.workspace-button strong,.workspace-button small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.workspace-button small{margin-top:2px;color:var(--muted);font-size:11px}.workspace-avatar{display:grid;place-items:center;width:28px;height:28px;flex:none;border-radius:6px;background:#383834;color:#fff;font-family:Georgia,serif;font-size:15px}.workspace-avatar.large{width:56px;height:56px;border-radius:12px;font-size:26px}.main-nav{display:grid;gap:1px;padding:4px 9px}.main-nav button{display:flex;align-items:center;gap:9px;width:100%;height:32px;padding:0 9px;border:0;border-radius:5px;background:transparent;color:#5c5b56;font-size:13px;text-align:left}.main-nav button span{width:18px;color:#797872;font-size:17px;text-align:center}.main-nav button:hover,.main-nav button.active{background:#eaeae6;color:#272725}.tree-heading{display:flex;align-items:center;justify-content:space-between;padding:18px 12px 6px 18px;color:#8a8983;font-size:11px;font-weight:700}.icon-button{display:grid;place-items:center;width:32px;height:32px;padding:0;border:0;border-radius:5px;background:transparent;color:#67665f;font-size:18px}.icon-button:hover{background:var(--hover)}.document-tree{min-height:50px;max-height:calc(100vh - 420px);overflow:auto;padding:0 9px}.tree-row{display:flex;align-items:center;height:30px;border-radius:5px;color:#5d5c57;font-size:13px}.tree-row:hover,.tree-row.active{background:#eaeae6;color:#222}.tree-toggle{width:24px;height:28px;flex:none;border:0;background:transparent;color:#85847e;font-size:10px}.tree-title{min-width:0;flex:1;overflow:hidden;border:0;background:transparent;text-align:left;text-overflow:ellipsis;white-space:nowrap}.tree-add{visibility:hidden;width:25px;height:25px;border:0;background:transparent}.tree-row:hover .tree-add{visibility:visible}.tree-children{margin-left:14px}.bottom-nav{margin-top:auto;padding-top:8px;border-top:1px solid var(--line)}.profile-footer{display:flex;align-items:center;gap:9px;padding:10px 12px;border-top:1px solid var(--line)}.avatar{display:grid;place-items:center;width:29px;height:29px;flex:none;border-radius:50%;background:#dddcd5;font-size:12px;font-weight:800}.profile-copy{min-width:0;flex:1}.profile-copy strong,.profile-copy small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.profile-copy strong{font-size:12px}.profile-copy small{margin-top:2px;color:var(--muted);font-size:10px}.main-pane{min-height:100vh;margin-left:264px}.mobile-header{display:none}.editor-view{min-height:100vh}.editor-toolbar{position:sticky;z-index:10;top:0;display:flex;align-items:center;justify-content:space-between;height:52px;padding:0 18px;border-bottom:1px solid transparent;background:rgba(255,255,255,.92);backdrop-filter:blur(8px)}.breadcrumbs{display:flex;align-items:center;gap:7px;min-width:0;color:#85847f;font-size:12px}.breadcrumbs button{border:0;background:transparent;color:#62615d}.breadcrumbs span:last-child{overflow:hidden;max-width:260px;text-overflow:ellipsis;white-space:nowrap}.toolbar-actions{display:flex;align-items:center;gap:5px}.save-state{min-width:58px;color:var(--muted);font-size:11px;text-align:right}.save-state.saving{color:#8b6c18}.save-state.saved{color:var(--success)}.save-state.failed{color:var(--danger)}.danger-text{color:var(--danger)}.document-editor{width:min(100% - 44px,820px);margin:0 auto;padding:72px 0 150px}.document-title{display:block;width:100%;min-height:1.2em;padding:0;border:0;outline:none;overflow:hidden;resize:none;background:transparent;font-family:Georgia,"Noto Serif KR",serif;font-size:44px;font-weight:700;line-height:1.2;letter-spacing:-.045em}.document-title::placeholder{color:#c4c3bd}.notice{padding:12px 14px;margin:22px 0;border:1px solid #e5dfc4;border-radius:7px;background:#fffbea;color:#6d5d25;font-size:13px}.block-editor{display:grid;gap:2px;margin-top:42px}.block-row{position:relative;display:grid;grid-template-columns:24px minmax(0,1fr);align-items:start;min-height:30px;margin-left:-30px}.block-handle{visibility:hidden;width:24px;height:28px;border:0;background:transparent;color:#aaa9a3;font-size:14px;cursor:grab}.block-row:hover .block-handle,.block-row:focus-within .block-handle{visibility:visible}.block-content{min-height:30px;padding:3px 2px;border-radius:3px;outline:none;white-space:pre-wrap;word-break:break-word;line-height:1.65}.block-content:empty:before{content:attr(data-placeholder);color:#b2b1ab}.block-content[data-type=heading1]{font-size:30px;font-weight:800;line-height:1.35}.block-content[data-type=heading2]{font-size:24px;font-weight:800;line-height:1.4}.block-content[data-type=heading3]{font-size:19px;font-weight:800;line-height:1.5}.block-content[data-type=bullet],.block-content[data-type=numbered],.block-content[data-type=todo]{padding-left:25px}.block-content[data-type=bullet]:before{content:"•";position:absolute;margin-left:-18px}.block-content[data-type=numbered]:before{content:attr(data-number) ".";position:absolute;margin-left:-23px;color:#5e5d57}.block-content[data-type=quote]{padding-left:15px;border-left:3px solid #c6c5bf;color:#55544f}.block-content[data-type=code]{padding:14px;border-radius:7px;background:#f4f4f1;font-family:"SFMono-Regular",Consolas,monospace;font-size:13px;line-height:1.6}.block-content[data-type=divider]{height:28px;min-height:28px;font-size:0}.block-content[data-type=divider]:after{content:"";display:block;margin-top:13px;border-top:1px solid #dddcd7}.todo-wrap{display:grid;grid-template-columns:20px 1fr;align-items:start}.todo-wrap input{margin:8px 0 0}.todo-wrap .block-content{padding-left:2px}.todo-wrap.checked .block-content{text-decoration:line-through;color:#989791}.append-block{margin-top:12px;padding:4px 2px;border:0;background:transparent;color:#aaa9a3;font-size:13px}.append-block:hover{color:#666}.page-view{width:min(100% - 48px,980px);margin:0 auto;padding:76px 0 120px}.page-header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;padding-bottom:28px;border-bottom:1px solid var(--line)}.page-header h1{margin:0;font-size:34px;letter-spacing:-.045em}.page-header p:last-child{margin:9px 0 0;color:var(--muted);font-size:14px}.search-panel{display:flex;gap:8px;margin:24px 0}.search-panel input{flex:1}.document-list{display:grid;margin-top:18px}.document-card{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:18px;min-height:68px;padding:12px 10px;border-bottom:1px solid var(--line)}.document-card:hover{background:#fafaf8}.document-card button.doc-open{min-width:0;border:0;background:transparent;text-align:left}.document-card strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}.document-card small{display:block;margin-top:6px;color:var(--muted);font-size:11px}.card-actions{display:flex;align-items:center;gap:4px}.empty-state{padding:70px 20px;color:var(--muted);text-align:center}.empty-state strong{display:block;margin-bottom:7px;color:#565550;font-size:15px}.load-more{display:block;margin:20px auto}.panel{margin-top:28px;padding:0 20px 8px;border:1px solid var(--line);border-radius:10px}.section-title{display:flex;align-items:center;justify-content:space-between;padding:20px 0 12px}.section-title h2{margin:0;font-size:16px}.section-title span{color:var(--muted);font-size:12px}.member-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:18px;min-height:68px;border-top:1px solid var(--line)}.member-info{display:flex;align-items:center;gap:11px;min-width:0}.member-info>div{min-width:0}.member-info strong,.member-info small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.member-info strong{font-size:13px}.member-info small{margin-top:4px;color:var(--muted);font-size:11px}.member-controls{display:flex;align-items:center;gap:8px}.member-controls select{height:34px;padding:0 28px 0 10px;border:1px solid var(--line);border-radius:6px;background:#fff;font-size:12px}.member-controls button{font-size:12px}.settings-card{display:flex;align-items:center;gap:18px;margin-top:30px;padding:24px;border:1px solid var(--line);border-radius:10px}.settings-card h2{margin:0}.settings-card p{margin:6px 0 0;color:var(--muted);font-size:13px}dialog{padding:0;border:0;border-radius:12px;box-shadow:0 24px 80px rgba(0,0,0,.18)}dialog::backdrop{background:rgba(20,20,18,.32)}.dialog-card{display:grid;gap:18px;width:min(92vw,440px);padding:24px}.dialog-card header{display:flex;justify-content:space-between}.dialog-card h2{margin:0;font-size:21px}.dialog-card header p{margin:6px 0 0;color:var(--muted);font-size:12px}.invite-link-result{padding:12px;border-radius:8px;background:#f5f5f2}.invite-link-result p{margin:0 0 9px;color:#686761;font-size:12px}.invite-link-result>div{display:flex;gap:7px}.invite-link-result input{height:38px;font-size:11px}.slash-menu{position:fixed;z-index:50;width:260px;max-height:330px;overflow:auto;padding:6px;border:1px solid var(--line);border-radius:8px;background:#fff;box-shadow:0 14px 44px rgba(0,0,0,.14)}.slash-item{display:flex;align-items:center;gap:11px;width:100%;padding:8px;border:0;border-radius:5px;background:#fff;text-align:left}.slash-item:hover,.slash-item.active{background:var(--hover)}.slash-icon{display:grid;place-items:center;width:34px;height:34px;border:1px solid var(--line);border-radius:5px;font-family:Georgia,serif;font-weight:700}.slash-item strong,.slash-item small{display:block}.slash-item strong{font-size:13px}.slash-item small{margin-top:3px;color:var(--muted);font-size:10px}.toast{position:fixed;z-index:100;right:20px;bottom:20px;max-width:360px;padding:11px 14px;border-radius:7px;background:#2d2d2a;color:#fff;font-size:13px;box-shadow:0 8px 28px rgba(0,0,0,.2)}.sidebar-backdrop{display:none}.mobile-only{display:none}@media(max-width:760px){.auth-shell{grid-template-columns:1fr}.auth-copy{display:none}.auth-panel{padding:28px}.sidebar{transform:translateX(-100%);transition:transform .2s}.sidebar.open{transform:none}.sidebar-backdrop{position:fixed;z-index:15;inset:0;display:block;background:rgba(0,0,0,.25)}.mobile-only{display:grid}.main-pane{margin-left:0}.mobile-header{position:sticky;z-index:12;top:0;display:flex;align-items:center;justify-content:space-between;height:50px;padding:0 10px;border-bottom:1px solid var(--line);background:rgba(255,255,255,.94)}.mobile-header strong{font-size:14px}.mobile-header span{min-width:50px;color:var(--muted);font-size:10px;text-align:right}.editor-toolbar{top:50px;height:48px;padding:0 10px}.breadcrumbs,.save-state,.toolbar-actions .button{display:none}.document-editor{width:min(100% - 32px,820px);padding:48px 0 100px}.document-title{font-size:35px}.block-editor{margin-top:32px}.block-row{grid-template-columns:18px minmax(0,1fr);margin-left:-18px}.block-handle{width:18px}.page-view{width:calc(100% - 28px);padding:40px 0 90px}.page-header{align-items:flex-start}.page-header h1{font-size:28px}.page-header p:last-child{font-size:12px}.panel{padding:0 12px}.member-row{grid-template-columns:1fr;padding:13px 0}.member-controls{justify-content:flex-end}.document-card{padding-left:4px;padding-right:4px}.dialog-card{padding:20px}}`;

const UI_POLISH_CSS = String.raw`

.notification-badge{width:auto!important;min-width:18px;padding:1px 5px;border-radius:999px;background:#c43d3d;color:#fff!important;font-size:10px!important;text-align:center}.upload-button{display:inline-flex;align-items:center;justify-content:center;cursor:pointer}.two-column-feed{display:grid;grid-template-columns:1fr 1fr;gap:20px}.feed-list{display:grid;gap:8px}.feed-item{padding:13px;border:1px solid var(--line);border-radius:8px;background:#fff}.feed-item.unread{border-color:#b9c8ea;background:#f6f8ff}.feed-item strong,.feed-item span,.feed-item small{display:block}.feed-item span{margin-top:5px;font-size:13px;line-height:1.5}.feed-item small{margin-top:6px;color:var(--muted);font-size:11px}.feed-actions{display:flex;gap:6px;margin-top:10px}.template-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:24px}.template-card{display:grid;gap:10px;padding:20px;border:1px solid var(--line);border-radius:10px;background:#fff;text-align:left}.template-card:hover{background:#fafaf8}.template-card .template-icon{font-size:28px}.template-card h2{margin:0;font-size:17px}.template-card p{margin:0;color:var(--muted);font-size:12px;line-height:1.5}.wide-dialog{width:min(92vw,680px);max-height:82vh;overflow:auto}.comment-form{display:grid;gap:8px}.comment-form textarea{min-height:92px;padding:12px;border:1px solid var(--line);border-radius:8px;resize:vertical}.grant-list{display:grid;gap:8px}.grant-row{display:grid;grid-template-columns:minmax(0,1fr) 130px;align-items:center;gap:12px;padding:9px;border-bottom:1px solid var(--line)}@media(max-width:760px){.two-column-feed,.template-grid{grid-template-columns:1fr}.toolbar-actions #comments-button,.toolbar-actions #history-button,.toolbar-actions #access-button,.toolbar-actions #upload-button{display:none}}
select:not(:disabled){cursor:pointer}select:disabled{cursor:not-allowed}
.skip-link{position:fixed;z-index:1000;top:8px;left:8px;padding:10px 14px;border-radius:6px;background:#111;color:#fff;font-weight:800;text-decoration:none;transform:translateY(-150%)}.skip-link:focus{transform:none}
:where(button,input,textarea,select,[contenteditable="true"],a,[tabindex]):focus-visible{outline:2px solid #1f5fbf;outline-offset:2px}
.document-title:focus-visible,.block-content[contenteditable="true"]:focus-visible{outline:2px solid #1f5fbf;outline-offset:4px}
.append-block,.block-handle{color:#6b6a64}.block-content:empty:before,.document-title::placeholder{color:#73726c}.tree-heading,.breadcrumbs{color:#6f6e68}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
@media(forced-colors:active){:where(button,input,textarea,select,[contenteditable="true"],a,[tabindex]):focus-visible{outline:2px solid CanvasText}.ui-icon,.star-icon{forced-color-adjust:auto}}
.boot-shell{display:flex;align-items:center;justify-content:center;gap:10px;min-height:100vh;color:var(--muted);font-size:13px}.boot-spinner{width:16px;height:16px;border:2px solid #deded9;border-top-color:#565650;border-radius:50%;animation:boot-spin .75s linear infinite}@keyframes boot-spin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.boot-spinner{animation-duration:1.8s}}
:root{font-family:"SUIT Variable",SUIT,system-ui,-apple-system,sans-serif}.auth-copy h1,.workspace-avatar,.document-title,.slash-icon{font-family:"SUIT Variable",SUIT,system-ui,-apple-system,sans-serif}
.icon-sprite{position:absolute;width:0;height:0;overflow:hidden}.ui-icon,.star-icon{display:block;width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.auth-shell{grid-template-columns:1fr;place-items:center;background:#f7f7f5}.auth-panel{width:100%;padding:24px}.auth-card{gap:14px;padding:32px;border:1px solid var(--line);border-radius:14px;background:#fff;box-shadow:0 18px 55px rgba(30,30,28,.08)}.login-brand{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;margin-bottom:14px;text-align:center}.workspace-note-logo{display:block;width:56px;height:56px}.wordmark{font-size:25px}.auth-card h2{margin:8px 0 4px;font-size:25px}.auth-card input{height:42px}.auth-card .button{min-height:42px}.button{min-height:36px;padding:0 14px;font-size:13px}.button.compact{min-height:34px;padding:0 12px}.icon-button{width:30px;height:30px;font-size:16px}.toolbar-actions .button{min-height:32px;padding:0 11px;font-size:12px}[data-tooltip]{position:relative}[data-tooltip]::after{position:absolute;z-index:250;top:calc(100% + 7px);left:50%;display:none;max-width:190px;padding:6px 8px;border-radius:6px;background:#292926;color:#fff;content:attr(data-tooltip);font-size:11px;font-weight:600;line-height:1.2;white-space:nowrap;pointer-events:none;transform:translateX(-50%)}[data-tooltip]:hover::after,[data-tooltip]:focus-visible::after{display:block}.sidebar [data-tooltip]::after{top:50%;left:calc(100% + 8px);transform:translateY(-50%)}
.sidebar{width:244px;transition:width .18s ease}.main-pane{margin-left:244px;transition:margin-left .18s ease}.main-nav button .nav-label{width:auto;min-width:0;flex:1;overflow:hidden;color:inherit;font-size:13px;text-align:left;text-overflow:ellipsis;white-space:nowrap}.nav-icon{display:grid;place-items:center;flex:none}.favorite-toggle{color:#77766f}.favorite-toggle:hover{color:#484741}.favorite-toggle.active{color:#b7791f}.favorite-toggle.active .star-icon{fill:currentColor;stroke-width:1.4}.card-actions .favorite-toggle{display:grid;place-items:center;width:34px;padding:0}.document-title:not(:read-only),.block-content[contenteditable="true"]{cursor:text}.document-title:read-only,.block-content[contenteditable="false"]{cursor:default}.tree-toggle .ui-icon,.tree-add .ui-icon{width:14px;height:14px}.tree-toggle .ui-icon{transition:transform .15s}.tree-toggle.expanded .ui-icon{transform:rotate(90deg)}.block-handle .ui-icon{width:16px;height:16px}.block-handle:active{cursor:grabbing}.block-row.dragging{opacity:.38}.block-row.drop-before::before,.block-row.drop-after::after{position:absolute;right:0;left:24px;height:2px;border-radius:2px;background:#4b7bec;content:""}.block-row.drop-before::before{top:-2px}.block-row.drop-after::after{bottom:-2px}.toggle-wrap{min-width:0}.toggle-summary{display:grid;grid-template-columns:22px minmax(0,1fr);align-items:start}.toggle-caret{display:grid;place-items:center;width:22px;height:30px;padding:0;border:0;background:transparent;color:#77766f}.toggle-caret .ui-icon{width:15px;height:15px;transition:transform .15s}.toggle-caret[aria-expanded="true"] .ui-icon{transform:rotate(90deg)}.toggle-body{margin:2px 0 5px 22px;padding:4px 10px;border-left:2px solid #e5e4df;color:#55544f}.document-tree{max-height:calc(100vh - 360px)}.document-editor{width:min(100% - 40px,900px);padding:48px 0 120px}.block-editor{margin-top:28px}.append-block{display:inline-flex;align-items:center;gap:5px}.append-block .ui-icon{width:14px;height:14px}.block-menu{position:fixed;z-index:70;display:grid;width:220px;padding:6px;border:1px solid var(--line);border-radius:9px;background:#fff;box-shadow:0 14px 44px rgba(0,0,0,.16)}.block-menu button{display:flex;align-items:center;gap:10px;width:100%;height:34px;padding:0 9px;border:0;border-radius:5px;background:#fff;color:#4f4e49;font-size:12px;text-align:left}.block-menu button:hover,.block-menu button:focus-visible{background:var(--hover);outline:none}.block-menu button.danger-text{color:var(--danger)}.block-menu .ui-icon{width:15px;height:15px}.block-menu-separator{height:1px;margin:5px;background:var(--line)}.page-view{width:min(100% - 40px,1080px);padding:28px 0 100px}.page-header{padding-bottom:20px}.empty-state{padding:44px 20px}.settings-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:24px}.settings-grid .settings-card{margin-top:0;min-height:126px}.import-card{justify-content:space-between}.import-card small{display:block;margin-top:10px;color:var(--muted);font-size:11px;line-height:1.55}.import-button{display:inline-flex;align-items:center;justify-content:center;flex:none;cursor:pointer}
.block-menu{max-height:min(70vh,460px);overflow:auto}.block-menu button{flex:none}.block-menu-separator{flex:none}
.slash-category{padding:10px 8px 5px;color:var(--muted);font-size:10px;font-weight:800}.public-shell{min-height:100vh;background:#fff}.public-header{display:flex;align-items:center;justify-content:space-between;height:58px;padding:0 24px;border-bottom:1px solid var(--line);color:var(--muted);font-size:12px}.public-brand{display:flex;align-items:center;gap:9px;color:var(--ink);text-decoration:none}.public-brand .workspace-note-logo{width:30px;height:30px}.public-title{margin:0;font-size:44px;line-height:1.2;letter-spacing:-.045em}.public-document{padding-top:68px}.public-block-editor .block-row{grid-template-columns:minmax(0,1fr);margin-left:0}.public-block-editor .block-handle{display:none}.block-content[data-type=heading4]{font-size:16px;font-weight:800;line-height:1.55}.callout-wrap{display:grid;grid-template-columns:24px minmax(0,1fr);gap:8px;padding:12px 14px;border:1px solid #e5e4df;border-radius:7px;background:#f7f7f5}.callout-wrap>.ui-icon{margin-top:5px;color:#6f6e68}.structured-block{min-width:0;padding:4px 0}.structured-block .block-content{width:100%}.block-table{width:100%;border-collapse:collapse;table-layout:fixed}.block-table td,.block-table th{min-width:100px;height:38px;padding:0;border:1px solid #deddd8}.block-table input{width:100%;height:37px;padding:0 10px;border:0;background:transparent;outline:none}.block-table thead{background:#f7f7f5;font-weight:700}.block-table-actions{display:flex;gap:6px;margin-top:7px}.block-table-actions button{height:28px;padding:0 9px;border:0;border-radius:5px;background:#f2f2ef;color:#696862;font-size:11px}.database-block{padding:12px;border:1px solid var(--line);border-radius:8px}.database-label{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;font-size:12px;font-weight:800}.media-block{display:grid;gap:8px}.media-url{width:100%;height:36px;padding:0 10px;border:1px solid var(--line);border-radius:6px;background:#fff;outline:none}.media-preview{display:grid;place-items:center;min-height:54px;overflow:hidden;border:1px solid var(--line);border-radius:8px;background:#fafaf8;color:var(--muted);font-size:12px}.media-preview img,.media-preview video{display:block;max-width:100%;max-height:520px}.media-preview audio{width:min(100%,520px);margin:16px}.media-preview iframe{width:100%;height:420px;border:0}.media-preview a{display:flex;align-items:center;gap:8px;width:100%;padding:16px;color:var(--ink);text-decoration:none}.toc-block{padding:10px 14px;border-left:2px solid #dddcd7}.toc-block strong{display:block;margin-bottom:7px;font-size:12px}.toc-block a{display:block;padding:3px 0;color:#696862;font-size:12px;text-decoration:none}.math-block{padding:13px;border-radius:7px;background:#f7f7f5;text-align:center}.math-block .block-content{font-family:"SFMono-Regular",Consolas,monospace}.inline-toolbar{position:fixed;z-index:90;display:flex;padding:4px;border-radius:7px;background:#2f2f2c;box-shadow:0 8px 30px rgba(0,0,0,.22)}.inline-toolbar button{display:grid;place-items:center;min-width:30px;height:30px;padding:0 7px;border:0;border-radius:4px;background:transparent;color:#fff;font-size:12px}.inline-toolbar button:hover{background:#4b4b47}.inline-toolbar .ui-icon{width:15px;height:15px}.block-content a{color:#2563a8;text-decoration:underline;text-underline-offset:2px}.block-content code{padding:1px 4px;border-radius:4px;background:#efefec;color:#c33;font-family:"SFMono-Regular",Consolas,monospace;font-size:.9em}.search-dialog{width:min(92vw,660px);padding:0;border-radius:12px}.global-search-card{background:#fff}.global-search-card>header{display:grid;grid-template-columns:22px minmax(0,1fr) auto;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line)}.global-search-card input{height:38px;border:0;outline:none;font-size:16px}.global-search-card kbd{padding:3px 6px;border:1px solid var(--line);border-radius:5px;background:#f7f7f5;color:var(--muted);font-size:10px}.global-search-results{max-height:min(58vh,480px);overflow:auto;padding:7px}.global-search-item{display:grid;gap:3px;width:100%;padding:10px 11px;border:0;border-radius:6px;background:#fff;text-align:left}.global-search-item:hover,.global-search-item.active{background:var(--hover)}.global-search-item strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}.global-search-item small{color:var(--muted);font-size:10px}.global-search-empty{padding:44px 20px;color:var(--muted);font-size:13px;text-align:center}.global-search-card>footer{display:flex;gap:14px;padding:8px 14px;border-top:1px solid var(--line);color:var(--muted);font-size:10px}.publish-card{width:min(92vw,480px)}.publication-row{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:14px;border:1px solid var(--line);border-radius:8px}.publication-row strong,.publication-row small{display:block}.publication-row small{margin-top:4px;color:var(--muted);font-size:11px}.link-dialog-card{width:min(92vw,460px)}.link-dialog-actions{display:flex;justify-content:flex-end;gap:8px}.link-dialog-actions .button{min-width:82px}
@media(min-width:761px){.app-shell.sidebar-collapsed .sidebar{width:68px}.app-shell.sidebar-collapsed .main-pane{margin-left:68px}.app-shell.sidebar-collapsed .workspace-header{justify-content:center;padding-inline:8px}.app-shell.sidebar-collapsed #workspace-home,.app-shell.sidebar-collapsed .nav-label,.app-shell.sidebar-collapsed .document-tree,.app-shell.sidebar-collapsed .profile-footer .avatar,.app-shell.sidebar-collapsed .profile-copy{display:none}.app-shell.sidebar-collapsed .main-nav{padding-inline:8px}.app-shell.sidebar-collapsed .main-nav button{justify-content:center;padding:0}.app-shell.sidebar-collapsed .main-nav button>span:first-child{width:24px}.app-shell.sidebar-collapsed .tree-heading{justify-content:center;padding:14px 8px 6px}.app-shell.sidebar-collapsed .profile-footer{justify-content:center;padding-inline:8px}}
@media(max-width:900px){.settings-grid{grid-template-columns:1fr}}@media(max-width:760px){.desktop-only{display:none!important}.sidebar{width:264px}.main-pane{margin-left:0}.document-editor{width:calc(100% - 28px);padding:34px 0 90px}.page-view{width:calc(100% - 24px);padding:20px 0 80px}.settings-grid{margin-top:16px}.settings-card{align-items:flex-start}.import-card{display:grid}.import-button{width:100%}.button{min-height:40px}.icon-button{width:38px;height:38px}}
:root{--accent:#59647f}body{background:#fff}.workspace-avatar{border-radius:8px;background:#596174}.main-nav button.active{background:#e8e9ee;color:#303748}.button.primary{background:#343b4a}.button.primary:hover{background:#242a36}.block-row.drop-before::before,.block-row.drop-after::after{background:var(--accent)}
.block-row{padding-left:calc(var(--indent,0) * 26px)}.block-row.selected{margin-right:-6px;border-radius:6px;background:rgba(89,100,127,.09);box-shadow:inset 2px 0 #7a849b}.block-row.selected .block-handle{visibility:visible;color:#59647f}@media(max-width:760px){.block-row{padding-left:calc(var(--indent,0) * 18px)}}
.url-paste-menu{position:fixed;z-index:95;width:min(340px,calc(100vw - 16px));padding:7px;border:1px solid var(--line);border-radius:10px;background:#fff;box-shadow:0 16px 48px rgba(28,28,26,.16)}.url-paste-heading{padding:7px 9px 8px;color:var(--muted);font-size:11px;font-weight:700}.url-paste-menu button{display:grid;grid-template-columns:34px minmax(0,1fr);align-items:center;gap:10px;width:100%;padding:8px 9px;border:0;border-radius:7px;background:#fff;text-align:left}.url-paste-menu button:hover,.url-paste-menu button:focus-visible,.url-paste-menu button.active{background:var(--hover);outline:none}.url-paste-icon{display:grid;place-items:center;width:34px;height:34px;border:1px solid var(--line);border-radius:7px;color:#626b80}.url-paste-icon .ui-icon{width:16px;height:16px}.url-paste-copy{min-width:0}.url-paste-copy strong,.url-paste-copy small{display:block}.url-paste-copy strong{font-size:13px}.url-paste-copy small{overflow:hidden;margin-top:3px;color:var(--muted);font-size:10px;text-overflow:ellipsis;white-space:nowrap}
.sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}.skeleton{position:relative;overflow:hidden;background:#ececea}.skeleton::after{position:absolute;inset:0;background:linear-gradient(100deg,transparent 24%,rgba(255,255,255,.72) 45%,transparent 66%);content:"";transform:translateX(-100%);animation:skeleton-sweep 1.25s ease-in-out infinite}@keyframes skeleton-sweep{to{transform:translateX(100%)}}.skeleton-stack{display:grid;gap:0;width:100%}.skeleton-list-row{display:grid;grid-template-columns:minmax(0,1fr) 70px;align-items:center;gap:20px;min-height:68px;padding:12px 10px;border-bottom:1px solid var(--line)}.skeleton-lines{display:grid;gap:9px}.skeleton-line{display:block;height:11px;border-radius:5px}.skeleton-line.title{width:min(52%,310px);height:14px}.skeleton-line.meta{width:min(30%,160px);height:9px}.skeleton-pill{display:block;width:66px;height:28px;border-radius:7px}.skeleton-tree{display:grid;gap:8px;padding:5px 9px}.skeleton-tree .skeleton-line{height:22px;border-radius:5px}.skeleton-tree .skeleton-line:nth-child(2n){width:78%}.skeleton-tree .skeleton-line:nth-child(3n){width:64%}.skeleton-member-row{display:grid;grid-template-columns:34px minmax(0,1fr) 96px;align-items:center;gap:11px;min-height:68px;border-top:1px solid var(--line)}.skeleton-avatar{display:block;width:29px;height:29px;border-radius:50%}.skeleton-document{display:grid;gap:16px;padding-top:3px}.skeleton-document .skeleton-line:nth-child(1){width:88%}.skeleton-document .skeleton-line:nth-child(2){width:74%}.skeleton-document .skeleton-line:nth-child(3){width:91%}.skeleton-document .skeleton-line:nth-child(4){width:57%}.document-title.skeleton-title{width:min(62%,510px);height:53px;min-height:53px;border-radius:8px;background:#ececea;color:transparent;caret-color:transparent;animation:skeleton-pulse 1.1s ease-in-out infinite}.global-search-skeleton{display:grid;gap:7px;padding:7px}.global-search-skeleton .skeleton-list-row{min-height:54px;border:0;border-radius:6px}.button.loading-indicator{position:relative;color:transparent!important;pointer-events:none}.button.loading-indicator::after{position:absolute;width:14px;height:14px;border:2px solid #d7d7d2;border-top-color:#59647f;border-radius:50%;content:"";animation:boot-spin .7s linear infinite}@keyframes skeleton-pulse{50%{opacity:.58}}@media(prefers-reduced-motion:reduce){.skeleton::after,.document-title.skeleton-title,.button.loading-indicator::after{animation:none}}
.database-block{min-width:0;padding:0;border:1px solid #dedee3;border-radius:10px;background:#fff;box-shadow:0 1px 2px rgba(28,31,38,.03);font-size:13px;line-height:1.4}.db-header{display:flex;align-items:center;gap:10px;padding:12px 13px 9px}.db-title{min-width:120px;flex:1;height:30px;padding:0;border:0;background:transparent;outline:none;font-size:15px;font-weight:750}.db-count{flex:none;color:var(--muted);font-size:11px}.db-viewbar{display:flex;align-items:center;gap:3px;padding:0 10px;border-bottom:1px solid var(--line)}.db-view-tab{display:flex;align-items:center;gap:6px;height:34px;padding:0 9px;border:0;border-bottom:2px solid transparent;background:transparent;color:#777b84;font-size:12px;font-weight:650}.db-view-tab.active{border-bottom-color:#59647f;color:#303748}.db-view-tab .ui-icon{width:14px;height:14px}.db-toolbar{display:flex;align-items:center;gap:7px;padding:9px 10px;flex-wrap:wrap}.db-search-wrap{position:relative;min-width:150px;flex:1 1 180px}.db-search-wrap .ui-icon{position:absolute;top:9px;left:9px;width:14px;height:14px;color:#8c8f97}.db-search,.db-select,.db-control{height:32px;border:1px solid #dddde2;border-radius:6px;background:#fff;outline:none;font-size:12px}.db-search{width:100%;padding:0 10px 0 30px}.db-select{max-width:170px;padding:0 28px 0 9px;flex:none}.db-control{display:inline-flex;align-items:center;justify-content:center;gap:5px;padding:0 9px;color:#555b68;flex:none;white-space:nowrap}.db-control:hover{background:#f5f5f7}.db-control .ui-icon{width:14px;height:14px}.db-control.primary{border-color:#59647f;background:#59647f;color:#fff}.db-table-scroll{max-width:100%;overflow:auto;border-top:1px solid var(--line)}.db-table{width:100%;min-width:640px;border-collapse:separate;border-spacing:0;table-layout:fixed}.db-table th,.db-table td{height:38px;padding:0;border-right:1px solid var(--line);border-bottom:1px solid var(--line);background:#fff;vertical-align:middle}.db-table th{height:58px;background:#f8f8f9;text-align:left}.db-property-head{display:grid;grid-template-columns:minmax(74px,1fr) 88px auto;align-items:center;gap:4px;padding:5px 6px}.db-property-name,.db-property-type,.db-cell-input{width:100%;height:30px;padding:0 8px;border:1px solid transparent;border-radius:5px;background:transparent;outline:none;font-size:12px}.db-property-name{font-weight:700}.db-property-type{padding-right:22px;color:#777b84;font-size:10px}.db-property-name:focus,.db-property-type:focus,.db-cell-input:focus{border-color:#aeb4c2;background:#fff;box-shadow:0 0 0 2px rgba(89,100,127,.1)}.db-property-actions,.db-row-actions{display:flex;align-items:center;gap:1px}.db-mini-button{display:grid;place-items:center;width:25px;height:25px;padding:0;border:0;border-radius:5px;background:transparent;color:#8a8d95}.db-mini-button:hover{background:#ececf0;color:#3e4451}.db-mini-button .ui-icon{width:13px;height:13px}.db-cell{padding:3px 5px}.db-cell-input[type=checkbox]{display:block;width:16px;height:16px;margin:auto;accent-color:#59647f}.db-cell-input.type-select,.db-cell-input.type-person{background:#f3f3f5}.db-cell-input.type-url{color:#2563a8}.db-row-actions-cell{width:84px;position:sticky;right:0;background:#fafafa!important}.db-empty{padding:34px 16px;color:var(--muted);text-align:center;font-size:12px}.db-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 10px}.db-footer-note{color:var(--muted);font-size:10px}.db-board{display:flex;gap:10px;max-width:100%;overflow:auto;padding:10px;border-top:1px solid var(--line);background:#fafafa}.db-board-column{width:240px;min-width:240px;padding:7px;border:1px solid #e1e1e5;border-radius:9px;background:#f4f4f6}.db-board-column.drag-over{border-color:#7d879f;background:#eef0f5}.db-board-heading{display:flex;align-items:center;justify-content:space-between;height:30px;padding:0 4px;font-size:12px;font-weight:750}.db-board-heading span:last-child{color:var(--muted);font-size:10px}.db-board-list{display:grid;gap:7px;min-height:36px}.db-card{display:grid;gap:7px;padding:9px;border:1px solid #dedee2;border-radius:7px;background:#fff;box-shadow:0 1px 2px rgba(25,28,34,.04)}.db-card.dragging{opacity:.45}.db-card-title{width:100%;border:0;background:transparent;outline:none;font-size:13px;font-weight:700}.db-card-meta{display:grid;gap:5px}.db-card-field{display:grid;grid-template-columns:62px minmax(0,1fr);align-items:center;gap:5px;color:#7b7e87;font-size:10px}.db-card-field .db-cell-input{height:27px;background:#f7f7f8;font-size:11px}.db-card-footer{display:flex;justify-content:flex-end}.db-board-add{width:100%;height:30px;margin-top:7px;border:0;border-radius:6px;background:transparent;color:#777b84;font-size:11px;text-align:left}.db-board-add:hover{background:#e9e9ed}.db-status-dot{display:inline-block;width:7px;height:7px;margin-right:6px;border-radius:50%;background:#7c879f}@media(max-width:760px){.database-block{margin-right:-10px}.db-toolbar{align-items:stretch}.db-search-wrap{flex-basis:100%}.db-select{max-width:none;flex:1}.db-property-head{grid-template-columns:minmax(70px,1fr) 78px}.db-property-actions{grid-column:1/-1}.db-board-column{width:220px;min-width:220px}}
/* Database spacing refinement */
.database-block{overflow:hidden;border-color:#d9dae0;border-radius:11px;box-shadow:0 2px 6px rgba(28,31,38,.035)}
.db-header{gap:12px;padding:15px 15px 10px}
.db-title{height:32px;font-size:16px;letter-spacing:-.015em}
.db-count{padding:4px 7px;border-radius:999px;background:#f4f4f6;color:#747780;font-size:10px;line-height:1}
.db-viewbar{gap:8px;padding:0 14px}
.db-view-tab{height:38px;margin-right:4px;padding:0 4px;gap:7px}
.db-toolbar{gap:8px;padding:10px 12px;border-bottom:1px solid #ececf0;background:#fbfbfc}
.db-search-wrap{min-width:190px}
.db-search-wrap .ui-icon{top:10px;left:10px}
.db-search,.db-select,.db-control{height:34px;border-color:#d9dae0}
.db-search{padding:0 11px 0 32px}
.db-select{min-width:112px;padding-left:10px}
.db-control{padding:0 11px}
.db-table-scroll{border-top:0}
.db-table th,.db-table td{height:42px}
.db-table th{height:66px}
.db-property-head{position:relative;grid-template-areas:"name" "type";grid-template-columns:minmax(0,1fr);gap:2px;padding:6px 8px;overflow:hidden}
.db-property-name,.db-property-type,.db-cell-input{height:32px;padding:0 9px}
.db-property-name{grid-area:name;padding-right:78px;font-size:12px}
.db-property-type{grid-area:type;width:min(100%,112px);height:25px;padding-left:7px}
.db-property-actions{position:absolute;top:6px;right:6px;z-index:1;border-radius:5px;background:#f8f8f9;opacity:0;pointer-events:none;transition:opacity .12s}
.db-property-head:hover .db-property-actions,.db-property-head:focus-within .db-property-actions{opacity:1;pointer-events:auto}
.db-property-actions,.db-row-actions{justify-content:center;gap:1px}
.db-mini-button{width:25px;height:25px}
.db-table td.db-cell{height:44px;padding:6px}
.db-row-actions-cell{width:88px}
.db-table th.db-row-actions-cell{padding:0 10px;color:#747780;font-size:11px;font-weight:700;text-align:center}
.db-footer{padding:11px 12px;border-top:1px solid #ececf0;background:#fbfbfc}
.db-footer .db-control.primary{height:34px;padding-inline:12px}
.db-footer-note{padding-right:2px}
.db-board{gap:12px;padding:12px}
.db-board-column{padding:8px}
.db-card{gap:8px;padding:10px}
@media(max-width:760px){.database-block{margin-right:-8px;border-radius:9px}.db-header{padding:13px 12px 9px}.db-viewbar{padding-inline:11px}.db-toolbar{display:grid;grid-template-columns:minmax(0,1fr) auto;padding:9px}.db-search-wrap{grid-column:1/-1;min-width:0}.db-select{min-width:0;max-width:none}.db-control{padding-inline:9px}.db-property-head{padding:6px 7px}.db-footer{padding:10px}.db-footer-note{font-size:9px}}
/* Workspace layout detail pass */
:root{--sidebar-width:260px;--content-width:1040px}
.sidebar{width:var(--sidebar-width);background:#f8f8f7}
.main-pane{margin-left:var(--sidebar-width)}
.workspace-header{padding:12px 12px 10px}
.workspace-button{gap:11px;padding:6px 7px}
.main-nav{gap:2px;padding:6px 10px 10px}
.main-nav button{height:34px;padding:0 10px;border-radius:7px}
.tree-heading{min-height:44px;padding:14px 13px 7px 17px;letter-spacing:.02em}
.document-tree{min-height:0;max-height:none;flex:1 1 auto;padding:0 8px 14px;scrollbar-gutter:stable}
.tree-row{position:relative;height:32px;margin:1px 0;padding-right:3px;border-radius:7px}
.tree-toggle{width:27px;height:30px}
.tree-title{height:30px;padding:0 8px 0 1px;line-height:30px}
.tree-action{position:absolute;top:2px;display:grid;place-items:center;width:27px;height:27px;padding:0;border:0;border-radius:6px;background:transparent;opacity:0;visibility:visible;pointer-events:none}
.tree-add{right:30px}.tree-trash{right:3px;color:#9a4b4b}
.tree-row:hover .tree-action,.tree-row:focus-within .tree-action{opacity:1;pointer-events:auto}
.tree-row:hover .tree-title,.tree-row:focus-within .tree-title{padding-right:61px}
.tree-children{margin-left:13px;padding-left:4px;border-left:1px solid #e4e4e0}
.bottom-nav{padding-top:10px;background:#f8f8f7}
.profile-footer{padding:11px 13px}
.page-view{width:min(calc(100% - 64px),var(--content-width));padding:38px 0 112px}
.page-header{align-items:center;gap:32px;padding-bottom:26px}
.page-header>div{min-width:0}
.page-header h1{font-size:36px;line-height:1.16}
.page-header p:last-child{margin-top:10px;line-height:1.55}
.page-header>.button{flex:none}
.template-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:28px}
.template-card{grid-template-rows:auto auto 1fr auto;gap:12px;min-height:216px;padding:24px;border-color:#e2e2de;border-radius:14px;box-shadow:0 1px 2px rgba(30,30,28,.025);transition:border-color .16s ease,box-shadow .16s ease,transform .16s ease}
.template-card:hover{border-color:#d6d7dc;background:#fff;box-shadow:0 8px 24px rgba(38,41,49,.07);transform:translateY(-1px)}
.template-card:focus-visible{border-color:#8e96a8;outline:3px solid rgba(89,100,127,.16);outline-offset:2px}
.template-card .template-icon{display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:#f1f2f5;font-size:24px;line-height:1}
.template-card h2{font-size:18px;line-height:1.35;letter-spacing:-.02em}
.template-card p{font-size:13px;line-height:1.6}
.template-card .button{display:flex;align-items:center;justify-content:space-between;width:100%;min-height:40px;padding-inline:14px;border-radius:8px}
.template-card .button::after{content:"→";font-size:15px;font-weight:700;opacity:.82}
.setup-shell{display:grid;grid-template-columns:minmax(420px,1.05fr) minmax(440px,.95fr);min-height:100vh;background:#fff}
.setup-intro{display:flex;flex-direction:column;padding:clamp(36px,5vw,72px);background:#f5f6f8}
.setup-brand{display:flex;align-items:center;gap:11px;font-size:18px;letter-spacing:-.03em}.setup-brand .workspace-note-logo{width:34px;height:34px}
.setup-copy{max-width:590px;margin:auto 0}.setup-step{display:inline-flex;padding:7px 11px;border-radius:999px;background:#e7f0ff;color:#1769d2;font-size:12px;font-weight:800}.setup-copy h1{margin:22px 0 18px;font-size:clamp(42px,5vw,68px);line-height:1.08;letter-spacing:-.055em}.setup-copy p{max-width:520px;margin:0;color:#666c76;font-size:16px;line-height:1.75}
.setup-benefits{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:48px 0 0;padding:0;list-style:none}.setup-benefits li{display:flex;align-items:center;gap:10px}.setup-benefits li>span{display:grid;place-items:center;width:30px;height:30px;flex:none;border-radius:10px;background:#fff;color:#2878db;font-size:12px;font-weight:900}.setup-benefits strong,.setup-benefits small{display:block}.setup-benefits strong{font-size:12px}.setup-benefits small{margin-top:3px;color:#8a8f98;font-size:10px}
.setup-panel{display:grid;place-items:center;padding:44px}.setup-card{display:grid;gap:19px;width:min(100%,420px)}.setup-progress{display:flex;gap:6px;margin-bottom:18px}.setup-progress span{width:32px;height:4px;border-radius:99px;background:#e8e9ec}.setup-progress .active{width:54px;background:#3182f6}.setup-card header h2{margin:0;font-size:30px;letter-spacing:-.045em}.setup-card header>p:last-child{margin:9px 0 0;color:#7b8089;font-size:13px}.setup-card label{display:grid;gap:8px;color:#44484f;font-size:13px;font-weight:750}.setup-card input{width:100%;height:52px;padding:0 15px;border:1px solid #dfe1e5;border-radius:12px;background:#fff;outline:none;transition:border-color .15s,box-shadow .15s}.setup-card input:focus{border-color:#3182f6;box-shadow:0 0 0 4px rgba(49,130,246,.11)}.setup-submit{display:flex;align-items:center;justify-content:space-between;min-height:54px;margin-top:5px;padding-inline:18px;border-radius:12px;background:#3182f6}.setup-submit:hover{background:#1b64da}.setup-security{margin:0;color:#92969d;font-size:11px;text-align:center}
.card-actions .icon-button{width:34px;height:34px}.card-actions .list-trash{color:#8d5555}.card-actions .list-trash:hover{background:#fff0f0;color:#ba3434}
@media(max-width:1050px) and (min-width:761px){.template-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:900px){.setup-shell{grid-template-columns:1fr}.setup-intro{min-height:auto;padding:32px 28px}.setup-copy{margin:56px 0 20px}.setup-copy h1{font-size:42px}.setup-benefits{display:none}.setup-panel{padding:48px 24px}}
@media(max-width:760px){:root{--sidebar-width:264px}.sidebar{width:var(--sidebar-width)}.main-pane{margin-left:0}.page-view{width:calc(100% - 32px);padding:28px 0 88px}.page-header{flex-direction:column;align-items:stretch;gap:18px;padding-bottom:22px}.page-header h1{font-size:30px}.page-header>.button{align-self:flex-start}.template-grid{grid-template-columns:1fr;gap:12px;margin-top:20px}.template-card{min-height:0;padding:20px}.tree-action{opacity:1;pointer-events:auto}.tree-title{padding-right:61px}.setup-intro{padding:24px 20px}.setup-copy{margin:38px 0 4px}.setup-copy h1{font-size:34px}.setup-copy p{font-size:14px}.setup-panel{align-items:start;padding:36px 20px}.setup-card header h2{font-size:27px}}
`;

const CLIENT_JS = String.raw`const state={user:null,role:null,current:null,dirty:false,saving:false,saveFailed:false,saveTimer:null,editRevision:0,view:'all',cursor:null,search:'',expanded:new Set(),treeLoading:new Set(),membersCursor:null,invitesCursor:null,slashBlock:null,slashIndex:0,dragRow:null,contextRow:null,globalSearchIndex:0,globalSearchTimer:null,publication:null,inlineTarget:null,inlineRange:null,linkTarget:null,linkRange:null,urlPaste:null,urlPasteIndex:0,selectedBlocks:new Set(),undoStack:[],undoIndex:-1,historyTimer:null,restoringHistory:false,access:null};
const $=(id)=>document.getElementById(id);
function loadingMarkup(kind,count=4){const hidden='<span class="sr-only">콘텐츠를 불러오는 중</span>';if(kind==='tree')return'<div class="skeleton-tree" role="status" aria-label="문서 트리 불러오는 중">'+hidden+Array.from({length:count},()=>'<span class="skeleton skeleton-line"></span>').join('')+'</div>';if(kind==='document')return'<div class="skeleton-document" role="status" aria-label="문서 내용 불러오는 중">'+hidden+Array.from({length:count},()=>'<span class="skeleton skeleton-line"></span>').join('')+'</div>';if(kind==='member')return'<div class="skeleton-stack" role="status" aria-label="멤버 목록 불러오는 중">'+hidden+Array.from({length:count},()=>'<div class="skeleton-member-row"><span class="skeleton skeleton-avatar"></span><span class="skeleton-lines"><i class="skeleton skeleton-line title"></i><i class="skeleton skeleton-line meta"></i></span><i class="skeleton skeleton-pill"></i></div>').join('')+'</div>';const rows=Array.from({length:count},()=>'<div class="skeleton-list-row"><span class="skeleton-lines"><i class="skeleton skeleton-line title"></i><i class="skeleton skeleton-line meta"></i></span><i class="skeleton skeleton-pill"></i></div>').join('');return'<div class="'+(kind==='search'?'global-search-skeleton':'skeleton-stack')+'" role="status" aria-label="목록 불러오는 중">'+hidden+rows+'</div>'}
function showLoading(id,kind,count){const container=$(id);container.setAttribute('aria-busy','true');container.innerHTML=loadingMarkup(kind,count)}
function finishLoading(id){$(id).removeAttribute('aria-busy')}
function setLoadButton(id,loading){const button=$(id);button.disabled=loading;button.classList.toggle('loading-indicator',loading);button.setAttribute('aria-busy',loading?'true':'false')}
const icon=(name,className='ui-icon')=>'<svg class="'+className+'" aria-hidden="true"><use href="#icon-'+name+'"></use></svg>';
const starIcon=()=>icon('star','star-icon');
const blockIconName={text:'type',heading1:'type',heading2:'type',heading3:'type',heading4:'type',bullet:'list',numbered:'list-ordered',todo:'check-square',toggle:'chevron-right',quote:'quote',callout:'alert',code:'code',divider:'minus',table:'list',database:'files',toc:'list',math:'type',bookmark:'star',image:'files',video:'files',audio:'files',file:'files',embed:'code',page_link:'files'};
function setFavoriteButton(button,value){const label=value?'즐겨찾기 해제':'즐겨찾기 추가';button.innerHTML=starIcon();button.classList.add('favorite-toggle');button.classList.toggle('active',value);button.setAttribute('aria-label',label);button.dataset.tooltip=label}
const roleLabel={owner:'Owner',admin:'Admin',member:'Member',viewer:'Viewer'};
const blockLabels=[
  ['text','T','일반 텍스트','기본 문단','기본 블록'],
  ['heading1','H1','제목 1','큰 제목','기본 블록'],
  ['heading2','H2','제목 2','중간 제목','기본 블록'],
  ['heading3','H3','제목 3','작은 제목','기본 블록'],
  ['heading4','H4','제목 4','가장 작은 제목','기본 블록'],
  ['bullet','-','글머리 목록','항목 목록','기본 블록'],
  ['numbered','1.','번호 목록','순서가 있는 목록','기본 블록'],
  ['todo','[]','할 일 목록','체크할 수 있는 항목','기본 블록'],
  ['toggle','>','토글 목록','내용을 펼치고 접기','기본 블록'],
  ['callout','!','콜아웃','강조 안내 상자','기본 블록'],
  ['quote','"','인용문','강조된 인용','기본 블록'],
  ['table','table','표','행과 열이 있는 표','기본 블록'],
  ['divider','---','구분선','내용 구분','기본 블록'],
  ['page_link','page','페이지 링크','JoripNote 문서 연결','기본 블록'],
  ['image','img','이미지','이미지 URL','미디어'],
  ['video','video','동영상','동영상 URL','미디어'],
  ['audio','audio','오디오','오디오 URL','미디어'],
  ['code','code','코드 블록','고정폭 텍스트','미디어'],
  ['file','file','파일 링크','다운로드 URL','미디어'],
  ['bookmark','web','웹 북마크','웹페이지 링크','미디어'],
  ['database','db','작업 데이터베이스','표와 보드로 업무를 분류하고 관리','데이터베이스'],
  ['toc','toc','목차','문서 제목 블록 자동 수집','고급 블록'],
  ['math','math','수학 공식 블록','수식 텍스트','고급 블록'],
  ['embed','embed','임베드','지원 사이트 URL 미리보기','임베드']
];
const canEdit=()=>['owner','admin','member'].includes(state.role)&&(!state.current||state.current.can_edit!==false);
const canManage=()=>['owner','admin'].includes(state.role);
async function api(path,options={}){const config={credentials:'same-origin',headers:{accept:'application/json',...(options.headers||{})},...options};if(config.body&&typeof config.body!=='string'){config.headers['content-type']='application/json';config.body=JSON.stringify(config.body)}const response=await fetch(path,config);let data={};try{data=await response.json()}catch{}if(!response.ok){const error=new Error(data.error||'요청을 처리하지 못했습니다.');error.status=response.status;error.details=data;throw error}return data}
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').hidden=true,2600)}
function alertBox(id,message){const el=$(id);el.textContent=message;el.hidden=!message}
function busy(form,value){for(const el of form.elements)el.disabled=value}
function inviteToken(){const match=location.pathname.match(/^\/invite\/([A-Za-z0-9_-]{32,128})$/);return match&&match[1]}
function showAuth(){state.user=null;$('boot-view').hidden=true;$('setup-view').hidden=true;$('app-view').hidden=true;$('auth-view').hidden=false;const token=inviteToken();$('login-form').hidden=!!token;$('invite-form').hidden=!token;if(token)loadInvitePreview(token)}
function showSetup(){state.user=null;$('boot-view').hidden=true;$('auth-view').hidden=true;$('app-view').hidden=true;$('setup-view').hidden=false;if(location.pathname!=='/setup')history.replaceState({},'','/setup');setTimeout(()=>$('setup-form').elements.username.focus(),0)}
async function loadInvitePreview(token){try{const data=await api('/api/invitations/'+encodeURIComponent(token));$('invite-summary').textContent=data.email_hint+' 주소로 보낸 '+roleLabel[data.role]+' 초대입니다. '+new Date(data.expires_at*1000).toLocaleString()+'까지 유효합니다.'}catch(error){alertBox('invite-alert',error.message);for(const el of $('invite-form').elements)el.disabled=true}}
$('login-form').addEventListener('submit',async(event)=>{event.preventDefault();const formEl=event.currentTarget;const form=new FormData(formEl);alertBox('auth-alert','');busy(formEl,true);try{const data=await api('/api/login',{method:'POST',body:{username:form.get('username'),password:form.get('password')}});enterApp(data)}catch(error){alertBox('auth-alert',error.message)}finally{busy(formEl,false)}});
$('invite-form').addEventListener('submit',async(event)=>{event.preventDefault();const formEl=event.currentTarget;const form=new FormData(formEl);alertBox('invite-alert','');busy(formEl,true);try{const data=await api('/api/invitations/'+encodeURIComponent(inviteToken())+'/accept',{method:'POST',body:{username:form.get('username'),password:form.get('password')}});history.replaceState({},'', '/');enterApp(data)}catch(error){alertBox('invite-alert',error.message);busy(formEl,false)}});
$('setup-form').addEventListener('submit',async(event)=>{event.preventDefault();const formEl=event.currentTarget;const form=new FormData(formEl);const password=String(form.get('password')||'');alertBox('setup-alert','');if(password!==String(form.get('password_confirmation')||'')){alertBox('setup-alert','비밀번호 확인이 일치하지 않습니다.');return}busy(formEl,true);try{const data=await api('/api/setup',{method:'POST',body:{username:form.get('username'),password,password_confirmation:form.get('password_confirmation')}});history.replaceState({},'','/');enterApp(data);toast('JoripNote 설치를 완료했습니다.')}catch(error){if(error.status===409){history.replaceState({},'','/');showAuth();toast('이미 설치가 완료된 공간입니다.')}else alertBox('setup-alert',error.message)}finally{busy(formEl,false)}});
$('logout-button').addEventListener('click',async()=>{if(state.dirty&&!confirm('저장되지 않은 변경사항이 있습니다. 로그아웃할까요?'))return;await api('/api/logout',{method:'POST'}).catch(()=>{});history.replaceState({},'','/');showAuth()});
async function bootstrap(){const publicMatch=location.pathname.match(/^\/public\/([A-Za-z0-9_-]{8,80})$/);if(publicMatch){await openPublicDocument(publicMatch[1]);return}try{const setup=await api('/api/setup-status');if(!setup.installed){showSetup();return}if(location.pathname==='/setup')history.replaceState({},'','/');const data=await api('/api/me');enterApp(data)}catch(error){if(error.status===401)showAuth();else{showAuth();alertBox('auth-alert',error.message)}}}
function enterApp(data){state.user=data.user;state.role=data.membership.role;$('boot-view').hidden=true;$('setup-view').hidden=true;$('auth-view').hidden=true;$('public-view').hidden=true;$('app-view').hidden=false;$('profile-name').textContent=data.user.username;$('profile-avatar').textContent=data.user.username.slice(0,1).toUpperCase();$('profile-role').textContent=roleLabel[state.role];$('sidebar-role').textContent=roleLabel[state.role];$('new-root-document').hidden=!canEdit();$('list-new-document').hidden=!canEdit();$('duplicate-button').hidden=!canEdit();$('notion-import-button').hidden=!canEdit();$('publish-button').hidden=!canManage();$('open-invite').hidden=!canManage();$('members-permission').hidden=canManage();$('new-template-button').hidden=!canEdit();let collapsed=false;try{collapsed=localStorage.getItem('qwerty_sidebar_collapsed')==='1'}catch{}setSidebarCollapsed(collapsed,false);setInviteRoleOptions();loadTree();refreshNotificationBadge();routeFromLocation()}
function setInviteRoleOptions(){const options=state.role==='owner'?[['admin','Admin'],['member','Member'],['viewer','Viewer']]:[['member','Member'],['viewer','Viewer']];$('invite-role').replaceChildren(...options.map(([value,label])=>{const el=document.createElement('option');el.value=value;el.textContent=label;return el}))}
function setSidebar(open){$('sidebar').classList.toggle('open',open);$('sidebar-backdrop').hidden=!open}
$('sidebar-open').onclick=()=>setSidebar(true);$('sidebar-close').onclick=()=>setSidebar(false);$('sidebar-backdrop').onclick=()=>setSidebar(false);
function setSidebarCollapsed(collapsed,persist=true){const label=collapsed?'사이드바 확대':'사이드바 축소';$('app-view').classList.toggle('sidebar-collapsed',collapsed);$('sidebar-collapse').innerHTML=icon(collapsed?'chevron-right':'chevron-left');$('sidebar-collapse').setAttribute('aria-label',label);$('sidebar-collapse').dataset.tooltip=label;if(persist)try{localStorage.setItem('qwerty_sidebar_collapsed',collapsed?'1':'0')}catch{}}
$('sidebar-collapse').onclick=()=>setSidebarCollapsed(!$('app-view').classList.contains('sidebar-collapsed'));
document.querySelectorAll('[data-view]').forEach((button)=>button.addEventListener('click',()=>button.dataset.view==='search'?openGlobalSearch():navigateView(button.dataset.view)));
$('workspace-home').onclick=()=>navigateView('all');$('breadcrumb-home').onclick=()=>navigateView('all');
function push(path){setSidebar(false);history.pushState({},'',path);routeFromLocation()}
function navigateView(view){setSidebar(false);push(view==='all'?'/':'/'+view)}
window.addEventListener('popstate',routeFromLocation);
function routeFromLocation(){if(!state.user)return;const doc=location.pathname.match(/^\/doc\/([A-Za-z0-9_-]{8,80})$/);if(doc){openDocument(doc[1],false);return}const view=location.pathname.slice(1)||'all';if(['recent','favorites','all','trash','search'].includes(view)){showList(view);return}if(view==='members'){showMembers();return}if(view==='settings'){showSettings();return}if(view==='notifications'){showNotifications();return}if(view==='templates'){showTemplates();return}showList('all')}
function markNav(view){document.querySelectorAll('[data-view]').forEach((el)=>el.classList.toggle('active',el.dataset.view===view))}
function showPane(id){['editor-view','list-view','members-view','settings-view','notifications-view','templates-view'].forEach((name)=>$(name).hidden=name!==id)}
const listCopy={all:['전체 문서','워크스페이스의 최상위 문서입니다.'],recent:['최근 문서','최근에 열어본 문서입니다.'],favorites:['즐겨찾기','자주 찾는 문서를 모았습니다.'],trash:['휴지통','삭제한 문서를 복구하거나 영구 삭제할 수 있습니다.'],search:['문서 검색','문서 제목과 블록 내용에서 찾습니다.']};
async function showList(view){if(state.dirty&&!await flushSave())return;state.current=null;state.view=view;state.cursor=null;if(view==='search'){state.search=(new URLSearchParams(location.search).get('q')||'').trim().slice(0,80);$('search-input').value=state.search}else state.search='';markNav(view);showPane('list-view');$('list-title').textContent=listCopy[view][0];$('list-description').textContent=listCopy[view][1];$('search-form').hidden=view!=='search';$('list-new-document').hidden=!canEdit()||view==='trash';$('document-list').replaceChildren();$('load-more-documents').hidden=true;await loadDocumentList(false);if(view==='search')$('search-input').focus()}
async function loadDocumentList(append){alertBox('list-alert','');if(!append)showLoading('document-list','list',5);else setLoadButton('load-more-documents',true);const params=new URLSearchParams({scope:state.view,limit:'20'});if(state.cursor)params.set('cursor',state.cursor);if(state.view==='search'&&state.search)params.set('q',state.search);try{const data=await api('/api/documents?'+params);if(!append)$('document-list').replaceChildren();for(const doc of data.documents)$('document-list').append(renderDocumentCard(doc));state.cursor=data.next_cursor;$('load-more-documents').hidden=!state.cursor;if(!$('document-list').children.length)$('document-list').innerHTML='<div class="empty-state"><strong>표시할 문서가 없습니다.</strong><span>'+(state.view==='trash'?'휴지통이 비어 있습니다.':'새 문서를 만들어 시작해 보세요.')+'</span></div>'}catch(error){alertBox('list-alert',error.message);if(!append)$('document-list').replaceChildren()}finally{finishLoading('document-list');setLoadButton('load-more-documents',false)}}
$('load-more-documents').onclick=()=>loadDocumentList(true);
$('search-form').onsubmit=(event)=>{event.preventDefault();state.search=$('search-input').value.trim().slice(0,80);state.cursor=null;const next='/search'+(state.search?'?q='+encodeURIComponent(state.search):'');if(location.pathname+location.search!==next)history.pushState({},'',next);loadDocumentList(false)};
function renderDocumentCard(doc){const row=document.createElement('div');row.className='document-card';const open=document.createElement('button');open.className='doc-open';open.type='button';const title=document.createElement('strong');title.textContent=doc.title||'제목 없음';const meta=document.createElement('small');meta.textContent='수정 '+formatDate(doc.updated_at);open.append(title,meta);open.onclick=()=>push('/doc/'+doc.id);const actions=document.createElement('div');actions.className='card-actions';if(doc.status==='trashed'){if(canEdit()){actions.append(actionButton('복구',()=>restoreDoc(doc.id)),actionButton('영구 삭제',()=>deleteForever(doc.id),true))}}else{const favorite=actionButton('',()=>toggleFavorite(doc.id,!doc.is_favorite));setFavoriteButton(favorite,!!doc.is_favorite);actions.append(favorite);if(canEdit())actions.append(iconAction('trash','휴지통으로 이동',()=>moveToTrash(doc.id),'list-trash'))}row.append(open,actions);return row}
function actionButton(label,handler,danger=false){const button=document.createElement('button');button.type='button';button.className='button subtle compact'+(danger?' danger-text':'');button.textContent=label;button.onclick=handler;return button}
function iconAction(name,label,handler,className=''){const button=document.createElement('button');button.type='button';button.className='icon-button '+className;button.innerHTML=icon(name);button.setAttribute('aria-label',label);button.dataset.tooltip=label;button.onclick=handler;return button}
function formatDate(seconds){return new Date(seconds*1000).toLocaleString('ko-KR',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
async function createDocument(parentId=null){if(!canEdit())return;try{const data=await api('/api/documents',{method:'POST',body:{parent_document_id:parentId}});await loadTree();push('/doc/'+data.document.id)}catch(error){toast(error.message)}}
$('new-root-document').onclick=()=>createDocument();$('list-new-document').onclick=()=>createDocument();$('new-child-button').onclick=()=>state.current&&createDocument(state.current.id);
$('duplicate-button').onclick=async()=>{if(!state.current||!canEdit())return;try{const data=await api('/api/documents/'+state.current.id+'/duplicate',{method:'POST'});await loadTree();push('/doc/'+data.document.id);toast('문서를 복제했습니다.')}catch(error){toast(error.message)}};
async function loadTree(){const container=$('document-tree');showLoading('document-tree','tree',5);try{const data=await api('/api/documents?scope=all&limit=50');container.replaceChildren();for(const doc of data.documents)container.append(treeNode(doc));if(!data.documents.length)container.innerHTML='<div class="empty-state">문서가 없습니다.</div>'}catch{container.innerHTML='<div class="empty-state">트리를 불러오지 못했습니다.</div>'}finally{finishLoading('document-tree')}}
function treeNode(doc){const wrap=document.createElement('div');wrap.dataset.id=doc.id;const row=document.createElement('div');row.className='tree-row'+(state.current&&state.current.id===doc.id?' active':'');const toggle=document.createElement('button');toggle.className='tree-toggle';toggle.type='button';toggle.hidden=!doc.has_children;if(doc.has_children){const expanded=state.expanded.has(doc.id);toggle.innerHTML=icon('chevron-right');toggle.classList.toggle('expanded',expanded);toggle.setAttribute('aria-label',expanded?'하위 문서 접기':'하위 문서 펼치기');toggle.setAttribute('aria-expanded',expanded?'true':'false');toggle.dataset.tooltip=expanded?'하위 문서 접기':'하위 문서 펼치기'}toggle.onclick=()=>toggleTree(doc,wrap,toggle);const title=document.createElement('button');title.className='tree-title';title.type='button';title.textContent=doc.title||'제목 없음';title.title=title.textContent;title.onclick=()=>push('/doc/'+doc.id);const add=iconAction('plus','하위 문서 추가',()=>createDocument(doc.id),'tree-action tree-add');const trash=iconAction('trash','휴지통으로 이동',()=>moveToTrash(doc.id),'tree-action tree-trash');add.hidden=!canEdit();trash.hidden=!canEdit();row.append(toggle,title,add,trash);wrap.append(row);if(state.expanded.has(doc.id))loadTreeChildren(doc.id,wrap,toggle);return wrap}
async function toggleTree(doc,wrap,toggle){if(!doc.has_children)return;if(state.expanded.has(doc.id)){state.expanded.delete(doc.id);wrap.querySelector('.tree-children')?.remove();toggle.classList.remove('expanded');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','하위 문서 펼치기');toggle.dataset.tooltip='하위 문서 펼치기'}else{state.expanded.add(doc.id);toggle.classList.add('expanded');toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','하위 문서 접기');toggle.dataset.tooltip='하위 문서 접기';await loadTreeChildren(doc.id,wrap,toggle)}}
async function loadTreeChildren(parentId,wrap,toggle){if(state.treeLoading.has(parentId)||wrap.querySelector('.tree-children'))return;state.treeLoading.add(parentId);const children=document.createElement('div');children.className='tree-children';children.setAttribute('aria-busy','true');children.innerHTML=loadingMarkup('tree',3);wrap.append(children);try{const data=await api('/api/documents?scope=all&parent_id='+encodeURIComponent(parentId)+'&limit=50');children.replaceChildren();for(const doc of data.documents)children.append(treeNode(doc));children.removeAttribute('aria-busy')}catch{children.remove();toggle.innerHTML=icon('alert');toggle.setAttribute('aria-label','하위 문서를 불러오지 못함');toggle.dataset.tooltip='하위 문서를 불러오지 못했습니다'}finally{state.treeLoading.delete(parentId)}}
function resizeDocumentTitle(){const title=$('document-title');title.style.height='auto';title.style.height=title.scrollHeight+'px'}
async function openDocument(id,pushUrl=true){if(state.current&&state.current.id===id){showPane('editor-view');return}if(state.dirty&&!await flushSave())return;if(pushUrl)history.pushState({},'','/doc/'+id);markNav('');showPane('editor-view');const title=$('document-title');title.value='';title.readOnly=true;title.classList.add('skeleton-title');showLoading('block-editor','document',5);$('append-block').hidden=true;try{const data=await api('/api/documents/'+id);state.current=data.document;state.dirty=false;title.value=state.current.title;resizeDocumentTitle();$('breadcrumb-title').textContent=state.current.title||'제목 없음';setFavoriteButton($('favorite-button'),!!state.current.is_favorite);$('readonly-notice').hidden=canEdit();$('readonly-notice').textContent=state.current.can_edit===false?'이 문서는 보기 권한만 있습니다.':'Viewer 권한에서는 문서를 읽을 수만 있습니다.';title.readOnly=!canEdit();$('append-block').hidden=!canEdit();$('new-child-button').hidden=!canEdit();$('trash-button').hidden=!canEdit();$('duplicate-button').hidden=!canEdit();$('upload-button').hidden=!canEdit();$('access-button').hidden=!state.current.can_manage_access;renderBlocks(state.current.blocks);resetHistory();setSaveState('saved');document.querySelectorAll('.tree-row').forEach(el=>el.classList.remove('active'));document.querySelector('[data-id="'+CSS.escape(id)+'"]>.tree-row')?.classList.add('active')}catch(error){state.current=null;$('block-editor').innerHTML='<div class="empty-state"><strong>문서를 열 수 없습니다.</strong><span>'+escapeText(error.message)+'</span></div>';setSaveState('failed')}finally{title.classList.remove('skeleton-title');finishLoading('block-editor')}}
function escapeText(value){const el=document.createElement('span');el.textContent=value;return el.innerHTML}
function updateDocumentChrome(value){const label=value.trim()||'제목 없음';$('breadcrumb-title').textContent=label;const treeTitle=document.querySelector('[data-id="'+CSS.escape(state.current.id)+'"]>.tree-row .tree-title');if(treeTitle){treeTitle.textContent=label;treeTitle.title=label}}
$('document-title').addEventListener('input',()=>{if(!state.current||!canEdit())return;resizeDocumentTitle();updateDocumentChrome($('document-title').value);scheduleSave()});
$('favorite-button').onclick=()=>state.current&&toggleFavorite(state.current.id,!state.current.is_favorite);
async function toggleFavorite(id,value){try{await api('/api/documents/'+id+'/favorite',{method:value?'PUT':'DELETE'});if(state.current&&state.current.id===id){state.current.is_favorite=value;setFavoriteButton($('favorite-button'),value)}if(['favorites','all','recent'].includes(state.view)&&!$('list-view').hidden)showList(state.view);toast(value?'즐겨찾기에 추가했습니다.':'즐겨찾기에서 해제했습니다.')}catch(error){toast(error.message)}}
$('trash-button').onclick=()=>state.current&&moveToTrash(state.current.id,true);
async function moveToTrash(id,openTrash=false){if(!confirm('이 문서를 휴지통으로 이동할까요? 하위 문서도 함께 이동합니다.'))return;try{await api('/api/documents/'+id+'/trash',{method:'POST'});if(state.current&&state.current.id===id){state.current=null;state.dirty=false;openTrash=true}await loadTree();if(openTrash)navigateView('trash');else if(!$('list-view').hidden)await showList(state.view);toast('문서를 휴지통으로 이동했습니다.')}catch(error){toast(error.message)}}
async function restoreDoc(id){try{await api('/api/documents/'+id+'/restore',{method:'POST'});await loadTree();showList('trash');toast('문서를 복구했습니다.')}catch(error){toast(error.message)}}
async function deleteForever(id){if(!confirm('문서와 하위 문서를 영구 삭제합니다. 되돌릴 수 없습니다.'))return;try{await api('/api/documents/'+id,{method:'DELETE'});showList('trash');toast('문서를 영구 삭제했습니다.')}catch(error){toast(error.message)}}
function renderBlocks(blocks){$('block-editor').replaceChildren();(blocks.length?blocks:[newBlock()]).forEach((block,index)=>$('block-editor').append(blockRow(block,index)));renumberBlocks()}
function newBlock(type='text'){return{id:'blk_'+crypto.randomUUID().replaceAll('-',''),type,content:'',checked:false,indent_level:0}}
function blockRow(block,index){const row=document.createElement('div');row.className='block-row';row.draggable=false;row.dataset.id=block.id;row.dataset.indent=String(block.indent_level||0);row.style.setProperty('--indent',String(block.indent_level||0));const handle=document.createElement('button');handle.className='block-handle';handle.type='button';handle.innerHTML=icon('grip');handle.tabIndex=0;handle.draggable=canEdit();handle.setAttribute('aria-label','블록 순서 변경');handle.dataset.tooltip='드래그하거나 눌러 블록 메뉴 열기';let content;if(block.type==='todo'){const wrap=document.createElement('div');wrap.className='todo-wrap'+(block.checked?' checked':'');const check=document.createElement('input');check.type='checkbox';check.checked=!!block.checked;check.disabled=!canEdit();check.setAttribute('aria-label','할 일 완료 상태');check.onchange=()=>{wrap.classList.toggle('checked',check.checked);scheduleSave()};content=editable(block);wrap.append(check,content);row.append(handle,wrap)}else if(block.type==='toggle'){const parts=splitToggleContent(block.content);const wrap=document.createElement('div');wrap.className='toggle-wrap';const summaryLine=document.createElement('div');summaryLine.className='toggle-summary';const caret=document.createElement('button');caret.className='toggle-caret';caret.type='button';caret.innerHTML=icon('chevron-right');const toggleLabel=block.checked?'토글 접기':'토글 펼치기';caret.setAttribute('aria-label',toggleLabel);caret.dataset.tooltip=toggleLabel;caret.setAttribute('aria-expanded',block.checked?'true':'false');const summary=editable({...block,content:parts.summary},'summary');summary.dataset.placeholder='토글 제목';const body=editable({...block,content:parts.body},'body');body.classList.add('toggle-body');body.dataset.placeholder='토글 내용을 입력하세요';body.hidden=!block.checked;caret.onclick=()=>{const open=caret.getAttribute('aria-expanded')!=='true';const label=open?'토글 접기':'토글 펼치기';caret.setAttribute('aria-expanded',open?'true':'false');caret.setAttribute('aria-label',label);caret.dataset.tooltip=label;body.hidden=!open;if(canEdit())scheduleSave()};summaryLine.append(caret,summary);wrap.append(summaryLine,body);row.append(handle,wrap)}else if(block.type==='callout'){const wrap=document.createElement('div');wrap.className='callout-wrap';wrap.innerHTML=icon('alert');content=editable(block);content.dataset.placeholder='콜아웃 내용을 입력하세요';wrap.append(content);row.append(handle,wrap)}else if(block.type==='table'||block.type==='database'){content=structuredTableBlock(block,block.type==='database');row.append(handle,content)}else if(['image','video','audio','file','bookmark','embed','page_link'].includes(block.type)){content=mediaBlock(block);row.append(handle,content)}else if(block.type==='toc'){content=tocBlock();content.dataset.type='toc';row.append(handle,content)}else if(block.type==='math'){const wrap=document.createElement('div');wrap.className='math-block';content=editable(block);content.dataset.placeholder='수식을 입력하세요';wrap.append(content);row.append(handle,wrap)}else{content=editable(block);row.append(handle,content)}bindBlockInteractions(row,handle);return row}
function parseGrid(value,database){try{const data=JSON.parse(value);if(Array.isArray(data)&&data.length&&data.every(row=>Array.isArray(row)))return data.slice(0,50).map(row=>row.slice(0,12).map(cell=>String(cell).slice(0,500)))}catch{}return database?[['이름','상태'],['','']]:[['열 1','열 2'],['','']]}
function structuredTableBlock(block,database){if(database)return databaseBlock(block);const wrap=document.createElement('div');wrap.className='block-content structured-block';wrap.dataset.type=block.type;wrap.dataset.structured='grid';const table=document.createElement('table');table.className='block-table';const grid=parseGrid(block.content,false);grid.forEach((row,rowIndex)=>{const tr=document.createElement('tr');row.forEach((value,colIndex)=>{const cell=document.createElement(rowIndex===0?'th':'td');const input=document.createElement('input');input.value=value;input.disabled=!canEdit();input.maxLength=500;input.setAttribute('aria-label',rowIndex===0?'열 이름 '+(colIndex+1):'셀 '+rowIndex+'-'+(colIndex+1));input.oninput=scheduleSave;cell.append(input);tr.append(cell)});(rowIndex===0?table.createTHead():table.tBodies[0]||table.createTBody()).append(tr)});wrap.append(table);if(canEdit()){const actions=document.createElement('div');actions.className='block-table-actions';const addRow=document.createElement('button');addRow.type='button';addRow.textContent='행 추가';addRow.onclick=()=>{const cols=table.rows[0]?.cells.length||2;const tr=document.createElement('tr');for(let i=0;i<cols;i++){const td=document.createElement('td');const input=document.createElement('input');input.maxLength=500;input.setAttribute('aria-label','새 셀');input.oninput=scheduleSave;td.append(input);tr.append(td)}table.tBodies[0].append(tr);scheduleSave()};const addCol=document.createElement('button');addCol.type='button';addCol.textContent='열 추가';addCol.onclick=()=>{for(const [i,tr] of [...table.rows].entries()){const cell=document.createElement(i===0?'th':'td');const input=document.createElement('input');input.maxLength=500;input.value=i===0?'새 열':'';input.setAttribute('aria-label',i===0?'새 열 이름':'새 셀');input.oninput=scheduleSave;cell.append(input);tr.append(cell)}scheduleSave()};actions.append(addRow,addCol);wrap.append(actions)}return wrap}
const DATABASE_PROPERTY_TYPES={text:'텍스트',select:'선택',person:'담당자',number:'숫자',date:'날짜',checkbox:'체크박스',url:'URL'};
function databaseUid(prefix){return prefix+'_'+crypto.randomUUID().replaceAll('-','').slice(0,18)}
function defaultDatabaseModel(){const title='col_title',status='col_status',person='col_person',due='col_due';return{version:2,title:'팀 작업',columns:[{id:title,name:'작업',type:'text',options:[]},{id:status,name:'상태',type:'select',options:['밀린 업무','진행 예정','진행 중','완료']},{id:person,name:'담당자',type:'person',options:[]},{id:due,name:'마감일',type:'date',options:[]}],rows:[{id:databaseUid('row'),cells:{[title]:'새 작업',[status]:'진행 예정',[person]:'',[due]:''}}],view:{mode:'table',groupBy:status,sortBy:'',sortDir:'asc'}}}
function parseDatabaseModel(value){let parsed;try{parsed=JSON.parse(value)}catch{}if(Array.isArray(parsed)&&parsed.length&&parsed.every(row=>Array.isArray(row))){const headers=parsed[0].slice(0,12);const columns=headers.map((name,index)=>{const label=String(name||('속성 '+(index+1))).slice(0,80);const status=/상태/.test(label);return{id:'col_'+index,name:label,type:status?'select':'text',options:status?['밀린 업무','진행 예정','진행 중','완료']:[]}});const rows=parsed.slice(1,201).map(values=>({id:databaseUid('row'),cells:Object.fromEntries(columns.map((column,index)=>[column.id,String(values[index]??'').slice(0,500)]))}));const statusColumn=columns.find(column=>column.type==='select');return{version:2,title:'팀 작업',columns:columns.length?columns:defaultDatabaseModel().columns,rows:rows.length?rows:[],view:{mode:'table',groupBy:statusColumn?.id||columns[0]?.id||'',sortBy:'',sortDir:'asc'}}}if(!parsed||parsed.version!==2||!Array.isArray(parsed.columns)||!Array.isArray(parsed.rows))return defaultDatabaseModel();const columns=parsed.columns.slice(0,12).map((column,index)=>({id:/^[A-Za-z0-9_-]{3,40}$/.test(String(column.id||''))?String(column.id):'col_'+index,name:String(column.name||('속성 '+(index+1))).slice(0,80),type:DATABASE_PROPERTY_TYPES[column.type]?column.type:'text',options:[...new Set((Array.isArray(column.options)?column.options:[]).map(value=>String(value).slice(0,80)).filter(Boolean))].slice(0,30)}));if(!columns.length)return defaultDatabaseModel();const ids=new Set(columns.map(column=>column.id));const rows=parsed.rows.slice(0,200).map(row=>({id:/^[A-Za-z0-9_-]{3,50}$/.test(String(row.id||''))?String(row.id):databaseUid('row'),cells:Object.fromEntries(columns.map(column=>[column.id,column.type==='checkbox'?!!row.cells?.[column.id]:String(row.cells?.[column.id]??'').slice(0,500)]))}));const view=parsed.view||{};return{version:2,title:String(parsed.title||'팀 작업').slice(0,120),columns,rows,view:{mode:view.mode==='board'?'board':'table',groupBy:ids.has(view.groupBy)?view.groupBy:(columns.find(column=>column.type==='select')?.id||columns[0].id),sortBy:ids.has(view.sortBy)?view.sortBy:'',sortDir:view.sortDir==='desc'?'desc':'asc'}}}
function databaseMiniButton(label,iconName,handler){const button=document.createElement('button');button.type='button';button.className='db-mini-button';button.innerHTML=icon(iconName);button.setAttribute('aria-label',label);button.dataset.tooltip=label;button.disabled=!canEdit();button.onclick=handler;return button}
function databaseRows(model,query=''){let rows=[...model.rows];const needle=query.trim().toLocaleLowerCase('ko');if(needle)rows=rows.filter(row=>model.columns.some(column=>String(row.cells[column.id]??'').toLocaleLowerCase('ko').includes(needle)));const sortColumn=model.columns.find(column=>column.id===model.view.sortBy);if(sortColumn)rows.sort((a,b)=>{const left=a.cells[sortColumn.id],right=b.cells[sortColumn.id];let result=0;if(sortColumn.type==='number')result=(Number(left)||0)-(Number(right)||0);else if(sortColumn.type==='checkbox')result=Number(!!left)-Number(!!right);else result=String(left??'').localeCompare(String(right??''),'ko',{numeric:true});return model.view.sortDir==='desc'?-result:result});return rows}
function databaseCellInput(wrap,row,column,{compact=false,onGroupChange=false}={}){let input;if(column.type==='select'){input=document.createElement('select');const current=String(row.cells[column.id]??'');const values=[...new Set(['',...column.options,current])];for(const value of values){const option=document.createElement('option');option.value=value;option.textContent=value||'선택 안 함';input.append(option)}input.value=current}else{input=document.createElement('input');input.type=column.type==='checkbox'?'checkbox':column.type==='number'?'number':column.type==='date'?'date':column.type==='url'?'url':'text';if(input.type==='checkbox')input.checked=!!row.cells[column.id];else input.value=String(row.cells[column.id]??'');if(['text','url'].includes(input.type))input.maxLength=500}input.className='db-cell-input type-'+column.type+(compact?' compact':'');input.disabled=!canEdit();input.setAttribute('aria-label',column.name+' 값');const update=()=>{const value=input.type==='checkbox'?input.checked:input.value;row.cells[column.id]=value;if(column.type==='select'&&value&&!column.options.includes(value))column.options.push(value);scheduleSave();if(onGroupChange)renderDatabaseBody(wrap)};input.oninput=column.type==='select'||column.type==='checkbox'?null:update;input.onchange=update;return input}
function renderDatabaseTable(wrap,body){const model=wrap._databaseModel;const rows=databaseRows(model,wrap._databaseQuery);const scroll=document.createElement('div');scroll.className='db-table-scroll';const table=document.createElement('table');table.className='db-table';const head=table.createTHead();const header=head.insertRow();for(const [index,column] of model.columns.entries()){const th=document.createElement('th');const property=document.createElement('div');property.className='db-property-head';const name=document.createElement('input');name.className='db-property-name';name.value=column.name;name.maxLength=80;name.disabled=!canEdit();name.setAttribute('aria-label','속성 이름');name.oninput=()=>{column.name=name.value;scheduleSave()};const type=document.createElement('select');type.className='db-property-type';type.disabled=!canEdit();type.setAttribute('aria-label',column.name+' 속성 유형');for(const [value,label] of Object.entries(DATABASE_PROPERTY_TYPES)){const option=document.createElement('option');option.value=value;option.textContent=label;option.selected=column.type===value;type.append(option)}type.onchange=()=>{column.type=type.value;if(column.type==='checkbox')for(const row of model.rows)row.cells[column.id]=!!row.cells[column.id];renderDatabaseBlock(wrap);scheduleSave()};const actions=document.createElement('span');actions.className='db-property-actions';if(column.type==='select')actions.append(databaseMiniButton('선택 옵션 추가','plus',()=>{const value=prompt('추가할 선택 옵션을 입력하세요.');if(value&&value.trim()&&!column.options.includes(value.trim())){column.options.push(value.trim().slice(0,80));renderDatabaseBlock(wrap);scheduleSave()}}));actions.append(databaseMiniButton('왼쪽으로 이동','chevron-left',()=>{if(index<1)return;[model.columns[index-1],model.columns[index]]=[model.columns[index],model.columns[index-1]];renderDatabaseBlock(wrap);scheduleSave()}),databaseMiniButton('오른쪽으로 이동','chevron-right',()=>{if(index>=model.columns.length-1)return;[model.columns[index+1],model.columns[index]]=[model.columns[index],model.columns[index+1]];renderDatabaseBlock(wrap);scheduleSave()}),databaseMiniButton('속성 삭제','trash',()=>{if(model.columns.length===1||!confirm(column.name+' 속성을 삭제할까요?'))return;model.columns.splice(index,1);for(const row of model.rows)delete row.cells[column.id];if(model.view.groupBy===column.id)model.view.groupBy=model.columns[0].id;if(model.view.sortBy===column.id)model.view.sortBy='';renderDatabaseBlock(wrap);scheduleSave()}));property.append(name,type,actions);th.append(property);header.append(th)}const actionHead=document.createElement('th');actionHead.className='db-row-actions-cell';actionHead.textContent='관리';header.append(actionHead);const tbody=table.createTBody();for(const row of rows){const tr=tbody.insertRow();for(const column of model.columns){const td=tr.insertCell();td.className='db-cell';td.append(databaseCellInput(wrap,row,column))}const actionCell=tr.insertCell();actionCell.className='db-row-actions-cell';const actions=document.createElement('span');actions.className='db-row-actions';const index=model.rows.indexOf(row);actions.append(databaseMiniButton('위로 이동','arrow-up',()=>{if(index<1)return;[model.rows[index-1],model.rows[index]]=[model.rows[index],model.rows[index-1]];renderDatabaseBody(wrap);scheduleSave()}),databaseMiniButton('아래로 이동','arrow-down',()=>{if(index>=model.rows.length-1)return;[model.rows[index+1],model.rows[index]]=[model.rows[index],model.rows[index+1]];renderDatabaseBody(wrap);scheduleSave()}),databaseMiniButton('행 삭제','trash',()=>{model.rows.splice(index,1);renderDatabaseBlock(wrap);scheduleSave()}));actionCell.append(actions)}scroll.append(table);body.append(scroll);if(!rows.length){const empty=document.createElement('div');empty.className='db-empty';empty.textContent=wrap._databaseQuery?'검색 결과가 없습니다.':'행이 없습니다. 아래에서 새 행을 추가하세요.';body.append(empty)}}
function databaseGroupValues(model,column,rows){const values=column.type==='select'?[...column.options]:[];for(const row of rows){const value=String(row.cells[column.id]??'').trim();if(value&&!values.includes(value))values.push(value)}values.push('');return values.slice(0,30)}
function renderDatabaseBoard(wrap,body){const model=wrap._databaseModel;const rows=databaseRows(model,wrap._databaseQuery);const groupColumn=model.columns.find(column=>column.id===model.view.groupBy)||model.columns[0];const titleColumn=model.columns.find(column=>column.type==='text')||model.columns[0];const board=document.createElement('div');board.className='db-board';for(const groupValue of databaseGroupValues(model,groupColumn,rows)){const grouped=rows.filter(row=>String(row.cells[groupColumn.id]??'')===groupValue);const column=document.createElement('section');column.className='db-board-column';column.dataset.groupValue=groupValue;const heading=document.createElement('header');heading.className='db-board-heading';heading.innerHTML='<span><i class="db-status-dot"></i>'+escapeText(groupValue||'미분류')+'</span><span>'+grouped.length+'</span>';const list=document.createElement('div');list.className='db-board-list';for(const row of grouped){const card=document.createElement('article');card.className='db-card';card.draggable=canEdit();card.dataset.rowId=row.id;card.ondragstart=event=>{card.classList.add('dragging');event.dataTransfer.setData('text/plain',row.id)};card.ondragend=()=>card.classList.remove('dragging');const title=databaseCellInput(wrap,row,titleColumn,{compact:true});title.classList.add('db-card-title');const meta=document.createElement('div');meta.className='db-card-meta';for(const property of model.columns.filter(item=>item.id!==titleColumn.id).slice(0,3)){const field=document.createElement('label');field.className='db-card-field';const label=document.createElement('span');label.textContent=property.name;field.append(label,databaseCellInput(wrap,row,property,{compact:true,onGroupChange:property.id===groupColumn.id}));meta.append(field)}const footer=document.createElement('footer');footer.className='db-card-footer';footer.append(databaseMiniButton('카드 삭제','trash',()=>{model.rows.splice(model.rows.indexOf(row),1);renderDatabaseBlock(wrap);scheduleSave()}));card.append(title,meta,footer);list.append(card)}column.ondragover=event=>{if(!canEdit())return;event.preventDefault();column.classList.add('drag-over')};column.ondragleave=()=>column.classList.remove('drag-over');column.ondrop=event=>{event.preventDefault();column.classList.remove('drag-over');const row=model.rows.find(item=>item.id===event.dataTransfer.getData('text/plain'));if(!row)return;row.cells[groupColumn.id]=groupColumn.type==='checkbox'?groupValue==='완료':groupValue;renderDatabaseBody(wrap);scheduleSave()};const add=document.createElement('button');add.type='button';add.className='db-board-add';add.textContent='+ 이 분류에 작업 추가';add.hidden=!canEdit();add.onclick=()=>{const row={id:databaseUid('row'),cells:Object.fromEntries(model.columns.map(item=>[item.id,item.type==='checkbox'?false:'']))};row.cells[groupColumn.id]=groupValue;row.cells[titleColumn.id]='새 작업';model.rows.push(row);renderDatabaseBlock(wrap);scheduleSave()};column.append(heading,list,add);board.append(column)}body.append(board)}
function renderDatabaseBody(wrap){const old=wrap.querySelector('.db-view-body');const body=document.createElement('div');body.className='db-view-body';if(wrap._databaseModel.view.mode==='board')renderDatabaseBoard(wrap,body);else renderDatabaseTable(wrap,body);old?.replaceWith(body)}
function renderDatabaseBlock(wrap){const model=wrap._databaseModel;wrap.replaceChildren();const header=document.createElement('div');header.className='db-header';const title=document.createElement('input');title.className='db-title';title.value=model.title;title.maxLength=120;title.disabled=!canEdit();title.setAttribute('aria-label','데이터베이스 이름');title.oninput=()=>{model.title=title.value;scheduleSave()};const count=document.createElement('span');count.className='db-count';count.textContent=model.rows.length+'개 작업';header.append(title,count);const views=document.createElement('div');views.className='db-viewbar';for(const [mode,label,iconName] of [['table','표','list'],['board','보드','files']]){const button=document.createElement('button');button.type='button';button.className='db-view-tab'+(model.view.mode===mode?' active':'');button.innerHTML=icon(iconName)+'<span>'+label+(mode==='board'?' · 분류별':'')+'</span>';button.onclick=()=>{model.view.mode=mode;renderDatabaseBlock(wrap);scheduleSave()};views.append(button)}const toolbar=document.createElement('div');toolbar.className='db-toolbar';const searchWrap=document.createElement('label');searchWrap.className='db-search-wrap';searchWrap.innerHTML=icon('search');const search=document.createElement('input');search.className='db-search';search.type='search';search.placeholder='작업 검색';search.value=wrap._databaseQuery||'';search.setAttribute('aria-label','데이터베이스 검색');search.oninput=()=>{wrap._databaseQuery=search.value;renderDatabaseBody(wrap)};searchWrap.append(search);const sort=document.createElement('select');sort.className='db-select';sort.setAttribute('aria-label','정렬 속성');sort.innerHTML='<option value="">정렬 안 함</option>'+model.columns.map(column=>'<option value="'+escapeText(column.id)+'"'+(model.view.sortBy===column.id?' selected':'')+'>'+escapeText(column.name)+' 순</option>').join('');sort.onchange=()=>{model.view.sortBy=sort.value;renderDatabaseBody(wrap);scheduleSave()};const direction=document.createElement('button');direction.type='button';direction.className='db-control';direction.innerHTML=icon(model.view.sortDir==='desc'?'arrow-down':'arrow-up')+'<span>'+(model.view.sortDir==='desc'?'내림차순':'오름차순')+'</span>';direction.onclick=()=>{model.view.sortDir=model.view.sortDir==='desc'?'asc':'desc';renderDatabaseBlock(wrap);scheduleSave()};toolbar.append(searchWrap,sort,direction);if(model.view.mode==='board'){const group=document.createElement('select');group.className='db-select';group.setAttribute('aria-label','보드 분류 속성');for(const column of model.columns){const option=document.createElement('option');option.value=column.id;option.textContent=column.name+'별';option.selected=model.view.groupBy===column.id;group.append(option)}group.onchange=()=>{model.view.groupBy=group.value;renderDatabaseBlock(wrap);scheduleSave()};toolbar.append(group)}const addProperty=document.createElement('button');addProperty.type='button';addProperty.className='db-control';addProperty.innerHTML=icon('plus')+'<span>속성 추가</span>';addProperty.hidden=!canEdit();addProperty.onclick=()=>{if(model.columns.length>=12)return toast('속성은 최대 12개까지 추가할 수 있습니다.');const id=databaseUid('col');model.columns.push({id,name:'새 속성',type:'text',options:[]});for(const row of model.rows)row.cells[id]='';renderDatabaseBlock(wrap);scheduleSave()};toolbar.append(addProperty);const body=document.createElement('div');body.className='db-view-body';const footer=document.createElement('footer');footer.className='db-footer';const addRow=document.createElement('button');addRow.type='button';addRow.className='db-control primary';addRow.innerHTML=icon('plus')+'<span>새 작업</span>';addRow.hidden=!canEdit();addRow.onclick=()=>{if(model.rows.length>=200)return toast('작업은 최대 200개까지 추가할 수 있습니다.');const first=model.columns.find(column=>column.type==='text')||model.columns[0];const row={id:databaseUid('row'),cells:Object.fromEntries(model.columns.map(column=>[column.id,column.type==='checkbox'?false:'']))};row.cells[first.id]='새 작업';model.rows.push(row);renderDatabaseBlock(wrap);scheduleSave()};const note=document.createElement('span');note.className='db-footer-note';note.textContent='최대 200개 작업 · 12개 속성';footer.append(addRow,note);wrap.append(header,views,toolbar,body,footer);renderDatabaseBody(wrap)}
function databaseBlock(block){const wrap=document.createElement('div');wrap.className='block-content structured-block database-block';wrap.dataset.type='database';wrap.dataset.database='true';wrap._databaseModel=parseDatabaseModel(block.content);wrap._databaseQuery='';renderDatabaseBlock(wrap);return wrap}
function safeWebUrl(value){try{const url=new URL(String(value||'').trim());return ['http:','https:'].includes(url.protocol)?url.href:''}catch{return''}}
function safeEmbedUrl(value){const href=safeWebUrl(value);if(!href)return'';const url=new URL(href);const host=url.hostname.toLowerCase();if(host==='youtu.be')return'https://www.youtube.com/embed/'+url.pathname.slice(1);if(host.endsWith('youtube.com')){const id=url.searchParams.get('v');return id?'https://www.youtube.com/embed/'+encodeURIComponent(id):''}if(host==='vimeo.com')return'https://player.vimeo.com/video/'+url.pathname.split('/').filter(Boolean).at(-1);if(['www.figma.com','figma.com','www.loom.com','loom.com','codepen.io','replit.com','www.google.com'].some(item=>host===item||host.endsWith('.'+item)))return href;return''}
function hideUrlPasteMenu(){const menu=$('url-paste-menu');menu.hidden=true;menu.replaceChildren();state.urlPaste=null;state.urlPasteIndex=0}
function updateUrlPasteSelection(){const buttons=[...$('url-paste-menu').querySelectorAll('button')];buttons.forEach((button,index)=>button.classList.toggle('active',index===state.urlPasteIndex));buttons[state.urlPasteIndex]?.focus({preventScroll:true})}
function applyUrlPasteChoice(choice){const pending=state.urlPaste;if(!pending||!pending.el.isConnected)return hideUrlPasteMenu();const {el,url}=pending;const row=el.closest('.block-row');hideUrlPasteMenu();if(choice==='preview'){const type=safeEmbedUrl(url)?'embed':'bookmark';const next=blockRow({id:row.dataset.id,type,content:url,checked:false,indent_level:Number(row.dataset.indent||0)},0);row.replaceWith(next);renumberBlocks();focusBlock(next);scheduleSave();return}if(choice==='link'){const anchor=document.createElement('a');anchor.href=url;anchor.target='_blank';anchor.rel='noopener noreferrer';anchor.textContent=url;el.replaceChildren(anchor);el.dataset.rich='true'}else{el.textContent=url;delete el.dataset.rich}placeCaret(el,true);scheduleSave()}
function openUrlPasteMenu(el,url){hideSlashMenu();hideBlockMenu();hideUrlPasteMenu();state.urlPaste={el,url};const menu=$('url-paste-menu');const supported=!!safeEmbedUrl(url);const choices=[['preview','code','미리보기로 삽입',supported?'지원되는 서비스 임베드':'링크 카드로 미리보기'],['link','files','링크로 삽입','클릭할 수 있는 링크'],['text','type','주소 텍스트로 붙여넣기','서식 없는 일반 텍스트']];menu.innerHTML='<div class="url-paste-heading">URL을 어떻게 붙여넣을까요?</div>'+choices.map(([choice,iconName,label,description],index)=>'<button type="button" role="menuitem" data-url-choice="'+choice+'" class="'+(index===0?'active':'')+'"><span class="url-paste-icon">'+icon(iconName)+'</span><span class="url-paste-copy"><strong>'+label+'</strong><small>'+description+'</small></span></button>').join('');menu.querySelectorAll('button').forEach((button,index)=>{button.onmouseenter=()=>{state.urlPasteIndex=index;updateUrlPasteSelection()};button.onmousedown=event=>event.preventDefault();button.onclick=()=>applyUrlPasteChoice(button.dataset.urlChoice)});menu.onkeydown=event=>{const buttons=[...menu.querySelectorAll('button')];if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();state.urlPasteIndex=(state.urlPasteIndex+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;updateUrlPasteSelection()}else if(event.key==='Enter'){event.preventDefault();applyUrlPasteChoice(buttons[state.urlPasteIndex].dataset.urlChoice)}else if(event.key==='Escape'){event.preventDefault();const target=state.urlPaste?.el;hideUrlPasteMenu();target?.focus()}};menu.hidden=false;const rect=el.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(rect.left,innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,Math.min(rect.bottom+6,innerHeight-menu.offsetHeight-8))+'px';updateUrlPasteSelection()}
function mediaBlock(block){const wrap=document.createElement('div');wrap.className='block-content media-block';wrap.dataset.type=block.type;wrap.dataset.urlBlock='true';const input=document.createElement('input');input.className='media-url';input.type='url';input.value=block.content||'';const mediaLabels={image:'이미지',video:'동영상',audio:'오디오',file:'파일',bookmark:'웹 북마크',embed:'임베드',page_link:'문서 링크'};input.placeholder=({image:'이미지 URL을 붙여넣으세요',video:'동영상 URL을 붙여넣으세요',audio:'오디오 URL을 붙여넣으세요',file:'파일 URL을 붙여넣으세요',bookmark:'웹페이지 URL을 붙여넣으세요',embed:'YouTube, Figma, Loom 등 URL',page_link:'JoripNote 문서 URL을 붙여넣으세요'})[block.type];input.setAttribute('aria-label',(mediaLabels[block.type]||'미디어')+' URL');input.disabled=!canEdit();input.maxLength=2000;const preview=document.createElement('div');preview.className='media-preview';preview.setAttribute('aria-live','polite');const refresh=()=>renderMediaPreview(preview,block.type,input.value);input.oninput=()=>{refresh();scheduleSave()};wrap.append(input,preview);refresh();if(!canEdit()&&safeWebUrl(input.value))input.hidden=true;return wrap}
function renderMediaPreview(preview,type,value){preview.replaceChildren();const href=safeWebUrl(value);if(!href){preview.textContent='URL을 입력하면 미리보기가 표시됩니다.';return}if(type==='image'){const img=document.createElement('img');img.src=href;img.alt='문서 이미지';img.loading='lazy';preview.append(img);return}if(type==='video'){const video=document.createElement('video');video.src=href;video.controls=true;video.preload='metadata';preview.append(video);return}if(type==='audio'){const audio=document.createElement('audio');audio.src=href;audio.controls=true;audio.preload='metadata';preview.append(audio);return}if(type==='embed'){const embed=safeEmbedUrl(href);if(embed){const frame=document.createElement('iframe');frame.src=embed;frame.loading='lazy';frame.referrerPolicy='no-referrer';frame.allow='fullscreen; picture-in-picture';frame.sandbox='allow-scripts allow-same-origin allow-presentation';preview.append(frame);return}}const link=document.createElement('a');link.href=href;link.target='_blank';link.rel='noopener noreferrer';link.innerHTML=icon(type==='bookmark'?'star':'files')+'<span>'+(type==='page_link'?'연결된 문서 열기':type==='file'?'파일 열기':'웹페이지 열기')+'</span>';preview.append(link)}
function tocBlock(){const wrap=document.createElement('div');wrap.className='block-content toc-block';wrap.contentEditable='false';wrap.innerHTML='<strong>목차</strong>';queueMicrotask(()=>refreshTableOfContents(wrap));return wrap}
function refreshTableOfContents(target){if(!target?.isConnected)return;target.querySelectorAll('a').forEach(a=>a.remove());const headings=[...target.closest('.document-editor')?.querySelectorAll('.block-content[data-type^="heading"]')||[]];for(const [index,heading] of headings.entries()){if(!heading.id)heading.id='heading-'+index+'-'+Math.random().toString(36).slice(2,7);const link=document.createElement('a');link.href='#'+heading.id;link.textContent=heading.textContent||'제목 없음';link.style.paddingLeft=((Number(heading.dataset.type.slice(-1))||1)-1)*10+'px';target.append(link)}if(!headings.length){const empty=document.createElement('span');empty.className='muted';empty.textContent='제목 블록을 추가하면 자동으로 표시됩니다.';target.append(empty)}}
function clearDropTargets(){document.querySelectorAll('.block-row.drop-before,.block-row.drop-after').forEach(row=>row.classList.remove('drop-before','drop-after'))}
function clearBlockSelection(){state.selectedBlocks.clear();document.querySelectorAll('.block-row.selected').forEach(row=>row.classList.remove('selected'))}
function toggleBlockSelection(row,additive){if(!additive)clearBlockSelection();if(state.selectedBlocks.has(row.dataset.id)){state.selectedBlocks.delete(row.dataset.id);row.classList.remove('selected')}else{state.selectedBlocks.add(row.dataset.id);row.classList.add('selected')}}
function selectedRows(){return [...$('block-editor').children].filter(row=>state.selectedBlocks.has(row.dataset.id))}
function bindBlockInteractions(row,handle){if(!canEdit())return;handle.addEventListener('dragstart',(event)=>{handle.dataset.dragging='true';state.dragRow=row;row.classList.add('dragging');event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',row.dataset.id);hideBlockMenu()});handle.addEventListener('dragend',()=>{row.classList.remove('dragging');state.dragRow=null;clearDropTargets();setTimeout(()=>delete handle.dataset.dragging,0)});handle.addEventListener('click',(event)=>{if(handle.dataset.dragging)return;if(event.shiftKey||event.ctrlKey||event.metaKey){toggleBlockSelection(row,true);hideBlockMenu();return}clearBlockSelection();const rect=handle.getBoundingClientRect();showBlockMenu(row,rect.left,rect.bottom+4)});row.addEventListener('dragover',(event)=>{if(!state.dragRow||state.dragRow===row)return;event.preventDefault();event.dataTransfer.dropEffect='move';clearDropTargets();row.classList.add(event.clientY>row.getBoundingClientRect().top+row.getBoundingClientRect().height/2?'drop-after':'drop-before')});row.addEventListener('dragleave',(event)=>{if(!row.contains(event.relatedTarget))row.classList.remove('drop-before','drop-after')});row.addEventListener('drop',(event)=>{if(!state.dragRow||state.dragRow===row)return;event.preventDefault();const after=row.classList.contains('drop-after');const dragged=state.dragRow;after?row.after(dragged):row.before(dragged);dragged.classList.remove('dragging');state.dragRow=null;clearDropTargets();renumberBlocks();scheduleSave();dragged.querySelector('.block-content')?.focus()});row.addEventListener('contextmenu',(event)=>{event.preventDefault();showBlockMenu(row,event.clientX,event.clientY)})}
function moveBlockRow(row,direction){const sibling=direction<0?row.previousElementSibling:row.nextElementSibling;if(!sibling)return false;direction<0?sibling.before(row):sibling.after(row);renumberBlocks();scheduleSave();row.querySelector('.block-content')?.focus();return true}
function splitToggleContent(value){const parts=String(value||'').split('\n');return{summary:parts.shift()||'',body:parts.join('\n')}}
const RICH_PREFIX='@qwerty-rich:';
function sanitizeRichHtml(html){const template=document.createElement('template');template.innerHTML=String(html||'');for(const node of [...template.content.querySelectorAll('*')]){const tag=node.tagName.toLowerCase();if(!['b','strong','i','em','u','s','code','a','br'].includes(tag)){node.replaceWith(...node.childNodes);continue}const href=tag==='a'?safeWebUrl(node.getAttribute('href')):'';for(const attr of [...node.attributes])node.removeAttribute(attr.name);if(tag==='a'){if(href){node.href=href;node.target='_blank';node.rel='noopener noreferrer'}else node.replaceWith(...node.childNodes)}}return template.innerHTML}
const BLOCK_A11Y_LABELS={text:'텍스트',heading1:'제목 1',heading2:'제목 2',heading3:'제목 3',heading4:'제목 4',bullet:'글머리 목록',numbered:'번호 목록',todo:'할 일',toggle:'토글',callout:'콜아웃',quote:'인용문',code:'코드',math:'수학 공식',divider:'구분선'};
function editable(block,part='main'){const el=document.createElement('div');const editableMode=canEdit()&&block.type!=='divider';el.className='block-content';el.contentEditable=editableMode?'true':'false';el.dataset.type=block.type;if(part!=='main')el.dataset.togglePart=part;el.dataset.placeholder=block.type==='text'?'내용을 입력하거나 / 명령어를 사용하세요':'';const label=(BLOCK_A11Y_LABELS[block.type]||'문서')+(part==='summary'?' 제목':part==='body'?' 내용':' 블록');if(editableMode){el.setAttribute('role','textbox');el.setAttribute('aria-multiline','true');el.setAttribute('aria-label',label)}else if(block.type==='divider'){el.setAttribute('role','separator')}else if(/^heading[1-4]$/.test(block.type)){el.setAttribute('role','heading');el.setAttribute('aria-level',block.type.slice(-1))}const raw=String(block.content||'');if(part==='main'&&raw.startsWith(RICH_PREFIX)){el.innerHTML=sanitizeRichHtml(raw.slice(RICH_PREFIX.length));el.dataset.rich='true'}else el.textContent=raw;el.addEventListener('input',()=>{if(part==='main'&&el.textContent.startsWith('/'))showSlashMenu(el);else hideSlashMenu();scheduleSave();document.querySelectorAll('.toc-block').forEach(refreshTableOfContents)});el.addEventListener('keydown',(event)=>handleBlockKey(event,el));return el}
function caretOffset(el){const selection=getSelection();if(!selection||!selection.rangeCount||!selection.isCollapsed||!el.contains(selection.anchorNode))return null;const range=selection.getRangeAt(0).cloneRange();range.selectNodeContents(el);range.setEnd(selection.anchorNode,selection.anchorOffset);return range.toString().length}
function selectionAtEnd(el){return caretOffset(el)===el.textContent.length}
function placeCaret(el,atEnd){el.focus();const range=document.createRange();range.selectNodeContents(el);range.collapse(!atEnd);const selection=getSelection();selection.removeAllRanges();selection.addRange(range)}
function moveCaretToAdjacent(el,direction){const editables=[...document.querySelectorAll('.block-content[contenteditable="true"],.media-url:not(:disabled),.block-table input:not(:disabled)')].filter(item=>item.offsetParent!==null);const index=editables.indexOf(el);const target=editables[index+direction];if(!target)return false;if(target.matches('input')){target.focus();target.setSelectionRange(direction<0?target.value.length:0,direction<0?target.value.length:0)}else placeCaret(target,direction<0);target.scrollIntoView({block:'nearest'});return true}
function applyInputShortcut(event,el){if(event.key!==' '||el.dataset.type!=='text'||!selectionAtEnd(el))return false;const marker=el.textContent;const shortcuts={'[]':['todo',false],'[ ]':['todo',false],'[x]':['todo',true],'[X]':['todo',true],'-':['bullet',false],'*':['bullet',false],'+':['bullet',false],'1.':['numbered',false],'>':['quote',false],'!':['callout',false],'#':['heading1',false],'##':['heading2',false],'###':['heading3',false],'####':['heading4',false],'---':['divider',false]};shortcuts[String.fromCharCode(96).repeat(3)]=['code',false];const match=shortcuts[marker];if(!match)return false;event.preventDefault();replaceBlockType(el,match[0],match[1]);return true}
const CONTINUING_BLOCK_TYPES=new Set(['bullet','numbered','todo']);
function setRowIndent(row,level){const value=Math.max(0,Math.min(4,level));row.dataset.indent=String(value);row.style.setProperty('--indent',String(value));renumberBlocks();scheduleSave()}
function changeListIndent(row,direction){const el=row.querySelector('.block-content');if(!CONTINUING_BLOCK_TYPES.has(el?.dataset.type))return false;const current=Number(row.dataset.indent||0);if(direction>0){const previous=row.previousElementSibling;if(!previous||!CONTINUING_BLOCK_TYPES.has(previous.querySelector('.block-content')?.dataset.type)||Number(previous.dataset.indent||0)<current)return false}setRowIndent(row,current+direction);return true}
function splitEditableBlock(row,el){const offset=caretOffset(el);const text=el.textContent;const type=el.dataset.type;el.textContent=text.slice(0,offset);el.dataset.rich='false';const nextType=CONTINUING_BLOCK_TYPES.has(type)?type:'text';const next=blockRow({...newBlock(nextType),content:text.slice(offset),indent_level:nextType===type?Number(row.dataset.indent||0):0},0);row.after(next);renumberBlocks();focusBlock(next);scheduleSave();hideSlashMenu()}
function mergeWithPrevious(row,el){const previous=row.previousElementSibling;const target=previous?.querySelector('.block-content[contenteditable="true"]');if(!target)return false;const offset=target.textContent.length;target.textContent+=el.textContent;target.dataset.rich='false';row.remove();renumberBlocks();placeCaretAtOffset(target,offset);scheduleSave();return true}
function placeCaretAtOffset(el,offset){el.focus();const range=document.createRange();const node=el.firstChild||el.appendChild(document.createTextNode(''));range.setStart(node,Math.min(offset,node.textContent.length));range.collapse(true);const selection=getSelection();selection.removeAllRanges();selection.addRange(range)}
function handleBlockKey(event,el){if(!canEdit())return;if((event.ctrlKey||event.metaKey)&&['b','i','u'].includes(event.key.toLowerCase())){event.preventDefault();document.execCommand(({b:'bold',i:'italic',u:'underline'})[event.key.toLowerCase()]);el.dataset.rich='true';scheduleSave();return}if(!$('slash-menu').hidden&&handleSlashKey(event))return;if(applyInputShortcut(event,el))return;const row=el.closest('.block-row');if(event.key==='Tab'){if(changeListIndent(row,event.shiftKey?-1:1))event.preventDefault();return}if(event.key==='Enter'&&event.shiftKey&&el.dataset.type!=='code'){event.preventDefault();document.execCommand('insertLineBreak');scheduleSave();return}if(event.altKey&&(event.key==='ArrowUp'||event.key==='ArrowDown')){event.preventDefault();moveBlockRow(row,event.key==='ArrowUp'?-1:1);return}const offset=caretOffset(el);if(!event.shiftKey&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&((event.key==='ArrowUp'&&offset===0)||(event.key==='ArrowLeft'&&offset===0))){event.preventDefault();moveCaretToAdjacent(el,-1);return}if(!event.shiftKey&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&((event.key==='ArrowDown'&&offset===el.textContent.length)||(event.key==='ArrowRight'&&offset===el.textContent.length))){event.preventDefault();moveCaretToAdjacent(el,1);return}if(el.dataset.togglePart==='body'){if(event.key==='Escape'){hideSlashMenu();hideBlockMenu()}return}if(event.key==='Enter'&&!event.shiftKey&&el.dataset.type!=='code'){event.preventDefault();const type=el.dataset.type;if(CONTINUING_BLOCK_TYPES.has(type)&&!el.textContent.trim()){replaceBlockType(el,'text');return}splitEditableBlock(row,el)}else if(event.key==='Backspace'&&offset===0&&row.previousElementSibling){event.preventDefault();mergeWithPrevious(row,el);hideSlashMenu()}else if(event.key==='Backspace'&&!el.textContent&&$('block-editor').children.length>1){event.preventDefault();const focus=row.previousElementSibling||row.nextElementSibling;row.remove();renumberBlocks();if(focus)placeCaret(focus.querySelector('.block-content'),true);scheduleSave();hideSlashMenu()}else if(event.key==='Escape'){hideSlashMenu();hideBlockMenu()}}
$('append-block').onclick=()=>{const row=blockRow(newBlock(),0);$('block-editor').append(row);renumberBlocks();row.querySelector('.block-content').focus();scheduleSave()};
function updateSlashSelection(){const buttons=[...$('slash-menu').querySelectorAll('.slash-item')];buttons.forEach((button,index)=>button.classList.toggle('active',index===state.slashIndex));const active=buttons[state.slashIndex];if(active){state.slashBlock?.setAttribute('aria-activedescendant',active.id);active.scrollIntoView({block:'nearest'})}}
function showSlashMenu(el){state.slashBlock=el;const query=el.textContent.slice(1).toLowerCase();const items=blockLabels.filter(([,symbol,label,desc,category])=>(label+' '+desc+' '+symbol+' '+category).toLowerCase().includes(query));const menu=$('slash-menu');state.slashIndex=0;const nodes=[];let category='';let buttonIndex=0;for(const [type,symbol,label,desc,nextCategory] of items){if(nextCategory!==category){category=nextCategory;const heading=document.createElement('div');heading.className='slash-category';heading.textContent=category;heading.role='presentation';nodes.push(heading)}const index=buttonIndex++;const button=document.createElement('button');button.type='button';button.role='menuitem';button.id='slash-option-'+index;button.tabIndex=-1;button.className='slash-item'+(index===0?' active':'');button.dataset.blockType=type;button.innerHTML='<span class="slash-icon">'+icon(blockIconName[type]||'type')+'</span><span><strong>'+escapeText(label)+'</strong><small>'+escapeText(desc)+'</small></span>';button.onmouseenter=()=>{state.slashIndex=index;updateSlashSelection()};button.onmousedown=(event)=>{event.preventDefault();changeBlockType(el,type)};nodes.push(button)}menu.replaceChildren(...nodes);const rect=el.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(rect.left,innerWidth-276))+'px';menu.style.top=Math.max(8,Math.min(rect.bottom+4,innerHeight-350))+'px';menu.hidden=!items.length;el.setAttribute('aria-haspopup','menu');el.setAttribute('aria-controls','slash-menu');el.setAttribute('aria-expanded',items.length?'true':'false');if(items.length)updateSlashSelection()}
function handleSlashKey(event){const buttons=[...$('slash-menu').querySelectorAll('.slash-item')];if(!buttons.length)return false;if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();state.slashIndex=(state.slashIndex+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;updateSlashSelection();return true}if(event.key==='Enter'){event.preventDefault();changeBlockType(state.slashBlock,buttons[state.slashIndex].dataset.blockType);return true}if(event.key==='Escape'){event.preventDefault();hideSlashMenu();return true}return false}
function hideSlashMenu(){const target=state.slashBlock;if(target){target.setAttribute('aria-expanded','false');target.removeAttribute('aria-activedescendant')}$('slash-menu').hidden=true;state.slashBlock=null;state.slashIndex=0}
function focusBlock(row,atEnd=false){const target=row.querySelector('.block-content[contenteditable="true"],.media-url:not(:disabled),.block-table input:not(:disabled),.db-title:not(:disabled),.db-cell-input:not(:disabled)');if(!target)return;if(target.matches('input,select'))target.focus();else placeCaret(target,atEnd)}
function replaceBlockType(el,type,checked=false){const row=el.closest('.block-row');const id=row.dataset.id;const next=blockRow({id,type,content:'',checked},0);row.replaceWith(next);renumberBlocks();if(type==='divider'){const following=blockRow(newBlock(),0);next.after(following);focusBlock(following)}else focusBlock(next);scheduleSave();hideSlashMenu()}
function changeBlockType(el,type){replaceBlockType(el,type,false)}
function blockDataFromRow(row){const el=row.querySelector('.block-content');const type=el.dataset.type;let content=el.textContent;let checked=row.querySelector('input[type=checkbox]')?.checked||false;if(el.dataset.database==='true')content=JSON.stringify(el._databaseModel);else if(el.dataset.structured==='grid'){content=JSON.stringify([...el.querySelectorAll('.block-table tr')].map(tr=>[...tr.querySelectorAll('input')].map(input=>input.value)))}else if(el.dataset.urlBlock==='true')content=el.querySelector('.media-url')?.value||'';else if(type==='toc'||type==='divider')content='';else if(type==='toggle'){const body=row.querySelector('[data-toggle-part="body"]');content=el.textContent+(body?.textContent?'\n'+body.textContent:'');checked=row.querySelector('.toggle-caret')?.getAttribute('aria-expanded')==='true'}else if(el.dataset.rich==='true'||el.querySelector('b,strong,i,em,u,s,code,a'))content=RICH_PREFIX+sanitizeRichHtml(el.innerHTML);return{id:row.dataset.id,type,content:content.slice(0,type==='database'?100000:20000),checked,indent_level:Number(row.dataset.indent||0)}}
function hideBlockMenu(){$('block-menu').hidden=true;state.contextRow=null}
function blockMenuButton(label,iconName,action,danger=false){const button=document.createElement('button');button.type='button';button.role='menuitem';button.innerHTML=icon(iconName)+'<span>'+escapeText(label)+'</span>';if(danger)button.classList.add('danger-text');button.onclick=()=>runBlockMenuAction(action);return button}
function showBlockMenu(row,x,y){if(!canEdit())return;state.contextRow=row;hideSlashMenu();const menu=$('block-menu');const items=[blockMenuButton('일반 텍스트로 전환','type','type:text'),blockMenuButton('할 일로 전환','check-square','type:todo'),blockMenuButton('글머리 목록으로 전환','list','type:bullet'),blockMenuButton('번호 목록으로 전환','list-ordered','type:numbered'),blockMenuButton('토글로 전환','chevron-right','type:toggle'),separator(),blockMenuButton('위에 블록 추가','plus','insert-above'),blockMenuButton('아래에 블록 추가','plus','insert-below'),blockMenuButton('블록 복제','copy','duplicate'),separator(),blockMenuButton('위로 이동','arrow-up','move-up'),blockMenuButton('아래로 이동','arrow-down','move-down'),blockMenuButton('블록 삭제','trash','delete',true)];menu.replaceChildren(...items);menu.hidden=false;const width=menu.offsetWidth;const height=menu.offsetHeight;menu.style.left=Math.max(8,Math.min(x,innerWidth-width-8))+'px';menu.style.top=Math.max(8,Math.min(y,innerHeight-height-8))+'px';menu.querySelector('button')?.focus();menu.onkeydown=(event)=>{const buttons=[...menu.querySelectorAll('button')];const index=buttons.indexOf(document.activeElement);if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();buttons[(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus()}else if(event.key==='Escape'){event.preventDefault();hideBlockMenu();row.querySelector('.block-content')?.focus()}}}
function separator(){const line=document.createElement('div');line.className='block-menu-separator';line.role='separator';return line}
function runBlockMenuAction(action){const row=state.contextRow;if(!row||!row.isConnected)return hideBlockMenu();if(action.startsWith('type:')){const data=blockDataFromRow(row);data.type=action.slice(5);data.checked=data.type==='toggle'?data.checked:false;const next=blockRow(data,0);row.replaceWith(next);focusBlock(next,true)}else if(action==='insert-above'||action==='insert-below'){const next=blockRow(newBlock(),0);action==='insert-above'?row.before(next):row.after(next);focusBlock(next)}else if(action==='duplicate'){const data=blockDataFromRow(row);data.id='blk_'+crypto.randomUUID().replaceAll('-','');const next=blockRow(data,0);row.after(next);focusBlock(next,true)}else if(action==='move-up'||action==='move-down'){moveBlockRow(row,action==='move-up'?-1:1);hideBlockMenu();return}else if(action==='delete'){const focus=row.previousElementSibling||row.nextElementSibling;if($('block-editor').children.length===1){const next=blockRow(newBlock(),0);row.replaceWith(next);focusBlock(next)}else{row.remove();if(focus)focusBlock(focus,true)}}renumberBlocks();scheduleSave();hideBlockMenu()}
document.addEventListener('mousedown',(event)=>{if(!$('slash-menu').contains(event.target)&&event.target!==state.slashBlock)hideSlashMenu();if(!$('block-menu').contains(event.target)&&!event.target.closest('.block-handle'))hideBlockMenu();if(!$('url-paste-menu').contains(event.target))hideUrlPasteMenu()});
function renumberBlocks(){let numbered=0;for(const row of $('block-editor').children){const el=row.querySelector('.block-content');if(el.dataset.type==='numbered'){numbered+=1;el.dataset.number=numbered}else numbered=0}}
function collectBlocks(){return Array.from($('block-editor').children).map((row,index)=>({...blockDataFromRow(row),position:index}))}
function historySnapshot(){return JSON.stringify({title:$('document-title').value,blocks:collectBlocks()})}
function resetHistory(){clearTimeout(state.historyTimer);state.selectedBlocks.clear();state.undoStack=[historySnapshot()];state.undoIndex=0}
function queueHistory(){if(state.restoringHistory)return;clearTimeout(state.historyTimer);state.historyTimer=setTimeout(()=>{const snapshot=historySnapshot();if(state.undoStack[state.undoIndex]===snapshot)return;state.undoStack=state.undoStack.slice(0,state.undoIndex+1);state.undoStack.push(snapshot);if(state.undoStack.length>80)state.undoStack.shift();state.undoIndex=state.undoStack.length-1},250)}
function restoreHistory(index){if(index<0||index>=state.undoStack.length)return;state.restoringHistory=true;const snapshot=JSON.parse(state.undoStack[index]);$('document-title').value=snapshot.title;resizeDocumentTitle();updateDocumentChrome(snapshot.title);renderBlocks(snapshot.blocks);state.undoIndex=index;state.restoringHistory=false;scheduleSave()}
function undoDocument(direction){clearTimeout(state.historyTimer);const current=historySnapshot();if(state.undoStack[state.undoIndex]!==current){state.undoStack=state.undoStack.slice(0,state.undoIndex+1);state.undoStack.push(current);state.undoIndex=state.undoStack.length-1}restoreHistory(state.undoIndex+direction)}
function setSaveState(status){const copy={saving:'저장 중',saved:'저장됨',failed:'저장 실패',dirty:'저장 대기'};for(const id of ['save-state','mobile-save-state']){$(id).textContent=copy[status]||'';$(id).className='save-state '+status}}
function scheduleSave(){state.editRevision+=1;state.dirty=true;state.saveFailed=false;setSaveState('dirty');queueHistory();clearTimeout(state.saveTimer);state.saveTimer=setTimeout(saveDocument,800)}
async function saveDocument(){if(!state.current||!state.dirty||state.saving||!canEdit())return !state.dirty;clearTimeout(state.saveTimer);state.saving=true;setSaveState('saving');const revision=state.editRevision;const payload={title:$('document-title').value,version:state.current.version,save_id:'snap_'+crypto.randomUUID().replaceAll('-',''),blocks:collectBlocks()};try{const data=await api('/api/documents/'+state.current.id,{method:'PUT',body:payload});state.current.version=data.version;state.current.title=payload.title;state.current.blocks=payload.blocks;state.dirty=state.editRevision!==revision;state.saveFailed=false;setSaveState(state.dirty?'dirty':'saved');return !state.dirty}catch(error){state.dirty=true;state.saveFailed=true;setSaveState('failed');if(error.status===409)toast('다른 저장이 먼저 반영되었습니다. 입력 내용은 유지되며 새로고침 후 다시 저장할 수 있습니다.');else toast('저장하지 못했습니다. 입력 내용은 화면에 유지됩니다.');return false}finally{state.saving=false;if(state.dirty&&!state.saveFailed&&canEdit()){clearTimeout(state.saveTimer);state.saveTimer=setTimeout(saveDocument,120)}}}
async function flushSave(){while(state.saving)await new Promise(resolve=>setTimeout(resolve,30));if(!state.dirty)return true;const saved=await saveDocument();if(saved||state.saveFailed)return saved;return flushSave()}
window.addEventListener('beforeunload',(event)=>{if(state.dirty){event.preventDefault();event.returnValue=''}});
window.addEventListener('resize',resizeDocumentTitle);
async function showMembers(){if(state.dirty&&!await flushSave())return;state.current=null;markNav('members');showPane('members-view');state.membersCursor=null;state.invitesCursor=null;$('member-list').replaceChildren();$('invite-list').replaceChildren();loadMembers(false);if(canManage())loadInvites(false);else $('invite-list').innerHTML='<div class="empty-state">초대 관리 권한이 없습니다.</div>'}
async function loadMembers(append){if(!append)showLoading('member-list','member',4);else setLoadButton('load-more-members',true);const params=new URLSearchParams({limit:'20'});if(state.membersCursor)params.set('cursor',state.membersCursor);try{const data=await api('/api/members?'+params);if(!append)$('member-list').replaceChildren();data.members.forEach((member)=>$('member-list').append(memberRow(member)));state.membersCursor=data.next_cursor;$('load-more-members').hidden=!state.membersCursor;$('member-count').textContent=data.members.length+(state.membersCursor?'+':'')+'명'}catch(error){if(!append)$('member-list').innerHTML='<div class="empty-state">'+escapeText(error.message)+'</div>'}finally{finishLoading('member-list');setLoadButton('load-more-members',false)}}
$('load-more-members').onclick=()=>loadMembers(true);
function memberRow(member){const row=document.createElement('div');row.className='member-row';const info=document.createElement('div');info.className='member-info';const avatar=document.createElement('span');avatar.className='avatar';avatar.textContent=member.username.slice(0,1).toUpperCase();avatar.setAttribute('aria-hidden','true');const copy=document.createElement('div');const name=document.createElement('strong');name.textContent=member.username+(member.user_id===state.user.id?' (나)':'');const joined=document.createElement('small');joined.textContent='참여 '+new Date(member.joined_at*1000).toLocaleDateString();copy.append(name,joined);info.append(avatar,copy);const controls=document.createElement('div');controls.className='member-controls';if(canManage()&&member.user_id!==state.user.id){const select=document.createElement('select');select.setAttribute('aria-label',member.username+' 역할');const allowed=state.role==='owner'?['owner','admin','member','viewer']:['member','viewer'];const visibleRoles=allowed.includes(member.role)?allowed:[member.role,...allowed];for(const role of visibleRoles){const option=document.createElement('option');option.value=role;option.textContent=roleLabel[role];option.selected=role===member.role;select.append(option)}if(!allowed.includes(member.role))select.disabled=true;select.onchange=async()=>{try{await api('/api/members/'+member.user_id,{method:'PATCH',body:{role:select.value}});toast('역할을 변경했습니다.')}catch(error){select.value=member.role;toast(error.message)}};controls.append(select);if(state.role==='owner'){const remove=actionButton('제거',async()=>{if(!confirm(member.username+' 멤버를 제거할까요?'))return;try{await api('/api/members/'+member.user_id,{method:'DELETE'});showMembers()}catch(error){toast(error.message)}},true);controls.append(remove)}}else{const role=document.createElement('span');role.className='muted';role.textContent=roleLabel[member.role];controls.append(role)}row.append(info,controls);return row}
async function loadInvites(append){if(!append)showLoading('invite-list','member',3);else setLoadButton('load-more-invites',true);const params=new URLSearchParams({limit:'20'});if(state.invitesCursor)params.set('cursor',state.invitesCursor);try{const data=await api('/api/invitations?'+params);if(!append)$('invite-list').replaceChildren();data.invitations.forEach((invite)=>$('invite-list').append(inviteRow(invite)));state.invitesCursor=data.next_cursor;$('load-more-invites').hidden=!state.invitesCursor;$('invite-count').textContent=data.invitations.length+(state.invitesCursor?'+':'')+'건';if(!$('invite-list').children.length)$('invite-list').innerHTML='<div class="empty-state">대기 중인 초대가 없습니다.</div>'}catch(error){if(!append)$('invite-list').innerHTML='<div class="empty-state">'+escapeText(error.message)+'</div>'}finally{finishLoading('invite-list');setLoadButton('load-more-invites',false)}}
$('load-more-invites').onclick=()=>loadInvites(true);
function inviteRow(invite){const row=document.createElement('div');row.className='member-row';const info=document.createElement('div');info.className='member-info';const avatar=document.createElement('span');avatar.className='avatar';avatar.textContent='@';const copy=document.createElement('div');const email=document.createElement('strong');email.textContent=invite.email;const meta=document.createElement('small');meta.textContent=roleLabel[invite.role]+' · 만료 '+new Date(invite.expires_at*1000).toLocaleString();copy.append(email,meta);info.append(avatar,copy);const controls=document.createElement('div');controls.className='member-controls';controls.append(actionButton('재발송',async()=>{try{const data=await api('/api/invitations/'+invite.id+'/resend',{method:'POST'});showInviteLink(data.invite_url,data.delivery);toast(data.delivery==='sent'?'초대 메일을 다시 보냈습니다.':'새 초대 링크를 만들었습니다.')}catch(error){toast(error.message)}}),actionButton('취소',async()=>{try{await api('/api/invitations/'+invite.id,{method:'DELETE'});showMembers()}catch(error){toast(error.message)}},true));row.append(info,controls);return row}
$('open-invite').onclick=()=>{$('invite-link-result').hidden=true;alertBox('create-invite-alert','');$('invite-dialog').showModal()};$('close-invite').onclick=()=>$('invite-dialog').close();
$('create-invite-form').onsubmit=async(event)=>{event.preventDefault();const formEl=event.currentTarget;alertBox('create-invite-alert','');busy(formEl,true);try{const form=new FormData(formEl);const data=await api('/api/invitations',{method:'POST',body:{email:form.get('email'),role:form.get('role')}});showInviteLink(data.invite_url,data.delivery);formEl.elements.email.value='';loadInvites(false);toast(data.delivery==='sent'?'초대 메일을 보냈습니다.':'초대 링크를 만들었습니다.')}catch(error){alertBox('create-invite-alert',error.message)}finally{busy(formEl,false);$('close-invite').disabled=false;$('invite-link-result').querySelector('button').disabled=false}}
function showInviteLink(url,delivery){const result=$('invite-link-result');result.hidden=false;result.querySelector('p').textContent=delivery==='sent'?'초대 메일을 보냈습니다. 링크도 복사할 수 있습니다.':'메일 연결 전에는 아래 링크를 안전하게 전달하세요.';result.querySelector('input').value=url;result.querySelector('button').onclick=async()=>{await navigator.clipboard.writeText(url);toast('초대 링크를 복사했습니다.')};if(!$('invite-dialog').open)$('invite-dialog').showModal()}
function showSettings(){state.current=null;markNav('settings');showPane('settings-view')}
$('notion-import-input').onchange=async(event)=>{const input=event.currentTarget;const file=input.files&&input.files[0];if(!file)return;if(file.size>2*1024*1024){toast('Markdown 파일은 2MB 이하만 가져올 수 있습니다.');input.value='';return}try{const content=await file.text();const data=await api('/api/import/markdown',{method:'POST',body:{filename:file.name,content}});await loadTree();push('/doc/'+data.document.id);toast('Notion Markdown을 가져왔습니다.')}catch(error){toast(error.message)}finally{input.value=''}};
document.addEventListener('selectionchange',()=>{if(!canEdit())return;const selection=getSelection();const toolbar=$('inline-toolbar');if(!selection||selection.isCollapsed||!selection.rangeCount){toolbar.hidden=true;return}const origin=selection.anchorNode?.nodeType===1?selection.anchorNode:selection.anchorNode?.parentElement;const el=origin?.closest?.('.block-content[contenteditable="true"]');if(!el||!el.contains(selection.focusNode)){toolbar.hidden=true;return}state.inlineTarget=el;state.inlineRange=selection.getRangeAt(0).cloneRange();const rect=state.inlineRange.getBoundingClientRect();toolbar.style.left=Math.max(8,Math.min(rect.left,innerWidth-toolbar.offsetWidth-8))+'px';toolbar.style.top=Math.max(8,rect.top-42)+'px';toolbar.hidden=false});
function restoreInlineSelection(target,range){if(!target?.isConnected||!range)return false;target.focus();const selection=getSelection();selection.removeAllRanges();selection.addRange(range);return true}
function openLinkDialog(target,range){if(!target||!range)return;state.linkTarget=target;state.linkRange=range.cloneRange();alertBox('link-alert','');const origin=range.commonAncestorContainer.nodeType===1?range.commonAncestorContainer:range.commonAncestorContainer.parentElement;const currentLink=origin?.closest?.('a');$('link-url').value=currentLink&&target.contains(currentLink)?currentLink.getAttribute('href')||'':'';$('inline-toolbar').hidden=true;$('link-dialog').returnValue='';$('link-dialog').showModal();requestAnimationFrame(()=>{$('link-url').focus();$('link-url').select()})}
function closeLinkDialog(result='cancel'){$('link-dialog').close(result)}
$('link-form').onsubmit=event=>{event.preventDefault();const href=safeWebUrl($('link-url').value);if(!href){alertBox('link-alert','http 또는 https로 시작하는 올바른 웹 주소를 입력하세요.');$('link-url').focus();return}const target=state.linkTarget,range=state.linkRange;if(!restoreInlineSelection(target,range)){closeLinkDialog('cancel');return}document.execCommand('createLink',false,href);for(const link of target.querySelectorAll('a')){link.target='_blank';link.rel='noopener noreferrer'}target.dataset.rich='true';scheduleSave();closeLinkDialog('applied');$('inline-toolbar').hidden=true;target.focus()};
$('close-link-dialog').onclick=() => closeLinkDialog();$('cancel-link-dialog').onclick=() => closeLinkDialog();
$('link-dialog').addEventListener('close',()=>{const target=state.linkTarget,range=state.linkRange,result=$('link-dialog').returnValue;state.linkTarget=null;state.linkRange=null;if(result!=='applied')restoreInlineSelection(target,range)});
$('inline-toolbar').querySelectorAll('button').forEach(button=>{button.onmousedown=event=>event.preventDefault();button.onclick=()=>{const el=state.inlineTarget,range=state.inlineRange;if(!el||!range)return;const command=button.dataset.inlineCommand;if(command==='createLink'){openLinkDialog(el,range);return}const selection=getSelection();selection.removeAllRanges();selection.addRange(range);if(command==='inlineCode'){const text=selection.toString();document.execCommand('insertHTML',false,'<code>'+escapeText(text)+'</code>')}else document.execCommand(command);el.dataset.rich='true';scheduleSave();$('inline-toolbar').hidden=true;el.focus()}});
function openGlobalSearch(){if(!state.user)return;const dialog=$('global-search-dialog');state.globalSearchIndex=0;if(!dialog.open)dialog.showModal();$('global-search-input').value='';loadGlobalSearch('');$('global-search-input').focus()}
async function loadGlobalSearch(query){const results=$('global-search-results');showLoading('global-search-results','search',4);try{const params=new URLSearchParams({scope:query?'search':'recent',limit:'20'});if(query)params.set('q',query);const data=await api('/api/documents?'+params);results.replaceChildren(...data.documents.map((doc,index)=>{const button=document.createElement('button');button.type='button';button.id='global-search-option-'+index;button.role='option';button.tabIndex=-1;button.setAttribute('aria-selected',index===0?'true':'false');button.className='global-search-item'+(index===0?' active':'');button.dataset.documentId=doc.id;button.innerHTML='<strong>'+escapeText(doc.title||'제목 없음')+'</strong><small>수정 '+escapeText(formatDate(doc.updated_at))+'</small>';button.onmouseenter=()=>{state.globalSearchIndex=index;updateGlobalSearchSelection()};button.onclick=()=>{dialogCloseAndOpen(doc.id)};return button}));if(!data.documents.length)results.innerHTML='<div class="global-search-empty">검색 결과가 없습니다.</div>';updateGlobalSearchSelection()}catch(error){results.innerHTML='<div class="global-search-empty">'+escapeText(error.message)+'</div>'}finally{finishLoading('global-search-results')}}
function updateGlobalSearchSelection(){const items=[...$('global-search-results').querySelectorAll('.global-search-item')];items.forEach((item,index)=>{const active=index===state.globalSearchIndex;item.classList.toggle('active',active);item.setAttribute('aria-selected',active?'true':'false')});const active=items[state.globalSearchIndex];if(active){$('global-search-input').setAttribute('aria-activedescendant',active.id);active.scrollIntoView({block:'nearest'})}else $('global-search-input').removeAttribute('aria-activedescendant')}
function dialogCloseAndOpen(id){$('global-search-dialog').close();push('/doc/'+id)}
$('global-search-input').oninput=event=>{clearTimeout(state.globalSearchTimer);const query=event.currentTarget.value.trim();state.globalSearchTimer=setTimeout(()=>{state.globalSearchIndex=0;loadGlobalSearch(query)},180)};
$('global-search-input').onkeydown=event=>{const items=[...$('global-search-results').querySelectorAll('.global-search-item')];if((event.key==='ArrowDown'||event.key==='ArrowUp')&&items.length){event.preventDefault();state.globalSearchIndex=(state.globalSearchIndex+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;updateGlobalSearchSelection()}else if(event.key==='Enter'&&items[state.globalSearchIndex]){event.preventDefault();dialogCloseAndOpen(items[state.globalSearchIndex].dataset.documentId)}else if(event.key==='Escape')$('global-search-dialog').close()};
document.addEventListener('copy',event=>{const rows=selectedRows();if(!rows.length)return;event.preventDefault();const blocks=rows.map(blockDataFromRow);event.clipboardData.setData('application/x-qwerty-blocks',JSON.stringify(blocks));event.clipboardData.setData('text/plain',blocks.map(block=>block.content.replace(RICH_PREFIX,'')).join('\n'))});
document.addEventListener('cut',event=>{const rows=selectedRows();if(!rows.length||!canEdit())return;event.preventDefault();const blocks=rows.map(blockDataFromRow);event.clipboardData.setData('application/x-qwerty-blocks',JSON.stringify(blocks));event.clipboardData.setData('text/plain',blocks.map(block=>block.content.replace(RICH_PREFIX,'')).join('\n'));for(const row of rows)row.remove();if(!$('block-editor').children.length)$('block-editor').append(blockRow(newBlock(),0));clearBlockSelection();renumberBlocks();scheduleSave()});
document.addEventListener('paste',event=>{if(!canEdit()||event.clipboardData.getData('application/x-qwerty-blocks'))return;const target=event.target?.closest?.('.block-content[contenteditable="true"]');if(!target||target.dataset.type!=='text'||target.textContent.trim())return;const raw=event.clipboardData.getData('text/plain').trim();if(!raw||raw.includes('\n'))return;const url=safeWebUrl(raw);if(!url)return;event.preventDefault();openUrlPasteMenu(target,url)});
document.addEventListener('paste',event=>{const raw=event.clipboardData.getData('application/x-qwerty-blocks');if(!raw||!canEdit())return;let blocks;try{blocks=JSON.parse(raw)}catch{return}if(!Array.isArray(blocks)||!blocks.length)return;event.preventDefault();const selected=selectedRows();let anchor=selected.at(-1)||document.activeElement?.closest?.('.block-row')||$('block-editor').lastElementChild;for(const block of blocks){const next=blockRow({...block,id:'blk_'+crypto.randomUUID().replaceAll('-','')},0);anchor.after(next);anchor=next}clearBlockSelection();renumberBlocks();focusBlock(anchor,true);scheduleSave()});
document.querySelector('.skip-link').onclick=event=>{event.preventDefault();$('main-content').focus()};
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&!event.altKey&&(event.key.toLowerCase()==='z'||event.key.toLowerCase()==='y')&&state.current&&!$('editor-view').hidden){event.preventDefault();const redo=event.key.toLowerCase()==='y'||event.shiftKey;undoDocument(redo?1:-1);return}if((event.ctrlKey||event.metaKey)&&(event.code==='KeyK'||event.key.toLowerCase()==='k')&&state.user){event.preventDefault();event.stopPropagation();openGlobalSearch()}},true);
async function openPublicationDialog(){if(!state.current||!canManage())return;alertBox('publish-alert','');$('publish-dialog').showModal();try{state.publication=await api('/api/documents/'+state.current.id+'/publication');renderPublication()}catch(error){alertBox('publish-alert',error.message)}}
function renderPublication(){const published=!!state.publication?.published;const url=state.publication?.public_url||location.origin+'/public/'+state.current.id;$('publication-title').textContent=published?'웹에 게시됨':'비공개';$('publication-description').textContent=published?'링크를 가진 누구나 읽을 수 있습니다.':'현재 워크스페이스 멤버만 볼 수 있습니다.';$('publication-toggle').textContent=published?'게시 취소':'게시';$('publication-toggle').className='button '+(published?'subtle danger-text':'primary')+' compact';const link=$('publication-link');link.hidden=!published;link.querySelector('input').value=url;link.querySelector('button').onclick=async()=>{await navigator.clipboard.writeText(url);toast('공개 링크를 복사했습니다.')}}
$('publish-button').onclick=openPublicationDialog;$('close-publish').onclick=()=>$('publish-dialog').close();
$('publication-toggle').onclick=async()=>{if(!state.current)return;const published=!!state.publication?.published;if(!confirm(published?'공개 게시를 취소할까요? 기존 링크에서 더 이상 문서를 볼 수 없습니다.':'이 문서를 웹에 게시할까요? 링크를 가진 누구나 로그인 없이 읽을 수 있습니다.'))return;const button=$('publication-toggle');button.disabled=true;try{state.publication=await api('/api/documents/'+state.current.id+'/publication',{method:published?'DELETE':'PUT'});renderPublication();toast(published?'공개 게시를 취소했습니다.':'문서를 웹에 게시했습니다.')}catch(error){alertBox('publish-alert',error.message)}finally{button.disabled=false}};
async function openPublicDocument(id){$('boot-view').hidden=false;$('auth-view').hidden=true;$('app-view').hidden=true;try{const data=await api('/api/public/documents/'+id);state.role='viewer';state.current=data.document;$('public-title').textContent=data.document.title||'제목 없음';const editor=$('public-block-editor');editor.replaceChildren(...data.document.blocks.map((block,index)=>blockRow(block,index)));let numbered=0;for(const row of editor.children){const el=row.querySelector('.block-content');if(el?.dataset.type==='numbered'){numbered+=1;el.dataset.number=numbered}else numbered=0}$('boot-view').hidden=true;$('public-view').hidden=false}catch(error){$('boot-view').innerHTML='<div class="empty-state"><strong>공개 문서를 열 수 없습니다.</strong><span>'+escapeText(error.message)+'</span></div>'}}
async function refreshNotificationBadge(){try{const data=await api('/api/notifications?limit=1');const badge=$('notification-badge');badge.textContent=String(data.unread_count||'');badge.hidden=!data.unread_count}catch{}}
async function showNotifications(){if(state.dirty&&!await flushSave())return;state.current=null;markNav('notifications');showPane('notifications-view');showLoading('notification-list','list',4);showLoading('activity-list','list',4);try{const [notifications,activity]=await Promise.all([api('/api/notifications?limit=50'),api('/api/activity?limit=50')]);$('notification-list').replaceChildren(...notifications.notifications.map(notificationItem));$('activity-list').replaceChildren(...activity.events.map(activityItem));if(!notifications.notifications.length)$('notification-list').innerHTML='<div class="empty-state">새 알림이 없습니다.</div>';if(!activity.events.length)$('activity-list').innerHTML='<div class="empty-state">아직 활동이 없습니다.</div>'}catch(error){$('notification-list').innerHTML='<div class="empty-state">'+escapeText(error.message)+'</div>'}finally{finishLoading('notification-list');finishLoading('activity-list')}}
function notificationItem(item){const el=document.createElement('article');el.className='feed-item'+(item.read_at?'':' unread');el.innerHTML='<strong>'+escapeText(item.actor_username||'JoripNote')+'</strong><span>'+escapeText(item.message)+'</span><small>'+escapeText(formatDate(item.created_at))+'</small>';if(item.document_id)el.onclick=()=>push('/doc/'+item.document_id);return el}
function activityItem(item){const el=document.createElement('article');el.className='feed-item';el.innerHTML='<strong>'+escapeText(item.actor_username||'멤버')+'</strong><span>'+escapeText(item.message)+'</span><small>'+escapeText(formatDate(item.created_at))+'</small>';if(item.document_id)el.onclick=()=>push('/doc/'+item.document_id);return el}
$('mark-notifications-read').onclick=async()=>{try{await api('/api/notifications/read',{method:'POST',body:{all:true}});await showNotifications();refreshNotificationBadge();toast('알림을 모두 읽음으로 표시했습니다.')}catch(error){toast(error.message)}};
async function showTemplates(){if(state.dirty&&!await flushSave())return;markNav('templates');showPane('templates-view');showLoading('template-list','list',5);try{const data=await api('/api/templates?limit=50');$('template-list').replaceChildren(...data.templates.map(templateCard));if(!data.templates.length)$('template-list').innerHTML='<div class="empty-state">등록된 템플릿이 없습니다.</div>'}catch(error){$('template-list').innerHTML='<div class="empty-state">'+escapeText(error.message)+'</div>'}finally{finishLoading('template-list')}}
function templateCard(template){const button=document.createElement('button');button.type='button';button.className='template-card';button.innerHTML='<span class="template-icon">'+escapeText(template.icon)+'</span><h2>'+escapeText(template.name)+'</h2><p>'+escapeText(template.description)+'</p><span class="button primary compact">이 템플릿으로 만들기</span>';button.onclick=async()=>{try{const data=await api('/api/templates/'+template.id+'/documents',{method:'POST',body:{}});await loadTree();push('/doc/'+data.document.id);toast('템플릿으로 문서를 만들었습니다.')}catch(error){toast(error.message)}};return button}
$('new-template-button').onclick=async()=>{if(!state.current){toast('템플릿으로 저장할 문서를 먼저 열어 주세요.');return}const name=prompt('템플릿 이름을 입력하세요.',state.current.title||'새 템플릿');if(!name)return;try{await flushSave();await api('/api/templates',{method:'POST',body:{name,description:'사용자 문서에서 만든 템플릿',icon:'📄',document_id:state.current.id}});toast('현재 문서를 템플릿으로 저장했습니다.')}catch(error){toast(error.message)}};
async function openHistoryDialog(){if(!state.current)return;$('history-dialog').showModal();showLoading('history-list','list',5);try{const data=await api('/api/documents/'+state.current.id+'/versions?limit=50');$('history-list').replaceChildren(...data.versions.map(versionItem))}catch(error){$('history-list').innerHTML='<div class="empty-state">'+escapeText(error.message)+'</div>'}finally{finishLoading('history-list')}}
function versionItem(version){const el=document.createElement('article');el.className='feed-item';el.innerHTML='<strong>버전 '+version.version+' · '+escapeText(version.title||'제목 없음')+'</strong><span>'+escapeText(version.preview||'내용 없음')+'</span><small>'+escapeText(version.username||'멤버')+' · '+escapeText(formatDate(version.created_at))+'</small>';const actions=document.createElement('div');actions.className='feed-actions';actions.append(actionButton('미리보기',async()=>{try{const data=await api('/api/documents/'+state.current.id+'/versions/'+version.version);alert((data.version.title||'제목 없음')+'\\n\\n'+data.version.blocks.map(block=>block.content.replace(/^@qwerty-rich:/,'')).join('\\n').slice(0,5000))}catch(error){toast(error.message)}}));if(canEdit()&&version.version!==state.current.version)actions.append(actionButton('이 버전 복원',async()=>{if(!confirm('선택한 내용을 새 버전으로 복원할까요?'))return;try{await api('/api/documents/'+state.current.id+'/versions/'+version.version+'/restore',{method:'POST',body:{}});$('history-dialog').close();const id=state.current.id;state.current=null;await openDocument(id,false);toast('이전 버전을 새 버전으로 복원했습니다.')}catch(error){toast(error.message)}}));el.append(actions);return el}
$('history-button').onclick=openHistoryDialog;$('close-history').onclick=()=>$('history-dialog').close();
async function openCommentsDialog(){if(!state.current)return;$('comments-dialog').showModal();await loadComments()}
async function loadComments(){showLoading('comment-list','list',4);try{const data=await api('/api/documents/'+state.current.id+'/comments?limit=100');$('comment-list').replaceChildren(...data.comments.map(commentItem));if(!data.comments.length)$('comment-list').innerHTML='<div class="empty-state">첫 댓글을 작성해 보세요.</div>'}catch(error){$('comment-list').innerHTML='<div class="empty-state">'+escapeText(error.message)+'</div>'}finally{finishLoading('comment-list')}}
function commentItem(comment){const el=document.createElement('article');el.className='feed-item';el.innerHTML='<strong>'+escapeText(comment.username)+'</strong><span>'+escapeText(comment.body)+'</span><small>'+escapeText(formatDate(comment.created_at))+(comment.resolved_at?' · 해결됨':'')+'</small>';const actions=document.createElement('div');actions.className='feed-actions';if(!comment.resolved_at)actions.append(actionButton('해결',async()=>{await api('/api/comments/'+comment.id,{method:'PATCH',body:{resolved:true}});loadComments()}));if(comment.can_delete)actions.append(actionButton('삭제',async()=>{if(confirm('댓글을 삭제할까요?')){await api('/api/comments/'+comment.id,{method:'DELETE'});loadComments()}},true));el.append(actions);return el}
$('comment-form').onsubmit=async event=>{event.preventDefault();const body=$('comment-body').value.trim();if(!body)return;try{await api('/api/documents/'+state.current.id+'/comments',{method:'POST',body:{body}});$('comment-body').value='';await loadComments();refreshNotificationBadge();toast('댓글을 작성했습니다.')}catch(error){toast(error.message)}};
$('comments-button').onclick=openCommentsDialog;$('close-comments').onclick=()=>$('comments-dialog').close();
async function openAccessDialog(){if(!state.current?.can_manage_access)return;$('access-dialog').showModal();try{state.access=await api('/api/documents/'+state.current.id+'/access');$('access-visibility').value=state.access.visibility;const grants=new Map(state.access.grants.map(item=>[item.user_id,item.permission]));$('grant-list').replaceChildren(...state.access.members.filter(member=>member.user_id!==state.user.id).map(member=>{const row=document.createElement('label');row.className='grant-row';const name=document.createElement('span');name.textContent=member.username+' · '+roleLabel[member.role];const select=document.createElement('select');select.dataset.userId=member.user_id;for(const [value,label] of [['','접근 안 함'],['viewer','보기'],['editor','편집']]){const option=document.createElement('option');option.value=value;option.textContent=label;option.selected=(grants.get(member.user_id)||'')===value;select.append(option)}row.append(name,select);return row}))}catch(error){toast(error.message);$('access-dialog').close()}}
$('save-access').onclick=async()=>{try{const grants=[...$('grant-list').querySelectorAll('select')].filter(el=>el.value).map(el=>({user_id:el.dataset.userId,permission:el.value}));await api('/api/documents/'+state.current.id+'/access',{method:'PUT',body:{visibility:$('access-visibility').value,grants}});$('access-dialog').close();toast('문서별 권한을 저장했습니다.')}catch(error){toast(error.message)}};
$('access-button').onclick=openAccessDialog;$('close-access').onclick=()=>$('access-dialog').close();
$('file-upload-input').onchange=async event=>{const input=event.currentTarget;const file=input.files&&input.files[0];if(!file||!state.current)return;if(file.size>10*1024*1024){toast('파일은 10MB 이하만 올릴 수 있습니다.');input.value='';return}const form=new FormData();form.append('file',file);try{const response=await fetch('/api/documents/'+state.current.id+'/files',{method:'POST',credentials:'same-origin',headers:{accept:'application/json'},body:form});const data=await response.json();if(!response.ok)throw new Error(data.error||'파일을 올리지 못했습니다.');const type=file.type.startsWith('image/')?'image':file.type.startsWith('video/')?'video':file.type.startsWith('audio/')?'audio':'file';const row=blockRow({id:'blk_'+crypto.randomUUID().replaceAll('-',''),type,content:data.file.url,checked:false,indent_level:0},0);$('block-editor').append(row);renumberBlocks();scheduleSave();toast('파일을 올리고 문서에 추가했습니다.')}catch(error){toast(error.message)}finally{input.value=''}};
bootstrap();`;

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export default {
  async fetch(request, env) {
    try {
      return await route(request, env);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message, ...(error.details || {}) }, error.status);
      console.error('request_failed', error && error.message);
      return json({ error: '서버에서 요청을 처리하지 못했습니다.' }, 500);
    }
  }
};

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (request.method === 'GET' && path === '/health') return json({ ok: true, service: 'joripnote' });
  if (request.method === 'GET' && path === '/app.css') return asset(CSS + UI_POLISH_CSS, 'text/css; charset=utf-8');
  if (request.method === 'GET' && path === '/app.js') return asset(CLIENT_JS, 'text/javascript; charset=utf-8');
  if (request.method === 'GET' && /^\/api\/captcha\/[a-f0-9-]{36}\.svg$/.test(path)) return getCaptchaSvg(env, path.slice(13, -4));
  if (request.method === 'GET' && path === '/api/captcha') return createCaptcha(request, env);
  if (request.method === 'GET' && path === '/api/setup-status') return setupStatus(env);
  if (request.method === 'POST' && path === '/api/setup') {
    assertSameOrigin(request);
    return installAdmin(request, env);
  }
  if (request.method === 'POST' && path === '/api/bootstrap-signup') {
    assertSameOrigin(request);
    return bootstrapSignup(request, env);
  }
  if (request.method === 'POST' && path === '/api/login') {
    assertSameOrigin(request);
    return login(request, env);
  }
  if (request.method === 'POST' && path === '/api/logout') {
    assertSameOrigin(request);
    return logout(request, env);
  }
  const invitePublic = path.match(/^\/api\/invitations\/([A-Za-z0-9_-]{32,128})$/);
  if (request.method === 'GET' && invitePublic) return invitationPreview(env, invitePublic[1]);
  const inviteAccept = path.match(/^\/api\/invitations\/([A-Za-z0-9_-]{32,128})\/accept$/);
  if (request.method === 'POST' && inviteAccept) {
    assertSameOrigin(request);
    return acceptInvitation(request, env, inviteAccept[1]);
  }
  const publicDocumentRoute = path.match(/^\/api\/public\/documents\/([A-Za-z0-9_-]{8,80})$/);
  if (request.method === 'GET' && publicDocumentRoute) return getPublicDocument(env, publicDocumentRoute[1]);

  if (path.startsWith('/api/')) {
    const actor = await requireMember(request, env);
    if (request.method !== 'GET') assertSameOrigin(request);
    if (request.method === 'GET' && path === '/api/me') return json({ user: publicUser(actor), membership: { role: actor.role } });
    if (path === '/api/documents' && request.method === 'GET') return listDocuments(url, env, actor);
    if (path === '/api/documents' && request.method === 'POST') return createDocument(request, env, actor);
    if (path === '/api/import/markdown' && request.method === 'POST') return importMarkdown(request, env, actor);
    const documentRoute = path.match(/^\/api\/documents\/([A-Za-z0-9_-]{8,80})$/);
    if (documentRoute && request.method === 'GET') return getDocument(env, actor, documentRoute[1]);
    if (documentRoute && request.method === 'PUT') return saveDocument(request, env, actor, documentRoute[1]);
    if (documentRoute && request.method === 'DELETE') return permanentlyDeleteDocument(env, actor, documentRoute[1]);
    const versionsRoute = path.match(/^\/api\/documents\/([A-Za-z0-9_-]{8,80})\/versions$/);
    if (versionsRoute && request.method === 'GET') return listDocumentVersions(url, env, actor, versionsRoute[1]);
    const versionRoute = path.match(/^\/api\/documents\/([A-Za-z0-9_-]{8,80})\/versions\/(\d+)$/);
    if (versionRoute && request.method === 'GET') return getDocumentVersion(env, actor, versionRoute[1], Number(versionRoute[2]));
    const versionRestoreRoute = path.match(/^\/api\/documents\/([A-Za-z0-9_-]{8,80})\/versions\/(\d+)\/restore$/);
    if (versionRestoreRoute && request.method === 'POST') return restoreDocumentVersion(env, actor, versionRestoreRoute[1], Number(versionRestoreRoute[2]));
    const commentsRoute = path.match(/^\/api\/documents\/([A-Za-z0-9_-]{8,80})\/comments$/);
    if (commentsRoute && request.method === 'GET') return listComments(url, env, actor, commentsRoute[1]);
    if (commentsRoute && request.method === 'POST') return createComment(request, env, actor, commentsRoute[1]);
    const commentRoute = path.match(/^\/api\/comments\/(cmt_[A-Za-z0-9_-]{8,80})$/);
    if (commentRoute && request.method === 'PATCH') return updateComment(request, env, actor, commentRoute[1]);
    if (commentRoute && request.method === 'DELETE') return deleteComment(env, actor, commentRoute[1]);
    const filesRoute = path.match(/^\/api\/documents\/([A-Za-z0-9_-]{8,80})\/files$/);
    if (filesRoute && request.method === 'POST') return uploadFile(request, env, actor, filesRoute[1]);
    const fileRoute = path.match(/^\/api\/files\/(fil_[A-Za-z0-9_-]{8,80})$/);
    if (fileRoute && request.method === 'GET') return downloadFile(env, actor, fileRoute[1]);
    if (fileRoute && request.method === 'DELETE') return deleteFile(env, actor, fileRoute[1]);
    const accessRoute = path.match(/^\/api\/documents\/([A-Za-z0-9_-]{8,80})\/access$/);
    if (accessRoute && request.method === 'GET') return getDocumentAccess(env, actor, accessRoute[1]);
    if (accessRoute && request.method === 'PUT') return saveDocumentAccess(request, env, actor, accessRoute[1]);
    const publicationRoute = path.match(/^\/api\/documents\/([A-Za-z0-9_-]{8,80})\/publication$/);
    if (publicationRoute) return documentPublication(request, env, actor, publicationRoute[1]);
    const documentAction = path.match(/^\/api\/documents\/([A-Za-z0-9_-]{8,80})\/(favorite|trash|restore|duplicate)$/);
    if (documentAction) return documentActionRoute(request, env, actor, documentAction[1], documentAction[2]);
    if (path === '/api/members' && request.method === 'GET') return listMembers(url, env, actor);
    const memberRoute = path.match(/^\/api\/members\/([A-Za-z0-9_-]{8,80})$/);
    if (memberRoute && request.method === 'PATCH') return changeMemberRole(request, env, actor, memberRoute[1]);
    if (memberRoute && request.method === 'DELETE') return removeMember(env, actor, memberRoute[1]);
    if (path === '/api/invitations' && request.method === 'GET') return listInvitations(url, env, actor);
    if (path === '/api/invitations' && request.method === 'POST') return createInvitation(request, env, actor);
    const invitationRoute = path.match(/^\/api\/invitations\/(inv_[A-Za-z0-9_-]{8,80})$/);
    if (invitationRoute && request.method === 'DELETE') return cancelInvitation(env, actor, invitationRoute[1]);
    const resendRoute = path.match(/^\/api\/invitations\/(inv_[A-Za-z0-9_-]{8,80})\/resend$/);
    if (resendRoute && request.method === 'POST') return resendInvitation(request, env, actor, resendRoute[1]);
    if (path === '/api/notifications' && request.method === 'GET') return listNotifications(url, env, actor);
    if (path === '/api/notifications/read' && request.method === 'POST') return markNotificationsRead(env, actor);
    if (path === '/api/activity' && request.method === 'GET') return listActivity(url, env, actor);
    if (path === '/api/templates' && request.method === 'GET') return listTemplates(url, env, actor);
    if (path === '/api/templates' && request.method === 'POST') return createTemplate(request, env, actor);
    const templateDocumentRoute = path.match(/^\/api\/templates\/(tpl_[A-Za-z0-9_-]{3,80})\/documents$/);
    if (templateDocumentRoute && request.method === 'POST') return createDocumentFromTemplate(request, env, actor, templateDocumentRoute[1]);
    throw new HttpError(404, '요청한 기능을 찾을 수 없습니다.');
  }
  if (request.method === 'GET' && (path === '/' || path === '/setup' || /^\/(all|recent|favorites|trash|search|members|settings|notifications|templates)$/.test(path) || /^\/doc\/[A-Za-z0-9_-]{8,80}$/.test(path) || /^\/public\/[A-Za-z0-9_-]{8,80}$/.test(path) || /^\/invite\/[A-Za-z0-9_-]{32,128}$/.test(path))) {
    return securedResponse(new Response(HTML, { headers: { 'content-type': 'text/html; charset=utf-8' } }), true);
  }
  return text('페이지를 찾을 수 없습니다.', 404);
}

function requireDb(env) {
  if (!env || !env.DB) throw new HttpError(503, 'DB 연결을 확인해 주세요.');
  return env.DB;
}

async function requireUser(request, env) {
  const token = parseCookies(request.headers.get('cookie'))[SESSION_COOKIE];
  if (!token) throw new HttpError(401, '로그인이 필요합니다.');
  const user = await requireDb(env).prepare(
    'SELECT u.id, u.username, u.email_ciphertext, u.email_nonce, u.email_blind_index FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?'
  ).bind(await sha256Hex(token), nowSeconds()).first();
  if (!user) throw new HttpError(401, '로그인이 만료되었습니다.');
  return user;
}

async function requireMember(request, env) {
  const user = await requireUser(request, env);
  const member = await env.DB.prepare(
    'SELECT role, joined_at FROM project_members WHERE project_id = ? AND user_id = ?'
  ).bind(PROJECT_ID, user.id).first();
  if (!member) throw new HttpError(403, 'JoripNote 멤버만 접근할 수 있습니다.');
  return { ...user, ...member };
}

function requireRole(actor, roles, message = '이 작업을 수행할 권한이 없습니다.') {
  if (!roles.has(actor.role)) throw new HttpError(403, message);
}

async function bootstrapSignup(request, env) {
  requireDb(env);
  throw new HttpError(403, '첫 관리자는 JoripNote 설치 화면에서만 만들 수 있습니다.');
}

async function setupStatus(env) {
  const row = await requireDb(env).prepare('SELECT EXISTS(SELECT 1 FROM project_members WHERE project_id=?) AS installed').bind(PROJECT_ID).first();
  return json({ installed: Number(row && row.installed) === 1 });
}

async function installAdmin(request, env) {
  const db = requireDb(env);
  await enforceRateLimit(db, 'setup_ip', await requestKey(request, 'setup'), 8, 900);
  const installed = await db.prepare('SELECT EXISTS(SELECT 1 FROM project_members WHERE project_id=?) AS installed').bind(PROJECT_ID).first();
  if (Number(installed && installed.installed) === 1) throw new HttpError(409, '이미 JoripNote 설치가 완료되었습니다.');
  const body = await readJson(request);
  const username = normalizeUsername(body.username);
  const password = String(body.password || '');
  if (!validateUsername(username)) throw new HttpError(400, '관리자 아이디는 영문, 숫자, 밑줄 3–20자로 입력해 주세요.');
  if (!validatePassword(password)) throw new HttpError(400, '비밀번호는 8–72자로 입력해 주세요.');
  if (password !== String(body.password_confirmation || '')) throw new HttpError(400, '비밀번호 확인이 일치하지 않습니다.');
  const user = await passwordUser(username, password);
  const now = nowSeconds();
  const statements = [
    db.prepare('INSERT INTO app_settings (key,value,updated_at) VALUES (?,?,?)').bind('installation_complete', '1', now),
    db.prepare('INSERT INTO users (id, username, password_hash, password_salt, password_iterations, realtime_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(user.id, user.username, user.password_hash, user.password_salt, user.password_iterations, randomString(32), now),
    db.prepare('INSERT INTO project_members (project_id, user_id, role, joined_at, updated_at) VALUES (?, ?, ?, ?, ?)').bind(PROJECT_ID, user.id, 'owner', now, now),
    ...BUILTIN_TEMPLATES.map(([id, name, description, iconValue, blocks]) => db.prepare(`INSERT OR IGNORE INTO workspace_templates
      (id,project_id,name,description,icon,blocks_json,created_by,is_builtin,created_at,updated_at)
      VALUES (?,?,?,?,?,?,NULL,1,?,?)`).bind(id, PROJECT_ID, name, description, iconValue, JSON.stringify(blocks), now, now))
  ];
  try {
    await db.batch(statements);
  } catch (error) {
    const after = await db.prepare('SELECT EXISTS(SELECT 1 FROM project_members WHERE project_id=?) AS installed').bind(PROJECT_ID).first();
    if (Number(after && after.installed) === 1) throw new HttpError(409, '다른 요청에서 설치가 완료되었습니다. 로그인해 주세요.');
    throw error;
  }
  return createSessionResponse(db, user, 'owner', 201);
}

async function login(request, env) {
  const db = requireDb(env);
  const body = await readJson(request);
  const username = normalizeUsername(body.username);
  const password = String(body.password || '');
  await enforceRateLimit(db, 'login_ip', await requestKey(request, 'login'), 20, 900);
  const user = await db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').bind(username).first();
  if (!user || !await verifyPassword(password, user.password_salt, Number(user.password_iterations), user.password_hash)) throw new HttpError(401, '아이디 또는 비밀번호가 올바르지 않습니다.');
  const membership = await db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').bind(PROJECT_ID, user.id).first();
  if (!membership) throw new HttpError(403, 'JoripNote 멤버가 아닙니다.');
  return createSessionResponse(db, user, membership.role);
}

async function logout(request, env) {
  const token = parseCookies(request.headers.get('cookie'))[SESSION_COOKIE];
  if (token && env.DB) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run();
  return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie() });
}

async function createSessionResponse(db, user, role, status = 200) {
  const token = randomString(43);
  const now = nowSeconds();
  await db.batch([
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now),
    db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').bind(await sha256Hex(token), user.id, now + SESSION_TTL_SECONDS, now)
  ]);
  return json({ user: publicUser(user), membership: { role } }, status, { 'set-cookie': sessionCookie(token) });
}

async function listDocuments(url, env, actor) {
  const scope = String(url.searchParams.get('scope') || 'all');
  const limit = boundedLimit(url.searchParams.get('limit'), 20, 50);
  const cursor = decodeCursor(url.searchParams.get('cursor'));
  const parentId = url.searchParams.get('parent_id');
  const q = normalizeSearch(url.searchParams.get('q'));
  let sql;
  let values;
  if (scope === 'favorites') {
    sql = `SELECT d.*, 1 AS is_favorite,
      EXISTS(SELECT 1 FROM documents c WHERE c.project_id=d.project_id AND c.parent_document_id=d.id AND c.status='active') AS has_children
      FROM document_favorites f JOIN documents d ON d.id=f.document_id
      WHERE f.project_id=? AND f.user_id=? AND d.project_id=? AND d.status='active'`;
    values = [PROJECT_ID, actor.id, PROJECT_ID];
    if (cursor) { sql += ' AND (f.created_at < ? OR (f.created_at = ? AND f.document_id < ?))'; values.push(cursor.sort, cursor.sort, cursor.id); }
    sql += ' ORDER BY f.created_at DESC, f.document_id DESC LIMIT ?';
  } else if (scope === 'recent') {
    sql = `SELECT d.*, EXISTS(SELECT 1 FROM document_favorites f WHERE f.project_id=? AND f.user_id=? AND f.document_id=d.id) AS is_favorite,
      EXISTS(SELECT 1 FROM documents c WHERE c.project_id=d.project_id AND c.parent_document_id=d.id AND c.status='active') AS has_children,
      r.opened_at AS list_sort
      FROM recent_documents r JOIN documents d ON d.id=r.document_id
      WHERE r.project_id=? AND r.user_id=? AND d.project_id=? AND d.status='active'`;
    values = [PROJECT_ID, actor.id, PROJECT_ID, actor.id, PROJECT_ID];
    if (cursor) { sql += ' AND (r.opened_at < ? OR (r.opened_at = ? AND r.document_id < ?))'; values.push(cursor.sort, cursor.sort, cursor.id); }
    sql += ' ORDER BY r.opened_at DESC, r.document_id DESC LIMIT ?';
  } else if (scope === 'trash') {
    sql = `SELECT d.*, 0 AS is_favorite, 0 AS has_children, d.trashed_at AS list_sort FROM documents d
      WHERE d.project_id=? AND d.status='trashed'`;
    values = [PROJECT_ID];
    if (cursor) { sql += ' AND (d.trashed_at < ? OR (d.trashed_at = ? AND d.id < ?))'; values.push(cursor.sort, cursor.sort, cursor.id); }
    sql += ' ORDER BY d.trashed_at DESC, d.id DESC LIMIT ?';
  } else if (scope === 'search') {
    if (!q) return json({ documents: [], next_cursor: null });
    sql = `SELECT d.*, EXISTS(SELECT 1 FROM document_favorites f WHERE f.project_id=? AND f.user_id=? AND f.document_id=d.id) AS is_favorite,
      EXISTS(SELECT 1 FROM documents c WHERE c.project_id=d.project_id AND c.parent_document_id=d.id AND c.status='active') AS has_children,
      d.updated_at AS list_sort
      FROM documents d WHERE d.project_id=? AND d.status='active' AND (
        instr(d.title_search, ?) > 0 OR EXISTS(
          SELECT 1 FROM document_blocks b
          WHERE b.document_id=d.id AND b.snapshot_id=d.active_snapshot_id AND instr(lower(b.content), ?) > 0
        )
      )`;
    values = [PROJECT_ID, actor.id, PROJECT_ID, q, q];
    if (cursor) { sql += ' AND (d.updated_at < ? OR (d.updated_at = ? AND d.id < ?))'; values.push(cursor.sort, cursor.sort, cursor.id); }
    sql += ' ORDER BY d.updated_at DESC, d.id DESC LIMIT ?';
  } else {
    sql = `SELECT d.*, EXISTS(SELECT 1 FROM document_favorites f WHERE f.project_id=? AND f.user_id=? AND f.document_id=d.id) AS is_favorite,
      EXISTS(SELECT 1 FROM documents c WHERE c.project_id=d.project_id AND c.parent_document_id=d.id AND c.status='active') AS has_children,
      d.updated_at AS list_sort
      FROM documents d WHERE d.project_id=? AND d.status='active'`;
    values = [PROJECT_ID, actor.id, PROJECT_ID];
    if (parentId) {
      const parent = await requireDocumentForActor(env.DB, actor, parentId);
      if (parent.document.status !== 'active') throw new HttpError(404, '활성 문서를 찾을 수 없습니다.');
      sql += ' AND d.parent_document_id=?';
      values.push(parentId);
    } else {
      sql += ' AND d.parent_document_id IS NULL';
    }
    if (cursor) { sql += ' AND (d.updated_at < ? OR (d.updated_at = ? AND d.id < ?))'; values.push(cursor.sort, cursor.sort, cursor.id); }
    sql += ' ORDER BY d.updated_at DESC, d.id DESC LIMIT ?';
  }
  values.push(limit + 1);
  const result = await env.DB.prepare(sql).bind(...values).all();
  const rows = result.results || [];
  const accessible = [];
  for (const row of rows) if ((await documentPermission(env.DB, actor, row)).can_view) accessible.push(row);
  const hasMore = rows.length > limit;
  const documents = accessible.slice(0, limit).map(publicDocument);
  const last = documents.at(-1);
  return json({ documents, next_cursor: hasMore && last ? encodeCursor({ sort: Number(last.list_sort || last.updated_at), id: last.id }) : null });
}

async function createDocument(request, env, actor) {
  requireRole(actor, EDIT_ROLES);
  const body = await readJson(request);
  const parentId = body.parent_document_id ? String(body.parent_document_id) : null;
  if (parentId) {
    const parent = await requireDocumentForActor(env.DB, actor, parentId, true);
    if (parent.document.status !== 'active') throw new HttpError(404, '활성 문서를 찾을 수 없습니다.');
  }
  const id = 'doc_' + randomString(24);
  const snapshotId = 'snap_' + randomString(24);
  const blockId = 'blk_' + randomString(24);
  const now = nowSeconds();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO documents
      (id, project_id, parent_document_id, title, title_search, status, version, active_snapshot_id, created_by, updated_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'active', 1, ?, ?, ?, ?, ?)`).bind(id, PROJECT_ID, parentId, '', '', snapshotId, actor.id, actor.id, now, now),
    env.DB.prepare(`INSERT INTO document_blocks
      (id, document_id, snapshot_id, block_type, content, position, checked, created_at, updated_at)
      VALUES (?, ?, ?, 'text', '', 0, 0, ?, ?)`).bind(blockId, id, snapshotId, now, now),
    env.DB.prepare('INSERT INTO document_access (document_id,project_id,visibility,updated_by,updated_at) VALUES (?,?,?,?,?)').bind(id, PROJECT_ID, 'workspace', actor.id, now),
    env.DB.prepare('INSERT INTO document_versions (id,project_id,document_id,version,snapshot_id,title,created_by,created_at) VALUES (?,?,?,?,?,?,?,?)').bind('ver_' + randomString(24), PROJECT_ID, id, 1, snapshotId, '', actor.id, now)
  ]);
  await recordActivity(env.DB, actor, id, 'document_created', '새 문서를 만들었습니다.');
  return json({ document: { id, parent_document_id: parentId, title: '', version: 1 } }, 201);
}

async function importMarkdown(request, env, actor) {
  requireRole(actor, EDIT_ROLES);
  const body = await readJson(request);
  const content = String(body.content || '').replace(/\r\n?/g, '\n');
  if (!content.trim()) throw new HttpError(400, '가져올 Markdown 내용이 없습니다.');
  if (encoder.encode(content).length > 2 * 1024 * 1024) throw new HttpError(413, 'Markdown 파일은 2MB 이하만 가져올 수 있습니다.');
  const filename = String(body.filename || 'Notion 가져오기').replace(/\.[^.]+$/, '').normalize('NFKC').trim().slice(0, 160);
  const parsed = parseMarkdownBlocks(content);
  const title = (parsed.title || filename || 'Notion 가져오기').slice(0, 160);
  const blocks = parsed.blocks.slice(0, 500);
  if (!blocks.length) blocks.push({ type: 'text', content: '', checked: false });
  const id = 'doc_' + randomString(24);
  const snapshotId = 'snap_' + randomString(24);
  const now = nowSeconds();
  const statements = [
    env.DB.prepare(`INSERT INTO documents
      (id,project_id,parent_document_id,title,title_search,status,version,active_snapshot_id,created_by,updated_by,created_at,updated_at)
      VALUES (?, ?, NULL, ?, ?, 'active', 1, ?, ?, ?, ?, ?)`).bind(id, PROJECT_ID, title, normalizeSearch(title), snapshotId, actor.id, actor.id, now, now)
  ];
  blocks.forEach((block, index) => statements.push(env.DB.prepare(`INSERT INTO document_blocks
    (id,document_id,snapshot_id,block_type,content,position,checked,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`)
    .bind('blk_' + randomString(24), id, snapshotId, block.type, block.content.slice(0, 20000), index, block.checked ? 1 : 0, now, now)));
  statements.push(env.DB.prepare('INSERT INTO document_access (document_id,project_id,visibility,updated_by,updated_at) VALUES (?,?,?,?,?)').bind(id, PROJECT_ID, 'workspace', actor.id, now));
  statements.push(env.DB.prepare('INSERT INTO document_versions (id,project_id,document_id,version,snapshot_id,title,created_by,created_at) VALUES (?,?,?,?,?,?,?,?)').bind('ver_' + randomString(24), PROJECT_ID, id, 1, snapshotId, title, actor.id, now));
  await env.DB.batch(statements);
  await recordActivity(env.DB, actor, id, 'document_imported', 'Markdown 문서를 가져왔습니다.');
  return json({ document: { id, title, parent_document_id: null, version: 1 }, imported_blocks: blocks.length }, 201);
}

export function parseMarkdownBlocks(markdown) {
  const lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let title = '';
  let code = null;
  const push = (type, content = '', checked = false) => blocks.push({ type, content: String(content).trimEnd(), checked });
  for (const line of lines) {
    if (/^```/.test(line)) {
      if (code === null) code = [];
      else { push('code', code.join('\n')); code = null; }
      continue;
    }
    if (code !== null) { code.push(line); continue; }
    if (!line.trim()) continue;
    let match;
    if ((match = line.match(/^#\s+(.+)$/))) {
      if (!title) title = match[1].trim();
      else push('heading1', match[1]);
    } else if ((match = line.match(/^##\s+(.+)$/))) push('heading2', match[1]);
    else if ((match = line.match(/^###\s+(.+)$/))) push('heading3', match[1]);
    else if ((match = line.match(/^####\s+(.+)$/))) push('heading4', match[1]);
    else if ((match = line.match(/^!\[[^\]]*\]\((https?:\/\/[^)]+)\)$/i))) push('image', match[1]);
    else if ((match = line.match(/^\[[^\]]+\]\((https?:\/\/[^)]+)\)$/i))) push('bookmark', match[1]);
    else if ((match = line.match(/^[-*+]\s+\[([ xX])\]\s+(.+)$/))) push('todo', match[2], match[1].toLowerCase() === 'x');
    else if ((match = line.match(/^[-*+]\s+(.+)$/))) push('bullet', match[1]);
    else if ((match = line.match(/^\d+\.\s+(.+)$/))) push('numbered', match[1]);
    else if ((match = line.match(/^>\s?(.*)$/))) push('quote', match[1]);
    else if (/^\s*([-*_])\1\1+\s*$/.test(line)) push('divider', '');
    else push('text', line);
  }
  if (code !== null) push('code', code.join('\n'));
  return { title, blocks };
}

async function getDocument(env, actor, id) {
  const { document, permission } = await requireDocumentForActor(env.DB, actor, id);
  if (document.status !== 'active') throw new HttpError(404, '휴지통에 있는 문서입니다.');
  const blocks = await env.DB.prepare(
    'SELECT id, block_type, content, position, checked, indent_level FROM document_blocks WHERE document_id=? AND snapshot_id=? ORDER BY position ASC'
  ).bind(id, document.active_snapshot_id).all();
  const favorite = await env.DB.prepare('SELECT 1 AS yes FROM document_favorites WHERE project_id=? AND user_id=? AND document_id=?').bind(PROJECT_ID, actor.id, id).first();
  const now = nowSeconds();
  await env.DB.prepare(`INSERT INTO recent_documents (project_id,user_id,document_id,opened_at) VALUES (?,?,?,?)
    ON CONFLICT(project_id,user_id,document_id) DO UPDATE SET opened_at=excluded.opened_at`).bind(PROJECT_ID, actor.id, id, now).run();
  return json({ document: { ...publicDocument(document), is_favorite: !!favorite, can_edit: permission.can_edit, can_manage_access: permission.can_manage_access, blocks: (blocks.results || []).map(publicBlock) } });
}

async function getPublicDocument(env, id) {
  const document = await env.DB.prepare(`SELECT d.* FROM document_publications p
    JOIN documents d ON d.id=p.document_id AND d.project_id=p.project_id
    WHERE p.project_id=? AND p.document_id=? AND d.status='active'`).bind(PROJECT_ID, id).first();
  if (!document) throw new HttpError(404, '공개되지 않았거나 존재하지 않는 문서입니다.');
  const blocks = await env.DB.prepare(
    'SELECT id,block_type,content,position,checked,indent_level FROM document_blocks WHERE document_id=? AND snapshot_id=? ORDER BY position'
  ).bind(id, document.active_snapshot_id).all();
  return json({ document: { ...publicDocument(document), blocks: (blocks.results || []).map(publicBlock) } }, 200, {
    'cache-control': 'public, max-age=30, stale-while-revalidate=60'
  });
}

async function documentPublication(request, env, actor, id) {
  requireRole(actor, MANAGE_ROLES, '문서 공개는 Owner 또는 Admin만 관리할 수 있습니다.');
  const document = await requireActiveDocument(env.DB, id);
  const publicUrl = new URL(request.url).origin + '/public/' + document.id;
  if (request.method === 'GET') {
    const row = await env.DB.prepare('SELECT published_at FROM document_publications WHERE project_id=? AND document_id=?').bind(PROJECT_ID, id).first();
    return json({ published: !!row, published_at: row ? Number(row.published_at) : null, public_url: publicUrl });
  }
  if (request.method === 'PUT') {
    const now = nowSeconds();
    await env.DB.prepare(`INSERT INTO document_publications (project_id,document_id,published_by,published_at)
      VALUES (?,?,?,?) ON CONFLICT(project_id,document_id) DO UPDATE SET published_by=excluded.published_by,published_at=excluded.published_at`)
      .bind(PROJECT_ID, id, actor.id, now).run();
    return json({ published: true, published_at: now, public_url: publicUrl });
  }
  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM document_publications WHERE project_id=? AND document_id=?').bind(PROJECT_ID, id).run();
    return json({ published: false, published_at: null, public_url: publicUrl });
  }
  throw new HttpError(405, '허용되지 않은 요청입니다.');
}

async function saveDocument(request, env, actor, id) {
  requireRole(actor, EDIT_ROLES);
  const { document: existing } = await requireDocumentForActor(env.DB, actor, id, true);
  if (existing.status !== 'active') throw new HttpError(404, '활성 문서를 찾을 수 없습니다.');
  const body = await readJson(request);
  const expectedVersion = Number(body.version);
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) throw new HttpError(400, '문서 버전이 올바르지 않습니다.');
  const title = String(body.title || '').normalize('NFKC').trim().slice(0, 160);
  const snapshotId = String(body.save_id || '');
  if (!/^snap_[A-Za-z0-9_-]{16,80}$/.test(snapshotId)) throw new HttpError(400, '저장 요청 ID가 올바르지 않습니다.');
  const blocks = validateBlocks(body.blocks);
  if (expectedVersion !== Number(existing.version)) throw new HttpError(409, '문서가 다른 요청에서 먼저 변경되었습니다.', { current_version: Number(existing.version) });
  const now = nowSeconds();
  const statements = blocks.map((block, index) => env.DB.prepare(`INSERT INTO document_blocks
    (id,document_id,snapshot_id,block_type,content,position,checked,indent_level,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .bind(block.id, id, snapshotId, block.type, block.content, index, block.checked ? 1 : 0, block.indent_level, now, now));
  statements.push(env.DB.prepare(`UPDATE documents SET title=?,title_search=?,version=version+1,active_snapshot_id=?,updated_by=?,updated_at=?
    WHERE id=? AND project_id=? AND status='active' AND version=?`).bind(title, normalizeSearch(title), snapshotId, actor.id, now, id, PROJECT_ID, expectedVersion));
  statements.push(env.DB.prepare(`INSERT INTO document_versions (id,project_id,document_id,version,snapshot_id,title,created_by,created_at) VALUES (?,?,?,?,?,?,?,?)`)
    .bind('ver_' + randomString(24), PROJECT_ID, id, expectedVersion + 1, snapshotId, title, actor.id, now));
  const results = await env.DB.batch(statements);
  const updateResult = results.at(-2);
  if (!updateResult.meta || Number(updateResult.meta.changes) !== 1) throw new HttpError(409, '문서가 다른 요청에서 먼저 변경되었습니다.');
  const staleVersions = await env.DB.prepare('SELECT id,snapshot_id FROM document_versions WHERE document_id=? ORDER BY version DESC LIMIT -1 OFFSET 100').bind(id).all();
  if ((staleVersions.results || []).length) {
    const cleanup = [];
    for (const stale of staleVersions.results) {
      cleanup.push(env.DB.prepare('DELETE FROM document_blocks WHERE document_id=? AND snapshot_id=?').bind(id, stale.snapshot_id));
      cleanup.push(env.DB.prepare('DELETE FROM document_versions WHERE id=? AND document_id=?').bind(stale.id, id));
    }
    await env.DB.batch(cleanup);
  }
  await recordActivity(env.DB, actor, id, 'document_updated', '문서를 수정하고 버전 ' + (expectedVersion + 1) + '을 저장했습니다.');
  return json({ ok: true, version: expectedVersion + 1, updated_at: now });
}

async function documentActionRoute(request, env, actor, id, action) {
  const { document, permission } = await requireDocumentForActor(env.DB, actor, id);
  if (action === 'duplicate' && request.method === 'POST') {
    requireRole(actor, EDIT_ROLES);
    if (!permission.can_edit) throw new HttpError(403, '이 문서를 편집할 권한이 없습니다.');
    if (document.status !== 'active') throw new HttpError(404, '활성 문서가 아닙니다.');
    const source = await env.DB.prepare('SELECT block_type,content,position,checked,indent_level FROM document_blocks WHERE document_id=? AND snapshot_id=? ORDER BY position').bind(id, document.active_snapshot_id).all();
    const copyId = 'doc_' + randomString(24);
    const snapshotId = 'snap_' + randomString(24);
    const now = nowSeconds();
    const title = ((document.title || '제목 없음') + ' — 복사본').slice(0, 160);
    const statements = [env.DB.prepare(`INSERT INTO documents
      (id,project_id,parent_document_id,title,title_search,status,version,active_snapshot_id,created_by,updated_by,created_at,updated_at)
      VALUES (?,?,?,?,?,'active',1,?,?,?,?,?)`).bind(copyId, PROJECT_ID, document.parent_document_id, title, normalizeSearch(title), snapshotId, actor.id, actor.id, now, now)];
    for (const block of (source.results || [])) statements.push(env.DB.prepare(`INSERT INTO document_blocks
      (id,document_id,snapshot_id,block_type,content,position,checked,indent_level,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .bind('blk_' + randomString(24), copyId, snapshotId, block.block_type, block.content, block.position, block.checked, block.indent_level || 0, now, now));
    statements.push(env.DB.prepare('INSERT INTO document_access (document_id,project_id,visibility,updated_by,updated_at) VALUES (?,?,?,?,?)').bind(copyId, PROJECT_ID, 'workspace', actor.id, now));
    statements.push(env.DB.prepare('INSERT INTO document_versions (id,project_id,document_id,version,snapshot_id,title,created_by,created_at) VALUES (?,?,?,?,?,?,?,?)').bind('ver_' + randomString(24), PROJECT_ID, copyId, 1, snapshotId, title, actor.id, now));
    await env.DB.batch(statements);
    await recordActivity(env.DB, actor, copyId, 'document_duplicated', '문서를 복제했습니다.');
    return json({ document: { id: copyId, title, parent_document_id: document.parent_document_id, version: 1 } }, 201);
  }
  if (action === 'favorite') {
    if (document.status !== 'active') throw new HttpError(404, '활성 문서가 아닙니다.');
    if (request.method === 'PUT') {
      await env.DB.prepare('INSERT OR IGNORE INTO document_favorites (project_id,user_id,document_id,created_at) VALUES (?,?,?,?)').bind(PROJECT_ID, actor.id, id, nowSeconds()).run();
      return json({ ok: true });
    }
    if (request.method === 'DELETE') {
      await env.DB.prepare('DELETE FROM document_favorites WHERE project_id=? AND user_id=? AND document_id=?').bind(PROJECT_ID, actor.id, id).run();
      return json({ ok: true });
    }
  }
  requireRole(actor, EDIT_ROLES);
  if (!permission.can_edit) throw new HttpError(403, '이 문서를 편집할 권한이 없습니다.');
  if (action === 'trash' && request.method === 'POST') {
    if (document.status !== 'active') throw new HttpError(409, '이미 휴지통에 있는 문서입니다.');
    await env.DB.prepare(`UPDATE documents SET status='trashed',trashed_at=?,updated_at=?,updated_by=? WHERE id=? AND project_id=?`).bind(nowSeconds(), nowSeconds(), actor.id, id, PROJECT_ID).run();
    return json({ ok: true });
  }
  if (action === 'restore' && request.method === 'POST') {
    if (document.status !== 'trashed') throw new HttpError(409, '휴지통 문서가 아닙니다.');
    if (document.parent_document_id) {
      const parent = await env.DB.prepare('SELECT status FROM documents WHERE id=? AND project_id=?').bind(document.parent_document_id, PROJECT_ID).first();
      if (!parent || parent.status !== 'active') throw new HttpError(409, '먼저 상위 문서를 복구해 주세요.');
    }
    await env.DB.prepare(`UPDATE documents SET status='active',trashed_at=NULL,updated_at=?,updated_by=? WHERE id=? AND project_id=?`).bind(nowSeconds(), actor.id, id, PROJECT_ID).run();
    return json({ ok: true });
  }
  throw new HttpError(405, '허용되지 않은 요청입니다.');
}

async function permanentlyDeleteDocument(env, actor, id) {
  requireRole(actor, EDIT_ROLES);
  const { document } = await requireDocumentForActor(env.DB, actor, id, true);
  if (document.status !== 'trashed') throw new HttpError(409, '휴지통 문서만 영구 삭제할 수 있습니다.');
  const files = await env.DB.prepare('SELECT storage_key FROM file_uploads WHERE document_id=? AND project_id=? AND deleted_at IS NULL').bind(id, PROJECT_ID).all();
  if (env.STORAGE && typeof env.STORAGE.delete === 'function') for (const file of (files.results || [])) await env.STORAGE.delete(file.storage_key);
  await env.DB.prepare('DELETE FROM documents WHERE id=? AND project_id=? AND status=?').bind(id, PROJECT_ID, 'trashed').run();
  return json({ ok: true });
}

async function listMembers(url, env, actor) {
  const limit = boundedLimit(url.searchParams.get('limit'), 20, 50);
  const cursor = decodeCursor(url.searchParams.get('cursor'));
  let sql = `SELECT m.user_id,m.role,m.joined_at,u.username FROM project_members m JOIN users u ON u.id=m.user_id WHERE m.project_id=?`;
  const values = [PROJECT_ID];
  if (cursor) { sql += ' AND (m.joined_at < ? OR (m.joined_at = ? AND m.user_id < ?))'; values.push(cursor.sort, cursor.sort, cursor.id); }
  sql += ' ORDER BY m.joined_at DESC,m.user_id DESC LIMIT ?';
  values.push(limit + 1);
  const result = await env.DB.prepare(sql).bind(...values).all();
  const rows = result.results || [];
  const members = rows.slice(0, limit);
  const last = members.at(-1);
  return json({ members, next_cursor: rows.length > limit && last ? encodeCursor({ sort: Number(last.joined_at), id: last.user_id }) : null });
}

async function changeMemberRole(request, env, actor, userId) {
  requireRole(actor, MANAGE_ROLES);
  const body = await readJson(request);
  const role = String(body.role || '').toLowerCase();
  const target = await env.DB.prepare('SELECT role FROM project_members WHERE project_id=? AND user_id=?').bind(PROJECT_ID, userId).first();
  if (!target) throw new HttpError(404, '멤버를 찾을 수 없습니다.');
  if (actor.role === 'admin' && (target.role === 'owner' || target.role === 'admin' || !['member', 'viewer'].includes(role))) throw new HttpError(403, 'Admin은 Member와 Viewer 역할만 변경할 수 있습니다.');
  if (actor.role === 'owner' && !['owner', 'admin', 'member', 'viewer'].includes(role)) throw new HttpError(400, '역할이 올바르지 않습니다.');
  if (target.role === 'owner' && role !== 'owner') await assertNotLastOwner(env.DB, userId);
  await env.DB.prepare('UPDATE project_members SET role=?,updated_at=? WHERE project_id=? AND user_id=?').bind(role, nowSeconds(), PROJECT_ID, userId).run();
  return json({ ok: true, role });
}

async function removeMember(env, actor, userId) {
  if (actor.role !== 'owner') throw new HttpError(403, 'Owner만 멤버를 제거할 수 있습니다.');
  const target = await env.DB.prepare('SELECT role FROM project_members WHERE project_id=? AND user_id=?').bind(PROJECT_ID, userId).first();
  if (!target) throw new HttpError(404, '멤버를 찾을 수 없습니다.');
  if (target.role === 'owner') await assertNotLastOwner(env.DB, userId);
  await env.DB.prepare('DELETE FROM project_members WHERE project_id=? AND user_id=?').bind(PROJECT_ID, userId).run();
  return json({ ok: true });
}

async function assertNotLastOwner(db, userId) {
  const count = await db.prepare(`SELECT COUNT(*) AS count FROM project_members WHERE project_id=? AND role='owner' AND user_id<>?`).bind(PROJECT_ID, userId).first();
  if (Number(count.count) < 1) throw new HttpError(409, '마지막 Owner는 역할을 변경하거나 제거할 수 없습니다.');
}

async function listInvitations(url, env, actor) {
  requireRole(actor, MANAGE_ROLES);
  await expireInvitations(env.DB);
  const limit = boundedLimit(url.searchParams.get('limit'), 20, 50);
  const cursor = decodeCursor(url.searchParams.get('cursor'));
  let sql = `SELECT id,email_ciphertext,email_nonce,role,expires_at,created_at FROM project_invitations WHERE project_id=? AND status='pending'`;
  const values = [PROJECT_ID];
  if (cursor) { sql += ' AND (created_at < ? OR (created_at = ? AND id < ?))'; values.push(cursor.sort, cursor.sort, cursor.id); }
  sql += ' ORDER BY created_at DESC,id DESC LIMIT ?';
  values.push(limit + 1);
  const result = await env.DB.prepare(sql).bind(...values).all();
  const rows = result.results || [];
  const invitations = [];
  for (const row of rows.slice(0, limit)) invitations.push({ ...row, email: await decryptEmail(env, row.email_ciphertext, row.email_nonce), email_ciphertext: undefined, email_nonce: undefined });
  const last = invitations.at(-1);
  return json({ invitations, next_cursor: rows.length > limit && last ? encodeCursor({ sort: Number(last.created_at), id: last.id }) : null });
}

async function createInvitation(request, env, actor) {
  requireRole(actor, MANAGE_ROLES);
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const role = validateInviteRole(actor, body.role);
  const encrypted = await encryptEmail(env, email);
  const blind = await emailBlindIndex(env, email);
  const duplicateMember = await env.DB.prepare('SELECT 1 AS yes FROM users u JOIN project_members m ON m.user_id=u.id WHERE m.project_id=? AND u.email_blind_index=?').bind(PROJECT_ID, blind).first();
  if (duplicateMember) throw new HttpError(409, '이미 참여 중인 이메일입니다.');
  const pending = await env.DB.prepare(`SELECT id FROM project_invitations WHERE project_id=? AND email_blind_index=? AND status='pending' AND expires_at>?`).bind(PROJECT_ID, blind, nowSeconds()).first();
  if (pending) throw new HttpError(409, '이미 대기 중인 초대가 있습니다.');
  const id = 'inv_' + randomString(24);
  const token = randomString(48);
  const now = nowSeconds();
  await env.DB.prepare(`INSERT INTO project_invitations
    (id,project_id,email_ciphertext,email_nonce,email_blind_index,token_hash,role,status,invited_by,expires_at,created_at,updated_at)
    VALUES (?,?,?,?,?,? ,?,'pending',?,?,?,?)`).bind(id, PROJECT_ID, encrypted.ciphertext, encrypted.nonce, blind, await sha256Hex(token), role, actor.id, now + INVITE_TTL_SECONDS, now, now).run();
  const inviteUrl = new URL('/invite/' + token, request.url).toString();
  const delivery = await deliverInvitation(env, email, inviteUrl, role, false);
  return json({ invitation: { id, email, role, expires_at: now + INVITE_TTL_SECONDS }, invite_url: inviteUrl, delivery }, 201);
}

async function resendInvitation(request, env, actor, id) {
  requireRole(actor, MANAGE_ROLES);
  const invite = await env.DB.prepare(`SELECT * FROM project_invitations WHERE id=? AND project_id=? AND status='pending'`).bind(id, PROJECT_ID).first();
  if (!invite) throw new HttpError(404, '대기 중인 초대를 찾을 수 없습니다.');
  const token = randomString(48);
  const now = nowSeconds();
  await env.DB.prepare('UPDATE project_invitations SET token_hash=?,expires_at=?,updated_at=? WHERE id=? AND project_id=? AND status=?').bind(await sha256Hex(token), now + INVITE_TTL_SECONDS, now, id, PROJECT_ID, 'pending').run();
  const email = await decryptEmail(env, invite.email_ciphertext, invite.email_nonce);
  const inviteUrl = new URL('/invite/' + token, request.url).toString();
  const delivery = await deliverInvitation(env, email, inviteUrl, invite.role, true);
  return json({ invite_url: inviteUrl, delivery, expires_at: now + INVITE_TTL_SECONDS });
}

async function cancelInvitation(env, actor, id) {
  requireRole(actor, MANAGE_ROLES);
  const result = await env.DB.prepare(`UPDATE project_invitations SET status='cancelled',updated_at=? WHERE id=? AND project_id=? AND status='pending'`).bind(nowSeconds(), id, PROJECT_ID).run();
  if (!result.meta || Number(result.meta.changes) !== 1) throw new HttpError(404, '대기 중인 초대를 찾을 수 없습니다.');
  return json({ ok: true });
}

async function invitationPreview(env, token) {
  const invite = await invitationByToken(env.DB, token);
  if (!invite || invite.status !== 'pending') throw new HttpError(404, '유효한 초대를 찾을 수 없습니다.');
  if (Number(invite.expires_at) <= nowSeconds()) {
    await env.DB.prepare(`UPDATE project_invitations SET status='expired',updated_at=? WHERE id=? AND status='pending'`).bind(nowSeconds(), invite.id).run();
    throw new HttpError(410, '초대가 만료되었습니다.');
  }
  const email = await decryptEmail(env, invite.email_ciphertext, invite.email_nonce);
  return json({ email_hint: maskEmail(email), role: invite.role, expires_at: invite.expires_at });
}

async function acceptInvitation(request, env, token) {
  const db = requireDb(env);
  const invite = await invitationByToken(db, token);
  if (!invite || invite.status !== 'pending') throw new HttpError(404, '유효한 초대를 찾을 수 없습니다.');
  if (Number(invite.expires_at) <= nowSeconds()) {
    await db.prepare(`UPDATE project_invitations SET status='expired',updated_at=? WHERE id=? AND status='pending'`).bind(nowSeconds(), invite.id).run();
    throw new HttpError(410, '초대가 만료되었습니다.');
  }
  const body = await readJson(request);
  const username = normalizeUsername(body.username);
  const password = String(body.password || '');
  if (!validateUsername(username)) throw new HttpError(400, '아이디는 영문, 숫자, 밑줄 3–20자로 입력해 주세요.');
  if (!validatePassword(password)) throw new HttpError(400, '비밀번호는 8–72자로 입력해 주세요.');
  const user = await passwordUser(username, password);
  const now = nowSeconds();
  try {
    const results = await db.batch([
      db.prepare(`INSERT INTO users
        (id,username,password_hash,password_salt,password_iterations,realtime_key,email_ciphertext,email_nonce,email_blind_index,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(user.id, user.username, user.password_hash, user.password_salt, user.password_iterations, randomString(32), invite.email_ciphertext, invite.email_nonce, invite.email_blind_index, now),
      db.prepare('INSERT INTO project_members (project_id,user_id,role,joined_at,updated_at) VALUES (?,?,?,?,?)').bind(PROJECT_ID, user.id, invite.role, now, now),
      db.prepare(`UPDATE project_invitations SET status='accepted',accepted_by=?,updated_at=? WHERE id=? AND project_id=? AND status='pending' AND token_hash=? AND expires_at>?`)
        .bind(user.id, now, invite.id, PROJECT_ID, await sha256Hex(token), now)
    ]);
    if (Number(results[2].meta && results[2].meta.changes) !== 1) throw new HttpError(409, '이미 사용되었거나 만료된 초대입니다.');
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (/unique|constraint/i.test(String(error && error.message))) throw new HttpError(409, '이미 사용 중인 아이디 또는 이메일입니다.');
    throw error;
  }
  return createSessionResponse(db, user, invite.role, 201);
}

async function invitationByToken(db, token) {
  return db.prepare('SELECT * FROM project_invitations WHERE token_hash=? AND project_id=?').bind(await sha256Hex(token), PROJECT_ID).first();
}

async function expireInvitations(db) {
  await db.prepare(`UPDATE project_invitations SET status='expired',updated_at=? WHERE project_id=? AND status='pending' AND expires_at<=?`).bind(nowSeconds(), PROJECT_ID, nowSeconds()).run();
}

function validateInviteRole(actor, requested) {
  const role = String(requested || '').toLowerCase();
  const allowed = actor.role === 'owner' ? ['admin', 'member', 'viewer'] : ['member', 'viewer'];
  if (!allowed.includes(role)) throw new HttpError(403, '해당 역할로 초대할 권한이 없습니다.');
  return role;
}

async function deliverInvitation(env, email, inviteUrl, role, resend) {
  if (!env.MAIL || typeof env.MAIL.send !== 'function') return 'manual';
  await env.MAIL.send({
    to: email,
    subject: resend ? '[JoripNote] 멤버 초대를 다시 보냈습니다' : '[JoripNote] 협업 문서 멤버 초대',
    text: 'JoripNote 협업 문서에 ' + roleLabelServer(role) + ' 역할로 초대되었습니다.\n\n초대 수락: ' + inviteUrl + '\n\n이 링크는 7일 동안 유효하며 한 번만 사용할 수 있습니다.'
  });
  return 'sent';
}

function roleLabelServer(role) {
  return ({ owner: 'Owner', admin: 'Admin', member: 'Member', viewer: 'Viewer' })[role] || role;
}

async function documentPermission(db, actor, document) {
  if (MANAGE_ROLES.has(actor.role)) return { can_view: true, can_edit: true, can_manage_access: true };
  if (document.created_by === actor.id) return { can_view: true, can_edit: EDIT_ROLES.has(actor.role), can_manage_access: true };
  const access = await db.prepare(`SELECT a.visibility,g.permission FROM document_access a
    LEFT JOIN document_grants g ON g.document_id=a.document_id AND g.user_id=?
    WHERE a.document_id=? AND a.project_id=?`).bind(actor.id, document.id, PROJECT_ID).first();
  const visibility = access ? access.visibility : 'workspace';
  if (visibility === 'workspace') return { can_view: true, can_edit: EDIT_ROLES.has(actor.role), can_manage_access: false };
  return { can_view: !!(access && access.permission), can_edit: access && access.permission === 'editor' && EDIT_ROLES.has(actor.role), can_manage_access: false };
}

async function requireDocumentForActor(db, actor, id, edit = false) {
  const document = await requireDocument(db, id);
  const permission = await documentPermission(db, actor, document);
  if (!permission.can_view) throw new HttpError(404, '문서를 찾을 수 없습니다.');
  if (edit && !permission.can_edit) throw new HttpError(403, '이 문서를 편집할 권한이 없습니다.');
  return { document, permission };
}

async function recordActivity(db, actor, documentId, kind, message) {
  const recent = await db.prepare('SELECT id FROM activity_events WHERE project_id=? AND actor_id=? AND document_id IS ? AND kind=? AND created_at>? ORDER BY created_at DESC LIMIT 1')
    .bind(PROJECT_ID, actor.id, documentId || null, kind, nowSeconds() - 60).first();
  if (recent) {
    await db.prepare('UPDATE activity_events SET message=?,created_at=? WHERE id=?').bind(String(message).slice(0, 300), nowSeconds(), recent.id).run();
    return;
  }
  await db.prepare('INSERT INTO activity_events (id,project_id,actor_id,document_id,kind,message,created_at) VALUES (?,?,?,?,?,?,?)')
    .bind('act_' + randomString(24), PROJECT_ID, actor.id, documentId || null, kind, String(message).slice(0, 300), nowSeconds()).run();
}

async function notifyUser(db, userId, actor, documentId, commentId, kind, message) {
  if (!userId || userId === actor.id) return;
  await db.prepare(`INSERT INTO notifications (id,project_id,user_id,actor_id,document_id,comment_id,kind,message,created_at)
    VALUES (?,?,?,?,?,?,?,?,?)`).bind('ntf_' + randomString(24), PROJECT_ID, userId, actor.id, documentId || null, commentId || null, kind, String(message).slice(0, 300), nowSeconds()).run();
}

async function listDocumentVersions(url, env, actor, id) {
  await requireDocumentForActor(env.DB, actor, id);
  const limit = boundedLimit(url.searchParams.get('limit'), 30, 100);
  const result = await env.DB.prepare(`SELECT v.id,v.version,v.title,v.created_at,u.username,
    COALESCE((SELECT substr(replace(b.content,'@qwerty-rich:',''),1,180) FROM document_blocks b WHERE b.document_id=v.document_id AND b.snapshot_id=v.snapshot_id ORDER BY b.position LIMIT 1),'') AS preview
    FROM document_versions v JOIN users u ON u.id=v.created_by WHERE v.project_id=? AND v.document_id=? ORDER BY v.version DESC LIMIT ?`)
    .bind(PROJECT_ID, id, limit).all();
  return json({ versions: (result.results || []).map(row => ({ ...row, version: Number(row.version), created_at: Number(row.created_at) })) });
}

async function getDocumentVersion(env, actor, id, version) {
  await requireDocumentForActor(env.DB, actor, id);
  const row = await env.DB.prepare('SELECT * FROM document_versions WHERE project_id=? AND document_id=? AND version=?').bind(PROJECT_ID, id, version).first();
  if (!row) throw new HttpError(404, '문서 버전을 찾을 수 없습니다.');
  const blocks = await env.DB.prepare('SELECT id,block_type,content,position,checked,indent_level FROM document_blocks WHERE document_id=? AND snapshot_id=? ORDER BY position').bind(id, row.snapshot_id).all();
  return json({ version: { version: Number(row.version), title: row.title, created_at: Number(row.created_at), blocks: (blocks.results || []).map(publicBlock) } });
}

async function restoreDocumentVersion(env, actor, id, version) {
  const { document } = await requireDocumentForActor(env.DB, actor, id, true);
  const source = await env.DB.prepare('SELECT * FROM document_versions WHERE project_id=? AND document_id=? AND version=?').bind(PROJECT_ID, id, version).first();
  if (!source) throw new HttpError(404, '복원할 버전을 찾을 수 없습니다.');
  const blocks = await env.DB.prepare('SELECT * FROM document_blocks WHERE document_id=? AND snapshot_id=? ORDER BY position').bind(id, source.snapshot_id).all();
  const snapshotId = 'snap_' + randomString(24);
  const nextVersion = Number(document.version) + 1;
  const now = nowSeconds();
  const statements = (blocks.results || []).map(block => env.DB.prepare(`INSERT INTO document_blocks
    (id,document_id,snapshot_id,block_type,content,position,checked,indent_level,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .bind(block.id, id, snapshotId, block.block_type, block.content, block.position, block.checked, block.indent_level || 0, now, now));
  statements.push(env.DB.prepare('UPDATE documents SET title=?,title_search=?,version=?,active_snapshot_id=?,updated_by=?,updated_at=? WHERE id=? AND project_id=?')
    .bind(source.title, normalizeSearch(source.title), nextVersion, snapshotId, actor.id, now, id, PROJECT_ID));
  statements.push(env.DB.prepare(`INSERT INTO document_versions (id,project_id,document_id,version,snapshot_id,title,created_by,created_at) VALUES (?,?,?,?,?,?,?,?)`)
    .bind('ver_' + randomString(24), PROJECT_ID, id, nextVersion, snapshotId, source.title, actor.id, now));
  await env.DB.batch(statements);
  await recordActivity(env.DB, actor, id, 'version_restored', '문서를 버전 ' + version + '의 내용으로 복원했습니다.');
  return json({ ok: true, version: nextVersion });
}

async function listComments(url, env, actor, id) {
  await requireDocumentForActor(env.DB, actor, id);
  const limit = boundedLimit(url.searchParams.get('limit'), 50, 100);
  const result = await env.DB.prepare(`SELECT c.*,u.username FROM document_comments c JOIN users u ON u.id=c.created_by
    WHERE c.project_id=? AND c.document_id=? AND c.deleted_at IS NULL ORDER BY c.created_at DESC,c.id DESC LIMIT ?`).bind(PROJECT_ID, id, limit).all();
  return json({ comments: (result.results || []).map(row => ({ id: row.id, block_id: row.block_id, body: row.body, username: row.username, created_at: Number(row.created_at), updated_at: Number(row.updated_at), resolved_at: row.resolved_at == null ? null : Number(row.resolved_at), can_delete: row.created_by === actor.id || MANAGE_ROLES.has(actor.role) })) });
}

async function createComment(request, env, actor, id) {
  const { document } = await requireDocumentForActor(env.DB, actor, id);
  const body = await readJson(request);
  const content = String(body.body || '').normalize('NFKC').trim();
  const blockId = body.block_id ? String(body.block_id) : null;
  if (!content || content.length > 2000) throw new HttpError(400, '댓글은 1–2,000자로 입력해 주세요.');
  if (blockId && !/^blk_[A-Za-z0-9_-]{8,80}$/.test(blockId)) throw new HttpError(400, '댓글 블록 정보가 올바르지 않습니다.');
  const idValue = 'cmt_' + randomString(24);
  const now = nowSeconds();
  await env.DB.prepare(`INSERT INTO document_comments (id,project_id,document_id,block_id,body,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`)
    .bind(idValue, PROJECT_ID, id, blockId, content, actor.id, now, now).run();
  const names = [...new Set([...content.matchAll(/@([A-Za-z0-9_]{3,20})/g)].map(match => match[1].toLowerCase()))];
  for (const name of names.slice(0, 20)) {
    const member = await env.DB.prepare(`SELECT u.id FROM users u JOIN project_members m ON m.user_id=u.id WHERE m.project_id=? AND lower(u.username)=?`).bind(PROJECT_ID, name).first();
    if (member) await notifyUser(env.DB, member.id, actor, id, idValue, 'mention', actor.username + '님이 문서 댓글에서 회원님을 언급했습니다.');
  }
  if (document.created_by !== actor.id) await notifyUser(env.DB, document.created_by, actor, id, idValue, 'comment', actor.username + '님이 문서에 댓글을 남겼습니다.');
  await recordActivity(env.DB, actor, id, 'comment_created', '문서에 댓글을 작성했습니다.');
  return json({ comment: { id: idValue, body: content, created_at: now } }, 201);
}

async function requireComment(db, id) {
  const row = await db.prepare('SELECT * FROM document_comments WHERE id=? AND project_id=? AND deleted_at IS NULL').bind(id, PROJECT_ID).first();
  if (!row) throw new HttpError(404, '댓글을 찾을 수 없습니다.');
  return row;
}

async function updateComment(request, env, actor, id) {
  const comment = await requireComment(env.DB, id);
  await requireDocumentForActor(env.DB, actor, comment.document_id);
  const body = await readJson(request);
  const resolved = !!body.resolved;
  await env.DB.prepare('UPDATE document_comments SET resolved_at=?,resolved_by=?,updated_at=? WHERE id=? AND project_id=?')
    .bind(resolved ? nowSeconds() : null, resolved ? actor.id : null, nowSeconds(), id, PROJECT_ID).run();
  return json({ ok: true });
}

async function deleteComment(env, actor, id) {
  const comment = await requireComment(env.DB, id);
  await requireDocumentForActor(env.DB, actor, comment.document_id);
  if (comment.created_by !== actor.id && !MANAGE_ROLES.has(actor.role)) throw new HttpError(403, '자신이 작성한 댓글만 삭제할 수 있습니다.');
  await env.DB.prepare('UPDATE document_comments SET body=?,deleted_at=?,updated_at=? WHERE id=? AND project_id=?').bind('[삭제된 댓글]', nowSeconds(), nowSeconds(), id, PROJECT_ID).run();
  return json({ ok: true });
}

async function listNotifications(url, env, actor) {
  const limit = boundedLimit(url.searchParams.get('limit'), 30, 100);
  const [items, count] = await Promise.all([
    env.DB.prepare(`SELECT n.*,u.username AS actor_username FROM notifications n LEFT JOIN users u ON u.id=n.actor_id
      WHERE n.project_id=? AND n.user_id=? ORDER BY n.created_at DESC,n.id DESC LIMIT ?`).bind(PROJECT_ID, actor.id, limit).all(),
    env.DB.prepare('SELECT COUNT(*) AS count FROM notifications WHERE project_id=? AND user_id=? AND read_at IS NULL').bind(PROJECT_ID, actor.id).first()
  ]);
  return json({ notifications: (items.results || []).map(row => ({ ...row, created_at: Number(row.created_at), read_at: row.read_at == null ? null : Number(row.read_at) })), unread_count: Number(count && count.count || 0) });
}

async function markNotificationsRead(env, actor) {
  await env.DB.prepare('UPDATE notifications SET read_at=? WHERE project_id=? AND user_id=? AND read_at IS NULL').bind(nowSeconds(), PROJECT_ID, actor.id).run();
  return json({ ok: true });
}

async function listActivity(url, env, actor) {
  const limit = boundedLimit(url.searchParams.get('limit'), 30, 100);
  const result = await env.DB.prepare(`SELECT a.*,u.username AS actor_username FROM activity_events a JOIN users u ON u.id=a.actor_id
    WHERE a.project_id=? ORDER BY a.created_at DESC,a.id DESC LIMIT ?`).bind(PROJECT_ID, limit).all();
  const visible = [];
  for (const row of (result.results || [])) {
    if (!row.document_id || (await documentPermission(env.DB, actor, await requireDocument(env.DB, row.document_id))).can_view) visible.push({ ...row, created_at: Number(row.created_at) });
  }
  return json({ events: visible });
}

async function listTemplates(url, env, actor) {
  const limit = boundedLimit(url.searchParams.get('limit'), 30, 100);
  const result = await env.DB.prepare('SELECT id,name,description,icon,is_builtin,created_at,updated_at FROM workspace_templates WHERE project_id=? ORDER BY is_builtin DESC,updated_at DESC,id DESC LIMIT ?').bind(PROJECT_ID, limit).all();
  return json({ templates: (result.results || []).map(row => ({ ...row, is_builtin: !!row.is_builtin, created_at: Number(row.created_at), updated_at: Number(row.updated_at) })) });
}

async function createTemplate(request, env, actor) {
  requireRole(actor, EDIT_ROLES);
  const body = await readJson(request);
  const name = String(body.name || '').normalize('NFKC').trim().slice(0, 80);
  const description = String(body.description || '').normalize('NFKC').trim().slice(0, 300);
  const icon = String(body.icon || '📄').slice(0, 8);
  if (!name) throw new HttpError(400, '템플릿 이름을 입력해 주세요.');
  const { document } = await requireDocumentForActor(env.DB, actor, String(body.document_id || ''), true);
  const rows = await env.DB.prepare('SELECT block_type,content,checked,indent_level FROM document_blocks WHERE document_id=? AND snapshot_id=? ORDER BY position').bind(document.id, document.active_snapshot_id).all();
  const blocks = (rows.results || []).map(row => ({ type: row.block_type, content: row.content, checked: !!row.checked, indent_level: Number(row.indent_level || 0) }));
  const id = 'tpl_' + randomString(24);
  const now = nowSeconds();
  try {
    await env.DB.prepare(`INSERT INTO workspace_templates (id,project_id,name,description,icon,blocks_json,created_by,is_builtin,created_at,updated_at) VALUES (?,?,?,?,?,?,?,0,?,?)`)
      .bind(id, PROJECT_ID, name, description, icon, JSON.stringify(blocks), actor.id, now, now).run();
  } catch (error) {
    if (/unique|constraint/i.test(String(error && error.message))) throw new HttpError(409, '같은 이름의 템플릿이 있습니다.');
    throw error;
  }
  await recordActivity(env.DB, actor, document.id, 'template_created', '문서 템플릿 ‘' + name + '’을 만들었습니다.');
  return json({ template: { id, name } }, 201);
}

async function createDocumentFromTemplate(request, env, actor, templateId) {
  requireRole(actor, EDIT_ROLES);
  const template = await env.DB.prepare('SELECT * FROM workspace_templates WHERE id=? AND project_id=?').bind(templateId, PROJECT_ID).first();
  if (!template) throw new HttpError(404, '템플릿을 찾을 수 없습니다.');
  let source;
  try { source = JSON.parse(template.blocks_json); } catch { throw new HttpError(500, '템플릿 내용이 올바르지 않습니다.'); }
  const blocks = validateBlocks(source.slice(0, 500).map(block => ({ ...block, id: 'blk_' + randomString(24) })));
  const id = 'doc_' + randomString(24);
  const snapshotId = 'snap_' + randomString(24);
  const now = nowSeconds();
  const statements = [env.DB.prepare(`INSERT INTO documents
    (id,project_id,parent_document_id,title,title_search,status,version,active_snapshot_id,created_by,updated_by,created_at,updated_at)
    VALUES (?,?,NULL,?,?,'active',1,?,?,?,?,?)`).bind(id, PROJECT_ID, template.name, normalizeSearch(template.name), snapshotId, actor.id, actor.id, now, now)];
  blocks.forEach((block, index) => statements.push(env.DB.prepare(`INSERT INTO document_blocks
    (id,document_id,snapshot_id,block_type,content,position,checked,indent_level,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .bind(block.id, id, snapshotId, block.type, block.content, index, block.checked ? 1 : 0, block.indent_level, now, now)));
  statements.push(env.DB.prepare('INSERT INTO document_access (document_id,project_id,visibility,updated_by,updated_at) VALUES (?,?,?,?,?)').bind(id, PROJECT_ID, 'workspace', actor.id, now));
  statements.push(env.DB.prepare('INSERT INTO document_versions (id,project_id,document_id,version,snapshot_id,title,created_by,created_at) VALUES (?,?,?,?,?,?,?,?)').bind('ver_' + randomString(24), PROJECT_ID, id, 1, snapshotId, template.name, actor.id, now));
  await env.DB.batch(statements);
  await recordActivity(env.DB, actor, id, 'document_created', '템플릿 ‘' + template.name + '’으로 문서를 만들었습니다.');
  return json({ document: { id, title: template.name, version: 1 } }, 201);
}

async function getDocumentAccess(env, actor, id) {
  const { document, permission } = await requireDocumentForActor(env.DB, actor, id);
  if (!permission.can_manage_access) throw new HttpError(403, '문서별 권한을 관리할 수 없습니다.');
  const [access, grants, members] = await Promise.all([
    env.DB.prepare('SELECT visibility FROM document_access WHERE document_id=? AND project_id=?').bind(id, PROJECT_ID).first(),
    env.DB.prepare('SELECT user_id,permission FROM document_grants WHERE document_id=?').bind(id).all(),
    env.DB.prepare(`SELECT m.user_id,m.role,u.username FROM project_members m JOIN users u ON u.id=m.user_id WHERE m.project_id=? ORDER BY u.username`).bind(PROJECT_ID).all()
  ]);
  return json({ visibility: access ? access.visibility : 'workspace', grants: grants.results || [], members: members.results || [], owner_id: document.created_by });
}

async function saveDocumentAccess(request, env, actor, id) {
  const { permission } = await requireDocumentForActor(env.DB, actor, id);
  if (!permission.can_manage_access) throw new HttpError(403, '문서별 권한을 관리할 수 없습니다.');
  const body = await readJson(request);
  const visibility = body.visibility === 'restricted' ? 'restricted' : body.visibility === 'workspace' ? 'workspace' : '';
  if (!visibility || !Array.isArray(body.grants) || body.grants.length > 100) throw new HttpError(400, '문서 권한 설정이 올바르지 않습니다.');
  const grants = [];
  const seen = new Set();
  for (const item of body.grants) {
    const userId = String(item && item.user_id || '');
    const grant = String(item && item.permission || '');
    if (!/^usr_[A-Za-z0-9_-]{8,80}$/.test(userId) || !['viewer', 'editor'].includes(grant) || seen.has(userId)) throw new HttpError(400, '멤버 권한 정보가 올바르지 않습니다.');
    const member = await env.DB.prepare('SELECT 1 AS yes FROM project_members WHERE project_id=? AND user_id=?').bind(PROJECT_ID, userId).first();
    if (!member) throw new HttpError(400, '워크스페이스 멤버만 문서 권한에 추가할 수 있습니다.');
    seen.add(userId); grants.push({ user_id: userId, permission: grant });
  }
  const now = nowSeconds();
  const statements = [
    env.DB.prepare(`INSERT INTO document_access (document_id,project_id,visibility,updated_by,updated_at) VALUES (?,?,?,?,?)
      ON CONFLICT(document_id) DO UPDATE SET visibility=excluded.visibility,updated_by=excluded.updated_by,updated_at=excluded.updated_at`).bind(id, PROJECT_ID, visibility, actor.id, now),
    env.DB.prepare('DELETE FROM document_grants WHERE document_id=?').bind(id)
  ];
  for (const grant of grants) statements.push(env.DB.prepare(`INSERT INTO document_grants (document_id,user_id,permission,granted_by,created_at,updated_at) VALUES (?,?,?,?,?,?)`).bind(id, grant.user_id, grant.permission, actor.id, now, now));
  await env.DB.batch(statements);
  for (const grant of grants) await notifyUser(env.DB, grant.user_id, actor, id, null, 'permission', actor.username + '님이 문서에 ' + (grant.permission === 'editor' ? '편집' : '보기') + ' 권한을 부여했습니다.');
  await recordActivity(env.DB, actor, id, 'permission_updated', '문서별 접근 권한을 변경했습니다.');
  return json({ ok: true });
}

async function uploadFile(request, env, actor, documentId) {
  await requireDocumentForActor(env.DB, actor, documentId, true);
  if (!env.STORAGE || typeof env.STORAGE.put !== 'function') throw new HttpError(503, '스토리지 연결을 확인해 주세요.');
  let form;
  try { form = await request.formData(); } catch { throw new HttpError(400, '파일 업로드 형식이 올바르지 않습니다.'); }
  const file = form.get('file');
  if (!file || typeof file.arrayBuffer !== 'function') throw new HttpError(400, '업로드할 파일을 선택해 주세요.');
  if (file.size < 1 || file.size > 10 * 1024 * 1024) throw new HttpError(413, '파일은 10MB 이하만 올릴 수 있습니다.');
  const filename = String(file.name || 'file').normalize('NFKC').replace(/[\\/\u0000-\u001f]/g, '_').slice(0, 180);
  const requestedType = String(file.type || '').toLowerCase().slice(0, 120);
  const contentType = /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(requestedType) ? requestedType : 'application/octet-stream';
  if (['text/html', 'image/svg+xml', 'application/xhtml+xml'].includes(contentType)) throw new HttpError(415, '보안을 위해 HTML과 SVG 파일은 업로드할 수 없습니다.');
  const id = 'fil_' + randomString(24);
  const key = 'documents/' + documentId + '/' + id;
  const bytes = await file.arrayBuffer();
  await env.STORAGE.put(key, bytes, { httpMetadata: { contentType } });
  const now = nowSeconds();
  try {
    await env.DB.prepare(`INSERT INTO file_uploads (id,project_id,document_id,storage_key,filename,content_type,size,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?)`)
      .bind(id, PROJECT_ID, documentId, key, filename, contentType, file.size, actor.id, now).run();
  } catch (error) {
    await env.STORAGE.delete(key);
    throw error;
  }
  await recordActivity(env.DB, actor, documentId, 'file_uploaded', '파일 ‘' + filename + '’을 업로드했습니다.');
  return json({ file: { id, filename, content_type: contentType, size: file.size, url: new URL(request.url).origin + '/api/files/' + id } }, 201);
}

async function downloadFile(env, actor, id) {
  const row = await env.DB.prepare('SELECT * FROM file_uploads WHERE id=? AND project_id=? AND deleted_at IS NULL').bind(id, PROJECT_ID).first();
  if (!row) throw new HttpError(404, '파일을 찾을 수 없습니다.');
  await requireDocumentForActor(env.DB, actor, row.document_id);
  if (!env.STORAGE || typeof env.STORAGE.get !== 'function') throw new HttpError(503, '스토리지 연결을 확인해 주세요.');
  const object = await env.STORAGE.get(row.storage_key);
  if (!object) throw new HttpError(404, '저장된 파일을 찾을 수 없습니다.');
  const inline = /^(image|audio|video)\//.test(row.content_type);
  return securedResponse(new Response(object.body || object, { headers: {
    'content-type': row.content_type,
    'content-length': String(row.size),
    'content-disposition': (inline ? 'inline' : 'attachment') + '; filename*=UTF-8\'\'' + encodeURIComponent(row.filename),
    'cache-control': 'private, no-store'
  } }));
}

async function deleteFile(env, actor, id) {
  const row = await env.DB.prepare('SELECT * FROM file_uploads WHERE id=? AND project_id=? AND deleted_at IS NULL').bind(id, PROJECT_ID).first();
  if (!row) throw new HttpError(404, '파일을 찾을 수 없습니다.');
  await requireDocumentForActor(env.DB, actor, row.document_id, true);
  if (row.created_by !== actor.id && !MANAGE_ROLES.has(actor.role)) throw new HttpError(403, '자신이 올린 파일만 삭제할 수 있습니다.');
  if (env.STORAGE && typeof env.STORAGE.delete === 'function') await env.STORAGE.delete(row.storage_key);
  await env.DB.prepare('UPDATE file_uploads SET deleted_at=? WHERE id=? AND project_id=?').bind(nowSeconds(), id, PROJECT_ID).run();
  return json({ ok: true });
}

async function requireDocument(db, id) {
  const row = await db.prepare('SELECT * FROM documents WHERE id=? AND project_id=?').bind(id, PROJECT_ID).first();
  if (!row) throw new HttpError(404, '문서를 찾을 수 없습니다.');
  return row;
}

async function requireActiveDocument(db, id) {
  const row = await requireDocument(db, id);
  if (row.status !== 'active') throw new HttpError(404, '활성 문서를 찾을 수 없습니다.');
  return row;
}

function validateDatabasePayload(content) {
  let data;
  try { data = JSON.parse(content); } catch { throw new HttpError(400, '데이터베이스 형식이 올바르지 않습니다.'); }
  if (Array.isArray(data)) {
    if (data.length < 1 || data.length > 50 || data.some(row => !Array.isArray(row) || row.length < 1 || row.length > 12 || row.some(cell => String(cell).length > 500))) throw new HttpError(400, '기존 데이터베이스 표는 최대 50행, 12열이며 셀은 500자 이하여야 합니다.');
    return JSON.stringify(data.map(row => row.map(cell => String(cell))));
  }
  if (!data || data.version !== 2 || !Array.isArray(data.columns) || !Array.isArray(data.rows)) throw new HttpError(400, '데이터베이스 버전 또는 구조가 올바르지 않습니다.');
  if (String(data.title || '').length > 120 || data.columns.length < 1 || data.columns.length > 12 || data.rows.length > 200) throw new HttpError(400, '데이터베이스는 최대 200개 작업과 12개 속성을 지원합니다.');
  const propertyTypes = new Set(['text', 'select', 'person', 'number', 'date', 'checkbox', 'url']);
  const columnIds = new Set();
  const columns = data.columns.map((column) => {
    const id = String(column && column.id || '');
    const name = String(column && column.name || '');
    const type = String(column && column.type || '');
    if (!/^[A-Za-z0-9_-]{3,40}$/.test(id) || columnIds.has(id) || !name || name.length > 80 || !propertyTypes.has(type)) throw new HttpError(400, '데이터베이스 속성 정보가 올바르지 않습니다.');
    const options = [...new Set((Array.isArray(column.options) ? column.options : []).map(value => String(value)))];
    if (options.length > 30 || options.some(value => !value || value.length > 80)) throw new HttpError(400, '선택 속성은 최대 30개 옵션을 지원합니다.');
    columnIds.add(id);
    return { id, name, type, options };
  });
  const rowIds = new Set();
  const rows = data.rows.map((row) => {
    const id = String(row && row.id || '');
    if (!/^[A-Za-z0-9_-]{3,50}$/.test(id) || rowIds.has(id) || !row.cells || typeof row.cells !== 'object' || Array.isArray(row.cells)) throw new HttpError(400, '데이터베이스 작업 정보가 올바르지 않습니다.');
    rowIds.add(id);
    const cells = {};
    for (const column of columns) {
      const raw = row.cells[column.id];
      if (column.type === 'checkbox') cells[column.id] = !!raw;
      else {
        const value = String(raw ?? '');
        if (value.length > 500) throw new HttpError(400, '데이터베이스 셀은 500자 이하여야 합니다.');
        cells[column.id] = value;
      }
    }
    return { id, cells };
  });
  const view = data.view && typeof data.view === 'object' ? data.view : {};
  return JSON.stringify({
    version: 2,
    title: String(data.title || '팀 작업'),
    columns,
    rows,
    view: {
      mode: view.mode === 'board' ? 'board' : 'table',
      groupBy: columnIds.has(String(view.groupBy || '')) ? String(view.groupBy) : columns[0].id,
      sortBy: columnIds.has(String(view.sortBy || '')) ? String(view.sortBy) : '',
      sortDir: view.sortDir === 'desc' ? 'desc' : 'asc'
    }
  });
}

function validateBlocks(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 500) throw new HttpError(400, '문서 블록은 1–500개여야 합니다.');
  const ids = new Set();
  return value.map((block) => {
    const id = String(block && block.id || '');
    const type = String(block && block.type || '');
    let content = String(block && block.content || '').replace(/\r\n/g, '\n');
    if (!/^blk_[A-Za-z0-9_-]{8,80}$/.test(id) || ids.has(id)) throw new HttpError(400, '블록 ID가 올바르지 않습니다.');
    if (!BLOCK_TYPES.has(type)) throw new HttpError(400, '지원하지 않는 블록 유형입니다.');
    if (content.length > (type === 'database' ? 100000 : 20000)) throw new HttpError(400, type === 'database' ? '데이터베이스 내용은 100,000자 이하여야 합니다.' : '블록 내용은 20,000자 이하여야 합니다.');
    if (content.startsWith('@qwerty-rich:')) content = '@qwerty-rich:' + sanitizeInlineRich(content.slice(13));
    if (['image', 'video', 'audio', 'file', 'bookmark', 'embed', 'page_link'].includes(type) && content && !/^https?:\/\/[^\s]+$/i.test(content)) throw new HttpError(400, 'URL 블록에는 http 또는 https 주소만 사용할 수 있습니다.');
    if (type === 'database') {
      content = validateDatabasePayload(content);
    } else if (type === 'table') {
      let grid;
      try { grid = JSON.parse(content); } catch { throw new HttpError(400, '표 데이터 형식이 올바르지 않습니다.'); }
      if (!Array.isArray(grid) || grid.length < 1 || grid.length > 50 || grid.some(row => !Array.isArray(row) || row.length < 1 || row.length > 12 || row.some(cell => String(cell).length > 500))) throw new HttpError(400, '표는 최대 50행, 12열이며 셀은 500자 이하여야 합니다.');
      content = JSON.stringify(grid.map(row => row.map(cell => String(cell))));
    }
    ids.add(id);
    const requestedIndent = Number(block && block.indent_level || 0);
    const indentLevel = ['bullet', 'numbered', 'todo'].includes(type) && Number.isInteger(requestedIndent) ? Math.max(0, Math.min(4, requestedIndent)) : 0;
    return { id, type, content: (type === 'divider' || type === 'toc') ? '' : content, checked: (type === 'todo' || type === 'toggle') && !!block.checked, indent_level: indentLevel };
  });
}

function sanitizeInlineRich(html) {
  return String(html || '').replace(/<[^>]*>/g, (tag) => {
    const normalized = tag.toLowerCase().replace(/\s+/g, ' ');
    if (/^<\/?(b|strong|i|em|u|s|code)>$/.test(normalized) || /^<br\s*\/?>$/.test(normalized)) return normalized.startsWith('<br') ? '<br>' : normalized;
    if (normalized === '</a>') return '</a>';
    if (normalized.startsWith('<a ')) {
      const match = tag.match(/\bhref\s*=\s*["'](https?:\/\/[^"'<>]+)["']/i);
      return match ? '<a href="' + escapeXml(match[1]) + '" target="_blank" rel="noopener noreferrer">' : '';
    }
    return '';
  });
}

function publicDocument(row) {
  return {
    id: row.id,
    parent_document_id: row.parent_document_id,
    title: row.title,
    title_search: row.title_search,
    status: row.status,
    version: Number(row.version),
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
    trashed_at: row.trashed_at == null ? null : Number(row.trashed_at),
    list_sort: row.list_sort == null ? null : row.list_sort,
    is_favorite: !!row.is_favorite,
    has_children: !!row.has_children
  };
}

function publicBlock(row) {
  return { id: row.id, type: row.block_type, content: row.content, position: Number(row.position), checked: !!row.checked, indent_level: Number(row.indent_level || 0) };
}

async function encryptEmail(env, email) {
  const secret = requireSecret(env, 'EMAIL_ENCRYPTION_KEY');
  const key = await crypto.subtle.importKey('raw', await sha256Bytes(secret), { name: 'AES-GCM' }, false, ['encrypt']);
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, encoder.encode(email));
  return { ciphertext: bytesToBase64Url(new Uint8Array(encrypted)), nonce: bytesToBase64Url(nonce) };
}

async function decryptEmail(env, ciphertext, nonce) {
  const secret = requireSecret(env, 'EMAIL_ENCRYPTION_KEY');
  const key = await crypto.subtle.importKey('raw', await sha256Bytes(secret), { name: 'AES-GCM' }, false, ['decrypt']);
  try {
    const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64UrlToBytes(nonce) }, key, base64UrlToBytes(ciphertext));
    return new TextDecoder().decode(clear);
  } catch {
    throw new HttpError(500, '초대 이메일을 안전하게 읽지 못했습니다.');
  }
}

async function emailBlindIndex(env, email) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(requireSecret(env, 'EMAIL_BLIND_INDEX_KEY')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(email))));
}

function requireSecret(env, name) {
  const value = env && env[name];
  if (!value || String(value).length < 16) throw new HttpError(503, '이메일 보호 Secret 설정이 필요합니다.');
  return String(value);
}

function normalizeEmail(value) {
  const email = String(value || '').normalize('NFKC').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, '올바른 이메일 주소를 입력해 주세요.');
  return email;
}

function maskEmail(email) {
  const [local, domain] = email.split('@');
  return local.slice(0, 2) + '***@' + domain;
}

function normalizeSearch(value) {
  return String(value || '').normalize('NFKC').trim().toLocaleLowerCase('ko-KR').slice(0, 160);
}

function boundedLimit(value, fallback, max) {
  const number = Number(value || fallback);
  return Number.isSafeInteger(number) && number > 0 ? Math.min(number, max) : fallback;
}

function encodeCursor(value) {
  return bytesToBase64Url(encoder.encode(JSON.stringify(value)));
}

function decodeCursor(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlToBytes(value)));
    if (!parsed || !['string', 'number'].includes(typeof parsed.sort) || typeof parsed.id !== 'string') throw new Error();
    return parsed;
  } catch {
    throw new HttpError(400, '페이지 커서가 올바르지 않습니다.');
  }
}

async function readJson(request) {
  if (!String(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) throw new HttpError(415, 'JSON 요청이 필요합니다.');
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch {
    throw new HttpError(400, '요청 본문이 올바르지 않습니다.');
  }
}

function assertSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) throw new HttpError(403, '허용되지 않은 요청 출처입니다.');
}

async function enforceRateLimit(db, scope, key, limit, windowSeconds) {
  const bucket = Math.floor(nowSeconds() / windowSeconds);
  await db.prepare(`INSERT INTO auth_rate_limits (scope,rate_key,window_bucket,attempts,updated_at) VALUES (?,?,?,1,?)
    ON CONFLICT(scope,rate_key,window_bucket) DO UPDATE SET attempts=attempts+1,updated_at=excluded.updated_at`).bind(scope, key, bucket, nowSeconds()).run();
  const row = await db.prepare('SELECT attempts FROM auth_rate_limits WHERE scope=? AND rate_key=? AND window_bucket=?').bind(scope, key, bucket).first();
  if (Number(row && row.attempts) > limit) throw new HttpError(429, '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.');
}

async function requestKey(request, suffix) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
  return sha256Hex(ip.split(',')[0].trim() + ':' + suffix);
}

async function passwordUser(username, password) {
  const salt = randomString(24);
  return { id: 'usr_' + randomString(24), username, password_salt: salt, password_hash: await hashPassword(password, salt), password_iterations: PASSWORD_ITERATIONS };
}

export function normalizeUsername(value) {
  return String(value || '').normalize('NFKC').trim();
}

export function validateUsername(value) {
  return /^[A-Za-z0-9_]{3,20}$/.test(String(value || ''));
}

export function validatePassword(value) {
  const length = String(value || '').length;
  return length >= 8 && length <= 72;
}

async function createCaptcha(request, env) {
  const db = requireDb(env);
  const id = crypto.randomUUID();
  const code = Array.from({ length: 5 }, () => '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'[randomInt(0, 31)]).join('');
  const now = nowSeconds();
  await db.prepare('INSERT INTO captcha_challenges (id,answer_hash,svg,expires_at,attempts,created_at) VALUES (?,?,?,?,0,?)')
    .bind(id, await sha256Hex(id + ':' + code.toLowerCase()), buildCaptchaSvg(code), now + CAPTCHA_TTL_SECONDS, now).run();
  return json({ id, image_url: '/api/captcha/' + id + '.svg', expires_in: CAPTCHA_TTL_SECONDS });
}

async function getCaptchaSvg(env, id) {
  const row = await requireDb(env).prepare('SELECT svg FROM captcha_challenges WHERE id=? AND expires_at>?').bind(id, nowSeconds()).first();
  if (!row) return text('Not found', 404);
  return securedResponse(new Response(row.svg, { headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'no-store' } }));
}

export function buildCaptchaSvg(code) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="280" height="74" viewBox="0 0 280 74" role="img" aria-label="자동가입 방지 문자"><rect width="280" height="74" fill="#f2f1ed"/><text x="140" y="49" text-anchor="middle" font-family="monospace" font-size="34" letter-spacing="10" fill="#292925">' + escapeXml(code) + '</text></svg>';
}

export async function hashPassword(password, salt, iterations = PASSWORD_ITERATIONS) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations }, key, 256)));
}

export async function verifyPassword(password, salt, iterations, expected) {
  return constantTimeEqual(await hashPassword(password, salt, iterations), expected);
}

async function sha256Bytes(value) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

async function sha256Hex(value) {
  return Array.from(await sha256Bytes(value), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(left, right) {
  const a = encoder.encode(String(left));
  const b = encoder.encode(String(right));
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) difference |= (a[index % a.length] || 0) ^ (b[index % b.length] || 0);
  return difference === 0;
}

function randomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join('');
}

function randomInt(min, max) {
  return min + (crypto.getRandomValues(new Uint32Array(1))[0] % (max - min + 1));
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
  const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function parseCookies(header) {
  const result = {};
  for (const part of String(header || '').split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    result[part.slice(0, index).trim()] = part.slice(index + 1).trim();
  }
  return result;
}

function sessionCookie(token) {
  return SESSION_COOKIE + '=' + token + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + SESSION_TTL_SECONDS;
}

function clearSessionCookie() {
  return SESSION_COOKIE + '=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
}

function publicUser(user) {
  return { id: user.id, username: user.username };
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

export function escapeXml(value) {
  return String(value).replace(/[<>&"']/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character]);
}

function json(value, status = 200, headers = {}) {
  return securedResponse(new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } }));
}

function text(value, status = 200) {
  return securedResponse(new Response(value, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } }));
}

function asset(value, contentType) {
  return securedResponse(new Response(value, { headers: { 'content-type': contentType, 'cache-control': 'no-cache' } }));
}

function securedResponse(response, html = false) {
  const headers = new Headers(response.headers);
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'same-origin');
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('cross-origin-opener-policy', 'same-origin');
  headers.set('x-frame-options', 'DENY');
  if (html) {
    headers.set('content-security-policy', "default-src 'self'; script-src 'self'; style-src 'self' https://cdn.jsdelivr.net; font-src 'self' https://cdn.jsdelivr.net; img-src 'self' data: https:; media-src 'self' https:; frame-src https://www.youtube.com https://player.vimeo.com https://www.figma.com https://figma.com https://www.loom.com https://loom.com https://codepen.io https://replit.com https://www.google.com; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
    headers.set('cache-control', 'no-store');
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
