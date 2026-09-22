import { unzipSync } from 'fflate';
import { INDENTABLE_BLOCK_TYPES, normalizeBlockSnapshot } from './engine/document-model.js';

const PROJECT_ID = 'qwerty';
const SESSION_COOKIE = 'qwerty_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const DEMO_HOSTNAME = 'joripnote.joripspace.run';
const DEMO_CRON_HOSTNAME = 'joripspace-cron.internal';
const DEMO_RESET_PATH = '/__joripnote_demo/reset';
const DEMO_USER_ID = 'demo_owner';
const DEMO_USERNAME = 'demo';
const DEMO_MODE_SETTING = 'demo_mode';
const INVITE_TTL_SECONDS = 60 * 60 * 24 * 7;
const PASSWORD_ITERATIONS = 100000;
const CAPTCHA_TTL_SECONDS = 60 * 5;
const NOTION_ZIP_MAX_BYTES = 50 * 1024 * 1024;
const NOTION_UNZIPPED_MAX_BYTES = 100 * 1024 * 1024;
const NOTION_ENTRY_MAX_BYTES = 10 * 1024 * 1024;
const NOTION_MAX_ENTRIES = 2000;
const NOTION_MAX_DOCUMENTS = 250;
const NOTION_LARGE_MAX_UNPACKED_BYTES = 5 * 1024 * 1024 * 1024;
const NOTION_LARGE_MAX_ENTRIES = 10000;
const NOTION_LARGE_MAX_DOCUMENTS = 5000;
const NOTION_REGISTER_BATCH = 100;
const NOTION_DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;
const NOTION_DIRECT_ASSET_MAX_BYTES = 8 * 1024 * 1024;
const DATABASE_MAX_ROWS = 5000;
const DATABASE_MAX_COLUMNS = 100;
const DATABASE_VIEW_TYPES = new Set(['table', 'board', 'calendar', 'timeline', 'gallery', 'list']);
const BLOCK_TYPES = new Set(['text', 'heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6', 'bullet', 'numbered', 'todo', 'quote', 'code', 'divider', 'toggle', 'callout', 'table', 'database', 'toc', 'math', 'bookmark', 'image', 'video', 'audio', 'file', 'embed', 'page_link']);
const EDIT_ROLES = new Set(['owner', 'admin', 'member']);
const MANAGE_ROLES = new Set(['owner', 'admin']);
const BUILTIN_TEMPLATES = [
  ['tpl_meeting', '회의록', '안건, 논의 내용과 할 일을 정리합니다.', '🗒️', [{ type: 'heading2', content: '회의 정보' }, { type: 'bullet', content: '일시: ' }, { type: 'bullet', content: '참석자: ' }, { type: 'heading2', content: '안건' }, { type: 'text', content: '논의할 안건을 입력하세요.' }, { type: 'heading2', content: '결정 및 할 일' }, { type: 'todo', content: '담당자와 기한을 적어 주세요.' }]],
  ['tpl_daily', '업무일지', '오늘의 목표와 진행 상황을 기록합니다.', '✅', [{ type: 'heading2', content: '오늘의 목표' }, { type: 'todo', content: '가장 중요한 일을 적어 주세요.' }, { type: 'heading2', content: '진행 내용' }, { type: 'text', content: '진행한 내용을 적어 주세요.' }, { type: 'heading2', content: '내일 할 일' }, { type: 'todo', content: '다음 할 일을 적어 주세요.' }]],
  ['tpl_project', '프로젝트 계획서', '목표, 일정, 담당자와 위험 요소를 정리합니다.', '🚀', [{ type: 'heading2', content: '프로젝트 목표' }, { type: 'text', content: '달성하려는 목표를 적어 주세요.' }, { type: 'heading2', content: '주요 일정' }, { type: 'todo', content: '일정과 담당자를 적어 주세요.' }, { type: 'heading2', content: '위험 요소' }, { type: 'callout', content: '예상되는 위험과 대응 방법을 적어 주세요.' }]]
];
const STARTER_DOCUMENTS = [
  {
    id: 'doc_starter_welcome', snapshotId: 'snap_starter_welcome', title: 'JoripNote 시작하기', parentId: null, favorite: true, recent: true,
    blocks: [
      ['blk_welcome_heading1', 'heading1', 'JoripNote에 오신 것을 환영합니다'],
      ['blk_welcome_richtext', 'text', '@qwerty-rich:<strong>블록을 클릭해 바로 편집</strong>하고, <em>드래그해서 순서를 바꾸며</em>, <u>중요한 부분을 표시</u>해 보세요.'],
      ['blk_welcome_callout', 'callout', '이 문서들은 기능을 직접 시험한 뒤 자유롭게 수정하거나 삭제해도 되는 샘플입니다.'],
      ['blk_welcome_toc', 'toc', ''],
      ['blk_welcome_heading2', 'heading2', '기본 블록'],
      ['blk_welcome_bullet1', 'bullet', '문서를 블록 단위로 작성합니다.', false, 0],
      ['blk_welcome_bullet2', 'bullet', 'Tab과 Shift+Tab으로 목록 깊이를 바꿉니다.', false, 1],
      ['blk_welcome_number1', 'numbered', '왼쪽 사이드바에서 새 문서를 만듭니다.', false, 0],
      ['blk_welcome_number2', 'numbered', '제목과 내용을 입력하면 자동 저장됩니다.', false, 1],
      ['blk_welcome_todo1', 'todo', '즐겨찾기와 최근 문서를 확인하기', true, 0],
      ['blk_welcome_todo2', 'todo', '댓글과 버전 기록을 직접 사용해 보기', false, 1],
      ['blk_welcome_quote', 'quote', '좋은 문서 공간은 기록을 시작하는 데 망설임이 없어야 합니다.'],
      ['blk_welcome_toggle', 'toggle', '접었다 펼치는 토글\n토글 본문에는 길어진 설명이나 참고 내용을 정리할 수 있습니다.', true],
      ['blk_welcome_divider', 'divider', ''],
      ['blk_welcome_heading3', 'heading3', '코드와 수식'],
      ['blk_welcome_code', 'code', "const note = { title: '새 아이디어', saved: true };\nconsole.log(note);"],
      ['blk_welcome_math', 'math', 'E = mc^2'],
      ['blk_welcome_heading4', 'heading4', '간단한 표'],
      ['blk_welcome_table', 'table', JSON.stringify([['기능', '사용 예시', '상태'], ['문서', '아이디어 정리', '준비됨'], ['댓글', '피드백 남기기', '준비됨'], ['버전', '이전 내용 복원', '준비됨']])],
      ['blk_welcome_page', 'page_link', '{origin}/doc/doc_starter_board']
    ]
  },
  {
    id: 'doc_starter_board', snapshotId: 'snap_starter_board', title: '프로젝트 운영 보드', parentId: null, favorite: true, recent: true,
    blocks: [
      ['blk_board_intro', 'callout', '표·보드 전환, 검색, 필터, 정렬, 속성 추가와 카드 이동을 모두 시험해 보세요.'],
      ['blk_board_database', 'database', JSON.stringify({
        version: 2,
        title: 'JoripNote 출시 준비',
        columns: [
          { id: 'col_task', name: '작업', type: 'text', options: [] },
          { id: 'col_status', name: '상태', type: 'select', options: ['예정', '진행 중', '검토', '완료'] },
          { id: 'col_owner', name: '담당자', type: 'person', options: [] },
          { id: 'col_priority', name: '우선순위', type: 'number', options: [] },
          { id: 'col_due', name: '마감일', type: 'date', options: [] },
          { id: 'col_done', name: '확인', type: 'checkbox', options: [] },
          { id: 'col_link', name: '참고 링크', type: 'url', options: [] }
        ],
        rows: [
          { id: 'row_launch_copy', cells: { col_task: '소개 문구 다듬기', col_status: '완료', col_owner: 'Owner', col_priority: '1', col_due: '2026-09-05', col_done: true, col_link: 'https://joripspace.com/marketplace/joripnote/' } },
          { id: 'row_mobile_check', cells: { col_task: '모바일 편집 점검', col_status: '진행 중', col_owner: 'Owner', col_priority: '2', col_due: '2026-09-07', col_done: false, col_link: 'https://joripnote.joripspace.run/' } },
          { id: 'row_share_page', cells: { col_task: '공개 문서 공유하기', col_status: '검토', col_owner: '', col_priority: '3', col_due: '', col_done: false, col_link: '' } }
        ],
        view: { mode: 'board', groupBy: 'col_status', sortBy: 'col_priority', sortDir: 'asc', filter: { column: '', operator: 'contains', value: '' } }
      })],
      ['blk_board_heading', 'heading2', '함께 쓰는 방법'],
      ['blk_board_text', 'text', '새 속성과 작업을 추가하고, 보드에서 카드를 다른 상태로 끌어보세요. 변경 내용은 문서 버전에 기록됩니다.'],
      ['blk_board_child', 'page_link', '{origin}/doc/doc_starter_meeting']
    ]
  },
  {
    id: 'doc_starter_meeting', snapshotId: 'snap_starter_meeting', title: '주간 회의록', parentId: 'doc_starter_board', favorite: false, recent: true,
    blocks: [
      ['blk_meeting_heading', 'heading1', '주간 회의록'],
      ['blk_meeting_meta1', 'bullet', '참석자: Owner'],
      ['blk_meeting_meta2', 'bullet', '목표: 이번 주 우선순위와 담당자 확인'],
      ['blk_meeting_agenda', 'heading2', '안건'],
      ['blk_meeting_todo1', 'todo', '모바일에서 문서 작성 흐름 확인', true],
      ['blk_meeting_todo2', 'todo', '공개 링크를 열어 비로그인 화면 확인', false],
      ['blk_meeting_decision', 'heading2', '결정 사항'],
      ['blk_meeting_text', 'text', '결정 사항을 이곳에 적고 댓글로 의견을 이어가세요.']
    ],
    comment: { id: 'cmt_starter_meeting', blockId: 'blk_meeting_text', body: '댓글을 남기고 해결 처리하는 흐름을 시험해 보세요.' }
  },
  {
    id: 'doc_starter_media', snapshotId: 'snap_starter_media', title: '링크와 미디어 예시', parentId: null, favorite: false, recent: false,
    blocks: [
      ['blk_media_heading', 'heading1', '링크와 미디어 블록'],
      ['blk_media_intro', 'text', 'URL을 바꾸면 각 블록의 미리보기가 즉시 갱신됩니다. 비어 있는 블록에는 직접 사용할 주소를 붙여넣어 보세요.'],
      ['blk_media_bookmark', 'bookmark', 'https://github.com/JoripSpace/JoripNote'],
      ['blk_media_image', 'image', 'https://github.com/JoripSpace.png'],
      ['blk_media_video', 'video', ''],
      ['blk_media_audio', 'audio', ''],
      ['blk_media_file', 'file', 'https://raw.githubusercontent.com/JoripSpace/JoripNote/master/LICENSE'],
      ['blk_media_embed', 'embed', ''],
      ['blk_media_page', 'page_link', '{origin}/doc/doc_starter_welcome'],
      ['blk_media_share', 'callout', '우상단 공유 메뉴에서 비공개 또는 웹 공개를 선택할 수 있습니다. 공개 문서는 로그인하지 않은 사람도 볼 수 있으니 민감한 내용은 공개하지 마세요.']
    ]
  }
];
const encoder = new TextEncoder();

const HTML = String.raw`<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f7f7f5">
  <title>JoripNote</title>
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%232d2d2a'/%3E%3Ctext x='32' y='43' text-anchor='middle' font-size='38' font-family='serif' fill='white'%3EJ%3C/text%3E%3C/svg%3E">
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/variable/woff2/SUIT-Variable.css">
  <link rel="stylesheet" href="/app.css?v=20260922-joripnote-64">
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
    <symbol id="icon-calendar" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></symbol>
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
    <symbol id="icon-grid" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></symbol>
    <symbol id="icon-preview" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M13 9h5M13 13h5M13 17h3"/></symbol>
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
        <button id="open-signup" class="button subtle" type="button" hidden>새 계정 만들기</button>
        <p id="login-policy-note" class="form-note">새 계정은 멤버 초대를 통해서만 만들 수 있습니다.</p>
      </form>
      <form id="signup-form" class="auth-card" hidden>
        <div class="login-brand"><svg class="workspace-note-logo" aria-hidden="true"><use href="#brand-workspace-note"/></svg><strong class="wordmark">JoripNote</strong></div>
        <h2>계정 만들기</h2>
        <p class="invite-summary">워크스페이스 관리자가 공개 회원가입을 허용했습니다.</p>
        <div id="signup-alert" class="alert" role="alert" hidden></div>
        <label>아이디<input name="username" autocomplete="username" minlength="3" maxlength="20" pattern="[A-Za-z0-9_]+" required></label>
        <label>비밀번호<input name="password" type="password" autocomplete="new-password" minlength="8" maxlength="72" required></label>
        <label>비밀번호 확인<input name="password_confirmation" type="password" autocomplete="new-password" minlength="8" maxlength="72" required></label>
        <button class="button primary" type="submit">가입하고 시작하기</button>
        <button id="back-to-login" class="button subtle" type="button">로그인으로 돌아가기</button>
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
          <span id="workspace-avatar" class="workspace-avatar">J</span><span><strong id="workspace-display-name">JoripNote</strong><small id="sidebar-role"></small></span>
        </button>
        <span class="workspace-header-actions">
          <button class="icon-button header-notification" data-view="notifications" type="button" aria-label="알림과 활동" data-tooltip="알림과 활동"><svg class="ui-icon" aria-hidden="true"><use href="#icon-bell"/></svg><span id="notification-badge" class="notification-badge" hidden></span></button>
          <button id="sidebar-collapse" class="icon-button desktop-only" type="button" aria-label="사이드바 축소" data-tooltip="사이드바 축소"><svg class="ui-icon" aria-hidden="true"><use href="#icon-chevron-left"/></svg></button>
          <button id="sidebar-close" class="icon-button mobile-only" type="button" aria-label="사이드바 닫기" data-tooltip="사이드바 닫기"><svg class="ui-icon" aria-hidden="true"><use href="#icon-close"/></svg></button>
        </span>
      </header>
      <nav class="main-nav sidebar-primary-nav" aria-label="공간 빠른 메뉴">
        <button data-view="search" type="button" aria-label="검색" data-tooltip="문서 검색"><span class="nav-icon"><svg class="ui-icon" aria-hidden="true"><use href="#icon-search"/></svg></span></button>
        <button data-view="recent" type="button" aria-label="최근 문서" data-tooltip="최근 문서"><span class="nav-icon"><svg class="ui-icon" aria-hidden="true"><use href="#icon-clock"/></svg></span></button>
        <button data-view="favorites" type="button" aria-label="즐겨찾기" data-tooltip="즐겨찾기"><span class="nav-icon"><svg class="star-icon" aria-hidden="true"><use href="#icon-star"/></svg></span></button>
        <button data-view="trash" type="button" aria-label="휴지통" data-tooltip="휴지통"><span class="nav-icon"><svg class="ui-icon" aria-hidden="true"><use href="#icon-trash"/></svg></span></button>
        <button data-view="templates" type="button" aria-label="문서 템플릿" data-tooltip="문서 템플릿"><span class="nav-icon"><svg class="ui-icon" aria-hidden="true"><use href="#icon-template"/></svg></span></button>
        <button data-view="members" type="button" aria-label="멤버 관리" data-tooltip="멤버 관리"><span class="nav-icon"><svg class="ui-icon" aria-hidden="true"><use href="#icon-users"/></svg></span></button>
        <button data-view="settings" type="button" aria-label="설정" data-tooltip="설정"><span class="nav-icon"><svg class="ui-icon" aria-hidden="true"><use href="#icon-settings"/></svg></span></button>
      </nav>
      <div class="sidebar-document-scroll">
        <div class="tree-heading shared-space-only"><span class="nav-label">공용 문서</span><button class="sidebar-section-add" data-create-document="root" type="button" aria-label="공용 문서에 페이지 추가" data-tooltip="공용 문서에 페이지 추가"><svg class="ui-icon" aria-hidden="true"><use href="#icon-plus"/></svg></button></div>
        <div class="sidebar-all-row shared-space-only"><button class="sidebar-all active shared-space-only" data-view="all" type="button" aria-label="모든 문서"><span class="sidebar-glyph workspace-glyph" aria-hidden="true">✣</span><span class="nav-label">모든 문서</span></button><button class="sidebar-section-add" data-create-document="root" type="button" aria-label="모든 문서에 페이지 추가" data-tooltip="페이지 추가"><svg class="ui-icon" aria-hidden="true"><use href="#icon-plus"/></svg></button></div>
        <div id="document-tree" class="document-tree teamspace-tree shared-space-only" aria-label="공용 문서"></div>
        <div class="tree-heading personal-heading"><span class="nav-label">내 문서</span><button class="sidebar-section-add" data-create-document="root" type="button" aria-label="내 문서에 페이지 추가" data-tooltip="내 문서에 페이지 추가"><svg class="ui-icon" aria-hidden="true"><use href="#icon-plus"/></svg></button></div>
        <div id="personal-tree" class="document-tree personal-tree" aria-label="내 문서"></div>
        <button id="new-root-document" class="sidebar-new-page" type="button"><svg class="ui-icon" aria-hidden="true"><use href="#icon-plus"/></svg><span class="nav-label">새 페이지 추가</span></button>
      </div>
      <footer class="profile-footer">
        <span id="profile-avatar" class="avatar"></span>
        <span class="profile-copy"><strong id="profile-name"></strong><small id="profile-role"></small></span>
        <button id="logout-button" class="icon-button" type="button" aria-label="로그아웃" data-tooltip="로그아웃"><svg class="ui-icon" aria-hidden="true"><use href="#icon-logout"/></svg></button>
      </footer>
    </aside>

    <section id="main-content" class="main-pane" tabindex="-1">
      <aside id="demo-banner" class="demo-banner" aria-label="데모 안내" hidden><strong>DEMO</strong><span>모든 기능을 자유롭게 체험하세요. 입력한 내용은 매일 00:00(KST)에 샘플 상태로 초기화됩니다.</span></aside>
      <header class="mobile-header">
        <button id="sidebar-open" class="icon-button" type="button" aria-label="사이드바 열기" data-tooltip="사이드바 열기"><svg class="ui-icon" aria-hidden="true"><use href="#icon-menu"/></svg></button>
        <strong id="mobile-workspace-name">JoripNote</strong>
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
        <article id="document-editor" class="document-editor" aria-label="문서 편집기">
          <div class="document-title-line"><span id="document-page-icon" class="document-page-icon" aria-hidden="true" hidden><svg class="document-page-icon-svg" aria-hidden="true"><use href="#icon-files"/></svg></span><textarea id="document-title" class="document-title" maxlength="160" rows="1" placeholder="제목 없음" aria-label="문서 제목"></textarea></div>
          <div id="readonly-notice" class="notice" hidden>Viewer 권한에서는 문서를 읽을 수만 있습니다.</div>
          <div id="block-editor" class="block-editor" role="group" aria-label="문서 본문 블록"></div>
          <button id="append-block" class="append-block" type="button"><svg class="ui-icon" aria-hidden="true"><use href="#icon-plus"/></svg><span>블록 추가</span></button>
        </article>
      </section>

      <section id="list-view" class="page-view">
        <header class="page-header">
          <div><p id="list-space-name" class="eyebrow">JoripNote</p><h1 id="list-title">모든 문서</h1><p id="list-description">이 공간의 최상위 문서입니다.</p></div>
          <button id="list-new-document" class="button primary compact" type="button">새 문서</button>
        </header>
        <form id="search-form" class="search-panel" hidden>
          <input id="search-input" type="search" maxlength="80" placeholder="문서 제목으로 검색" aria-label="문서 제목 검색">
          <button class="button primary compact" type="submit">검색</button>
        </form>
        <div id="list-controls" class="list-controls" hidden>
          <label class="list-filter-search"><svg class="ui-icon" aria-hidden="true"><use href="#icon-search"/></svg><input id="list-filter-query" type="search" maxlength="80" placeholder="문서 찾기" aria-label="모든 문서에서 검색"></label>
          <select id="list-kind-filter" class="list-filter-select" aria-label="문서 유형"><option value="all">모든 유형</option><option value="document">일반 문서</option><option value="database">데이터베이스</option><option value="imported">가져온 문서</option></select>
          <select id="list-sort" class="list-filter-select" aria-label="문서 정렬"><option value="updated_desc">최근 수정순</option><option value="updated_asc">오래된 수정순</option><option value="title_asc">이름순</option><option value="created_desc">최근 생성순</option></select>
          <div class="list-layout-switch" role="group" aria-label="문서 보기 방식">
            <button type="button" data-list-layout="list" aria-label="목록 보기" data-tooltip="목록"><svg class="ui-icon" aria-hidden="true"><use href="#icon-list"/></svg></button>
            <button type="button" data-list-layout="grid" aria-label="그리드 보기" data-tooltip="그리드"><svg class="ui-icon" aria-hidden="true"><use href="#icon-grid"/></svg></button>
            <button type="button" data-list-layout="preview" aria-label="미리보기" data-tooltip="미리보기"><svg class="ui-icon" aria-hidden="true"><use href="#icon-preview"/></svg></button>
          </div>
        </div>
        <div id="list-alert" class="alert" role="alert" hidden></div>
        <div id="document-list" class="document-list"></div>
        <button id="load-more-documents" class="button subtle load-more" type="button" hidden>더 보기</button>
      </section>

      <section id="members-view" class="page-view" hidden>
        <header class="page-header">
          <div><p class="eyebrow">SPACE</p><h1>멤버 관리</h1><p>역할과 대기 중인 초대를 관리합니다.</p></div>
          <button id="open-invite" class="button primary compact" type="button">멤버 초대</button>
        </header>
        <div id="members-permission" class="notice" hidden>멤버 관리 권한이 없습니다.</div>
        <section class="panel">
          <div class="section-title"><h2>멤버</h2><span id="member-count"></span></div>
          <div id="member-list" class="member-list"></div>
          <button id="load-more-members" class="button subtle load-more" type="button" hidden>멤버 더 보기</button>
        </section>
        <section class="panel">
          <div class="section-title"><div><h2>Notion 원본 멤버</h2><p class="muted">Notion 사용자 정보이며 JoripNote 로그인 계정과는 별개입니다.</p></div><span id="notion-member-count"></span></div>
          <div id="notion-member-list" class="member-list"></div>
        </section>
        <section class="panel">
          <div class="section-title"><h2>대기 중인 초대</h2><span id="invite-count"></span></div>
          <div id="invite-list" class="member-list"></div>
          <button id="load-more-invites" class="button subtle load-more" type="button" hidden>초대 더 보기</button>
        </section>
      </section>

      <section id="settings-view" class="page-view settings-page" hidden>
        <header class="page-header settings-header"><div><p class="eyebrow">SPACE</p><h1>설정</h1></div></header>
        <form id="workspace-settings-form" class="settings-grid">
          <section id="space-profile-form" class="settings-card policy-card space-profile-card owner-setting">
            <header><div><h2>공간 구성</h2><p>사용 방식과 사이드바 구조를 선택합니다.</p></div><span class="owner-only-badge">Owner 전용</span></header>
            <label class="setting-select"><span><strong>공간 이름</strong><small>사이드바와 문서 상단에 표시됩니다.</small></span><input id="space-name" type="text" minlength="1" maxlength="40" autocomplete="off" placeholder="내 문서 공간"></label>
            <label class="setting-select"><span><strong>사용 방식</strong><small>개인 공간은 문서를 한 목록에, 팀 공간은 공용 문서와 내 문서를 나눠 표시합니다.</small></span><select id="space-mode"><option value="personal">개인 공간</option><option value="team">팀 공간</option></select></label>
          </section>
          <div id="agent-import-controls" hidden aria-hidden="true">
            <span id="notion-import-progress" role="status" aria-live="polite"></span>
            <label id="notion-import-button"><input id="notion-import-input" type="file" accept=".md,text/markdown,text/plain" hidden></label>
            <label id="notion-zip-import-button"><span id="notion-zip-import-label"></span><input id="notion-zip-import-input" type="file" accept=".zip,application/zip" hidden></label>
            <button id="notion-api-import-button" type="button" hidden tabindex="-1"></button>
            <button id="notion-remigrate-button" type="button" hidden tabindex="-1"></button>
            <label><input id="notion-import-repair" type="checkbox"></label>
          </div>
          <div class="settings-card document-width-card">
            <div><h2>문서 너비</h2><p>집중해서 읽거나, 넓은 화면을 모두 활용할 수 있습니다.</p></div>
            <div class="width-options" role="radiogroup" aria-label="문서 보기 너비">
              <button type="button" data-document-width="narrow" role="radio" aria-checked="false"><span class="width-preview narrow" aria-hidden="true"></span><strong>좁게</strong></button>
              <button type="button" data-document-width="default" role="radio" aria-checked="true"><span class="width-preview default" aria-hidden="true"></span><strong>기본</strong></button>
              <button type="button" data-document-width="full" role="radio" aria-checked="false"><span class="width-preview full" aria-hidden="true"></span><strong>전체 화면</strong></button>
            </div>
          </div>
          <section id="workspace-access-form" class="settings-card policy-card owner-setting">
            <header><div><h2>가입 정책</h2><p>초대 없이 새 계정을 만들 수 있는지 정합니다.</p></div><span class="owner-only-badge">Owner 전용</span></header>
            <label class="setting-toggle"><span><strong>공개 회원가입</strong><small>로그인 화면에 회원가입 버튼을 표시합니다.</small></span><input id="public-signup-enabled" type="checkbox" role="switch"></label>
            <label class="setting-select"><span><strong>신규 회원 기본 역할</strong><small>Member는 문서 작성, Viewer는 읽기만 가능합니다.</small></span><select id="public-signup-role"><option value="member">Member</option><option value="viewer">Viewer</option></select></label>
          </section>
          <section id="ip-access-form" class="settings-card policy-card owner-setting">
            <header><div><h2>IP 접근 제한</h2><p>등록한 IP에서만 로그인하고 내부 문서에 접근하도록 제한합니다.</p></div><span class="owner-only-badge">Owner 전용</span></header>
            <div class="current-ip"><span>현재 접속 IP <strong id="current-request-ip">확인 중</strong></span><button id="add-current-ip" class="button subtle compact" type="button">현재 IP 추가</button></div>
            <label class="setting-toggle"><span><strong>허용목록 사용</strong><small>공개 문서 링크에는 적용하지 않습니다.</small></span><input id="ip-allowlist-enabled" type="checkbox" role="switch"></label>
            <label class="ip-list-label"><span><strong>허용할 IP</strong><small>IP 주소를 입력한 뒤 Enter 또는 쉼표로 추가하세요. 최대 50개까지 등록할 수 있습니다.</small></span><div id="ip-tag-editor" class="ip-tag-editor"><div id="ip-tags" class="ip-tags" aria-live="polite"></div><input id="ip-allowlist-input" class="ip-tag-input" type="text" maxlength="2500" autocomplete="off" placeholder="203.0.113.10 입력"></div><input id="ip-allowlist" type="hidden"></label>
            <p class="ip-input-hint"><span>등록된 IP는 태그로 표시됩니다. Backspace로 마지막 태그를 삭제할 수도 있습니다.</span><strong id="ip-count">0/50</strong></p>
            <p class="security-warning">현재 접속 IP가 목록에 없으면 제한을 켤 수 없습니다.</p>
          </section>
          <footer class="settings-save-bar"><span id="settings-save-note" role="status"></span><button id="settings-save-button" class="button primary compact" type="submit">변경사항 저장</button></footer>
        </form>
      </section>

      <section id="notifications-view" class="page-view" hidden>
        <header class="page-header"><div><p class="eyebrow">SPACE</p><h1>알림과 활동</h1><p>나를 부른 댓글과 공간 변경 사항을 확인합니다.</p></div><button id="mark-notifications-read" class="button subtle compact" type="button">모두 읽음</button></header>
        <div class="two-column-feed"><section class="panel"><div class="section-title"><h2>내 알림</h2></div><div id="notification-list" class="feed-list"></div></section><section class="panel"><div class="section-title"><h2>최근 활동</h2></div><div id="activity-list" class="feed-list"></div></section></div>
      </section>

      <section id="templates-view" class="page-view" hidden>
        <header class="page-header"><div><p class="eyebrow">SPACE</p><h1>문서 템플릿</h1><p>반복해서 쓰는 문서를 한 번에 시작합니다.</p></div><button id="new-template-button" class="button primary compact" type="button">현재 문서를 템플릿으로</button></header>
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
  <div id="tree-menu" class="block-menu tree-context-menu" role="menu" aria-label="문서 메뉴" hidden></div>
  <div id="url-paste-menu" class="url-paste-menu" role="menu" aria-label="URL 붙여넣기 방식 선택" hidden></div>
  <div id="inline-toolbar" class="inline-toolbar" role="toolbar" aria-label="인라인 서식" hidden>
    <button type="button" data-inline-command="bold" aria-label="굵게" data-tooltip="굵게 (Ctrl+B)"><strong>B</strong></button>
    <button type="button" data-inline-command="italic" aria-label="기울임" data-tooltip="기울임 (Ctrl+I)"><em>I</em></button>
    <button type="button" data-inline-command="underline" aria-label="밑줄" data-tooltip="밑줄 (Ctrl+U)"><u>U</u></button>
    <button type="button" data-inline-command="strikeThrough" aria-label="취소선" data-tooltip="취소선"><s>S</s></button>
    <button type="button" data-inline-command="inlineCode" aria-label="인라인 코드" data-tooltip="인라인 코드">&lt;/&gt;</button>
    <button type="button" data-inline-command="createLink" aria-label="링크" data-tooltip="링크 추가"><svg class="ui-icon" aria-hidden="true"><use href="#icon-link"/></svg></button>
  </div>
  <script src="/app.js?v=20260922-joripnote-57" defer></script>
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
.document-tree>.empty-state{padding:14px 8px 18px;color:#9a9993;font-size:11px;line-height:1.45;text-align:center}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
@media(forced-colors:active){:where(button,input,textarea,select,[contenteditable="true"],a,[tabindex]):focus-visible{outline:2px solid CanvasText}.ui-icon,.star-icon{forced-color-adjust:auto}}
.boot-shell{display:flex;align-items:center;justify-content:center;gap:10px;min-height:100vh;color:var(--muted);font-size:13px}.boot-spinner{width:16px;height:16px;border:2px solid #deded9;border-top-color:#565650;border-radius:50%;animation:boot-spin .75s linear infinite}@keyframes boot-spin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.boot-spinner{animation-duration:1.8s}}
:root{font-family:"SUIT Variable",SUIT,system-ui,-apple-system,sans-serif}.auth-copy h1,.workspace-avatar,.document-title,.slash-icon{font-family:"SUIT Variable",SUIT,system-ui,-apple-system,sans-serif}
.icon-sprite{position:absolute;width:0;height:0;overflow:hidden}.ui-icon,.star-icon{display:block;width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.auth-shell{grid-template-columns:1fr;place-items:center;background:#f7f7f5}.auth-panel{width:100%;padding:24px}.auth-card{gap:14px;padding:32px;border:1px solid var(--line);border-radius:14px;background:#fff;box-shadow:0 18px 55px rgba(30,30,28,.08)}.login-brand{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;margin-bottom:14px;text-align:center}.workspace-note-logo{display:block;width:56px;height:56px}.wordmark{font-size:25px}.auth-card h2{margin:8px 0 4px;font-size:25px}.auth-card input{height:42px}.auth-card .button{min-height:42px}.button{min-height:36px;padding:0 14px;font-size:13px}.button.compact{min-height:34px;padding:0 12px}.icon-button{width:30px;height:30px;font-size:16px}.toolbar-actions .button{min-height:32px;padding:0 11px;font-size:12px}[data-tooltip]{position:relative}[data-tooltip]::after{position:absolute;z-index:250;top:calc(100% + 7px);left:50%;display:none;max-width:190px;padding:6px 8px;border-radius:6px;background:#292926;color:#fff;content:attr(data-tooltip);font-size:11px;font-weight:600;line-height:1.2;white-space:nowrap;pointer-events:none;transform:translateX(-50%)}[data-tooltip]:hover::after,[data-tooltip]:focus-visible::after{display:block}.sidebar [data-tooltip]::after{top:50%;left:calc(100% + 8px);transform:translateY(-50%)}
.sidebar{width:244px;transition:width .18s ease}.main-pane{margin-left:244px;transition:margin-left .18s ease}.main-nav button .nav-label{width:auto;min-width:0;flex:1;overflow:hidden;color:inherit;font-size:13px;text-align:left;text-overflow:ellipsis;white-space:nowrap}.nav-icon{display:grid;place-items:center;flex:none}.favorite-toggle{color:#77766f}.favorite-toggle:hover{color:#484741}.favorite-toggle.active{color:#b7791f}.favorite-toggle.active .star-icon{fill:currentColor;stroke-width:1.4}.card-actions .favorite-toggle{display:grid;place-items:center;width:34px;padding:0}.document-title:not(:read-only),.block-content[contenteditable="true"]{cursor:text}.document-title:read-only,.block-content[contenteditable="false"]{cursor:default}.tree-toggle .ui-icon,.tree-add .ui-icon{width:14px;height:14px}.tree-toggle .ui-icon{transition:transform .15s}.tree-toggle.expanded .ui-icon{transform:rotate(90deg)}.block-handle .ui-icon{width:16px;height:16px}.block-handle:active{cursor:grabbing}.block-row.dragging{opacity:.38}.block-row.drop-before::before,.block-row.drop-after::after{position:absolute;right:0;left:24px;height:2px;border-radius:2px;background:#4b7bec;content:""}.block-row.drop-before::before{top:-2px}.block-row.drop-after::after{bottom:-2px}.toggle-wrap{min-width:0}.toggle-summary{display:grid;grid-template-columns:22px minmax(0,1fr);align-items:start}.toggle-caret{display:grid;place-items:center;width:22px;height:30px;padding:0;border:0;background:transparent;color:#77766f}.toggle-caret .ui-icon{width:15px;height:15px;transition:transform .15s}.toggle-caret[aria-expanded="true"] .ui-icon{transform:rotate(90deg)}.toggle-body{margin:2px 0 5px 22px;padding:4px 10px;border-left:2px solid #e5e4df;color:#55544f}.document-tree{max-height:calc(100vh - 360px)}.document-editor{width:min(100% - 40px,900px);padding:48px 0 120px}.block-editor{margin-top:28px}.append-block{display:inline-flex;align-items:center;gap:5px}.append-block .ui-icon{width:14px;height:14px}.block-menu{position:fixed;z-index:70;display:grid;width:220px;padding:6px;border:1px solid var(--line);border-radius:9px;background:#fff;box-shadow:0 14px 44px rgba(0,0,0,.16)}.block-menu button{display:flex;align-items:center;gap:10px;width:100%;height:34px;padding:0 9px;border:0;border-radius:5px;background:#fff;color:#4f4e49;font-size:12px;text-align:left}.block-menu button:hover,.block-menu button:focus-visible{background:var(--hover);outline:none}.block-menu button.danger-text{color:var(--danger)}.block-menu .ui-icon{width:15px;height:15px}.block-menu-separator{height:1px;margin:5px;background:var(--line)}.page-view{width:min(100% - 40px,1080px);padding:28px 0 100px}.page-header{padding-bottom:20px}.empty-state{padding:44px 20px}.settings-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:24px}.settings-grid .settings-card{margin-top:0;min-height:126px}.import-card{justify-content:space-between}.import-card small{display:block;margin-top:10px;color:var(--muted);font-size:11px;line-height:1.55}.import-button{display:inline-flex;align-items:center;justify-content:center;flex:none;cursor:pointer}
.document-width-card{grid-column:1/-1;justify-content:space-between}.width-options{display:grid;grid-template-columns:repeat(3,112px);gap:8px}.width-options button{display:grid;gap:7px;justify-items:center;padding:10px 8px 8px;border:1px solid var(--line);border-radius:10px;background:#fff;color:#73726c;font-size:11px}.width-options button:hover{background:#f8f8f6}.width-options button.active{border-color:#6f8fbe;background:#f3f7fd;color:#255b9e;box-shadow:0 0 0 2px rgba(49,130,246,.08)}.width-preview{display:block;height:22px;border:1px solid currentColor;border-radius:3px;opacity:.7}.width-preview.narrow{width:20px}.width-preview.default{width:34px}.width-preview.full{width:48px}.app-shell.document-width-narrow .document-editor{width:min(100% - 40px,720px)}.app-shell.document-width-full .document-editor{width:min(100% - 72px,1440px)}
.policy-card{display:grid;align-content:start;gap:18px;min-height:0!important}.policy-card header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.policy-card header h2{margin:0}.policy-card header p{margin:6px 0 0;color:var(--muted);font-size:12px;line-height:1.5}.owner-only-badge{flex:none;padding:5px 8px;border-radius:999px;background:#f1f3f6;color:#69717d;font-size:10px;font-weight:800}.setting-toggle,.setting-select,.ip-list-label{display:flex;align-items:center;justify-content:space-between;gap:18px;padding-top:16px;border-top:1px solid var(--line)}.setting-toggle strong,.setting-toggle small,.setting-select strong,.setting-select small,.ip-list-label strong,.ip-list-label small{display:block}.setting-toggle strong,.setting-select strong,.ip-list-label strong{font-size:13px}.setting-toggle small,.setting-select small,.ip-list-label small{margin-top:4px;color:var(--muted);font-size:11px;line-height:1.45}.setting-toggle input{width:42px;height:24px;flex:none;accent-color:#3182f6}.setting-select select{height:38px;padding:0 30px 0 11px;border:1px solid var(--line);border-radius:8px;background:#fff}.ip-list-label{display:grid;align-items:stretch}.ip-tag-editor{display:flex;flex-wrap:wrap;align-items:center;gap:7px;min-height:48px;padding:8px 10px;border:1px solid var(--line);border-radius:9px;background:#fff;transition:border-color .15s,box-shadow .15s}.ip-tag-editor:focus-within{border-color:#3182f6;box-shadow:0 0 0 3px rgba(49,130,246,.1)}.ip-tags{display:flex;flex-wrap:wrap;gap:6px}.ip-tag{display:inline-flex;align-items:center;gap:4px;max-width:100%;padding:5px 7px 5px 9px;border-radius:999px;background:#eef2f8;color:#34425c;font:12px/1 "SFMono-Regular",Consolas,monospace}.ip-tag>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ip-tag button{display:grid;place-items:center;width:17px;height:17px;padding:0;border:0;border-radius:50%;background:transparent;color:#65718a;font-size:15px;line-height:1}.ip-tag button:hover{background:#d9e1ef;color:#27344d}.ip-tag-input{min-width:170px;flex:1;height:30px;padding:0 3px;border:0;outline:none;background:transparent;font-size:12px}.ip-tag-input::placeholder{color:#aaa}.ip-input-hint{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:-8px 0 0;color:var(--muted);font-size:11px;line-height:1.45}.ip-input-hint strong{flex:none;color:#69717d;font-size:10px}.current-ip{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:8px;background:#f6f7f9;color:#747982;font-size:11px}.current-ip strong{margin-left:5px;color:#30343a}.security-warning{margin:0;color:#9b6a20!important;font-size:11px!important}.policy-save{justify-self:end}
.settings-page{width:min(100% - 40px,880px);padding:32px 0 96px}.settings-page .settings-header{padding-bottom:18px}.settings-page .settings-grid{grid-template-columns:minmax(0,1fr);gap:0;margin-top:14px;overflow:hidden;border:1px solid var(--line);border-radius:12px;background:#fff}.settings-page .settings-card{width:100%;min-height:0;margin:0;padding:22px 24px;border:0;border-bottom:1px solid var(--line);border-radius:0}.settings-page .settings-card:last-child{border-bottom:0}.settings-page .settings-card h2{font-size:15px}.settings-page .document-width-card{grid-column:auto}.settings-page .policy-card{gap:16px}.import-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}
.import-repair-toggle{display:flex;align-items:center;gap:8px;width:100%;margin-top:4px;padding:9px 10px;border:1px solid #e3e4e8;border-radius:8px;background:#fafbfc;color:#495061;cursor:pointer}.import-repair-toggle input{accent-color:#59647f}.import-repair-toggle span{display:grid;gap:2px}.import-repair-toggle strong{font-size:11px}.import-repair-toggle small{margin:0;color:#858a96;font-size:10px;line-height:1.35}
@media(min-width:761px){.app-shell.document-width-narrow .settings-page{width:min(100% - 40px,720px)}.app-shell.document-width-default .settings-page{width:min(100% - 40px,900px)}.app-shell.document-width-full .settings-page{width:min(100% - 72px,1440px)}}
@media(max-width:760px){.settings-page{width:calc(100% - 24px);padding:18px 0 72px}.settings-page .settings-header{padding-bottom:14px}.settings-page .settings-grid{margin-top:10px;border-radius:10px}.settings-page .settings-card{padding:18px 16px}.settings-page .import-card,.settings-page .document-width-card{display:grid}.settings-page .width-options{grid-template-columns:repeat(3,minmax(0,1fr));width:100%}.settings-page .setting-select{align-items:stretch;flex-direction:column}.settings-page .setting-select select{width:100%}.settings-page .policy-card header{gap:10px}}
.block-menu{max-height:min(70vh,460px);overflow:auto}.block-menu button{flex:none}.block-menu-separator{flex:none}
.slash-category{padding:10px 8px 5px;color:var(--muted);font-size:10px;font-weight:800}.public-shell{min-height:100vh;background:#fff}.public-header{display:flex;align-items:center;justify-content:space-between;height:58px;padding:0 24px;border-bottom:1px solid var(--line);color:var(--muted);font-size:12px}.public-brand{display:flex;align-items:center;gap:9px;color:var(--ink);text-decoration:none}.public-brand .workspace-note-logo{width:30px;height:30px}.public-title{margin:0;font-size:44px;line-height:1.2;letter-spacing:-.045em}.public-document{padding-top:68px}.public-block-editor .block-row{grid-template-columns:minmax(0,1fr);margin-left:0}.public-block-editor .block-handle{display:none}.block-content[data-type=heading4]{font-size:16px;font-weight:800;line-height:1.55}.callout-wrap{display:grid;grid-template-columns:24px minmax(0,1fr);gap:8px;padding:12px 14px;border:1px solid #e5e4df;border-radius:7px;background:#f7f7f5}.callout-wrap>.ui-icon{margin-top:5px;color:#6f6e68}.structured-block{min-width:0;padding:4px 0}.structured-block .block-content{width:100%}.block-table{width:100%;border-collapse:collapse;table-layout:fixed}.block-table td,.block-table th{min-width:100px;height:38px;padding:0;border:1px solid #deddd8}.block-table input{width:100%;height:37px;padding:0 10px;border:0;background:transparent;outline:none}.block-table thead{background:#f7f7f5;font-weight:700}.block-table-actions{display:flex;gap:6px;margin-top:7px}.block-table-actions button{height:28px;padding:0 9px;border:0;border-radius:5px;background:#f2f2ef;color:#696862;font-size:11px}.database-block{padding:12px;border:1px solid var(--line);border-radius:8px}.database-label{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;font-size:12px;font-weight:800}.media-block{display:grid;gap:8px}.media-url{width:100%;height:36px;padding:0 10px;border:1px solid var(--line);border-radius:6px;background:#fff;outline:none}.media-preview{display:grid;place-items:center;min-height:54px;overflow:hidden;border:1px solid var(--line);border-radius:8px;background:#fafaf8;color:var(--muted);font-size:12px}.media-preview img,.media-preview video{display:block;max-width:100%;max-height:520px}.media-preview audio{width:min(100%,520px);margin:16px}.media-preview iframe{width:100%;height:420px;border:0}.media-preview a{display:flex;align-items:center;gap:8px;width:100%;padding:16px;color:var(--ink);text-decoration:none}.toc-block{padding:10px 14px;border-left:2px solid #dddcd7}.toc-block strong{display:block;margin-bottom:7px;font-size:12px}.toc-block a{display:block;padding:3px 0;color:#696862;font-size:12px;text-decoration:none}.math-block{padding:13px;border-radius:7px;background:#f7f7f5;text-align:center}.math-block .block-content{font-family:"SFMono-Regular",Consolas,monospace}.inline-toolbar{position:fixed;z-index:90;display:flex;padding:4px;border-radius:7px;background:#2f2f2c;box-shadow:0 8px 30px rgba(0,0,0,.22)}.inline-toolbar button{display:grid;place-items:center;min-width:30px;height:30px;padding:0 7px;border:0;border-radius:4px;background:transparent;color:#fff;font-size:12px}.inline-toolbar button:hover{background:#4b4b47}.inline-toolbar .ui-icon{width:15px;height:15px}.block-content a{color:#2563a8;text-decoration:underline;text-underline-offset:2px}.block-content code{padding:1px 4px;border-radius:4px;background:#efefec;color:#c33;font-family:"SFMono-Regular",Consolas,monospace;font-size:.9em}.search-dialog{width:min(92vw,660px);padding:0;border-radius:12px}.global-search-card{background:#fff}.global-search-card>header{display:grid;grid-template-columns:22px minmax(0,1fr) auto;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line)}.global-search-card input{height:38px;border:0;outline:none;font-size:16px}.global-search-card kbd{padding:3px 6px;border:1px solid var(--line);border-radius:5px;background:#f7f7f5;color:var(--muted);font-size:10px}.global-search-results{max-height:min(58vh,480px);overflow:auto;padding:7px}.global-search-item{display:grid;gap:3px;width:100%;padding:10px 11px;border:0;border-radius:6px;background:#fff;text-align:left}.global-search-item:hover,.global-search-item.active{background:var(--hover)}.global-search-item strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}.global-search-item small{color:var(--muted);font-size:10px}.global-search-empty{padding:44px 20px;color:var(--muted);font-size:13px;text-align:center}.global-search-card>footer{display:flex;gap:14px;padding:8px 14px;border-top:1px solid var(--line);color:var(--muted);font-size:10px}.publish-card{width:min(92vw,480px)}.publication-row{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:14px;border:1px solid var(--line);border-radius:8px}.publication-row strong,.publication-row small{display:block}.publication-row small{margin-top:4px;color:var(--muted);font-size:11px}.link-dialog-card{width:min(92vw,460px)}.link-dialog-actions{display:flex;justify-content:flex-end;gap:8px}.link-dialog-actions .button{min-width:82px}
@media(min-width:761px){.app-shell.sidebar-collapsed .sidebar{width:68px}.app-shell.sidebar-collapsed .main-pane{margin-left:68px}.app-shell.sidebar-collapsed .workspace-header{justify-content:center;padding-inline:8px}.app-shell.sidebar-collapsed #workspace-home,.app-shell.sidebar-collapsed .nav-label,.app-shell.sidebar-collapsed .sidebar-document-scroll,.app-shell.sidebar-collapsed .profile-footer .avatar,.app-shell.sidebar-collapsed .profile-copy{display:none}.app-shell.sidebar-collapsed .main-nav{padding-inline:8px}.app-shell.sidebar-collapsed .main-nav button{justify-content:center;padding:0}.app-shell.sidebar-collapsed .main-nav button>span:first-child{width:24px}.app-shell.sidebar-collapsed .tree-heading{justify-content:center;padding:14px 8px 6px}.app-shell.sidebar-collapsed .profile-footer{justify-content:center;padding-inline:8px}}
@media(max-width:900px){.settings-grid{grid-template-columns:1fr}.document-width-card{grid-column:auto}.width-options{grid-template-columns:repeat(3,minmax(82px,1fr));width:100%}}@media(max-width:760px){.desktop-only{display:none!important}.sidebar{width:264px}.main-pane{margin-left:0}.document-editor,.app-shell.document-width-narrow .document-editor,.app-shell.document-width-full .document-editor{width:calc(100% - 28px);padding:34px 0 90px}.page-view{width:calc(100% - 24px);padding:20px 0 80px}.settings-grid{margin-top:16px}.settings-card{align-items:flex-start}.import-card,.document-width-card{display:grid}.import-button{width:100%}.width-options{grid-template-columns:repeat(3,1fr)}.setting-toggle,.setting-select{width:100%}.policy-save{width:100%;justify-self:stretch}.button{min-height:40px}.icon-button{width:38px;height:38px}}
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
.db-board{gap:12px;padding:12px;background:#fff}
.db-board-column{width:260px;min-width:260px;padding:8px;border:0;background:#f5f5f4}
.db-board-column[data-tone=blue]{background:#f2f6fa}.db-board-column[data-tone=yellow]{background:#fbf8ee}.db-board-column[data-tone=green]{background:#f2f7f4}.db-board-column[data-tone=red]{background:#faf3f2}
.db-board-heading>span:first-child{display:inline-flex;align-items:center;padding:3px 7px;border-radius:4px;background:#e7e7e5;font-weight:650}.db-board-column[data-tone=blue] .db-board-heading>span:first-child{background:#dbe9f3}.db-board-column[data-tone=yellow] .db-board-heading>span:first-child{background:#f2e6bd}.db-board-column[data-tone=green] .db-board-heading>span:first-child{background:#dceadf}.db-board-column[data-tone=red] .db-board-heading>span:first-child{background:#efdedc}
.db-card{position:relative;gap:8px;padding:10px 10px 8px;border-color:#deddd9;border-radius:6px;box-shadow:0 1px 2px rgba(28,27,24,.06);cursor:pointer}
.db-card:hover{border-color:#c9c8c3;background:#fff}.db-card-title-row{display:grid;grid-template-columns:20px minmax(0,1fr);align-items:start;gap:5px;padding-right:23px}.db-card-page-icon{display:grid;place-items:center;width:20px;height:25px;padding:0;border:0;border-radius:4px;background:transparent;color:#898984}.db-card-page-icon:hover{background:#efefed;color:#4f4e49}.db-card-page-icon .ui-icon{width:14px;height:14px}.db-card-title{min-height:25px;padding:2px 0;line-height:1.5}
.db-card-meta:empty{display:none}.db-card-field{display:flex;align-items:center;gap:6px;min-height:20px;color:#74736e;font-size:10px}.db-card-field .ui-icon{width:13px;height:13px;flex:none}.db-card-value{min-width:0;overflow:hidden;color:#5e5d58;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.db-card-value.is-tag{padding:2px 6px;border-radius:4px;background:#eeeeda}.db-card-value.is-person{display:inline-flex;align-items:center;gap:5px}.db-card-avatar{display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:#e7e4df;color:#5f5c57;font-size:9px;font-weight:750}.db-card-footer{position:absolute;top:6px;right:6px;z-index:2;opacity:0;pointer-events:none;transition:opacity .12s}.db-card-footer .db-mini-button{border:1px solid #deddd9;background:#fff;box-shadow:0 1px 2px rgba(28,27,24,.08)}.db-card:hover .db-card-footer,.db-card:focus-within .db-card-footer{opacity:1;pointer-events:auto}
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
.sidebar-section-add{display:grid;place-items:center;width:30px;height:30px;margin:-4px -4px 0 8px;padding:0;border:0;border-radius:7px;background:transparent;color:#8b8a84}
.sidebar-section-add:hover,.sidebar-section-add:focus-visible{background:#e9f2ff;color:#1b64da}
.sidebar-section-add .ui-icon{width:16px;height:16px}
.sidebar-all-row{display:flex;align-items:center;width:calc(100% - 20px);height:34px;margin:1px 10px;border-radius:7px}
.sidebar-all-row .sidebar-all{width:auto;flex:1;margin:0}
.sidebar-all-row .sidebar-section-add{flex:none;margin:0 2px 0 0}
.document-tree{min-height:0;max-height:none;flex:1 1 auto;padding:0 10px 14px;scrollbar-gutter:stable}
.tree-row{position:relative;height:32px;margin:1px 0;padding-right:3px;border-radius:7px}
.tree-toggle{position:absolute;top:2px;right:0;display:grid;place-items:center;width:27px;height:27px;padding:0;border:0;border-radius:6px;background:transparent;color:#85847e}
.tree-row.has-children .tree-title{padding-right:36px}
.tree-title{height:30px;padding:0 8px 0 10px;line-height:30px}
.tree-row.has-children:hover .tree-title,.tree-row.has-children:focus-within .tree-title{padding-right:36px}
.tree-children{margin-left:13px;padding-left:4px;border-left:1px solid #e4e4e0}
.sidebar-document-scroll{min-height:0;flex:1 1 auto;overflow-y:auto;padding-bottom:12px;scrollbar-gutter:stable}
.sidebar-document-scroll .document-tree{min-height:0;max-height:none;overflow:visible;padding-bottom:0;scrollbar-gutter:auto}
.sidebar-all,.sidebar-new-page{display:flex;align-items:center;gap:8px;width:calc(100% - 20px);height:32px;margin:1px 10px;padding:0 9px;border:0;border-radius:7px;background:transparent;color:#5d5c57;font-size:13px;text-align:left}
.sidebar-all:hover,.sidebar-all.active,.sidebar-new-page:hover{background:#eaeae6;color:#222}
.sidebar-glyph{display:grid;place-items:center;width:18px;min-width:18px;height:20px;font-size:15px;line-height:1}
.sidebar-glyph .sidebar-doc-icon{display:block;width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.65;stroke-linecap:round;stroke-linejoin:round}
.tree-row .sidebar-glyph{color:#77766f}
.tree-row.active .sidebar-glyph,.tree-row:hover .sidebar-glyph{color:#50504c}
.workspace-glyph{color:#2383e2;font-size:18px;font-weight:800}
.tree-row .sidebar-glyph{margin-left:8px;margin-right:2px}
.tree-row.has-children .tree-title{padding-left:4px}
.tree-title{padding-left:4px}
.personal-heading{margin-top:12px}
.sidebar-new-page{color:#8b8a84}
.sidebar-new-page .ui-icon{width:15px;height:15px;margin-left:1px}
.teamspace-tree:empty::after{display:block;padding:5px 10px;color:#aaa9a3;content:"공용 문서가 없습니다";font-size:11px}
.personal-tree:empty{display:none}
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
.setup-shell{display:grid;grid-template-columns:minmax(0,580px) minmax(0,500px);justify-content:center;min-height:100vh;background:linear-gradient(90deg,#f5f6f8 0 calc(50% + 40px),#fff calc(50% + 40px))}
.setup-intro{display:flex;flex-direction:column;padding:clamp(36px,4vw,56px) 40px;background:transparent}
.setup-brand{display:flex;align-items:center;gap:11px;font-size:18px;letter-spacing:-.03em}.setup-brand .workspace-note-logo{width:34px;height:34px}
.setup-copy{max-width:500px;margin:auto 0}.setup-step{display:inline-flex;padding:7px 11px;border-radius:999px;background:#e7f0ff;color:#1769d2;font-size:12px;font-weight:800}.setup-copy h1{margin:22px 0 18px;font-size:clamp(42px,4.25vw,62px);line-height:1.08;letter-spacing:-.055em}.setup-copy p{max-width:500px;margin:0;color:#666c76;font-size:16px;line-height:1.75}
.setup-benefits{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:48px 0 0;padding:0;list-style:none}.setup-benefits li{display:flex;align-items:center;gap:10px}.setup-benefits li>span{display:grid;place-items:center;width:30px;height:30px;flex:none;border-radius:10px;background:#fff;color:#2878db;font-size:12px;font-weight:900}.setup-benefits strong,.setup-benefits small{display:block}.setup-benefits strong{font-size:12px}.setup-benefits small{margin-top:3px;color:#8a8f98;font-size:10px}
.setup-panel{display:grid;place-items:center;padding:44px 40px}.setup-card{display:grid;gap:19px;width:min(100%,420px)}.setup-progress{display:flex;gap:6px;margin-bottom:18px}.setup-progress span{width:32px;height:4px;border-radius:99px;background:#e8e9ec}.setup-progress .active{width:54px;background:#3182f6}.setup-card header h2{margin:0;font-size:30px;letter-spacing:-.045em}.setup-card header>p:last-child{margin:9px 0 0;color:#7b8089;font-size:13px}.setup-card label{display:grid;gap:8px;color:#44484f;font-size:13px;font-weight:750}.setup-card input{width:100%;height:52px;padding:0 15px;border:1px solid #dfe1e5;border-radius:12px;background:#fff;outline:none;transition:border-color .15s,box-shadow .15s}.setup-card input:focus{border-color:#3182f6;box-shadow:0 0 0 4px rgba(49,130,246,.11)}.setup-submit{display:flex;align-items:center;justify-content:space-between;min-height:54px;margin-top:5px;padding-inline:18px;border-radius:12px;background:#3182f6}.setup-submit:hover{background:#1b64da}.setup-security{margin:0;color:#92969d;font-size:11px;text-align:center}
.card-actions .icon-button{width:34px;height:34px}.card-actions .list-trash{color:#8d5555}.card-actions .list-trash:hover{background:#fff0f0;color:#ba3434}
@media(max-width:1050px) and (min-width:761px){.template-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:900px){.setup-shell{grid-template-columns:1fr;background:#fff}.setup-intro{min-height:auto;padding:32px 28px;background:#f5f6f8}.setup-copy{margin:56px 0 20px}.setup-copy h1{font-size:42px}.setup-benefits{display:none}.setup-panel{padding:48px 24px}}
@media(max-width:760px){:root{--sidebar-width:264px}.sidebar{width:var(--sidebar-width)}.main-pane{margin-left:0}.page-view{width:calc(100% - 32px);padding:28px 0 88px}.page-header{flex-direction:column;align-items:stretch;gap:18px;padding-bottom:22px}.page-header h1{font-size:30px}.page-header>.button{align-self:flex-start}.template-grid{grid-template-columns:1fr;gap:12px;margin-top:20px}.template-card{min-height:0;padding:20px}.setup-intro{padding:24px 20px}.setup-copy{margin:38px 0 4px}.setup-copy h1{font-size:34px}.setup-copy p{font-size:14px}.setup-panel{align-items:start;padding:36px 20px}.setup-card header h2{font-size:27px}}
.db-filter-value{width:170px;min-width:140px;flex:0 1 170px;padding:0 10px}.db-toolbar>.db-select[aria-label="필터 속성"],.db-toolbar>.db-select[aria-label="필터 조건"]{min-width:108px}@media(max-width:760px){.db-filter-value{width:auto;min-width:0;flex:1}.db-toolbar>.db-select[aria-label="필터 속성"],.db-toolbar>.db-select[aria-label="필터 조건"]{min-width:0}}
.database-block{min-width:0;max-width:100%;overflow:hidden}.database-block .db-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;max-width:100%;overflow:visible}.database-block .db-viewbar{display:flex;max-width:100%;overflow-x:auto;overscroll-behavior-x:contain}.database-block .db-board{width:100%;min-width:0;max-width:100%;overflow-x:auto;overscroll-behavior-x:contain}.database-block .db-board-column{flex:0 0 clamp(220px,28vw,300px);min-width:0}.database-block .db-card{min-width:0;max-width:100%}.database-block .db-card-title{min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.database-block .db-card-value{min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.database-block .db-card-meta{min-width:0}.database-block .db-board-more{width:100%;padding:8px;border:1px dashed var(--line);border-radius:6px;background:#fff;color:var(--muted);font-size:11px}.db-calendar{min-width:0;overflow-x:auto}.db-calendar-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;min-width:700px;min-height:58px;margin:0;padding:14px 12px 12px;border-bottom:1px solid var(--line)}.db-calendar-heading strong{font-size:16px;line-height:1.4}.db-calendar-controls{display:flex;gap:6px}.db-calendar-weekdays{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));min-width:700px;border-left:1px solid var(--line)}.db-calendar-weekday{padding:9px 8px;border-right:1px solid var(--line);border-bottom:1px solid var(--line);color:var(--muted);font-size:11px;text-align:center}.db-calendar-weeks{min-width:700px;border-left:1px solid var(--line)}.db-calendar-week{position:relative;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));grid-auto-rows:27px;min-height:128px;border-bottom:1px solid var(--line)}.db-calendar-day{display:flex;flex-direction:column;gap:3px;min-height:92px;padding:7px 8px;border-right:1px solid var(--line);border-bottom:1px solid var(--line);background:#fff}.db-calendar-week .db-calendar-day{grid-row:1/-1;min-width:0;min-height:128px;border-bottom:0}.db-calendar-day.outside{background:#fafaf8;color:#aaa}.db-calendar-day.today{background:#f7faff;box-shadow:none}.db-calendar-date{display:grid;place-items:center;align-self:flex-end;min-width:22px;height:22px;padding:0 5px;border-radius:999px;color:#777;font-size:11px;line-height:1}.db-calendar-day.today .db-calendar-date{background:#2f6feb;color:#fff;font-weight:700}.db-calendar-range,.db-calendar-undated-item{display:block;min-width:0;overflow:hidden;padding:4px 8px;border:0;border-radius:4px;background:#eef3fb;color:#285b9b;font-size:11px;text-align:left;text-overflow:ellipsis;white-space:nowrap}.db-calendar-range{z-index:2;align-self:center;height:23px;margin:2px 4px;line-height:15px;cursor:pointer}.db-calendar-range:hover,.db-calendar-undated-item:hover{background:#dfeafb}.db-calendar-range:focus-visible{outline:2px solid #2f6feb;outline-offset:1px}.db-calendar-range.continues-before{margin-left:0;border-radius:0 4px 4px 0}.db-calendar-range.continues-after{margin-right:0;border-radius:4px 0 0 4px}.db-calendar-range.continues-before.continues-after{border-radius:0}.db-calendar-undated{display:block;margin:12px 0 0;padding:11px 12px;border:1px dashed var(--line);border-radius:7px}.db-calendar-undated summary{cursor:pointer;color:var(--muted);font-size:11px;font-weight:700}.db-calendar-undated-list{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}.db-calendar-undated-item{background:#f7f7f5;color:var(--ink)}.notion-property-table .block-table thead,.notion-property-table .block-table-actions{display:none}.notion-property-table .block-table{border:0}.notion-property-table .block-table td{border:0;border-bottom:1px solid #f0f0ed}.notion-property-table .block-table td:first-child{width:150px;color:var(--muted)}.notion-property-table .block-table input{background:transparent}.notion-page-link .media-url{display:none}.notion-page-link .media-preview a{display:inline-flex;align-items:center;gap:6px;padding:4px 7px;border-radius:4px;background:#f7f7f5;color:var(--ink);text-decoration:none}.notion-page-link .media-preview a:hover{background:#efefec;text-decoration:underline}
@media(max-width:760px){.database-block{padding:8px}.database-block .db-toolbar>*{min-width:0;flex:1}.database-block .db-toolbar .db-search-wrap{flex-basis:100%}.db-calendar-heading,.db-calendar-weekdays,.db-calendar-weeks{min-width:660px}.db-calendar-week,.db-calendar-week .db-calendar-day{min-height:116px}.db-calendar-day{min-height:72px;padding:6px}.db-calendar-range{font-size:10px;padding:4px 6px}.database-block .db-board-column{flex-basis:78vw}}
/* Notion-fidelity database chrome */
.document-title-line{display:flex;align-items:flex-start;gap:10px;min-width:0}.document-page-icon{display:grid;place-items:center;width:42px;height:53px;flex:none;color:#696862;line-height:1}.document-page-icon-svg{display:block;width:30px;height:30px;fill:none;stroke:currentColor;stroke-width:1.45;stroke-linecap:round;stroke-linejoin:round}.document-title-line .document-title{min-width:0}.editor-view.database-page .document-editor{width:min(calc(100% - 72px),1800px);padding-top:44px}.editor-view.database-page .block-editor{margin-top:34px}.editor-view.database-page .block-row:has(.database-block){margin-left:0;grid-template-columns:minmax(0,1fr)}.editor-view.database-page .block-row:has(.database-block)>.block-handle{display:none}
.database-block{border:0;border-radius:0;box-shadow:none;overflow:visible;background:transparent}.db-chrome{display:flex;align-items:center;justify-content:space-between;gap:18px;min-width:0;border-bottom:1px solid #e9e9e7}.db-chrome .db-viewbar{min-width:0;flex:1 1 auto;padding:0;border:0}.db-view-tab{height:40px;padding:0 9px;border:0;border-radius:5px;color:#62615d;font-size:12px;font-weight:600}.db-view-tab:hover{background:#f1f1ef}.db-view-tab.active{border:0;background:#efefed;color:#272725}.db-chrome .db-toolbar{justify-content:flex-end;min-width:0;flex:0 1 auto;flex-wrap:nowrap;padding:4px 0;border:0;background:transparent}.db-chrome .db-search-wrap{min-width:34px;flex:0 1 150px}.db-chrome .db-search,.db-chrome .db-select,.db-chrome .db-control{height:30px;border-color:transparent;border-radius:5px;background:transparent}.db-chrome .db-search:hover,.db-chrome .db-search:focus,.db-chrome .db-select:hover,.db-chrome .db-select:focus,.db-chrome .db-control:hover,.db-chrome .db-control:focus-visible{border-color:#e2e2df;background:#f5f5f3}.db-chrome .db-search-wrap .ui-icon{top:8px}.db-chrome .db-search{padding-right:7px}.db-chrome .db-select{min-width:88px;max-width:118px;padding-left:8px}.db-chrome .db-filter-value{width:112px;min-width:82px}.db-header{padding-inline:0}.db-footer{padding-inline:0;background:transparent}
.db-calendar{overflow-x:auto}.db-calendar-heading{min-height:54px;padding:13px 8px 11px}.db-calendar-heading strong{font-size:15px}.db-calendar-controls{gap:2px}.db-calendar-controls .db-control{height:30px;min-width:30px;padding-inline:8px;border-color:#e5e5e2}.db-calendar-weekday{padding:7px 8px;background:#fff;font-size:10px}.db-calendar-week{grid-auto-rows:30px;min-height:138px}.db-calendar-week .db-calendar-day{min-height:138px;padding:6px 8px}.db-calendar-day.outside{background:#fbfbfa}.db-calendar-day.today{background:#fff}.db-calendar-day.today .db-calendar-date{background:#e95b54;color:#fff}.db-calendar-range{display:flex;align-items:center;gap:6px;height:27px;margin:1px 3px;padding:3px 7px;border:1px solid #dededa;border-radius:4px;background:#fff;color:#373733;font-size:11px;font-weight:650;line-height:19px;box-shadow:0 1px 1px rgba(30,30,28,.035)}.db-calendar-range .ui-icon{width:13px;height:13px;flex:none;color:#85847f}.db-calendar-range span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.db-calendar-range:hover{border-color:#c9c9c4;background:#f7f7f5}.db-calendar-range.continues-before{margin-left:0;border-left-color:transparent;border-radius:0 4px 4px 0}.db-calendar-range.continues-after{margin-right:0;border-right-color:transparent;border-radius:4px 0 0 4px}.db-calendar-range.continues-before.continues-after{border-right-color:transparent;border-left-color:transparent;border-radius:0}
@media(max-width:1100px) and (min-width:761px){.editor-view.database-page .document-editor{width:calc(100% - 40px)}.db-chrome{align-items:stretch;flex-direction:column;gap:0}.db-chrome .db-toolbar{justify-content:flex-start;border-top:1px solid #f0f0ed}}
@media(max-width:760px){.document-title-line{gap:7px}.document-page-icon{width:32px;height:43px}.document-page-icon-svg{width:25px;height:25px}.editor-view.database-page .document-editor{width:calc(100% - 20px);padding-top:30px}.editor-view.database-page .block-row:has(.database-block){margin-left:0}.database-block{margin-right:0;padding:0}.db-chrome{align-items:stretch;flex-direction:column;gap:0}.db-chrome .db-toolbar{display:flex;justify-content:flex-start;padding:6px 0;border-top:1px solid #f0f0ed}.db-chrome .db-search-wrap{flex-basis:100%;max-width:none}.db-chrome .db-select,.db-chrome .db-filter-value{max-width:none}.db-calendar-week,.db-calendar-week .db-calendar-day{min-height:126px}.db-calendar-range{height:26px;font-size:10px}}
/* Universal Notion database views */
.db-list{border-top:1px solid #e9e9e7}.db-list-item{display:grid;grid-template-columns:minmax(220px,1.4fr) minmax(0,1fr);align-items:center;gap:24px;min-height:43px;padding:5px 8px;border-bottom:1px solid #eeeeeb}.db-list-item:hover{background:#f7f7f5}.db-list-open,.db-gallery-title,.db-timeline-label{min-width:0;border:0;background:transparent;color:#373733;font-size:12px;font-weight:650;text-align:left}.db-list-open{display:flex;align-items:center;gap:7px;height:31px;padding:0 4px}.db-list-open .ui-icon,.db-timeline-label .ui-icon{width:14px;height:14px;flex:none;color:#85847f}.db-list-open span,.db-timeline-label span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.db-list-item>.db-card-meta{display:flex;justify-content:flex-end;gap:16px;overflow:hidden}.db-list-item .db-card-field{max-width:180px}.db-list-more,.db-gallery-more,.db-timeline-more{width:100%;min-height:36px;border:0;background:transparent;color:#77766f;font-size:11px}.db-list-more:hover,.db-gallery-more:hover,.db-timeline-more:hover{background:#f7f7f5}
.db-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;padding:14px 0}.db-gallery-card{min-width:0;overflow:hidden;border:1px solid #dededb;border-radius:5px;background:#fff;box-shadow:0 1px 2px rgba(30,30,28,.05)}.db-gallery-card:hover{border-color:#cacac5;box-shadow:0 2px 5px rgba(30,30,28,.08)}.db-gallery-cover{display:grid;place-items:center;width:100%;height:112px;border:0;border-bottom:1px solid #e8e8e5;background:#f7f7f5;color:#aaa9a3}.db-gallery-cover:hover{background:#f2f2ef}.db-gallery-cover .ui-icon{width:28px;height:28px}.db-gallery-copy{display:grid;gap:9px;padding:11px 12px 12px}.db-gallery-title{display:-webkit-box;min-height:36px;padding:0;overflow:hidden;line-height:1.5;-webkit-box-orient:vertical;-webkit-line-clamp:2}.db-gallery-copy .db-card-meta{gap:6px}.db-gallery-more{grid-column:1/-1;border:1px dashed #dededb;border-radius:5px}
.db-timeline{min-width:0}.db-timeline-heading{display:flex;align-items:center;justify-content:space-between;min-height:54px;padding:11px 8px;border-bottom:1px solid #e8e8e5}.db-timeline-heading strong{font-size:15px}.db-timeline-scroll{max-width:100%;overflow:auto;border-bottom:1px solid #e8e8e5}.db-timeline-grid{display:grid;grid-template-columns:220px repeat(var(--timeline-days),40px);min-width:max-content}.db-timeline-corner,.db-timeline-day{position:sticky;z-index:3;top:0;height:34px;border-right:1px solid #eeeeeb;border-bottom:1px solid #dededb;background:#fff;color:#85847f;font-size:10px}.db-timeline-corner{left:0;z-index:5;padding:9px 10px;font-weight:650}.db-timeline-day{display:grid;place-items:center}.db-timeline-day.weekend{background:#fafaf8}.db-timeline-day.today{color:#e0524d;font-weight:750}.db-timeline-label{position:sticky;z-index:2;left:0;display:flex;align-items:center;gap:7px;height:38px;padding:0 10px;border-right:1px solid #dededb;border-bottom:1px solid #eeeeeb;background:#fff}.db-timeline-label:hover{background:#f7f7f5}.db-timeline-track{display:grid;grid-template-columns:repeat(var(--timeline-days),40px);grid-column:2/-1;height:38px;border-bottom:1px solid #eeeeeb;background:repeating-linear-gradient(90deg,#fff 0,#fff 39px,#eeeeeb 39px,#eeeeeb 40px)}.db-timeline-bar{align-self:center;display:flex;align-items:center;min-width:0;height:26px;margin:0 3px;padding:3px 8px;overflow:hidden;border:1px solid #d9d9d5;border-radius:4px;background:#fff;color:#373733;font-size:11px;font-weight:650;line-height:1.2;text-align:left;text-overflow:ellipsis;white-space:nowrap;box-shadow:0 1px 1px rgba(30,30,28,.04)}.db-timeline-bar>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.db-timeline-bar:hover{border-color:#bebeb8;background:#f7f7f5}.db-timeline-undated{padding:9px 8px;color:#85847f;font-size:10px}
@media(max-width:760px){.db-list-item{grid-template-columns:1fr;gap:2px;padding:7px 5px}.db-list-item>.db-card-meta{justify-content:flex-start;padding-left:25px}.db-gallery{grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:9px;padding-block:10px}.db-gallery-cover{height:90px}.db-timeline-grid{grid-template-columns:170px repeat(var(--timeline-days),36px)}.db-timeline-track{grid-template-columns:repeat(var(--timeline-days),36px)}.db-timeline-corner{width:170px}.db-timeline-label{width:170px}}
/* Calendar drag affordance */
.db-calendar-range[draggable="true"]{cursor:grab}.db-calendar-range.dragging{opacity:.48;cursor:grabbing}.db-calendar-day.drag-over{background:#eef6ff;box-shadow:inset 0 0 0 2px #3182f6}
/* Imported-content and block-layout hardening */
body.pointer-mode .document-title:focus,body.pointer-mode .block-content[contenteditable="true"]:focus{outline:none;box-shadow:none}
.block-row{min-width:0}.block-row>*{min-width:0}.todo-wrap{grid-template-columns:20px minmax(0,1fr);gap:6px;min-width:0}.todo-wrap input{justify-self:center}
.block-content[data-type=heading5]{font-size:15px;font-weight:800;line-height:1.55}.block-content[data-type=heading6]{font-size:14px;font-weight:800;line-height:1.55}

/* Toss-inspired product system: clear hierarchy, calm surfaces, predictable states. */
:root{--toss-blue:#3182f6;--toss-blue-soft:#eef5ff;--toss-ink:#191f28;--toss-muted:#6b7684;--toss-line:#e5e8eb;--toss-surface:#f7f8fa;--toss-radius:14px;--toss-shadow:0 8px 24px rgba(25,31,40,.06)}
body{color:var(--toss-ink);background:#fff;letter-spacing:-.012em}.app-shell{background:#fff}.sidebar{background:#f7f8fa;border-right:1px solid var(--toss-line)}.workspace-header{height:64px;padding-inline:18px;border-bottom:1px solid var(--toss-line)}.workspace-header .wordmark{font-size:17px;font-weight:800;letter-spacing:-.03em}.workspace-note-logo{border-radius:12px}.main-pane{background:#fff}.main-nav{padding:10px 12px}.main-nav button{height:38px;border-radius:10px;color:#4e5968;transition:background .16s ease,color .16s ease}.main-nav button:hover{background:#eef0f3;color:var(--toss-ink)}.main-nav button.active{background:var(--toss-blue-soft);color:#1b64da;font-weight:700}.tree-heading{padding:18px 16px 8px;color:#8b95a1;font-size:11px;font-weight:700}.sidebar-all,.sidebar-new-page{height:36px;border-radius:10px;color:#4e5968}.sidebar-all:hover,.sidebar-all.active,.sidebar-new-page:hover{background:#eef0f3;color:var(--toss-ink)}.sidebar-all.active{background:var(--toss-blue-soft);color:#1b64da;font-weight:700}.tree-row{height:36px;margin:2px 0;border-radius:10px}.tree-title{height:34px;padding-left:8px;color:#4e5968;line-height:34px}.tree-row.active{background:var(--toss-blue-soft)}.tree-row.active .tree-title,.tree-row.active .sidebar-glyph{color:#1b64da;font-weight:700}.tree-row:hover{background:#eef0f3}.profile-footer{border-top:1px solid var(--toss-line);background:#fff}.document-editor{padding-top:62px}.document-title{font-size:40px;font-weight:800;letter-spacing:-.055em;color:var(--toss-ink)}.document-page-icon{color:#8b95a1}.breadcrumbs{color:#8b95a1}.block-editor{margin-top:34px}.block-row{padding-block:2px}.block-content{color:#333d4b;font-size:15px;line-height:1.75}.block-content[data-type^=heading]{color:var(--toss-ink);letter-spacing:-.035em}.block-content[data-type=heading1]{font-size:32px;font-weight:800}.block-content[data-type=heading2]{font-size:24px;font-weight:800}.block-content[data-type=heading3]{font-size:20px;font-weight:800}.block-content[data-type=heading4]{font-size:17px;font-weight:800}.block-content[contenteditable=true]:hover{background:#fafbfc;border-radius:8px}.block-content[contenteditable=true]:focus{background:#fff}.block-handle{color:#b0b8c1;border-radius:8px}.block-handle:hover{background:#f2f4f6;color:#4e5968}.todo-wrap{padding:4px 8px;border-radius:10px}.todo-wrap:hover{background:#f7f8fa}.todo-wrap.checked .block-content{text-decoration:line-through;color:#8b95a1}.append-block{margin-top:12px;padding:8px 10px;border-radius:9px;color:#8b95a1}.append-block:hover{background:#f2f4f6;color:#4e5968}.button{border-radius:10px;font-weight:700;transition:background .16s ease,box-shadow .16s ease,transform .16s ease}.button.primary{background:var(--toss-blue);box-shadow:0 4px 10px rgba(49,130,246,.2)}.button.primary:hover{background:#1b64da;box-shadow:0 6px 14px rgba(49,130,246,.24);transform:translateY(-1px)}.button.subtle{border-color:var(--toss-line);background:#fff;color:#4e5968}.button.subtle:hover{background:#f7f8fa;border-color:#d8dde3}.settings-page .settings-grid,.panel,.database-block{border-color:var(--toss-line);border-radius:var(--toss-radius)}.panel,.settings-page .settings-card{background:#fff}.db-chrome{padding:6px 0;border-color:var(--toss-line)}.db-view-tab{height:42px;border-radius:9px;color:#8b95a1;font-weight:700}.db-view-tab:hover{background:#f7f8fa;color:#4e5968}.db-view-tab.active{background:var(--toss-blue-soft);color:#1b64da}.db-toolbar{gap:6px}.db-search,.db-select,.db-control{border-color:var(--toss-line);border-radius:9px;background:#fff;color:#4e5968}.db-search:focus,.db-select:focus,.db-control:focus-visible{border-color:var(--toss-blue);box-shadow:0 0 0 3px rgba(49,130,246,.12)}.db-calendar-day{border-color:#eef0f3}.db-calendar-day.today{background:#f7fbff}.db-calendar-day.today .db-calendar-date{background:var(--toss-blue)}.db-calendar-range{border-color:#dbe8fb;background:#f0f6ff;color:#1b64da;border-radius:7px;box-shadow:none}.db-calendar-range:hover{background:#e4f0ff;border-color:#b9d5ff}.db-card{border-color:var(--toss-line);border-radius:12px;box-shadow:0 1px 2px rgba(25,31,40,.03)}.db-card:hover{border-color:#b9d5ff;box-shadow:var(--toss-shadow)}.toast{border:1px solid var(--toss-line);border-radius:12px;box-shadow:0 10px 30px rgba(25,31,40,.12)}
@media(max-width:760px){.document-editor{padding-top:34px}.document-title{font-size:32px}.block-content{font-size:15px}.main-nav button{height:42px}.tree-row{height:40px}.tree-title{height:38px;line-height:38px}.db-view-tab{height:40px}}
.sidebar-document-scroll{overflow-x:hidden;overscroll-behavior-x:none}.sidebar-document-scroll .document-tree{overflow-x:hidden}.sidebar-document-scroll .tree-row{min-width:0;contain:layout}.sidebar-document-scroll .tree-title{min-width:0;max-width:100%}.sidebar [data-tooltip]::after{display:none!important}.tree-context-menu{z-index:270;width:210px}
.workspace-header-actions{display:flex;align-items:center;gap:2px;flex:none}.header-notification{position:relative}.header-notification:hover,.header-notification.active{background:#eef0f3;color:#1b64da}.header-notification .notification-badge{position:absolute;top:-2px;right:-3px;display:grid;place-items:center;min-width:17px;height:17px;padding:0 4px;border:2px solid #f7f8fa;font-size:9px!important;line-height:1}.sidebar-primary-nav{position:relative;z-index:30;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px;padding:8px 10px 10px;overflow:visible}.sidebar-primary-nav button{width:100%;min-width:0;height:34px;justify-content:center;padding:0}.sidebar-primary-nav button .nav-icon{width:18px}.sidebar-primary-nav button .ui-icon,.sidebar-primary-nav button .star-icon{width:17px;height:17px}.sidebar .sidebar-primary-nav [data-tooltip]::after{top:calc(100% + 6px);left:50%;transform:translateX(-50%)}.sidebar .sidebar-primary-nav [data-tooltip]:hover::after,.sidebar .sidebar-primary-nav [data-tooltip]:focus-visible::after{display:block!important}@media(min-width:761px){.app-shell.sidebar-collapsed .header-notification{display:none}.app-shell.sidebar-collapsed .sidebar-primary-nav{display:grid;grid-template-columns:1fr;padding:4px 8px}.app-shell.sidebar-collapsed .sidebar-primary-nav button{width:100%}.app-shell.sidebar-collapsed .sidebar-primary-nav [data-tooltip]::after{top:50%;left:calc(100% + 8px);transform:translateY(-50%)}}
/* Full-width documents and a quiet, platform-consistent sidebar scrollbar. */
.setting-select>input{width:min(100%,280px);height:38px;padding:0 11px;border:1px solid var(--line);border-radius:8px;background:#fff;outline:none}.setting-select>input:focus{border-color:#3182f6;box-shadow:0 0 0 3px rgba(49,130,246,.1)}
.settings-page .setting-select>input,.settings-page .setting-select select,.settings-page .ip-tag-input{height:34px;font-size:12px}.settings-save-bar{grid-column:1/-1;display:flex;align-items:center;justify-content:flex-end;gap:14px;margin-top:2px;padding:18px;border-top:1px solid var(--toss-line);background:transparent}.settings-save-bar span{margin-right:auto;color:#8b95a1;font-size:11px}.settings-save-bar span:empty{display:none}.settings-save-bar .button{min-width:116px;box-shadow:none}.settings-save-bar .button:hover{box-shadow:none}@media(max-width:600px){.settings-save-bar{padding:14px}.settings-save-bar span{display:none}.settings-save-bar .button{width:100%}}
.app-shell.space-mode-personal .shared-space-only,.app-shell.space-mode-personal .sidebar-primary-nav [data-view=members]{display:none}.app-shell.space-mode-personal .sidebar-primary-nav{grid-template-columns:repeat(6,minmax(0,1fr))}.app-shell.space-mode-personal .personal-heading{margin-top:0}@media(min-width:761px){.app-shell.sidebar-collapsed.space-mode-personal .sidebar-primary-nav{grid-template-columns:1fr}}@media(max-width:760px){.settings-page .setting-select>input{width:100%}}
.list-controls{display:grid;grid-template-columns:minmax(220px,1fr) auto auto auto;align-items:center;gap:8px;margin:20px 0 6px}.list-filter-search{display:flex;align-items:center;gap:8px;height:38px;padding:0 11px;border:1px solid var(--toss-line);border-radius:10px;background:#fff;color:#8b95a1}.list-filter-search:focus-within{border-color:var(--toss-blue);box-shadow:0 0 0 3px rgba(49,130,246,.1)}.list-filter-search input{min-width:0;width:100%;height:100%;padding:0;border:0;outline:0;background:transparent}.list-filter-select{height:38px;padding:0 32px 0 11px;border:1px solid var(--toss-line);border-radius:10px;background:#fff;color:#4e5968;font-size:13px}.list-layout-switch{display:flex;padding:3px;border:1px solid var(--toss-line);border-radius:10px;background:#f7f8fa}.list-layout-switch button{position:relative;display:grid;place-items:center;width:32px;height:30px;padding:0;border:0;border-radius:7px;background:transparent;color:#8b95a1}.list-layout-switch button:hover{color:#4e5968}.list-layout-switch button.active{background:#fff;color:#1b64da;box-shadow:0 1px 4px rgba(25,31,40,.1)}.document-card-main{display:flex;align-items:center;gap:11px;min-width:0}.document-card-copy{min-width:0;flex:1}.document-card-icon{display:grid;place-items:center;width:34px;height:34px;flex:none;border-radius:9px;background:#f2f4f6;color:#6b7684}.document-card-icon .ui-icon{width:17px;height:17px}.document-card-meta{display:flex!important;align-items:center;gap:6px;flex-wrap:wrap}.document-kind{padding:2px 6px;border-radius:5px;background:#f2f4f6;color:#6b7684;font-size:10px;font-weight:700}.document-card-preview{display:none;margin:10px 0 0;color:#6b7684;font-size:12px;line-height:1.55;overflow:hidden}.document-list.layout-grid{grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin-top:18px}.document-list.layout-grid .document-card{position:relative;display:flex;align-items:stretch;min-height:172px;padding:18px;border:1px solid var(--toss-line);border-radius:14px;background:#fff}.document-list.layout-grid .document-card:hover{border-color:#b9d5ff;box-shadow:var(--toss-shadow)}.document-list.layout-grid .document-card-main{align-items:flex-start;width:100%}.document-list.layout-grid .document-card-icon{width:38px;height:38px}.document-list.layout-grid .doc-open{width:100%;padding-right:74px}.document-list.layout-grid .document-card strong{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.document-list.layout-grid .document-card-preview{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical}.document-list.layout-grid .card-actions{position:absolute;top:10px;right:9px}.document-list.layout-preview{gap:10px;margin-top:18px}.document-list.layout-preview .document-card{align-items:start;min-height:116px;padding:16px;border:1px solid var(--toss-line);border-radius:13px}.document-list.layout-preview .document-card-preview{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.document-list.layout-preview .document-card-icon{width:42px;height:42px}.document-list.layout-preview .doc-open{width:100%}@media(max-width:900px){.list-controls{grid-template-columns:minmax(180px,1fr) 1fr 1fr}.list-layout-switch{grid-column:1/-1;justify-self:end}}@media(max-width:600px){.list-controls{grid-template-columns:1fr 1fr}.list-filter-search{grid-column:1/-1}.list-layout-switch{grid-column:auto;justify-self:stretch}.list-layout-switch button{flex:1}.document-list.layout-grid{grid-template-columns:1fr}.document-card{gap:8px}.document-card-icon{display:none}}
.sidebar-document-scroll{scrollbar-width:thin;scrollbar-color:rgba(139,149,161,.55) transparent}
.sidebar-document-scroll::-webkit-scrollbar{width:9px}
.sidebar-document-scroll::-webkit-scrollbar-track{background:transparent}
.sidebar-document-scroll::-webkit-scrollbar-thumb{min-height:44px;border:2px solid transparent;border-radius:999px;background:rgba(139,149,161,.5);background-clip:padding-box}
.sidebar-document-scroll::-webkit-scrollbar-thumb:hover{background:rgba(107,118,132,.72);background-clip:padding-box}
@media(min-width:761px){.app-shell.document-width-full .document-editor,.app-shell.document-width-full .editor-view.database-page .document-editor,.app-shell.document-width-full .page-view{width:100%;max-width:none;margin-inline:0;padding-right:clamp(24px,3vw,48px);padding-left:clamp(24px,3vw,48px)}}
.block-row:has(> .database-block)>.block-handle{visibility:hidden!important;pointer-events:none}
/* One document type scale and one quiet surface language. */
.editor-view:not(.database-page) .document-title{font-size:38px;line-height:1.22}.editor-view:not(.database-page) .document-page-icon{width:36px;height:46px}.editor-view:not(.database-page) .document-page-icon-svg{width:25px;height:25px}.editor-view:not(.database-page) .block-editor{gap:6px;margin-top:30px}.editor-view:not(.database-page) .block-content{font-size:15px;line-height:1.7}
.notion-property-table{margin:4px 0 14px;padding:8px 14px;border:1px solid var(--toss-line);border-radius:14px;background:#fbfcfd}.notion-property-table .block-table{width:100%;border:0}.notion-property-table .block-table td{height:42px;border-bottom:1px solid #eef0f3}.notion-property-table .block-table tr:last-child td{border-bottom:0}.notion-property-table .block-table td:first-child{width:140px}.notion-property-table .block-table input{height:42px;padding:0 8px;color:#333d4b;font-size:14px;line-height:1.45}.notion-property-table .block-table td:first-child input{color:#8b95a1;font-size:13px;font-weight:600}
.notion-page-link{padding:0;border-radius:0}.notion-page-link .media-preview{display:block;min-height:30px;border:0;background:transparent;border-radius:0}.notion-page-link .media-preview a{display:flex;width:max-content;max-width:100%;min-height:30px;align-items:center;gap:8px;padding:0 2px;border:0;border-radius:6px;background:transparent;color:#2c2c2b;font-size:16px;font-weight:400;line-height:24px;text-decoration:none;transition:background .16s ease,color .16s ease}.notion-page-link .media-preview a:hover{background:#f1f1ef;color:#1b64da;text-decoration:none}.notion-page-link .media-preview .ui-icon{width:16px;height:16px;flex:none;color:#8b95a1}
.media-image .media-preview{display:block;min-height:0;border:0;border-radius:0;background:transparent}.media-image .media-preview img{width:auto;max-width:100%;height:auto;max-height:none;object-fit:contain;border-radius:6px}.media-image .media-preview img[loading=lazy]{content-visibility:auto}.media-unavailable{display:flex!important;align-items:center;gap:10px;min-height:64px;padding:12px 14px!important;border:1px solid #e5e8eb!important;border-radius:10px!important;background:#f7f8fa;color:#6b7684!important;text-decoration:none!important}.media-unavailable:hover{border-color:#cbd2da!important;background:#f2f4f6}.media-unavailable .ui-icon{width:20px;height:20px;flex:none}.media-unavailable span{font-size:14px;line-height:1.55}
.editor-view.notion-imported:not(.database-page) .document-editor{width:min(100% - 40px,900px)}.editor-view.notion-imported:not(.database-page) .block-editor{gap:0;margin-top:22px}.editor-view.notion-imported:not(.database-page) .block-row{min-height:40px;padding-block:0}.editor-view.notion-imported:not(.database-page) .block-content{min-height:40px;padding:8px 0;color:#2c2c2b;font-size:16px;line-height:24px}.editor-view.notion-imported:not(.database-page) .block-content[data-type=heading1]{padding:14px 0 8px;font-size:30px;line-height:36px}.editor-view.notion-imported:not(.database-page) .block-content[data-type=heading2]{padding:13px 0 7px;font-size:24px;line-height:30px}.editor-view.notion-imported:not(.database-page) .block-content[data-type=heading3]{padding:12px 0 6px;font-size:20px;line-height:26px}.editor-view.notion-imported:not(.database-page) .block-content[data-type=heading4]{padding:10px 0 6px;font-size:17px;line-height:24px}.editor-view.notion-imported:not(.database-page) .block-row:has(>.notion-page-link){min-height:30px}.editor-view.notion-imported:not(.database-page) .block-row:has(>.notion-page-link)>.block-handle{height:30px}
.todo-wrap{min-height:42px;padding:6px 10px}.todo-wrap input[type=checkbox]{width:16px;height:16px;margin:6px 0 0;accent-color:var(--toss-blue)}.todo-wrap .block-content{padding:2px 0;font-size:15px;line-height:1.7}.append-block{font-size:13px}
@media(max-width:760px){.editor-view:not(.database-page) .document-title{font-size:32px}.editor-view:not(.database-page) .block-editor{margin-top:24px}.notion-property-table{padding:6px 8px}.notion-property-table .block-table td:first-child{width:108px}.notion-page-link .media-preview a{min-height:46px;padding-inline:12px}}
.db-card.drag-copy,.db-calendar-range.drag-copy,.db-timeline-bar.drag-copy{cursor:copy}
.db-board-column.drag-copy-over,.db-calendar-day.drag-copy-over,.db-timeline-track.drag-copy-over{background:#eef6ff;box-shadow:inset 0 0 0 2px #3182f6}
.db-timeline-bar[draggable="true"],.db-card[draggable="true"]{cursor:grab}.db-timeline-bar.dragging,.db-card.dragging{cursor:grabbing;opacity:.48}
body[data-drag-mode="copy"]::after{content:'복사';position:fixed;right:18px;bottom:18px;z-index:10000;padding:6px 9px;border-radius:999px;background:#3182f6;color:#fff;font-size:11px;font-weight:700;box-shadow:0 4px 14px rgba(49,130,246,.24);pointer-events:none}
.notion-page-link .media-preview a{justify-content:flex-start}
.editor-view.notion-imported:not(.database-page) .block-row:has(.notion-page-link){min-height:30px}
.editor-view.notion-imported:not(.database-page) .block-row:has(.notion-page-link)>.block-content{min-height:30px;padding:0}
.editor-view.notion-imported:not(.database-page) .block-row:has(.notion-page-link)>.block-handle{height:30px}
.editor-view.notion-imported:not(.database-page) .notion-page-link .media-preview a{width:100%;max-width:none}
.editor-view.notion-imported:not(.database-page) .media-block .media-url{display:none}
.block-editor.block-selecting{user-select:none;cursor:default}
.editor-view:not(.database-page) .block-editor{margin-left:-52px;padding-left:52px}
.block-editor.block-selecting .block-content{user-select:none}
.block-row.selected{background:#e8f3ff;box-shadow:inset 3px 0 #3182f6;color:#1f2937}
.block-row.selected .block-content{border-radius:8px}
.block-row.selected .block-handle{visibility:hidden;color:#3182f6}
.block-editor.block-selecting .block-row.selected .block-handle{visibility:visible}
.block-row.selected:hover{background:#e1efff}
.document-title.skeleton-title::placeholder{color:transparent!important}
.document-title:focus-visible,.block-content[contenteditable="true"]:focus-visible{outline:none;box-shadow:none}
.inline-link-favicon{display:inline-block;width:16px;height:16px;margin:0 5px 0 0;vertical-align:-3px;border-radius:3px;object-fit:contain}.media-preview a .inline-link-favicon{width:18px;height:18px;flex:none;margin:0}.media-preview a .page-link-icon-svg,.media-preview a .page-link-icon-image,.media-preview a .page-link-icon-emoji{display:block;width:18px;height:18px;flex:none}.media-preview a .page-link-icon-svg{fill:none;stroke:currentColor;stroke-width:1.45;stroke-linecap:round;stroke-linejoin:round}.media-preview a .page-link-icon-image{object-fit:contain;border-radius:4px}.media-preview a .page-link-icon-emoji{font-size:16px;line-height:18px;text-align:center}
.editor-view.notion-imported:not(.database-page) .block-content[data-type=heading5]{padding:9px 0 5px;font-size:15px;line-height:22px;font-weight:700}.editor-view.notion-imported:not(.database-page) .block-content[data-type=heading6]{padding:8px 0 4px;font-size:14px;line-height:20px;font-weight:700}
.sidebar-page-emoji,.sidebar-page-icon{display:block;width:15px;height:15px;flex:none;object-fit:contain;text-align:center;line-height:15px}.sidebar-page-emoji{font-size:14px}.document-page-icon-emoji,.document-page-icon-image{display:block;width:30px;height:30px;object-fit:contain;text-align:center;line-height:30px}.document-page-icon-emoji{font-size:27px}.document-page-icon-image{border-radius:6px}
@media(max-width:760px){.editor-view:not(.database-page) .block-editor{margin-left:-36px;padding-left:36px}}
/* Imported documents must honor the selected full-width mode.  The imported
   readability cap above intentionally wins in the default mode, but it must
   not override the user's explicit full-width choice. */
@media(min-width:761px){.app-shell.document-width-full .editor-view.notion-imported:not(.database-page) .document-editor{width:100%;max-width:none;margin-inline:0;padding-inline:clamp(24px,3vw,48px)}}
/* Keep drag selection quiet and structural.  The old inset blue rail and
   rounded block surfaces made a multi-selection look like a stack of cards;
   selected content now uses one blue surface while the block order and
   copy/move behavior stay unchanged. */
.block-row.selected{margin-right:0;background:transparent;box-shadow:none;color:inherit}
.block-row.selected::before{display:none}
.block-row.selected .block-content{border-radius:8px;background:#e8f3ff}
.block-row.selected .media-block{outline:none;border-radius:8px;background:#e8f3ff}
.block-row.selected .media-preview{border-color:transparent;background:transparent;box-shadow:none}
.block-row.selected .block-handle{visibility:visible;color:#8b95a1}
.block-editor.block-selecting .block-row.selected .block-content{background:#dceeff}
.block-row.selected:hover{background:transparent}.block-row.selected:hover .block-content{background:#e8f3ff}
.block-row.drop-before::before,.block-row.drop-after::after{height:1px;border-radius:0;background:#8b95a1}
body[data-drag-mode="copy"]::after{display:none}
@media(min-width:761px){.toolbar-actions .button,.toolbar-actions .icon-button{height:32px;min-height:32px}.db-chrome .db-view-tab{height:36px}.db-chrome .db-toolbar{min-height:36px}.db-chrome .db-search,.db-chrome .db-select,.db-chrome .db-control{height:32px}}
.list-filter-search,.list-filter-select{height:36px;box-sizing:border-box}.list-layout-switch{height:36px;box-sizing:border-box;padding:2px}.list-layout-switch button{height:30px}
.tree-row .document-page-icon-emoji,.tree-row .document-page-icon-image{display:grid;width:15px;height:15px;place-items:center;overflow:hidden;border-radius:3px;font-size:14px;line-height:1;object-fit:contain}.tree-row .document-page-icon-svg{width:15px;height:15px}
/* Shared block gutter: handle -> marker -> content.  Every editable block uses
   the same coordinate system so hover never moves the text or steals the list marker. */
.editor-view:not(.database-page) .block-editor{--handle-gutter:28px;--marker-gutter:22px;--indent-step:24px;gap:6px;margin-left:-52px;padding-left:52px;padding-right:16px}
.editor-view:not(.database-page) .block-row{grid-template-columns:var(--handle-gutter) minmax(0,1fr);margin-left:calc(-1 * var(--handle-gutter));padding-left:calc(var(--indent,0) * var(--indent-step))}
.editor-view:not(.database-page) .block-handle{width:var(--handle-gutter);min-width:var(--handle-gutter);height:30px}
.editor-view:not(.database-page) .block-content[data-type="bullet"],.editor-view:not(.database-page) .block-content[data-type="numbered"]{position:relative;padding-left:var(--marker-gutter)}
.editor-view:not(.database-page) .block-content[data-type="bullet"]::before,.editor-view:not(.database-page) .block-content[data-type="numbered"]::before{position:absolute;left:0;top:.18em;width:var(--marker-gutter);margin:0;line-height:1.65;box-sizing:border-box}
.editor-view:not(.database-page) .block-content[data-type="bullet"]::before{text-align:left;padding-left:3px}
.editor-view:not(.database-page) .block-content[data-type="numbered"]::before{min-width:var(--marker-gutter);padding-right:4px;text-align:right}
.editor-view:not(.database-page) .todo-wrap{grid-template-columns:var(--marker-gutter) minmax(0,1fr);gap:0;min-width:0;padding:0}
.editor-view:not(.database-page) .todo-wrap input[type="checkbox"]{justify-self:center;margin:7px 0 0}
.editor-view:not(.database-page) .todo-wrap .block-content{padding-left:0}
.editor-view:not(.database-page) .toggle-summary{grid-template-columns:var(--marker-gutter) minmax(0,1fr)}
.editor-view:not(.database-page) .toggle-caret{width:var(--marker-gutter)}
.editor-view:not(.database-page) .block-content[contenteditable="true"]:hover{background:transparent;border-radius:0}
.block-row.selected:hover{background:transparent}.block-row.selected:hover .block-content{background:#e8f3ff}.block-row.selected:hover .media-block,.block-editor.block-selecting .block-row.selected .media-block{background:#e8f3ff}.block-row.dragging{opacity:.62}.block-row.drop-before::before,.block-row.drop-after::after{right:16px;left:28px;height:2px;border-radius:2px;background:#b6bec9;box-shadow:none}.db-board-column.drag-copy-over,.db-calendar-day.drag-copy-over,.db-timeline-track.drag-copy-over{background:#f7fbff;box-shadow:inset 0 0 0 1px #b9d5ff}.db-card.dragging,.db-calendar-range.dragging,.db-timeline-bar.dragging{opacity:.62}
.block-content[data-type="quote"]{padding-inline:12px;border-left:2px solid #d5dae2;background:transparent}.block-content[data-type="quote"]:hover{background:transparent}
.editor-view.notion-imported:not(.database-page) .block-content[data-type="quote"]{padding:8px 12px}
@media(max-width:760px){.editor-view:not(.database-page) .block-editor{--handle-gutter:22px;--marker-gutter:20px;--indent-step:20px;padding-right:8px}.editor-view:not(.database-page) .block-row{margin-left:calc(-1 * var(--handle-gutter))}.editor-view:not(.database-page) .block-handle{height:28px}}
/* Slash menu and code blocks share the editor's quiet, measured surface. */
.slash-menu{width:min(320px,calc(100vw - 16px));max-height:min(420px,calc(100vh - 16px));padding:6px;overscroll-behavior:contain}
.slash-empty{padding:18px 12px;color:#8b95a1;font-size:12px;text-align:center}
.code-block-shell{min-width:0;max-width:100%;margin:4px 0 8px;overflow:hidden;border:1px solid #e5e8eb;border-radius:10px;background:#f7f8fa}
.code-block-header{display:flex;align-items:center;justify-content:space-between;min-height:32px;padding:0 10px;border-bottom:1px solid #e5e8eb;background:#f1f3f5;color:#8b95a1;font-size:11px;line-height:1}
.code-block-label{font-weight:700;letter-spacing:.01em}
.code-copy-button{display:inline-flex;align-items:center;gap:4px;height:24px;padding:0 6px;border:0;border-radius:5px;background:transparent;color:#6b7684;font-size:11px}
.code-copy-button:hover,.code-copy-button:focus-visible{background:#e5e8eb;color:#333d4b;outline:none}
.code-copy-button.copied{color:#1b64da}
.code-copy-button .ui-icon{width:13px;height:13px}
.code-block-shell>.code-block-content,.code-block-shell .block-content[data-type="code"]{display:block;min-width:0;max-width:100%;min-height:44px;margin:0;padding:12px 16px!important;overflow-x:auto;overflow-y:hidden;white-space:pre;word-break:normal;overflow-wrap:normal;tab-size:2;color:#26323d;background:transparent;font-family:ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",monospace;font-size:13px!important;line-height:1.6!important;letter-spacing:0}
.code-block-shell>.code-block-content:empty:before{content:none}
.code-block-shell>.code-block-content::-webkit-scrollbar{height:8px}.code-block-shell>.code-block-content::-webkit-scrollbar-track{background:transparent}.code-block-shell>.code-block-content::-webkit-scrollbar-thumb{border-radius:8px;background:#cbd2da}
.editor-view.notion-imported:not(.database-page) .code-block-shell{margin:4px 0 12px;border-radius:10px}
.editor-view.notion-imported:not(.database-page) .code-block-shell>.code-block-content{min-height:44px;padding:12px 16px!important;font-size:13px!important;line-height:1.6!important;white-space:pre;overflow-x:auto;word-break:normal}
 .public-block-editor .code-block-shell{margin-inline:0}
 @media(max-width:760px){.code-block-shell>.code-block-content,.editor-view.notion-imported:not(.database-page) .code-block-shell>.code-block-content{padding:10px 12px!important;font-size:13px!important}.code-block-header{min-height:30px;padding-inline:8px}.slash-menu{max-height:min(360px,calc(100vh - 16px))}}
 /* Menu type scale: keep the compact shell while making navigation and action labels easier to scan. */
 .sidebar .main-nav button,.sidebar .tree-title,.sidebar .sidebar-all,.sidebar .sidebar-new-page{font-size:14px}
 .sidebar .tree-heading{font-size:12px}
 .sidebar .workspace-button strong{font-size:15px}.sidebar .workspace-button small{font-size:12px}
 .sidebar .profile-copy strong{font-size:13px}.sidebar .profile-copy small{font-size:11px}
 .sidebar .sidebar-primary-nav [data-tooltip]::after{font-size:13px}
 .list-filter-select{font-size:14px}
 .slash-item strong{font-size:14px}.slash-item small,.slash-empty{font-size:11px}
 /* The desktop sidebar leaves too little toolbar width on small tablets. Keep primary actions on one line. */
 @media(max-width:900px) and (min-width:761px){
 .toolbar-actions{flex-wrap:nowrap}
 .toolbar-actions #comments-button,.toolbar-actions #history-button,.toolbar-actions #upload-button,.toolbar-actions #access-button,.toolbar-actions #duplicate-button,.toolbar-actions #new-child-button{display:none}
 }
 .block-menu button{font-size:13px}
 .db-view-tab,.db-control{font-size:13px}
 /* A freshly inserted page-link block has no URL yet, so its editor must stay visible. */
 .notion-page-link .media-url:not([hidden]){display:block}
 /* Minimum readable UI text scale: keep every visible text surface at 14px or larger. */
 .muted,.eyebrow,.auth-card label,.dialog-card label,.button.compact,.form-note,.alert,.workspace-button small,.main-nav button,.tree-heading,.tree-row,.tree-toggle,.avatar,.profile-copy strong,.profile-copy small,.breadcrumbs,.save-state,.notice,.block-content[data-type=code],.append-block,.document-card small,.section-title span,.member-info strong,.member-info small,.member-controls select,.member-controls button,.settings-card p,.dialog-card header p,.invite-link-result p,.invite-link-result input,.slash-item strong,.slash-item small,.toast,.mobile-header span,.page-header p:last-child,.feed-item span,.feed-item small,.template-card p,.document-tree>.empty-state,.boot-shell,.button,.toolbar-actions .button,[data-tooltip]::after,.main-nav button .nav-label,.block-menu button,.import-card small,.width-options button,.policy-card header p,.owner-only-badge,.setting-toggle strong,.setting-select strong,.ip-list-label strong,.setting-toggle small,.setting-select small,.ip-list-label small,.ip-tag-input,.ip-input-hint,.ip-input-hint strong,.current-ip,.import-repair-toggle strong,.import-repair-toggle small,.slash-category,.public-header,.block-table-actions button,.database-label,.media-preview,.toc-block strong,.toc-block a,.inline-toolbar button,.global-search-card kbd,.global-search-item strong,.global-search-item small,.global-search-empty,.global-search-card>footer,.publication-row small,.url-paste-heading,.url-paste-copy strong,.url-paste-copy small,.database-block,.db-count,.db-view-tab,.db-search,.db-select,.db-control,.db-property-name,.db-property-type,.db-cell-input,.db-empty,.db-footer-note,.db-board-heading,.db-board-heading span:last-child,.db-card-title,.db-card-field,.db-card-field .db-cell-input,.db-board-add,.db-table th.db-row-actions-cell,.db-card-value,.db-card-avatar,.sidebar-all,.sidebar-new-page,.teamspace-tree:empty::after,.setup-step,.setup-benefits li>span,.setup-benefits strong,.setup-benefits small,.setup-card header>p:last-child,.setup-card label,.setup-security,.database-block .db-board-more,.db-calendar-weekday,.db-calendar-date,.db-calendar-range,.db-calendar-undated-item,.db-calendar-undated summary,.db-list-open,.db-gallery-title,.db-timeline-label,.db-list-more,.db-gallery-more,.db-timeline-more,.db-timeline-corner,.db-timeline-day,.db-timeline-bar,.db-timeline-undated,.settings-page .setting-select>input,.settings-page .setting-select select,.settings-page .ip-tag-input,.settings-save-bar span,.list-filter-select,.document-kind,.document-card-preview,.notion-property-table .block-table td:first-child input,body[data-drag-mode="copy"]::after,.slash-empty,.code-block-header,.code-copy-button,.sidebar .tree-heading,.sidebar .workspace-button small,.sidebar .profile-copy strong,.sidebar .profile-copy small,.sidebar .sidebar-primary-nav [data-tooltip]::after,.sidebar .main-nav button,.sidebar .tree-title,.sidebar .sidebar-all,.sidebar .sidebar-new-page,.ip-tag{font-size:14px!important}
 .notification-badge,.header-notification .notification-badge,.security-warning{font-size:14px!important}
 .code-block-shell>.code-block-content,.code-block-shell .block-content[data-type="code"],.editor-view.notion-imported:not(.database-page) .code-block-shell>.code-block-content{font-size:14px!important}
 .global-search-item{gap:5px;padding:12px 13px}
 .global-search-item strong{font-size:14px;line-height:1.35}
 .global-search-meta,.global-search-preview{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;line-height:1.45}
 .global-search-meta{color:var(--muted)}
 .global-search-preview{color:#565550}
  .global-search-item mark{padding:0 2px;border-radius:3px;background:#fff0a8;color:inherit}
  `;

const UI_SPACING_CSS = String.raw`
/* UI spacing system: one rhythm, with intentional per-surface tuning. */
:root{--ui-space-1:4px;--ui-space-2:8px;--ui-space-3:12px;--ui-space-4:16px;--ui-space-5:20px;--ui-surface-radius:12px;--ui-control-height:44px}

/* Inline links stay part of the text flow. Card links are styled below by their media surface. */
.editor-view.notion-imported:not(.database-page) .block-content:not(.media-block) a{color:#2c2c2b;text-decoration:none;text-underline-offset:2px;border-radius:4px;padding-inline:0;transition:background .16s ease,color .16s ease}
.editor-view.notion-imported:not(.database-page) .block-content:not(.media-block) a:hover{background:#f1f1ef;color:#1b64da}

/* External bookmark/file/fallback cards: the surface may align to the text column,
   but its readable content never touches the border. */
.media-block{min-width:0;max-width:100%}
.media-block:not(.notion-page-link) .media-preview> a{display:flex;align-items:center;gap:10px;width:100%;min-height:52px;box-sizing:border-box;padding:0 var(--ui-space-4);border-radius:10px;color:var(--ink);text-decoration:none}
.media-block:not(.notion-page-link) .media-preview> a:hover{background:#f7f8fa;color:#1b64da}

/* Internal page links are intentionally flat, but still have a clear hit area. */
.notion-page-link{padding:0;border-radius:0}
.notion-page-link .media-preview{display:block;min-height:40px;border:0;background:transparent;border-radius:0}
.notion-page-link .media-preview> a{display:flex;width:100%;max-width:none;min-height:40px;align-items:center;justify-content:flex-start;gap:8px;box-sizing:border-box;padding:0 var(--ui-space-2);border:0;border-radius:8px;background:transparent;color:#2c2c2b;font-size:16px;font-weight:400;line-height:24px;text-decoration:none}
.notion-page-link .media-preview> a:hover{background:#f1f1ef;color:#1b64da;text-decoration:none}

/* Media-specific surfaces: visual media is not padded, controls and fallbacks are. */
.media-image .media-preview{padding:0}
.media-image .media-preview img{border-radius:8px}
.media-preview audio{display:block;width:calc(100% - 32px);margin:16px}
.media-preview iframe,.media-preview video{border-radius:8px}
.media-unavailable{padding-inline:var(--ui-space-4)!important}

/* Editable tables use edge insertion affordances instead of permanent action buttons. */
.structured-block{position:relative;padding-block:0}
.table-edge-actions{position:absolute;inset:0;z-index:4;pointer-events:none}
.table-edge-action{position:absolute;display:grid;place-items:center;width:26px;height:26px;padding:0;border:1px solid #d9e1eb;border-radius:999px;background:#fff;color:#64748b;box-shadow:0 2px 8px rgba(15,23,42,.12);opacity:0;pointer-events:none;transition:opacity .15s ease,transform .15s ease,background .15s ease,color .15s ease;cursor:pointer}
.table-edge-action[data-edge=top]{top:-13px;left:50%;transform:translateX(-50%) scale(.86)}
.table-edge-action[data-edge=bottom]{bottom:-13px;left:50%;transform:translateX(-50%) scale(.86)}
.table-edge-action[data-edge=left]{left:-13px;top:50%;transform:translateY(-50%) scale(.86)}
.table-edge-action[data-edge=right]{right:-13px;top:50%;transform:translateY(-50%) scale(.86)}
.structured-block[data-hover-edge=top] .table-edge-action[data-edge=top],.structured-block[data-hover-edge=bottom] .table-edge-action[data-edge=bottom],.structured-block[data-hover-edge=left] .table-edge-action[data-edge=left],.structured-block[data-hover-edge=right] .table-edge-action[data-edge=right],.table-edge-action:focus-visible{opacity:1;pointer-events:auto}
.structured-block[data-hover-edge=top] .table-edge-action[data-edge=top],.structured-block[data-hover-edge=bottom] .table-edge-action[data-edge=bottom]{transform:translateX(-50%) scale(1)}
.structured-block[data-hover-edge=left] .table-edge-action[data-edge=left],.structured-block[data-hover-edge=right] .table-edge-action[data-edge=right]{transform:translateY(-50%) scale(1)}
.table-edge-action:hover{border-color:#8bbcf2;background:#e8f3ff;color:#1b64da}
.table-edge-action:focus-visible{outline:2px solid #1b64da;outline-offset:2px}
.table-cell-selection-actions{position:absolute;top:6px;right:6px;z-index:5;display:flex;align-items:center;gap:4px;max-width:calc(100% - 12px);padding:4px;overflow-x:auto;border:1px solid #d9e1eb;border-radius:9px;background:rgba(255,255,255,.96);box-shadow:0 3px 12px rgba(15,23,42,.12);opacity:0;pointer-events:none;transform:translateY(-3px);transition:opacity .15s ease,transform .15s ease}
.structured-block.has-cell-selection .table-cell-selection-actions{opacity:1;pointer-events:auto;transform:none}
.table-cell-selection-actions button{display:inline-flex;align-items:center;gap:5px;min-height:30px;padding:0 8px;border:0;border-radius:6px;background:transparent;color:#526173;font-size:14px;font-weight:600;white-space:nowrap}
.table-cell-selection-actions button:hover{background:#f0f6ff;color:#1b64da}
.table-cell-selection-actions button[data-action=delete]:hover{background:#fff1f1;color:#c43d3d}
.table-cell-selection-actions .ui-icon{width:15px;height:15px;flex:none}
.block-table th.cell-selected,.block-table td.cell-selected{background:#e8f3ff;box-shadow:inset 0 0 0 1px #7db1ee}
.structured-block.cell-selecting .block-table{user-select:none}
@media(pointer:coarse),(max-width:760px){
  .table-edge-action{width:30px;height:30px;opacity:1;pointer-events:auto}
  .table-edge-action[data-edge=top]{top:-15px}
  .table-edge-action[data-edge=bottom]{bottom:-15px}
  .table-edge-action[data-edge=left]{left:-15px}
  .table-edge-action[data-edge=right]{right:-15px}
  .table-cell-selection-actions{top:4px;right:4px;max-width:calc(100% - 8px)}
  .table-cell-selection-actions button{min-height:34px}
}

/* Structured content uses the same readable inset without shrinking its scroll area. */
.callout-wrap{padding-inline:14px}
.block-content[data-type="quote"]{padding-inline:12px}
.toc-block,.math-block{padding-inline:14px}
.code-block-shell>.code-block-content,.code-block-shell .block-content[data-type="code"]{padding-inline:var(--ui-space-4)!important}

/* App chrome follows the same surface rhythm. */
.document-title-line>.document-page-icon{display:none!important}
.document-card{padding-inline:var(--ui-space-4)}
.panel{padding-inline:var(--ui-space-5)}
.settings-card{padding-inline:24px}
.dialog-card{padding-inline:24px}
.slash-menu,.block-menu,.url-paste-menu{padding:var(--ui-space-2)}
.global-search-results{padding:var(--ui-space-2)}

/* Selection is a surface state, not a border or left rail. */
.block-row.selected{margin-right:0;background:transparent;box-shadow:none;color:inherit}
.block-row.selected::before{display:none}
.block-row.selected .block-content{border-radius:8px;background:#e8f3ff}
.block-row.selected .media-block{outline:none;border-radius:var(--ui-surface-radius);background:#e8f3ff}
  .block-row.selected .media-preview{border-color:transparent;background:transparent;box-shadow:none}
.block-row.selected:hover{background:transparent}
.block-row.selected:hover .block-content,.block-editor.block-selecting .block-row.selected .block-content{background:#e8f3ff}
.block-row.selected:hover .media-block,.block-editor.block-selecting .block-row.selected .media-block{background:#e8f3ff}

@media(max-width:760px){
  .media-block:not(.notion-page-link) .media-preview> a{min-height:48px;padding-inline:var(--ui-space-3)}
  .notion-page-link .media-preview{min-height:44px}
  .notion-page-link .media-preview> a{min-height:44px;padding-inline:var(--ui-space-3)}
  .media-preview audio{width:calc(100% - 24px);margin:12px}
  .media-unavailable{padding-inline:var(--ui-space-3)!important}
  .callout-wrap,.block-content[data-type="quote"],.toc-block,.math-block{padding-inline:var(--ui-space-3)}
  .code-block-shell>.code-block-content,.code-block-shell .block-content[data-type="code"]{padding-inline:var(--ui-space-3)!important}
  .document-card{padding-inline:var(--ui-space-3)}
  .panel{padding-inline:var(--ui-space-3)}
  .settings-card,.dialog-card{padding-inline:18px}
  .button,.icon-button,.main-nav button,.sidebar-all,.sidebar-new-page,.tree-row{min-height:var(--ui-control-height)}
}

/* Icon baseline and text rhythm: markers share the text line box and controls
   keep a small breathing room at the trailing edge. */
.ui-icon,.star-icon{display:block;flex:none;vertical-align:middle}
.tree-toggle,.tree-add,.block-handle{display:grid;place-items:center;align-items:center;justify-items:center}
.toggle-summary{align-items:center;min-height:30px}
.toggle-caret{align-self:center;display:grid;place-items:center;width:var(--marker-gutter,22px);height:30px;margin:0;padding:0;line-height:0}
.toggle-caret .ui-icon{width:16px;height:16px}
.todo-wrap{align-items:center;grid-template-columns:var(--marker-gutter,22px) minmax(0,1fr);gap:4px;min-height:30px;padding-right:8px}
.todo-wrap input[type="checkbox"]{display:block;width:18px;height:18px;align-self:center;justify-self:center;margin:0}
.todo-wrap .block-content{min-width:0;padding-left:0;padding-right:10px}
.editor-view:not(.database-page) .todo-wrap{align-items:center;grid-template-columns:var(--marker-gutter,22px) minmax(0,1fr);gap:6px;min-width:0;min-height:30px;padding:0 10px 0 0}
.editor-view:not(.database-page) .todo-wrap input[type="checkbox"]{display:block;width:18px;height:18px;align-self:center;justify-self:center;margin:0}
.editor-view:not(.database-page) .todo-wrap .block-content{min-width:0;padding-left:0;padding-right:10px}
.block-content[data-type="bullet"],.block-content[data-type="numbered"]{position:relative;padding-right:10px}
.block-content[data-type="bullet"]::before,.block-content[data-type="numbered"]::before{position:absolute;left:0;top:3px;display:flex;align-items:center;width:var(--marker-gutter,25px);height:1.75em;margin:0;box-sizing:border-box;line-height:1}
.block-content[data-type="bullet"]::before{justify-content:flex-start;padding-left:3px}
.block-content[data-type="numbered"]::before{justify-content:flex-end;padding-right:4px}
.editor-view:not(.database-page) .block-content[data-type="bullet"],.editor-view:not(.database-page) .block-content[data-type="numbered"]{padding-right:10px}
.editor-view:not(.database-page) .block-content[data-type="bullet"]::before,.editor-view:not(.database-page) .block-content[data-type="numbered"]::before{top:3px;display:flex;align-items:center;height:1.75em;line-height:1}
.editor-view:not(.database-page) .block-content[data-type="bullet"]::before{justify-content:flex-start}
.editor-view:not(.database-page) .block-content[data-type="numbered"]::before{justify-content:flex-end}
.block-content[data-type="text"],.block-content[data-type^="heading"],.block-content[data-type="todo"],.block-content[data-type="toggle"],.block-content[data-type="callout"]{padding-inline-end:10px}
.block-content[data-type="quote"]{padding-inline-end:12px}
.block-content[data-type="code"]{padding-inline-end:16px}
.toggle-body{margin-left:var(--marker-gutter,22px);padding-inline:10px}
.callout-wrap>.ui-icon{align-self:center;margin-top:0}
.inline-link-favicon{margin-block:0;vertical-align:middle}
.sidebar-page-emoji,.sidebar-page-icon,.document-page-icon-emoji,.document-page-icon-image{display:grid;place-items:center;line-height:1}
.db-view-tab,.db-control,.db-list-open,.db-calendar-range,.db-timeline-label,.db-timeline-bar,.db-card-page-icon,.code-copy-button,.table-cell-selection-actions button{align-items:center}
.db-view-tab{display:inline-flex;justify-content:center;line-height:1.2}
.db-card-title-row{align-items:center}
.db-list-more,.db-gallery-more,.db-timeline-more{display:flex;align-items:center;justify-content:center;line-height:1.2}
.db-board-add{display:flex;align-items:center;padding-inline:8px;line-height:1.2}
.db-status-dot{vertical-align:middle}
.db-search-wrap>.ui-icon{top:50%;transform:translateY(-50%)}
@media(max-width:760px){
  .todo-wrap{padding-right:6px}
  .todo-wrap .block-content{padding-right:8px}
  .editor-view:not(.database-page) .todo-wrap{gap:6px;padding-right:8px}
  .editor-view:not(.database-page) .todo-wrap .block-content{padding-right:8px}
  .block-content[data-type="text"],.block-content[data-type^="heading"],.block-content[data-type="todo"],.block-content[data-type="toggle"],.block-content[data-type="callout"]{padding-inline-end:8px}
  .block-content[data-type="quote"]{padding-inline-end:12px}
}
`;

const DEMO_CSS = String.raw`
.demo-banner{position:sticky;z-index:19;top:0;display:flex;align-items:center;justify-content:center;gap:10px;min-height:42px;padding:8px 18px;border-bottom:1px solid #cbd9ff;background:#edf3ff;color:#3d4f78;font-size:14px;line-height:1.45;text-align:center}
.demo-banner strong{flex:none;padding:3px 7px;border-radius:5px;background:#4869b1;color:#fff;font-size:12px;letter-spacing:.08em}
.demo-banner+ .mobile-header{top:42px}
.demo-banner~.editor-view .editor-toolbar{top:42px}
@media(max-width:760px){.demo-banner{position:relative;min-height:0;align-items:flex-start;justify-content:flex-start;padding:10px 12px;text-align:left}.demo-banner span{font-size:14px}.demo-banner+ .mobile-header{top:0}.demo-banner~.editor-view .editor-toolbar{top:54px}}
`;

const CLIENT_JS = String.raw`const state={user:null,role:null,current:null,dirty:false,saving:false,saveFailed:false,saveTimer:null,editRevision:0,view:'all',cursor:null,search:'',listQuery:'',listKind:'all',listSort:'updated_desc',listLayout:'list',listFilterTimer:null,expanded:new Set(),treeLoading:new Set(),membersCursor:null,invitesCursor:null,slashBlock:null,slashIndex:0,dragRow:null,contextRow:null,treeContextDoc:null,treeContextRow:null,globalSearchIndex:0,globalSearchTimer:null,globalSearchRequest:0,publication:null,inlineTarget:null,inlineRange:null,linkTarget:null,linkRange:null,urlPaste:null,urlPasteIndex:0,selectedBlocks:new Set(),undoStack:[],undoIndex:-1,historyTimer:null,restoringHistory:false,access:null,publicSignup:false,workspaceSettings:null,ipAllowlist:[],notionRepairAttempted:new Set()};
const $=(id)=>document.getElementById(id);
function loadingMarkup(kind,count=4){const hidden='<span class="sr-only">콘텐츠를 불러오는 중</span>';if(kind==='tree')return'<div class="skeleton-tree" role="status" aria-label="문서 트리 불러오는 중">'+hidden+Array.from({length:count},()=>'<span class="skeleton skeleton-line"></span>').join('')+'</div>';if(kind==='document')return'<div class="skeleton-document" role="status" aria-label="문서 내용 불러오는 중">'+hidden+Array.from({length:count},()=>'<span class="skeleton skeleton-line"></span>').join('')+'</div>';if(kind==='member')return'<div class="skeleton-stack" role="status" aria-label="멤버 목록 불러오는 중">'+hidden+Array.from({length:count},()=>'<div class="skeleton-member-row"><span class="skeleton skeleton-avatar"></span><span class="skeleton-lines"><i class="skeleton skeleton-line title"></i><i class="skeleton skeleton-line meta"></i></span><i class="skeleton skeleton-pill"></i></div>').join('')+'</div>';const rows=Array.from({length:count},()=>'<div class="skeleton-list-row"><span class="skeleton-lines"><i class="skeleton skeleton-line title"></i><i class="skeleton skeleton-line meta"></i></span><i class="skeleton skeleton-pill"></i></div>').join('');return'<div class="'+(kind==='search'?'global-search-skeleton':'skeleton-stack')+'" role="status" aria-label="목록 불러오는 중">'+hidden+rows+'</div>'}
function showLoading(id,kind,count){const container=$(id);container.setAttribute('aria-busy','true');container.innerHTML=loadingMarkup(kind,count)}
function finishLoading(id){$(id).removeAttribute('aria-busy')}
function setLoadButton(id,loading){const button=$(id);button.disabled=loading;button.classList.toggle('loading-indicator',loading);button.setAttribute('aria-busy',loading?'true':'false')}
const icon=(name,className='ui-icon')=>'<svg class="'+className+'" aria-hidden="true"><use href="#icon-'+name+'"></use></svg>';
const starIcon=()=>icon('star','star-icon');
const blockIconName={text:'type',heading1:'type',heading2:'type',heading3:'type',heading4:'type',heading5:'type',heading6:'type',bullet:'list',numbered:'list-ordered',todo:'check-square',toggle:'chevron-right',quote:'quote',callout:'alert',code:'code',divider:'minus',table:'list',database:'files',toc:'list',math:'type',bookmark:'star',image:'files',video:'files',audio:'files',file:'files',embed:'code',page_link:'files'};
function setFavoriteButton(button,value){const label=value?'즐겨찾기 해제':'즐겨찾기 추가';button.innerHTML=starIcon();button.classList.add('favorite-toggle');button.classList.toggle('active',value);button.setAttribute('aria-label',label);button.dataset.tooltip=label}
const roleLabel={owner:'Owner',admin:'Admin',member:'Member',viewer:'Viewer'};
const blockLabels=[
  ['text','T','일반 텍스트','기본 문단','기본 블록'],
  ['heading1','H1','제목 1','큰 제목','기본 블록'],
  ['heading2','H2','제목 2','중간 제목','기본 블록'],
  ['heading3','H3','제목 3','작은 제목','기본 블록'],
  ['heading4','H4','제목 4','가장 작은 제목','기본 블록'],
  ['heading5','H5','제목 5','작은 제목','기본 블록'],
  ['heading6','H6','제목 6','가장 작은 제목','기본 블록'],
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
function syncCreateDocumentButtons(){document.querySelectorAll('[data-create-document]').forEach(button=>{button.hidden=!canEdit()})}
async function api(path,options={}){const config={credentials:'same-origin',headers:{accept:'application/json',...(options.headers||{})},...options};if(config.body&&typeof config.body!=='string'){config.headers['content-type']='application/json';config.body=JSON.stringify(config.body)}const response=await fetch(path,config);let data={};try{data=await response.json()}catch{}if(!response.ok){const error=new Error(data.error||'요청을 처리하지 못했습니다.');error.status=response.status;error.details=data;throw error}return data}
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').hidden=true,2600)}
function alertBox(id,message){const el=$(id);el.textContent=message;el.hidden=!message}
function busy(form,value){for(const el of form.elements)el.disabled=value}
function inviteToken(){const match=location.pathname.match(/^\/invite\/([A-Za-z0-9_-]{32,128})$/);return match&&match[1]}
function showAuth(){state.user=null;$('boot-view').hidden=true;$('setup-view').hidden=true;$('app-view').hidden=true;$('auth-view').hidden=false;const token=inviteToken();$('login-form').hidden=!!token;$('signup-form').hidden=true;$('invite-form').hidden=!token;$('open-signup').hidden=!!token||!state.publicSignup;$('login-policy-note').textContent=state.publicSignup?'초대가 없어도 새 계정을 만들 수 있습니다.':'새 계정은 멤버 초대를 통해서만 만들 수 있습니다.';if(token)loadInvitePreview(token)}
function showSetup(){state.user=null;$('boot-view').hidden=true;$('auth-view').hidden=true;$('app-view').hidden=true;$('setup-view').hidden=false;if(location.pathname!=='/setup')history.replaceState({},'','/setup');setTimeout(()=>$('setup-form').elements.username.focus(),0)}
async function loadInvitePreview(token){try{const data=await api('/api/invitations/'+encodeURIComponent(token));$('invite-summary').textContent=data.email_hint+' 주소로 보낸 '+roleLabel[data.role]+' 초대입니다. '+new Date(data.expires_at*1000).toLocaleString()+'까지 유효합니다.'}catch(error){alertBox('invite-alert',error.message);for(const el of $('invite-form').elements)el.disabled=true}}
$('login-form').addEventListener('submit',async(event)=>{event.preventDefault();const formEl=event.currentTarget;const form=new FormData(formEl);alertBox('auth-alert','');busy(formEl,true);try{const data=await api('/api/login',{method:'POST',body:{username:form.get('username'),password:form.get('password')}});enterApp(data)}catch(error){alertBox('auth-alert',error.message)}finally{busy(formEl,false)}});
$('open-signup').onclick=()=>{$('login-form').hidden=true;$('signup-form').hidden=false;$('signup-form').elements.username.focus()};$('back-to-login').onclick=()=>{$('signup-form').hidden=true;$('login-form').hidden=false};
$('signup-form').addEventListener('submit',async(event)=>{event.preventDefault();const formEl=event.currentTarget;const form=new FormData(formEl);const password=String(form.get('password')||'');alertBox('signup-alert','');if(password!==String(form.get('password_confirmation')||'')){alertBox('signup-alert','비밀번호 확인이 일치하지 않습니다.');return}busy(formEl,true);try{const data=await api('/api/register',{method:'POST',body:{username:form.get('username'),password,password_confirmation:form.get('password_confirmation')}});history.replaceState({},'','/');enterApp(data);toast('JoripNote 계정을 만들었습니다.')}catch(error){alertBox('signup-alert',error.message)}finally{busy(formEl,false)}});
$('invite-form').addEventListener('submit',async(event)=>{event.preventDefault();const formEl=event.currentTarget;const form=new FormData(formEl);alertBox('invite-alert','');busy(formEl,true);try{const data=await api('/api/invitations/'+encodeURIComponent(inviteToken())+'/accept',{method:'POST',body:{username:form.get('username'),password:form.get('password')}});history.replaceState({},'', '/');enterApp(data)}catch(error){alertBox('invite-alert',error.message);busy(formEl,false)}});
$('setup-form').addEventListener('submit',async(event)=>{event.preventDefault();const formEl=event.currentTarget;const form=new FormData(formEl);const password=String(form.get('password')||'');alertBox('setup-alert','');if(password!==String(form.get('password_confirmation')||'')){alertBox('setup-alert','비밀번호 확인이 일치하지 않습니다.');return}busy(formEl,true);try{const data=await api('/api/setup',{method:'POST',body:{username:form.get('username'),password,password_confirmation:form.get('password_confirmation')}});history.replaceState({},'','/');enterApp(data);toast('JoripNote 설치를 완료했습니다.')}catch(error){if(error.status===409){history.replaceState({},'','/');showAuth();toast('이미 설치가 완료된 공간입니다.')}else alertBox('setup-alert',error.message)}finally{busy(formEl,false)}});
$('logout-button').addEventListener('click',async()=>{if(state.dirty&&!confirm('저장되지 않은 변경사항이 있습니다. 로그아웃할까요?'))return;await api('/api/logout',{method:'POST'}).catch(()=>{});history.replaceState({},'','/');showAuth()});
async function auditLinksByAgent(){try{const data=await api('/api/import/notion-api/audit?links=1');const output=document.createElement('pre');output.id='agent-audit-output';output.style.cssText='white-space:pre-wrap;max-height:70vh;overflow:auto;padding:24px;margin:24px;border:1px solid #e5e7eb;border-radius:12px;background:#fff;font:14px/1.5 ui-monospace,monospace';output.textContent=JSON.stringify(data,null,2);document.body.append(output)}catch(error){toast('링크 전수감사 실패: '+String(error?.message||'알 수 없는 오류'))}}
async function bootstrap(){const publicMatch=location.pathname.match(/^\/public\/([A-Za-z0-9_-]{8,80})$/);if(publicMatch){await openPublicDocument(publicMatch[1]);return}const params=new URLSearchParams(location.search),agentAction=params.get('agent_action');try{const [setupResult,meResult]=await Promise.allSettled([api('/api/setup-status'),api('/api/me')]);if(setupResult.status==='rejected')throw setupResult.reason;const setup=setupResult.value;state.publicSignup=!!setup.public_signup_enabled;state.demoMode=!!setup.demo_mode;const banner=$('demo-banner');if(banner)banner.hidden=!state.demoMode;if(!setup.installed){showSetup();return}if(meResult.status==='rejected')throw meResult.reason;if(location.pathname==='/setup')history.replaceState({},'','/');const data=meResult.value;enterApp(data);if(state.demoMode){const role=roleLabel[state.role]||state.role;$('profile-role').textContent=role+' · 데모';$('sidebar-role').textContent=role+' · 데모'}if(agentAction==='notion-import'&&canManage())setTimeout(importAllFromNotionApi,0);if(agentAction==='notion-import-source'&&canManage()){const sourceId=String(params.get('source')||'').replaceAll('-','').toLowerCase();if(/^[0-9a-f]{32}$/.test(sourceId))setTimeout(()=>importNotionApiSourceByAgent(sourceId),0)}if(agentAction==='notion-link-audit'&&canManage())setTimeout(auditLinksByAgent,0)}catch(error){if(error.status===401)showAuth();else{showAuth();alertBox('auth-alert',error.message)}}}
function enterApp(data){state.user=data.user;state.role=data.membership.role;$('boot-view').hidden=true;$('setup-view').hidden=true;$('auth-view').hidden=true;$('public-view').hidden=true;$('app-view').hidden=false;$('profile-name').textContent=data.user.username;$('profile-avatar').textContent=data.user.username.slice(0,1).toUpperCase();$('profile-role').textContent=roleLabel[state.role];$('sidebar-role').textContent=roleLabel[state.role];$('new-root-document').hidden=!canEdit();$('list-new-document').hidden=!canEdit();$('duplicate-button').hidden=!canEdit();$('notion-import-button').hidden=!canEdit();$('notion-zip-import-button').hidden=!canManage();$('publish-button').hidden=!canManage();$('open-invite').hidden=!canManage();$('members-permission').hidden=canManage();$('new-template-button').hidden=!canEdit();applySpaceProfile(data.workspace);let collapsed=false;let documentWidth='default';try{collapsed=localStorage.getItem('qwerty_sidebar_collapsed')==='1';documentWidth=localStorage.getItem('joripnote_document_width')||'default';state.listLayout=['list','grid','preview'].includes(localStorage.getItem('joripnote_list_layout'))?localStorage.getItem('joripnote_list_layout'):'list'}catch{}setSidebarCollapsed(collapsed,false);setDocumentWidth(documentWidth,false);setListLayout(state.listLayout,false);setInviteRoleOptions();loadTree();refreshNotificationBadge();routeFromLocation()}
function setInviteRoleOptions(){syncCreateDocumentButtons();const options=state.role==='owner'?[['admin','Admin'],['member','Member'],['viewer','Viewer']]:[['member','Member'],['viewer','Viewer']];$('invite-role').replaceChildren(...options.map(([value,label])=>{const el=document.createElement('option');el.value=value;el.textContent=label;return el}))}
function setSidebar(open){$('sidebar').classList.toggle('open',open);$('sidebar-backdrop').hidden=!open}
$('sidebar-open').onclick=()=>setSidebar(true);$('sidebar-close').onclick=()=>setSidebar(false);$('sidebar-backdrop').onclick=()=>setSidebar(false);
function setSidebarCollapsed(collapsed,persist=true){const label=collapsed?'사이드바 확대':'사이드바 축소';$('app-view').classList.toggle('sidebar-collapsed',collapsed);$('sidebar-collapse').innerHTML=icon(collapsed?'chevron-right':'chevron-left');$('sidebar-collapse').setAttribute('aria-label',label);$('sidebar-collapse').dataset.tooltip=label;if(persist)try{localStorage.setItem('qwerty_sidebar_collapsed',collapsed?'1':'0')}catch{}}
$('sidebar-collapse').onclick=()=>setSidebarCollapsed(!$('app-view').classList.contains('sidebar-collapsed'));
function setDocumentWidth(value,persist=true){const width=['narrow','default','full'].includes(value)?value:'default';$('app-view').classList.toggle('document-width-narrow',width==='narrow');$('app-view').classList.toggle('document-width-full',width==='full');document.querySelectorAll('[data-document-width]').forEach(button=>{const active=button.dataset.documentWidth===width;button.classList.toggle('active',active);button.setAttribute('aria-checked',active?'true':'false')});if(persist)try{localStorage.setItem('joripnote_document_width',width)}catch{}}
document.querySelectorAll('[data-document-width]').forEach(button=>button.onclick=()=>{setDocumentWidth(button.dataset.documentWidth);toast('문서 너비를 변경했습니다.')} );
function setListLayout(value,persist=true){const layout=['list','grid','preview'].includes(value)?value:'list';state.listLayout=layout;$('document-list').className='document-list layout-'+layout;document.querySelectorAll('[data-list-layout]').forEach(button=>{const active=button.dataset.listLayout===layout;button.classList.toggle('active',active);button.setAttribute('aria-pressed',active?'true':'false')});if(persist)try{localStorage.setItem('joripnote_list_layout',layout)}catch{}}
document.querySelectorAll('[data-list-layout]').forEach(button=>button.onclick=()=>setListLayout(button.dataset.listLayout));
function applySpaceProfile(profile={}){const mode=profile?.space_mode==='personal'?'personal':'team';const name=String(profile?.space_name||'JoripNote').trim().slice(0,40)||'JoripNote';state.workspaceSettings={...(state.workspaceSettings||{}),...profile,space_mode:mode,space_name:name};$('app-view').classList.toggle('space-mode-personal',mode==='personal');$('app-view').classList.toggle('space-mode-team',mode==='team');$('workspace-display-name').textContent=name;$('workspace-avatar').textContent=name.slice(0,1).toUpperCase();$('mobile-workspace-name').textContent=name;$('breadcrumb-home').textContent=name;$('list-space-name').textContent=name}
document.querySelectorAll('[data-view]').forEach((button)=>button.addEventListener('click',()=>button.dataset.view==='search'?openGlobalSearch():navigateView(button.dataset.view)));
document.addEventListener('click',event=>{const button=event.target.closest?.('[data-create-document]');if(!button||!canEdit())return;event.preventDefault();event.stopPropagation();createDocument()});
$('workspace-home').onclick=()=>navigateView('all');$('breadcrumb-home').onclick=()=>navigateView('all');
function push(path){setSidebar(false);const doc=String(path).match(/^\/doc\/([A-Za-z0-9_-]{8,80})$/);if(doc){openDocument(doc[1],true);return}history.pushState({},'',path);routeFromLocation()}
function navigateView(view){setSidebar(false);push(view==='all'?'/':'/'+view)}
window.addEventListener('popstate',routeFromLocation);
function routeFromLocation(){if(!state.user)return;const doc=location.pathname.match(/^\/doc\/([A-Za-z0-9_-]{8,80})$/);if(doc){openDocument(doc[1],false).then(()=>repairNotionDocumentFromLocation(doc[1]));return}const view=location.pathname.slice(1)||'all';if(['recent','favorites','all','trash','search'].includes(view)){showList(view);return}if(view==='members'){showMembers();return}if(view==='settings'){showSettings();return}if(view==='notifications'){showNotifications();return}if(view==='templates'){showTemplates();return}showList('all')}
async function repairNotionDocumentFromLocation(documentId){const params=new URLSearchParams(location.search);if(params.get('notion_repair')!=='1')return;params.delete('notion_repair');history.replaceState({},'',location.pathname+(params.size?'?'+params.toString():''));const match=String(documentId).match(/^doc_notion_([0-9a-f]{32})$/i);if(!match)return;try{await api('/api/import/notion-api/pages/'+match[1],{method:'POST',body:{}});state.current=null;await openDocument(documentId,false);toast('Notion 원본에서 문서를 다시 가져왔습니다.')}catch(error){toast(error.message)}}
async function importMissingNotionPage(documentId,error){const match=String(documentId).match(/^doc_notion_([0-9a-f]{32})$/i);if(!match||error?.status!==404||!canManage()||state.notionRepairAttempted.has(documentId))return false;state.notionRepairAttempted.add(documentId);await api('/api/import/notion-api/pages/'+match[1],{method:'POST',body:{}});return true}
function needsAutomaticNotionRepair(document){return canManage()&&/^doc_notion_[0-9a-f]{32}$/i.test(String(document?.id||''))&&!state.notionRepairAttempted.has(document.id)&&(document.blocks||[]).some(block=>/<(?:unknown|mention-page|database|columns?|empty-block)\b/i.test(String(block.content||'')))}
async function repairLegacyNotionDocument(document){const match=String(document.id).match(/^doc_notion_([0-9a-f]{32})$/i);if(!match)return false;state.notionRepairAttempted.add(document.id);await api('/api/import/notion-api/pages/'+match[1],{method:'POST',body:{}});return true}
async function importMissingNotionDatabase(documentId,error){const match=String(documentId).match(/^doc_notiondb_([0-9a-f]{32})$/i);if(!match||error?.status!==404||!canManage()||state.notionRepairAttempted.has(documentId))return false;state.notionRepairAttempted.add(documentId);await api('/api/import/notion-api/data-sources/'+match[1],{method:'POST',body:{}});return true}
function markNav(view){document.querySelectorAll('[data-view]').forEach((el)=>el.classList.toggle('active',el.dataset.view===view))}
function showPane(id){['editor-view','list-view','members-view','settings-view','notifications-view','templates-view'].forEach((name)=>$(name).hidden=name!==id)}
const listCopy={all:['모든 문서','이 공간의 최상위 문서입니다.'],recent:['최근 문서','최근에 열어본 문서입니다.'],favorites:['즐겨찾기','자주 찾는 문서를 모았습니다.'],trash:['휴지통','삭제한 문서를 복구하거나 영구 삭제할 수 있습니다.'],search:['문서 검색','문서 제목과 블록 내용에서 찾습니다.']};
async function showList(view){if(state.dirty&&!await flushSave())return;state.current=null;state.view=view;state.cursor=null;if(view==='search'){state.search=(new URLSearchParams(location.search).get('q')||'').trim().slice(0,80);$('search-input').value=state.search}else state.search='';markNav(view);showPane('list-view');$('list-title').textContent=listCopy[view][0];$('list-description').textContent=listCopy[view][1];$('search-form').hidden=view!=='search';$('list-controls').hidden=view!=='all';$('list-new-document').hidden=!canEdit()||view==='trash';$('list-filter-query').value=state.listQuery;$('list-kind-filter').value=state.listKind;$('list-sort').value=state.listSort;setListLayout(state.listLayout,false);$('document-list').replaceChildren();$('load-more-documents').hidden=true;await loadDocumentList(false);if(view==='search')$('search-input').focus()}
async function loadDocumentList(append){alertBox('list-alert','');if(!append)showLoading('document-list','list',5);else setLoadButton('load-more-documents',true);const params=new URLSearchParams({scope:state.view,limit:'20'});if(state.cursor)params.set('cursor',state.cursor);if(state.view==='search'&&state.search)params.set('q',state.search);if(state.view==='all'){if(state.listQuery)params.set('q',state.listQuery);params.set('kind',state.listKind);params.set('sort',state.listSort)}try{const data=await api('/api/documents?'+params);if(!append)$('document-list').replaceChildren();setListLayout(state.listLayout,false);for(const doc of data.documents.filter(item=>!isImportArtifactDoc(item)))$('document-list').append(renderDocumentCard(doc));state.cursor=data.next_cursor;$('load-more-documents').hidden=!state.cursor;if(!$('document-list').children.length)$('document-list').innerHTML='<div class="empty-state"><strong>표시할 문서가 없습니다.</strong><span>'+(state.view==='trash'?'휴지통이 비어 있습니다.':'필터를 바꾸거나 새 문서를 만들어 보세요.')+'</span></div>'}catch(error){alertBox('list-alert',error.message);if(!append)$('document-list').replaceChildren()}finally{finishLoading('document-list');setLoadButton('load-more-documents',false)}}
$('load-more-documents').onclick=()=>loadDocumentList(true);
$('search-form').onsubmit=(event)=>{event.preventDefault();state.search=$('search-input').value.trim().slice(0,80);state.cursor=null;const next='/search'+(state.search?'?q='+encodeURIComponent(state.search):'');if(location.pathname+location.search!==next)history.pushState({},'',next);loadDocumentList(false)};
function refreshAllDocuments(){state.cursor=null;loadDocumentList(false)}
$('list-filter-query').oninput=()=>{clearTimeout(state.listFilterTimer);state.listFilterTimer=setTimeout(()=>{state.listQuery=$('list-filter-query').value.trim().slice(0,80);refreshAllDocuments()},220)};
$('list-kind-filter').onchange=()=>{state.listKind=$('list-kind-filter').value;refreshAllDocuments()};
$('list-sort').onchange=()=>{state.listSort=$('list-sort').value;refreshAllDocuments()};
function listPreviewText(doc){const raw=String(doc.preview||'').trim();if(!raw)return doc.has_database?'표, 보드, 캘린더 등 여러 보기로 관리하는 데이터베이스입니다.':'본문 미리보기가 없습니다.';if(raw.startsWith('@qwerty-rich:')){const box=document.createElement('div');box.innerHTML=sanitizeRichHtml(raw.slice(13));return (box.textContent||'').replace(/\s+/g,' ').trim()}if(/^[\[{]/.test(raw))return doc.has_database?'데이터베이스 보기와 속성이 포함되어 있습니다.':'';return raw.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}
function renderDocumentCard(doc){const row=document.createElement('article');row.className='document-card';const main=document.createElement('div');main.className='document-card-main';const glyph=document.createElement('span');glyph.className='document-card-icon';glyph.innerHTML=icon(doc.has_database?'grid':'files');const open=document.createElement('button');open.className='doc-open';open.type='button';const copy=document.createElement('div');copy.className='document-card-copy';const title=document.createElement('strong');title.textContent=doc.title||'제목 없음';const meta=document.createElement('small');meta.className='document-card-meta';const kind=document.createElement('span');kind.className='document-kind';kind.textContent=doc.has_database?'데이터베이스':doc.is_notion_import?'가져온 문서':'문서';const updated=document.createElement('span');updated.textContent='수정 '+formatDate(doc.updated_at);meta.append(kind,updated);const preview=document.createElement('p');preview.className='document-card-preview';preview.textContent=listPreviewText(doc);copy.append(title,meta,preview);open.append(copy);open.onclick=()=>push('/doc/'+doc.id);main.append(glyph,open);const actions=document.createElement('div');actions.className='card-actions';if(doc.status==='trashed'){if(canEdit()){actions.append(actionButton('복구',()=>restoreDoc(doc.id)),actionButton('영구 삭제',()=>deleteForever(doc.id),true))}}else{const favorite=actionButton('',()=>toggleFavorite(doc.id,!doc.is_favorite));setFavoriteButton(favorite,!!doc.is_favorite);actions.append(favorite);if(canEdit())actions.append(iconAction('trash','휴지통으로 이동',()=>moveToTrash(doc.id),'list-trash'))}row.append(main,actions);return row}
function isImportArtifactDoc(doc){return /_all$/i.test(String(doc?.title||''))}
function actionButton(label,handler,danger=false){const button=document.createElement('button');button.type='button';button.className='button subtle compact'+(danger?' danger-text':'');button.textContent=label;button.onclick=handler;return button}
function iconAction(name,label,handler,className=''){const button=document.createElement('button');button.type='button';button.className='icon-button '+className;button.innerHTML=icon(name);button.setAttribute('aria-label',label);button.dataset.tooltip=label;button.onclick=handler;return button}
function formatDate(seconds){return new Date(seconds*1000).toLocaleString('ko-KR',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
async function createDocument(parentId=null){if(!canEdit())return;try{const data=await api('/api/documents',{method:'POST',body:{parent_document_id:parentId}});await loadTree();push('/doc/'+data.document.id)}catch(error){toast(error.message)}}
$('new-root-document').onclick=()=>createDocument();$('list-new-document').onclick=()=>createDocument();$('new-child-button').onclick=()=>state.current&&createDocument(state.current.id);
$('duplicate-button').onclick=()=>state.current&&duplicateDocument(state.current.id);
async function duplicateDocument(id){if(!canEdit())return;try{const data=await api('/api/documents/'+id+'/duplicate',{method:'POST'});await loadTree();push('/doc/'+data.document.id);toast('문서를 복제했습니다.')}catch(error){toast(error.message)}}
function sidebarTeamspaces(documents){const selected=new Map();for(const doc of documents){if(!doc.is_notion_import||isImportArtifactDoc(doc)||/^(Notion 데이터베이스|데이터베이스 테스트|새 양식)$/i.test(String(doc.title||'').trim()))continue;if(!doc.is_notion_root&&Number(doc.child_count||0)<8)continue;const key=String(doc.title||'제목 없음').replace(/\s*\(\d+\)$/,'').normalize('NFKC').trim().toLowerCase();const current=selected.get(key);const score=(doc.is_notion_root?100000:0)+Number(doc.child_count||0);if(!current||score>current.score)selected.set(key,{doc,score})}const preferred=['문서','작업 목록','회의록','아이디어','프로젝트','매뉴얼'];const rank=new Map(preferred.map((title,index)=>[title,index]));return [...selected.values()].map(item=>item.doc).sort((a,b)=>(rank.get(a.title)??999)-(rank.get(b.title)??999)||Number(b.child_count||0)-Number(a.child_count||0)||String(a.title).localeCompare(String(b.title),'ko'))}
async function loadTree(){const shared=$('document-tree');const personal=$('personal-tree');showLoading('document-tree','tree',5);personal.replaceChildren();try{const data=await api('/api/documents?scope=sidebar&limit=200');const visible=data.documents.filter(item=>!isImportArtifactDoc(item));shared.replaceChildren();if(state.workspaceSettings?.space_mode==='personal'){for(const doc of visible)personal.append(treeNode(doc,true))}else{for(const doc of sidebarTeamspaces(visible))shared.append(treeNode(doc,true));for(const doc of visible.filter(item=>!item.is_notion_import))personal.append(treeNode(doc,true))}}catch{shared.innerHTML='<div class="empty-state">사이드바를 불러오지 못했습니다.</div>'}finally{finishLoading('document-tree')}}
function sidebarDocumentIconName(title,root){if(!root)return 'files';const value=String(title||'');if(/작업 목록|캘린더|일정/.test(value))return 'calendar';if(/작업|프로젝트|미팅/.test(value))return 'users';if(/회의/.test(value))return 'comment';if(/아이디어/.test(value))return 'star';if(/매뉴얼\s*\(코드\)|정보|서버/.test(value))return 'code';if(/질문|FAQ/i.test(value))return 'alert';return 'files'}
function documentIconMarkup(doc,root=false){const emoji=String(doc?.page_icon_emoji||'').trim();if(emoji)return '<span class="'+(root?'document-page-icon-emoji':'sidebar-page-emoji')+'" aria-hidden="true">'+escapeText(emoji)+'</span>';const url=safeWebUrl(doc?.page_icon_url||'');if(url)return '<img class="'+(root?'document-page-icon-image':'sidebar-page-icon')+'" src="'+escapeText(url)+'" alt="" loading="lazy" decoding="async" aria-hidden="true">';return icon(sidebarDocumentIconName(doc?.title,root),root?'document-page-icon-svg':'sidebar-doc-icon')}
function treeNode(doc,root=false){const wrap=document.createElement('div');wrap.dataset.id=doc.id;const row=document.createElement('div');row.className='tree-row'+(doc.has_children?' has-children':'')+(state.current&&state.current.id===doc.id?' active':'');const toggle=doc.has_children?document.createElement('button'):null;if(toggle){toggle.className='tree-toggle';toggle.type='button';const expanded=state.expanded.has(doc.id);toggle.innerHTML=icon('chevron-right');toggle.classList.toggle('expanded',expanded);toggle.setAttribute('aria-label',expanded?'하위 문서 접기':'하위 문서 펼치기');toggle.setAttribute('aria-expanded',expanded?'true':'false');toggle.dataset.tooltip=expanded?'하위 문서 접기':'하위 문서 펼치기';toggle.onclick=()=>toggleTree(doc,wrap,toggle)}const glyph=document.createElement('span');glyph.className='sidebar-glyph';glyph.setAttribute('aria-hidden','true');glyph.innerHTML=documentIconMarkup(doc,root);const title=document.createElement('button');title.className='tree-title';title.type='button';title.textContent=doc.title||'제목 없음';title.title=title.textContent;title.onclick=()=>push('/doc/'+doc.id);title.onkeydown=event=>{if(event.key==='ContextMenu'||(event.shiftKey&&event.key==='F10')){event.preventDefault();const rect=title.getBoundingClientRect();showTreeMenu(doc,row,rect.left+18,rect.bottom)}};row.oncontextmenu=event=>{event.preventDefault();showTreeMenu(doc,row,event.clientX,event.clientY)};if(toggle)row.append(toggle);row.append(glyph,title);wrap.append(row);if(toggle&&state.expanded.has(doc.id))loadTreeChildren(doc.id,wrap,toggle);return wrap}
function hideTreeMenu(){$('tree-menu').hidden=true;state.treeContextDoc=null;state.treeContextRow=null}
function treeMenuButton(label,iconName,action,danger=false){const button=document.createElement('button');button.type='button';button.role='menuitem';button.innerHTML=icon(iconName)+'<span>'+escapeText(label)+'</span>';if(danger)button.classList.add('danger-text');button.onclick=()=>runTreeMenuAction(action);return button}
function showTreeMenu(doc,row,x,y){state.treeContextDoc=doc;state.treeContextRow=row;hideSlashMenu();hideBlockMenu();hideUrlPasteMenu();const menu=$('tree-menu');const items=[treeMenuButton('문서 열기','files','open')];if(canEdit())items.push(separator(),treeMenuButton('하위 문서 추가','plus','add-child'),treeMenuButton('문서 복제','copy','duplicate'),separator(),treeMenuButton('휴지통으로 이동','trash','trash',true));menu.replaceChildren(...items);menu.hidden=false;const width=menu.offsetWidth;const height=menu.offsetHeight;menu.style.left=Math.max(8,Math.min(x,innerWidth-width-8))+'px';menu.style.top=Math.max(8,Math.min(y,innerHeight-height-8))+'px';menu.querySelector('button')?.focus();menu.onkeydown=event=>{const buttons=[...menu.querySelectorAll('button')];const index=buttons.indexOf(document.activeElement);if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();buttons[(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus()}else if(event.key==='Escape'){event.preventDefault();hideTreeMenu();row.querySelector('.tree-title')?.focus()}}}
async function runTreeMenuAction(action){const doc=state.treeContextDoc;if(!doc)return hideTreeMenu();const id=doc.id;hideTreeMenu();if(action==='open')push('/doc/'+id);else if(action==='add-child')await createDocument(id);else if(action==='duplicate')await duplicateDocument(id);else if(action==='trash')await moveToTrash(id)}
async function toggleTree(doc,wrap,toggle){if(!doc.has_children)return;if(state.expanded.has(doc.id)){state.expanded.delete(doc.id);wrap.querySelector('.tree-children')?.remove();toggle.classList.remove('expanded');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','하위 문서 펼치기');toggle.dataset.tooltip='하위 문서 펼치기'}else{state.expanded.add(doc.id);toggle.classList.add('expanded');toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','하위 문서 접기');toggle.dataset.tooltip='하위 문서 접기';await loadTreeChildren(doc.id,wrap,toggle)}}
async function loadTreeChildren(parentId,wrap,toggle){if(state.treeLoading.has(parentId)||wrap.querySelector('.tree-children'))return;state.treeLoading.add(parentId);const children=document.createElement('div');children.className='tree-children';children.setAttribute('aria-busy','true');children.innerHTML=loadingMarkup('tree',3);wrap.append(children);try{const data=await api('/api/documents?scope=all&parent_id='+encodeURIComponent(parentId)+'&limit=50');children.replaceChildren();for(const doc of data.documents.filter(item=>!isImportArtifactDoc(item)))children.append(treeNode(doc));children.removeAttribute('aria-busy')}catch{children.remove();toggle.innerHTML=icon('alert');toggle.setAttribute('aria-label','하위 문서를 불러오지 못함');toggle.dataset.tooltip='하위 문서를 불러오지 못했습니다'}finally{state.treeLoading.delete(parentId)}}
function resizeDocumentTitle(){const title=$('document-title');title.style.height='0px';title.style.height=title.scrollHeight+'px'}
async function openDocument(id,pushUrl=true){if(state.current&&state.current.id===id){showPane('editor-view');return}if(state.dirty&&!await flushSave())return;if(pushUrl)history.pushState({},'','/doc/'+id);markNav('');showPane('editor-view');$('document-page-icon').hidden=true;const title=$('document-title');$('editor-view').classList.remove('database-page');$('document-page-icon').innerHTML=icon('files','document-page-icon-svg');title.value='';title.readOnly=true;title.classList.add('skeleton-title');showLoading('block-editor','document',5);$('append-block').hidden=true;try{const data=await api('/api/documents/'+id);state.current=data.document;if(needsAutomaticNotionRepair(state.current)){await repairLegacyNotionDocument(state.current);state.current=null;await openDocument(id,false);toast('이전 Notion 문서 형식을 자동 교정했습니다.');return}state.dirty=false;title.value=state.current.title;$('document-page-icon').innerHTML=documentIconMarkup(state.current,true);$('editor-view').classList.toggle('database-page',(state.current.blocks||[]).some(block=>block.type==='database'));resizeDocumentTitle();$('breadcrumb-title').textContent=state.current.title||'제목 없음';setFavoriteButton($('favorite-button'),!!state.current.is_favorite);$('readonly-notice').hidden=canEdit();$('readonly-notice').textContent=state.current.can_edit===false?'이 문서는 보기 권한만 있습니다.':'Viewer 권한에서는 문서를 읽을 수만 있습니다.';title.readOnly=!canEdit();$('append-block').hidden=!canEdit();$('new-child-button').hidden=!canEdit();$('trash-button').hidden=!canEdit();$('duplicate-button').hidden=!canEdit();$('upload-button').hidden=!canEdit();$('access-button').hidden=!state.current.can_manage_access;renderBlocks(state.current.blocks);$('document-page-icon').hidden=false;resetHistory();setSaveState('saved');document.querySelectorAll('.tree-row').forEach(el=>el.classList.remove('active'));document.querySelector('[data-id="'+CSS.escape(id)+'"]>.tree-row')?.classList.add('active')}catch(error){state.current=null;$('editor-view').classList.remove('database-page');try{if(await importMissingNotionDatabase(id,error)){await openDocument(id,false);toast('연결된 Notion 데이터베이스를 가져왔습니다.');return}if(await importMissingNotionPage(id,error)){await openDocument(id,false);toast('연결된 Notion 페이지를 가져왔습니다.');return}}catch(importError){error=importError}const notionId=String(id).match(/^doc_notion(?:db)?_([0-9a-f]{32})$/i)?.[1];const fallback=notionId?'<a class="button secondary" href="https://www.notion.so/'+notionId+'" target="_blank" rel="noopener noreferrer">원본 Notion에서 열기</a>':'';$('block-editor').innerHTML='<div class="empty-state"><strong>문서를 열 수 없습니다.</strong><span>'+escapeText(error.message)+'</span>'+fallback+'</div>';setSaveState('failed')}finally{title.classList.remove('skeleton-title');finishLoading('block-editor')}}
function escapeText(value){const el=document.createElement('span');el.textContent=value;return el.innerHTML}
function updateDocumentChrome(value){const label=value.trim()||'제목 없음';$('breadcrumb-title').textContent=label;const treeTitle=document.querySelector('[data-id="'+CSS.escape(state.current.id)+'"]>.tree-row .tree-title');if(treeTitle){treeTitle.textContent=label;treeTitle.title=label}}
$('document-title').addEventListener('input',()=>{if(!state.current||!canEdit())return;resizeDocumentTitle();updateDocumentChrome($('document-title').value);scheduleSave()});
$('favorite-button').onclick=()=>state.current&&toggleFavorite(state.current.id,!state.current.is_favorite);
async function toggleFavorite(id,value){try{await api('/api/documents/'+id+'/favorite',{method:value?'PUT':'DELETE'});if(state.current&&state.current.id===id){state.current.is_favorite=value;setFavoriteButton($('favorite-button'),value)}if(['favorites','all','recent'].includes(state.view)&&!$('list-view').hidden)showList(state.view);toast(value?'즐겨찾기에 추가했습니다.':'즐겨찾기에서 해제했습니다.')}catch(error){toast(error.message)}}
$('trash-button').onclick=()=>state.current&&moveToTrash(state.current.id,true);
async function moveToTrash(id,openTrash=false){if(!confirm('이 문서를 휴지통으로 이동할까요? 하위 문서도 함께 이동합니다.'))return;try{await api('/api/documents/'+id+'/trash',{method:'POST'});if(state.current&&state.current.id===id){state.current=null;state.dirty=false;openTrash=true}await loadTree();if(openTrash)navigateView('trash');else if(!$('list-view').hidden)await showList(state.view);toast('문서를 휴지통으로 이동했습니다.')}catch(error){toast(error.message)}}
async function restoreDoc(id){try{await api('/api/documents/'+id+'/restore',{method:'POST'});await loadTree();showList('trash');toast('문서를 복구했습니다.')}catch(error){toast(error.message)}}
async function deleteForever(id){if(!confirm('문서와 하위 문서를 영구 삭제합니다. 되돌릴 수 없습니다.'))return;try{await api('/api/documents/'+id,{method:'DELETE'});showList('trash');toast('문서를 영구 삭제했습니다.')}catch(error){toast(error.message)}}
function mergeDatabaseBlocksForDisplay(blocks){
  const merged=[];
  for(const block of blocks||[]){
    if(block?.type!=='database'){
      merged.push(block);
      continue;
    }
    let model;
    try{model=JSON.parse(block.content)}catch{model=null}
    const sourceId=String(model?.source_id||'');
    const previous=merged.at(-1);
    let previousModel=null;
    if(previous?.type==='database'&&Array.isArray(previous.__database_chunks)){
      try{previousModel=JSON.parse(previous.content)}catch{}
    }
    if(!sourceId||!previousModel||String(previousModel.source_id||'')!==sourceId){
      const copy={...block};
      copy.__database_chunks=model?.version===3?[model]:null;
      merged.push(copy);
      continue;
    }
    previous.__database_chunks.push(model);
    previous.content=JSON.stringify({...previousModel,rows:[...(previousModel.rows||[]),...(model.rows||[])]});
  }
  return merged;
}
function normalizeImportedBlock(block){if(!block||block.type!=='text')return[block];const raw=String(block.content||'').trim();if(!/^</.test(raw))return[block];const template=document.createElement('template');template.innerHTML=raw;const nodes=[...template.content.childNodes].filter(node=>node.nodeType!==3||node.textContent.trim());if(nodes.length!==1||nodes[0].nodeType!==1)return[block];const node=nodes[0],tag=node.tagName.toLowerCase(),rich=value=>RICH_PREFIX+sanitizeRichHtml(value);if(/^h[1-6]$/.test(tag))return[{...block,type:'heading'+tag.slice(1),content:rich(node.innerHTML)}];if(tag==='table'){const rows=[...node.querySelectorAll('tr')].map(row=>[...row.children].map(cell=>cell.textContent.trim())).filter(row=>row.length);return[{...block,type:'table',content:JSON.stringify(rows)}]}if(tag==='p'||tag==='div'||tag==='blockquote')return[{...block,type:tag==='blockquote'?'quote':'text',content:rich(node.innerHTML)}];if(tag==='pre')return[{...block,type:'code',content:node.textContent||''}];if(tag==='hr')return[{...block,type:'divider',content:''}];if(tag==='ul'||tag==='ol'){return[...node.children].filter(item=>item.tagName?.toLowerCase()==='li').map((item,index)=>{const text=item.textContent||'',todo=text.match(/^\s*\[([ xX])\]\s*/);return{...block,id:block.id+'_'+index,type:todo?'todo':tag==='ol'?'numbered':'bullet',content:rich(todo?item.innerHTML.replace(/^\s*\[([ xX])\]\s*/,''):item.innerHTML),checked:todo?todo[1].toLowerCase()==='x':false}})}return[block]}
function legacyLineIndent(line){let count=0,width=0;while(count<line.length&&(line[count]===' '||line[count]==='\t')){width+=line[count]==='\t'?2:1;count+=1}return{count,level:Math.min(4,Math.floor(width/2))}}
function parseLegacyMarkdownBlocks(lines){const blocks=[],tick=String.fromCharCode(96).repeat(3);let code=null;const push=(type,content='',checked=false,indent_level=0)=>blocks.push({type,content:String(content).trimEnd(),checked,indent_level});for(const source of lines){for(const line of String(source||'').split('\n')){const leading=legacyLineIndent(line),value=line.slice(leading.count),trimmed=value.trim();if(trimmed.startsWith(tick)||trimmed.startsWith('~~~')){const marker=trimmed.startsWith(tick)?tick:'~~~',rest=trimmed.slice(marker.length).trim();if(code===null)code={marker,indent:leading.count,indent_level:leading.level,lines:[]};else if(marker===code.marker&&!rest){push('code',code.lines.join('\n'),false,code.indent_level);code=null}else if(code!==null)code.lines.push(line.slice(Math.min(code.indent,line.length)));continue}if(code!==null){code.lines.push(line.slice(Math.min(code.indent,line.length)));continue}if(!trimmed)continue;let heading=0;while(heading<value.length&&value[heading]==='#')heading+=1;if(heading&&value[heading]===' '&&heading<=6){push('heading'+heading,value.slice(heading+1),false,leading.level);continue}const list=value.length>1&&['-','*','+'].includes(value[0])&&value[1]===' ';if(list){const todo=value[2]==='['&&(value[3]===' '||String(value[3]).toLowerCase()==='x')&&value[4]===']'&&value[5]===' ';if(todo)push('todo',value.slice(6),String(value[3]).toLowerCase()==='x',leading.level);else push('bullet',value.slice(2),false,leading.level);continue}let digits=0;while(digits<value.length&&value.charCodeAt(digits)>=48&&value.charCodeAt(digits)<=57)digits+=1;if(digits&&['.',')'].includes(value[digits])&&value[digits+1]===' '){push('numbered',value.slice(digits+2),false,leading.level);continue}if(value[0]==='>'){push('quote',value.slice(value[1]===' '?2:1),false,leading.level);continue}if(trimmed.length>=3&&['-','*','_'].includes(trimmed[0])&&[...trimmed].every(char=>char===trimmed[0])){push('divider','',false,leading.level);continue}push('text',value,false,leading.level)}}if(code!==null)push('code',code.lines.join('\n'),false,code.indent_level);return blocks}
function isLegacyNotionJsonFragment(value){const raw=String(value||'');return /<br\s*\/?\s*>/i.test(raw)&&(/\\[{}]/.test(raw)||/"(?:result|success|status|meta|playback)"\s*:/.test(raw))}
function decodeLegacyNotionJson(value){return String(value||'').replace(/\\([{}])/g,'$1').replace(/<br\s*\/?>/gi,'\n').replace(/\\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim()}
function legacyNotionJsonRun(blocks,start){const first=blocks[start];if(first?.type!=='text'||!isLegacyNotionJsonFragment(first.content))return null;const parts=[];let end=start;let hasBookmark=false;while(end<blocks.length){const block=blocks[end];if(block?.type==='text')parts.push(String(block.content||''));else if(block?.type==='bookmark'&&end>start){parts.push(String(block.content||''));hasBookmark=true}else break;end+=1;const joined=parts.join('');if(end>start&&/\\}\s*$/.test(joined)&&/"success"\s*:\s*(?:true|false)/.test(joined))break}if(!parts.length||(!hasBookmark&&!/\\}\s*$/.test(parts.join(''))))return null;return{end,block:{...first,type:'code',content:decodeLegacyNotionJson(parts.join('')),checked:false}}}
function normalizeImportedBlocks(blocks){const normalized=[],tick=String.fromCharCode(96).repeat(3);for(let index=0;index<blocks.length;){if(blocks[index]?.type==='text'){let candidate=index;while(candidate<blocks.length&&blocks[candidate]?.type==='text'&&!isLegacyNotionJsonFragment(blocks[candidate].content))candidate+=1;if(candidate>index&&candidate<blocks.length&&isLegacyNotionJsonFragment(blocks[candidate].content)){normalized.push(...blocks.slice(index,candidate).flatMap(normalizeImportedBlock));index=candidate;continue}}const legacy=legacyNotionJsonRun(blocks,index);if(legacy){normalized.push(legacy.block);index=legacy.end;continue}if(blocks[index]?.type!=='text'){normalized.push(...normalizeImportedBlock(blocks[index++]));continue}let end=index;while(end<blocks.length&&blocks[end]?.type==='text')end+=1;const group=blocks.slice(index,end),hasLegacy=group.some(block=>{const value=String(block.content||'').trim();return value.startsWith(tick)||value.startsWith('~~~')||/^[0-9]+[.)] /.test(value)||['- ','* ','+ '].some(marker=>value.startsWith(marker))||/^#{1,6} /.test(value)});if(!hasLegacy){normalized.push(...group.flatMap(normalizeImportedBlock))}else{const parsed=parseLegacyMarkdownBlocks(group.map(block=>String(block.content||'')));if(parsed.length)normalized.push(...parsed.map((block,offset)=>({...block,id:offset?newBlock().id:group[0].id})));else normalized.push(...group.flatMap(normalizeImportedBlock))}index=end}return normalized}
function renderBlocks(blocks){$('block-editor').replaceChildren();const normalizedBlocks=normalizeImportedBlocks(blocks);const visibleBlocks=mergeDatabaseBlocksForDisplay(normalizedBlocks);(visibleBlocks.length?visibleBlocks:[newBlock()]).forEach((block,index)=>$('block-editor').append(blockRow(block,index)));syncLegacyToggleGroups($('block-editor'));renumberBlocks()}
function newBlock(type='text'){return{id:'blk_'+crypto.randomUUID().replaceAll('-',''),type,content:'',checked:false,indent_level:0}}
function codeBlock(block){
  const wrap=document.createElement('div');
  wrap.className='code-block-shell';
  wrap.dataset.codeBlock='true';
  const header=document.createElement('div');
  header.className='code-block-header';
  const label=document.createElement('span');
  label.className='code-block-label';
  label.textContent='코드';
  const copy=document.createElement('button');
  copy.type='button';
  copy.className='code-copy-button';
  copy.innerHTML=icon('copy')+'<span>복사</span>';
  copy.setAttribute('aria-label','코드 복사');
  copy.onclick=async()=>{
    const value=content.innerText||content.textContent||'';
    try{await navigator.clipboard.writeText(value);copy.classList.add('copied');copy.querySelector('span').textContent='복사됨';toast('코드를 복사했습니다.');setTimeout(()=>{if(copy.isConnected){copy.classList.remove('copied');copy.querySelector('span').textContent='복사'}},1400)}catch{toast('코드를 복사하지 못했습니다.')}
  };
  header.append(label,copy);
  const content=editable(block);
  content.classList.add('code-block-content');
  content.dataset.placeholder='';
  content.spellcheck=false;
  content.setAttribute('aria-label','코드 블록');
  wrap.append(header,content);
  return wrap;
}
function blockRow(block,index){const row=document.createElement('div');row.className='block-row';row.draggable=false;row.dataset.id=block.id;row.dataset.indent=String(block.indent_level||0);row.style.setProperty('--indent',String(block.indent_level||0));const handle=document.createElement('button');handle.className='block-handle';handle.type='button';handle.innerHTML=icon('grip');handle.tabIndex=0;handle.draggable=canEdit();handle.setAttribute('aria-label','블록 순서 변경');handle.dataset.tooltip='드래그하거나 눌러 블록 메뉴 열기';let content;if(block.type==='code'){content=codeBlock(block);row.append(handle,content)}else if(block.type==='todo'){const wrap=document.createElement('div');wrap.className='todo-wrap'+(block.checked?' checked':'');const check=document.createElement('input');check.type='checkbox';check.checked=!!block.checked;check.disabled=!canEdit();check.setAttribute('aria-label','할 일 완료 상태');check.onchange=()=>{wrap.classList.toggle('checked',check.checked);scheduleSave()};content=editable(block);wrap.append(check,content);row.append(handle,wrap)}else if(block.type==='toggle'){const parts=splitToggleContent(block.content);const wrap=document.createElement('div');wrap.className='toggle-wrap';const summaryLine=document.createElement('div');summaryLine.className='toggle-summary';const caret=document.createElement('button');caret.className='toggle-caret';caret.type='button';caret.innerHTML=icon('chevron-right');const toggleLabel=block.checked?'토글 접기':'토글 펼치기';caret.setAttribute('aria-label',toggleLabel);caret.dataset.tooltip=toggleLabel;caret.setAttribute('aria-expanded',block.checked?'true':'false');if(parts.groupSize)row.dataset.toggleGroupSize=String(parts.groupSize);const summary=editable({...block,content:parts.summary},'summary');summary.dataset.placeholder='토글 제목';const body=editable({...block,content:parts.body},'body');body.classList.add('toggle-body');body.dataset.placeholder='토글 내용을 입력하세요';body.hidden=parts.groupSize?true:!block.checked;caret.onclick=()=>{const open=caret.getAttribute('aria-expanded')!=='true';const label=open?'토글 접기':'토글 펼치기';caret.setAttribute('aria-expanded',open?'true':'false');caret.setAttribute('aria-label',label);caret.dataset.tooltip=label;if(parts.groupSize)refreshLegacyToggleGroups(row.parentElement);else body.hidden=!open;if(canEdit())scheduleSave()};summaryLine.append(caret,summary);wrap.append(summaryLine,body);row.append(handle,wrap)}else if(block.type==='callout'){const wrap=document.createElement('div');wrap.className='callout-wrap';wrap.innerHTML=icon('alert');content=editable(block);content.dataset.placeholder='콜아웃 내용을 입력하세요';wrap.append(content);row.append(handle,wrap)}else if(block.type==='table'||block.type==='database'){content=structuredTableBlock(block,block.type==='database');row.append(handle,content)}else if(['image','video','audio','file','bookmark','embed','page_link'].includes(block.type)){content=mediaBlock(block);row.append(handle,content)}else if(block.type==='toc'){content=tocBlock();content.dataset.type='toc';row.append(handle,content)}else if(block.type==='math'){const wrap=document.createElement('div');wrap.className='math-block';content=editable(block);content.dataset.placeholder='수식을 입력하세요';wrap.append(content);row.append(handle,wrap)}else{content=editable(block);row.append(handle,content)}bindBlockInteractions(row,handle);return row}
function parseGrid(value,database){try{const data=JSON.parse(value);if(Array.isArray(data)&&data.length&&data.every(row=>Array.isArray(row)))return data.slice(0,50).map(row=>row.slice(0,12).map(cell=>String(cell).slice(0,500)))}catch{}return database?[['이름','상태'],['','']]:[['열 1','열 2'],['','']]}
 function structuredTableBlock(block,database){
  if(database)return databaseBlock(block);
  const wrap=document.createElement('div');
  wrap.className='block-content structured-block';
  wrap.dataset.type=block.type;
  wrap.dataset.structured='grid';
  const table=document.createElement('table');
  table.className='block-table';
  const grid=parseGrid(block.content,false);
  const notionProperties=grid[0]?.[0]==='속성'&&grid[0]?.[1]==='값';
  if(notionProperties)wrap.classList.add('notion-property-table');
  const createInput=(value,label,disabled=false)=>{
    const input=document.createElement('input');
    input.value=String(value??'');
    input.disabled=disabled||!canEdit();
    input.maxLength=500;
    input.setAttribute('aria-label',label);
    input.oninput=scheduleSave;
    return input;
  };
  const createRow=(values,rowIndex)=>{
    const tr=document.createElement('tr');
    values.forEach((value,colIndex)=>{
      const cell=document.createElement(rowIndex===0?'th':'td');
      cell.append(createInput(value,rowIndex===0?'열 이름 '+(colIndex+1):'셀 '+rowIndex+'-'+(colIndex+1),notionProperties));
      tr.append(cell);
    });
    return tr;
  };
  grid.forEach((row,rowIndex)=>{
    const tr=createRow(row,rowIndex);
    (rowIndex===0?table.createTHead():table.tBodies[0]||table.createTBody()).append(tr);
  });
  wrap.append(table);
  if(canEdit()&&!notionProperties){
    let cellSelection=null;
    let cellGesture=null;
    let suppressCellClick=false;
    const positionOf=cell=>{
      const row=cell?.parentElement;
      return{row:[...table.rows].indexOf(row),col:cell?.cellIndex??-1};
    };
    const cellAtPoint=(x,y)=>{
      const cell=document.elementFromPoint(x,y)?.closest?.('th,td');
      return cell&&table.contains(cell)?cell:null;
    };
    const clearCellSelection=()=>{
      table.querySelectorAll('th.cell-selected,td.cell-selected').forEach(cell=>cell.classList.remove('cell-selected'));
      cellSelection=null;
      wrap.classList.remove('has-cell-selection','cell-selecting');
    };
    const paintCellSelection=range=>{
      if(!range)return;
      const start=positionOf(range.start);
      const end=positionOf(range.end);
      if(start.row<0||end.row<0||start.col<0||end.col<0)return;
      const minRow=Math.min(start.row,end.row),maxRow=Math.max(start.row,end.row);
      const minCol=Math.min(start.col,end.col),maxCol=Math.max(start.col,end.col);
      table.querySelectorAll('th,td').forEach(cell=>{
        const position=positionOf(cell);
        cell.classList.toggle('cell-selected',position.row>=minRow&&position.row<=maxRow&&position.col>=minCol&&position.col<=maxCol);
      });
      wrap.classList.add('has-cell-selection');
    };
    const selectionBounds=()=>{
      if(!cellSelection)return null;
      const start=positionOf(cellSelection.start);
      const end=positionOf(cellSelection.end);
      if(start.row<0||end.row<0||start.col<0||end.col<0)return null;
      return{minRow:Math.min(start.row,end.row),maxRow:Math.max(start.row,end.row),minCol:Math.min(start.col,end.col),maxCol:Math.max(start.col,end.col)};
    };
    const deleteSelectedRows=()=>{
      const range=selectionBounds();
      if(!range)return;
      const targets=[...table.rows].filter((row,index)=>index>0&&index>=range.minRow&&index<=range.maxRow);
      if(!targets.length)return toast('열 머리글은 삭제할 수 없습니다.');
      targets.forEach(row=>row.remove());
      clearCellSelection();
      scheduleSave();
    };
    const deleteSelectedColumns=()=>{
      const range=selectionBounds();
      if(!range)return;
      const rows=[...table.rows];
      const total=rows[0]?.cells.length||0;
      let columns=Array.from({length:Math.max(0,range.maxCol-range.minCol+1)},(_,offset)=>range.minCol+offset);
      if(!columns.length)return;
      if(columns.length>=total){
        if(total<=1)return toast('표에는 열이 하나 이상 필요합니다.');
        columns=columns.filter(index=>index>0);
      }
      columns.sort((a,b)=>b-a);
      rows.forEach(row=>columns.forEach(index=>row.cells[index]?.remove()));
      clearCellSelection();
      scheduleSave();
    };
    const ensureHeader=()=>{
      if(table.rows.length)return;
      table.createTHead().append(createRow(['열 1','열 2'],0));
    };
    const addRow=(top=false)=>{
      clearCellSelection();
      ensureHeader();
      if(table.rows.length>=50)return toast('표는 최대 50행까지 지원합니다.');
      const cols=table.rows[0]?.cells.length||2;
      const tr=createRow(Array.from({length:cols},()=>''),1);
      const body=table.tBodies[0]||table.createTBody();
      if(top&&body.firstChild)body.insertBefore(tr,body.firstChild);
      else body.append(tr);
      scheduleSave();
      tr.querySelector('input')?.focus();
    };
    const addColumn=(left=false)=>{
      clearCellSelection();
      ensureHeader();
      if((table.rows[0]?.cells.length||0)>=12)return toast('표는 최대 12열까지 지원합니다.');
      for(const [rowIndex,tr] of [...table.rows].entries()){
        const cell=document.createElement(rowIndex===0?'th':'td');
        cell.append(createInput(rowIndex===0?'새 열':'',rowIndex===0?'새 열 이름':'새 셀'));
        if(left)tr.insertBefore(cell,tr.firstElementChild);
        else tr.append(cell);
      }
      scheduleSave();
    };
    const edgeActions=document.createElement('div');
    edgeActions.className='table-edge-actions';
    [['top','위에 행 추가',()=>addRow(true)],['bottom','아래에 행 추가',()=>addRow(false)],['left','왼쪽에 열 추가',()=>addColumn(true)],['right','오른쪽에 열 추가',()=>addColumn(false)]].forEach(([edge,label,action])=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='table-edge-action';
      button.dataset.edge=edge;
      button.innerHTML=icon('plus');
      button.setAttribute('aria-label',label);
      button.title=label;
      button.onclick=event=>{
        event.preventDefault();
        event.stopPropagation();
        action();
      };
      edgeActions.append(button);
    });
    const selectionActions=document.createElement('div');
    selectionActions.className='table-cell-selection-actions';
    const selectionButton=(action,label,iconName,handler)=>{
      const button=document.createElement('button');
      button.type='button';
      button.dataset.action=action;
      button.innerHTML=icon(iconName)+'<span>'+label+'</span>';
      button.setAttribute('aria-label',label);
      button.title=label;
      button.onclick=event=>{
        event.preventDefault();
        event.stopPropagation();
        handler();
      };
      selectionActions.append(button);
    };
    selectionButton('delete','행 삭제','trash',deleteSelectedRows);
    selectionButton('delete','열 삭제','trash',deleteSelectedColumns);
    selectionButton('clear','선택 해제','close',clearCellSelection);
    wrap.append(edgeActions,selectionActions);
    const updateHoverEdge=event=>{
      if(event.pointerType==='touch')return;
      const rect=table.getBoundingClientRect();
      if(!rect.width||!rect.height)return;
      const distances={top:event.clientY-rect.top,bottom:rect.bottom-event.clientY,left:event.clientX-rect.left,right:rect.right-event.clientX};
      const [edge,distance]=Object.entries(distances).sort((a,b)=>a[1]-b[1])[0];
      if(distance<=28)wrap.dataset.hoverEdge=edge;
      else delete wrap.dataset.hoverEdge;
    };
    wrap.addEventListener('pointermove',updateHoverEdge);
    wrap.addEventListener('pointerleave',()=>delete wrap.dataset.hoverEdge);
    table.addEventListener('pointerdown',event=>{
      if((event.button!==0&&event.pointerType!=='touch')||!event.target.closest)return;
      const cell=event.target.closest('th,td');
      if(!cell||!table.contains(cell))return;
      cellGesture={pointerId:event.pointerId,start:cell,end:cell,moved:false};
      try{table.setPointerCapture(event.pointerId)}catch{}
    });
    table.addEventListener('pointermove',event=>{
      if(!cellGesture||cellGesture.pointerId!==event.pointerId)return;
      const cell=cellAtPoint(event.clientX,event.clientY);
      if(cell)cellGesture.end=cell;
      if(!cellGesture.end||cellGesture.end===cellGesture.start)return;
      cellGesture.moved=true;
      cellSelection={start:cellGesture.start,end:cellGesture.end};
      paintCellSelection(cellSelection);
      wrap.classList.add('cell-selecting');
      event.preventDefault();
      suppressCellClick=true;
      const selection=window.getSelection?.();
      selection?.removeAllRanges();
    });
    const finishCellGesture=(event,cancelled=false)=>{
      if(!cellGesture||cellGesture.pointerId!==event.pointerId)return;
      if(table.hasPointerCapture?.(event.pointerId))try{table.releasePointerCapture(event.pointerId)}catch{}
      wrap.classList.remove('cell-selecting');
      if(cellGesture.moved){
        event.preventDefault();
        suppressCellClick=true;
        setTimeout(()=>{suppressCellClick=false},300);
        if(cancelled)clearCellSelection();
      }
      cellGesture=null;
    };
    table.addEventListener('pointerup',event=>finishCellGesture(event));
    table.addEventListener('pointercancel',event=>finishCellGesture(event,true));
    table.addEventListener('click',event=>{
      if(!suppressCellClick)return;
      suppressCellClick=false;
      event.preventDefault();
      event.stopPropagation();
    });
  }
  return wrap;
}
const DATABASE_PROPERTY_TYPES={text:'텍스트',select:'선택',person:'담당자',multi_select:'다중 선택',status:'상태',people:'사용자',number:'숫자',date:'날짜',checkbox:'체크박스',url:'URL',email:'이메일',phone_number:'전화번호',files:'파일',relation:'관계형',rollup:'롤업',formula:'수식',unique_id:'고유 ID',created_time:'생성 시각',last_edited_time:'최종 편집 시각',created_by:'생성자',last_edited_by:'최종 편집자'};
const DATABASE_MAX_ROWS=5000;
const DATABASE_MAX_COLUMNS=100;
function cleanNotionDatabaseTitle(value){return String(value||'').replace(/_all$/i,'').replace(/\s+[0-9a-f]{32}$/i,'').normalize('NFKC').trim().slice(0,120)||'데이터베이스'}
function databaseStatusOptions(values){const preferred=['밀린 업무','진행 예정','진행 중','완료'];const unique=[...new Set(values.map(value=>String(value||'').trim()).filter(Boolean))];return [...preferred.filter(value=>unique.includes(value)),...unique.filter(value=>!preferred.includes(value))].slice(0,30)}
function databaseUid(prefix){return prefix+'_'+crypto.randomUUID().replaceAll('-','').slice(0,18)}
function defaultDatabaseModel(){const title='col_title',status='col_status',person='col_person',due='col_due';return{version:3,title:'작업 목록',columns:[{id:title,name:'작업',type:'text',options:[]},{id:status,name:'상태',type:'status',options:['밀린 업무','진행 예정','진행 중','완료']},{id:person,name:'담당자',type:'people',options:[]},{id:due,name:'마감일',type:'date',options:[]}],rows:[{id:databaseUid('row'),cells:{[title]:'새 작업',[status]:'진행 예정',[person]:'',[due]:''}}],views:[{id:'view_table',name:'표',type:'table',order:0,is_default:true},{id:'view_board',name:'보드',type:'board',order:1,groupBy:status},{id:'view_calendar',name:'캘린더',type:'calendar',order:2,datePropertyId:due}],view:{mode:'table',groupBy:status,datePropertyId:due,sortBy:'',sortDir:'asc',filter:{column:'',operator:'contains',value:''}}}}
function parseDatabaseModel(value){let parsed;try{parsed=JSON.parse(value)}catch{}if(Array.isArray(parsed)&&parsed.length&&parsed.every(row=>Array.isArray(row))){const headers=parsed[0].slice(0,12);const columns=headers.map((name,index)=>{const label=String(name||('속성 '+(index+1))).slice(0,80);const status=/상태/.test(label);return{id:'col_'+index,name:label,type:status?'select':'text',options:status?['밀린 업무','진행 예정','진행 중','완료']:[]}});const rows=parsed.slice(1,DATABASE_MAX_ROWS+1).map(values=>({id:databaseUid('row'),cells:Object.fromEntries(columns.map((column,index)=>[column.id,String(values[index]??'').slice(0,500)]))}));const statusColumn=columns.find(column=>column.type==='select');return{version:2,title:'작업 목록',columns:columns.length?columns:defaultDatabaseModel().columns,rows:rows.length?rows:[],view:{mode:statusColumn?'board':'table',groupBy:statusColumn?.id||columns[0]?.id||'',sortBy:'',sortDir:'asc',filter:{column:'',operator:'contains',value:''}}}}if(!parsed||parsed.version!==2||!Array.isArray(parsed.columns)||!Array.isArray(parsed.rows))return defaultDatabaseModel();const columns=parsed.columns.slice(0,12).map((column,index)=>{const name=String(column.name||('속성 '+(index+1))).replace(/\r/g,'').slice(0,80);const type=DATABASE_PROPERTY_TYPES[column.type]?column.type:'text';const options=type==='select'&&/상태|status/i.test(name)?databaseStatusOptions(Array.isArray(column.options)?column.options:[]):[...new Set((Array.isArray(column.options)?column.options:[]).map(value=>String(value).slice(0,80)).filter(Boolean))].slice(0,30);return{id:/^[A-Za-z0-9_-]{3,40}$/.test(String(column.id||''))?String(column.id):'col_'+index,name,type,options}});if(!columns.length)return defaultDatabaseModel();const ids=new Set(columns.map(column=>column.id));const rows=parsed.rows.slice(0,DATABASE_MAX_ROWS).map(row=>({id:/^[A-Za-z0-9_-]{3,50}$/.test(String(row.id||''))?String(row.id):databaseUid('row'),cells:Object.fromEntries(columns.map(column=>[column.id,column.type==='checkbox'?(row.cells?.[column.id]===true||row.cells?.[column.id]===1||row.cells?.[column.id]==='1'||row.cells?.[column.id]==='true'):String(row.cells?.[column.id]??'').replace(/\r/g,'').slice(0,500)]))}));const view=parsed.view||{};const filter=view.filter&&typeof view.filter==='object'?view.filter:{};const filterColumn=ids.has(String(filter.column||''))?String(filter.column):'';const filterOperators=new Set(['contains','equals','not_equals','empty','not_empty','gte','lte']);return{version:2,title:cleanNotionDatabaseTitle(parsed.title),columns,rows,views:Array.isArray(parsed.views)?parsed.views.slice(0,12):[],view:{mode:view.mode==='board'?'board':'table',groupBy:ids.has(view.groupBy)?view.groupBy:(columns.find(column=>column.type==='select')?.id||columns[0].id),sortBy:ids.has(view.sortBy)?view.sortBy:'',sortDir:view.sortDir==='desc'?'desc':'asc',filter:{column:filterColumn,operator:filterOperators.has(String(filter.operator||''))?String(filter.operator):'contains',value:String(filter.value||'').slice(0,120)}}}}
function databaseMiniButton(label,iconName,handler){const button=document.createElement('button');button.type='button';button.className='db-mini-button';button.innerHTML=icon(iconName);button.setAttribute('aria-label',label);button.title=label;button.disabled=!canEdit();button.onclick=()=>{if(label==='행 삭제'&&!confirm('이 작업을 삭제할까요?'))return;if(label==='보드에서 제거'&&!confirm('이 카드를 보드에서 제거할까요?\n연결된 원본 페이지는 삭제되지 않습니다.'))return;handler()};return button}
function databaseRows(model,query=''){let rows=[...model.rows];const needle=query.trim().toLocaleLowerCase('ko');if(needle)rows=rows.filter(row=>model.columns.some(column=>String(row.cells[column.id]??'').toLocaleLowerCase('ko').includes(needle)));const filter=model.view.filter||{};const filterColumn=model.columns.find(column=>column.id===filter.column);const filterValue=String(filter.value??'').trim().toLocaleLowerCase('ko');if(filterColumn&&(['empty','not_empty'].includes(filter.operator)||filterValue)){rows=rows.filter(row=>{const raw=row.cells[filterColumn.id];const value=filterColumn.type==='checkbox'?(raw?'true':'false'):String(raw??'').trim();const lower=value.toLocaleLowerCase('ko');if(filter.operator==='empty')return !value;if(filter.operator==='not_empty')return !!value;if(filter.operator==='equals')return lower===filterValue;if(filter.operator==='not_equals')return lower!==filterValue;if(filter.operator==='gte'||filter.operator==='lte'){const left=filterColumn.type==='number'?Number(value):value;const right=filterColumn.type==='number'?Number(filterValue):filterValue;return filter.operator==='gte'?left>=right:left<=right}return lower.includes(filterValue)})}const sortColumn=model.columns.find(column=>column.id===model.view.sortBy);if(sortColumn)rows.sort((a,b)=>{const left=a.cells[sortColumn.id],right=b.cells[sortColumn.id];let result=0;if(sortColumn.type==='number')result=(Number(left)||0)-(Number(right)||0);else if(sortColumn.type==='checkbox')result=Number(!!left)-Number(!!right);else result=String(left??'').localeCompare(String(right??''),'ko',{numeric:true});return model.view.sortDir==='desc'?-result:result});return rows}
function parseDatabaseModel(value){let parsed;try{parsed=JSON.parse(value)}catch{}if(Array.isArray(parsed)&&parsed.length&&parsed.every(row=>Array.isArray(row))){const headers=parsed[0].slice(0,DATABASE_MAX_COLUMNS);const columns=headers.map((name,index)=>{const label=String(name||('속성 '+(index+1))).slice(0,80);const status=/상태/.test(label);return{id:'col_'+index,name:label,type:status?'select':'text',options:status?['밀린 업무','진행 예정','진행 중','완료']:[]}});const rows=parsed.slice(1,DATABASE_MAX_ROWS+1).map(values=>({id:databaseUid('row'),cells:Object.fromEntries(columns.map((column,index)=>[column.id,String(values[index]??'').slice(0,500)]))}));const statusColumn=columns.find(column=>column.type==='select');return{version:3,title:'작업 목록',columns:columns.length?columns:defaultDatabaseModel().columns,rows:rows||[],views:[{id:'view_table',name:'전체 보기',type:'table',order:0,is_default:!statusColumn},...(statusColumn?[{id:'view_board',name:statusColumn.name+'별',type:'board',order:1,groupBy:statusColumn.id}]:[])],view:{mode:statusColumn?'board':'table',groupBy:statusColumn?.id||columns[0]?.id||'',sortBy:'',sortDir:'asc',filter:{column:'',operator:'contains',value:''}}}}if(!parsed||![2,3].includes(Number(parsed.version))||!Array.isArray(parsed.columns)||!Array.isArray(parsed.rows))return defaultDatabaseModel();const columns=parsed.columns.slice(0,DATABASE_MAX_COLUMNS).map((column,index)=>{const name=String(column.name||('속성 '+(index+1))).replace(/\r/g,'').slice(0,80);const type=DATABASE_PROPERTY_TYPES[column.type]?column.type:'text';const options=['select','multi_select','status'].includes(type)?[...new Set((Array.isArray(column.options)?column.options:[]).map(value=>String(value)).filter(Boolean))].slice(0,100):[];return{id:/^[A-Za-z0-9_-]{3,40}$/.test(String(column.id||''))?String(column.id):'col_'+index,name,type,sourceType:String(column.sourceType||column.source_type||type),sourceId:String(column.sourceId||column.source_id||''),options}});if(!columns.length)return defaultDatabaseModel();const ids=new Set(columns.map(column=>column.id));const rows=parsed.rows.slice(0,DATABASE_MAX_ROWS).map(row=>({id:/^[A-Za-z0-9_-]{3,50}$/.test(String(row.id||''))?String(row.id):databaseUid('row'),source_id:String(row.source_id||''),cells:Object.fromEntries(columns.map(column=>[column.id,column.type==='checkbox'?(row.cells?.[column.id]===true||row.cells?.[column.id]===1||row.cells?.[column.id]==='1'||row.cells?.[column.id]==='true'):String(row.cells?.[column.id]??'').replace(/\r/g,'').slice(0,500)]))}));const normalizeView=view=>{const raw=view&&typeof view==='object'?view:{};const type=String(raw.type||raw.mode||'table').toLowerCase();const filter=raw.filter&&typeof raw.filter==='object'?raw.filter:{};return{id:String(raw.id||'view_'+type),name:String(raw.name||raw.title||({'table':'표','board':'보드','calendar':'캘린더','timeline':'타임라인','gallery':'갤러리','list':'목록'}[type]||type)).slice(0,120),type:['table','board','calendar','timeline','gallery','list'].includes(type)?type:'table',order:Number.isFinite(Number(raw.order))?Number(raw.order):0,is_default:!!raw.is_default,groupBy:ids.has(String(raw.groupBy||''))?String(raw.groupBy):ids.has(String(raw.group_by||''))?String(raw.group_by):'',datePropertyId:ids.has(String(raw.datePropertyId||''))?String(raw.datePropertyId):ids.has(String(raw.date_property_id||''))?String(raw.date_property_id):'',filter,sorts:Array.isArray(raw.sorts)?raw.sorts:[],quick_filters:Array.isArray(raw.quick_filters)?raw.quick_filters:[],configuration:raw.configuration&&typeof raw.configuration==='object'?raw.configuration:{}}};const views=(Array.isArray(parsed.views)?parsed.views:[]).map(normalizeView).sort((a,b)=>a.order-b.order);const legacy=parsed.view&&typeof parsed.view==='object'?normalizeView(parsed.view):null;const selected=legacy||views.find(view=>view.is_default)||views[0]||{type:'table',groupBy:'',datePropertyId:'',filter:{column:'',operator:'contains',value:''},sorts:[],quick_filters:[]};const filter=selected.filter&&typeof selected.filter==='object'?selected.filter:{};const filterColumn=ids.has(String(filter.column||''))?String(filter.column):'';const filterOperators=new Set(['contains','equals','not_equals','empty','not_empty','gte','lte']);return{version:Number(parsed.version)===3?3:2,title:cleanNotionDatabaseTitle(parsed.title),source_id:String(parsed.source_id||''),columns,rows,views,view:{mode:['table','board','calendar','timeline','gallery','list'].includes(selected.type)?selected.type:'table',groupBy:selected.groupBy||columns.find(column=>['status','select'].includes(column.type))?.id||columns[0].id,datePropertyId:selected.datePropertyId||columns.find(column=>column.type==='date')?.id||'',sortBy:ids.has(String(selected.sortBy||''))?String(selected.sortBy):'',sortDir:selected.sortDir==='desc'?'desc':'asc',filter:{column:filterColumn,operator:filterOperators.has(String(filter.operator||''))?String(filter.operator):'contains',value:String(filter.value||'').slice(0,120)}}}}

const parseDatabaseModelBase=parseDatabaseModel;
parseDatabaseModel=value=>{const model=parseDatabaseModelBase(value);if(Array.isArray(model.views)&&model.views.length){const selected=model.views.find(view=>String(view.type||view.mode).toLowerCase()===model.view.mode&&view.is_default)||model.views.find(view=>view.is_default)||model.views.find(view=>String(view.type||view.mode).toLowerCase()===model.view.mode)||model.views[0];model.view={...selected,...model.view,type:model.view.mode,sorts:Array.isArray(model.view.sorts)?model.view.sorts:Array.isArray(selected.sorts)?selected.sorts:[],quick_filters:Array.isArray(model.view.quick_filters)?model.view.quick_filters:Array.isArray(selected.quick_filters)?selected.quick_filters:[],configuration:{...(selected.configuration||{}),...(model.view.configuration||{})}}}return model};
function normalizeDatabaseView(model, raw){const view=raw||model.view||{};const mode=String(view.type||view.mode||'table').toLowerCase();return{...view,type:['table','board','calendar','timeline','gallery','list'].includes(mode)?mode:'table',mode:mode,groupBy:view.groupBy||view.group_by||model.view.groupBy||'',datePropertyId:view.datePropertyId||view.date_property_id||model.view.datePropertyId||'',filter:view.filter||{column:'',operator:'contains',value:''},sorts:Array.isArray(view.sorts)?view.sorts:[],quick_filters:Array.isArray(view.quick_filters)?view.quick_filters:[],configuration:view.configuration&&typeof view.configuration==='object'?view.configuration:{}}}
function databaseDateParts(value){const text=String(value||'').trim();if(!text)return[];return text.split(/\s+→\s+|\s+至\s+/).map(part=>{const match=part.match(/\d{4}-\d{2}-\d{2}/);return match?match[0]:''}).filter(Boolean)}
function calendarDateKey(date){return date.toISOString().slice(0,10)}
function calendarLocalTodayKey(){const date=new Date();return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-')}
function calendarVisibleItems(rows,dateColumn,titleColumn,visibleStart,visibleEnd){return rows.map(row=>{const parts=databaseDateParts(row.cells[dateColumn.id]);return{row,parts,title:databaseDisplayValue(titleColumn,row.cells[titleColumn.id])||'제목 없음'}}).filter(item=>item.parts.length&&(item.parts[1]||item.parts[0])>=visibleStart&&item.parts[0]<=visibleEnd).sort((a,b)=>a.parts[0].localeCompare(b.parts[0])||(b.parts[1]||b.parts[0]).localeCompare(a.parts[1]||a.parts[0])||a.title.localeCompare(b.title)||String(a.row.source_id||a.row.id).localeCompare(String(b.row.source_id||b.row.id)))}
function databaseDisplayValue(property,value){const text=String(value??'').trim();if(property.type==='people'||property.type==='person'){if(/^[0-9a-f]{24,}$/i.test(text)||text.split(',').some(item=>/^[0-9a-f-]{24,}$/i.test(item.trim())))return '사용자 정보 권한 필요';}return text}

function databaseCellInput(wrap,row,column,{compact=false,onGroupChange=false}={}){let input;if(['select','status','multi_select'].includes(column.type)){input=document.createElement(column.type==='multi_select'?'input':'select');const current=String(row.cells[column.id]??'');if(input.tagName==='SELECT'){const values=[...new Set(['',...column.options,current])];for(const value of values){const option=document.createElement('option');option.value=value;option.textContent=value||'선택 안 함';input.append(option)}input.value=current}else{input.type='text';input.value=current;input.placeholder='쉼표로 여러 값 입력'} }else{input=document.createElement('input');input.type=column.type==='checkbox'?'checkbox':column.type==='number'?'number':column.type==='date'?'date':column.type==='url'?'url':'text';if(input.type==='checkbox')input.checked=!!row.cells[column.id];else input.value=String(row.cells[column.id]??'');if(['text','url'].includes(input.type))input.maxLength=500}input.className='db-cell-input type-'+column.type+(compact?' compact':'');input.disabled=!canEdit()||!['text','select','multi_select','number','date','url','checkbox'].includes(column.type);input.title=databaseDisplayValue(column,row.cells[column.id]);input.setAttribute('aria-label',column.name+' 값');const update=()=>{const value=input.type==='checkbox'?input.checked:input.value;row.cells[column.id]=value;if(['select','status'].includes(column.type)&&value&&!column.options.includes(value))column.options.push(value);scheduleSave();if(onGroupChange)renderDatabaseBody(wrap)};input.oninput=['select','checkbox'].includes(input.type)?null:update;input.onchange=update;return input}
function renderDatabaseTable(wrap,body){const model=wrap._databaseModel;const rows=databaseRows(model,wrap._databaseQuery);const scroll=document.createElement('div');scroll.className='db-table-scroll';const table=document.createElement('table');table.className='db-table';const head=table.createTHead();const header=head.insertRow();for(const [index,column] of model.columns.entries()){const th=document.createElement('th');const property=document.createElement('div');property.className='db-property-head';const name=document.createElement('input');name.className='db-property-name';name.value=column.name;name.maxLength=80;name.disabled=!canEdit();name.setAttribute('aria-label','속성 이름');name.oninput=()=>{column.name=name.value;scheduleSave()};const type=document.createElement('select');type.className='db-property-type';type.disabled=!canEdit();type.setAttribute('aria-label',column.name+' 속성 유형');for(const [value,label] of Object.entries(DATABASE_PROPERTY_TYPES)){const option=document.createElement('option');option.value=value;option.textContent=label;option.selected=column.type===value;type.append(option)}type.onchange=()=>{column.type=type.value;if(column.type==='checkbox')for(const row of model.rows)row.cells[column.id]=!!row.cells[column.id];renderDatabaseBlock(wrap);scheduleSave()};const actions=document.createElement('span');actions.className='db-property-actions';if(column.type==='select')actions.append(databaseMiniButton('선택 옵션 추가','plus',()=>{const value=prompt('추가할 선택 옵션을 입력하세요.');if(value&&value.trim()&&!column.options.includes(value.trim())){column.options.push(value.trim().slice(0,80));renderDatabaseBlock(wrap);scheduleSave()}}));actions.append(databaseMiniButton('왼쪽으로 이동','chevron-left',()=>{if(index<1)return;[model.columns[index-1],model.columns[index]]=[model.columns[index],model.columns[index-1]];renderDatabaseBlock(wrap);scheduleSave()}),databaseMiniButton('오른쪽으로 이동','chevron-right',()=>{if(index>=model.columns.length-1)return;[model.columns[index+1],model.columns[index]]=[model.columns[index],model.columns[index+1]];renderDatabaseBlock(wrap);scheduleSave()}),databaseMiniButton('속성 삭제','trash',()=>{if(model.columns.length===1||!confirm(column.name+' 속성을 삭제할까요?'))return;model.columns.splice(index,1);for(const row of model.rows)delete row.cells[column.id];if(model.view.groupBy===column.id)model.view.groupBy=model.columns[0].id;if(model.view.sortBy===column.id)model.view.sortBy='';renderDatabaseBlock(wrap);scheduleSave()}));property.append(name,type,actions);th.append(property);header.append(th)}const actionHead=document.createElement('th');actionHead.className='db-row-actions-cell';actionHead.textContent='관리';header.append(actionHead);const tbody=table.createTBody();for(const row of rows){const tr=tbody.insertRow();for(const column of model.columns){const td=tr.insertCell();td.className='db-cell';td.append(databaseCellInput(wrap,row,column))}const actionCell=tr.insertCell();actionCell.className='db-row-actions-cell';const actions=document.createElement('span');actions.className='db-row-actions';const index=model.rows.indexOf(row);actions.append(databaseMiniButton('위로 이동','arrow-up',()=>{if(index<1)return;[model.rows[index-1],model.rows[index]]=[model.rows[index],model.rows[index-1]];renderDatabaseBody(wrap);scheduleSave()}),databaseMiniButton('아래로 이동','arrow-down',()=>{if(index>=model.rows.length-1)return;[model.rows[index+1],model.rows[index]]=[model.rows[index],model.rows[index+1]];renderDatabaseBody(wrap);scheduleSave()}),databaseMiniButton('행 삭제','trash',()=>{model.rows.splice(index,1);renderDatabaseBlock(wrap);scheduleSave()}));actionCell.append(actions)}scroll.append(table);body.append(scroll);if(!rows.length){const empty=document.createElement('div');empty.className='db-empty';empty.textContent=wrap._databaseQuery?'검색 결과가 없습니다.':'행이 없습니다. 아래에서 새 행을 추가하세요.';body.append(empty)}}
function databaseGroupValues(model,column,rows){const values=column.type==='select'?[...column.options]:[];for(const row of rows){const value=String(row.cells[column.id]??'').trim();if(value&&!values.includes(value))values.push(value)}values.push('');return values.slice(0,30)}
function databaseBoardField(property,value){const field=document.createElement('div');field.className='db-card-field';const text=String(value??'').trim();if(property.type==='person'){field.innerHTML='<span class="db-card-avatar">'+escapeText(text.slice(0,1).toUpperCase())+'</span><span class="db-card-value is-person">'+escapeText(text)+'</span>'}else if(property.type==='select'){field.innerHTML='<span class="db-card-value is-tag">'+escapeText(text)+'</span>'}else{field.innerHTML=icon(/첨부|파일|attachment/i.test(property.name)?'files':property.type==='date'?'clock':'list')+'<span class="db-card-value">'+escapeText(text)+'</span>'}field.title=property.name+': '+text;return field}
function databasePageTitleKey(value){return String(value||'').normalize('NFKC').trim().toLocaleLowerCase('ko')}
async function openDatabaseRowPage(row,titleColumn,button){const title=String(row.cells[titleColumn.id]||'').trim();if(!title)return toast('페이지를 찾으려면 카드 제목을 입력해 주세요.');if(row._documentId){push('/doc/'+row._documentId);return}if(row._opening)return;row._opening=true;button?.classList.add('loading-indicator');try{const params=new URLSearchParams({scope:'search',limit:'20',q:title});const data=await api('/api/documents?'+params);const key=databasePageTitleKey(title);const page=data.documents.find(document=>document.id!==state.current?.id&&!isImportArtifactDoc(document)&&databasePageTitleKey(document.title)===key);if(!page){toast('같은 제목의 원본 페이지를 찾지 못했습니다.');return}row._documentId=page.id;push('/doc/'+page.id)}catch(error){toast(error.message)}finally{row._opening=false;button?.classList.remove('loading-indicator')}}
function renderDatabaseBoard(wrap,body){const model=wrap._databaseModel;const rows=databaseRows(model,wrap._databaseQuery);const groupColumn=model.columns.find(column=>column.id===model.view.groupBy)||model.columns[0];const titleColumn=model.columns.find(column=>column.type==='text')||model.columns[0];const board=document.createElement('div');board.className='db-board';const tones={'밀린 업무':'red','진행 예정':'blue','진행 중':'yellow','완료':'green'};for(const groupValue of databaseGroupValues(model,groupColumn,rows)){const grouped=rows.filter(row=>String(row.cells[groupColumn.id]??'')===groupValue);const column=document.createElement('section');column.className='db-board-column';column.dataset.groupValue=groupValue;column.dataset.tone=tones[groupValue]||'gray';const heading=document.createElement('header');heading.className='db-board-heading';heading.innerHTML='<span><i class="db-status-dot"></i>'+escapeText(groupValue||'상태 없음')+'</span><span>'+escapeText(grouped.length>99?'99+':String(grouped.length))+'</span>';const list=document.createElement('div');list.className='db-board-list';for(const row of grouped){const card=document.createElement('article');card.className='db-card';card.draggable=canEdit();card.dataset.rowId=row.id;card.ondragstart=event=>{card.classList.add('dragging');event.dataTransfer.setData('text/plain',row.id)};card.ondragend=()=>card.classList.remove('dragging');const titleRow=document.createElement('div');titleRow.className='db-card-title-row';const pageIcon=document.createElement('button');pageIcon.type='button';pageIcon.className='db-card-page-icon';pageIcon.innerHTML=icon('files');pageIcon.setAttribute('aria-label','원본 페이지 열기');pageIcon.dataset.tooltip='원본 페이지 열기';pageIcon.onclick=()=>openDatabaseRowPage(row,titleColumn,pageIcon);const title=databaseCellInput(wrap,row,titleColumn,{compact:true});title.classList.add('db-card-title');titleRow.append(pageIcon,title);card.onclick=event=>{if(event.target.closest('input,button,select,a'))return;openDatabaseRowPage(row,titleColumn,pageIcon)};const meta=document.createElement('div');meta.className='db-card-meta';const visible=model.columns.filter(property=>property.id!==titleColumn.id&&property.id!==groupColumn.id&&String(row.cells[property.id]??'').trim()).sort((a,b)=>{const rank=property=>property.type==='person'?0:/우선순위|priority/i.test(property.name)?1:property.type==='date'?2:3;return rank(a)-rank(b)}).slice(0,3);for(const property of visible)meta.append(databaseBoardField(property,row.cells[property.id]));const footer=document.createElement('footer');footer.className='db-card-footer';const remove=databaseMiniButton('보드에서 제거','trash',()=>{model.rows.splice(model.rows.indexOf(row),1);renderDatabaseBlock(wrap);scheduleSave()});remove.removeAttribute('data-tooltip');footer.append(remove);card.append(titleRow,meta,footer);list.append(card)}column.ondragover=event=>{if(!canEdit())return;event.preventDefault();column.classList.add('drag-over')};column.ondragleave=()=>column.classList.remove('drag-over');column.ondrop=event=>{event.preventDefault();column.classList.remove('drag-over');const row=model.rows.find(item=>item.id===event.dataTransfer.getData('text/plain'));if(!row)return;row.cells[groupColumn.id]=groupColumn.type==='checkbox'?groupValue==='완료':groupValue;renderDatabaseBody(wrap);scheduleSave()};const add=document.createElement('button');add.type='button';add.className='db-board-add';add.textContent='+ '+(groupValue||'상태 없음')+'에 작업 추가';add.hidden=!canEdit();add.onclick=()=>{if(model.rows.length>=DATABASE_MAX_ROWS)return toast('작업은 최대 '+DATABASE_MAX_ROWS+'개까지 추가할 수 있습니다.');const row={id:databaseUid('row'),cells:Object.fromEntries(model.columns.map(item=>[item.id,item.type==='checkbox'?false:'']))};row.cells[groupColumn.id]=groupValue;row.cells[titleColumn.id]='새 작업';model.rows.push(row);renderDatabaseBlock(wrap);scheduleSave()};column.append(heading,list,add);board.append(column)}body.append(board)}
function renderDatabaseBody(wrap){const old=wrap.querySelector('.db-view-body');const body=document.createElement('div');body.className='db-view-body';if(wrap._databaseModel.view.mode==='board')renderDatabaseBoard(wrap,body);else renderDatabaseTable(wrap,body);old?.replaceWith(body);const empty=wrap.querySelector('.db-empty');if(empty&&wrap._databaseModel.view.filter?.column&&!wrap._databaseQuery)empty.textContent='조건에 맞는 작업이 없습니다.'}
function databaseFilterControls(model,wrap,toolbar){const filter=model.view.filter||(model.view.filter={column:'',operator:'contains',value:''});const columnSelect=document.createElement('select');columnSelect.className='db-select';columnSelect.setAttribute('aria-label','필터 속성');columnSelect.innerHTML='<option value="">필터 없음</option>'+model.columns.map(column=>'<option value="'+escapeText(column.id)+'"'+(filter.column===column.id?' selected':'')+'>'+escapeText(column.name)+'</option>').join('');const operatorSelect=document.createElement('select');operatorSelect.className='db-select';operatorSelect.setAttribute('aria-label','필터 조건');const operators=[['contains','포함'],['equals','같음'],['not_equals','같지 않음'],['empty','비어 있음'],['not_empty','비어 있지 않음'],['gte','이상'],['lte','이하']];operatorSelect.innerHTML=operators.map(([value,label])=>'<option value="'+value+'"'+(filter.operator===value?' selected':'')+'>'+label+'</option>').join('');const valueInput=document.createElement('input');valueInput.className='db-search db-filter-value';valueInput.type='search';valueInput.placeholder='필터 값';valueInput.value=filter.value||'';valueInput.setAttribute('aria-label','필터 값');const clear=document.createElement('button');clear.type='button';clear.className='db-control';clear.textContent='필터 초기화';clear.hidden=!filter.column;const sync=({rerender=false}={})=>{filter.column=columnSelect.value;filter.operator=operatorSelect.value;filter.value=valueInput.value.slice(0,120);clear.hidden=!filter.column||(!filter.value&&['contains','equals','not_equals','gte','lte'].includes(filter.operator));valueInput.hidden=!filter.column||['empty','not_empty'].includes(filter.operator);if(rerender)renderDatabaseBlock(wrap);else renderDatabaseBody(wrap);scheduleSave()};columnSelect.onchange=()=>{if(!columnSelect.value){filter.column='';filter.value='';filter.operator='contains'}sync()};operatorSelect.onchange=()=>sync({rerender:true});valueInput.oninput=()=>sync();clear.onclick=()=>{filter.column='';filter.operator='contains';filter.value='';renderDatabaseBlock(wrap);scheduleSave()};toolbar.append(columnSelect,operatorSelect,valueInput,clear);valueInput.hidden=!filter.column||['empty','not_empty'].includes(filter.operator)}
function renderDatabaseBlock(wrap){const model=wrap._databaseModel;wrap.replaceChildren();const header=document.createElement('div');header.className='db-header';header.hidden=cleanNotionDatabaseTitle(model.title)===cleanNotionDatabaseTitle(state.current?.title);const title=document.createElement('input');title.className='db-title';title.value=model.title;title.maxLength=120;title.disabled=!canEdit();title.setAttribute('aria-label','데이터베이스 이름');title.oninput=()=>{model.title=title.value;scheduleSave()};const count=document.createElement('span');count.className='db-count';count.textContent=model.rows.length+'개 작업';header.append(title,count);const views=document.createElement('div');views.className='db-viewbar';const groupColumn=model.columns.find(column=>column.id===model.view.groupBy)||model.columns[0];for(const [mode,label,iconName] of [['table','표','list'],['board','보드','files']]){const button=document.createElement('button');button.type='button';button.className='db-view-tab'+(model.view.mode===mode?' active':'');button.innerHTML=icon(iconName)+'<span>'+label+(mode==='board'?' · '+escapeText(groupColumn.name)+'별':'')+'</span>';button.onclick=()=>{model.view.mode=mode;renderDatabaseBlock(wrap);scheduleSave()};views.append(button)}const toolbar=document.createElement('div');toolbar.className='db-toolbar';const searchWrap=document.createElement('label');searchWrap.className='db-search-wrap';searchWrap.innerHTML=icon('search');const search=document.createElement('input');search.className='db-search';search.type='search';search.placeholder='작업 검색';search.value=wrap._databaseQuery||'';search.setAttribute('aria-label','데이터베이스 검색');search.oninput=()=>{wrap._databaseQuery=search.value;renderDatabaseBody(wrap)};searchWrap.append(search);const sort=document.createElement('select');sort.className='db-select';sort.setAttribute('aria-label','정렬 속성');sort.innerHTML='<option value="">정렬 안 함</option>'+model.columns.map(column=>'<option value="'+escapeText(column.id)+'"'+(model.view.sortBy===column.id?' selected':'')+'>'+escapeText(column.name)+' 순</option>').join('');sort.onchange=()=>{model.view.sortBy=sort.value;renderDatabaseBody(wrap);scheduleSave()};const direction=document.createElement('button');direction.type='button';direction.className='db-control';direction.innerHTML=icon(model.view.sortDir==='desc'?'arrow-down':'arrow-up')+'<span>'+(model.view.sortDir==='desc'?'내림차순':'오름차순')+'</span>';direction.onclick=()=>{model.view.sortDir=model.view.sortDir==='desc'?'asc':'desc';renderDatabaseBlock(wrap);scheduleSave()};toolbar.append(searchWrap,sort,direction);databaseFilterControls(model,wrap,toolbar);if(model.view.mode==='board'){const group=document.createElement('select');group.className='db-select';group.setAttribute('aria-label','보드 분류 속성');for(const column of model.columns){const option=document.createElement('option');option.value=column.id;option.textContent=column.name+'별';option.selected=model.view.groupBy===column.id;group.append(option)}group.onchange=()=>{model.view.groupBy=group.value;renderDatabaseBlock(wrap);scheduleSave()};toolbar.append(group)}const addProperty=document.createElement('button');addProperty.type='button';addProperty.className='db-control';addProperty.innerHTML=icon('plus')+'<span>속성 추가</span>';addProperty.hidden=!canEdit();addProperty.onclick=()=>{if(model.columns.length>=12)return toast('속성은 최대 12개까지 추가할 수 있습니다.');const id=databaseUid('col');model.columns.push({id,name:'새 속성',type:'text',options:[]});for(const row of model.rows)row.cells[id]='';renderDatabaseBlock(wrap);scheduleSave()};toolbar.append(addProperty);const body=document.createElement('div');body.className='db-view-body';const footer=document.createElement('footer');footer.className='db-footer';const addRow=document.createElement('button');addRow.type='button';addRow.className='db-control primary';addRow.innerHTML=icon('plus')+'<span>새 작업</span>';addRow.hidden=!canEdit();addRow.onclick=()=>{if(model.rows.length>=DATABASE_MAX_ROWS)return toast('작업은 최대 '+DATABASE_MAX_ROWS+'개까지 추가할 수 있습니다.');const first=model.columns.find(column=>column.type==='text')||model.columns[0];const row={id:databaseUid('row'),cells:Object.fromEntries(model.columns.map(column=>[column.id,column.type==='checkbox'?false:'']))};row.cells[first.id]='새 작업';model.rows.push(row);renderDatabaseBlock(wrap);scheduleSave()};const note=document.createElement('span');note.className='db-footer-note';note.textContent=model.rows.length+'개 작업 · 최대 '+DATABASE_MAX_ROWS+'개';footer.append(addRow,note);wrap.append(header,views,toolbar,body,footer);renderDatabaseBody(wrap)}
function databaseGroupValues(model,column,rows){const values=['select','multi_select','status'].includes(column.type)?[...column.options]:[];for(const row of rows){const value=String(row.cells[column.id]??'').trim();if(value&&!values.includes(value))values.push(value)}if(rows.some(row=>!String(row.cells[column.id]??'').trim()))values.push('');return values.slice(0,100)}
function databaseBoardField(property,value){const field=document.createElement('div');field.className='db-card-field';const text=databaseDisplayValue(property,value);if(['people','person'].includes(property.type)){field.innerHTML='<span class="db-card-avatar">'+escapeText(text==='사용자 정보 권한 필요'?'?':text.slice(0,1).toUpperCase())+'</span><span class="db-card-value is-person">'+escapeText(text)+'</span>'}else if(['select','status','multi_select'].includes(property.type)){field.innerHTML='<span class="db-card-value is-tag">'+escapeText(text)+'</span>'}else{field.innerHTML=icon(/첨부|파일|attachment/i.test(property.name)?'files':property.type==='date'?'clock':'list')+'<span class="db-card-value">'+escapeText(text)+'</span>'}field.title=property.name+': '+String(value??'').trim();return field}
function openDatabaseRowPage(row,titleColumn,button){const title=String(row.cells[titleColumn.id]||'').trim();if(row.source_id&&/^[0-9a-f]{32}$/i.test(row.source_id)){push('/doc/doc_notion_'+row.source_id.toLowerCase());return}if(!title)return toast('페이지를 찾으려면 카드 제목을 입력해 주세요.');if(row._documentId){push('/doc/'+row._documentId);return}if(row._opening)return;row._opening=true;button?.classList.add('loading-indicator');try{const params=new URLSearchParams({scope:'search',limit:'20',q:title});api('/api/documents?'+params).then(data=>{const key=databasePageTitleKey(title);const page=data.documents.find(document=>document.id!==state.current?.id&&!isImportArtifactDoc(document)&&databasePageTitleKey(document.title)===key);if(!page)toast('같은 제목의 원본 페이지를 찾지 못했습니다.');else{row._documentId=page.id;push('/doc/'+page.id)}}).catch(error=>toast(error.message)).finally(()=>{row._opening=false;button?.classList.remove('loading-indicator')})}catch(error){row._opening=false;button?.classList.remove('loading-indicator');toast(error.message)}}
function renderDatabaseCalendar(wrap,body,view){const model=wrap._databaseModel;const dateColumn=model.columns.find(column=>column.id===view.datePropertyId)||model.columns.find(column=>column.type==='date');const shell=document.createElement('div');shell.className='db-calendar';if(!dateColumn){shell.innerHTML='<div class="db-empty">날짜 속성이 없어 캘린더를 표시할 수 없습니다.</div>';body.append(shell);return}if(!wrap._calendarCursor){const now=new Date();wrap._calendarCursor=new Date(Date.UTC(now.getFullYear(),now.getMonth(),1))}const cursor=new Date(Date.UTC(wrap._calendarCursor.getUTCFullYear(),wrap._calendarCursor.getUTCMonth(),1));const year=cursor.getUTCFullYear(),month=cursor.getUTCMonth();const heading=document.createElement('header');heading.className='db-calendar-heading';const title=document.createElement('strong');title.textContent=year+'년 '+(month+1)+'월';const controls=document.createElement('div');controls.className='db-calendar-controls';const prev=document.createElement('button');prev.type='button';prev.className='db-control';prev.textContent='‹';prev.setAttribute('aria-label','이전 달');prev.onclick=()=>{wrap._calendarCursor=new Date(Date.UTC(year,month-1,1));renderDatabaseBody(wrap)};const today=document.createElement('button');today.type='button';today.className='db-control';today.textContent='오늘';today.onclick=()=>{const now=new Date();wrap._calendarCursor=new Date(Date.UTC(now.getFullYear(),now.getMonth(),1));renderDatabaseBody(wrap)};const next=document.createElement('button');next.type='button';next.className='db-control';next.textContent='›';next.setAttribute('aria-label','다음 달');next.onclick=()=>{wrap._calendarCursor=new Date(Date.UTC(year,month+1,1));renderDatabaseBody(wrap)};controls.append(prev,today,next);heading.append(title,controls);shell.append(heading);const weekdays=document.createElement('div');weekdays.className='db-calendar-weekdays';for(const label of ['일','월','화','수','목','금','토']){const day=document.createElement('div');day.className='db-calendar-weekday';day.textContent=label;weekdays.append(day)}shell.append(weekdays);const firstDay=new Date(Date.UTC(year,month,1)).getUTCDay();const start=new Date(Date.UTC(year,month,1-firstDay));const end=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth(),start.getUTCDate()+41));const visibleStart=calendarDateKey(start),visibleEnd=calendarDateKey(end);const rows=databaseRows(model,wrap._databaseQuery);const titleColumn=model.columns.find(column=>column.type==='text')||model.columns[0];const dated=calendarVisibleItems(rows,dateColumn,titleColumn,visibleStart,visibleEnd);const weeks=document.createElement('div');weeks.className='db-calendar-weeks';const todayKey=calendarLocalTodayKey();for(let weekIndex=0;weekIndex<6;weekIndex+=1){const week=document.createElement('div');week.className='db-calendar-week';const weekStart=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth(),start.getUTCDate()+weekIndex*7));const weekEnd=new Date(Date.UTC(weekStart.getUTCFullYear(),weekStart.getUTCMonth(),weekStart.getUTCDate()+6));const weekStartKey=calendarDateKey(weekStart),weekEndKey=calendarDateKey(weekEnd);for(let column=0;column<7;column+=1){const date=new Date(Date.UTC(weekStart.getUTCFullYear(),weekStart.getUTCMonth(),weekStart.getUTCDate()+column));const key=calendarDateKey(date);const cell=document.createElement('div');cell.style.gridColumn=String(column+1);cell.className='db-calendar-day'+(date.getUTCMonth()===month?'':' outside')+(key===todayKey?' today':'');const dayNumber=document.createElement('span');dayNumber.className='db-calendar-date';dayNumber.textContent=String(date.getUTCDate());cell.append(dayNumber);week.append(cell)}const lanes=[];for(const item of dated){const itemStart=item.parts[0],itemEnd=item.parts[1]||itemStart;if(itemEnd<weekStartKey||itemStart>weekEndKey)continue;const segmentStart=itemStart<weekStartKey?weekStartKey:itemStart;const segmentEnd=itemEnd>weekEndKey?weekEndKey:itemEnd;const startColumn=Math.round((Date.parse(segmentStart+'T00:00:00Z')-weekStart.getTime())/86400000);const endColumn=Math.round((Date.parse(segmentEnd+'T00:00:00Z')-weekStart.getTime())/86400000);let lane=lanes.findIndex(lastEnd=>startColumn>lastEnd);if(lane<0){lane=lanes.length;lanes.push(endColumn)}else lanes[lane]=endColumn;const chip=document.createElement('button');chip.type='button';chip.className='db-calendar-range'+(itemStart<weekStartKey?' continues-before':'')+(itemEnd>weekEndKey?' continues-after':'');chip.style.gridColumn=(startColumn+1)+' / '+(endColumn+2);chip.style.gridRow=String(lane+2);chip.innerHTML=icon('files')+'<span>'+escapeText(item.title)+'</span>';chip.title=item.title+' · '+itemStart+(itemEnd!==itemStart?' → '+itemEnd:'');chip.onclick=()=>openDatabaseRowPage(item.row,titleColumn,chip);week.append(chip)}week.style.gridTemplateRows='32px repeat('+Math.max(3,lanes.length)+',30px)';weeks.append(week)}shell.append(weeks);const undated=rows.filter(row=>!databaseDateParts(row.cells[dateColumn.id]).length);if(undated.length){const noDate=document.createElement('details');noDate.className='db-calendar-undated';const summary=document.createElement('summary');summary.textContent='날짜 없음 ('+undated.length+')';const list=document.createElement('div');list.className='db-calendar-undated-list';for(const row of undated.slice(0,100)){const link=document.createElement('button');link.type='button';link.className='db-calendar-undated-item';link.textContent=String(row.cells[titleColumn.id]||'제목 없음');link.onclick=()=>openDatabaseRowPage(row,titleColumn,link);list.append(link)}noDate.append(summary,list);shell.append(noDate)}body.append(shell)}
function renderDatabaseBoard(wrap,body){const model=wrap._databaseModel;const rows=databaseRows(model,wrap._databaseQuery);const groupColumn=model.columns.find(column=>column.id===model.view.groupBy)||model.columns.find(column=>['status','select'].includes(column.type))||model.columns[0];const titleColumn=model.columns.find(column=>column.type==='text')||model.columns[0];const board=document.createElement('div');board.className='db-board';const tones={'밀린 업무':'red','진행 예정':'blue','진행 중':'yellow','완료':'green'};for(const groupValue of databaseGroupValues(model,groupColumn,rows)){const grouped=rows.filter(row=>String(row.cells[groupColumn.id]??'')===groupValue);const column=document.createElement('section');column.className='db-board-column';column.dataset.groupValue=groupValue;column.dataset.tone=tones[groupValue]||'gray';const heading=document.createElement('header');heading.className='db-board-heading';heading.innerHTML='<span><i class="db-status-dot"></i>'+escapeText(groupValue||'상태 없음')+'</span><span>'+escapeText(grouped.length>99?'99+':String(grouped.length))+'</span>';const list=document.createElement('div');list.className='db-board-list';const limit=wrap._boardLimit||100;for(const row of grouped.slice(0,limit)){const card=document.createElement('article');card.className='db-card';card.draggable=canEdit();card.dataset.rowId=row.id;card.ondragstart=event=>{card.classList.add('dragging');event.dataTransfer.setData('text/plain',row.id)};card.ondragend=()=>card.classList.remove('dragging');const titleRow=document.createElement('div');titleRow.className='db-card-title-row';const pageIcon=document.createElement('button');pageIcon.type='button';pageIcon.className='db-card-page-icon';pageIcon.innerHTML=icon('files');pageIcon.setAttribute('aria-label','원본 페이지 열기');pageIcon.onclick=()=>openDatabaseRowPage(row,titleColumn,pageIcon);const title=databaseCellInput(wrap,row,titleColumn,{compact:true});title.classList.add('db-card-title');title.title=String(row.cells[titleColumn.id]||'');titleRow.append(pageIcon,title);card.onclick=event=>{if(event.target.closest('input,button,select,a'))return;openDatabaseRowPage(row,titleColumn,pageIcon)};const meta=document.createElement('div');meta.className='db-card-meta';const visible=model.columns.filter(property=>property.id!==titleColumn.id&&property.id!==groupColumn.id&&String(row.cells[property.id]??'').trim()).sort((a,b)=>{const rank=property=>['people','person'].includes(property.type)?0:/우선순위|priority/i.test(property.name)?1:property.type==='date'?2:3;return rank(a)-rank(b)}).slice(0,4);for(const property of visible)meta.append(databaseBoardField(property,row.cells[property.id]));const footer=document.createElement('footer');footer.className='db-card-footer';const remove=databaseMiniButton('보드에서 제거','trash',()=>{row.cells[groupColumn.id]='';renderDatabaseBody(wrap);scheduleSave()});footer.append(remove);card.append(titleRow,meta,footer);list.append(card)}if(grouped.length>limit){const more=document.createElement('button');more.type='button';more.className='db-board-more';more.textContent='더 보기 ('+(grouped.length-limit)+'개)';more.onclick=()=>{wrap._boardLimit=limit+100;renderDatabaseBody(wrap)};list.append(more)}column.ondragover=event=>{if(!canEdit())return;event.preventDefault();column.classList.add('drag-over')};column.ondragleave=()=>column.classList.remove('drag-over');column.ondrop=event=>{event.preventDefault();column.classList.remove('drag-over');const row=model.rows.find(item=>item.id===event.dataTransfer.getData('text/plain'));if(!row)return;row.cells[groupColumn.id]=groupValue;renderDatabaseBody(wrap);scheduleSave()};const add=document.createElement('button');add.type='button';add.className='db-board-add';add.textContent='+ '+(groupValue||'상태 없음')+'에 작업 추가';add.hidden=!canEdit();add.onclick=()=>{if(model.rows.length>=DATABASE_MAX_ROWS)return toast('작업은 최대 '+DATABASE_MAX_ROWS+'개까지 추가할 수 있습니다.');const row={id:databaseUid('row'),cells:Object.fromEntries(model.columns.map(item=>[item.id,item.type==='checkbox'?false:'']))};row.cells[groupColumn.id]=groupValue;row.cells[titleColumn.id]='새 작업';model.rows.push(row);renderDatabaseBlock(wrap);scheduleSave()};column.append(heading,list,add);board.append(column)}body.append(board)}
const databaseRowsBase=databaseRows;
function databaseViewColumn(model,reference){const key=String(reference||'');return model.columns.find(column=>column.id===key||column.sourceId===key||column.source_id===key||column.name===key)}
function databaseComparable(column,value){if(column?.type==='number')return Number(value)||0;if(column?.type==='checkbox')return Number(!!value);if(column?.type==='date')return databaseDateParts(value)[0]||'';return databaseDisplayValue(column||{type:'text'},value).toLocaleLowerCase('ko')}
function databaseStructuredFilter(model,row,filter){if(!filter||typeof filter!=='object')return true;const and=filter.and||filter.all,or=filter.or||filter.any;if(Array.isArray(and))return and.every(item=>databaseStructuredFilter(model,row,item));if(Array.isArray(or))return or.some(item=>databaseStructuredFilter(model,row,item));const reference=filter.property_id||filter.property||filter.column||filter.id;const column=databaseViewColumn(model,reference);if(!column)return true;let operator=filter.operator||filter.condition||'';let target=filter.value;for(const [key,value] of Object.entries(filter)){if(['equals','does_not_equal','contains','does_not_contain','is_empty','is_not_empty','greater_than_or_equal_to','less_than_or_equal_to','after','before'].includes(key)){operator=key;target=value;break}if(value&&typeof value==='object'&&!Array.isArray(value)){for(const [nestedKey,nestedValue] of Object.entries(value)){if(['equals','does_not_equal','contains','does_not_contain','is_empty','is_not_empty','greater_than_or_equal_to','less_than_or_equal_to','after','before'].includes(nestedKey)){operator=nestedKey;target=nestedValue;break}}}}const raw=row.cells[column.id],value=databaseComparable(column,raw),compare=databaseComparable(column,target);if(['is_empty','empty'].includes(operator))return String(raw??'').trim()==='';if(['is_not_empty','not_empty'].includes(operator))return String(raw??'').trim()!=='';if(['equals','equal'].includes(operator))return value===compare;if(['does_not_equal','not_equals'].includes(operator))return value!==compare;if(['does_not_contain'].includes(operator))return !String(value).includes(String(compare));if(['greater_than_or_equal_to','gte','after'].includes(operator))return value>=compare;if(['less_than_or_equal_to','lte','before'].includes(operator))return value<=compare;return String(value).includes(String(compare))}
databaseRows=(model,query='')=>{let rows=databaseRowsBase(model,query);const view=model.view||{};if(view.filter&&!view.filter.column&&(view.filter.and||view.filter.or||view.filter.all||view.filter.any||view.filter.property||view.filter.property_id))rows=rows.filter(row=>databaseStructuredFilter(model,row,view.filter));if(!view.sortBy&&Array.isArray(view.sorts)&&view.sorts.length){const sorts=view.sorts.map(sort=>({column:databaseViewColumn(model,sort.property_id||sort.property||sort.column||sort.id),descending:String(sort.direction||sort.order||'').toLowerCase()==='descending'||String(sort.direction||sort.order||'').toLowerCase()==='desc'})).filter(sort=>sort.column);rows.sort((a,b)=>{for(const sort of sorts){const left=databaseComparable(sort.column,a.cells[sort.column.id]),right=databaseComparable(sort.column,b.cells[sort.column.id]);const result=typeof left==='number'?left-right:String(left).localeCompare(String(right),'ko',{numeric:true});if(result)return sort.descending?-result:result}return String(a.source_id||a.id).localeCompare(String(b.source_id||b.id))})}return rows};
function databaseTitleColumn(model){return model.columns.find(column=>column.type==='title')||model.columns.find(column=>column.type==='text')||model.columns[0]}
function databasePreviewColumns(model,view,limit=4){const title=databaseTitleColumn(model);const configured=view?.configuration?.visible_property_ids||view?.configuration?.visible_properties||view?.configuration?.properties;let ids=[];if(Array.isArray(configured))ids=configured.map(value=>typeof value==='string'?value:String(value?.property_id||value?.id||''));else if(configured&&typeof configured==='object')ids=Object.entries(configured).filter(([,value])=>value!==false&&value?.visible!==false).map(([key,value])=>String(value?.property_id||value?.id||key));const ranked=model.columns.filter(column=>column.id!==title.id).sort((a,b)=>{const ai=ids.indexOf(a.sourceId||a.id),bi=ids.indexOf(b.sourceId||b.id);if(ai>=0||bi>=0)return(ai<0?999:ai)-(bi<0?999:bi);const rank=column=>['people','person'].includes(column.type)?0:['status','select','multi_select'].includes(column.type)?1:column.type==='date'?2:3;return rank(a)-rank(b)});return ranked.slice(0,limit)}
function databaseRowMeta(model,row,view,limit=4){const meta=document.createElement('div');meta.className='db-card-meta';for(const property of databasePreviewColumns(model,view,limit)){if(String(row.cells[property.id]??'').trim())meta.append(databaseBoardField(property,row.cells[property.id]))}return meta}
function databaseMoreButton(wrap,className,remaining,key){const more=document.createElement('button');more.type='button';more.className=className;more.textContent='더 보기 ('+remaining+'개)';more.onclick=()=>{wrap[key]=(wrap[key]||100)+100;renderDatabaseBody(wrap)};return more}
function renderDatabaseList(wrap,body,view){const model=wrap._databaseModel;const rows=databaseRows(model,wrap._databaseQuery);const titleColumn=databaseTitleColumn(model);const list=document.createElement('div');list.className='db-list';const limit=wrap._listLimit||100;for(const row of rows.slice(0,limit)){const item=document.createElement('article');item.className='db-list-item';const open=document.createElement('button');open.type='button';open.className='db-list-open';open.innerHTML=icon('files')+'<span>'+escapeText(databaseDisplayValue(titleColumn,row.cells[titleColumn.id])||'제목 없음')+'</span>';open.onclick=()=>openDatabaseRowPage(row,titleColumn,open);item.append(open,databaseRowMeta(model,row,view,3));list.append(item)}if(rows.length>limit)list.append(databaseMoreButton(wrap,'db-list-more',rows.length-limit,'_listLimit'));body.append(list);if(!rows.length)body.innerHTML='<div class="db-empty">표시할 페이지가 없습니다.</div>'}
function renderDatabaseGallery(wrap,body,view){const model=wrap._databaseModel;const rows=databaseRows(model,wrap._databaseQuery);const titleColumn=databaseTitleColumn(model);const gallery=document.createElement('div');gallery.className='db-gallery';const limit=wrap._galleryLimit||60;for(const row of rows.slice(0,limit)){const card=document.createElement('article');card.className='db-gallery-card';const cover=document.createElement('button');cover.type='button';cover.className='db-gallery-cover';cover.innerHTML=icon('files');cover.setAttribute('aria-label',(databaseDisplayValue(titleColumn,row.cells[titleColumn.id])||'제목 없음')+' 열기');cover.onclick=()=>openDatabaseRowPage(row,titleColumn,cover);const copy=document.createElement('div');copy.className='db-gallery-copy';const title=document.createElement('button');title.type='button';title.className='db-gallery-title';title.textContent=databaseDisplayValue(titleColumn,row.cells[titleColumn.id])||'제목 없음';title.onclick=()=>openDatabaseRowPage(row,titleColumn,title);copy.append(title,databaseRowMeta(model,row,view,4));card.append(cover,copy);gallery.append(card)}if(rows.length>limit)gallery.append(databaseMoreButton(wrap,'db-gallery-more',rows.length-limit,'_galleryLimit'));body.append(gallery);if(!rows.length)body.innerHTML='<div class="db-empty">표시할 페이지가 없습니다.</div>'}
function timelineCursor(wrap){if(!wrap._timelineCursor){const now=new Date();wrap._timelineCursor=new Date(Date.UTC(now.getFullYear(),now.getMonth(),1))}return new Date(Date.UTC(wrap._timelineCursor.getUTCFullYear(),wrap._timelineCursor.getUTCMonth(),1))}
function renderDatabaseTimeline(wrap,body,view){const model=wrap._databaseModel;const dateColumn=model.columns.find(column=>column.id===view.datePropertyId)||model.columns.find(column=>column.type==='date');if(!dateColumn){body.innerHTML='<div class="db-empty">날짜 속성이 없어 타임라인을 표시할 수 없습니다.</div>';return}const cursor=timelineCursor(wrap),year=cursor.getUTCFullYear(),month=cursor.getUTCMonth();const start=new Date(Date.UTC(year,month,1)),days=42,end=new Date(Date.UTC(year,month,days));const startKey=calendarDateKey(start),endKey=calendarDateKey(end);const titleColumn=databaseTitleColumn(model);const rows=databaseRows(model,wrap._databaseQuery);const items=calendarVisibleItems(rows,dateColumn,titleColumn,startKey,endKey);const shell=document.createElement('div');shell.className='db-timeline';const heading=document.createElement('header');heading.className='db-timeline-heading';heading.innerHTML='<strong>'+year+'년 '+(month+1)+'월</strong>';const controls=document.createElement('div');controls.className='db-calendar-controls';for(const [label,move,name] of [['‹',-1,'이전 달'],['오늘',0,'오늘'],['›',1,'다음 달']]){const button=document.createElement('button');button.type='button';button.className='db-control';button.textContent=label;button.setAttribute('aria-label',name);button.onclick=()=>{const now=new Date();wrap._timelineCursor=move===0?new Date(Date.UTC(now.getFullYear(),now.getMonth(),1)):new Date(Date.UTC(year,month+move,1));renderDatabaseBody(wrap)};controls.append(button)}heading.append(controls);shell.append(heading);const scroller=document.createElement('div');scroller.className='db-timeline-scroll';const grid=document.createElement('div');grid.className='db-timeline-grid';grid.style.setProperty('--timeline-days',String(days));const corner=document.createElement('div');corner.className='db-timeline-corner';corner.textContent='페이지';grid.append(corner);for(let day=0;day<days;day+=1){const date=new Date(Date.UTC(year,month,day+1));const cell=document.createElement('div');cell.className='db-timeline-day'+([0,6].includes(date.getUTCDay())?' weekend':'')+(calendarDateKey(date)===calendarLocalTodayKey()?' today':'');cell.textContent=date.getUTCDate()+(date.getUTCDate()===1?'일':'');grid.append(cell)}const limit=wrap._timelineLimit||100;for(const item of items.slice(0,limit)){const label=document.createElement('button');label.type='button';label.className='db-timeline-label';label.innerHTML=icon('files')+'<span>'+escapeText(item.title)+'</span>';label.onclick=()=>openDatabaseRowPage(item.row,titleColumn,label);grid.append(label);const track=document.createElement('div');track.className='db-timeline-track';const itemStart=item.parts[0]<startKey?startKey:item.parts[0];const rawEnd=item.parts[1]||item.parts[0];const itemEnd=rawEnd>endKey?endKey:rawEnd;const startOffset=Math.max(0,Math.round((Date.parse(itemStart+'T00:00:00Z')-start.getTime())/86400000));const endOffset=Math.min(days-1,Math.round((Date.parse(itemEnd+'T00:00:00Z')-start.getTime())/86400000));const bar=document.createElement('button');bar.type='button';bar.className='db-timeline-bar';bar.style.gridColumn=(startOffset+1)+' / '+(endOffset+2);bar.innerHTML='<span>'+escapeText(item.title)+'</span>';bar.title=item.title+' · '+item.parts.join(' → ');bar.onclick=()=>openDatabaseRowPage(item.row,titleColumn,bar);track.append(bar);grid.append(track)}scroller.append(grid);shell.append(scroller);if(items.length>limit)shell.append(databaseMoreButton(wrap,'db-timeline-more',items.length-limit,'_timelineLimit'));const undated=rows.length-items.length;if(undated>0){const note=document.createElement('div');note.className='db-timeline-undated';note.textContent='현재 범위 밖 또는 날짜 없음 '+undated+'개';shell.append(note)}body.append(shell)}
function renderDatabaseBody(wrap){const old=wrap.querySelector('.db-view-body');const body=document.createElement('div');body.className='db-view-body';const view=normalizeDatabaseView(wrap._databaseModel,wrap._databaseModel.view);if(view.type==='board')renderDatabaseBoard(wrap,body);else if(view.type==='calendar')renderDatabaseCalendar(wrap,body,view);else if(view.type==='timeline')renderDatabaseTimeline(wrap,body,view);else if(view.type==='gallery')renderDatabaseGallery(wrap,body,view);else if(view.type==='list')renderDatabaseList(wrap,body,view);else renderDatabaseTable(wrap,body);old?.replaceWith(body);const empty=wrap.querySelector('.db-empty');if(empty&&wrap._databaseModel.view.filter?.column&&!wrap._databaseQuery)empty.textContent='조건에 맞는 작업이 없습니다.'}
function databaseDisplayViews(model){const list=(Array.isArray(model.views)&&model.views.length?model.views:[{id:'view_table',name:'표',type:'table'},{id:'view_board',name:'보드',type:'board',groupBy:model.view.groupBy}]).slice();const types=new Set(list.map(view=>String(view.type||view.mode||'').toLowerCase()));const notionPlanningOrder={calendar:0,table:1,board:2,timeline:3};if(['calendar','table','board','timeline'].every(type=>types.has(type)))return list.sort((a,b)=>(notionPlanningOrder[String(a.type||a.mode).toLowerCase()]??9)-(notionPlanningOrder[String(b.type||b.mode).toLowerCase()]??9));const orders=new Set(list.map(view=>Number(view.order)||0));if(orders.size>1)return list.sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0));const fallback={calendar:0,table:1,board:2,timeline:3,gallery:4,list:5};return list.sort((a,b)=>(fallback[String(a.type||a.mode).toLowerCase()]??9)-(fallback[String(b.type||b.mode).toLowerCase()]??9))}
function databaseViewLabel(raw,type,labels){const name=String(raw.name||'').trim();return !name||name.toLowerCase()===type?labels[type]||type:name}
function renderDatabaseBlock(wrap){const model=wrap._databaseModel;wrap.replaceChildren();const header=document.createElement('div');header.className='db-header';header.hidden=cleanNotionDatabaseTitle(model.title)===cleanNotionDatabaseTitle(state.current?.title);const title=document.createElement('input');title.className='db-title';title.value=model.title;title.maxLength=120;title.disabled=!canEdit();title.setAttribute('aria-label','데이터베이스 이름');title.oninput=()=>{model.title=title.value;scheduleSave()};const count=document.createElement('span');count.className='db-count';count.textContent=model.rows.length+'개 작업';header.append(title,count);const views=document.createElement('div');views.className='db-viewbar';const viewList=databaseDisplayViews(model);const labels={table:'표',board:'보드',calendar:'캘린더',timeline:'타임라인',gallery:'갤러리',list:'목록'};for(const raw of viewList){const view=normalizeDatabaseView(model,raw);const button=document.createElement('button');button.type='button';button.className='db-view-tab'+((model._activeViewId?model._activeViewId===raw.id:model.view.mode===view.type)?' active':'');button.innerHTML=icon(view.type==='calendar'?'calendar':view.type==='board'?'files':'list')+'<span>'+escapeText(databaseViewLabel(raw,view.type,labels))+'</span>';button.onclick=()=>{model._activeViewId=raw.id;model.view={...model.view,...view,mode:view.type,groupBy:view.groupBy||model.view.groupBy,datePropertyId:view.datePropertyId||model.view.datePropertyId,filter:view.filter||model.view.filter};renderDatabaseBlock(wrap);scheduleSave()};views.append(button)}const toolbar=document.createElement('div');toolbar.className='db-toolbar';const searchWrap=document.createElement('label');searchWrap.className='db-search-wrap';searchWrap.innerHTML=icon('search');const search=document.createElement('input');search.className='db-search';search.type='search';search.placeholder='작업 검색';search.value=wrap._databaseQuery||'';search.setAttribute('aria-label','데이터베이스 검색');search.oninput=()=>{wrap._databaseQuery=search.value;renderDatabaseBody(wrap)};searchWrap.append(search);const sort=document.createElement('select');sort.className='db-select';sort.setAttribute('aria-label','정렬 속성');sort.innerHTML='<option value="">정렬 안 함</option>'+model.columns.map(column=>'<option value="'+escapeText(column.id)+'"'+(model.view.sortBy===column.id?' selected':'')+'>'+escapeText(column.name)+' 순</option>').join('');sort.onchange=()=>{model.view.sortBy=sort.value;renderDatabaseBody(wrap);scheduleSave()};const direction=document.createElement('button');direction.type='button';direction.className='db-control';direction.innerHTML=icon(model.view.sortDir==='desc'?'arrow-down':'arrow-up')+'<span>'+(model.view.sortDir==='desc'?'내림차순':'오름차순')+'</span>';direction.onclick=()=>{model.view.sortDir=model.view.sortDir==='desc'?'asc':'desc';renderDatabaseBlock(wrap);scheduleSave()};toolbar.append(searchWrap,sort,direction);databaseFilterControls(model,wrap,toolbar);if(model.view.mode==='board'){const group=document.createElement('select');group.className='db-select';group.setAttribute('aria-label','보드 분류 속성');for(const column of model.columns){const option=document.createElement('option');option.value=column.id;option.textContent=column.name+'별';option.selected=model.view.groupBy===column.id;group.append(option)}group.onchange=()=>{model.view.groupBy=group.value;renderDatabaseBlock(wrap);scheduleSave()};toolbar.append(group)}const addProperty=document.createElement('button');addProperty.type='button';addProperty.className='db-control';addProperty.innerHTML=icon('plus')+'<span>속성 추가</span>';addProperty.hidden=!canEdit();addProperty.onclick=()=>{if(model.columns.length>=DATABASE_MAX_COLUMNS)return toast('속성은 최대 '+DATABASE_MAX_COLUMNS+'개까지 추가할 수 있습니다.');const id=databaseUid('col');model.columns.push({id,name:'새 속성',type:'text',options:[]});for(const row of model.rows)row.cells[id]='';renderDatabaseBlock(wrap);scheduleSave()};toolbar.append(addProperty);const body=document.createElement('div');body.className='db-view-body';const footer=document.createElement('footer');footer.className='db-footer';const addRow=document.createElement('button');addRow.type='button';addRow.className='db-control primary';addRow.innerHTML=icon('plus')+'<span>새 작업</span>';addRow.hidden=!canEdit();addRow.onclick=()=>{if(model.rows.length>=DATABASE_MAX_ROWS)return toast('작업은 최대 '+DATABASE_MAX_ROWS+'개까지 추가할 수 있습니다.');const first=model.columns.find(column=>column.type==='text')||model.columns[0];const row={id:databaseUid('row'),cells:Object.fromEntries(model.columns.map(column=>[column.id,column.type==='checkbox'?false:'']))};row.cells[first.id]='새 작업';model.rows.push(row);renderDatabaseBlock(wrap);scheduleSave()};const note=document.createElement('span');note.className='db-footer-note';note.textContent=model.rows.length+'개 작업 · '+viewList.length+'개 뷰';footer.append(addRow,note);wrap.append(header,views,toolbar,body,footer);renderDatabaseBody(wrap)}
const renderDatabaseBlockBase=renderDatabaseBlock;
renderDatabaseBlock=wrap=>{renderDatabaseBlockBase(wrap);const views=wrap.querySelector(':scope > .db-viewbar');const toolbar=wrap.querySelector(':scope > .db-toolbar');if(views&&toolbar){const chrome=document.createElement('div');chrome.className='db-chrome';views.before(chrome);chrome.append(views,toolbar);const iconNames={table:'list',board:'files',calendar:'calendar',timeline:'clock',gallery:'template',list:'list'};const viewList=databaseDisplayViews(wrap._databaseModel);[...views.querySelectorAll('.db-view-tab')].forEach((button,index)=>{const raw=viewList[index],view=normalizeDatabaseView(wrap._databaseModel,raw);const label=button.querySelector('span')?.textContent||view.type;button.innerHTML=icon(iconNames[view.type]||'list')+'<span>'+escapeText(label)+'</span>';button.title=label;button.onclick=()=>{wrap._databaseModel._activeViewId=raw.id;wrap._databaseModel.view={...wrap._databaseModel.view,...view,mode:view.type,groupBy:view.groupBy||wrap._databaseModel.view.groupBy,datePropertyId:view.datePropertyId||wrap._databaseModel.view.datePropertyId,filter:view.filter||wrap._databaseModel.view.filter};renderDatabaseBlock(wrap)}})}};
function applyDatabaseViewPreference(model,preference){if(!preference)return;const views=databaseDisplayViews(model);const raw=views.find(view=>String(view.id||'')===String(preference.view_id||''))||views.find(view=>String(view.type||view.mode||'').toLowerCase()===String(preference.view_type||'').toLowerCase());if(!raw)return;const view=normalizeDatabaseView(model,raw);model._activeViewId=String(raw.id||'');model.view={...model.view,...view,mode:view.type,groupBy:view.groupBy||model.view.groupBy,datePropertyId:view.datePropertyId||model.view.datePropertyId,filter:view.filter||model.view.filter}}
function persistDatabaseViewPreference(wrap,raw,view){const documentId=state.current?.id,blockId=String(wrap._blockId||'');if(!documentId||!blockId||!raw?.id)return;const revision=(wrap._viewPreferenceRevision||0)+1;wrap._viewPreferenceRevision=revision;state.databaseViewPreferences?.set(blockId,{view_id:String(raw.id),view_type:view.type});api('/api/documents/'+documentId+'/view-preferences',{method:'PUT',body:{block_id:blockId,view_id:String(raw.id),view_type:view.type}}).catch(error=>{if(revision===wrap._viewPreferenceRevision)toast(error?.message||'보기 설정을 저장하지 못했습니다.')})}
function activateDatabaseView(wrap,raw){const model=wrap._databaseModel,view=normalizeDatabaseView(model,raw);model._activeViewId=String(raw.id||'');model.view={...model.view,...view,mode:view.type,groupBy:view.groupBy||model.view.groupBy,datePropertyId:view.datePropertyId||model.view.datePropertyId,filter:view.filter||model.view.filter};wrap._databaseViewPreference={view_id:String(raw.id||''),view_type:view.type};renderDatabaseBlock(wrap);persistDatabaseViewPreference(wrap,raw,view)}
function databaseBlock(block){const wrap=document.createElement('div');wrap.className='block-content structured-block database-block';wrap.dataset.type='database';wrap.dataset.database='true';wrap._blockId=String(block.id||'');wrap._databaseModel=parseDatabaseModel(block.content);wrap._databaseChunks=Array.isArray(block.__database_chunks)?block.__database_chunks:null;wrap._databaseQuery='';applyDatabaseViewPreference(wrap._databaseModel,state.databaseViewPreferences?.get(wrap._blockId));renderDatabaseBlock(wrap);return wrap}
document.addEventListener('click',event=>{const button=event.target.closest?.('.db-view-tab');if(!button)return;const wrap=button.closest('.database-block'),bar=button.closest('.db-viewbar');if(!wrap||!bar)return;const index=[...bar.querySelectorAll('.db-view-tab')].indexOf(button),raw=databaseDisplayViews(wrap._databaseModel)[index];if(!raw)return;event.preventDefault();event.stopImmediatePropagation();activateDatabaseView(wrap,raw)},true);
const parseDatabaseLinkedRowsBase=parseDatabaseModel;
parseDatabaseModel=value=>{const model=parseDatabaseLinkedRowsBase(value);try{const raw=JSON.parse(value),links=new Map((raw.rows||[]).map(row=>[String(row.id||''),String(row.document_id||'')]));for(const row of model.rows||[])if(links.get(String(row.id)))row.document_id=links.get(String(row.id))}catch{}return model};
function shiftCalendarValue(value,days=0){return String(value||'').replace(/\d{4}-\d{2}-\d{2}/g,key=>{const date=new Date(key+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+days);return calendarDateKey(date)})}
function shiftedCalendarValue(value,days=7){return shiftCalendarValue(value,days)}
async function databaseLinkedDocumentId(row,titleColumn){if(row.document_id||row._documentId)return row.document_id||row._documentId;const notionId=String(row.source_id||'').replaceAll('-','').toLowerCase();if(/^[0-9a-f]{32}$/.test(notionId))return'doc_notion_'+notionId;const title=String(row.cells[titleColumn.id]||'').trim();if(!title)return'';const data=await api('/api/documents?'+new URLSearchParams({scope:'search',limit:'20',q:title}));const key=databasePageTitleKey(title);const page=data.documents.find(document=>document.id!==state.current?.id&&!isImportArtifactDoc(document)&&databasePageTitleKey(document.title)===key);if(page)row._documentId=page.id;return page?.id||''}
openDatabaseRowPage=async(row,titleColumn,button)=>{if(row._opening)return;row._opening=true;button?.classList.add('loading-indicator');try{const id=await databaseLinkedDocumentId(row,titleColumn);if(!id)return toast('연결된 원본 페이지를 찾지 못했습니다.');push('/doc/'+id)}catch(error){toast(error.message)}finally{row._opening=false;button?.classList.remove('loading-indicator')}};
async function duplicateDatabaseRowNextWeek({wrap,row,dateColumn,titleColumn}){if(!canEdit())return;try{const sourceId=await databaseLinkedDocumentId(row,titleColumn);if(!sourceId)return toast('복제할 원본 페이지를 찾지 못했습니다.');const copied=await api('/api/documents/'+sourceId+'/duplicate',{method:'POST'});const cells={...row.cells,[dateColumn.id]:shiftedCalendarValue(row.cells[dateColumn.id])};wrap._databaseModel.rows.push({id:databaseUid('row'),document_id:copied.document.id,cells});renderDatabaseBlock(wrap);scheduleSave();if(await saveDocument()){loadTree();toast('일정과 페이지를 다음 주로 복제했습니다.')}}catch(error){toast(error.message)}}
function calendarRowFromChip(wrap,chip){const model=wrap._databaseModel,view=normalizeDatabaseView(model,model.view),dateColumn=model.columns.find(column=>column.id===view.datePropertyId)||model.columns.find(column=>column.type==='date'),titleColumn=databaseTitleColumn(model),dates=String(chip.title||'').match(/\d{4}-\d{2}-\d{2}/g)||[],title=chip.querySelector('span')?.textContent?.trim()||'';const row=model.rows.find(item=>databaseDisplayValue(titleColumn,item.cells[titleColumn.id])===title&&databaseDateParts(item.cells[dateColumn?.id]).join('|')===dates.join('|'));return row&&dateColumn?{wrap,row,dateColumn,titleColumn,button:chip}:null}
function showCalendarRowMenu(context,x,y){hideBlockMenu();hideSlashMenu();hideTreeMenu();const menu=$('block-menu');const item=(label,iconName,handler)=>{const button=document.createElement('button');button.type='button';button.role='menuitem';button.innerHTML=icon(iconName)+'<span>'+escapeText(label)+'</span>';button.onclick=()=>{hideBlockMenu();handler()};return button};const items=[item('페이지 열기','files',()=>openDatabaseRowPage(context.row,context.titleColumn,context.button))];if(canEdit())items.push(separator(),item('다음 주로 복제','copy',()=>duplicateDatabaseRowNextWeek(context)));menu.replaceChildren(...items);menu.hidden=false;menu.style.left=Math.max(8,Math.min(x,innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,Math.min(y,innerHeight-menu.offsetHeight-8))+'px';menu.querySelector('button')?.focus();menu.onkeydown=event=>{const buttons=[...menu.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();buttons[(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus()}else if(event.key==='Escape'){event.preventDefault();hideBlockMenu();context.button.focus()}}}
function bindCalendarDrag(wrap){const shell=wrap.querySelector('.db-calendar');if(!shell||!canEdit())return;const clear=()=>shell.querySelectorAll('.db-calendar-day.drag-over').forEach(cell=>cell.classList.remove('drag-over'));const cellAt=(week,clientX)=>{const cells=[...week.querySelectorAll('.db-calendar-day')];if(!cells.length)return null;const rect=week.getBoundingClientRect();const ratio=(clientX-rect.left)/Math.max(1,rect.width);return cells[Math.max(0,Math.min(6,Math.floor(ratio*7)))]};const move=(context,target)=>{const current=databaseDateParts(context.row.cells[context.dateColumn.id]);if(!current.length)return;const delta=Math.round((Date.parse(target+'T00:00:00Z')-Date.parse(current[0]+'T00:00:00Z'))/86400000);if(!Number.isFinite(delta))return;if(delta){context.row.cells[context.dateColumn.id]=shiftCalendarValue(context.row.cells[context.dateColumn.id],delta);wrap._calendarDragMoved=true;renderDatabaseBody(wrap);scheduleSave();toast('일정을 '+target+'로 이동했습니다.')}wrap._calendarDrag=null;clear()};shell.querySelectorAll('.db-calendar-range').forEach(chip=>{chip.draggable=true;chip.addEventListener('dragstart',event=>{const context=calendarRowFromChip(wrap,chip);if(!context){event.preventDefault();return}wrap._calendarDrag={...context,sourceStart:databaseDateParts(context.row.cells[context.dateColumn.id])[0]};chip.classList.add('dragging');event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',context.row.id)});chip.addEventListener('dragend',()=>{chip.classList.remove('dragging');wrap._calendarDrag=null;clear();setTimeout(()=>{wrap._calendarDragMoved=false},0)});chip.addEventListener('click',event=>{if(!wrap._calendarDragMoved)return;event.preventDefault();event.stopImmediatePropagation();wrap._calendarDragMoved=false},true)});shell.querySelectorAll('.db-calendar-week').forEach(week=>{week.addEventListener('dragover',event=>{if(!wrap._calendarDrag)return;event.preventDefault();event.dataTransfer.dropEffect='move';clear();cellAt(week,event.clientX)?.classList.add('drag-over')});week.addEventListener('drop',event=>{if(!wrap._calendarDrag)return;event.preventDefault();event.stopPropagation();const cell=cellAt(week,event.clientX);const target=cell?.dataset.date;if(target)move(wrap._calendarDrag,target)});week.addEventListener('dragleave',event=>{if(!week.contains(event.relatedTarget))clear()})})}
const renderDatabaseBodyBase=renderDatabaseBody;renderDatabaseBody=wrap=>{renderDatabaseBodyBase(wrap);bindCalendarDrag(wrap)};
function assignCalendarDropDates(wrap){const shell=wrap.querySelector('.db-calendar');if(!shell||!wrap._calendarCursor)return;const cursor=wrap._calendarCursor,start=new Date(Date.UTC(cursor.getUTCFullYear(),cursor.getUTCMonth(),1-cursor.getUTCDay()));shell.querySelectorAll('.db-calendar-week').forEach((week,weekIndex)=>{const weekStart=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth(),start.getUTCDate()+weekIndex*7));week.querySelectorAll('.db-calendar-day').forEach((cell,column)=>{cell.dataset.date=calendarDateKey(new Date(Date.UTC(weekStart.getUTCFullYear(),weekStart.getUTCMonth(),weekStart.getUTCDate()+column)))})})}
const bindCalendarDragBase=bindCalendarDrag;bindCalendarDrag=wrap=>{assignCalendarDropDates(wrap);bindCalendarDragBase(wrap)};
const databaseBlockContextBase=databaseBlock;
databaseBlock=block=>{const wrap=databaseBlockContextBase(block);wrap.addEventListener('contextmenu',event=>{event.preventDefault();event.stopPropagation();const chip=event.target.closest('.db-calendar-range');const context=chip&&calendarRowFromChip(wrap,chip);if(context)showCalendarRowMenu(context,event.clientX,event.clientY);else hideBlockMenu()});return wrap};
function safeWebUrl(value){try{const url=new URL(String(value||'').trim());return ['http:','https:'].includes(url.protocol)?url.href:''}catch{return''}}
function safeInlineHref(value){const raw=String(value||'').trim();const web=safeWebUrl(raw);if(web)return web;if(/^mailto:[^\s<>"']+$/i.test(raw)&&!/[\r\n]/.test(raw))return raw;if(/^tel:\+?[0-9().\-\s]{3,32}$/i.test(raw)&&!/[\r\n]/.test(raw))return raw;return''}
function safeEmbedUrl(value){const href=safeWebUrl(value);if(!href)return'';const url=new URL(href);const host=url.hostname.toLowerCase();if(host==='youtu.be')return'https://www.youtube.com/embed/'+url.pathname.slice(1);if(host.endsWith('youtube.com')){const id=url.searchParams.get('v');return id?'https://www.youtube.com/embed/'+encodeURIComponent(id):''}if(host==='vimeo.com')return'https://player.vimeo.com/video/'+url.pathname.split('/').filter(Boolean).at(-1);if(['www.figma.com','figma.com','www.loom.com','loom.com','codepen.io','replit.com','www.google.com','public.flourish.studio'].some(item=>host===item||host.endsWith('.'+item)))return href;return''}
function hideUrlPasteMenu(){const menu=$('url-paste-menu');menu.hidden=true;menu.replaceChildren();state.urlPaste=null;state.urlPasteIndex=0}
function updateUrlPasteSelection(){const buttons=[...$('url-paste-menu').querySelectorAll('button')];buttons.forEach((button,index)=>button.classList.toggle('active',index===state.urlPasteIndex));buttons[state.urlPasteIndex]?.focus({preventScroll:true})}
function applyUrlPasteChoice(choice){const pending=state.urlPaste;if(!pending||!pending.el.isConnected)return hideUrlPasteMenu();const {el,url}=pending;const row=el.closest('.block-row');hideUrlPasteMenu();if(choice==='preview'){const type=safeEmbedUrl(url)?'embed':'bookmark';const next=blockRow({id:row.dataset.id,type,content:url,checked:false,indent_level:Number(row.dataset.indent||0)},0);row.replaceWith(next);renumberBlocks();focusBlock(next);scheduleSave();return}if(choice==='link'){const anchor=document.createElement('a');anchor.href=url;anchor.target='_blank';anchor.rel='noopener noreferrer';anchor.textContent=url;el.replaceChildren(anchor);el.dataset.rich='true';bindEditableLinks(el)}else{el.textContent=url;delete el.dataset.rich}placeCaret(el,true);scheduleSave()}
function openUrlPasteMenu(el,url){hideSlashMenu();hideBlockMenu();hideUrlPasteMenu();state.urlPaste={el,url};const menu=$('url-paste-menu');const supported=!!safeEmbedUrl(url);const choices=[['preview','code','미리보기로 삽입',supported?'지원되는 서비스 임베드':'링크 카드로 미리보기'],['link','files','링크로 삽입','클릭할 수 있는 링크'],['text','type','주소 텍스트로 붙여넣기','서식 없는 일반 텍스트']];menu.innerHTML='<div class="url-paste-heading">URL을 어떻게 붙여넣을까요?</div>'+choices.map(([choice,iconName,label,description],index)=>'<button type="button" role="menuitem" data-url-choice="'+choice+'" class="'+(index===0?'active':'')+'"><span class="url-paste-icon">'+icon(iconName)+'</span><span class="url-paste-copy"><strong>'+label+'</strong><small>'+description+'</small></span></button>').join('');menu.querySelectorAll('button').forEach((button,index)=>{button.onmouseenter=()=>{state.urlPasteIndex=index;updateUrlPasteSelection()};button.onmousedown=event=>event.preventDefault();button.onclick=()=>applyUrlPasteChoice(button.dataset.urlChoice)});menu.onkeydown=event=>{const buttons=[...menu.querySelectorAll('button')];if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();state.urlPasteIndex=(state.urlPasteIndex+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;updateUrlPasteSelection()}else if(event.key==='Enter'){event.preventDefault();applyUrlPasteChoice(buttons[state.urlPasteIndex].dataset.urlChoice)}else if(event.key==='Escape'){event.preventDefault();const target=state.urlPaste?.el;hideUrlPasteMenu();target?.focus()}};menu.hidden=false;const rect=el.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(rect.left,innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,Math.min(rect.bottom+6,innerHeight-menu.offsetHeight-8))+'px';updateUrlPasteSelection()}
function pageLinkValue(value){try{const parsed=JSON.parse(value);if(parsed&&typeof parsed==='object')return{url:String(parsed.url||''),title:String(parsed.title||'연결된 문서'),documentId:String(parsed.document_id||''),iconEmoji:String(parsed.page_icon_emoji||parsed.icon_emoji||''),iconUrl:String(parsed.page_icon_url||parsed.icon_url||'')}}catch{}return{url:String(value||''),title:'연결된 문서',documentId:'',iconEmoji:'',iconUrl:''}}
function pageLinkIconMarkup(meta){const emoji=String(meta?.iconEmoji||'').trim();if(emoji)return '<span class="page-link-icon-emoji" aria-hidden="true">'+escapeText(emoji)+'</span>';const url=safeWebUrl(meta?.iconUrl||'');if(url)return '<img class="page-link-icon-image" src="'+escapeText(url)+'" alt="" loading="lazy" decoding="async" aria-hidden="true">';return icon('files','page-link-icon-svg')}
function mediaBlock(block){const wrap=document.createElement('div');wrap.className='block-content media-block';wrap.dataset.type=block.type;wrap.dataset.urlBlock='true';const pageLink=block.type==='page_link'?pageLinkValue(block.content):null;if(pageLink){wrap.classList.add('notion-page-link');wrap.dataset.pageLinkTitle=pageLink.title;wrap.dataset.pageLinkDocumentId=pageLink.documentId;if(pageLink.iconEmoji)wrap.dataset.pageLinkIconEmoji=pageLink.iconEmoji;if(pageLink.iconUrl)wrap.dataset.pageLinkIconUrl=pageLink.iconUrl}const input=document.createElement('input');input.className='media-url';input.type='url';input.value=pageLink?pageLink.url:(block.content||'');const mediaLabels={image:'이미지',video:'동영상',audio:'오디오',file:'파일',bookmark:'웹 북마크',embed:'임베드',page_link:'문서 링크'};input.placeholder=({image:'이미지 URL을 붙여넣으세요',video:'동영상 URL을 붙여넣으세요',audio:'오디오 URL을 붙여넣으세요',file:'파일 URL을 붙여넣으세요',bookmark:'웹페이지 URL을 붙여넣으세요',embed:'YouTube, Figma, Loom 등 URL',page_link:'JoripNote 문서 URL을 붙여넣으세요'})[block.type];input.setAttribute('aria-label',(mediaLabels[block.type]||'미디어')+' URL');input.disabled=!canEdit();input.maxLength=2000;const preview=document.createElement('div');preview.className='media-preview';preview.setAttribute('aria-live','polite');const refresh=()=>{renderMediaPreview(preview,block.type,input.value,pageLink&&pageLink.title,pageLink);if(pageLink){const link=preview.querySelector('a');const label=link?.querySelector('span');if(label)label.textContent=pageLink.title;if(link&&pageLink.documentId){link.href='/doc/'+pageLink.documentId;link.target='';link.rel='';link.onclick=event=>{event.preventDefault();push(link.getAttribute('href'))}}}};input.oninput=()=>{refresh();scheduleSave()};wrap.append(input,preview);refresh();if((pageLink||!canEdit())&&safeWebUrl(input.value))input.hidden=true;return wrap}
function mediaFilename(value){try{const url=new URL(value);const name=url.pathname.split('/').filter(Boolean).at(-1)||'';return decodeURIComponent(name)}catch{return''}}
function renderMediaPreview(preview,type,value,pageTitle,pageIcon){preview.replaceChildren();const href=safeWebUrl(value);if(!href){preview.textContent='URL을 입력하면 미리보기가 표시됩니다.';return}if(type==='image'){const img=document.createElement('img');img.src=href;img.alt='문서 이미지';img.loading='lazy';img.onerror=()=>{if(!img.isConnected)return;const link=document.createElement('a');link.className='media-unavailable';link.href=href;link.target='_blank';link.rel='noopener noreferrer';link.innerHTML=icon('files')+'<span>이미지를 불러올 수 없습니다.<br>원본 링크가 만료되었거나 접근 권한이 없습니다.</span>';img.replaceWith(link)};preview.append(img);return}if(type==='video'){const video=document.createElement('video');video.src=href;video.controls=true;video.preload='metadata';preview.append(video);return}if(type==='audio'){const audio=document.createElement('audio');audio.src=href;audio.controls=true;audio.preload='metadata';preview.append(audio);return}if(type==='embed'){const embed=safeEmbedUrl(href);if(embed){const frame=document.createElement('iframe');frame.src=embed;frame.loading='lazy';frame.referrerPolicy='no-referrer';frame.allow='fullscreen; picture-in-picture';frame.sandbox='allow-scripts allow-same-origin allow-presentation';preview.append(frame);return}}const link=document.createElement('a');const notionMatch=type==='page_link'?href.match(/[0-9a-f]{32}|[0-9a-f-]{36}/ig):null;const notionId=notionMatch?.length?notionMatch[notionMatch.length-1].replaceAll('-','').toLowerCase():'';if(notionId){link.href='/doc/doc_notion_'+notionId;link.onclick=event=>{event.preventDefault();push(link.getAttribute('href'))}}else{link.href=href;link.target='_blank';link.rel='noopener noreferrer'}const leading=type==='page_link'?pageLinkIconMarkup(pageIcon):icon(type==='bookmark'?'star':'files');link.innerHTML=leading+'<span>'+escapeText(type==='page_link'?(pageTitle||'연결된 문서'):type==='file'?(mediaFilename(href)||'파일 열기'):'웹페이지 열기')+'</span>';if(type==='bookmark'){const src=linkFaviconUrl(href);if(src){const favicon=document.createElement('img');favicon.className='inline-link-favicon';favicon.src=src;favicon.alt='';favicon.loading='lazy';favicon.decoding='async';favicon.setAttribute('aria-hidden','true');favicon.onerror=()=>favicon.remove();link.prepend(favicon)}}preview.append(link)}
const renderMediaPreviewBase=renderMediaPreview;renderMediaPreview=(preview,type,value,pageTitle,pageIcon)=>{renderMediaPreviewBase(preview,type,value,pageTitle,pageIcon);if(type==='embed'){const frame=preview.querySelector('iframe');if(frame){const src=frame.src;frame.referrerPolicy='strict-origin-when-cross-origin';frame.removeAttribute('src');frame.src=src}}};
function tocBlock(){const wrap=document.createElement('div');wrap.className='block-content toc-block';wrap.contentEditable='false';wrap.innerHTML='<strong>목차</strong>';queueMicrotask(()=>refreshTableOfContents(wrap));return wrap}
function refreshTableOfContents(target){if(!target?.isConnected)return;target.querySelectorAll('a').forEach(a=>a.remove());const headings=[...target.closest('.document-editor')?.querySelectorAll('.block-content[data-type^="heading"]')||[]];for(const [index,heading] of headings.entries()){if(!heading.id)heading.id='heading-'+index+'-'+Math.random().toString(36).slice(2,7);const link=document.createElement('a');link.href='#'+heading.id;link.textContent=heading.textContent||'제목 없음';link.style.paddingLeft=((Number(heading.dataset.type.slice(-1))||1)-1)*10+'px';target.append(link)}if(!headings.length){const empty=document.createElement('span');empty.className='muted';empty.textContent='제목 블록을 추가하면 자동으로 표시됩니다.';target.append(empty)}}
function clearDropTargets(){document.querySelectorAll('.block-row.drop-before,.block-row.drop-after').forEach(row=>row.classList.remove('drop-before','drop-after'))}
function syncBlockSelection(){document.querySelectorAll('#block-editor>.block-row').forEach(row=>{const selected=state.selectedBlocks.has(row.dataset.id);row.classList.toggle('selected',selected);row.setAttribute('aria-selected',selected?'true':'false')})}
function clearBlockSelection(){state.selectedBlocks.clear();syncBlockSelection()}
function toggleBlockSelection(row,additive){if(!additive)clearBlockSelection();if(state.selectedBlocks.has(row.dataset.id))state.selectedBlocks.delete(row.dataset.id);else state.selectedBlocks.add(row.dataset.id);syncBlockSelection()}
function selectBlock(row,additive=false){if(additive){toggleBlockSelection(row,true);return}state.selectedBlocks=new Set([row.dataset.id]);syncBlockSelection()}
function selectedRows(){return [...$('block-editor').children].filter(row=>state.selectedBlocks.has(row.dataset.id))}
function bindBlockInteractions(row,handle){if(!canEdit())return;const image=row.querySelector('.media-preview img:not(.inline-link-favicon)');if(image)image.addEventListener('click',(event)=>{event.preventDefault();event.stopPropagation();selectBlock(row,event.shiftKey||event.ctrlKey||event.metaKey)});handle.addEventListener('dragstart',(event)=>{handle.dataset.dragging='true';state.dragRow=row;row.classList.add('dragging');event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',row.dataset.id);hideBlockMenu()});handle.addEventListener('dragend',()=>{row.classList.remove('dragging');state.dragRow=null;clearDropTargets();setTimeout(()=>delete handle.dataset.dragging,0)});handle.addEventListener('click',(event)=>{if(handle.dataset.dragging)return;if(event.shiftKey||event.ctrlKey||event.metaKey){toggleBlockSelection(row,true);hideBlockMenu();return}clearBlockSelection();const rect=handle.getBoundingClientRect();showBlockMenu(row,rect.left,rect.bottom+4)});row.addEventListener('dragover',(event)=>{if(!state.dragRow||state.dragRow===row)return;event.preventDefault();event.dataTransfer.dropEffect='move';clearDropTargets();row.classList.add(event.clientY>row.getBoundingClientRect().top+row.getBoundingClientRect().height/2?'drop-after':'drop-before')});row.addEventListener('dragleave',(event)=>{if(!row.contains(event.relatedTarget))row.classList.remove('drop-before','drop-after')});row.addEventListener('drop',(event)=>{if(!state.dragRow||state.dragRow===row)return;event.preventDefault();const after=row.classList.contains('drop-after');const dragged=state.dragRow;after?row.after(dragged):row.before(dragged);dragged.classList.remove('dragging');state.dragRow=null;clearDropTargets();renumberBlocks();scheduleSave();dragged.querySelector('.block-content')?.focus()});row.addEventListener('contextmenu',(event)=>{event.preventDefault();showBlockMenu(row,event.clientX,event.clientY)})}
function moveBlockRow(row,direction){const sibling=direction<0?row.previousElementSibling:row.nextElementSibling;if(!sibling)return false;direction<0?sibling.before(row):sibling.after(row);renumberBlocks();scheduleSave();row.querySelector('.block-content')?.focus();return true}
function splitToggleContent(value){const parts=String(value||'').split('\n');return{summary:parts.shift()||'',body:parts.join('\n')}}
const RICH_PREFIX='@qwerty-rich:';
const LEGACY_TOGGLE_GROUP_PREFIX='@qwerty-toggle-group:';
splitToggleContent=value=>{const raw=String(value||''),marker=raw.match(/^@qwerty-toggle-group:(\d+)\n([\s\S]*)$/);if(marker)return{summary:marker[2]||'세부 내용',body:'',groupSize:Number(marker[1])||0};const parts=raw.split('\n');return{summary:parts.shift()||'',body:parts.join('\n'),groupSize:0}};
function refreshLegacyToggleGroups(root){if(!root)return;const rows=[...root.children];for(const [index,row] of rows.entries()){let hidden=false;for(let groupIndex=0;groupIndex<index;groupIndex+=1){const group=rows[groupIndex],size=Number(group.dataset.toggleGroupSize||0);if(size&&index<=groupIndex+size&&group.querySelector('.toggle-caret')?.getAttribute('aria-expanded')!=='true'){hidden=true;break}}row.hidden=hidden}}
function syncLegacyToggleGroups(root){if(!root)return;const rows=[...root.children];for(const [index,row] of rows.entries()){const size=Number(row.dataset.toggleGroupSize||0);row._legacyGroupRows=size?rows.slice(index+1,index+1+size):[]}refreshLegacyToggleGroups(root)}
function importedLinkLabelText(value){return String(value||'').replace(/\\([\[\]])/g,'$1').replace(/\*\*([^*]+)\*\*/g,'$1').replace(/__([^_]+)__/g,'$1').replace(/\x60([^\x60]+)\x60/g,'$1').trim()}
function importedPageLinkValue(block){if(!block||block.type!=='text')return null;const raw=String(block.content||'').trim();if(!raw)return null;const html=raw.startsWith(RICH_PREFIX)?sanitizeRichHtml(raw.slice(RICH_PREFIX.length)):importedInlineHtml(raw);const template=document.createElement('template');template.innerHTML=html;const nodes=[...template.content.childNodes].filter(node=>node.nodeType!==3||node.textContent.trim());if(nodes.length!==1||nodes[0].nodeType!==1||nodes[0].tagName.toLowerCase()!=='a')return null;const anchor=nodes[0],href=notionInlineHref(anchor.getAttribute('href')||'');if(!href.startsWith('/doc/'))return null;const match=href.match(/^\/doc\/(doc_[A-Za-z0-9_-]{8,80})$/i);const title=importedLinkLabelText(anchor.textContent)||'연결된 문서';return{url:match?location.origin+href:href,title,document_id:match?match[1]:''}}
const mediaBlockVisualBase=mediaBlock;
mediaBlock=block=>{const wrap=mediaBlockVisualBase(block);wrap.classList.add('media-'+String(block.type||'file'));wrap.querySelector('.media-preview')?.classList.add('media-preview-'+String(block.type||'file'));return wrap};
const mediaBlockPageIconBase=mediaBlock;
mediaBlock=block=>{const wrap=mediaBlockPageIconBase(block);if(block.type==='page_link'&&(block.page_icon_emoji||block.page_icon_url)){const link=wrap.querySelector('.media-preview a');const old=link?.querySelector('.page-link-icon-svg');if(link&&old){old.outerHTML=pageLinkIconMarkup({iconEmoji:block.page_icon_emoji,iconUrl:block.page_icon_url})}}return wrap};
const blockRowImportedBase=blockRow;
blockRow=(block,index)=>{const pageLink=importedPageLinkValue(block);if(!pageLink)return blockRowImportedBase(block,index);const row=blockRowImportedBase({...block,type:'page_link',content:JSON.stringify(pageLink)},index);row.classList.add('imported-page-link-row');return row};
document.addEventListener('pointerdown',()=>document.body.classList.add('pointer-mode'),true);document.addEventListener('keydown',()=>document.body.classList.remove('pointer-mode'),true);
function sanitizeRichHtml(html){const template=document.createElement('template');template.innerHTML=String(html||'');for(const node of [...template.content.querySelectorAll('*')]){const tag=node.tagName.toLowerCase();if(!['b','strong','i','em','u','s','del','code','a','br'].includes(tag)){node.replaceWith(...node.childNodes);continue}const href=tag==='a'?notionInlineHref(node.getAttribute('href')):'';for(const attr of [...node.attributes])node.removeAttribute(attr.name);if(tag==='a'){if(href){node.href=href;if(href.startsWith('/doc/'))node.dataset.internalPage='true';else if(/^https?:/i.test(href)){node.target='_blank';node.rel='noopener noreferrer'}else{node.removeAttribute('target');node.removeAttribute('rel')}}else node.replaceWith(...node.childNodes)}}return template.innerHTML}
const BLOCK_A11Y_LABELS={text:'텍스트',heading1:'제목 1',heading2:'제목 2',heading3:'제목 3',heading4:'제목 4',heading5:'제목 5',heading6:'제목 6',bullet:'글머리 목록',numbered:'번호 목록',todo:'할 일',toggle:'토글',callout:'콜아웃',quote:'인용문',code:'코드',math:'수학 공식',divider:'구분선'};
function editable(block,part='main'){const el=document.createElement('div');const editableMode=canEdit()&&block.type!=='divider';el.className='block-content';el.contentEditable=editableMode?'true':'false';el.dataset.type=block.type;if(part!=='main')el.dataset.togglePart=part;el.dataset.placeholder=block.type==='text'?'내용을 입력하거나 / 명령어를 사용하세요':'';const label=(BLOCK_A11Y_LABELS[block.type]||'문서')+(part==='summary'?' 제목':part==='body'?' 내용':' 블록');if(editableMode){el.setAttribute('role','textbox');el.setAttribute('aria-multiline','true');el.setAttribute('aria-label',label)}else if(block.type==='divider'){el.setAttribute('role','separator')}else if(/^heading[1-6]$/.test(block.type)){el.setAttribute('role','heading');el.setAttribute('aria-level',block.type.slice(-1))}const raw=String(block.content||'');if(part==='main'&&raw.startsWith(RICH_PREFIX)){el.innerHTML=sanitizeRichHtml(raw.slice(RICH_PREFIX.length));el.dataset.rich='true'}else el.textContent=raw;el.addEventListener('input',()=>{if(part==='main'&&el.textContent.startsWith('/'))showSlashMenu(el);else hideSlashMenu();scheduleSave();document.querySelectorAll('.toc-block').forEach(refreshTableOfContents)});el.addEventListener('keydown',(event)=>handleBlockKey(event,el));return el}
function notionInlineHref(value){const raw=String(value||'').trim().replaceAll('&amp;','&');if(/^\/doc\/[A-Za-z0-9_-]+(?:[/?#].*)?$/.test(raw))return raw;const href=safeInlineHref(raw);if(!href)return'';if(/^(?:mailto|tel):/i.test(href))return href;try{const url=new URL(href),host=url.hostname.toLowerCase();if(!['app.notion.com','notion.so','www.notion.so','notion.site','www.notion.site'].includes(host)&&!host.endsWith('.notion.so')&&!host.endsWith('.notion.site'))return href;const match=href.match(/([0-9a-f]{32})(?:[^0-9a-f]|$)/i)||href.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:[^0-9a-f]|$)/i);return match?'/doc/doc_notion_'+match[1].replaceAll('-','').toLowerCase():href}catch{return href}}
function importedInlineHtml(value){const raw=String(value||'');if(raw.startsWith(RICH_PREFIX))return sanitizeRichHtml(raw.slice(RICH_PREFIX.length));let html=escapeText(raw).replace(/\r?\n/g,'<br>');const link=(url,label)=>{const safe=safeInlineHref(String(url||'').replaceAll('&amp;','&'));if(!safe)return label;const href=notionInlineHref(safe),internal=href.startsWith('/doc/');return'<a href="'+escapeText(href)+'"'+(internal?' data-internal-page="true"':' target="_blank" rel="noopener noreferrer"')+'>'+label+'</a>'};html=html.replace(/&lt;page\b[\s\S]*?\burl\s*=\s*(["'])(.*?)\1[\s\S]*?&gt;([\s\S]*?)&lt;\/page&gt;/gi,(_m,_q,url,label)=>link(url,label));html=html.replace(/&lt;(?:mention-page|unknown)\b[\s\S]*?\burl\s*=\s*(["'])(.*?)\1[\s\S]*?\/?&gt;/gi,(_m,_q,url)=>link(url,'연결된 Notion 페이지'));html=html.replace(/&lt;a\b[\s\S]*?\bhref\s*=\s*(["'])(.*?)\1[\s\S]*?&gt;([\s\S]*?)&lt;\/a&gt;/gi,(_m,_q,url,label)=>link(url,label));html=html.replace(/!?\[([^\]\r\n]+)\]\((https?:\/\/[^)\s]+)\)/gi,(_m,label,url)=>link(url,label));const anchors=[];html=html.replace(/<a\b[\s\S]*?<\/a>/gi,match=>{anchors.push(match);return'\u0000'+(anchors.length-1)+'\u0000'});html=html.replace(/(?<!["'=])(https?:\/\/[^\s<>&"']+)/gi,match=>link(match,escapeText(match)));html=html.replace(/\x60([^\x60]+)\x60/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/__([^_]+)__/g,'<strong>$1</strong>').replace(/~~([^~]+)~~/g,'<del>$1</del>').replace(/\*([^*]+)\*/g,'<em>$1</em>');return html.replace(/\u0000(\d+)\u0000/g,(_m,index)=>anchors[Number(index)]||'')}
const editableImportedBase=editable;
editable=(block,part='main')=>{const el=editableImportedBase(block,part),raw=String(block.content||'');if(block.type!=='code'&&!isLegacyNotionJsonFragment(raw)&&!raw.startsWith(RICH_PREFIX)){const html=importedInlineHtml(raw);if(html!==escapeText(raw)){el.innerHTML=html;el.dataset.rich='true'}}if(el.querySelector('a[data-internal-page]'))el.addEventListener('click',event=>{const link=event.target.closest('a[data-internal-page]');if(link){event.preventDefault();push(link.getAttribute('href'))}},true);return el};
const editableLinkLabelBase=editable;
editable=(block,part='main')=>{const el=editableLinkLabelBase(block,part);el.querySelectorAll('a').forEach(anchor=>{if(/(?:\*\*|__|\x60)/.test(anchor.textContent||''))anchor.textContent=importedLinkLabelText(anchor.textContent)});return el};
const editableEscapedMarkdownBase=editable;
editable=(block,part='main')=>{const raw=String(block.content||'');if(part==='main'&&!raw.startsWith(RICH_PREFIX)&&/\\[\[\]]/.test(raw))return editableEscapedMarkdownBase({...block,content:raw.replace(/\\([\[\]])/g,'$1')},part);return editableEscapedMarkdownBase(block,part)};
function linkFaviconUrl(value){try{const url=new URL(String(value||''),location.origin);if(!['http:','https:'].includes(url.protocol))return'';const host=url.hostname.toLowerCase();if(host==='open.kakao.com')return'https://iopen.kakaocdn.net/favicon.ico';return'https://www.google.com/s2/favicons?domain='+encodeURIComponent(host)+'&sz=16'}catch{return''}}
function bindEditableLinks(el){el.querySelectorAll('a').forEach(anchor=>{anchor.contentEditable='false';if(anchor.dataset.internalPage||String(anchor.getAttribute('href')||'').startsWith('/doc/'))return;if(anchor.querySelector('.inline-link-favicon'))return;const src=linkFaviconUrl(anchor.href||anchor.getAttribute('href')||'');if(!src)return;const favicon=document.createElement('img');favicon.className='inline-link-favicon';favicon.src=src;favicon.alt='';favicon.loading='lazy';favicon.decoding='async';favicon.setAttribute('aria-hidden','true');favicon.onerror=()=>favicon.remove();anchor.prepend(favicon)});return el}
const editableLinkInteractionBase=editable;
editable=(block,part='main')=>bindEditableLinks(editableLinkInteractionBase(block,part));
const openDocumentNotionClassBase=openDocument;
openDocument=async(id,pushUrl=true)=>{clearBlockSelection();const result=await openDocumentNotionClassBase(id,pushUrl);$('editor-view').classList.toggle('notion-imported',/^doc_notion(?:db)?_/i.test(String(id||'')));return result};
const openDocumentViewPreferenceBase=openDocument;
openDocument=async(id,pushUrl=true)=>{state.databaseViewPreferences=new Map();try{const data=await api('/api/documents/'+id+'/view-preferences');for(const preference of data.preferences||[]){if(preference?.block_id)state.databaseViewPreferences.set(String(preference.block_id),{view_id:String(preference.view_id||''),view_type:String(preference.view_type||'')})}}catch{}return openDocumentViewPreferenceBase(id,pushUrl)};
function caretOffset(el){const selection=getSelection();if(!selection||!selection.rangeCount||!selection.isCollapsed||!el.contains(selection.anchorNode))return null;const range=selection.getRangeAt(0).cloneRange();range.selectNodeContents(el);range.setEnd(selection.anchorNode,selection.anchorOffset);return range.toString().length}
function selectionAtEnd(el){return caretOffset(el)===el.textContent.length}
function placeCaret(el,atEnd){el.focus();const range=document.createRange();range.selectNodeContents(el);range.collapse(!atEnd);const selection=getSelection();selection.removeAllRanges();selection.addRange(range)}
function moveCaretToAdjacent(el,direction){const editables=[...document.querySelectorAll('.block-content[contenteditable="true"],.media-url:not(:disabled),.block-table input:not(:disabled)')].filter(item=>item.offsetParent!==null);const index=editables.indexOf(el);const target=editables[index+direction];if(!target)return false;if(target.matches('input')){target.focus();target.setSelectionRange(direction<0?target.value.length:0,direction<0?target.value.length:0)}else placeCaret(target,direction<0);target.scrollIntoView({block:'nearest'});return true}
function applyInputShortcut(event,el){if(event.key!==' '||el.dataset.type!=='text')return false;const offset=caretOffset(el);if(offset===null)return false;const text=el.textContent;const before=text.slice(0,offset);const shortcuts={'[]':['todo',false],'[ ]':['todo',false],'[x]':['todo',true],'[X]':['todo',true],'-':['bullet',false],'*':['bullet',false],'+':['bullet',false],'1.':['numbered',false],'>':['quote',false],'!':['callout',false],'#':['heading1',false],'##':['heading2',false],'###':['heading3',false],'####':['heading4',false],'---':['divider',false]};shortcuts[String.fromCharCode(96).repeat(3)]=['code',false];const match=shortcuts[before];if(!match)return false;event.preventDefault();replaceBlockType(el,match[0],match[1],text.slice(offset));return true}
const CONTINUING_BLOCK_TYPES=new Set(['bullet','numbered','todo']);
const INDENTABLE_BLOCK_TYPES=new Set(['text','heading1','heading2','heading3','heading4','heading5','heading6','bullet','numbered','todo','quote','toggle','callout','math']);
function setRowIndent(row,level){const value=Math.max(0,Math.min(4,level));row.dataset.indent=String(value);row.style.setProperty('--indent',String(value));renumberBlocks();scheduleSave()}
function changeBlockIndent(row,direction){const el=row?.querySelector('.block-content');if(!INDENTABLE_BLOCK_TYPES.has(el?.dataset.type))return false;const current=Math.max(0,Math.min(4,Number(row.dataset.indent||0)));if(direction>0){const previous=row.previousElementSibling;if(!previous||current>=4||Number(previous.dataset.indent||0)<current)return false}else if(direction<0&&current<=0)return false;setRowIndent(row,current+direction);return true}
function splitEditableBlock(row,el){const offset=caretOffset(el);const text=el.textContent;const type=el.dataset.type;el.textContent=text.slice(0,offset);el.dataset.rich='false';const nextType=CONTINUING_BLOCK_TYPES.has(type)?type:'text';const next=blockRow({...newBlock(nextType),content:text.slice(offset),indent_level:Number(row.dataset.indent||0)},0);row.after(next);renumberBlocks();focusBlock(next);scheduleSave();hideSlashMenu()}
function mergeWithPrevious(row,el){const previous=row.previousElementSibling;const target=previous?.querySelector('.block-content[contenteditable="true"]');if(!target)return false;const offset=target.textContent.length;target.textContent+=el.textContent;target.dataset.rich='false';row.remove();renumberBlocks();placeCaretAtOffset(target,offset);scheduleSave();return true}
function placeCaretAtOffset(el,offset){el.focus();const range=document.createRange();const node=el.firstChild||el.appendChild(document.createTextNode(''));range.setStart(node,Math.min(offset,node.textContent.length));range.collapse(true);const selection=getSelection();selection.removeAllRanges();selection.addRange(range)}
function handleBlockKey(event,el){if(!canEdit())return;if((event.ctrlKey||event.metaKey)&&['b','i','u'].includes(event.key.toLowerCase())){event.preventDefault();document.execCommand(({b:'bold',i:'italic',u:'underline'})[event.key.toLowerCase()]);el.dataset.rich='true';scheduleSave();return}if(!$('slash-menu').hidden&&handleSlashKey(event))return;if(applyInputShortcut(event,el))return;const row=el.closest('.block-row');if(event.key==='Tab'){if(el.dataset.type==='code'){event.preventDefault();document.execCommand('insertText',false,'\t');scheduleSave();return}if(changeBlockIndent(row,event.shiftKey?-1:1)||INDENTABLE_BLOCK_TYPES.has(el.dataset.type))event.preventDefault();return}if(event.key==='Enter'&&event.shiftKey&&el.dataset.type!=='code'){event.preventDefault();document.execCommand('insertLineBreak');scheduleSave();return}if(event.altKey&&(event.key==='ArrowUp'||event.key==='ArrowDown')){event.preventDefault();moveBlockRow(row,event.key==='ArrowUp'?-1:1);return}const offset=caretOffset(el);if(!event.shiftKey&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&((event.key==='ArrowUp'&&offset===0)||(event.key==='ArrowLeft'&&offset===0))){event.preventDefault();moveCaretToAdjacent(el,-1);return}if(!event.shiftKey&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&((event.key==='ArrowDown'&&offset===el.textContent.length)||(event.key==='ArrowRight'&&offset===el.textContent.length))){event.preventDefault();moveCaretToAdjacent(el,1);return}if(el.dataset.togglePart==='body'){if(event.key==='Escape'){hideSlashMenu();hideBlockMenu()}return}if(event.key==='Enter'&&!event.shiftKey&&el.dataset.type!=='code'){event.preventDefault();const type=el.dataset.type;if(CONTINUING_BLOCK_TYPES.has(type)&&!el.textContent.trim()){replaceBlockType(el,'text');return}splitEditableBlock(row,el)}else if(event.key==='Backspace'&&offset===0&&row.previousElementSibling){event.preventDefault();mergeWithPrevious(row,el);hideSlashMenu()}else if(event.key==='Backspace'&&!el.textContent&&$('block-editor').children.length>1){event.preventDefault();const focus=row.previousElementSibling||row.nextElementSibling;row.remove();renumberBlocks();if(focus)placeCaret(focus.querySelector('.block-content'),true);scheduleSave();hideSlashMenu()}else if(event.key==='Escape'){hideSlashMenu();hideBlockMenu()}}
function handleBlockIndentShortcut(event,el){if(!el||!['Tab'].includes(event.key)&&event.code!=='Tab')return false;if(el.dataset.type==='code'||!INDENTABLE_BLOCK_TYPES.has(el.dataset.type))return false;const row=el.closest('.block-row');if(!row)return false;event.preventDefault();event.stopPropagation();changeBlockIndent(row,event.shiftKey?-1:1);return true}
document.addEventListener('keydown',event=>{const el=event.target?.closest?.('.block-content[contenteditable="true"]');if(el)handleBlockIndentShortcut(event,el)},true);
$('append-block').onclick=()=>{const row=blockRow(newBlock(),0);$('block-editor').append(row);renumberBlocks();row.querySelector('.block-content').focus();scheduleSave()};
function slashSearchText(type,symbol,label,desc,category){const aliases={text:'text paragraph plain 텍스트 문단',heading1:'h1 heading title 제목',heading2:'h2 heading title 제목',heading3:'h3 heading title 제목',heading4:'h4 heading title 제목',heading5:'h5 heading title 제목',heading6:'h6 heading title 제목',bullet:'bullet bulleted list 목록 리스트 글머리',numbered:'numbered ordered list 목록 리스트 번호',todo:'todo task checklist 할 일 체크',toggle:'toggle collapsible 토글 접기',callout:'callout 강조 안내',quote:'quote blockquote 인용',table:'table grid 표',divider:'divider separator horizontal 구분선',page_link:'page link subpage 페이지 링크 하위 페이지',image:'image 사진 이미지',video:'video 동영상',audio:'audio 오디오',code:'code codeblock 코드 소스',file:'file attachment 파일 첨부',bookmark:'bookmark web 북마크 웹',database:'database data table 데이터베이스',toc:'toc table of contents 목차',math:'math equation formula 수식',embed:'embed iframe 임베드'};return(type+' '+symbol+' '+label+' '+desc+' '+category+' '+(aliases[type]||'')).normalize('NFKC').toLocaleLowerCase('ko-KR')}
function positionSlashMenu(menu,anchor){const rect=anchor.getBoundingClientRect();const width=Math.min(Math.max(menu.offsetWidth||280,260),Math.max(260,innerWidth-16));const height=menu.offsetHeight||320;const left=Math.max(8,Math.min(rect.left,innerWidth-width-8));const below=innerHeight-(rect.bottom+6);const top=below>=height||rect.top<height+8?rect.bottom+6:rect.top-height-6;menu.style.left=Math.round(left)+'px';menu.style.top=Math.round(Math.max(8,Math.min(top,innerHeight-height-8)))+'px'}
function updateSlashSelection(){const buttons=[...$('slash-menu').querySelectorAll('.slash-item')];buttons.forEach((button,index)=>button.classList.toggle('active',index===state.slashIndex));const active=buttons[state.slashIndex];if(active){state.slashBlock?.setAttribute('aria-activedescendant',active.id);active.scrollIntoView({block:'nearest'})}}
function showSlashMenu(el){state.slashBlock=el;const raw=el.textContent.startsWith('/')?el.textContent.slice(1):el.textContent;const query=raw.normalize('NFKC').toLocaleLowerCase('ko-KR').trim();const items=blockLabels.filter(([type,symbol,label,desc,category])=>slashSearchText(type,symbol,label,desc,category).includes(query));const menu=$('slash-menu');state.slashIndex=0;const nodes=[];let category='';let buttonIndex=0;for(const [type,symbol,label,desc,nextCategory] of items){if(nextCategory!==category){category=nextCategory;const heading=document.createElement('div');heading.className='slash-category';heading.textContent=category;heading.role='presentation';nodes.push(heading)}const index=buttonIndex++;const button=document.createElement('button');button.type='button';button.role='menuitem';button.id='slash-option-'+index;button.tabIndex=-1;button.className='slash-item'+(index===0?' active':'');button.dataset.blockType=type;button.innerHTML='<span class="slash-icon">'+icon(blockIconName[type]||'type')+'</span><span><strong>'+escapeText(label)+'</strong><small>'+escapeText(desc)+'</small></span>';button.onmouseenter=()=>{state.slashIndex=index;updateSlashSelection()};button.onmousedown=(event)=>{event.preventDefault();changeBlockType(el,type)};nodes.push(button)}if(!items.length){const empty=document.createElement('div');empty.className='slash-empty';empty.textContent='일치하는 블록이 없습니다.';nodes.push(empty)}menu.replaceChildren(...nodes);menu.hidden=false;positionSlashMenu(menu,el);el.setAttribute('aria-haspopup','menu');el.setAttribute('aria-controls','slash-menu');el.setAttribute('aria-expanded',items.length?'true':'false');if(items.length)updateSlashSelection()}
function handleSlashKey(event){const buttons=[...$('slash-menu').querySelectorAll('.slash-item')];if(!buttons.length){if(event.key==='Escape'){event.preventDefault();hideSlashMenu();return true}return false}if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();state.slashIndex=(state.slashIndex+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;updateSlashSelection();return true}if(event.key==='Enter'){event.preventDefault();changeBlockType(state.slashBlock,buttons[state.slashIndex].dataset.blockType);return true}if(event.key==='Escape'){event.preventDefault();hideSlashMenu();return true}return false}
function hideSlashMenu(){const target=state.slashBlock;if(target){target.setAttribute('aria-expanded','false');target.removeAttribute('aria-activedescendant')}$('slash-menu').hidden=true;state.slashBlock=null;state.slashIndex=0}
function focusBlock(row,atEnd=false){const target=row.querySelector('.block-content[contenteditable="true"],.media-url:not(:disabled),.block-table input:not(:disabled),.db-title:not(:disabled),.db-cell-input:not(:disabled)');if(!target)return;if(target.matches('input,select'))target.focus();else placeCaret(target,atEnd)}
function replaceBlockType(el,type,checked=false,content=''){const row=el.closest('.block-row');const id=row.dataset.id;const next=blockRow({id,type,content,checked,indent_level:Number(row.dataset.indent||0)},0);row.replaceWith(next);renumberBlocks();if(type==='divider'){const following=blockRow(newBlock(),0);next.after(following);focusBlock(following)}else focusBlock(next);scheduleSave();hideSlashMenu()}
function changeBlockType(el,type){replaceBlockType(el,type,false)}
function blockDataFromRow(row){const el=row.querySelector('.block-content');const type=el.dataset.type;let content=type==='code'?(el.innerText||el.textContent||''):el.textContent;let checked=row.querySelector('input[type=checkbox]')?.checked||false;if(el.dataset.database==='true'){
  const model=el._databaseModel;
  const chunks=Array.isArray(el._databaseChunks)&&el._databaseChunks.length>1?el._databaseChunks:null;
  if(chunks){
    const byId=new Map((model.rows||[]).map(item=>[String(item.id),item]));
    const seen=new Set();
    return chunks.map((chunk,index)=>{
      const rows=[];
      for(const original of chunk.rows||[]){const current=byId.get(String(original.id));if(current){rows.push(current);seen.add(String(original.id))}}
      if(index===chunks.length-1)for(const current of model.rows||[]){if(!seen.has(String(current.id)))rows.push(current)}
      const next={...chunk,title:model.title,columns:model.columns,views:model.views,view:model.view,rows};
      return{id:'blk_'+crypto.randomUUID().replaceAll('-',''),type:'database',content:JSON.stringify(next).slice(0,100000),checked:false,indent_level:Number(row.dataset.indent||0)};
    });
  }
  content=JSON.stringify(model);
}else if(el.dataset.structured==='grid'){content=JSON.stringify([...el.querySelectorAll('.block-table tr')].map(tr=>[...tr.querySelectorAll('input')].map(input=>input.value)))}else if(el.dataset.urlBlock==='true'){const url=el.querySelector('.media-url')?.value||'';content=type==='page_link'&&el.dataset.pageLinkTitle?JSON.stringify({url,title:el.dataset.pageLinkTitle,...(el.dataset.pageLinkDocumentId?{document_id:el.dataset.pageLinkDocumentId}:{}),...(el.dataset.pageLinkIconEmoji?{page_icon_emoji:el.dataset.pageLinkIconEmoji}:{}),...(el.dataset.pageLinkIconUrl?{page_icon_url:el.dataset.pageLinkIconUrl}:{})}):url}else if(type==='toc'||type==='divider')content='';else if(type==='toggle'){const body=row.querySelector('[data-toggle-part="body"]');content=el.textContent+(body?.textContent?'\n'+body.textContent:'');checked=row.querySelector('.toggle-caret')?.getAttribute('aria-expanded')==='true'}else if(el.dataset.rich==='true'||el.querySelector('b,strong,i,em,u,s,code,a'))content=RICH_PREFIX+sanitizeRichHtml(el.innerHTML);return{id:row.dataset.id,type,content:content.slice(0,type==='database'?100000:20000),checked,indent_level:Number(row.dataset.indent||0)}}
const blockDataFromRowLegacyBase=blockDataFromRow;
blockDataFromRow=row=>{const data=blockDataFromRowLegacyBase(row);if(Array.isArray(data)||data?.type!=='toggle'||!Number(row.dataset.toggleGroupSize||0))return data;const groupRows=(row._legacyGroupRows||[]).filter(item=>item.isConnected),summary=row.querySelector('[data-toggle-part=\"summary\"]')?.textContent||'세부 내용';data.content=LEGACY_TOGGLE_GROUP_PREFIX+groupRows.length+'\n'+summary;return data};
function hideBlockMenu(){$('block-menu').hidden=true;state.contextRow=null}
function blockMenuButton(label,iconName,action,danger=false){const button=document.createElement('button');button.type='button';button.role='menuitem';button.innerHTML=icon(iconName)+'<span>'+escapeText(label)+'</span>';if(danger)button.classList.add('danger-text');button.onclick=()=>runBlockMenuAction(action);return button}
function showBlockMenu(row,x,y){if(!canEdit())return;state.contextRow=row;hideSlashMenu();hideTreeMenu();const menu=$('block-menu');const items=[blockMenuButton('일반 텍스트로 전환','type','type:text'),blockMenuButton('할 일로 전환','check-square','type:todo'),blockMenuButton('글머리 목록으로 전환','list','type:bullet'),blockMenuButton('번호 목록으로 전환','list-ordered','type:numbered'),blockMenuButton('토글로 전환','chevron-right','type:toggle'),separator(),blockMenuButton('위에 블록 추가','plus','insert-above'),blockMenuButton('아래에 블록 추가','plus','insert-below'),blockMenuButton('블록 복제','copy','duplicate'),separator(),blockMenuButton('위로 이동','arrow-up','move-up'),blockMenuButton('아래로 이동','arrow-down','move-down'),blockMenuButton('블록 삭제','trash','delete',true)];menu.replaceChildren(...items);menu.hidden=false;const width=menu.offsetWidth;const height=menu.offsetHeight;menu.style.left=Math.max(8,Math.min(x,innerWidth-width-8))+'px';menu.style.top=Math.max(8,Math.min(y,innerHeight-height-8))+'px';menu.querySelector('button')?.focus();menu.onkeydown=(event)=>{const buttons=[...menu.querySelectorAll('button')];const index=buttons.indexOf(document.activeElement);if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();buttons[(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus()}else if(event.key==='Escape'){event.preventDefault();hideBlockMenu();row.querySelector('.block-content')?.focus()}}}
function separator(){const line=document.createElement('div');line.className='block-menu-separator';line.role='separator';return line}
function runBlockMenuAction(action){const row=state.contextRow;if(!row||!row.isConnected)return hideBlockMenu();if(action.startsWith('type:')){const data=blockDataFromRow(row);data.type=action.slice(5);data.checked=data.type==='toggle'?data.checked:false;const next=blockRow(data,0);row.replaceWith(next);focusBlock(next,true)}else if(action==='insert-above'||action==='insert-below'){const next=blockRow(newBlock(),0);action==='insert-above'?row.before(next):row.after(next);focusBlock(next)}else if(action==='duplicate'){const data=blockDataFromRow(row);data.id='blk_'+crypto.randomUUID().replaceAll('-','');const next=blockRow(data,0);row.after(next);focusBlock(next,true)}else if(action==='move-up'||action==='move-down'){moveBlockRow(row,action==='move-up'?-1:1);hideBlockMenu();return}else if(action==='delete'){const focus=row.previousElementSibling||row.nextElementSibling;if($('block-editor').children.length===1){const next=blockRow(newBlock(),0);row.replaceWith(next);focusBlock(next)}else{row.remove();if(focus)focusBlock(focus,true)}}renumberBlocks();scheduleSave();hideBlockMenu()}
document.addEventListener('mousedown',(event)=>{if(!$('slash-menu').contains(event.target)&&event.target!==state.slashBlock)hideSlashMenu();if(!$('block-menu').contains(event.target)&&!event.target.closest('.block-handle'))hideBlockMenu();if(!$('tree-menu').contains(event.target))hideTreeMenu();if(!$('url-paste-menu').contains(event.target))hideUrlPasteMenu()});
function renumberBlocks(root=$('block-editor')){const counters=new Map();let listActive=false;for(const row of root.children){const el=row.querySelector('.block-content');if(!el)continue;const type=el.dataset.type,indent=Number(row.dataset.indent||0);if(type==='numbered'){if(!listActive)counters.clear();for(const level of counters.keys())if(level>indent)counters.delete(level);const number=(counters.get(indent)||0)+1;counters.set(indent,number);el.dataset.number=number;listActive=true;continue}delete el.dataset.number;if(type==='code'||type==='quote')continue;if((type==='bullet'||type==='todo')&&indent>0)continue;counters.clear();listActive=false}}
const renumberBlocksLegacyBase=renumberBlocks;
renumberBlocks=(root=$('block-editor'))=>{syncLegacyToggleGroups(root);return renumberBlocksLegacyBase(root)};
function collectBlocks(){const output=[];for(const row of $('block-editor').children){const data=blockDataFromRow(row);if(Array.isArray(data))output.push(...data);else output.push(data)}return output.map((block,index)=>({...block,position:index}))}
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
async function showMembers(){if(state.dirty&&!await flushSave())return;state.current=null;markNav('members');showPane('members-view');state.membersCursor=null;state.invitesCursor=null;$('member-list').replaceChildren();$('notion-member-list').replaceChildren();$('invite-list').replaceChildren();loadMembers(false);loadNotionMembers();if(canManage())loadInvites(false);else $('invite-list').innerHTML='<div class="empty-state">초대 관리 권한이 없습니다.</div>'}
async function loadMembers(append){if(!append)showLoading('member-list','member',4);else setLoadButton('load-more-members',true);const params=new URLSearchParams({limit:'20'});if(state.membersCursor)params.set('cursor',state.membersCursor);try{const data=await api('/api/members?'+params);if(!append)$('member-list').replaceChildren();data.members.forEach((member)=>$('member-list').append(memberRow(member)));state.membersCursor=data.next_cursor;$('load-more-members').hidden=!state.membersCursor;$('member-count').textContent=data.members.length+(state.membersCursor?'+':'')+'명'}catch(error){if(!append)$('member-list').innerHTML='<div class="empty-state">'+escapeText(error.message)+'</div>'}finally{finishLoading('member-list');setLoadButton('load-more-members',false)}}
$('load-more-members').onclick=()=>loadMembers(true);
function memberRow(member){const row=document.createElement('div');row.className='member-row';const info=document.createElement('div');info.className='member-info';const avatar=document.createElement('span');avatar.className='avatar';avatar.textContent=member.username.slice(0,1).toUpperCase();avatar.setAttribute('aria-hidden','true');const copy=document.createElement('div');const name=document.createElement('strong');name.textContent=member.username+(member.user_id===state.user.id?' (나)':'');const joined=document.createElement('small');joined.textContent='참여 '+new Date(member.joined_at*1000).toLocaleDateString();copy.append(name,joined);info.append(avatar,copy);const controls=document.createElement('div');controls.className='member-controls';if(canManage()&&member.user_id!==state.user.id){const select=document.createElement('select');select.setAttribute('aria-label',member.username+' 역할');const allowed=state.role==='owner'?['owner','admin','member','viewer']:['member','viewer'];const visibleRoles=allowed.includes(member.role)?allowed:[member.role,...allowed];for(const role of visibleRoles){const option=document.createElement('option');option.value=role;option.textContent=roleLabel[role];option.selected=role===member.role;select.append(option)}if(!allowed.includes(member.role))select.disabled=true;select.onchange=async()=>{try{await api('/api/members/'+member.user_id,{method:'PATCH',body:{role:select.value}});toast('역할을 변경했습니다.')}catch(error){select.value=member.role;toast(error.message)}};controls.append(select);if(state.role==='owner'){const remove=actionButton('제거',async()=>{if(!confirm(member.username+' 멤버를 제거할까요?'))return;try{await api('/api/members/'+member.user_id,{method:'DELETE'});showMembers()}catch(error){toast(error.message)}},true);controls.append(remove)}}else{const role=document.createElement('span');role.className='muted';role.textContent=roleLabel[member.role];controls.append(role)}row.append(info,controls);return row}
async function loadNotionMembers(){showLoading('notion-member-list','member',3);try{const data=await api('/api/notion-members');const list=$('notion-member-list');list.replaceChildren();for(const member of data.members){const row=document.createElement('div');row.className='member-row';const info=document.createElement('div');info.className='member-info';const avatar=document.createElement('span');avatar.className='avatar';avatar.textContent=(member.name||member.email||'?').slice(0,1).toUpperCase();const copy=document.createElement('div');const name=document.createElement('strong');name.textContent=member.name||'이름 정보 없음';const email=document.createElement('small');email.textContent=member.email||'이메일 권한 필요';copy.append(name,email);info.append(avatar,copy);const type=document.createElement('span');type.className='muted';type.textContent=member.user_type==='bot'?'Notion 봇':'Notion 멤버';row.append(info,type);list.append(row)}if(!data.members.length)list.innerHTML='<div class="empty-state">동기화된 Notion 멤버가 없습니다.</div>';$('notion-member-count').textContent=data.members.length+'명'}catch(error){$('notion-member-list').innerHTML='<div class="empty-state">'+escapeText(error.message)+'</div>'}finally{finishLoading('notion-member-list')}}
async function loadInvites(append){if(!append)showLoading('invite-list','member',3);else setLoadButton('load-more-invites',true);const params=new URLSearchParams({limit:'20'});if(state.invitesCursor)params.set('cursor',state.invitesCursor);try{const data=await api('/api/invitations?'+params);if(!append)$('invite-list').replaceChildren();data.invitations.forEach((invite)=>$('invite-list').append(inviteRow(invite)));state.invitesCursor=data.next_cursor;$('load-more-invites').hidden=!state.invitesCursor;$('invite-count').textContent=data.invitations.length+(state.invitesCursor?'+':'')+'건';if(!$('invite-list').children.length)$('invite-list').innerHTML='<div class="empty-state">대기 중인 초대가 없습니다.</div>'}catch(error){if(!append)$('invite-list').innerHTML='<div class="empty-state">'+escapeText(error.message)+'</div>'}finally{finishLoading('invite-list');setLoadButton('load-more-invites',false)}}
$('load-more-invites').onclick=()=>loadInvites(true);
function inviteRow(invite){const row=document.createElement('div');row.className='member-row';const info=document.createElement('div');info.className='member-info';const avatar=document.createElement('span');avatar.className='avatar';avatar.textContent='@';const copy=document.createElement('div');const email=document.createElement('strong');email.textContent=invite.email;const meta=document.createElement('small');meta.textContent=roleLabel[invite.role]+' · 만료 '+new Date(invite.expires_at*1000).toLocaleString();copy.append(email,meta);info.append(avatar,copy);const controls=document.createElement('div');controls.className='member-controls';controls.append(actionButton('재발송',async()=>{try{const data=await api('/api/invitations/'+invite.id+'/resend',{method:'POST'});showInviteLink(data.invite_url,data.delivery);toast(data.delivery==='sent'?'초대 메일을 다시 보냈습니다.':'새 초대 링크를 만들었습니다.')}catch(error){toast(error.message)}}),actionButton('취소',async()=>{try{await api('/api/invitations/'+invite.id,{method:'DELETE'});showMembers()}catch(error){toast(error.message)}},true));row.append(info,controls);return row}
$('open-invite').onclick=()=>{$('invite-link-result').hidden=true;alertBox('create-invite-alert','');$('invite-dialog').showModal()};$('close-invite').onclick=()=>$('invite-dialog').close();
$('create-invite-form').onsubmit=async(event)=>{event.preventDefault();const formEl=event.currentTarget;alertBox('create-invite-alert','');busy(formEl,true);try{const form=new FormData(formEl);const data=await api('/api/invitations',{method:'POST',body:{email:form.get('email'),role:form.get('role')}});showInviteLink(data.invite_url,data.delivery);formEl.elements.email.value='';loadInvites(false);toast(data.delivery==='sent'?'초대 메일을 보냈습니다.':'초대 링크를 만들었습니다.')}catch(error){alertBox('create-invite-alert',error.message)}finally{busy(formEl,false);$('close-invite').disabled=false;$('invite-link-result').querySelector('button').disabled=false}}
function showInviteLink(url,delivery){const result=$('invite-link-result');result.hidden=false;result.querySelector('p').textContent=delivery==='sent'?'초대 메일을 보냈습니다. 링크도 복사할 수 있습니다.':'메일 연결 전에는 아래 링크를 안전하게 전달하세요.';result.querySelector('input').value=url;result.querySelector('button').onclick=async()=>{await navigator.clipboard.writeText(url);toast('초대 링크를 복사했습니다.')};if(!$('invite-dialog').open)$('invite-dialog').showModal()}
function normalizeIpEntries(value){const source=Array.isArray(value)?value:[value];return [...new Set(source.flatMap(item=>String(item||'').split(/[\s,]+/).map(entry=>entry.trim()).filter(Boolean)))].slice(0,50)}
function renderIpTags(){const tags=$('ip-tags');if(!tags)return;tags.replaceChildren();for(const ip of state.ipAllowlist){const tag=document.createElement('span');tag.className='ip-tag';const label=document.createElement('span');label.textContent=ip;const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label',ip+' 삭제');remove.onclick=()=>{state.ipAllowlist=state.ipAllowlist.filter(value=>value!==ip);renderIpTags();$('ip-allowlist-input').focus()};tag.append(label,remove);tags.append(tag)}$('ip-allowlist').value=state.ipAllowlist.join('\n');$('ip-count').textContent=state.ipAllowlist.length+'/50'}
function addIpEntries(value){const entries=normalizeIpEntries(value);if(!entries.length)return;state.ipAllowlist=normalizeIpEntries([...state.ipAllowlist,...entries]);renderIpTags()}
function flushIpInput(){const input=$('ip-allowlist-input');if(!input)return;addIpEntries(input.value);input.value=''}
function setupIpTagEditor(value){state.ipAllowlist=normalizeIpEntries(value);renderIpTags();const input=$('ip-allowlist-input');if(!input||input.dataset.bound==='true')return;input.dataset.bound='true';input.onkeydown=event=>{if(event.key==='Enter'||event.key===','){event.preventDefault();flushIpInput()}else if(event.key==='Backspace'&&!input.value&&state.ipAllowlist.length){state.ipAllowlist.pop();renderIpTags()}};input.onblur=flushIpInput;input.onpaste=event=>{const text=event.clipboardData?.getData('text')||'';if(/[\s,]/.test(text)){event.preventDefault();addIpEntries(text);input.value=''}};$('add-current-ip').onclick=()=>{const current=$('current-request-ip').textContent.trim();if(current&&current!=='확인 중')addIpEntries(current);input.focus()}}
async function showSettings(){state.current=null;markNav('settings');showPane('settings-view');try{const data=await api('/api/settings');state.workspaceSettings=data;applySpaceProfile(data);$('space-name').value=data.space_name;$('space-mode').value=data.space_mode;$('public-signup-enabled').checked=data.public_signup_enabled;$('public-signup-role').value=data.public_signup_role;$('ip-allowlist-enabled').checked=data.ip_allowlist_enabled;setupIpTagEditor(data.ip_allowlist);$('current-request-ip').textContent=data.current_ip;document.querySelectorAll('.owner-setting').forEach(section=>{section.querySelectorAll('input,select,textarea,button').forEach(el=>el.disabled=!data.can_manage_security);section.querySelector('.owner-only-badge').textContent=data.can_manage_security?'Owner 전용':'읽기 전용'});$('settings-save-button').disabled=!data.can_manage_security;$('settings-save-note').textContent=data.can_manage_security?'':'Owner만 공간 설정을 변경할 수 있습니다.'}catch(error){toast(error.message)}}
$('workspace-settings-form').onsubmit=async event=>{event.preventDefault();flushIpInput();const button=$('settings-save-button');button.disabled=true;button.textContent='저장 중…';try{const data=await api('/api/settings',{method:'PATCH',body:{space_name:$('space-name').value,space_mode:$('space-mode').value,public_signup_enabled:$('public-signup-enabled').checked,public_signup_role:$('public-signup-role').value,ip_allowlist_enabled:$('ip-allowlist-enabled').checked,ip_allowlist:state.ipAllowlist.join('\n')}});state.workspaceSettings=data;state.publicSignup=data.public_signup_enabled;applySpaceProfile(data);setupIpTagEditor(data.ip_allowlist);loadTree();toast('설정 변경사항을 저장했습니다.')}catch(error){if(error.details?.current_ip)$('current-request-ip').textContent=error.details.current_ip;toast(error.message)}finally{button.disabled=state.workspaceSettings?.can_manage_security===false;button.textContent='변경사항 저장'}};
$('notion-import-input').onchange=async(event)=>{const input=event.currentTarget;const file=input.files&&input.files[0];if(!file)return;if(file.size>2*1024*1024){toast('Markdown 파일은 2MB 이하만 가져올 수 있습니다.');input.value='';return}try{const content=await file.text();const data=await api('/api/import/markdown',{method:'POST',body:{filename:file.name,content}});await loadTree();push('/doc/'+data.document.id);toast('Markdown 파일을 가져왔습니다.')}catch(error){toast(error.message)}finally{input.value=''}};
function notionProgress(message){$('notion-import-progress').textContent=message;$('notion-zip-import-label').textContent=message||'Notion ZIP 업로드'}
function zipU16(view,offset){return view.getUint16(offset,true)}
function zipU32(view,offset){return view.getUint32(offset,true)}
function normalizeClientZipPath(value){const path=String(value||'').replace(/\\/g,'/').normalize('NFKC').replace(/^\.\//,'');const parts=path.split('/').filter(part=>part&&part!=='.');if(!parts.length||parts.some(part=>part==='..'))throw new Error('ZIP에 안전하지 않은 파일 경로가 있습니다.');return parts.join('/')}
function clientMatchPath(path){return String(path||'').split('/').map(part=>part.normalize('NFKC').trim()).filter(Boolean).join('/')}
function clientPathDirname(path){const index=path.lastIndexOf('/');return index<0?'':path.slice(0,index)}
function clientWithoutExtension(path){return path.replace(/\.(md|markdown|csv)$/i,'')}
function clientDocumentFolderKey(path){return clientWithoutExtension(path).replace(/\s+[0-9a-f]{32}$/i,'')}
function clientSourcePageId(path){const match=clientWithoutExtension(path).match(/(?:^|\s)([0-9a-f]{32})(?:_all)?$/i);return match?match[1].toLowerCase():''}
function clientNotionTitle(path){return clientWithoutExtension(path).split('/').at(-1).replace(/_all$/i,'').replace(/\s+[0-9a-f]{32}$/i,'').normalize('NFKC').trim().slice(0,160)||'Notion 문서'}
function nearestClientDocument(directory,documentMap){let current=directory;while(current){if(documentMap.has(current))return current;current=clientPathDirname(current)}return null}
function parseClientCsv(text){const rows=[];let row=[],cell='',quoted=false;for(let index=0;index<text.length;index+=1){const char=text[index];if(quoted){if(char==='"'&&text[index+1]==='"'){cell+='"';index+=1}else if(char==='"')quoted=false;else cell+=char}else if(char==='"'&&!cell)quoted=true;else if(char===','){row.push(cell);cell=''}else if(char==='\n'){row.push(cell);rows.push(row);row=[];cell=''}else cell+=char}if(cell||row.length){row.push(cell);rows.push(row)}return rows.filter(values=>values.some(value=>String(value).trim()))}
function clientCsvDatabase(text,title){const table=parseClientCsv(text);if(!table.length)return null;const width=Math.max(1,Math.min(12,...table.map(row=>row.length)));const headers=Array.from({length:width},(_,index)=>String(table[0][index]||('속성 '+(index+1))).replace(/\r/g,'').slice(0,80));const columns=headers.map((name,index)=>{const values=table.slice(1,DATABASE_MAX_ROWS+1).map(row=>String(row[index]??'').replace(/\r/g,'').trim()).filter(Boolean);const isStatus=/상태|status/i.test(name);const isPriority=/우선순위|priority/i.test(name);const isPerson=/담당자|사람|person|assignee|owner/i.test(name);const isDate=/날짜|일시|date|time/i.test(name)&&values.every(value=>/^\d{4}-\d{2}-\d{2}/.test(value));const isNumber=/금액|수량|번호|number|count|price/i.test(name)&&values.length>0&&values.every(value=>!Number.isNaN(Number(value.replace(/[, ]/g,''))));const isUrl=values.length>0&&values.every(value=>/^https?:\/\//i.test(value));const type=isStatus||isPriority?'select':isPerson?'person':isDate?'date':isNumber?'number':isUrl?'url':'text';return{id:'col_'+index,name,type,options:isStatus?databaseStatusOptions(values):isPriority?[...new Set(values)].slice(0,30):[]}});const rows=table.slice(1,DATABASE_MAX_ROWS+1).map((values,rowIndex)=>({id:'row_'+rowIndex,cells:Object.fromEntries(columns.map((column,columnIndex)=>[column.id,column.type==='number'?String(values[columnIndex]??'').replace(/[, ]/g,''):String(values[columnIndex]??'').replace(/\r/g,'').slice(0,500)]))}));const groupColumn=columns.find(column=>/상태|status/i.test(column.name))||columns.find(column=>column.type==='select')||columns[0];return{version:2,title:cleanNotionDatabaseTitle(title),columns,rows,views:[{id:'view_table',name:'전체 보기',mode:'table',groupBy:'',sortBy:'',sortDir:'asc',filter:{column:'',operator:'contains',value:''}},{id:'view_board',name:groupColumn.name+'별',mode:'board',groupBy:groupColumn.id,sortBy:'',sortDir:'asc',filter:{column:'',operator:'contains',value:''}}],view:{mode:'board',groupBy:groupColumn.id,sortBy:'',sortDir:'asc',filter:{column:'',operator:'contains',value:''}}}}
async function readZipDirectory(file){
  const tailStart=Math.max(0,file.size-65557);const tail=new Uint8Array(await file.slice(tailStart).arrayBuffer());const tailView=new DataView(tail.buffer,tail.byteOffset,tail.byteLength);let eocd=-1;
  for(let index=tail.length-22;index>=0;index-=1){if(zipU32(tailView,index)===0x06054b50){eocd=index;break}}
  if(eocd<0)throw new Error('ZIP 중앙 디렉터리를 찾지 못했습니다.');
  const count=zipU16(tailView,eocd+10),directorySize=zipU32(tailView,eocd+12),directoryOffset=zipU32(tailView,eocd+16);
  if(count===0xffff||directorySize===0xffffffff||directoryOffset===0xffffffff)throw new Error('ZIP64 형식은 아직 지원하지 않습니다. 5GB 이하의 일반 ZIP을 사용해 주세요.');
  if(count<1||count>10000||directoryOffset+directorySize>file.size)throw new Error('ZIP 항목 수 또는 디렉터리 정보가 올바르지 않습니다.');
  const bytes=new Uint8Array(await file.slice(directoryOffset,directoryOffset+directorySize).arrayBuffer());const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);const decoder=new TextDecoder('utf-8',{fatal:false});const entries=[];let offset=0,total=0;
  for(let index=0;index<count;index+=1){
    if(offset+46>bytes.length||zipU32(view,offset)!==0x02014b50)throw new Error('ZIP 항목 목록이 손상되었습니다.');
    const flags=zipU16(view,offset+8),method=zipU16(view,offset+10),compressedSize=zipU32(view,offset+20),size=zipU32(view,offset+24),nameLength=zipU16(view,offset+28),extraLength=zipU16(view,offset+30),commentLength=zipU16(view,offset+32),localOffset=zipU32(view,offset+42);
    if(flags&1)throw new Error('암호화된 ZIP은 가져올 수 없습니다.');
    if(compressedSize===0xffffffff||size===0xffffffff||localOffset===0xffffffff)throw new Error('ZIP64 항목은 아직 지원하지 않습니다.');
    const rawName=bytes.subarray(offset+46,offset+46+nameLength);const rawPath=decoder.decode(rawName);offset+=46+nameLength+extraLength+commentLength;
    if(rawPath.endsWith('/')||rawPath.startsWith('__MACOSX/'))continue;
    const path=normalizeClientZipPath(rawPath);if(/(^|\/)\.DS_Store$/i.test(path))continue;
    if(method!==0&&method!==8)throw new Error('지원하지 않는 ZIP 압축 방식이 포함되어 있습니다: '+path);
    entries.push({index:entries.length,path,size,compressedSize,method,localOffset});total+=size;
  }
  return {entries,total};
}
async function zipEntryStream(file,entry){const header=new Uint8Array(await file.slice(entry.localOffset,entry.localOffset+30).arrayBuffer());const view=new DataView(header.buffer,header.byteOffset,header.byteLength);if(header.length<30||zipU32(view,0)!==0x04034b50)throw new Error('ZIP 파일 헤더가 손상되었습니다: '+entry.path);const start=entry.localOffset+30+zipU16(view,26)+zipU16(view,28);const stream=file.slice(start,start+entry.compressedSize).stream();if(entry.method===0)return stream;if(typeof DecompressionStream!=='function')throw new Error('이 브라우저는 대용량 ZIP 압축 해제를 지원하지 않습니다. 최신 Chrome 또는 Edge를 사용해 주세요.');return stream.pipeThrough(new DecompressionStream('deflate-raw'))}
async function sha256Text(value){const bytes=new TextEncoder().encode(value);const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));return Array.from(hash,byte=>byte.toString(16).padStart(2,'0')).join('')}
async function rawJson(path,options={},attempts=3){let last;for(let attempt=0;attempt<attempts;attempt+=1){const response=await fetch(path,{credentials:'same-origin',headers:{accept:'application/json',...(options.headers||{})},...options});let data={};try{data=await response.json()}catch{}if(response.ok)return data;last=new Error(data.error||'요청을 처리하지 못했습니다.');last.status=response.status;if(![429,500,502,503,504].includes(response.status))throw last}throw last}
async function registerEntryBatches(importId,kind,entries){const output=[];for(let offset=0;offset<entries.length;offset+=100){const data=await api('/api/import/notion-sessions/'+importId+'/'+kind,{method:'POST',body:{entries:entries.slice(offset,offset+100)}});output.push(...data.entries)}return output}
async function readZipEntryBytes(file,entry,maxBytes){if(entry.size>maxBytes)throw new Error('문서가 너무 큽니다: '+entry.path);const bytes=new Uint8Array(await new Response(await zipEntryStream(file,entry)).arrayBuffer());if(bytes.length!==entry.size)throw new Error('압축 해제 크기가 일치하지 않습니다: '+entry.path);return bytes}
async function uploadNotionAsset(file,importId,entry,registered){
  const base='/api/import/notion-sessions/'+importId+'/assets/'+entry.index;const stream=await zipEntryStream(file,entry);
  if(entry.size<=8*1024*1024){const bytes=new Uint8Array(await new Response(stream).arrayBuffer());if(bytes.length!==entry.size)throw new Error('첨부파일 압축 해제 크기가 일치하지 않습니다: '+entry.path);await rawJson(base,{method:'PUT',headers:{'content-type':'application/octet-stream'},body:bytes});return}
  const created=await api(base+'/multipart',{method:'POST',body:{}});const reader=stream.getReader();const partSize=8*1024*1024;let buffer=new Uint8Array(partSize),used=0,partNumber=1,total=0;const parts=[];
  async function sendPart(bytes){const result=await rawJson(base+'/multipart/'+partNumber+'?upload_id='+encodeURIComponent(created.upload_id),{method:'PUT',headers:{'content-type':'application/octet-stream'},body:bytes});parts.push(result);partNumber+=1}
  while(true){const result=await reader.read();if(result.done)break;let source=result.value,offset=0;total+=source.length;while(offset<source.length){const length=Math.min(buffer.length-used,source.length-offset);buffer.set(source.subarray(offset,offset+length),used);used+=length;offset+=length;if(used===buffer.length){await sendPart(buffer);buffer=new Uint8Array(partSize);used=0}}}
  if(used)await sendPart(buffer.slice(0,used));if(total!==entry.size)throw new Error('첨부파일 압축 해제 크기가 일치하지 않습니다: '+entry.path);
  await api(base+'/multipart-complete',{method:'POST',body:{upload_id:created.upload_id,parts}});
}
function resolveClientImportLink(sourcePath,target){let decoded;try{decoded=decodeURIComponent(String(target||'').split('#')[0].split('?')[0])}catch{return''}if(!decoded||/^[a-z][a-z0-9+.-]*:/i.test(decoded)||decoded.startsWith('//'))return'';const parts=(clientPathDirname(sourcePath)+'/'+decoded).split('/');const resolved=[];for(const part of parts){if(!part||part==='.')continue;if(part==='..'){if(!resolved.length)return'';resolved.pop()}else resolved.push(part)}return resolved.join('/')}
function rewriteClientNotionLinks(markdown,sourcePath,documentMap,assetMap,databaseMap){return markdown.replace(/(!?\[[^\]\r\n]*\]\()([^\)\r\n]+)(\))/g,(match,start,target,end)=>{const resolved=clientMatchPath(resolveClientImportLink(sourcePath,target));if(!resolved)return match;const asset=assetMap.get(resolved);if(asset)return start+asset.url+end;const documentKey=clientMatchPath(clientWithoutExtension(resolved));const documentId=documentMap.get(documentKey);if(documentId)return start+location.origin+'/doc/'+documentId+end;const databaseId=databaseMap?.get(documentKey);return databaseId?start+location.origin+'/doc/'+databaseId+end:match})}
async function importLargeNotionZip(file){
  notionProgress('ZIP 분석 중…');const directory=await readZipDirectory(file);const entries=directory.entries;const documents=entries.filter(entry=>/\.(md|markdown|csv)$/i.test(entry.path)&&!/(^|\/)index\.(md|markdown)$/i.test(entry.path));
  if(!documents.length)throw new Error('ZIP에서 Markdown 또는 CSV 문서를 찾지 못했습니다.');
  const fingerprint=await sha256Text([file.name,file.size,file.lastModified,entries.length,directory.total,entries.map(entry=>entry.path+':'+entry.size+':'+entry.compressedSize).join('|')].join('\n'));const repair=!!$('notion-import-repair')?.checked;
  const session=await api('/api/import/notion-sessions',{method:'POST',body:{filename:file.name,size:file.size,entries:entries.length,unpacked_size:directory.total,fingerprint,repair}});if(session.status==='completed'&&!session.repair){notionProgress('이미 가져온 ZIP');return {imported:documents.length,failed:0}}
  notionProgress('문서 목록 등록 중…');const primaryDocuments=documents.filter(entry=>!/_all\.csv$/i.test(entry.path));const registeredDocuments=await registerEntryBatches(session.import_id,'documents',primaryDocuments.map(entry=>({index:entry.index,path:entry.path,size:entry.size})));
  const documentMap=new Map();const documentPageMap=new Map();const registeredDocByIndex=new Map();for(const item of registeredDocuments){const pathKey=clientMatchPath(clientWithoutExtension(item.path));const folderKey=clientMatchPath(clientDocumentFolderKey(item.path));documentMap.set(pathKey,item.document_id);documentMap.set(folderKey,item.document_id);const pageId=clientSourcePageId(item.path);if(pageId)documentPageMap.set(pageId,item.document_id);registeredDocByIndex.set(item.index,item)}
  const databaseEntriesByDocument=new Map();const databaseLinkMap=new Map();for(const entry of documents.filter(item=>/_all\.csv$/i.test(item.path))){const ownerId=documentPageMap.get(clientSourcePageId(entry.path));if(ownerId){const list=databaseEntriesByDocument.get(ownerId)||[];list.push(entry);databaseEntriesByDocument.set(ownerId,list);databaseLinkMap.set(clientMatchPath(clientWithoutExtension(entry.path)),ownerId)}}
  const documentIndexes=new Set(documents.map(entry=>entry.index));const entryByIndex=new Map(entries.map(entry=>[entry.index,entry]));const assets=[];for(const entry of entries){if(documentIndexes.has(entry.index)||/(^|\/)index\.html?$/i.test(entry.path))continue;const normalizedPath=clientMatchPath(entry.path);const ownerKey=nearestClientDocument(clientMatchPath(clientPathDirname(entry.path)),documentMap);if(ownerKey)assets.push({index:entry.index,path:normalizedPath,size:entry.size,owner_document_id:documentMap.get(ownerKey)})}
  notionProgress('첨부파일 목록 등록 중…');const registeredAssets=await registerEntryBatches(session.import_id,'assets',assets);const assetByIndex=new Map(registeredAssets.map(item=>[item.index,item]));const assetMap=new Map(registeredAssets.map(item=>[clientMatchPath(item.path),item]));
  let nextAsset=0;async function assetWorker(){while(nextAsset<assets.length){const position=nextAsset++;const entry=entryByIndex.get(assets[position].index);const registered=assetByIndex.get(entry.index);if(!registered||registered.status==='uploaded')continue;notionProgress('첨부파일 '+(position+1)+' / '+assets.length);await uploadNotionAsset(file,session.import_id,entry,registered)}}
  await Promise.all(Array.from({length:Math.min(8,assets.length||1)},()=>assetWorker()));
  primaryDocuments.sort((left,right)=>left.path.split('/').length-right.path.split('/').length||left.path.localeCompare(right.path,'ko'));const decoder=new TextDecoder('utf-8',{fatal:false});const pendingDocuments=session.repair?primaryDocuments:primaryDocuments.filter(entry=>registeredDocByIndex.get(entry.index)?.status!=='imported');let processed=session.repair?0:primaryDocuments.length-pendingDocuments.length;
  const depths=[...new Set(pendingDocuments.map(entry=>entry.path.split('/').length))].sort((left,right)=>left-right);
  for(const depth of depths){const batches=[];let batch=[],batchBytes=0;for(const entry of pendingDocuments.filter(item=>item.path.split('/').length===depth)){const bytes=await readZipEntryBytes(file,entry,4*1024*1024);let content=decoder.decode(bytes).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');content=rewriteClientNotionLinks(content,entry.path,documentMap,assetMap,databaseLinkMap);const documentId=documentMap.get(clientMatchPath(clientWithoutExtension(entry.path)));const databases=[];for(const csvEntry of databaseEntriesByDocument.get(documentId)||[]){const csvBytes=await readZipEntryBytes(file,csvEntry,4*1024*1024);const model=clientCsvDatabase(decoder.decode(csvBytes),clientNotionTitle(csvEntry.path));if(model)databases.push(JSON.stringify(model))}const parentKey=nearestClientDocument(clientMatchPath(clientPathDirname(entry.path)),documentMap);const item={index:entry.index,content,parent_document_id:parentKey?documentMap.get(parentKey):null,databases};const size=new TextEncoder().encode(content).length+databases.join('').length;if(batch.length&&(batch.length>=20||batchBytes+size>3*1024*1024)){batches.push(batch);batch=[];batchBytes=0}batch.push(item);batchBytes+=size}if(batch.length)batches.push(batch);let nextBatch=0;async function documentWorker(){while(nextBatch<batches.length){const current=batches[nextBatch++];await api('/api/import/notion-sessions/'+session.import_id+'/documents-batch',{method:'POST',body:{documents:current,repair}});processed+=current.length;notionProgress('문서 '+processed+' / '+primaryDocuments.length)}}await Promise.all(Array.from({length:Math.min(8,batches.length||1)},()=>documentWorker()))}
  const completed=await api('/api/import/notion-sessions/'+session.import_id+'/complete',{method:'POST',body:{}});return completed;
}
$('notion-zip-import-input').onchange=async(event)=>{const input=event.currentTarget;const file=input.files&&input.files[0];if(!file)return;const button=$('notion-zip-import-button');input.disabled=true;button.classList.add('loading-indicator');button.setAttribute('aria-disabled','true');try{const data=await importLargeNotionZip(file);await loadTree();notionProgress('가져오기 완료');toast('Notion 가져오기 완료: 문서 '+data.imported+', 실패 '+data.failed)}catch(error){const message=String(error?.message||'가져오기에 실패했습니다.');notionProgress('오류: '+message.slice(0,140));toast(message)}finally{input.disabled=false;button.classList.remove('loading-indicator');button.removeAttribute('aria-disabled');input.value=''}};
async function importNotionApiSourceByAgent(sourceId){const normalized=String(sourceId||'').replaceAll('-','').toLowerCase();if(!/^[0-9a-f]{32}$/.test(normalized))return;try{const data=await api('/api/import/notion-api/data-sources/'+normalized,{method:'POST',body:{}});await loadTree();toast('Notion 데이터소스 동기화 완료: '+(data.rows||0)+'개 행')}catch(error){toast('Notion 데이터소스 동기화 실패: '+String(error?.message||'알 수 없는 오류'))}}
async function importAllFromNotionApi(){const button=$('notion-api-import-button');button.disabled=true;button.classList.add('loading-indicator');let cursor='',discovered=0,imported=0,skipped=0,failed=0,memberWarning='';const seen=new Set();const itemKey=item=>item.object+':'+String(item.id||'').replaceAll('-','').toLowerCase();const importItem=async(item,hasMore=false)=>{const key=itemKey(item);if(seen.has(key))return;seen.add(key);discovered+=1;if(item.object==='page'&&item.imported){skipped+=1;notionProgress('API 가져오기 '+(imported+skipped+failed)+' / '+discovered+(hasMore?' +':''));return}notionProgress('API 가져오기 '+(imported+skipped+failed+1)+' / '+discovered+(hasMore?' +':''));try{const data=await api('/api/import/notion-api/'+(item.object==='page'?'pages/':'data-sources/')+encodeURIComponent(item.id),{method:'POST',body:{}});imported+=1;if(item.object==='data_source')for(let offset=0;offset<(data.page_ids||[]).length;offset+=2)await Promise.all((data.page_ids||[]).slice(offset,offset+2).map(pageId=>importItem({id:pageId,object:'page',imported:false},hasMore)))}catch(error){failed+=1;console.warn('Notion API item import failed',item.id,error.message)}};try{const status=await api('/api/import/notion-api/status');if(!status.configured)throw new Error('NOTION_API_TOKEN Secret을 먼저 등록해 주세요.');notionProgress('Notion 멤버와 이메일 동기화 중');try{const members=await api('/api/import/notion-api/users',{method:'POST',body:{}});if(!members.email_complete)memberWarning=' · 멤버 이메일 권한 필요';else notionProgress('Notion 멤버 '+members.people+'명 동기화 완료')}catch(error){memberWarning=' · 멤버 이메일 권한 필요';console.warn('Notion member sync unavailable',error.message)}do{const page=await api('/api/import/notion-api/search',{method:'POST',body:{cursor:cursor||null}});cursor=page.next_cursor||'';for(let offset=0;offset<page.items.length;offset+=2)await Promise.all(page.items.slice(offset,offset+2).map(item=>importItem(item,!!cursor)))}while(cursor);for(let round=0;round<20;round+=1){const linked=await api('/api/import/notion-api/linked-missing',{method:'POST',body:{}});if(!(linked.items||[]).length)break;notionProgress('연결된 페이지 '+linked.items.length+'개 추가 확인 중');for(let offset=0;offset<linked.items.length;offset+=2)await Promise.all(linked.items.slice(offset,offset+2).map(item=>importItem(item,true)))}await api('/api/import/notion-api/reconcile',{method:'POST',body:{}});await loadTree();notionProgress('API 가져오기 완료 · '+imported+'개 · 기존 '+skipped+'개'+(failed?' · 실패 '+failed+'개':'')+memberWarning);toast('Notion API 가져오기 완료: '+imported+'개, 기존 '+skipped+'개'+(failed?', 실패 '+failed+'개':'')+memberWarning)}catch(error){const message=String(error?.message||'Notion API 가져오기에 실패했습니다.');notionProgress('오류: '+message.slice(0,140));toast(message)}finally{button.disabled=false;button.classList.remove('loading-indicator')}}
$('notion-api-import-button').onclick=importAllFromNotionApi;
async function resetAndImportAllFromNotionApi(){const button=$('notion-remigrate-button');button.disabled=true;let deletedFiles=0;try{for(let step=0;step<100;step+=1){notionProgress('기존 첨부파일 정리 중 · '+deletedFiles+'개');const result=await api('/api/admin/reset-notion-migration',{method:'POST',body:{confirm:'qwerty'}});deletedFiles+=Number(result.deleted_files||0);if(result.done){notionProgress('기존 데이터 정리 완료 · Notion 재가져오기 시작');await loadTree();await importAllFromNotionApi();return}}throw new Error('초기화 작업이 안전 반복 한도를 초과했습니다.')}catch(error){notionProgress('오류: '+String(error.message||error).slice(0,140));toast(error.message||String(error))}finally{button.disabled=false}}
$('notion-remigrate-button').onclick=resetAndImportAllFromNotionApi;
document.addEventListener('selectionchange',()=>{if(!canEdit())return;const selection=getSelection();const toolbar=$('inline-toolbar');if(!selection||selection.isCollapsed||!selection.rangeCount){toolbar.hidden=true;return}const origin=selection.anchorNode?.nodeType===1?selection.anchorNode:selection.anchorNode?.parentElement;const el=origin?.closest?.('.block-content[contenteditable="true"]');if(!el||!el.contains(selection.focusNode)){toolbar.hidden=true;return}state.inlineTarget=el;state.inlineRange=selection.getRangeAt(0).cloneRange();const rect=state.inlineRange.getBoundingClientRect();toolbar.style.left=Math.max(8,Math.min(rect.left,innerWidth-toolbar.offsetWidth-8))+'px';toolbar.style.top=Math.max(8,rect.top-42)+'px';toolbar.hidden=false});
function restoreInlineSelection(target,range){if(!target?.isConnected||!range)return false;target.focus();const selection=getSelection();selection.removeAllRanges();selection.addRange(range);return true}
function openLinkDialog(target,range){if(!target||!range)return;state.linkTarget=target;state.linkRange=range.cloneRange();alertBox('link-alert','');const origin=range.commonAncestorContainer.nodeType===1?range.commonAncestorContainer:range.commonAncestorContainer.parentElement;const currentLink=origin?.closest?.('a');$('link-url').value=currentLink&&target.contains(currentLink)?currentLink.getAttribute('href')||'':'';$('inline-toolbar').hidden=true;$('link-dialog').returnValue='';$('link-dialog').showModal();requestAnimationFrame(()=>{$('link-url').focus();$('link-url').select()})}
function closeLinkDialog(result='cancel'){$('link-dialog').close(result)}
$('link-form').onsubmit=event=>{event.preventDefault();const href=safeWebUrl($('link-url').value);if(!href){alertBox('link-alert','http 또는 https로 시작하는 올바른 웹 주소를 입력하세요.');$('link-url').focus();return}const target=state.linkTarget,range=state.linkRange;if(!restoreInlineSelection(target,range)){closeLinkDialog('cancel');return}document.execCommand('createLink',false,href);for(const link of target.querySelectorAll('a')){link.target='_blank';link.rel='noopener noreferrer'}target.dataset.rich='true';scheduleSave();closeLinkDialog('applied');$('inline-toolbar').hidden=true;target.focus()};
function applyLinkToSelection(target,range,href){if(!restoreInlineSelection(target,range))return false;const selection=getSelection();if(!selection||selection.isCollapsed||!selection.rangeCount)return false;const activeRange=selection.getRangeAt(0);const anchor=document.createElement('a');anchor.href=href;anchor.target='_blank';anchor.rel='noopener noreferrer';try{activeRange.surroundContents(anchor)}catch{const fragment=activeRange.extractContents();anchor.append(fragment);activeRange.insertNode(anchor)}selection.removeAllRanges();const appliedRange=document.createRange();appliedRange.selectNodeContents(anchor);selection.addRange(appliedRange);return !!target.querySelector('a')}
$('link-form').onsubmit=event=>{event.preventDefault();const href=safeWebUrl($('link-url').value);if(!href){alertBox('link-alert','http 또는 https로 시작하는 올바른 웹 주소를 입력하세요.');$('link-url').focus();return}const target=state.linkTarget,range=state.linkRange;if(!applyLinkToSelection(target,range,href)){alertBox('link-alert','선택한 텍스트에 링크를 적용하지 못했습니다. 다시 선택해 주세요.');return}target.dataset.rich='true';bindEditableLinks(target);scheduleSave();closeLinkDialog('applied');$('inline-toolbar').hidden=true;target.focus()};
$('close-link-dialog').onclick=() => closeLinkDialog();$('cancel-link-dialog').onclick=() => closeLinkDialog();
$('link-dialog').addEventListener('close',()=>{const target=state.linkTarget,range=state.linkRange,result=$('link-dialog').returnValue;state.linkTarget=null;state.linkRange=null;if(result!=='applied')restoreInlineSelection(target,range)});
$('inline-toolbar').querySelectorAll('button').forEach(button=>{button.onmousedown=event=>event.preventDefault();button.onclick=()=>{const el=state.inlineTarget,range=state.inlineRange;if(!el||!range)return;const command=button.dataset.inlineCommand;if(command==='createLink'){openLinkDialog(el,range);return}const selection=getSelection();selection.removeAllRanges();selection.addRange(range);if(command==='inlineCode'){const text=selection.toString();document.execCommand('insertHTML',false,'<code>'+escapeText(text)+'</code>')}else document.execCommand(command);el.dataset.rich='true';scheduleSave();$('inline-toolbar').hidden=true;el.focus()}});
function searchQueryTerms(value){return[...new Set(String(value||'').normalize('NFKC').trim().split(/\s+/).filter(Boolean))].sort((a,b)=>b.length-a.length)}
function appendSearchHighlight(node,value,query){const text=String(value||'');node.replaceChildren();const terms=searchQueryTerms(query);if(!terms.length){node.textContent=text;return}const pattern=new RegExp('('+terms.map(term=>term.replace(/[\\^$.*+?()[\]{}|]/g,'\\$&')).join('|')+')','giu');let cursor=0;for(const match of text.matchAll(pattern)){const index=match.index??0;if(index>cursor)node.append(document.createTextNode(text.slice(cursor,index)));const mark=document.createElement('mark');mark.textContent=match[0];node.append(mark);cursor=index+match[0].length}if(cursor<text.length)node.append(document.createTextNode(text.slice(cursor)))}
function searchResultContext(doc,query){const path=doc.parent_title?doc.parent_title+' · ':'';const match=doc.search_match==='content'?'본문 일치':doc.search_match==='title'?'제목 일치':'최근 수정';return path+match+' · 수정 '+formatDate(doc.updated_at)}
function openGlobalSearch(){if(!state.user)return;const dialog=$('global-search-dialog');state.globalSearchIndex=0;if(!dialog.open)dialog.showModal();$('global-search-input').value='';loadGlobalSearch('');$('global-search-input').focus()}
async function loadGlobalSearch(query){const results=$('global-search-results');const request=++state.globalSearchRequest;showLoading('global-search-results','search',4);try{const params=new URLSearchParams({scope:query?'search':'recent',limit:'20'});if(query)params.set('q',query);const data=await api('/api/documents?'+params);if(request!==state.globalSearchRequest)return;results.replaceChildren(...data.documents.map((doc,index)=>{const button=document.createElement('button');button.type='button';button.id='global-search-option-'+index;button.role='option';button.tabIndex=-1;button.setAttribute('aria-selected',index===0?'true':'false');button.className='global-search-item'+(index===0?' active':'');button.dataset.documentId=doc.id;const title=document.createElement('strong');appendSearchHighlight(title,doc.title||'제목 없음',query);const meta=document.createElement('span');meta.className='global-search-meta';meta.textContent=searchResultContext(doc,query);button.append(title,meta);if(doc.preview){const preview=document.createElement('span');preview.className='global-search-preview';appendSearchHighlight(preview,doc.preview,query);button.append(preview)}button.onmouseenter=()=>{state.globalSearchIndex=index;updateGlobalSearchSelection()};button.onclick=()=>{dialogCloseAndOpen(doc.id)};return button}));if(!data.documents.length)results.innerHTML='<div class="global-search-empty">검색 결과가 없습니다.</div>';updateGlobalSearchSelection()}catch(error){if(request===state.globalSearchRequest)results.innerHTML='<div class="global-search-empty">'+escapeText(error.message)+'</div>'}finally{if(request===state.globalSearchRequest)finishLoading('global-search-results')}}
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
async function openPublicDocument(id){$('boot-view').hidden=false;$('auth-view').hidden=true;$('app-view').hidden=true;try{const data=await api('/api/public/documents/'+id);state.role='viewer';state.current=data.document;$('public-title').textContent=data.document.title||'제목 없음';const editor=$('public-block-editor'),blocks=normalizeImportedBlocks(data.document.blocks);editor.replaceChildren(...blocks.map((block,index)=>blockRow(block,index)));renumberBlocks(editor);$('boot-view').hidden=true;$('public-view').hidden=false}catch(error){$('boot-view').innerHTML='<div class="empty-state"><strong>공개 문서를 열 수 없습니다.</strong><span>'+escapeText(error.message)+'</span></div>'}}
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
function editorFileBlockType(file){const type=String(file?.type||'').toLowerCase();return type.startsWith('image/')?'image':type.startsWith('video/')?'video':type.startsWith('audio/')?'audio':'file'}
async function uploadEditorFile(file){if(!file||!state.current||!canEdit())return null;if(file.size>10*1024*1024){toast('파일은 10MB 이하만 올릴 수 있습니다.');return null}const form=new FormData();form.append('file',file,file.name||'pasted-file');try{const response=await fetch('/api/documents/'+state.current.id+'/files',{method:'POST',credentials:'same-origin',headers:{accept:'application/json'},body:form});const data=await response.json();if(!response.ok)throw new Error(data.error||'파일을 올리지 못했습니다.');return{type:editorFileBlockType(file),content:data.file.url}}catch(error){toast(error.message||'파일을 올리지 못했습니다.');return null}}
async function insertEditorFiles(files,anchorRow=null){if(!canEdit()||!state.current)return false;let anchor=anchorRow?.isConnected?anchorRow:null;let inserted=0;let lastRow=null;for(const file of files){const uploaded=await uploadEditorFile(file);if(!uploaded)continue;const row=blockRow({id:'blk_'+crypto.randomUUID().replaceAll('-',''),...uploaded,checked:false,indent_level:Number(anchor?.dataset.indent||0)},0);if(anchor?.isConnected)anchor.after(row);else $('block-editor').append(row);anchor=row;lastRow=row;inserted+=1}if(!inserted)return false;renumberBlocks();scheduleSave();focusBlock(lastRow);toast(inserted===1?'파일을 올리고 문서에 추가했습니다.':'파일 '+inserted+'개를 올리고 문서에 추가했습니다.');return true}
$('file-upload-input').onchange=async event=>{const input=event.currentTarget;await insertEditorFiles(input.files&&[...input.files]);input.value=''};
document.addEventListener('paste',event=>{if(!canEdit()||!state.current)return;const items=[...(event.clipboardData?.items||[])];const files=items.filter(item=>item.kind==='file'&&/^image\//i.test(item.type)).map(item=>item.getAsFile()).filter(Boolean);if(!files.length)return;const target=event.target?.closest?.('.block-content[contenteditable="true"]');if(!target)return;event.preventDefault();void insertEditorFiles(files,target.closest('.block-row'))},true);
document.addEventListener('dragover',event=>{if(!canEdit()||!state.current||!event.target?.closest?.('.document-editor'))return;const types=event.dataTransfer?.types;const hasFiles=event.dataTransfer?.files?.length||types?.includes?.('Files');if(hasFiles)event.preventDefault()},true);
document.addEventListener('drop',event=>{if(!canEdit()||!state.current||!event.target?.closest?.('.document-editor'))return;const files=[...(event.dataTransfer?.files||[])];if(!files.length)return;event.preventDefault();event.stopPropagation();const row=event.target.closest('.block-row');void insertEditorFiles(files,row)},true);

// One modifier-aware drag contract shared by blocks and database views.
function setDragIntent(event){state.dragCopy=!!event.altKey;try{event.dataTransfer.effectAllowed='copyMove';event.dataTransfer.setData('application/x-joripspace-drag-intent',state.dragCopy?'copy':'move')}catch{} }
function resetUniversalDrag(){state.dragCopy=false;state.databaseDrag=null;state.timelineDrag=null;state.dragRow=null}
if(!state._dragModifierBound){state._dragModifierBound=true;window.addEventListener('keydown',event=>{if(event.key==='Alt')state.dragCopy=true},true);window.addEventListener('keyup',event=>{if(event.key==='Alt')state.dragCopy=false},true);window.addEventListener('blur',()=>{state.dragCopy=false},true)}
function cloneDatabaseRowForDrag(row){return{id:databaseUid('row'),cells:{...(row.cells||{})}}}
async function copyDatabaseRowForDrag(context,targetDate=''){const copy=cloneDatabaseRowForDrag(context.row);const sourceId=await databaseLinkedDocumentId(context.row,context.titleColumn);if(sourceId){const result=await api('/api/documents/'+sourceId+'/duplicate',{method:'POST'});if(result.document?.id)copy.document_id=result.document.id}if(context.dateColumn&&targetDate){const parts=databaseDateParts(context.row.cells[context.dateColumn.id]);if(parts.length){const delta=Math.round((Date.parse(targetDate+'T00:00:00Z')-Date.parse(parts[0]+'T00:00:00Z'))/86400000);if(Number.isFinite(delta))copy.cells[context.dateColumn.id]=shiftCalendarValue(context.row.cells[context.dateColumn.id],delta)}}return copy}
function calendarDropDateAt(week,clientX){const cells=[...week.querySelectorAll('.db-calendar-day')];return cells.find(cell=>{const rect=cell.getBoundingClientRect();return clientX>=rect.left&&clientX<=rect.right})?.dataset.date||''}
async function handleDatabaseCopyDrop(wrap,event,column){const drag=state.databaseDrag;if(!drag||!column)return;event.preventDefault();event.stopImmediatePropagation();try{const copy=await copyDatabaseRowForDrag({wrap,row:drag.row,titleColumn:drag.titleColumn});const groupColumn=drag.groupColumn;copy.cells[groupColumn.id]=column.dataset.groupValue||'';const index=wrap._databaseModel.rows.indexOf(drag.row);wrap._databaseModel.rows.splice(index<0?wrap._databaseModel.rows.length:index+1,0,copy);renderDatabaseBlock(wrap);scheduleSave();await flushSave();toast('카드를 복사했습니다.')}catch(error){toast(error.message||'카드를 복사하지 못했습니다.')}finally{resetUniversalDrag()}}
function bindUniversalDatabaseDrag(wrap){if(!canEdit()||wrap._universalDragBound)return;wrap._universalDragBound=true;const model=wrap._databaseModel;const board=wrap.querySelector('.db-board');if(board){board.addEventListener('dragstart',event=>{const card=event.target.closest('.db-card');if(!card)return;const row=model.rows.find(item=>item.id===card.dataset.rowId);if(!row)return;state.databaseDrag={wrap,row,titleColumn:databaseTitleColumn(model),groupColumn:model.columns.find(column=>column.id===model.view.groupBy)||model.columns[0]};setDragIntent(event)},true);board.addEventListener('dragover',event=>{if(!state.databaseDrag)return;if(event.altKey)state.dragCopy=true;event.preventDefault();event.dataTransfer.dropEffect=state.dragCopy?'copy':'move'},true);board.addEventListener('drop',event=>{if(!state.databaseDrag)return;const column=event.target.closest('.db-board-column');if(state.dragCopy){handleDatabaseCopyDrop(wrap,event,column)}},true);board.addEventListener('dragend',resetUniversalDrag,true)}const calendar=wrap.querySelector('.db-calendar');if(calendar){calendar.addEventListener('dragstart',event=>{if(event.target.closest('.db-calendar-range'))setDragIntent(event)},true);calendar.addEventListener('dragover',event=>{if(!wrap._calendarDrag)return;if(event.altKey)state.dragCopy=true;if(state.dragCopy){event.preventDefault();event.dataTransfer.dropEffect='copy'}},true);calendar.addEventListener('drop',async event=>{if(!wrap._calendarDrag||!state.dragCopy&&!event.altKey)return;const week=event.target.closest('.db-calendar-week'),target=week&&calendarDropDateAt(week,event.clientX);if(!target)return;event.preventDefault();event.stopImmediatePropagation();try{const drag=wrap._calendarDrag;const copy=await copyDatabaseRowForDrag(drag,target);const index=model.rows.indexOf(drag.row);model.rows.splice(index<0?model.rows.length:index+1,0,copy);renderDatabaseBlock(wrap);scheduleSave();await flushSave();toast('일정을 복사했습니다.')}catch(error){toast(error.message||'일정을 복사하지 못했습니다.')}finally{wrap._calendarDrag=null;resetUniversalDrag()}},true);calendar.addEventListener('dragend',resetUniversalDrag,true)}bindTimelineDrag(wrap)}
function bindTimelineDrag(wrap){const shell=wrap.querySelector('.db-timeline');if(!shell||!canEdit()||shell.dataset.dragBound)return;shell.dataset.dragBound='1';const model=wrap._databaseModel,view=normalizeDatabaseView(model,model.view),dateColumn=model.columns.find(column=>column.id===view.datePropertyId)||model.columns.find(column=>column.type==='date'),titleColumn=databaseTitleColumn(model),rows=databaseRows(model,wrap._databaseQuery),bars=[...shell.querySelectorAll('.db-timeline-bar')],days=[...shell.querySelectorAll('.db-timeline-day')];days.forEach((cell,index)=>{const cursor=timelineCursor(wrap);cell.dataset.date=calendarDateKey(new Date(Date.UTC(cursor.getUTCFullYear(),cursor.getUTCMonth(),index+1)))});for(const bar of bars){const title=bar.querySelector('span')?.textContent?.trim()||'',dates=String(bar.title||'').match(/\d{4}-\d{2}-\d{2}/g)||[],row=rows.find(item=>databaseDisplayValue(titleColumn,item.cells[titleColumn.id])===title&&databaseDateParts(item.cells[dateColumn?.id]).join('|')===dates.join('|'));if(!row)continue;bar.draggable=true;bar.dataset.rowId=row.id;bar.addEventListener('dragstart',event=>{state.timelineDrag={wrap,row,dateColumn,titleColumn};bar.classList.add('dragging');setDragIntent(event)},true);bar.addEventListener('dragend',()=>{bar.classList.remove('dragging');resetUniversalDrag()},true);bar.addEventListener('click',event=>{if(wrap._timelineDragMoved){event.preventDefault();event.stopImmediatePropagation();wrap._timelineDragMoved=false}},true)}const targetDate=clientX=>days.find(cell=>{const rect=cell.getBoundingClientRect();return clientX>=rect.left&&clientX<=rect.right})?.dataset.date||'';shell.addEventListener('dragover',event=>{if(!state.timelineDrag)return;if(event.altKey)state.dragCopy=true;event.preventDefault();event.dataTransfer.dropEffect=state.dragCopy?'copy':'move'},true);shell.addEventListener('drop',async event=>{const drag=state.timelineDrag;if(!drag)return;const target=targetDate(event.clientX);if(!target)return;event.preventDefault();event.stopImmediatePropagation();try{if(state.dragCopy||event.altKey){const copy=await copyDatabaseRowForDrag(drag,target);const index=model.rows.indexOf(drag.row);model.rows.splice(index<0?model.rows.length:index+1,0,copy);toast('타임라인 항목을 복사했습니다.')}else{const parts=databaseDateParts(drag.row.cells[dateColumn.id]);const delta=Math.round((Date.parse(target+'T00:00:00Z')-Date.parse(parts[0]+'T00:00:00Z'))/86400000);if(Number.isFinite(delta)&&delta){drag.row.cells[dateColumn.id]=shiftCalendarValue(drag.row.cells[dateColumn.id],delta);toast('타임라인 항목을 이동했습니다.')}}wrap._timelineDragMoved=true;renderDatabaseBody(wrap);scheduleSave();await flushSave()}catch(error){toast(error.message||'타임라인 항목을 저장하지 못했습니다.')}finally{resetUniversalDrag()}},true)}
 // Rebind when a view body is replaced (calendar -> timeline -> board). The
 // original helper guarded on the database wrapper, which left newly-rendered
 // view nodes unbound after a tab switch.
 const bindUniversalDatabaseDragBase=bindUniversalDatabaseDrag;
 bindUniversalDatabaseDrag=wrap=>{const viewNode=wrap.querySelector('.db-board,.db-calendar,.db-timeline');if(viewNode?.dataset.universalDragBound==='1'){if(viewNode.matches('.db-timeline'))bindTimelineDrag(wrap);return}const wasBound=wrap._universalDragBound;wrap._universalDragBound=false;bindUniversalDatabaseDragBase(wrap);wrap._universalDragBound=wasBound||true;viewNode?.setAttribute('data-universal-drag-bound','1')};
 const setDragIntentBase=setDragIntent;
 setDragIntent=event=>{setDragIntentBase(event);state.dragSession=crypto.randomUUID();state.dropSession=null;document.body.dataset.dragMode=state.dragCopy?'copy':''};
 const resetUniversalDragBase=resetUniversalDrag;
 resetUniversalDrag=()=>{resetUniversalDragBase();state.dragSession=null;state.dropSession=null;document.body.removeAttribute('data-drag-mode');document.querySelectorAll('.dragging').forEach(node=>node.classList.remove('dragging'))};
 window.addEventListener('keydown',event=>{if(event.key==='Alt'&&state.dragSession){state.dragCopy=true;document.body.dataset.dragMode='copy'}if(event.key==='Escape'&&(state.dragRow||state.databaseDrag||state.timelineDrag)){event.preventDefault();resetUniversalDrag();clearDropTargets?.();toast('드래그를 취소했습니다.')}},true);
 window.addEventListener('keyup',event=>{if(event.key==='Alt'&&state.dragSession){state.dragCopy=false;document.body.removeAttribute('data-drag-mode')}},true);
 function guardDuplicateDrop(event){if(!state.dragSession)return true;if(state.dropSession===state.dragSession){event.preventDefault();event.stopImmediatePropagation();return false}state.dropSession=state.dragSession;return true}
 const resetUniversalDragWithSession=resetUniversalDrag;
 resetUniversalDrag=()=>{const completed=state.dropSession;resetUniversalDragWithSession();state.dropSession=completed};
 const bindUniversalDatabaseDragWithDropGuard=bindUniversalDatabaseDrag;
 bindUniversalDatabaseDrag=wrap=>{const viewNode=wrap.querySelector('.db-board,.db-calendar,.db-timeline');if(viewNode&&!viewNode.dataset.dragSessionGuard){viewNode.dataset.dragSessionGuard='1';viewNode.addEventListener('drop',event=>guardDuplicateDrop(event),true)}bindUniversalDatabaseDragWithDropGuard(wrap)};
 const bindCalendarDragWithUniversalCopy=bindCalendarDrag;bindCalendarDrag=wrap=>{bindCalendarDragWithUniversalCopy(wrap);bindUniversalDatabaseDrag(wrap)};
 const bindBlockInteractionsWithUniversalCopy=bindBlockInteractions;bindBlockInteractions=(row,handle)=>{bindBlockInteractionsWithUniversalCopy(row,handle);if(!canEdit())return;handle.addEventListener('dragstart',event=>setDragIntent(event),true);handle.addEventListener('dragend',resetUniversalDrag,true);row.addEventListener('dragover',event=>{if(!state.dragRow||state.dragRow===row)return;if(event.altKey)state.dragCopy=true;if(state.dragCopy){event.preventDefault();event.dataTransfer.dropEffect='copy'}},true);row.addEventListener('drop',event=>{if(!state.dragRow||!state.dragCopy||state.dragRow===row)return;event.preventDefault();event.stopImmediatePropagation();const sourceRows=selectedRows().filter(item=>item.isConnected);if(!sourceRows.includes(state.dragRow))sourceRows.unshift(state.dragRow);const blocks=sourceRows.flatMap(item=>{const data=blockDataFromRow(item);return Array.isArray(data)?data:[data]}),after=event.clientY>row.getBoundingClientRect().top+row.getBoundingClientRect().height/2;let anchor=row;for(const block of blocks){const next=blockRow({...block,id:'blk_'+crypto.randomUUID().replaceAll('-','')},0);after?anchor.after(next):anchor.before(next);anchor=next}clearBlockSelection();renumberBlocks();scheduleSave();focusBlock(anchor,true);toast('블록을 복사했습니다.');resetUniversalDrag()},true)};
 const bindBlockInteractionsWithDropGuard=bindBlockInteractions;
 bindBlockInteractions=(row,handle)=>{if(canEdit())row.addEventListener('drop',event=>guardDuplicateDrop(event),true);bindBlockInteractionsWithDropGuard(row,handle)};
 const bindBlockInteractionsWithDynamicMediaSelection=bindBlockInteractions;
 bindBlockInteractions=(row,handle)=>{bindBlockInteractionsWithDynamicMediaSelection(row,handle);if(!canEdit())return;row.addEventListener('click',event=>{const image=event.target?.closest?.('.media-preview img:not(.inline-link-favicon)');if(!image||!row.contains(image))return;event.preventDefault();event.stopPropagation();selectBlock(row,event.shiftKey||event.ctrlKey||event.metaKey)})};
 function bindBlockMarqueeSelection(){
   const editor=$('block-editor');
   if(!editor||editor.dataset.marqueeSelectionBound==='1')return;
   editor.dataset.marqueeSelectionBound='1';
   editor.setAttribute('aria-multiselectable','true');
   const rows=()=>[...editor.children].filter(row=>row.classList.contains('block-row'));
   const rowAtPoint=(clientX,clientY)=>{
     const all=rows();
     if(!all.length)return null;
     const direct=document.elementFromPoint(clientX,clientY)?.closest?.('.block-row');
     if(direct&&direct.parentElement===editor)return direct;
     for(const row of all){const rect=row.getBoundingClientRect();if(clientY>=rect.top&&clientY<=rect.bottom)return row}
     return clientY<all[0].getBoundingClientRect().top?all[0]:all.at(-1);
   };
   const inGutter=(row,event)=>{
     const content=row.querySelector('.block-content,.todo-wrap,.toggle-wrap,.callout-wrap,.database-block,.media-block,.toc-block,.math-block');
     const rect=content?.getBoundingClientRect();
     return !rect||event.clientX<rect.left-8;
   };
   const applyRange=(drag,row)=>{
     const all=rows(),from=all.indexOf(drag.anchor),to=all.indexOf(row);
     if(from<0||to<0)return;
     const next=new Set(drag.base),start=Math.min(from,to),end=Math.max(from,to);
     for(let index=start;index<=end;index++)next.add(all[index].dataset.id);
     state.selectedBlocks=next;syncBlockSelection();drag.current=row;drag.moved=drag.moved||row!==drag.anchor;
   };
   const finish=(event,cancelled=false)=>{
     const drag=state.blockSelectionDrag;
     if(!drag)return;
     if(editor.hasPointerCapture?.(drag.pointerId))try{editor.releasePointerCapture(drag.pointerId)}catch{}
     editor.classList.remove('block-selecting');state.blockSelectionDrag=null;
     if(cancelled){state.selectedBlocks=drag.base;syncBlockSelection()}
     event?.preventDefault?.();
   };
   editor.addEventListener('pointerdown',event=>{
     if(!canEdit()||event.button!==0||event.target.closest('input,textarea,select,a,[contenteditable="true"],.block-handle,button'))return;
     const row=event.target.closest('.block-row')||rowAtPoint(event.clientX,event.clientY);
     if(!row||row.parentElement!==editor||!inGutter(row,event))return;
     const additive=event.shiftKey||event.ctrlKey||event.metaKey;
     const base=additive?new Set(state.selectedBlocks):new Set();
     if(!additive)clearBlockSelection();
     state.blockSelectionDrag={pointerId:event.pointerId,anchor:row,current:row,base,moved:false,startX:event.clientX,startY:event.clientY};
     editor.classList.add('block-selecting');
     try{editor.setPointerCapture(event.pointerId)}catch{}
     applyRange(state.blockSelectionDrag,row);
     event.preventDefault();
   });
   editor.addEventListener('pointermove',event=>{
     const drag=state.blockSelectionDrag;
     if(!drag||drag.pointerId!==event.pointerId)return;
     const row=rowAtPoint(event.clientX,event.clientY);
     if(row)applyRange(drag,row);
     event.preventDefault();
   });
   editor.addEventListener('pointerup',event=>{if(state.blockSelectionDrag?.pointerId===event.pointerId)finish(event)});
   editor.addEventListener('pointercancel',event=>{if(state.blockSelectionDrag?.pointerId===event.pointerId)finish(event,true)});
   window.addEventListener('blur',()=>finish(null,true),true);
 }
 bindBlockMarqueeSelection();
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
  if (request.method === 'GET' && path === '/app.css') return asset(CSS + UI_POLISH_CSS + UI_SPACING_CSS + DEMO_CSS, 'text/css; charset=utf-8');
  if (request.method === 'GET' && path === '/app.js') return asset(CLIENT_JS, 'text/javascript; charset=utf-8');
  if (request.method === 'GET' && /^\/api\/captcha\/[a-f0-9-]{36}\.svg$/.test(path)) return getCaptchaSvg(env, path.slice(13, -4));
  if (request.method === 'GET' && path === '/api/captcha') return createCaptcha(request, env);
  if (request.method === 'GET' && path === '/api/setup-status') return setupStatus(request, env);
  if (request.method === 'POST' && path === DEMO_RESET_PATH) return resetDemoEndpoint(request, env);
  if (request.method === 'POST' && path === '/api/setup') {
    assertSameOrigin(request);
    return installAdmin(request, env);
  }
  if (request.method === 'POST' && path === '/api/bootstrap-signup') {
    assertSameOrigin(request);
    return bootstrapSignup(request, env);
  }
  if (request.method === 'POST' && path === '/api/register') {
    assertSameOrigin(request);
    await enforceIpAllowlist(request, env);
    return publicRegister(request, env);
  }
  if (request.method === 'POST' && path === '/api/login') {
    assertSameOrigin(request);
    await enforceIpAllowlist(request, env);
    return login(request, env);
  }
  if (request.method === 'POST' && path === '/api/logout') {
    assertSameOrigin(request);
    return logout(request, env);
  }
  const invitePublic = path.match(/^\/api\/invitations\/([A-Za-z0-9_-]{32,128})$/);
  if (request.method === 'GET' && invitePublic) { await enforceIpAllowlist(request, env); return invitationPreview(env, invitePublic[1]); }
  const inviteAccept = path.match(/^\/api\/invitations\/([A-Za-z0-9_-]{32,128})\/accept$/);
  if (request.method === 'POST' && inviteAccept) {
    assertSameOrigin(request);
    await enforceIpAllowlist(request, env);
    return acceptInvitation(request, env, inviteAccept[1]);
  }
  const publicDocumentRoute = path.match(/^\/api\/public\/documents\/([A-Za-z0-9_-]{8,80})$/);
  if (request.method === 'GET' && publicDocumentRoute) return getPublicDocument(env, publicDocumentRoute[1]);

  if (path.startsWith('/api/')) {
    await enforceIpAllowlist(request, env);
    const actor = await requireMember(request, env);
    if (request.method !== 'GET') assertSameOrigin(request);
    if (request.method === 'GET' && path === '/api/me') return json({ user: publicUser(actor), membership: { role: actor.role }, workspace: await readSpaceProfile(env.DB) });
    if (request.method === 'GET' && path === '/api/settings') return getWorkspaceSettings(request, env, actor);
    if (request.method === 'PATCH' && path === '/api/settings') return updateWorkspaceSettings(request, env, actor);
    if (path === '/api/documents' && request.method === 'GET') return listDocuments(url, env, actor);
    if (path === '/api/documents' && request.method === 'POST') return createDocument(request, env, actor);
    if (path === '/api/import/markdown' && request.method === 'POST') return importMarkdown(request, env, actor);
    if (path === '/api/import/notion-api/status' && request.method === 'GET') return notionApiStatus(env, actor);
    if (path === '/api/import/notion-api/users' && request.method === 'POST') return syncNotionPeople(env, actor);
    if (path === '/api/import/notion-api/audit' && request.method === 'GET') {
      if (url.searchParams.get('links') === '1') return auditImportedLinks(env, actor);
      return auditNotionApi(request, env, actor);
    }
    if (path === '/api/import/notion-api/link-audit' && request.method === 'GET') return auditImportedLinks(env, actor);
    if (path === '/api/import/notion-api/views' && request.method === 'GET') {
      requireRole(actor, MANAGE_ROLES);
      const sourceId = normalizedNotionId(url.searchParams.get('data_source_id'));
      return json({ data_source_id: sourceId, views: await listNotionApiViews(env, sourceId) });
    }
    if (path === '/api/import/notion-api/search' && request.method === 'POST') return searchNotionApi(request, env, actor);
    if (path === '/api/import/notion-api/linked-missing' && request.method === 'POST') return missingLinkedNotionItems(env, actor);
    const notionApiPageRoute = path.match(/^\/api\/import\/notion-api\/pages\/([0-9a-f-]{32,36})$/i);
    if (notionApiPageRoute && request.method === 'POST') return importNotionApiPage(request, env, actor, notionApiPageRoute[1]);
    const notionApiDataSourceRoute = path.match(/^\/api\/import\/notion-api\/data-sources\/([0-9a-f-]{32,36})$/i);
    if (notionApiDataSourceRoute && request.method === 'POST') return importNotionApiDataSource(request, env, actor, notionApiDataSourceRoute[1]);
    if (path === '/api/import/notion-api/reconcile' && request.method === 'POST') return reconcileNotionApiParents(env, actor);
    if (path === '/api/import/notion-zip' && request.method === 'POST') return importNotionZip(request, env, actor);
    if (path === '/api/import/notion-sessions' && request.method === 'POST') return createLargeNotionImport(request, env, actor);
    const notionRegisterRoute = path.match(/^\/api\/import\/notion-sessions\/(nimp_[A-Za-z0-9_-]{8,80})\/(documents|assets)$/);
    if (notionRegisterRoute && request.method === 'POST') return registerLargeNotionEntries(request, env, actor, notionRegisterRoute[1], notionRegisterRoute[2]);
    const notionAssetRoute = path.match(/^\/api\/import\/notion-sessions\/(nimp_[A-Za-z0-9_-]{8,80})\/assets\/(\d+)$/);
    if (notionAssetRoute && request.method === 'PUT') return uploadLargeNotionAsset(request, env, actor, notionAssetRoute[1], Number(notionAssetRoute[2]));
    const notionMultipartCreateRoute = path.match(/^\/api\/import\/notion-sessions\/(nimp_[A-Za-z0-9_-]{8,80})\/assets\/(\d+)\/multipart$/);
    if (notionMultipartCreateRoute && request.method === 'POST') return createLargeNotionMultipart(env, actor, notionMultipartCreateRoute[1], Number(notionMultipartCreateRoute[2]));
    const notionMultipartPartRoute = path.match(/^\/api\/import\/notion-sessions\/(nimp_[A-Za-z0-9_-]{8,80})\/assets\/(\d+)\/multipart\/(\d+)$/);
    if (notionMultipartPartRoute && request.method === 'PUT') return uploadLargeNotionPart(request, env, actor, notionMultipartPartRoute[1], Number(notionMultipartPartRoute[2]), Number(notionMultipartPartRoute[3]));
    const notionMultipartCompleteRoute = path.match(/^\/api\/import\/notion-sessions\/(nimp_[A-Za-z0-9_-]{8,80})\/assets\/(\d+)\/multipart-complete$/);
    if (notionMultipartCompleteRoute && request.method === 'POST') return completeLargeNotionMultipart(request, env, actor, notionMultipartCompleteRoute[1], Number(notionMultipartCompleteRoute[2]));
    const notionDocumentsBatchRoute = path.match(/^\/api\/import\/notion-sessions\/(nimp_[A-Za-z0-9_-]{8,80})\/documents-batch$/);
    if (notionDocumentsBatchRoute && request.method === 'POST') return importLargeNotionDocuments(request, env, actor, notionDocumentsBatchRoute[1]);
    const notionCompleteRoute = path.match(/^\/api\/import\/notion-sessions\/(nimp_[A-Za-z0-9_-]{8,80})\/complete$/);
    if (notionCompleteRoute && request.method === 'POST') return completeLargeNotionImport(env, actor, notionCompleteRoute[1]);
    const documentViewPreferencesRoute = path.match(/^\/api\/documents\/([A-Za-z0-9_-]{8,80})\/view-preferences$/);
    if (documentViewPreferencesRoute && request.method === 'GET') return getDocumentViewPreferences(env, actor, documentViewPreferencesRoute[1]);
    if (documentViewPreferencesRoute && request.method === 'PUT') return saveDocumentViewPreference(request, env, actor, documentViewPreferencesRoute[1]);
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
    if (path === '/api/notion-members' && request.method === 'GET') return listNotionMembers(env, actor);
    if (path === '/api/admin/reset-notion-migration' && request.method === 'POST') return resetNotionMigration(request, env, actor);
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

function isDemoRequest(request) {
  const hostname = new URL(request.url).hostname;
  return hostname === DEMO_HOSTNAME || hostname === DEMO_CRON_HOSTNAME;
}

async function setupStatus(request, env) {
  if (isDemoRequest(request)) {
    await ensureDemoData(env);
    const token = await ensureDemoSession(request, env);
    return json({ installed: true, public_signup_enabled: false, demo_mode: true }, 200, token ? { 'set-cookie': sessionCookie(token) } : {});
  }
  const db = requireDb(env);
  const [row, signup] = await Promise.all([
    db.prepare('SELECT EXISTS(SELECT 1 FROM project_members WHERE project_id=?) AS installed').bind(PROJECT_ID).first(),
    db.prepare("SELECT value FROM app_settings WHERE key='public_signup_enabled'").first()
  ]);
  return json({ installed: Number(row && row.installed) === 1, public_signup_enabled: signup?.value === '1' });
}

async function ensureDemoData(env) {
  const db = requireDb(env);
  const [marker, member] = await Promise.all([
    readAppSetting(db, DEMO_MODE_SETTING, '0'),
    db.prepare('SELECT 1 AS yes FROM project_members WHERE project_id=? AND user_id=?').bind(PROJECT_ID, DEMO_USER_ID).first()
  ]);
  if (marker === '1' && member) return;
  await resetDemoData(env);
}

async function ensureDemoSession(request, env) {
  const db = requireDb(env);
  const current = parseCookies(request.headers.get('cookie'))[SESSION_COOKIE];
  if (current) {
    const existing = await db.prepare('SELECT 1 AS yes FROM sessions WHERE token_hash=? AND user_id=? AND expires_at>?')
      .bind(await sha256Hex(current), DEMO_USER_ID, nowSeconds()).first();
    if (existing) return null;
  }
  const token = randomString(43);
  const now = nowSeconds();
  await db.prepare('INSERT INTO sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)')
    .bind(await sha256Hex(token), DEMO_USER_ID, now + SESSION_TTL_SECONDS, now).run();
  return token;
}

async function resetDemoEndpoint(request, env) {
  if (!isDemoRequest(request)) throw new HttpError(404, '요청한 기능을 찾을 수 없습니다.');
  await resetDemoData(env);
  const token = await ensureDemoSession(request, env);
  return json({ ok: true, demo_mode: true, reset_at: new Date().toISOString() }, 200, token ? { 'set-cookie': sessionCookie(token) } : {});
}

async function resetDemoData(env) {
  const db = requireDb(env);
  const fileRows = await db.prepare('SELECT storage_key FROM file_uploads').all();
  const existingDemoUser = await db.prepare('SELECT id FROM users WHERE id=?').bind(DEMO_USER_ID).first();
  const demoUser = existingDemoUser ? null : await passwordUser(DEMO_USERNAME, randomString(48));
  if (demoUser) demoUser.id = DEMO_USER_ID;
  const now = nowSeconds();
  const tableRows = await db.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all();
  const optionalCleanup = ['notion_import_staged_entries', 'notion_import_items', 'notion_imports', 'notion_people']
    .filter((name) => (tableRows.results || []).some((row) => row.name === name))
    .map((name) => db.prepare(`DELETE FROM ${name}`));
  const statements = [
    db.prepare('DELETE FROM document_grants'),
    db.prepare('DELETE FROM document_favorites'),
    db.prepare('DELETE FROM recent_documents'),
    db.prepare('DELETE FROM document_access'),
    db.prepare('DELETE FROM document_versions'),
    db.prepare('DELETE FROM file_uploads'),
    db.prepare('DELETE FROM document_publications'),
    db.prepare('DELETE FROM document_comments'),
    db.prepare('DELETE FROM notifications'),
    db.prepare('DELETE FROM activity_events'),
    ...optionalCleanup,
    db.prepare('DELETE FROM documents'),
    db.prepare('DELETE FROM project_invitations'),
    db.prepare('DELETE FROM project_members'),
    db.prepare('DELETE FROM sessions'),
    db.prepare('DELETE FROM users WHERE id<>?').bind(DEMO_USER_ID),
    db.prepare('DELETE FROM app_settings'),
    db.prepare('DELETE FROM auth_rate_limits'),
    db.prepare('DELETE FROM captcha_challenges'),
    db.prepare('DELETE FROM workspace_templates'),
    db.prepare('INSERT INTO app_settings (key,value,updated_at) VALUES (?,?,?)').bind('installation_complete', '1', now),
    db.prepare('INSERT INTO app_settings (key,value,updated_at) VALUES (?,?,?)').bind(DEMO_MODE_SETTING, '1', now),
    db.prepare('INSERT INTO app_settings (key,value,updated_at) VALUES (?,?,?)').bind('public_signup_enabled', '0', now),
    db.prepare('INSERT INTO app_settings (key,value,updated_at) VALUES (?,?,?)').bind('public_signup_role', 'member', now),
    db.prepare('INSERT INTO app_settings (key,value,updated_at) VALUES (?,?,?)').bind('ip_allowlist_enabled', '0', now),
    db.prepare('INSERT INTO app_settings (key,value,updated_at) VALUES (?,?,?)').bind('ip_allowlist', '', now),
    db.prepare('INSERT INTO app_settings (key,value,updated_at) VALUES (?,?,?)').bind('space_mode', 'team', now),
    db.prepare('INSERT INTO app_settings (key,value,updated_at) VALUES (?,?,?)').bind('space_name', 'JoripNote', now)
  ];
  if (demoUser) statements.push(db.prepare(`INSERT INTO users
    (id,username,password_hash,password_salt,password_iterations,realtime_key,created_at) VALUES (?,?,?,?,?,?,?)`)
    .bind(demoUser.id, demoUser.username, demoUser.password_hash, demoUser.password_salt, demoUser.password_iterations, randomString(32), now));
  statements.push(
    db.prepare('INSERT INTO project_members (project_id,user_id,role,joined_at,updated_at) VALUES (?,?,?,?,?)').bind(PROJECT_ID, DEMO_USER_ID, 'owner', now, now),
    ...BUILTIN_TEMPLATES.map(([id, name, description, iconValue, blocks]) => db.prepare(`INSERT INTO workspace_templates
      (id,project_id,name,description,icon,blocks_json,created_by,is_builtin,created_at,updated_at)
      VALUES (?,?,?,?,?,?,NULL,1,?,?)`).bind(id, PROJECT_ID, name, description, iconValue, JSON.stringify(blocks), now, now)),
    ...starterDocumentStatements(db, DEMO_USER_ID, now, 'https://' + DEMO_HOSTNAME)
  );
  await db.batch(statements);
  if (env.STORAGE && typeof env.STORAGE.delete === 'function') {
    for (const row of fileRows.results || []) {
      try { await env.STORAGE.delete(row.storage_key); } catch (error) { console.error('demo_storage_cleanup_failed', error && error.message); }
    }
  }
}

function starterDocumentStatements(db, userId, now, origin) {
  const statements = [];
  STARTER_DOCUMENTS.forEach((document, documentIndex) => {
    const timestamp = now - documentIndex;
    statements.push(db.prepare(`INSERT INTO documents
      (id,project_id,parent_document_id,title,title_search,status,version,active_snapshot_id,created_by,updated_by,created_at,updated_at)
      VALUES (?,?,?,?,?,'active',1,?,?,?,?,?)`).bind(document.id, PROJECT_ID, document.parentId, document.title, normalizeSearch(document.title), document.snapshotId, userId, userId, timestamp, timestamp));
    document.blocks.forEach(([id, type, rawContent, checked = false, indentLevel = 0], position) => {
      const content = String(rawContent).replaceAll('{origin}', origin);
      statements.push(db.prepare(`INSERT INTO document_blocks
        (id,document_id,snapshot_id,block_type,content,position,checked,indent_level,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(id, document.id, document.snapshotId, type, content, position, checked ? 1 : 0, indentLevel, timestamp, timestamp));
    });
    statements.push(db.prepare('INSERT INTO document_access (document_id,project_id,visibility,updated_by,updated_at) VALUES (?,?,?,?,?)').bind(document.id, PROJECT_ID, 'workspace', userId, timestamp));
    statements.push(db.prepare('INSERT INTO document_versions (id,project_id,document_id,version,snapshot_id,title,created_by,created_at) VALUES (?,?,?,?,?,?,?,?)').bind('ver_' + document.id, PROJECT_ID, document.id, 1, document.snapshotId, document.title, userId, timestamp));
    if (document.favorite) statements.push(db.prepare('INSERT INTO document_favorites (project_id,user_id,document_id,created_at) VALUES (?,?,?,?)').bind(PROJECT_ID, userId, document.id, timestamp));
    if (document.recent) statements.push(db.prepare('INSERT INTO recent_documents (project_id,user_id,document_id,opened_at) VALUES (?,?,?,?)').bind(PROJECT_ID, userId, document.id, timestamp));
    if (document.comment) statements.push(db.prepare(`INSERT INTO document_comments
      (id,project_id,document_id,block_id,body,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`).bind(document.comment.id, PROJECT_ID, document.id, document.comment.blockId, document.comment.body, userId, timestamp, timestamp));
  });
  statements.push(db.prepare('INSERT INTO activity_events (id,project_id,actor_id,document_id,kind,message,created_at) VALUES (?,?,?,?,?,?,?)')
    .bind('act_starter_installed', PROJECT_ID, userId, 'doc_starter_welcome', 'workspace_installed', 'JoripNote 설치와 샘플 문서 준비를 완료했습니다.', now));
  return statements;
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
    db.prepare('INSERT OR IGNORE INTO app_settings (key,value,updated_at) VALUES (?,?,?)').bind('public_signup_enabled', '0', now),
    db.prepare('INSERT OR IGNORE INTO app_settings (key,value,updated_at) VALUES (?,?,?)').bind('public_signup_role', 'member', now),
    db.prepare('INSERT OR IGNORE INTO app_settings (key,value,updated_at) VALUES (?,?,?)').bind('ip_allowlist_enabled', '0', now),
    db.prepare('INSERT OR IGNORE INTO app_settings (key,value,updated_at) VALUES (?,?,?)').bind('ip_allowlist', '', now),
    db.prepare('INSERT OR IGNORE INTO app_settings (key,value,updated_at) VALUES (?,?,?)').bind('space_mode', 'team', now),
    db.prepare('INSERT OR IGNORE INTO app_settings (key,value,updated_at) VALUES (?,?,?)').bind('space_name', 'JoripNote', now),
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

async function publicRegister(request, env) {
  const db = requireDb(env);
  const enabled = await readAppSetting(db, 'public_signup_enabled', '0');
  if (enabled !== '1') throw new HttpError(403, '현재 공개 회원가입을 받지 않습니다. 멤버 초대를 요청해 주세요.');
  await enforceRateLimit(db, 'register_ip', await requestKey(request, 'register'), 8, 3600);
  const body = await readJson(request);
  const username = normalizeUsername(body.username);
  const password = String(body.password || '');
  if (!validateUsername(username)) throw new HttpError(400, '아이디는 영문, 숫자, 밑줄 3–20자로 입력해 주세요.');
  if (!validatePassword(password)) throw new HttpError(400, '비밀번호는 8–72자로 입력해 주세요.');
  if (password !== String(body.password_confirmation || '')) throw new HttpError(400, '비밀번호 확인이 일치하지 않습니다.');
  const configuredRole = await readAppSetting(db, 'public_signup_role', 'member');
  const role = ['member', 'viewer'].includes(configuredRole) ? configuredRole : 'member';
  const user = await passwordUser(username, password);
  const now = nowSeconds();
  try {
    await db.batch([
      db.prepare('INSERT INTO users (id,username,password_hash,password_salt,password_iterations,realtime_key,created_at) VALUES (?,?,?,?,?,?,?)').bind(user.id, user.username, user.password_hash, user.password_salt, user.password_iterations, randomString(32), now),
      db.prepare('INSERT INTO project_members (project_id,user_id,role,joined_at,updated_at) VALUES (?,?,?,?,?)').bind(PROJECT_ID, user.id, role, now, now)
    ]);
  } catch (error) {
    if (String(error?.message || '').toLowerCase().includes('unique')) throw new HttpError(409, '이미 사용 중인 아이디입니다.');
    throw error;
  }
  return createSessionResponse(db, user, role, 201);
}

async function getWorkspaceSettings(request, env, actor) {
  const db = requireDb(env);
  const keys = ['public_signup_enabled', 'public_signup_role', 'ip_allowlist_enabled', 'ip_allowlist', 'space_mode', 'space_name'];
  const result = await db.prepare(`SELECT key,value FROM app_settings WHERE key IN (${keys.map(() => '?').join(',')})`).bind(...keys).all();
  const values = Object.fromEntries((result.results || []).map(row => [row.key, row.value]));
  return json({
    can_manage_security: actor.role === 'owner',
    space_mode: values.space_mode === 'personal' ? 'personal' : 'team',
    space_name: normalizeSpaceName(values.space_name || 'JoripNote'),
    public_signup_enabled: values.public_signup_enabled === '1',
    public_signup_role: ['member', 'viewer'].includes(values.public_signup_role) ? values.public_signup_role : 'member',
    ip_allowlist_enabled: values.ip_allowlist_enabled === '1',
    ip_allowlist: values.ip_allowlist || '',
    current_ip: clientIp(request)
  });
}

async function updateWorkspaceSettings(request, env, actor) {
  if (actor.role !== 'owner') throw new HttpError(403, 'Owner만 가입과 IP 접근 정책을 변경할 수 있습니다.');
  const body = await readJson(request);
  const updates = {};
  if ('space_mode' in body) {
    if (!['personal', 'team'].includes(body.space_mode)) throw new HttpError(400, '공간 사용 방식이 올바르지 않습니다.');
    updates.space_mode = body.space_mode;
  }
  if ('space_name' in body) updates.space_name = normalizeSpaceName(body.space_name);
  if ('public_signup_enabled' in body) {
    if (typeof body.public_signup_enabled !== 'boolean') throw new HttpError(400, '회원가입 설정이 올바르지 않습니다.');
    updates.public_signup_enabled = body.public_signup_enabled ? '1' : '0';
  }
  if ('public_signup_role' in body) {
    if (!['member', 'viewer'].includes(body.public_signup_role)) throw new HttpError(400, '신규 회원 역할이 올바르지 않습니다.');
    updates.public_signup_role = body.public_signup_role;
  }
  if ('ip_allowlist' in body || 'ip_allowlist_enabled' in body) {
    const existingList = await readAppSetting(env.DB, 'ip_allowlist', '');
    const list = normalizeIpList('ip_allowlist' in body ? body.ip_allowlist : existingList);
    const enabled = 'ip_allowlist_enabled' in body ? body.ip_allowlist_enabled : (await readAppSetting(env.DB, 'ip_allowlist_enabled', '0')) === '1';
    if (typeof enabled !== 'boolean') throw new HttpError(400, 'IP 제한 설정이 올바르지 않습니다.');
    if (enabled && !list.includes(clientIp(request))) throw new HttpError(400, '현재 접속 IP를 허용목록에 먼저 추가해 주세요.', { current_ip: clientIp(request) });
    updates.ip_allowlist = list.join('\n');
    updates.ip_allowlist_enabled = enabled ? '1' : '0';
  }
  if (!Object.keys(updates).length) throw new HttpError(400, '변경할 설정이 없습니다.');
  const now = nowSeconds();
  await env.DB.batch(Object.entries(updates).map(([key, value]) => env.DB.prepare(`INSERT INTO app_settings (key,value,updated_at) VALUES (?,?,?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).bind(key, value, now)));
  return getWorkspaceSettings(request, env, actor);
}

async function readAppSetting(db, key, fallback = '') {
  const row = await db.prepare('SELECT value FROM app_settings WHERE key=?').bind(key).first();
  return row ? String(row.value) : fallback;
}

function normalizeSpaceName(value) {
  const name = String(value || '').normalize('NFKC').trim();
  if (!name || name.length > 40 || /[\u0000-\u001f\u007f]/.test(name)) throw new HttpError(400, '공간 이름은 1–40자로 입력해 주세요.');
  return name;
}

async function readSpaceProfile(db) {
  const result = await db.prepare("SELECT key,value FROM app_settings WHERE key IN ('space_mode','space_name')").all();
  const values = Object.fromEntries((result.results || []).map(row => [row.key, row.value]));
  return { space_mode: values.space_mode === 'personal' ? 'personal' : 'team', space_name: normalizeSpaceName(values.space_name || 'JoripNote') };
}

function clientIp(request) {
  return String(request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim().toLowerCase();
}

function normalizeIpList(value) {
  const entries = [...new Set(String(value || '').split(/[\s,]+/).map(item => item.trim().toLowerCase()).filter(Boolean))];
  if (entries.length > 50) throw new HttpError(400, '허용 IP는 최대 50개까지 등록할 수 있습니다.');
  for (const ip of entries) if (!isIpAddress(ip)) throw new HttpError(400, '올바르지 않은 IP가 있습니다: ' + ip);
  return entries;
}

function isIpAddress(value) {
  const ipv4 = value.split('.');
  if (ipv4.length === 4 && ipv4.every(part => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255)) return true;
  if (value.length > 39 || !value.includes(':') || !/^[0-9a-f:]+$/.test(value)) return false;
  const halves = value.split('::');
  if (halves.length > 2) return false;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  if (![...left, ...right].every(part => /^[0-9a-f]{1,4}$/.test(part))) return false;
  return halves.length === 2 ? left.length + right.length < 8 : left.length === 8;
}

async function enforceIpAllowlist(request, env) {
  const db = requireDb(env);
  if (await readAppSetting(db, 'ip_allowlist_enabled', '0') !== '1') return;
  const allowed = normalizeIpList(await readAppSetting(db, 'ip_allowlist', ''));
  if (!allowed.includes(clientIp(request))) throw new HttpError(403, '이 네트워크에서는 JoripNote에 접근할 수 없습니다.');
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
  return json({ user: publicUser(user), membership: { role }, workspace: await readSpaceProfile(db) }, status, { 'set-cookie': sessionCookie(token) });
}

async function enrichSearchDocuments(db, rows, terms) {
  if (!rows.length || !terms.length) return;
  const clauses = rows.map(() => '(document_id=? AND snapshot_id=?)').join(' OR ');
  const values = rows.flatMap((row) => [row.id, row.active_snapshot_id]);
  const result = await db.prepare(`SELECT document_id, block_type, content, position FROM document_blocks WHERE ${clauses} ORDER BY position ASC`).bind(...values).all();
  const blocksByDocument = new Map();
  for (const block of result.results || []) {
    if (!blocksByDocument.has(block.document_id)) blocksByDocument.set(block.document_id, []);
    blocksByDocument.get(block.document_id).push(block);
  }
  for (const row of rows) {
    const titleText = searchText(row.title);
    const titleMatch = terms.every((term) => titleText.toLocaleLowerCase('ko-KR').includes(term));
    const blocks = (blocksByDocument.get(row.id) || []).filter((block) => !['database', 'divider', 'toc'].includes(block.block_type));
    const matchingBlock = blocks.find((block) => terms.every((term) => searchBlockText(block).toLocaleLowerCase('ko-KR').includes(term)))
      || blocks.find((block) => terms.some((term) => searchBlockText(block).toLocaleLowerCase('ko-KR').includes(term)))
      || blocks[0];
    row.search_match = titleMatch ? 'title' : 'content';
    row.preview = matchingBlock ? searchSnippet(searchBlockText(matchingBlock), terms) : '';
    row.preview_type = matchingBlock?.block_type || '';
  }
}

async function listDocuments(url, env, actor) {
  const scope = String(url.searchParams.get('scope') || 'all');
  const limit = boundedLimit(url.searchParams.get('limit'), 20, scope === 'sidebar' ? 200 : 50);
  const cursor = decodeCursor(url.searchParams.get('cursor'));
  const parentId = url.searchParams.get('parent_id');
  const q = normalizeSearch(url.searchParams.get('q'));
  const kind = ['all', 'document', 'database', 'imported'].includes(String(url.searchParams.get('kind'))) ? String(url.searchParams.get('kind')) : 'all';
  const sort = ['updated_desc', 'updated_asc', 'title_asc', 'created_desc'].includes(String(url.searchParams.get('sort'))) ? String(url.searchParams.get('sort')) : 'updated_desc';
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
    const terms = searchTerms(q);
    if (!terms.length) return json({ documents: [], next_cursor: null });
    const searchClause = terms.map(() => `(
        instr(d.title_search, ?) > 0 OR EXISTS(
          SELECT 1 FROM document_blocks b
          WHERE b.document_id=d.id AND b.snapshot_id=d.active_snapshot_id AND instr(lower(b.content), ?) > 0
        )
      )`).join(' AND ');
    sql = `SELECT d.*, EXISTS(SELECT 1 FROM document_favorites f WHERE f.project_id=? AND f.user_id=? AND f.document_id=d.id) AS is_favorite,
      EXISTS(SELECT 1 FROM documents c WHERE c.project_id=d.project_id AND c.parent_document_id=d.id AND c.status='active') AS has_children,
      (SELECT COUNT(*) FROM documents c WHERE c.project_id=d.project_id AND c.parent_document_id=d.id AND c.status='active') AS child_count,
      (SELECT p.title FROM documents p WHERE p.project_id=d.project_id AND p.id=d.parent_document_id) AS parent_title,
      d.updated_at AS list_sort
      FROM documents d WHERE d.project_id=? AND d.status='active' AND ${searchClause}`;
    values = [PROJECT_ID, actor.id, PROJECT_ID, ...terms.flatMap((term) => [term, term])];
    if (cursor) { sql += ' AND (d.updated_at < ? OR (d.updated_at = ? AND d.id < ?))'; values.push(cursor.sort, cursor.sort, cursor.id); }
    sql += ' ORDER BY d.updated_at DESC, d.id DESC LIMIT ?';
  } else {
    const includeListDetails = scope !== 'sidebar';
    const listDetailsSql = includeListDetails
      ? `substr(COALESCE((SELECT b.content FROM document_blocks b WHERE b.document_id=d.id AND b.snapshot_id=d.active_snapshot_id AND b.block_type NOT IN ('database','divider','toc') ORDER BY b.position ASC LIMIT 1),''),1,600) AS preview,
      COALESCE((SELECT b.block_type FROM document_blocks b WHERE b.document_id=d.id AND b.snapshot_id=d.active_snapshot_id AND b.block_type NOT IN ('database','divider','toc') ORDER BY b.position ASC LIMIT 1),'') AS preview_type,
      EXISTS(SELECT 1 FROM document_blocks b WHERE b.document_id=d.id AND b.snapshot_id=d.active_snapshot_id AND b.block_type='database') AS has_database`
      : `'' AS preview, '' AS preview_type, 0 AS has_database`;
    const sortConfig = sort === 'updated_asc'
      ? { column: 'd.updated_at', direction: 'ASC', compare: '>', idCompare: '>' }
      : sort === 'title_asc'
        ? { column: 'd.title_search', direction: 'ASC', compare: '>', idCompare: '>' }
        : sort === 'created_desc'
          ? { column: 'd.created_at', direction: 'DESC', compare: '<', idCompare: '<' }
          : { column: 'd.updated_at', direction: 'DESC', compare: '<', idCompare: '<' };
    sql = `SELECT d.*, EXISTS(SELECT 1 FROM document_favorites f WHERE f.project_id=? AND f.user_id=? AND f.document_id=d.id) AS is_favorite,
      EXISTS(SELECT 1 FROM documents c WHERE c.project_id=d.project_id AND c.parent_document_id=d.id AND c.status='active') AS has_children,
      (SELECT COUNT(*) FROM documents c WHERE c.project_id=d.project_id AND c.parent_document_id=d.id AND c.status='active') AS child_count,
      ${sortConfig.column} AS list_sort, ${listDetailsSql}
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
    if (scope !== 'sidebar') {
      if (q) {
        sql += ` AND (instr(d.title_search, ?) > 0 OR EXISTS(SELECT 1 FROM document_blocks b WHERE b.document_id=d.id AND b.snapshot_id=d.active_snapshot_id AND instr(lower(b.content), ?) > 0))`;
        values.push(q, q);
      }
      if (kind === 'database') sql += ` AND EXISTS(SELECT 1 FROM document_blocks b WHERE b.document_id=d.id AND b.snapshot_id=d.active_snapshot_id AND b.block_type='database')`;
      if (kind === 'document') sql += ` AND NOT EXISTS(SELECT 1 FROM document_blocks b WHERE b.document_id=d.id AND b.snapshot_id=d.active_snapshot_id AND b.block_type='database')`;
      if (kind === 'imported') sql += ' AND d.source_page_id IS NOT NULL';
    }
    if (cursor) {
      sql += ` AND (${sortConfig.column} ${sortConfig.compare} ? OR (${sortConfig.column} = ? AND d.id ${sortConfig.idCompare} ?))`;
      values.push(cursor.sort, cursor.sort, cursor.id);
    }
    sql += scope === 'sidebar'
      ? ' ORDER BY CASE WHEN d.source_page_id IS NULL THEN 1 ELSE 0 END, d.created_at ASC, d.id ASC LIMIT ?'
      : ` ORDER BY ${sortConfig.column} ${sortConfig.direction}, d.id ${sortConfig.direction} LIMIT ?`;
  }
  values.push(limit + 1);
  const result = await env.DB.prepare(sql).bind(...values).all();
  const rows = result.results || [];
  const accessible = [];
  for (const row of rows) if ((await documentPermission(env.DB, actor, row)).can_view) accessible.push(row);
  if (scope === 'search' && q) await enrichSearchDocuments(env.DB, accessible.slice(0, limit), searchTerms(q));
  const hasMore = rows.length > limit;
  const documents = accessible.slice(0, limit).map(publicDocument);
  const last = documents.at(-1);
  return json({ documents, next_cursor: hasMore && last ? encodeCursor({ sort: last.list_sort == null ? last.updated_at : last.list_sort, id: last.id }) : null });
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
    (id,document_id,snapshot_id,block_type,content,position,checked,indent_level,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .bind('blk_' + randomString(24), id, snapshotId, block.type, block.content.slice(0, 20000), index, block.checked ? 1 : 0, Number(block.indent_level || 0), now, now)));
  statements.push(env.DB.prepare('INSERT INTO document_access (document_id,project_id,visibility,updated_by,updated_at) VALUES (?,?,?,?,?)').bind(id, PROJECT_ID, 'workspace', actor.id, now));
  statements.push(env.DB.prepare('INSERT INTO document_versions (id,project_id,document_id,version,snapshot_id,title,created_by,created_at) VALUES (?,?,?,?,?,?,?,?)').bind('ver_' + randomString(24), PROJECT_ID, id, 1, snapshotId, title, actor.id, now));
  await env.DB.batch(statements);
  await recordActivity(env.DB, actor, id, 'document_imported', 'Markdown 문서를 가져왔습니다.');
  return json({ document: { id, title, parent_document_id: null, version: 1 }, imported_blocks: blocks.length }, 201);
}
async function requireLargeNotionImport(env, actor, importId) {
  requireRole(actor, MANAGE_ROLES, 'Owner와 Admin만 Notion 전체 가져오기를 실행할 수 있습니다.');
  if (!env.STORAGE || typeof env.STORAGE.put !== 'function') throw new HttpError(503, '스토리지 연결을 확인해 주세요.');
  const row = await env.DB.prepare('SELECT * FROM notion_imports WHERE id=? AND project_id=?').bind(importId, PROJECT_ID).first();
  if (!row) throw new HttpError(404, 'Notion 가져오기 작업을 찾을 수 없습니다.');
  return row;
}

async function createLargeNotionImport(request, env, actor) {
  requireRole(actor, MANAGE_ROLES, 'Owner와 Admin만 Notion 전체 가져오기를 실행할 수 있습니다.');
  if (!env.STORAGE || typeof env.STORAGE.createMultipartUpload !== 'function') throw new HttpError(503, '대용량 스토리지 연결을 확인해 주세요.');
  const body = await readJson(request);
  const filename = safeImportName(body.filename || 'notion-export.zip');
  const size = Number(body.size || 0);
  const entryCount = Number(body.entries || 0);
  const unpackedSize = Number(body.unpacked_size || 0);
  const repair = body.repair === true;
  const fingerprint = String(body.fingerprint || '').toLowerCase();
  if (!/\.zip$/i.test(filename) || !Number.isSafeInteger(size) || size <= 0 || size > NOTION_LARGE_MAX_UNPACKED_BYTES) throw new HttpError(413, 'Notion ZIP은 5GB 이하의 .zip 파일이어야 합니다.');
  if (!Number.isSafeInteger(entryCount) || entryCount < 1 || entryCount > NOTION_LARGE_MAX_ENTRIES) throw new HttpError(413, 'ZIP 항목은 최대 10,000개까지 가져올 수 있습니다.');
  if (!Number.isSafeInteger(unpackedSize) || unpackedSize < 1 || unpackedSize > NOTION_LARGE_MAX_UNPACKED_BYTES) throw new HttpError(413, 'ZIP 압축 해제 크기는 5GB 이하여야 합니다.');
  if (!/^[a-f0-9]{64}$/.test(fingerprint)) throw new HttpError(400, 'ZIP 식별 정보가 올바르지 않습니다.');
  const existing = await env.DB.prepare('SELECT * FROM notion_imports WHERE project_id=? AND archive_sha256=?').bind(PROJECT_ID, fingerprint).first();
  if (existing) return json({ import_id: existing.id, resumed: true, status: existing.status, repair });
  const id = 'nimp_' + randomString(24);
  await env.DB.prepare(`INSERT INTO notion_imports
    (id,project_id,archive_sha256,filename,status,total_items,imported_items,skipped_items,failed_items,created_by,created_at)
    VALUES (?,?,?,?, 'processing',0,0,0,0,?,?)`).bind(id, PROJECT_ID, fingerprint, filename, actor.id, nowSeconds()).run();
  return json({ import_id: id, resumed: false, status: 'processing' }, 201);
}

async function registerLargeNotionEntries(request, env, actor, importId, group) {
  await requireLargeNotionImport(env, actor, importId);
  const body = await readJson(request);
  const entries = Array.isArray(body.entries) ? body.entries : [];
  if (!entries.length || entries.length > 100) throw new HttpError(400, '한 번에 1~100개 항목을 등록해 주세요.');
  const normalized = entries.map(input => {
    const entryIndex = Number(input.index);
    const sourcePath = normalizeZipPath(input.path);
    const sourceSize = Number(input.size);
    if (!Number.isSafeInteger(entryIndex) || entryIndex < 0 || entryIndex > 99999 || !sourcePath) throw new HttpError(400, 'ZIP 항목 정보가 올바르지 않습니다.');
    if (!Number.isSafeInteger(sourceSize) || sourceSize < 0 || sourceSize > NOTION_LARGE_MAX_UNPACKED_BYTES) throw new HttpError(413, 'ZIP 항목 크기가 허용 범위를 넘었습니다.');
    return { input, entryIndex, sourcePath, sourceSize };
  });
  if (new Set(normalized.map(item => item.entryIndex)).size !== normalized.length) throw new HttpError(400, '한 요청에 중복된 ZIP 항목이 있습니다.');
  const existingResults = [];
  for (let offset = 0; offset < normalized.length; offset += 90) {
    const indexes = normalized.slice(offset, offset + 90).map(item => item.entryIndex);
    const placeholders = indexes.map(() => '?').join(',');
    const rows = await env.DB.prepare('SELECT * FROM notion_import_staged_entries WHERE import_id=? AND entry_index IN (' + placeholders + ')').bind(importId, ...indexes).all();
    existingResults.push(...(rows.results || []));
  }
  const existingByIndex = new Map(existingResults.map(row => [Number(row.entry_index), row]));
  let validOwners = null;
  if (group === 'assets') {
    const owners = await env.DB.prepare("SELECT document_id FROM notion_import_staged_entries WHERE import_id=? AND entry_type='document'").bind(importId).all();
    validOwners = new Set((owners.results || []).map(row => row.document_id));
  }
  const statements = [];
  const pending = [];
  for (const item of normalized) {
    const existing = existingByIndex.get(item.entryIndex);
    if (existing) {
      if (group === 'assets') {
        const ownerDocumentId = String(item.input.owner_document_id || '');
        if (!validOwners.has(ownerDocumentId)) throw new HttpError(400, '첨부파일의 상위 문서를 찾을 수 없습니다.');
        if (ownerDocumentId && ownerDocumentId !== existing.owner_document_id && existing.status !== 'uploading') {
          statements.push(env.DB.prepare("UPDATE notion_import_staged_entries SET owner_document_id=?,source_key=?,issue_code=NULL,updated_at=? WHERE import_id=? AND entry_index=?").bind(ownerDocumentId, notionSourceKey(item.sourcePath), nowSeconds(), importId, item.entryIndex));
          pending.push({ ...existing, owner_document_id: ownerDocumentId, source_key: notionSourceKey(item.sourcePath) });
        } else pending.push(existing);
      } else pending.push(existing);
      continue;
    }
    const { input, entryIndex, sourcePath, sourceSize } = item;
    if (group === 'documents') {
      if (!/\.(md|markdown|csv)$/i.test(sourcePath) || /(^|\/)index\.(md|markdown)$/i.test(sourcePath)) throw new HttpError(400, '문서 항목 형식이 올바르지 않습니다.');
      const documentId = 'doc_' + randomString(24);
      statements.push(env.DB.prepare(`INSERT INTO notion_import_staged_entries
        (import_id,entry_index,source_path,source_key,source_page_id,entry_type,source_size,document_id,import_role,status,updated_at)
        VALUES (?,?,?,?,?,?,?,? ,?,'registered',?)`).bind(importId, entryIndex, sourcePath, notionSourceKey(sourcePath), notionSourcePageId(sourcePath), 'document', sourceSize, documentId, /_all\.csv$/i.test(sourcePath) ? 'database_artifact' : 'primary', nowSeconds()));
      pending.push({ entry_index: entryIndex, source_path: sourcePath, source_key: notionSourceKey(sourcePath), source_page_id: notionSourcePageId(sourcePath), document_id: documentId, status: 'registered' });
    } else {
      const ownerDocumentId = String(input.owner_document_id || '');
      if (!validOwners.has(ownerDocumentId)) throw new HttpError(400, '첨부파일의 상위 문서를 찾을 수 없습니다.');
      const contentType = importContentType(sourcePath);
      if (!contentType) continue;
      const fileId = 'fil_' + randomString(24);
      const storageKey = 'documents/' + ownerDocumentId + '/' + fileId;
      statements.push(env.DB.prepare(`INSERT INTO notion_import_staged_entries
        (import_id,entry_index,source_path,source_key,source_page_id,entry_type,source_size,owner_document_id,file_id,storage_key,content_type,status,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,'registered',?)`).bind(importId, entryIndex, sourcePath, notionSourceKey(sourcePath), notionSourcePageId(sourcePath), 'asset', sourceSize, ownerDocumentId, fileId, storageKey, contentType, nowSeconds()));
      pending.push({ entry_index: entryIndex, source_path: sourcePath, source_key: notionSourceKey(sourcePath), source_page_id: notionSourcePageId(sourcePath), owner_document_id: ownerDocumentId, file_id: fileId, storage_key: storageKey, content_type: contentType, status: 'registered' });
    }
  }
  if (statements.length) await env.DB.batch(statements);
  const registered = pending.map(row => ({ index: Number(row.entry_index), path: row.source_path, document_id: row.document_id, owner_document_id: row.owner_document_id, file_id: row.file_id, url: row.file_id ? new URL(request.url).origin + '/api/files/' + row.file_id : null, status: row.status }));
  return json({ entries: registered });
}

async function requireLargeNotionAsset(env, importId, entryIndex) {
  const row = await env.DB.prepare("SELECT * FROM notion_import_staged_entries WHERE import_id=? AND entry_index=? AND entry_type='asset'").bind(importId, entryIndex).first();
  if (!row) throw new HttpError(404, '첨부파일 항목을 찾을 수 없습니다.');
  return row;
}

async function uploadLargeNotionAsset(request, env, actor, importId, entryIndex) {
  await requireLargeNotionImport(env, actor, importId);
  const row = await requireLargeNotionAsset(env, importId, entryIndex);
  if (Number(row.source_size) > NOTION_DIRECT_ASSET_MAX_BYTES) throw new HttpError(413, '큰 첨부파일은 분할 업로드가 필요합니다.');
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length !== Number(row.source_size)) throw new HttpError(400, '첨부파일 크기가 일치하지 않습니다.');
  await env.STORAGE.put(row.storage_key, bytes, { httpMetadata: { contentType: row.content_type } });
  await env.DB.prepare("UPDATE notion_import_staged_entries SET status='uploaded',updated_at=? WHERE import_id=? AND entry_index=?").bind(nowSeconds(), importId, entryIndex).run();
  return json({ uploaded: true, file_id: row.file_id });
}

async function createLargeNotionMultipart(env, actor, importId, entryIndex) {
  await requireLargeNotionImport(env, actor, importId);
  const row = await requireLargeNotionAsset(env, importId, entryIndex);
  const upload = await env.STORAGE.createMultipartUpload(row.storage_key, { httpMetadata: { contentType: row.content_type } });
  await env.DB.prepare("UPDATE notion_import_staged_entries SET status='uploading',upload_id=?,updated_at=? WHERE import_id=? AND entry_index=?").bind(upload.uploadId, nowSeconds(), importId, entryIndex).run();
  return json({ upload_id: upload.uploadId });
}

async function uploadLargeNotionPart(request, env, actor, importId, entryIndex, partNumber) {
  await requireLargeNotionImport(env, actor, importId);
  const row = await requireLargeNotionAsset(env, importId, entryIndex);
  const uploadId = String(new URL(request.url).searchParams.get('upload_id') || '');
  if (!uploadId || uploadId !== row.upload_id || !Number.isSafeInteger(partNumber) || partNumber < 1 || partNumber > 10000) throw new HttpError(400, '분할 업로드 정보가 올바르지 않습니다.');
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > NOTION_DIRECT_ASSET_MAX_BYTES) throw new HttpError(413, '업로드 조각은 8MB 이하여야 합니다.');
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > NOTION_DIRECT_ASSET_MAX_BYTES) throw new HttpError(413, '업로드 조각은 8MB 이하여야 합니다.');
  if (!bytes.byteLength) throw new HttpError(400, '빈 업로드 조각은 사용할 수 없습니다.');
  const part = await env.STORAGE.resumeMultipartUpload(row.storage_key, uploadId).uploadPart(partNumber, bytes);
  return json({ part_number: part.partNumber, etag: part.etag });
}

async function completeLargeNotionMultipart(request, env, actor, importId, entryIndex) {
  await requireLargeNotionImport(env, actor, importId);
  const row = await requireLargeNotionAsset(env, importId, entryIndex);
  const body = await readJson(request);
  const uploadId = String(body.upload_id || '');
  const parts = Array.isArray(body.parts) ? body.parts.map(part => ({ partNumber: Number(part.part_number), etag: String(part.etag || '') })) : [];
  if (!uploadId || uploadId !== row.upload_id || !parts.length || parts.length > 10000 || parts.some(part => !Number.isSafeInteger(part.partNumber) || part.partNumber < 1 || !part.etag)) throw new HttpError(400, '분할 업로드 완료 정보가 올바르지 않습니다.');
  await env.STORAGE.resumeMultipartUpload(row.storage_key, uploadId).complete(parts);
  await env.DB.prepare("UPDATE notion_import_staged_entries SET status='uploaded',updated_at=? WHERE import_id=? AND entry_index=?").bind(nowSeconds(), importId, entryIndex).run();
  return json({ uploaded: true, file_id: row.file_id });
}

async function importLargeNotionDocuments(request, env, actor, importId) {
  await requireLargeNotionImport(env, actor, importId);
  const body = await readJson(request);
  const documents = Array.isArray(body.documents) ? body.documents : [];
  const repair = body.repair === true;
  if (!documents.length || documents.length > 20) throw new HttpError(400, '한 번에 1~20개 문서를 처리해 주세요.');
  const results = [];
  for (const input of documents) {
    const entryIndex = Number(input.index);
    const content = String(input.content || '').replace(/\r\n?/g, '\n');
    if (encoder.encode(content).length > NOTION_DOCUMENT_MAX_BYTES) throw new HttpError(413, '개별 Notion 문서는 20MB 이하로 가져올 수 있습니다.');
    const row = await env.DB.prepare("SELECT * FROM notion_import_staged_entries WHERE import_id=? AND entry_index=? AND entry_type='document'").bind(importId, entryIndex).first();
    if (!row) throw new HttpError(404, 'Notion 문서 항목을 찾을 수 없습니다.');
    const parentDocumentId = input.parent_document_id ? String(input.parent_document_id) : null;
    if (parentDocumentId) {
      const parent = await env.DB.prepare("SELECT document_id,status FROM notion_import_staged_entries WHERE import_id=? AND entry_type='document' AND document_id=?").bind(importId, parentDocumentId).first();
      if (!parent || parent.status !== 'imported') throw new HttpError(409, '상위 문서를 먼저 가져와야 합니다.');
    }
    const assets = await env.DB.prepare("SELECT * FROM notion_import_staged_entries WHERE import_id=? AND entry_type='asset' AND owner_document_id=?").bind(importId, row.document_id).all();
    const missing = (assets.results || []).find(asset => asset.status !== 'uploaded');
    if (missing) throw new HttpError(409, '문서 첨부파일 업로드가 아직 끝나지 않았습니다.');
    const title = String(row.source_path || '').replace(/\.(md|markdown|csv)$/i, '').split('/').at(-1).replace(/\s+[0-9a-f]{32}$/i, '').replace(/_all$/i, '').normalize('NFKC').trim().slice(0, 160) || 'Notion 문서';
    const extraDatabases = Array.isArray(input.databases) ? input.databases.slice(0, 8).map(value => String(value || '')).filter(Boolean).map(value => { try { const parsed = JSON.parse(value); return parsed?.version === 2 && Array.isArray(parsed.columns) && Array.isArray(parsed.rows) ? JSON.stringify(parsed) : null; } catch { return null; } }).filter(Boolean) : [];
    let blocks = /\.csv$/i.test(row.source_path) ? csvToDatabaseBlocks(content, title) : parseMarkdownBlocks(content).blocks;
    for (const database of extraDatabases) blocks.push({ type: 'database', content: database, checked: false });
    const knownUrls = new Set(blocks.map(block => block.content));
    for (const asset of assets.results || []) {
      const url = new URL(request.url).origin + '/api/files/' + asset.file_id;
      if (!knownUrls.has(url)) blocks.push({ type: asset.content_type.startsWith('image/') ? 'image' : asset.content_type.startsWith('video/') ? 'video' : asset.content_type.startsWith('audio/') ? 'audio' : 'file', content: url, checked: false });
    }
    blocks = blocks.slice(0, 500);
    if (!blocks.length) blocks.push({ type: 'text', content: '', checked: false });
    const snapshotId = 'snap_' + randomString(24);
    const createdAt = nowSeconds();
    const existingDocument = row.status === 'imported' ? await env.DB.prepare('SELECT version,source_import_id,active_snapshot_id,import_baseline_snapshot_id FROM documents WHERE id=? AND project_id=?').bind(row.document_id, PROJECT_ID).first() : null;
    if (repair && existingDocument?.source_import_id && existingDocument.import_baseline_snapshot_id && existingDocument.import_baseline_snapshot_id !== existingDocument.active_snapshot_id) {
      results.push({ index: entryIndex, document_id: row.document_id, updated: false, conflict: true });
      continue;
    }
    const version = existingDocument ? Number(existingDocument.version) + 1 : 1;
    const transformVersion = 2;
    const sourcePageId = notionSourcePageId(row.source_path);
    const statements = existingDocument
      ? [env.DB.prepare(`UPDATE documents SET parent_document_id=?,title=?,title_search=?,version=?,active_snapshot_id=?,updated_by=?,updated_at=?,source_page_id=?,source_import_id=?,source_path=?,import_baseline_snapshot_id=?,import_transform_version=? WHERE id=? AND project_id=?`).bind(parentDocumentId, title, normalizeSearch(title), version, snapshotId, actor.id, createdAt, sourcePageId, importId, row.source_path, snapshotId, transformVersion, row.document_id, PROJECT_ID)]
      : [env.DB.prepare(`INSERT INTO documents
        (id,project_id,parent_document_id,title,title_search,status,version,active_snapshot_id,created_by,updated_by,created_at,updated_at,source_page_id,source_import_id,source_path,import_baseline_snapshot_id,import_transform_version)
        VALUES (?,?,?,?,?,'active',1,?,?,?,?,?,?,?,?,?,?)`).bind(row.document_id, PROJECT_ID, parentDocumentId, title, normalizeSearch(title), snapshotId, actor.id, actor.id, createdAt, createdAt, sourcePageId, importId, row.source_path, snapshotId, transformVersion)];
    blocks.forEach((block, index) => statements.push(env.DB.prepare(`INSERT INTO document_blocks
      (id,document_id,snapshot_id,block_type,content,position,checked,indent_level,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .bind('blk_' + randomString(24), row.document_id, snapshotId, block.type, String(block.content || '').slice(0, block.type === 'database' ? 100000 : 20000), index, block.checked ? 1 : 0, Number(block.indent_level || 0), createdAt, createdAt)));
    if (!existingDocument) statements.push(env.DB.prepare('INSERT INTO document_access (document_id,project_id,visibility,updated_by,updated_at) VALUES (?,?,?,?,?)').bind(row.document_id, PROJECT_ID, 'workspace', actor.id, createdAt));
    statements.push(env.DB.prepare('INSERT INTO document_versions (id,project_id,document_id,version,snapshot_id,title,created_by,created_at) VALUES (?,?,?,?,?,?,?,?)').bind('ver_' + randomString(24), PROJECT_ID, row.document_id, version, snapshotId, title, actor.id, createdAt));
    for (const asset of assets.results || []) {
      statements.push(env.DB.prepare(`INSERT OR IGNORE INTO file_uploads
        (id,project_id,document_id,storage_key,filename,content_type,size,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?)`)
        .bind(asset.file_id, PROJECT_ID, row.document_id, asset.storage_key, safeImportName(asset.source_path.split('/').at(-1)), asset.content_type, asset.source_size, actor.id, createdAt));
      statements.push(env.DB.prepare('UPDATE file_uploads SET document_id=? WHERE id=? AND project_id=?').bind(row.document_id, asset.file_id, PROJECT_ID));
    }
    statements.push(env.DB.prepare("UPDATE notion_import_staged_entries SET status='imported',parent_document_id=?,updated_at=? WHERE import_id=? AND entry_index=?").bind(parentDocumentId, createdAt, importId, entryIndex));
    statements.push(env.DB.prepare(`INSERT INTO notion_import_items (import_id,source_path,document_id,status,error,updated_at)
      VALUES (?,?,?,'imported',NULL,?) ON CONFLICT(import_id,source_path) DO UPDATE SET document_id=excluded.document_id,status='imported',error=NULL,updated_at=excluded.updated_at`)
      .bind(importId, row.source_path, row.document_id, createdAt));
    await env.DB.batch(statements);
    results.push({ index: entryIndex, document_id: row.document_id, updated: !!existingDocument });
  }
  return json({ documents: results });
}

async function completeLargeNotionImport(env, actor, importId) {
  await requireLargeNotionImport(env, actor, importId);
  const counts = await env.DB.prepare(`SELECT
    SUM(CASE WHEN entry_type='document' THEN 1 ELSE 0 END) total,
    SUM(CASE WHEN entry_type='document' AND status='imported' THEN 1 ELSE 0 END) imported,
    SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) failed
    FROM notion_import_staged_entries WHERE import_id=?`).bind(importId).first();
  const total = Number(counts?.total || 0);
  const imported = Number(counts?.imported || 0);
  const failed = Number(counts?.failed || 0);
  if (!total || imported + failed < total) throw new HttpError(409, '아직 처리하지 않은 Notion 문서가 있습니다.');
  const status = failed ? 'partial' : 'completed';
  await env.DB.prepare('UPDATE notion_imports SET status=?,total_items=?,imported_items=?,failed_items=?,completed_at=? WHERE id=?').bind(status, total, imported, failed, nowSeconds(), importId).run();
  await recordActivity(env.DB, actor, null, 'notion_imported', 'Notion ZIP에서 문서 ' + imported + '개를 가져왔습니다.');
  return json({ import_id: importId, status, total, imported, failed });
}

async function importNotionZip(request, env, actor) {
  requireRole(actor, MANAGE_ROLES, 'Owner와 Admin만 Notion 전체 가져오기를 실행할 수 있습니다.');
  if (!env.STORAGE || typeof env.STORAGE.put !== 'function') throw new HttpError(503, '스토리지 연결을 확인해 주세요.');
  let form;
  try { form = await request.formData(); } catch { throw new HttpError(400, 'ZIP 업로드 형식이 올바르지 않습니다.'); }
  const file = form.get('file');
  if (!file || typeof file.arrayBuffer !== 'function') throw new HttpError(400, 'Notion ZIP 파일을 선택해 주세요.');
  if (!/\.zip$/i.test(String(file.name || '')) || !file.size || file.size > NOTION_ZIP_MAX_BYTES) throw new HttpError(413, 'Notion ZIP은 50MB 이하의 .zip 파일이어야 합니다.');
  const archiveBytes = new Uint8Array(await file.arrayBuffer());
  const archiveHash = await sha256HexBytes(archiveBytes);
  const now = nowSeconds();
  let importRow = await env.DB.prepare('SELECT * FROM notion_imports WHERE project_id=? AND archive_sha256=?').bind(PROJECT_ID, archiveHash).first();
  if (importRow?.status === 'completed') return json({ import_id: importRow.id, imported: Number(importRow.imported_items), skipped: Number(importRow.total_items), failed: 0, idempotent: true });

  let entryCount = 0;
  let unpackedBytes = 0;
  let unpacked;
  try {
    unpacked = unzipSync(archiveBytes, { filter(info) {
      entryCount += 1;
      unpackedBytes += Number(info.originalSize || 0);
      if (entryCount > NOTION_MAX_ENTRIES) throw new HttpError(413, 'ZIP 항목은 최대 2,000개까지 가져올 수 있습니다.');
      if (Number(info.originalSize || 0) > NOTION_ENTRY_MAX_BYTES) throw new HttpError(413, 'ZIP 안의 개별 파일은 10MB 이하여야 합니다.');
      if (unpackedBytes > NOTION_UNZIPPED_MAX_BYTES) throw new HttpError(413, '압축을 푼 전체 크기는 100MB 이하여야 합니다.');
      return !String(info.name || '').endsWith('/') && !String(info.name || '').startsWith('__MACOSX/');
    } });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, '유효한 Notion ZIP 파일을 읽을 수 없습니다.');
  }

  const entries = new Map();
  let actualUnpackedBytes = 0;
  for (const [rawPath, bytes] of Object.entries(unpacked)) {
    const path = normalizeZipPath(rawPath);
    if (!path || /^(__MACOSX\/|\.DS_Store$)/i.test(path)) continue;
    actualUnpackedBytes += bytes.length;
    if (bytes.length > NOTION_ENTRY_MAX_BYTES || actualUnpackedBytes > NOTION_UNZIPPED_MAX_BYTES) throw new HttpError(413, 'ZIP의 실제 압축 해제 크기가 허용 한도를 넘었습니다.');
    if (entries.has(path)) throw new HttpError(400, 'ZIP에 중복된 파일 경로가 있습니다.');
    entries.set(path, bytes);
  }
  const documents = [...entries.keys()].filter(path => /\.(md|markdown|csv)$/i.test(path) && !/(^|\/)index\.(md|markdown)$/i.test(path));
  if (!documents.length) throw new HttpError(400, 'ZIP에서 Markdown 또는 CSV 문서를 찾지 못했습니다.');
  if (documents.length > NOTION_MAX_DOCUMENTS) throw new HttpError(413, '한 번에 최대 250개 문서를 가져올 수 있습니다.');
  documents.sort((left, right) => pathDepth(left) - pathDepth(right) || left.localeCompare(right, 'ko'));

  if (!importRow) {
    const id = 'nimp_' + randomString(24);
    await env.DB.prepare(`INSERT INTO notion_imports
      (id,project_id,archive_sha256,filename,status,total_items,imported_items,skipped_items,failed_items,created_by,created_at)
      VALUES (?,?,?,?, 'processing',0,0,0,0,?,?)`).bind(id, PROJECT_ID, archiveHash, safeImportName(file.name), actor.id, now).run();
    importRow = { id, imported_items: 0 };
  } else {
    await env.DB.prepare("UPDATE notion_imports SET status='processing',completed_at=NULL WHERE id=?").bind(importRow.id).run();
  }

  const previous = await env.DB.prepare('SELECT source_path,document_id,status FROM notion_import_items WHERE import_id=?').bind(importRow.id).all();
  const previousByPath = new Map((previous.results || []).map(item => [item.source_path, item]));
  const documentIdByKey = new Map();
  for (const path of documents) {
    const item = previousByPath.get(path);
    documentIdByKey.set(withoutExtension(path), item?.document_id || ('doc_' + randomString(24)));
  }
  const assetsByDocument = new Map();
  for (const path of entries.keys()) {
    if (/\.(md|markdown|csv)$/i.test(path) || /(^|\/)index\.html?$/i.test(path)) continue;
    const ownerKey = nearestDocumentKey(pathDirname(path), documentIdByKey);
    if (ownerKey) {
      const list = assetsByDocument.get(ownerKey) || [];
      list.push(path);
      assetsByDocument.set(ownerKey, list);
    }
  }

  let imported = 0;
  let skipped = 0;
  let failed = 0;
  const failures = [];
  const successfulKeys = new Set();
  for (const path of documents) {
    const key = withoutExtension(path);
    const previousItem = previousByPath.get(path);
    if (previousItem?.status === 'imported') {
      successfulKeys.add(key);
      skipped += 1;
      continue;
    }
    const parentKey = nearestDocumentKey(pathDirname(path), documentIdByKey);
    if (parentKey && !successfulKeys.has(parentKey)) {
      failed += 1;
      failures.push({ path, error: '상위 문서를 먼저 가져오지 못했습니다.' });
      await upsertNotionImportItem(env.DB, importRow.id, path, documentIdByKey.get(key), 'failed', '상위 문서를 먼저 가져오지 못했습니다.');
      continue;
    }
    const uploadedKeys = [];
    try {
      const documentId = documentIdByKey.get(key);
      const snapshotId = 'snap_' + randomString(24);
      const title = String(path || '').replace(/\.(md|markdown|csv)$/i, '').split('/').at(-1).replace(/\s+[0-9a-f]{32}$/i, '').replace(/_all$/i, '').normalize('NFKC').trim().slice(0, 160) || 'Notion 문서';
      const assetUrls = new Map();
      const fileRows = [];
      for (const assetPath of assetsByDocument.get(key) || []) {
        const contentType = importContentType(assetPath);
        if (!contentType) continue;
        const assetBytes = entries.get(assetPath);
        const fileId = 'fil_' + randomString(24);
        const storageKey = 'documents/' + documentId + '/' + fileId;
        await env.STORAGE.put(storageKey, assetBytes, { httpMetadata: { contentType } });
        uploadedKeys.push(storageKey);
        const filename = safeImportName(assetPath.split('/').at(-1));
        const url = new URL(request.url).origin + '/api/files/' + fileId;
        assetUrls.set(assetPath, { url, type: contentType.startsWith('image/') ? 'image' : contentType.startsWith('video/') ? 'video' : contentType.startsWith('audio/') ? 'audio' : 'file' });
        fileRows.push({ fileId, storageKey, filename, contentType, size: assetBytes.length });
      }

      let blocks;
      if (/\.csv$/i.test(path)) blocks = csvToDatabaseBlocks(decodeImportText(entries.get(path)), title);
      else {
        const markdown = rewriteNotionLinks(decodeImportText(entries.get(path)), path, documentIdByKey, assetUrls, new URL(request.url).origin);
        blocks = parseMarkdownBlocks(markdown).blocks;
      }
      const knownUrls = new Set(blocks.map(block => block.content));
      for (const asset of assetUrls.values()) if (!knownUrls.has(asset.url)) blocks.push({ type: asset.type, content: asset.url, checked: false });
      blocks = blocks.slice(0, 500);
      if (!blocks.length) blocks.push({ type: 'text', content: '', checked: false });
      const parentId = parentKey ? documentIdByKey.get(parentKey) : null;
      const createdAt = nowSeconds();
      const statements = [env.DB.prepare(`INSERT INTO documents
        (id,project_id,parent_document_id,title,title_search,status,version,active_snapshot_id,created_by,updated_by,created_at,updated_at)
        VALUES (?,?,?,?,?,'active',1,?,?,?,?,?)`).bind(documentId, PROJECT_ID, parentId, title, normalizeSearch(title), snapshotId, actor.id, actor.id, createdAt, createdAt)];
      blocks.forEach((block, index) => statements.push(env.DB.prepare(`INSERT INTO document_blocks
        (id,document_id,snapshot_id,block_type,content,position,checked,indent_level,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .bind('blk_' + randomString(24), documentId, snapshotId, block.type, String(block.content || '').slice(0, block.type === 'database' ? 100000 : 20000), index, block.checked ? 1 : 0, Number(block.indent_level || 0), createdAt, createdAt)));
      statements.push(env.DB.prepare('INSERT INTO document_access (document_id,project_id,visibility,updated_by,updated_at) VALUES (?,?,?,?,?)').bind(documentId, PROJECT_ID, 'workspace', actor.id, createdAt));
      statements.push(env.DB.prepare('INSERT INTO document_versions (id,project_id,document_id,version,snapshot_id,title,created_by,created_at) VALUES (?,?,?,?,?,?,?,?)').bind('ver_' + randomString(24), PROJECT_ID, documentId, 1, snapshotId, title, actor.id, createdAt));
      for (const row of fileRows) statements.push(env.DB.prepare(`INSERT INTO file_uploads
        (id,project_id,document_id,storage_key,filename,content_type,size,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?)`)
        .bind(row.fileId, PROJECT_ID, documentId, row.storageKey, row.filename, row.contentType, row.size, actor.id, createdAt));
      statements.push(env.DB.prepare(`INSERT INTO notion_import_items (import_id,source_path,document_id,status,error,updated_at)
        VALUES (?,?,?,'imported',NULL,?) ON CONFLICT(import_id,source_path) DO UPDATE SET document_id=excluded.document_id,status='imported',error=NULL,updated_at=excluded.updated_at`)
        .bind(importRow.id, path, documentId, createdAt));
      await env.DB.batch(statements);
      successfulKeys.add(key);
      imported += 1;
    } catch (error) {
      for (const storageKey of uploadedKeys) await env.STORAGE.delete(storageKey).catch(() => {});
      failed += 1;
      const message = safeImportError(error);
      if (failures.length < 20) failures.push({ path, error: message });
      await upsertNotionImportItem(env.DB, importRow.id, path, documentIdByKey.get(key), 'failed', message);
    }
  }
  const total = documents.length;
  const status = failed ? 'partial' : 'completed';
  await env.DB.prepare(`UPDATE notion_imports SET status=?,total_items=?,imported_items=imported_items+?,skipped_items=skipped_items+?,failed_items=?,completed_at=? WHERE id=?`)
    .bind(status, total, imported, skipped, failed, nowSeconds(), importRow.id).run();
  await recordActivity(env.DB, actor, null, 'notion_imported', 'Notion ZIP에서 문서 ' + imported + '개를 가져왔습니다.');
  return json({ import_id: importRow.id, status, total, imported, skipped, failed, failures, idempotent: false }, failed ? 207 : 201);
}

function normalizeZipPath(value) {
  const path = String(value || '').replace(/\\/g, '/').normalize('NFKC').replace(/^\.\//, '');
  if (!path || path.startsWith('/') || path.includes('\0')) return '';
  const parts = path.split('/').filter(part => part && part !== '.');
  if (!parts.length || parts.some(part => part === '..')) throw new HttpError(400, 'ZIP에 안전하지 않은 파일 경로가 있습니다.');
  return parts.join('/');
}

function pathDirname(path) { const index = path.lastIndexOf('/'); return index < 0 ? '' : path.slice(0, index); }
function withoutExtension(path) { return path.replace(/\.(md|markdown|csv)$/i, ''); }
function pathDepth(path) { return path.split('/').length; }
function nearestDocumentKey(directory, documentIdByKey) {
  let current = directory;
  while (current) {
    if (documentIdByKey.has(current)) return current;
    current = pathDirname(current);
  }
  return null;
}

function notionTitle(path) {
  return withoutExtension(path).split('/').at(-1).replace(/\s+[0-9a-f]{32}$/i, '').normalize('NFKC').trim().slice(0, 160) || 'Notion 문서';
}
function notionSourcePageId(path) { const match = withoutExtension(path).match(/(?:^|\s)([0-9a-f]{32})(?:_all)?$/i); return match ? match[1].toLowerCase() : null; }
function notionSourceKey(path) { return String(path || '').split('/').map(part => part.normalize('NFKC').trim()).filter(Boolean).join('/'); }

function safeImportName(value) { return String(value || 'file').normalize('NFKC').replace(/[\\/\u0000-\u001f]/g, '_').slice(0, 180); }
function decodeImportText(bytes) { return new TextDecoder('utf-8', { fatal: false }).decode(bytes).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n'); }
function safeImportError(error) { return String(error instanceof HttpError ? error.message : '가져오기 처리 중 오류가 발생했습니다.').slice(0, 300); }

function normalizedNotionId(value) {
  const id = String(value || '').replaceAll('-', '').toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(id)) throw new HttpError(400, 'Notion 항목 ID가 올바르지 않습니다.');
  return id;
}

function notionDocumentId(value, database = false) {
  return (database ? 'doc_notiondb_' : 'doc_notion_') + normalizedNotionId(value);
}

async function notionApiRequest(env, path, options = {}, attempt = 0) {
  if (!env.NOTION_API_TOKEN) throw new HttpError(409, 'NOTION_API_TOKEN Secret이 등록되지 않았습니다.');
  const response = await fetch('https://api.notion.com/v1' + path, {
    ...options,
    headers: {
      authorization: 'Bearer ' + env.NOTION_API_TOKEN,
      'notion-version': '2026-03-11',
      'content-type': 'application/json',
      ...(options.headers || {})
    }
  });
  if ((response.status === 429 || response.status >= 500) && attempt < 5) {
    const retryAfter = Math.min(6, Math.max(1, Number(response.headers.get('retry-after')) || attempt + 1));
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    return notionApiRequest(env, path, options, attempt + 1);
  }
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) throw new HttpError(response.status === 401 ? 409 : response.status, data.message || 'Notion API 요청에 실패했습니다.');
  return data;
}

function notionRichText(value) {
  return (Array.isArray(value) ? value : []).map(item => String(item?.plain_text ?? item?.text?.content ?? '')).join('');
}

function notionPageTitle(page) {
  const title = Object.values(page?.properties || {}).find(property => property?.type === 'title');
  return notionRichText(title?.title).normalize('NFKC').trim().slice(0, 160) || '제목 없음';
}

function notionPageIconMeta(icon) {
  if (!icon || typeof icon !== 'object') return {};
  if (icon.type === 'emoji' && icon.emoji) return { emoji: String(icon.emoji).slice(0, 32) };
  const value = icon.external?.url || icon.file?.url || icon.custom_emoji?.url || '';
  if (!/^https?:\/\/[^\s<>'"]+$/i.test(String(value))) return {};
  try { return { url: new URL(value).href }; } catch { return {}; }
}

function notionPersonText(user, directory = new Map()) {
  if (!user || typeof user !== 'object') return '';
  const saved = directory.get(normalizedNotionId(user.id)) || {};
  const name = String(user.name || saved.name || '').trim();
  const email = String(user.person?.email || saved.email || '').trim();
  if (name && email) return name + ' <' + email + '>';
  return name || email || '사용자 정보 권한 필요';
}

function notionPropertyText(property, directory = new Map()) {
  if (!property || typeof property !== 'object') return '';
  const value = property[property.type];
  if (property.type === 'title' || property.type === 'rich_text') return notionRichText(value);
  if (property.type === 'number') return value == null ? '' : String(value);
  if (property.type === 'select' || property.type === 'status') return String(value?.name || '');
  if (property.type === 'multi_select') return (value || []).map(item => item.name).join(', ');
  if (property.type === 'date') return value ? String(value.start || '') + (value.end ? ' → ' + value.end : '') : '';
  if (property.type === 'people' || property.type === 'created_by' || property.type === 'last_edited_by') return (Array.isArray(value) ? value : [value]).filter(Boolean).map(item => notionPersonText(item, directory)).join(', ');
  if (property.type === 'files') return (value || []).map(item => item.name || item.file?.url || item.external?.url || '').filter(Boolean).join(', ');
  if (property.type === 'checkbox') return value ? 'true' : 'false';
  if (['url', 'email', 'phone_number', 'created_time', 'last_edited_time'].includes(property.type)) return String(value || '');
  if (property.type === 'relation') return (value || []).map(item => item.id).join(', ');
  if (property.type === 'formula') return notionPropertyText({ type: value?.type, [value?.type]: value?.[value?.type] }, directory);
  if (property.type === 'unique_id') return String(value?.prefix || '') + String(value?.number ?? '');
  if (property.type === 'rollup') {
    if (value?.type === 'array') return (value.array || []).map(item => notionPropertyText(item, directory)).join(', ');
    return String(value?.[value?.type] ?? '');
  }
  try { return JSON.stringify(value ?? '').slice(0, 500); } catch { return ''; }
}

async function loadNotionPeopleDirectory(env) {
  const result = await env.DB.prepare('SELECT notion_user_id,name,email_ciphertext,email_nonce FROM notion_people WHERE project_id=?').bind(PROJECT_ID).all();
  const directory = new Map();
  for (const row of result.results || []) {
    let email = '';
    if (row.email_ciphertext && row.email_nonce) try { email = await decryptEmail(env, row.email_ciphertext, row.email_nonce); } catch {}
    directory.set(normalizedNotionId(row.notion_user_id), { name: String(row.name || ''), email });
  }
  return directory;
}

async function syncNotionPeople(env, actor) {
  requireRole(actor, MANAGE_ROLES);
  const users = [];
  let cursor = null;
  do {
    const query = new URLSearchParams({ page_size: '100' });
    if (cursor) query.set('start_cursor', cursor);
    const page = await notionApiRequest(env, '/users?' + query);
    users.push(...(page.results || []));
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor && users.length < 5000);
  const now = nowSeconds();
  const seen = new Set();
  let people = 0, emails = 0;
  for (let offset = 0; offset < users.length; offset += 100) {
    const statements = [];
    for (const user of users.slice(offset, offset + 100)) {
      const id = normalizedNotionId(user.id);
      if (!id) continue;
      seen.add(id);
      const type = ['person', 'bot'].includes(user.type) ? user.type : 'unknown';
      if (type === 'person') people += 1;
      let email = '';
      try { if (user.person?.email) email = normalizeEmail(user.person.email); } catch {}
      if (email) emails += 1;
      const encrypted = email ? await encryptEmail(env, email) : { ciphertext: null, nonce: null };
      const blind = email ? await emailBlindIndex(env, email) : null;
      statements.push(env.DB.prepare(`INSERT INTO notion_people
        (project_id,notion_user_id,user_type,name,avatar_url,email_ciphertext,email_nonce,email_blind_index,last_seen_at,synced_at)
        VALUES (?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(project_id,notion_user_id) DO UPDATE SET user_type=excluded.user_type,name=excluded.name,avatar_url=excluded.avatar_url,email_ciphertext=excluded.email_ciphertext,email_nonce=excluded.email_nonce,email_blind_index=excluded.email_blind_index,last_seen_at=excluded.last_seen_at,synced_at=excluded.synced_at`)
        .bind(PROJECT_ID, id, type, String(user.name || '').slice(0, 160) || null, String(user.avatar_url || '').slice(0, 1000) || null, encrypted.ciphertext, encrypted.nonce, blind, now, now));
    }
    if (statements.length) await env.DB.batch(statements);
  }
  const existing = await env.DB.prepare('SELECT notion_user_id FROM notion_people WHERE project_id=?').bind(PROJECT_ID).all();
  const stale = (existing.results || []).filter(row => !seen.has(String(row.notion_user_id)));
  for (let offset = 0; offset < stale.length; offset += 100) await env.DB.batch(stale.slice(offset, offset + 100).map(row => env.DB.prepare('DELETE FROM notion_people WHERE project_id=? AND notion_user_id=?').bind(PROJECT_ID, row.notion_user_id)));
  return json({ users: users.length, people, bots: users.length - people, emails, missing_emails: Math.max(0, people - emails), email_complete: people === emails });
}

function notionPropertyColumn(name, property, index) {
  const sourceType = String(property?.type || 'rich_text');
  const type = ['title', 'rich_text'].includes(sourceType) ? 'text' : sourceType === 'number' ? 'number' : sourceType === 'date' ? 'date' : sourceType === 'people' ? 'people' : sourceType === 'url' ? 'url' : ['select', 'multi_select', 'status'].includes(sourceType) ? sourceType : ['checkbox', 'email', 'phone_number', 'files', 'relation', 'rollup', 'formula', 'unique_id', 'created_time', 'last_edited_time', 'created_by', 'last_edited_by'].includes(sourceType) ? sourceType : 'text';
  let options = [];
  if (sourceType === 'select' || sourceType === 'multi_select') options = property[sourceType]?.options?.map(item => item.name) || [];
  if (sourceType === 'status') options = property.status?.options?.map(item => item.name) || [];
  return { id: 'col_' + index, sourceId: property?.id, sourceType, name: String(name).slice(0, 80), type, options: [...new Set(options)].slice(0, 100) };
}

function normalizeNotionView(view, index, dataSourceId) {
  const configuration = view?.configuration && typeof view.configuration === 'object' ? view.configuration : {};
  const type = String(view?.type || view?.view_type || configuration.type || 'table').toLowerCase();
  return {
    id: String(view?.id || 'view_' + index),
    name: String(view?.name || view?.title || type).slice(0, 120),
    type,
    order: index,
    is_default: !!(view?.is_default || view?.default),
    data_source_id: dataSourceId,
    filter: view?.filter ?? configuration.filter ?? null,
    sorts: Array.isArray(view?.sorts) ? view.sorts : Array.isArray(configuration.sorts) ? configuration.sorts : [],
    quick_filters: Array.isArray(view?.quick_filters) ? view.quick_filters : Array.isArray(configuration.quick_filters) ? configuration.quick_filters : [],
    configuration
  };
}

async function listNotionApiViews(env, dataSourceId) {
  const refs = [];
  let cursor = null;
  do {
    const query = new URLSearchParams({ data_source_id: dataSourceId });
    if (cursor) query.set('start_cursor', cursor);
    const page = await notionApiRequest(env, '/views?' + query.toString());
    refs.push(...(Array.isArray(page.results) ? page.results : []));
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor && refs.length < 100);
  const views = [];
  for (let index = 0; index < refs.length; index += 1) {
    const ref = refs[index];
    let detail = ref;
    if (ref?.id) {
      try { detail = await notionApiRequest(env, '/views/' + normalizedNotionId(ref.id)); } catch (error) {
        // Notion can list newer/unsupported view kinds (for example `feed`) but
        // reject their detail endpoint. Keep the list response so importing the
        // data source and its rows still succeeds; the original type is retained
        // for the fidelity audit and is rendered as a safe table fallback.
        const unsupported = error instanceof HttpError && error.status === 400 && /unsupported view type/i.test(String(error.message || ''));
        if (!(error instanceof HttpError) || (![403, 404].includes(error.status) && !unsupported)) throw error;
        detail = ref;
      }
    }
    views.push(normalizeNotionView({ ...ref, ...detail }, index, dataSourceId));
  }
  return views;
}

function notionViewPropertyId(view, key) {
  const value = view?.configuration?.[key] ?? view?.[key];
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return String(value.property_id || value.propertyId || value.id || '');
  return '';
}

async function persistNotionMarkdownFiles(env, markdown, pageId, origin) {
  if (!env.STORAGE || !markdown) return { markdown, files: [] };
  const candidates = [...new Set([...markdown.matchAll(/https:\/\/[^\s)"'<>]+/g)].map(match => match[0].replaceAll('&amp;', '&')))];
  const urls = candidates.filter(value => { try { const host = new URL(value).hostname; return /(?:notion-static\.com|notionusercontent\.com|amazonaws\.com)$/.test(host); } catch { return false; } }).slice(0, 50);
  const files = [];
  let rewritten = markdown;
  const download = async index => {
    const url = urls[index];
    const response = await fetch(url);
    if (!response.ok) return null;
    const size = Number(response.headers.get('content-length')) || 0;
    if (size > NOTION_DOCUMENT_MAX_BYTES) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > NOTION_DOCUMENT_MAX_BYTES) return null;
    const fileId = 'fil_notion_' + normalizedNotionId(pageId).slice(0, 20) + '_' + String(index).padStart(2, '0');
    const storageKey = 'documents/' + notionDocumentId(pageId) + '/' + fileId;
    const contentType = String(response.headers.get('content-type') || 'application/octet-stream').split(';')[0];
    let filename = 'notion-file-' + (index + 1);
    try { filename = decodeURIComponent(new URL(url).pathname.split('/').at(-1) || filename).slice(0, 180); } catch {}
    await env.STORAGE.put(storageKey, bytes);
    const localUrl = origin + '/api/files/' + fileId;
    return { url, localUrl, file: { id: fileId, storageKey, filename: safeImportName(filename), contentType, size: bytes.length } };
  };
  for (let offset = 0; offset < urls.length; offset += 4) {
    const downloaded = await Promise.all(urls.slice(offset, offset + 4).map((_url, index) => download(offset + index)));
    for (const item of downloaded.filter(Boolean)) {
      rewritten = rewritten.split(item.url).join(item.localUrl).split(item.url.replaceAll('&', '&amp;')).join(item.localUrl);
      files.push(item.file);
    }
  }
  return { markdown: rewritten, files };
}

async function upsertNotionApiDocument(env, actor, { sourceId, parentSourceId, title, blocks, files = [], database = false, pageIcon = {} }) {
  const normalizedSourceId = normalizedNotionId(sourceId);
  const existing = await env.DB.prepare('SELECT id,version FROM documents WHERE project_id=? AND source_page_id=?').bind(PROJECT_ID, normalizedSourceId).first();
  const documentId = existing?.id || notionDocumentId(sourceId, database);
  let parentDocumentId = null;
  if (parentSourceId) parentDocumentId = (await env.DB.prepare("SELECT id FROM documents WHERE project_id=? AND source_page_id=? AND status='active'").bind(PROJECT_ID, normalizedNotionId(parentSourceId)).first())?.id || null;
  const version = existing ? Number(existing.version) + 1 : 1;
  const snapshotId = 'snap_' + randomString(24);
  const createdAt = nowSeconds();
  const sourcePath = 'notion-api/' + normalizedSourceId + '/' + (parentSourceId ? normalizedNotionId(parentSourceId) : 'root');
  const normalizedBlocks = (blocks.length ? blocks : [{ type: 'text', content: '', checked: false }]).slice(0, 500);
  const iconEmoji = String(pageIcon?.emoji || '').trim().slice(0, 32) || null;
  const iconUrl = String(pageIcon?.url || '').trim().slice(0, 2000) || null;
  const statements = existing
    ? [env.DB.prepare(`UPDATE documents SET parent_document_id=?,title=?,title_search=?,status='active',version=?,active_snapshot_id=?,updated_by=?,updated_at=?,source_path=?,import_transform_version=?,page_icon_emoji=?,page_icon_url=? WHERE id=? AND project_id=?`).bind(parentDocumentId, title, normalizeSearch(title), version, snapshotId, actor.id, createdAt, sourcePath, 3, iconEmoji, iconUrl, documentId, PROJECT_ID)]
    : [env.DB.prepare(`INSERT INTO documents (id,project_id,parent_document_id,title,title_search,status,version,active_snapshot_id,created_by,updated_by,created_at,updated_at,source_page_id,source_path,import_transform_version,page_icon_emoji,page_icon_url) VALUES (?,?,?,?,?,'active',1,?,?,?,?,?,?,?, ?,?,?)`).bind(documentId, PROJECT_ID, parentDocumentId, title, normalizeSearch(title), snapshotId, actor.id, actor.id, createdAt, createdAt, normalizedSourceId, sourcePath, 3, iconEmoji, iconUrl)];
  normalizedBlocks.forEach((block, index) => statements.push(env.DB.prepare(`INSERT INTO document_blocks (id,document_id,snapshot_id,block_type,content,position,checked,indent_level,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`).bind('blk_' + randomString(24), documentId, snapshotId, BLOCK_TYPES.has(block.type) ? block.type : 'text', String(block.content || '').slice(0, block.type === 'database' ? 100000 : 20000), index, block.checked ? 1 : 0, Number(block.indent_level || 0), createdAt, createdAt)));
  if (!existing) statements.push(env.DB.prepare('INSERT INTO document_access (document_id,project_id,visibility,updated_by,updated_at) VALUES (?,?,?,?,?)').bind(documentId, PROJECT_ID, 'workspace', actor.id, createdAt));
  statements.push(env.DB.prepare('INSERT INTO document_versions (id,project_id,document_id,version,snapshot_id,title,created_by,created_at) VALUES (?,?,?,?,?,?,?,?)').bind('ver_' + randomString(24), PROJECT_ID, documentId, version, snapshotId, title, actor.id, createdAt));
  for (const file of files) statements.push(env.DB.prepare(`INSERT INTO file_uploads (id,project_id,document_id,storage_key,filename,content_type,size,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET document_id=excluded.document_id,storage_key=excluded.storage_key,filename=excluded.filename,content_type=excluded.content_type,size=excluded.size`).bind(file.id, PROJECT_ID, documentId, file.storageKey, file.filename, file.contentType, file.size, actor.id, createdAt));
  await env.DB.batch(statements);
  return documentId;
}

async function notionApiStatus(env, actor) {
  requireRole(actor, MANAGE_ROLES);
  return json({ configured: !!env.NOTION_API_TOKEN });
}

async function auditNotionApi(request, env, actor) {
  requireRole(actor, MANAGE_ROLES);
  const url = new URL(request.url);
  const deep = url.searchParams.get('deep') === '1';
  const sources = new Map();
  let cursor = null;
  do {
    const payload = { page_size: 100, sort: { direction: 'ascending', timestamp: 'last_edited_time' } };
    if (cursor) payload.start_cursor = cursor;
    const page = await notionApiRequest(env, '/search', { method: 'POST', body: JSON.stringify(payload) });
    for (const item of page.results || []) {
      if (item.object === 'data_source') sources.set(normalizedNotionId(item.id), item);
      if (item.object === 'database') for (const source of item.data_sources || []) sources.set(normalizedNotionId(source.id), source);
    }
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor && sources.size < 500);
  const rows = [];
  const sourceIds = [...sources.keys()];
  let sourceOffset = 0;
  async function auditSourceWorker() {
    while (sourceOffset < sourceIds.length) {
      const sourceId = sourceIds[sourceOffset++];
    const source = await notionApiRequest(env, '/data_sources/' + sourceId);
    const views = await listNotionApiViews(env, sourceId).catch(() => []);
    let remoteRows = 0;
    const remoteRowIds = [];
    let pageCursor = null;
    do {
      const payload = { page_size: 100 };
      if (pageCursor) payload.start_cursor = pageCursor;
      const result = await notionApiRequest(env, '/data_sources/' + sourceId + '/query', { method: 'POST', body: JSON.stringify(payload) });
      remoteRows += (result.results || []).length;
      for (const row of result.results || []) {
        const id = normalizedNotionId(row?.id);
        if (id) remoteRowIds.push(id);
      }
      pageCursor = result.has_more ? result.next_cursor : null;
    } while (deep && pageCursor && remoteRows < 10000);
    const database = await env.DB.prepare("SELECT id,title FROM documents WHERE project_id=? AND source_page_id=? AND source_path LIKE 'notion-api/%' AND status='active' LIMIT 1").bind(PROJECT_ID, sourceId).first();
    let importedRows = 0;
    const importedRowIds = [];
    let localVersion = null;
    let localColumns = [];
    let localViews = [];
    if (database) {
      // Only the active snapshot represents the current imported database. Older
      // snapshots remain available through document history, but must not inflate
      // the fidelity audit's imported-row count on every incremental re-import.
      const blocks = await env.DB.prepare("SELECT b.content FROM document_blocks b JOIN documents d ON d.id=b.document_id AND d.active_snapshot_id=b.snapshot_id WHERE b.document_id=? AND b.block_type='database'").bind(database.id).all();
      for (const block of blocks.results || []) {
        try {
          const model = JSON.parse(block.content);
          const modelRows = Array.isArray(model.rows) ? model.rows : [];
          importedRows += modelRows.length;
          for (const row of modelRows) {
            const id = normalizedNotionId(row?.source_id || row?.sourceId);
            if (id) importedRowIds.push(id);
          }
          localVersion = Math.max(Number(localVersion || 0), Number(model.version || 0));
          localColumns = model.columns || localColumns;
          localViews = model.views || localViews;
        } catch {}
      }
    }
    const missing = remoteRows - importedRows;
    const findings = [];
    if (!database) findings.push({ severity: 'FAIL', code: 'missing_database', message: 'JoripNote 데이터베이스 문서가 없습니다.' });
    else if (missing > 0) findings.push({ severity: 'FAIL', code: 'row_gap', message: '원본 행 ' + remoteRows + '개 중 ' + importedRows + '개만 저장되었습니다.' });
    if (!views.length) findings.push({ severity: 'WARN', code: 'views_unavailable', message: 'Notion 뷰 API에서 뷰를 읽지 못했습니다.' });
    if (views.length && !localViews.length) findings.push({ severity: 'FAIL', code: 'views_not_saved', message: '원본 뷰 구성이 저장되지 않았습니다.' });
    if (localColumns.length >= DATABASE_MAX_COLUMNS) findings.push({ severity: 'WARN', code: 'column_limit', message: '속성 상한에 도달했습니다.' });
    if (!findings.length) findings.push({ severity: 'PASS', code: 'ok', message: '행과 뷰 구성이 일치합니다.' });
    const importedIdSet = new Set(importedRowIds);
    const missingRowIds = [...new Set(remoteRowIds.filter(id => !importedIdSet.has(id)))];
    const duplicateImportedRowIds = [...new Set(importedRowIds.filter((id, index) => importedRowIds.indexOf(id) !== index))];
      rows.push({ data_source_id: sourceId, title: notionRichText(source.title) || database?.title || 'Notion 데이터베이스', remote_rows: remoteRows, imported_rows: importedRows, missing_row_ids: missingRowIds.slice(0, 100), duplicate_imported_row_ids: duplicateImportedRowIds.slice(0, 100), property_count: Object.keys(source.properties || {}).length, imported_property_count: localColumns.length, views: views.map(view => ({ id: view.id, name: view.name, type: view.type, order: view.order })), imported_views: localViews.map(view => ({ id: view.id, name: view.name, type: view.type, order: view.order })), local_version: localVersion, findings });
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, sourceIds.length || 1) }, () => auditSourceWorker()));
  const totals = { data_sources: rows.length, remote_rows: rows.reduce((sum, row) => sum + row.remote_rows, 0), imported_rows: rows.reduce((sum, row) => sum + row.imported_rows, 0), pass: rows.filter(row => row.findings.every(item => item.severity === 'PASS')).length, warn: rows.filter(row => row.findings.some(item => item.severity === 'WARN')).length, fail: rows.filter(row => row.findings.some(item => item.severity === 'FAIL')).length };
  return json({ generated_at: new Date().toISOString(), deep, totals, data_sources: rows });
}

function collectImportedLinkCandidates(value) {
  const source = String(value || '').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&amp;', '&');
  const candidates = [];
  const add = (url, kind, index) => {
    const href = String(url || '').trim();
    if (!href) return;
    candidates.push({ url: href, kind, index: Number(index || 0) });
  };
  const masked = source.replace(/<(?:page|mention-page|unknown)\b[^>]*\burl\s*=\s*(["'])(.*?)\1[^>]*>(?:[\s\S]*?<\/page>)?\s*/gi, (full, _quote, href, offset) => {
    add(href, 'notion_tag', offset);
    return ' '.repeat(full.length);
  }).replace(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>[\s\S]*?<\/a>/gi, (full, _quote, href, offset) => {
    add(href, 'html_anchor', offset);
    return ' '.repeat(full.length);
  }).replace(/!?\[[^\]\r\n]+\]\(([^)\s]+)\)/gi, (full, href, offset) => {
    add(href, 'markdown_link', offset);
    return ' '.repeat(full.length);
  });
  for (const match of masked.matchAll(/\/doc\/doc_(?:notion|notiondb)_[A-Za-z0-9_-]{8,80}/gi)) add(match[0], 'local_anchor', match.index);
  for (const match of masked.matchAll(/\bhttps?:\/\/[^\s<>&"']+/gi)) add(match[0].replace(/[),.;!?]+$/g, ''), 'bare_http', match.index);
  for (const match of source.matchAll(/\b(?:javascript|data|file|mailto|tel):[^\s<>&"']+/gi)) add(match[0], 'unsupported_scheme', match.index);
  return candidates;
}

function auditLinkTarget(rawUrl, existingDocumentIds, existingSourceIds) {
  const url = String(rawUrl || '').trim();
  const local = url.match(/^\/doc\/(doc_[A-Za-z0-9_-]{8,80})/i);
  if (local) return { category: 'internal_local', resolved: existingDocumentIds.has(local[1]) };
  const protocol = url.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase() || '';
  if (protocol && !['http', 'https'].includes(protocol)) return { category: 'unsupported_scheme', resolved: false };
  if (!protocol) return { category: 'unresolved', resolved: false };
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const notionHost = host === 'app.notion.com' || host === 'notion.so' || host === 'www.notion.so' || host === 'notion.site' || host === 'www.notion.site' || host.endsWith('.notion.so') || host.endsWith('.notion.site');
    if (notionHost) {
      const notionId = notionPageIdFromUrl(url);
      if (!notionId) return { category: 'unresolved_notion', resolved: false };
      return { category: 'internal_notion', resolved: existingSourceIds.has(notionId) };
    }
    return { category: 'external_http', resolved: true };
  } catch {
    return { category: 'unresolved', resolved: false };
  }
}

async function auditImportedLinks(env, actor) {
  requireRole(actor, MANAGE_ROLES);
  const [documents, blocks] = await Promise.all([
    env.DB.prepare("SELECT id,source_page_id FROM documents WHERE project_id=? AND status='active'").bind(PROJECT_ID).all(),
    env.DB.prepare(`SELECT d.id AS document_id,d.title,b.block_type,b.content
      FROM documents d JOIN document_blocks b ON d.id=b.document_id AND d.active_snapshot_id=b.snapshot_id
      WHERE d.project_id=? AND d.status='active' ORDER BY d.updated_at DESC,b.position ASC LIMIT 200000`).bind(PROJECT_ID).all()
  ]);
  const existingDocumentIds = new Set((documents.results || []).map(row => String(row.id || '')));
  const existingSourceIds = new Set((documents.results || []).map(row => {
    try { return normalizedNotionId(row.source_page_id); } catch { return ''; }
  }).filter(Boolean));
  const byDocument = new Map();
  const totals = { links: 0, internal_notion: 0, internal_local: 0, external_http: 0, unsupported_scheme: 0, unresolved_notion: 0, unresolved: 0, missing_targets: 0 };
  const samples = [];
  for (const row of blocks.results || []) {
    const candidates = collectImportedLinkCandidates(row.content);
    if (!candidates.length) continue;
    const entry = byDocument.get(row.document_id) || { document_id: row.document_id, title: String(row.title || ''), links: 0, missing_targets: 0, unsupported: 0 };
    for (const candidate of candidates) {
      const result = auditLinkTarget(candidate.url, existingDocumentIds, existingSourceIds);
      totals.links += 1;
      totals[result.category] = Number(totals[result.category] || 0) + 1;
      if (!result.resolved && ['internal_notion', 'internal_local'].includes(result.category)) totals.missing_targets += 1;
      entry.links += 1;
      if (!result.resolved && ['internal_notion', 'internal_local'].includes(result.category)) entry.missing_targets += 1;
      if (result.category === 'unsupported_scheme') entry.unsupported += 1;
      if (samples.length < 100 && (!result.resolved || result.category === 'unsupported_scheme')) {
        let host = '';
        try { host = new URL(candidate.url).hostname.toLowerCase(); } catch {}
        samples.push({ document_id: row.document_id, title: String(row.title || '').slice(0, 120), block_type: row.block_type, kind: candidate.kind, category: result.category, host });
      }
    }
    byDocument.set(row.document_id, entry);
  }
  const truncated = (blocks.results || []).length >= 200000;
  const findings = [];
  if (truncated) findings.push({ severity: 'WARN', code: 'block_scan_limit', message: '블록 200,000개 상한에 도달해 전체 스캔이 아닙니다.' });
  if (totals.missing_targets) findings.push({ severity: 'WARN', code: 'missing_targets', message: '가져오지 않은 Notion/JoripNote 대상 링크가 ' + totals.missing_targets + '개 있습니다.' });
  if (totals.unsupported_scheme) findings.push({ severity: 'WARN', code: 'unsupported_scheme', message: '보안 정책상 렌더링하지 않는 스킴 링크가 ' + totals.unsupported_scheme + '개 있습니다.' });
  if (totals.unresolved_notion || totals.unresolved) findings.push({ severity: 'WARN', code: 'unresolved_links', message: '주소를 내부 문서 또는 안전한 HTTP 링크로 해석하지 못한 링크가 ' + (totals.unresolved_notion + totals.unresolved) + '개 있습니다.' });
  if (!findings.length) findings.push({ severity: 'PASS', code: 'ok', message: '활성 문서의 링크 후보가 모두 렌더링 가능한 대상으로 해석됩니다.' });
  return json({ generated_at: new Date().toISOString(), read_only: true, truncated, scope: { documents: (documents.results || []).length, blocks: (blocks.results || []).length, documents_with_links: byDocument.size }, totals, findings, samples, documents: [...byDocument.values()].filter(item => item.missing_targets || item.unsupported).slice(0, 100) });
}

async function searchNotionApi(request, env, actor) {
  requireRole(actor, MANAGE_ROLES);
  const body = await readJson(request);
  const payload = { page_size: 100, sort: { direction: 'ascending', timestamp: 'last_edited_time' } };
  if (body.cursor) payload.start_cursor = String(body.cursor).slice(0, 200);
  const data = await notionApiRequest(env, '/search', { method: 'POST', body: JSON.stringify(payload) });
  const items = [];
  for (const item of data.results || []) {
    if (item.object === 'page' || item.object === 'data_source') items.push({ id: item.id, object: item.object });
    if (item.object === 'database') for (const source of item.data_sources || []) items.push({ id: source.id, object: 'data_source' });
  }
  const existing = await env.DB.prepare("SELECT source_page_id FROM documents WHERE project_id=? AND status='active' AND source_path LIKE 'notion-api/%' AND source_page_id IS NOT NULL").bind(PROJECT_ID).all();
  const importedIds = new Set((existing.results || []).map(row => String(row.source_page_id)));
  for (const item of items) item.imported = importedIds.has(normalizedNotionId(item.id));
  return json({ items, next_cursor: data.has_more ? data.next_cursor : null });
}

async function missingLinkedNotionItems(env, actor) {
  requireRole(actor, MANAGE_ROLES);
  const [links, existing] = await Promise.all([
    env.DB.prepare(`SELECT b.content FROM document_blocks b
      JOIN documents d ON d.id=b.document_id AND d.active_snapshot_id=b.snapshot_id
      WHERE d.project_id=? AND d.status='active' AND b.block_type='page_link'
      ORDER BY d.updated_at DESC,b.position ASC LIMIT 10000`).bind(PROJECT_ID).all(),
    env.DB.prepare("SELECT id FROM documents WHERE project_id=? AND status='active' AND source_path LIKE 'notion-api/%'").bind(PROJECT_ID).all()
  ]);
  const existingIds = new Set((existing.results || []).map(row => String(row.id)));
  const items = new Map();
  for (const row of links.results || []) {
    let value;
    try { value = JSON.parse(String(row.content || '')); } catch { continue; }
    const explicitId = String(value?.document_id || '');
    const notionId = explicitId
      ? normalizedNotionId(explicitId.replace(/^doc_notion(?:db)?_/i, ''))
      : notionPageIdFromUrl(value?.url);
    if (!notionId) continue;
    const object = explicitId.startsWith('doc_notiondb_') ? 'data_source' : 'page';
    const documentId = (object === 'data_source' ? 'doc_notiondb_' : 'doc_notion_') + notionId;
    if (!existingIds.has(documentId)) items.set(object + ':' + notionId, { id: notionId, object, imported: false });
    if (items.size >= 500) break;
  }
  return json({ items: [...items.values()] });
}

async function importNotionApiPage(request, env, actor, rawPageId) {
  requireRole(actor, MANAGE_ROLES);
  const pageId = normalizedNotionId(rawPageId);
  const peopleDirectory = await loadNotionPeopleDirectory(env);
  const page = await notionApiRequest(env, '/pages/' + pageId);
  const markdownResult = await notionApiRequest(env, '/pages/' + pageId + '/markdown');
  let markdown = String(markdownResult.markdown || '');
  markdown = await resolveNotionMarkdownPageMentions(env, markdown);
  const media = [page.icon, page.cover, ...Object.values(page.properties || {}).filter(property => property?.type === 'files').flatMap(property => property.files || [])].filter(Boolean);
  for (const item of media) { const url = item.file?.url || item.external?.url; if (url) markdown += '\n\n[' + String(item.name || 'Notion 파일').replace(/[\[\]]/g, '') + '](' + url + ')'; }
  const persisted = await persistNotionMarkdownFiles(env, markdown, pageId, new URL(request.url).origin);
  const parsed = parseMarkdownBlocks(persisted.markdown);
  const propertyRows = Object.entries(page.properties || {}).filter(([, property]) => property?.type !== 'title').map(([name, property]) => [name, notionPropertyText(property, peopleDirectory)]);
  const blocks = [];
  for (let offset = 0; offset < propertyRows.length; offset += 25) blocks.push({ type: 'table', content: JSON.stringify([['속성', '값'], ...propertyRows.slice(offset, offset + 25)]), checked: false });
  blocks.push(...parsed.blocks);
  const parentSourceId = page.parent?.page_id || page.parent?.data_source_id || page.parent?.database_id || null;
  const documentId = await upsertNotionApiDocument(env, actor, { sourceId: pageId, parentSourceId, title: notionPageTitle(page), blocks, files: persisted.files, pageIcon: notionPageIconMeta(page.icon) });
  return json({ document_id: documentId, truncated: !!markdownResult.truncated, unknown_blocks: markdownResult.unknown_block_ids || [] });
}

function notionIdFromUrl(value) {
  const text = String(value || '');
  const hashId = text.match(/#([0-9a-f]{32})(?:$|[?&])/i)?.[1];
  if (hashId) return normalizedNotionId(hashId);
  const ids = text.match(/[0-9a-f]{32}|[0-9a-f-]{36}/ig) || [];
  return ids.length ? normalizedNotionId(ids[ids.length - 1]) : '';
}

function notionPageIdFromUrl(value) {
  const pageUrl = String(value || '').split('#', 1)[0];
  const ids = pageUrl.match(/[0-9a-f]{32}|[0-9a-f-]{36}/ig) || [];
  return ids.length ? normalizedNotionId(ids[ids.length - 1]) : '';
}

function safeImportedLinkHref(value) {
  const raw = String(value || '').trim();
  if (/^https?:\/\//i.test(raw)) {
    try { return new URL(raw).href; } catch { return ''; }
  }
  if (/^mailto:[^\s<>"']+$/i.test(raw) && !/[\r\n]/.test(raw)) return raw;
  if (/^tel:\+?[0-9().\-\s]{3,32}$/i.test(raw) && !/[\r\n]/.test(raw)) return raw;
  return '';
}

function notionMarkdownText(richText) {
  return (Array.isArray(richText) ? richText : []).map(item => {
    const plainText = String(item?.plain_text || item?.text?.content || '');
    const annotations = item?.annotations || {};
    if (annotations.code) return '`' + plainText.replace(/`/g, '\\`') + '`';
    let text = plainText.replace(/[\[\]]/g, '\\$&');
    const href = item?.href || item?.text?.link?.url;
    const safeHref = safeImportedLinkHref(href);
    if (safeHref) text = '[' + text + '](' + safeHref + ')';
    if (annotations.bold) text = '**' + text + '**';
    if (annotations.italic) text = '*' + text + '*';
    if (annotations.strikethrough) text = '~~' + text + '~~';
    return text;
  }).join('');
}

async function notionBlockChildrenMarkdown(env, blockId, depth, seen) {
  if (depth > 6) return '';
  const parts = [];
  let cursor = null;
  do {
    const query = new URLSearchParams({ page_size: '100' });
    if (cursor) query.set('start_cursor', cursor);
    const page = await notionApiRequest(env, '/blocks/' + normalizedNotionId(blockId) + '/children?' + query);
    for (const child of (page.results || [])) {
      const value = await notionBlockMarkdown(env, child, depth + 1, seen);
      if (value) parts.push(value);
    }
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  return parts.join('\n\n');
}

async function notionTableMarkdown(env, blockId) {
  const rows = [];
  let cursor = null;
  do {
    const query = new URLSearchParams({ page_size: '100' });
    if (cursor) query.set('start_cursor', cursor);
    const page = await notionApiRequest(env, '/blocks/' + normalizedNotionId(blockId) + '/children?' + query);
    for (const child of page.results || []) {
      const cells = child?.table_row?.cells;
      if (Array.isArray(cells)) rows.push(cells.map(cell => notionMarkdownText(cell)));
    }
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  const width = Math.max(0, ...rows.map(row => row.length));
  if (!width) return '';
  const normalized = rows.map(row => Array.from({ length: width }, (_, index) => String(row[index] || '').replace(/\|/g, '\\|')));
  return ['| ' + normalized[0].join(' | ') + ' |', '| ' + normalized[0].map(() => '---').join(' | ') + ' |', ...normalized.slice(1).map(row => '| ' + row.join(' | ') + ' |')].join('\n');
}

async function notionBlockMarkdown(env, blockOrId, depth = 0, seen = new Set()) {
  if (depth > 6) return '';
  const block = typeof blockOrId === 'string'
    ? await notionApiRequest(env, '/blocks/' + normalizedNotionId(blockOrId))
    : blockOrId;
  const id = normalizedNotionId(block?.id || (typeof blockOrId === 'string' ? blockOrId : ''));
  if (!id || seen.has(id)) return '';
  seen.add(id);
  const type = String(block?.type || '');
  const value = block?.[type] || {};
  const text = notionMarkdownText(value.rich_text);
  if (type === 'table') return notionTableMarkdown(env, id);
  if (type === 'equation') return '$$' + String(value.expression || '') + '$$';
  if (type === 'callout') {
    const emoji = value.icon?.type === 'emoji' ? String(value.icon.emoji || '') + ' ' : '';
    return '<callout>' + emoji + text + '</callout>';
  }
  if (type === 'table_of_contents') return '<table-of-contents />';
  if (type === 'toggle') {
    const children = await notionBlockChildrenMarkdown(env, id, depth, seen);
    return '<details><summary>' + escapeXml(text || '토글') + '</summary>' + children.replace(/\r?\n/g, ' ').trim() + '</details>';
  }
  if (type === 'link_to_page') {
    const targetId = normalizedNotionId(value.page_id || value.database_id || value.data_source_id || '');
    if (!targetId) return '';
    let title = '연결된 페이지';
    try { title = notionPageTitle(await notionApiRequest(env, '/pages/' + targetId)); } catch {}
    return '[' + title.replace(/[\[\]]/g, '') + '](https://www.notion.so/' + targetId + ')';
  }
  if (type === 'child_page') return '[' + String(value.title || '하위 페이지').replace(/[\[\]]/g, '') + '](https://www.notion.so/' + id + ')';
  if (type === 'child_database') return '**' + String(value.title || '데이터베이스') + '**';
  if (['image', 'file', 'video', 'audio', 'pdf'].includes(type)) {
    const url = value.file?.url || value.external?.url;
    if (!url) return '';
    const caption = notionMarkdownText(value.caption) || (type === 'image' ? '이미지' : '파일');
    return type === 'image' ? '![' + caption.replace(/[\[\]]/g, '') + '](' + url + ')' : '[' + caption.replace(/[\[\]]/g, '') + '](' + url + ')';
  }
  if (type === 'divider') return '---';
  if (type === 'to_do') return '- [' + (value.checked ? 'x' : ' ') + '] ' + text;
  if (type === 'bulleted_list_item') return '- ' + text;
  if (type === 'numbered_list_item') return '1. ' + text;
  if (type === 'heading_1') return '# ' + text;
  if (type === 'heading_2') return '## ' + text;
  if (type === 'heading_3') return '### ' + text;
  if (type === 'quote') return '> ' + text;
  if (type === 'code') return '```\n' + text + '\n```';
  if (['bookmark', 'embed', 'link_preview'].includes(type)) return value.url ? '[' + (text || '링크') + '](' + value.url + ')' : text;
  if (type === 'synced_block') {
    const sourceId = value.synced_from?.block_id || id;
    return notionBlockChildrenMarkdown(env, sourceId, depth, seen);
  }
  if (block?.has_children || ['column_list', 'column', 'toggle'].includes(type)) {
    const children = await notionBlockChildrenMarkdown(env, id, depth, seen);
    return [text, children].filter(Boolean).join('\n\n');
  }
  return text;
}

async function resolveNotionMarkdownPageMentions(env, markdown) {
  let output = String(markdown || '').replace(/<empty-block\s*\/>/gi, '');
  const tags = [...output.matchAll(/<(?:mention-page|unknown)\b[^>]*\burl="([^"]+)"[^>]*\/?\s*>/gi)];
  const urls = [...new Set(tags.map(match => match[1]))].slice(0, 100);
  const replacements = new Map();
  for (const url of urls) {
    const pageId = notionIdFromUrl(url);
    if (pageId) {
      try {
        const recovered = await notionBlockMarkdown(env, pageId);
        if (recovered) { replacements.set(url, recovered); continue; }
      } catch {}
    }
    let title = '연결된 페이지';
    if (pageId) try { title = notionPageTitle(await notionApiRequest(env, '/pages/' + pageId)); } catch {}
    replacements.set(url, '[' + title.replace(/[\[\]]/g, '') + '](' + url + ')');
  }
  return output.replace(/<(?:mention-page|unknown)\b[^>]*\burl="([^"]+)"[^>]*\/?\s*>/gi, (_tag, url) => replacements.get(url) || '연결된 페이지');
}

async function importNotionApiDataSource(request, env, actor, rawSourceId) {
  requireRole(actor, MANAGE_ROLES);
  const sourceId = normalizedNotionId(rawSourceId);
  const peopleDirectory = await loadNotionPeopleDirectory(env);
  const source = await notionApiRequest(env, '/data_sources/' + sourceId);
  let sourceViews = [];
  try { sourceViews = await listNotionApiViews(env, sourceId); } catch (error) {
    if (!(error instanceof HttpError) || ![403, 404].includes(error.status)) throw error;
  }
  const entries = Object.entries(source.properties || {});
  entries.sort((left, right) => Number(right[1]?.type === 'title') - Number(left[1]?.type === 'title'));
  const columns = entries.slice(0, DATABASE_MAX_COLUMNS).map(([name, property], index) => notionPropertyColumn(name, property, index));
  const pages = [];
  let cursor = null;
  do {
    const payload = { page_size: 100 };
    if (cursor) payload.start_cursor = cursor;
    const result = await notionApiRequest(env, '/data_sources/' + sourceId + '/query', { method: 'POST', body: JSON.stringify(payload) });
    pages.push(...(result.results || []));
    cursor = result.has_more ? result.next_cursor : null;
  } while (cursor && pages.length < 5000);
  const allRows = pages.map(page => ({ id: 'row_' + normalizedNotionId(page.id), source_id: normalizedNotionId(page.id), cells: Object.fromEntries(columns.map(column => { const property = Object.values(page.properties || {}).find(item => item?.id === column.sourceId); const value = notionPropertyText(property, peopleDirectory); return [column.id, value.slice(0, 500)]; })) }));
  const fallbackGroup = columns.find(column => /상태|status/i.test(column.name)) || columns.find(column => ['select', 'status'].includes(column.type)) || columns[0];
  const normalizedViews = sourceViews.length ? sourceViews.map(view => ({ ...view, groupBy: columns.find(column => column.sourceId === notionViewPropertyId(view, 'group_by'))?.id || fallbackGroup?.id || '', datePropertyId: columns.find(column => column.sourceId === (notionViewPropertyId(view, 'date_property_id') || notionViewPropertyId(view, 'date_property')))?.id || '' })) : [
    { id: 'view_table', name: '전체 보기', type: 'table', order: 0, is_default: true, filter: null, sorts: [], quick_filters: [], configuration: {} },
    ...(fallbackGroup ? [{ id: 'view_board', name: fallbackGroup.name + '별', type: 'board', order: 1, groupBy: fallbackGroup.id, filter: null, sorts: [], quick_filters: [], configuration: {} }] : []),
    ...(columns.find(column => column.type === 'date') ? [{ id: 'view_calendar', name: '캘린더', type: 'calendar', order: 2, datePropertyId: columns.find(column => column.type === 'date').id, filter: null, sorts: [], quick_filters: [], configuration: {} }] : [])
  ];
  const defaultView = normalizedViews.find(view => view.is_default) || normalizedViews[0];
  const blocks = [], cleanColumns = columns.map(({ sourceId, ...column }) => ({ ...column, source_id: sourceId || '' }));
  const makeModel = rows => ({ version: 3, source_id: sourceId, title: notionRichText(source.title) || 'Notion 데이터베이스', columns: cleanColumns, rows, views: normalizedViews, view: { mode: defaultView?.type || (fallbackGroup ? 'board' : 'table'), groupBy: defaultView?.groupBy || fallbackGroup?.id || columns[0]?.id || '', datePropertyId: defaultView?.datePropertyId || '', sortBy: '', sortDir: 'asc', filter: { column: '', operator: 'contains', value: '' } } });
  let chunk = [];
  for (const row of allRows) {
    const candidate = [...chunk, row];
    if (chunk.length && JSON.stringify(makeModel(candidate)).length > 90000) { blocks.push({ type: 'database', content: JSON.stringify(makeModel(chunk)), checked: false }); chunk = [row]; }
    else chunk = candidate;
  }
  if (chunk.length || !allRows.length) blocks.push({ type: 'database', content: JSON.stringify(makeModel(chunk)), checked: false });
  const parentSourceId = source.parent?.page_id || source.parent?.database_id || null;
  const documentId = await upsertNotionApiDocument(env, actor, { sourceId, parentSourceId, title: notionRichText(source.title) || 'Notion 데이터베이스', blocks, database: true, pageIcon: notionPageIconMeta(source.icon) });
  const existing = await env.DB.prepare("SELECT source_page_id FROM documents WHERE project_id=? AND status='active' AND source_path LIKE 'notion-api/%' AND source_page_id IS NOT NULL").bind(PROJECT_ID).all();
  const importedIds = new Set((existing.results || []).map(row => String(row.source_page_id)));
  const pageIds = pages.map(page => page.id).filter(id => id && !importedIds.has(normalizedNotionId(id)));
  return json({ document_id: documentId, rows: allRows.length, page_ids: pageIds });
}

async function reconcileNotionApiParents(env, actor) {
  requireRole(actor, MANAGE_ROLES);
  const result = await env.DB.prepare("SELECT id,source_path FROM documents WHERE project_id=? AND status='active' AND source_path LIKE 'notion-api/%'").bind(PROJECT_ID).all();
  const sourceIds = new Map((result.results || []).map(row => [String(row.source_path).split('/')[1], row.id]));
  const statements = [];
  for (const row of result.results || []) {
    const parentSourceId = String(row.source_path).split('/')[2];
    const parentId = parentSourceId && parentSourceId !== 'root' ? sourceIds.get(parentSourceId) || null : null;
    statements.push(env.DB.prepare('UPDATE documents SET parent_document_id=? WHERE id=? AND project_id=?').bind(parentId, row.id, PROJECT_ID));
  }
  for (let offset = 0; offset < statements.length; offset += 100) await env.DB.batch(statements.slice(offset, offset + 100));
  return json({ reconciled: statements.length });
}

function importContentType(path) {
  const extension = path.split('.').at(-1).toLowerCase();
  const types = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', pdf: 'application/pdf', txt: 'text/plain', json: 'application/json', csv: 'text/csv', mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
  return types[extension] || (['html', 'htm', 'svg', 'xhtml', 'js', 'mjs'].includes(extension) ? '' : 'application/octet-stream');
}

function resolveImportLink(sourcePath, target) {
  let decoded;
  try { decoded = decodeURIComponent(String(target || '').split('#')[0].split('?')[0]); } catch { return ''; }
  if (!decoded || /^[a-z][a-z0-9+.-]*:/i.test(decoded) || decoded.startsWith('//')) return '';
  const parts = (pathDirname(sourcePath) + '/' + decoded).split('/');
  const resolved = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') { if (!resolved.length) return ''; resolved.pop(); }
    else resolved.push(part);
  }
  return resolved.join('/');
}

function rewriteNotionLinks(markdown, sourcePath, documentIdByKey, assetUrls, origin) {
  return markdown.replace(/(!?\[[^\]\r\n]*\]\()([^)\r\n]+)(\))/g, (match, start, target, end) => {
    const resolved = resolveImportLink(sourcePath, target);
    if (!resolved) return match;
    const asset = assetUrls.get(resolved);
    if (asset) return start + asset.url + end;
    const documentId = documentIdByKey.get(withoutExtension(resolved));
    return documentId ? start + origin + '/doc/' + documentId + end : match;
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && !cell) quoted = true;
    else if (char === ',') { row.push(cell); cell = ''; }
    else if (char === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(values => values.some(value => String(value).trim()));
}

function csvToDatabaseBlocks(text, title) {
  const table = parseCsv(text);
  if (!table.length) return [{ type: 'text', content: '', checked: false }];
  const width = Math.max(1, Math.min(12, ...table.map(row => row.length)));
  const headers = Array.from({ length: width }, (_, index) => String(table[0][index] || ('속성 ' + (index + 1))).slice(0, 80));
  const columns = headers.map((name, index) => ({ id: 'col_' + index, name, type: 'text', options: [] }));
  const dataRows = table.slice(1, 10001);
  const blocks = [];
  for (let offset = 0; offset < dataRows.length || (!dataRows.length && offset === 0); offset += 200) {
    const rows = dataRows.slice(offset, offset + 200).map((values, rowIndex) => ({ id: 'row_' + offset + '_' + rowIndex, cells: Object.fromEntries(columns.map((column, columnIndex) => [column.id, String(values[columnIndex] || '').slice(0, 500)])) }));
    const part = offset ? ' ' + (Math.floor(offset / 200) + 1) : '';
    blocks.push({ type: 'database', content: JSON.stringify({ version: 2, title: (title + part).slice(0, 120), columns, rows, view: { mode: 'table', groupBy: columns[0].id, sortBy: '', sortDir: 'asc', filter: { column: '', operator: 'contains', value: '' } } }), checked: false });
    if (!dataRows.length) break;
  }
  return blocks;
}

async function upsertNotionImportItem(db, importId, sourcePath, documentId, status, error) {
  await db.prepare(`INSERT INTO notion_import_items (import_id,source_path,document_id,status,error,updated_at) VALUES (?,?,?,?,?,?)
    ON CONFLICT(import_id,source_path) DO UPDATE SET document_id=excluded.document_id,status=excluded.status,error=excluded.error,updated_at=excluded.updated_at`)
    .bind(importId, sourcePath, documentId, status, error, nowSeconds()).run();
}

function sanitizeImportedInlineHtml(value) {
  const allowed = new Set(['b', 'strong', 'i', 'em', 'u', 's', 'del', 'code', 'a', 'br']);
  const source = String(value || '')
    .replace(/<page\b[^>]*\burl\s*=\s*(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/page>/gi, (_full, _quote, href, label) => '<a href="' + escapeXml(href) + '">' + label + '</a>')
    .replace(/<(?:mention-page|unknown)\b[^>]*\burl\s*=\s*(["'])([^"']+)\1[^>]*\/?\s*>/gi, (_full, _quote, href) => '<a href="' + escapeXml(href) + '">연결된 Notion 페이지</a>');
  return source.replace(/<(script|style|iframe|object|embed|svg|math|form)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<\/?([a-z][\w-]*)([^>]*)>/gi, (full, rawTag, rawAttrs) => {
    const tag = String(rawTag).toLowerCase();
    if (!allowed.has(tag)) return '';
    if (tag === 'br') return '<br>';
    if (full.startsWith('</')) return '</' + tag + '>';
    if (tag !== 'a') return '<' + tag + '>';
    const href = safeImportedLinkHref(String(rawAttrs || '').match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1] || '');
    if (!href) return '';
    return '<a href="' + escapeXml(href) + '">' ;
  });
}

function importedRichContent(value) {
  const sanitized = sanitizeImportedInlineHtml(value);
  return sanitized.replace(/\s+$/g, '') ? '@qwerty-rich:' + sanitized : '';
}

function parseHtmlBlockLine(line) {
  const trimmed = String(line || '').trim();
  if (/^<hr\b[^>]*\/?>(?:\s*)$/i.test(trimmed)) return { type: 'divider', content: '' };
  if (/^<table-of-contents\s*\/?>(?:\s*)$/i.test(trimmed)) return { type: 'toc', content: '' };
  const details = trimmed.match(/^<details\b[^>]*>\s*<summary\b[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>\s*$/i);
  if (details) {
    const summary = details[1].replace(/<[^>]+>/g, '').trim() || '토글';
    const body = details[2].trim();
    return { type: 'toggle', content: summary + (body ? '\n' + body : '') };
  }
  const page = trimmed.match(/^<page\b[^>]*\burl\s*=\s*(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/page>\s*$/i);
  if (page) return { type: 'text', content: importedRichContent('<a href="' + escapeXml(page[2]) + '">' + page[3] + '</a>') || page[3].replace(/<[^>]+>/g, '') };
  const match = trimmed.match(/^<(h[1-6]|p|div|blockquote|pre|ul|ol|table|callout)\b[^>]*>([\s\S]*?)<\/\1>\s*$/i);
  if (!match) {
    const item = trimmed.match(/^<li\b[^>]*>([\s\S]*?)<\/li>\s*$/i);
    if (!item) return null;
    const todo = item[1].match(/^\s*\[([ xX])\]\s*/);
    return { type: todo ? 'todo' : 'bullet', content: importedRichContent(todo ? item[1].replace(/^\s*\[([ xX])\]\s*/, '') : item[1]), checked: !!todo && todo[1].toLowerCase() === 'x' };
  }
  const tag = match[1].toLowerCase();
  const inner = match[2];
  if (/^h[1-6]$/.test(tag)) return { type: 'heading' + tag.slice(1), content: importedRichContent(inner) || inner.replace(/<[^>]+>/g, '') };
  if (tag === 'p' || tag === 'div') return { type: 'text', content: importedRichContent(inner) || inner.replace(/<[^>]+>/g, '') };
  if (tag === 'blockquote') return { type: 'quote', content: importedRichContent(inner) || inner.replace(/<[^>]+>/g, '') };
  if (tag === 'callout') return { type: 'callout', content: importedRichContent(inner) || inner.replace(/<[^>]+>/g, '') };
  if (tag === 'pre') return { type: 'code', content: inner.replace(/<[^>]+>/g, '') };
  if (tag === 'table') { const rows = [...inner.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(row => [...row[1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(cell => cell[1].replace(/<[^>]+>/g, '').trim())); return { type: 'table', content: JSON.stringify(rows.filter(row => row.length)) }; }
  const items = [...inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)];
  return items.map(item => { const todo = item[1].match(/^\s*\[([ xX])\]\s*/); return { type: todo ? 'todo' : tag === 'ol' ? 'numbered' : 'bullet', content: importedRichContent(todo ? item[1].replace(/^\s*\[([ xX])\]\s*/, '') : item[1]) || item[1].replace(/<[^>]+>/g, ''), checked: !!todo && todo[1].toLowerCase() === 'x' }; });
}

function markdownTableRow(line) {
  const value = String(line || '').trim().replace(/^\|/, '').replace(/\|$/, '');
  return value.split('|').map(cell => cell.trim().replace(/^\s*:\s*/, '').replace(/\s*:\s*$/, ''));
}

function isMarkdownTableSeparator(line) {
  return /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(String(line || ''));
}

function markdownIndentLevel(line) {
  const prefix = String(line || '').match(/^[ \t]*/)?.[0] || '';
  return Math.min(4, Math.floor(prefix.replace(/\t/g, '  ').length / 2));
}

function stripMarkdownIndent(line) {
  return String(line || '').replace(/^[ \t]+/, '');
}

function removeCodeFenceIndent(line, indent) {
  let index = 0;
  while (index < String(line || '').length && index < indent && /[ \t]/.test(line[index])) index += 1;
  return String(line || '').slice(index);
}

export function parseMarkdownBlocks(markdown) {
  const lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let title = '';
  let code = null;
  let math = null;
  const push = (type, content = '', checked = false, indentLevel = 0) => blocks.push({
    type,
    content: String(content).trimEnd(),
    checked,
    indent_level: Math.max(0, Math.min(4, indentLevel))
  });
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const fence = line.match(/^([ \t]*)(```|~~~)\s*[A-Za-z0-9_+.-]*\s*$/);
    if (fence) {
      if (code === null) code = { marker: fence[2], indent: fence[1].length, indentLevel: markdownIndentLevel(line), lines: [] };
      else if (fence[2] === code.marker) { push('code', code.lines.join('\n'), false, code.indentLevel); code = null; }
      continue;
    }
    if (code !== null) { code.lines.push(removeCodeFenceIndent(line, code.indent)); continue; }
    const inlineMath = line.match(/^\s*\$\$([\s\S]+)\$\$\s*$/);
    if (inlineMath) { push('math', inlineMath[1]); continue; }
    if (/^\s*\$\$\s*$/.test(line)) {
      if (math === null) math = [];
      else { push('math', math.join('\n')); math = null; }
      continue;
    }
    if (math !== null) { math.push(line); continue; }
    if (!line.trim() || /^\s*<\/?(?:columns|column)\b[^>]*>\s*$/i.test(line) || /^\s*<empty-block\s*\/>\s*$/i.test(line)) continue;
    if (line.includes('|') && isMarkdownTableSeparator(lines[lineIndex + 1])) {
      const rows = [markdownTableRow(line)];
      lineIndex += 2;
      while (lineIndex < lines.length && lines[lineIndex].includes('|') && lines[lineIndex].trim()) rows.push(markdownTableRow(lines[lineIndex++]));
      lineIndex -= 1;
      push('table', JSON.stringify(rows));
      continue;
    }
    const htmlBlocks = parseHtmlBlockLine(line);
    if (htmlBlocks) {
      const indentLevel = markdownIndentLevel(line);
      for (const htmlBlock of (Array.isArray(htmlBlocks) ? htmlBlocks : [htmlBlocks])) {
        if (htmlBlock.type === 'heading1' && !title) title = String(htmlBlock.content || '').replace(/^@qwerty-rich:/, '').replace(/<[^>]+>/g, '').trim();
        else push(htmlBlock.type, htmlBlock.content, htmlBlock.checked, htmlBlock.indent_level ?? indentLevel);
      }
      continue;
    }
    const value = stripMarkdownIndent(line);
    let match;
    if ((match = value.match(/^#\s+(.+)$/))) {
      if (!title) title = match[1].trim();
      else push('heading1', match[1]);
    } else if ((match = value.match(/^##\s+(.+)$/))) push('heading2', match[1]);
    else if ((match = value.match(/^###\s+(.+)$/))) push('heading3', match[1]);
    else if ((match = value.match(/^####\s+(.+)$/))) push('heading4', match[1]);
    else if ((match = value.match(/^#####\s+(.+)$/))) push('heading5', match[1]);
    else if ((match = value.match(/^######\s+(.+)$/))) push('heading6', match[1]);
    else if ((match = value.match(/^<database\b[^>]*\burl="([^"]+)"[^>]*\bdata-source-url="collection:\/\/([0-9a-f-]{32,36})"[^>]*>(.*?)<\/database>\s*$/i))) push('page_link', JSON.stringify({ title: match[3].trim() || 'Notion 데이터베이스', url: match[1], document_id: 'doc_notiondb_' + normalizedNotionId(match[2]) }));
    else if ((match = value.match(/^<(?:mention-page|unknown)\b[^>]*\burl="([^"]+)"[^>]*\/?\s*>\s*$/i))) push('page_link', JSON.stringify({ title: '연결된 Notion 블록', url: match[1] }));
    else if ((match = value.match(/^!\[[^\]]*\]\((https?:\/\/[^)]+)\)$/i))) push('image', match[1]);
    else if ((match = value.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)\s*$/i))) {
      const notionPage = /(?:notion\.so|notion\.site|app\.notion\.com)/i.test(match[2]);
      const notionId = notionPage ? notionPageIdFromUrl(match[2]) : '';
      push(notionPage ? 'page_link' : 'bookmark', notionPage ? JSON.stringify({ title: match[1], url: match[2], ...(notionId && /^[0-9a-f]{32}$/.test(notionId) ? { document_id: 'doc_notion_' + notionId } : {}) }) : match[2]);
    }
    else if ((match = value.match(/^[-*+]\s+\[([ xX])\]\s+(.+)$/))) push('todo', match[2], match[1].toLowerCase() === 'x', markdownIndentLevel(line));
    else if ((match = value.match(/^[-*+]\s+(.+)$/))) push('bullet', match[1], false, markdownIndentLevel(line));
    else if ((match = value.match(/^\d+[.)]\s+(.+)$/))) push('numbered', match[1], false, markdownIndentLevel(line));
    else if ((match = value.match(/^>\s?(.*)$/))) push('quote', match[1], false, markdownIndentLevel(line));
    else if (/^([-*_])\1\1+\s*$/.test(value)) push('divider', '');
    else push('text', value);
  }
  if (code !== null) push('code', code.lines.join('\n'));
  if (math !== null) push('math', math.join('\n'));
  return { title, blocks };
}

const LEGACY_TOGGLE_GROUP_PREFIX = '@qwerty-toggle-group:';

function legacyBlockType(block) {
  return String(block?.block_type ?? block?.type ?? 'text');
}

function legacyBlockWith(block, type, content, extra = {}) {
  const next = { ...block, content: String(content ?? ''), ...extra };
  if (Object.prototype.hasOwnProperty.call(block || {}, 'block_type')) next.block_type = type;
  else next.type = type;
  return next;
}

function legacyHtmlText(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\\([\[\]{}])/g, '$1')
    .replace(/\s+\{(?:toggle|color)=(?:"[^"]*"|'[^']*'|[^\s}]+)\}\s*$/i, '')
    .trim();
}

function legacyTableCellText(value) {
  return legacyHtmlText(value)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1');
}

function legacySourceValue(value) {
  const raw = String(value || '').replace(/&amp;/gi, '&').trim();
  if (!/^file:\/\//i.test(raw)) return { source: raw, filename: '' };
  let payload = raw.slice(7);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const decoded = decodeURIComponent(payload);
      if (decoded === payload) break;
      payload = decoded;
    } catch { break; }
  }
  try {
    const parsed = JSON.parse(payload);
    return { source: String(parsed?.source || ''), filename: String(parsed?.name || '') };
  } catch {
    return { source: '', filename: '' };
  }
}

function legacySourceFilename(source, fallback = '') {
  if (fallback) return legacyHtmlText(fallback);
  const raw = String(source || '');
  const tail = raw.startsWith('attachment:') ? raw.split(':').at(-1) : raw.split(/[?#]/, 1)[0].split('/').at(-1);
  if (!tail) return '';
  try { return decodeURIComponent(tail); } catch { return tail; }
}

function legacyMatchingClose(blocks, start, openPattern, closePattern) {
  let depth = 0;
  for (let index = start; index < blocks.length; index += 1) {
    if (legacyBlockType(blocks[index]) !== 'text') continue;
    const value = String(blocks[index]?.content || '').trim();
    if (openPattern.test(value)) depth += 1;
    if (closePattern.test(value)) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function legacyTableRows(blocks, start, end) {
  const rows = [];
  let current = [];
  const flush = () => {
    if (current.length) rows.push(current);
    current = [];
  };
  for (let index = start + 1; index < end; index += 1) {
    const raw = String(blocks[index]?.content || '').trim();
    if (/^<tr\b/i.test(raw)) { flush(); continue; }
    if (/^<\/tr\s*>$/i.test(raw)) { flush(); continue; }
    const cell = raw.match(/^<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>\s*$/i);
    if (cell) current.push(legacyTableCellText(cell[1]));
  }
  flush();
  return rows.filter(row => row.length);
}

function legacyUnavailableAttachment(block, source, label) {
  const filename = legacySourceFilename(source) || label;
  return legacyBlockWith(block, 'callout', '📎 ' + filename + ' · 원본 첨부 링크를 가져오지 못했습니다.', { checked: false });
}

function repairLegacySingleBlock(block) {
  const type = legacyBlockType(block);
  const original = String(block?.content || '');
  if (type === 'code' || type === 'database') return [block];
  const normalized = original.replace(/\s+\{(?:toggle|color)=(?:"[^"]*"|'[^']*'|[^\s}]+)\}\s*$/i, '').trimEnd();
  if (normalized.startsWith('@qwerty-rich:')) {
    const rich = normalized.slice('@qwerty-rich:'.length);
    if (/^(?:\s*&lt;span\b(?:(?!&gt;)[\s\S])*?&gt;[\s\S]*?&lt;\/span&gt;\s*)+$/i.test(rich)) {
      const restoredSpans = rich.replace(/&lt;(\/?span\b(?:(?!&gt;)[\s\S])*?)&gt;/gi, '<$1>');
      return [legacyBlockWith(block, type, '@qwerty-rich:' + restoredSpans)];
    }
  }
  if (!normalized.startsWith('@qwerty-rich:') && (/<br\s*\/?>/i.test(normalized) || /<\/?span\b[^>]*>/i.test(normalized))) {
    const cleanedInline = normalized
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?span\b[^>]*>/gi, '')
      .replace(/\\([\[\]{}<>*_$])/g, '$1');
    return [legacyBlockWith(block, type, cleanedInline)];
  }
  if (type !== 'text') return [normalized !== original ? legacyBlockWith(block, type, normalized) : block];
  const raw = normalized.trim();
  if (!raw.startsWith('<')) return [normalized !== original ? legacyBlockWith(block, type, normalized) : block];
  if (/^<table[_-]of[_-]contents\b[^>]*\/?>\s*$/i.test(raw)) return [legacyBlockWith(block, 'toc', '')];
  const page = raw.match(/^<page\b[^>]*\burl\s*=\s*(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/page>\s*$/i);
  if (page) {
    const url = page[2].replace(/&amp;/gi, '&');
    const notionId = notionPageIdFromUrl(url);
    return [legacyBlockWith(block, 'page_link', JSON.stringify({ title: legacyHtmlText(page[3]) || '연결된 문서', url, ...(notionId ? { document_id: 'doc_notion_' + notionId } : {}) }))];
  }
  const media = raw.match(/^<(file|video|audio|image|img|embed|iframe|pdf)\b[^>]*\b(?:src|url)\s*=\s*(["'])([^"']*)\2[^>]*>(?:[\s\S]*?<\/\1>)?\s*$/i);
  if (media) {
    const tag = media[1].toLowerCase();
    const decoded = legacySourceValue(media[3]);
    const source = decoded.source;
    const label = tag === 'video' ? '동영상' : tag === 'audio' ? '오디오' : tag === 'image' || tag === 'img' ? '이미지' : '첨부 파일';
    if (!/^https?:\/\//i.test(source)) return [legacyUnavailableAttachment(block, source, legacySourceFilename(source, decoded.filename) || label)];
    const mediaType = tag === 'video' && /(?:youtu\.be|youtube\.com|vimeo\.com)/i.test(source)
      ? 'embed'
      : tag === 'img' ? 'image' : tag === 'pdf' ? 'file' : tag === 'iframe' ? 'embed' : tag;
    return [legacyBlockWith(block, mediaType, source, { checked: false })];
  }
  const summary = raw.match(/^<summary\b[^>]*>([\s\S]*?)<\/summary>\s*$/i);
  if (summary) return [legacyBlockWith(block, 'heading3', legacyHtmlText(summary[1]) || '세부 내용')];
  if (/^<span\b[^>]*>[\s\S]*<\/span>(?:\s*<span\b[^>]*>[\s\S]*<\/span>)*\s*$/i.test(raw)) {
    return [legacyBlockWith(block, 'text', legacyHtmlText(raw))];
  }
  const cell = raw.match(/^<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>\s*$/i);
  if (cell) return [legacyBlockWith(block, 'text', legacyTableCellText(cell[1]))];
  if (/^<\/?(?:table|tbody|thead|tfoot|tr|colgroup|col|details|callout)\b[^>]*>\s*$/i.test(raw)) return [];
  const parsed = parseHtmlBlockLine(raw);
  if (parsed) return (Array.isArray(parsed) ? parsed : [parsed]).map((item, index) => legacyBlockWith(block, item.type, item.content, { checked: !!item.checked, ...(index ? { id: String(block.id || 'legacy') + '_' + index } : {}) }));
  return [block];
}

export function repairLegacyImportedBlocks(blocks) {
  const source = Array.isArray(blocks) ? blocks : [];
  const output = [];
  for (let index = 0; index < source.length;) {
    const block = source[index];
    const type = legacyBlockType(block);
    const raw = String(block?.content || '').trim();
    if (type === 'text' && /^<details\b[^>]*>\s*$/i.test(raw)) {
      const end = legacyMatchingClose(source, index, /^<details\b[^>]*>\s*$/i, /^<\/details\s*>$/i);
      const summaryMatch = String(source[index + 1]?.content || '').trim().match(/^<summary\b[^>]*>([\s\S]*?)<\/summary>\s*$/i);
      const summary = legacyHtmlText(summaryMatch?.[1] || '') || '세부 내용';
      if (end < 0) {
        output.push(legacyBlockWith(block, 'toggle', summary, { checked: false }));
        index += summaryMatch ? 2 : 1;
        continue;
      }
      const bodyStart = index + (summaryMatch ? 2 : 1);
      const repairedBody = repairLegacyImportedBlocks(source.slice(bodyStart, end)).map(child => ({
        ...child,
        indent_level: Math.min(4, Number(child.indent_level || 0) + 1),
        content: legacyBlockType(child) === 'text' ? String(child.content || '').replace(/^\t|^ {1,2}/, '') : child.content
      }));
      const marker = repairedBody.length ? LEGACY_TOGGLE_GROUP_PREFIX + repairedBody.length + '\n' : '';
      output.push(legacyBlockWith(block, 'toggle', marker + summary, { checked: false }), ...repairedBody);
      index = end + 1;
      continue;
    }
    if (type === 'text' && /^<table\b[^>]*>\s*$/i.test(raw)) {
      const end = legacyMatchingClose(source, index, /^<table\b[^>]*>\s*$/i, /^<\/table\s*>$/i);
      if (end >= 0) {
        const rows = legacyTableRows(source, index, end);
        if (rows.length) output.push(legacyBlockWith(block, 'table', JSON.stringify(rows), { checked: false }));
        index = end + 1;
        continue;
      }
    }
    if (type === 'text' && /^<callout\b[^>]*>\s*$/i.test(raw)) {
      const end = legacyMatchingClose(source, index, /^<callout\b[^>]*>\s*$/i, /^<\/callout\s*>$/i);
      if (end >= 0) {
        const icon = raw.match(/\bicon\s*=\s*(["'])(.*?)\1/i)?.[2] || '💡';
        const repairedBody = repairLegacyImportedBlocks(source.slice(index + 1, end));
        const text = repairedBody.map(item => legacyHtmlText(item.content)).filter(Boolean).join('\n');
        output.push(legacyBlockWith(block, 'callout', icon + (text ? ' ' + text : ''), { checked: false }));
        index = end + 1;
        continue;
      }
    }
    output.push(...repairLegacySingleBlock(block));
    index += 1;
  }
  return output.map((block, position) => ({ ...block, ...(Object.prototype.hasOwnProperty.call(block, 'position') ? { position } : {}) }));
}

const parseMarkdownBlocksBase=parseMarkdownBlocks;
parseMarkdownBlocks=(markdown)=>{const parsed=parseMarkdownBlocksBase(markdown);const blocks=parsed.blocks.map(block=>{if(block.type!=='bullet')return block;const match=String(block.content||'').trim().match(/^\[([^\]\r\n]+)\]\((https?:\/\/[^)\s]+)\)$/i);if(!match||!/(?:notion\.so|notion\.site|app\.notion\.com)/i.test(match[2]))return block;const notionId=notionPageIdFromUrl(match[2]);const label=String(match[1]).replace(/\\([\[\]])/g,'$1').replace(/\*\*([^*]+)\*\*/g,'$1').replace(/__([^_]+)__/g,'$1').replace(/`([^`]+)`/g,'$1').trim()||'연결된 문서';return notionId&&/^[0-9a-f]{32}$/.test(notionId)?{...block,type:'page_link',content:JSON.stringify({title:label,url:match[2],document_id:'doc_notion_'+notionId})}:block});return{...parsed,blocks:repairLegacyImportedBlocks(blocks)}};
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
  return json({ document: { ...publicDocument(document), is_favorite: !!favorite, can_edit: permission.can_edit, can_manage_access: permission.can_manage_access, blocks: await enrichPageLinkBlocks(env.DB, repairLegacyImportedBlocks(blocks.results || [])) } });
}

async function getDocumentViewPreferences(env, actor, id) {
  const { document } = await requireDocumentForActor(env.DB, actor, id);
  if (document.status !== 'active') throw new HttpError(404, '휴지통에 있는 문서입니다.');
  const result = await env.DB.prepare(`SELECT block_id,view_id,view_type,updated_at
    FROM document_view_preferences WHERE project_id=? AND user_id=? AND document_id=?`).bind(PROJECT_ID, actor.id, id).all();
  return json({ preferences: (result.results || []).map(row => ({
    block_id: String(row.block_id || ''),
    view_id: String(row.view_id || ''),
    view_type: String(row.view_type || ''),
    updated_at: Number(row.updated_at || 0)
  })) });
}

async function saveDocumentViewPreference(request, env, actor, id) {
  const { document } = await requireDocumentForActor(env.DB, actor, id);
  if (document.status !== 'active') throw new HttpError(404, '휴지통에 있는 문서입니다.');
  const body = await readJson(request);
  const blockId = String(body.block_id || '');
  const viewId = String(body.view_id || '').trim().slice(0, 80);
  const viewType = String(body.view_type || '').trim().toLowerCase();
  if (!/^blk_[A-Za-z0-9_-]{8,80}$/.test(blockId)) throw new HttpError(400, '데이터베이스 블록 ID가 올바르지 않습니다.');
  if (!viewId || !/^[A-Za-z0-9_-]{1,80}$/.test(viewId)) throw new HttpError(400, '데이터베이스 보기 ID가 올바르지 않습니다.');
  if (!DATABASE_VIEW_TYPES.has(viewType)) throw new HttpError(400, '지원하지 않는 데이터베이스 보기입니다.');
  const block = await env.DB.prepare('SELECT block_type FROM document_blocks WHERE document_id=? AND snapshot_id=? AND id=?').bind(id, document.active_snapshot_id, blockId).first();
  if (!block || block.block_type !== 'database') throw new HttpError(400, '데이터베이스 블록을 찾을 수 없습니다.');
  const now = nowSeconds();
  await env.DB.prepare(`INSERT INTO document_view_preferences
    (project_id,user_id,document_id,block_id,view_id,view_type,updated_at) VALUES (?,?,?,?,?,?,?)
    ON CONFLICT(project_id,user_id,document_id,block_id) DO UPDATE SET view_id=excluded.view_id,view_type=excluded.view_type,updated_at=excluded.updated_at`)
    .bind(PROJECT_ID, actor.id, id, blockId, viewId, viewType, now).run();
  return json({ ok: true, block_id: blockId, view_id: viewId, view_type: viewType, updated_at: now });
}

async function getPublicDocument(env, id) {
  const document = await env.DB.prepare(`SELECT d.* FROM document_publications p
    JOIN documents d ON d.id=p.document_id AND d.project_id=p.project_id
    WHERE p.project_id=? AND p.document_id=? AND d.status='active'`).bind(PROJECT_ID, id).first();
  if (!document) throw new HttpError(404, '공개되지 않았거나 존재하지 않는 문서입니다.');
  const blocks = await env.DB.prepare(
    'SELECT id,block_type,content,position,checked,indent_level FROM document_blocks WHERE document_id=? AND snapshot_id=? ORDER BY position'
  ).bind(id, document.active_snapshot_id).all();
  return json({ document: { ...publicDocument(document), blocks: await enrichPageLinkBlocks(env.DB, repairLegacyImportedBlocks(blocks.results || [])) } }, 200, {
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

async function listNotionMembers(env, actor) {
  requireRole(actor, MANAGE_ROLES);
  const result = await env.DB.prepare(`SELECT notion_user_id,user_type,name,avatar_url,email_ciphertext,email_nonce,synced_at
    FROM notion_people WHERE project_id=? ORDER BY CASE WHEN user_type='person' THEN 0 ELSE 1 END,name,notion_user_id LIMIT 500`).bind(PROJECT_ID).all();
  const members = [];
  for (const row of result.results || []) {
    let email = '';
    if (row.email_ciphertext && row.email_nonce) email = await decryptEmail(env, row.email_ciphertext, row.email_nonce);
    members.push({ notion_user_id: row.notion_user_id, user_type: row.user_type, name: row.name || '', email, avatar_url: row.avatar_url || '', synced_at: Number(row.synced_at) });
  }
  return json({ members });
}

async function resetNotionMigration(request, env, actor) {
  if (actor.role !== 'owner') throw new HttpError(403, 'Owner만 마이그레이션 데이터를 초기화할 수 있습니다.');
  const body = await readJson(request);
  if (body.confirm !== PROJECT_ID) throw new HttpError(400, '프로젝트 확인 문자열이 일치하지 않습니다.');
  const files = await env.DB.prepare('SELECT id,storage_key FROM file_uploads WHERE project_id=? ORDER BY id LIMIT 50').bind(PROJECT_ID).all();
  if (env.STORAGE && typeof env.STORAGE.delete === 'function') await Promise.all((files.results || []).map(file => env.STORAGE.delete(file.storage_key)));
  if ((files.results || []).length) {
    await env.DB.batch((files.results || []).map(file => env.DB.prepare('DELETE FROM file_uploads WHERE id=? AND project_id=?').bind(file.id, PROJECT_ID)));
    const remaining = await env.DB.prepare('SELECT COUNT(*) AS count FROM file_uploads WHERE project_id=?').bind(PROJECT_ID).first();
    return json({ done: false, phase: 'files', deleted_files: files.results.length, remaining_files: Number(remaining?.count || 0) });
  }
  const before = await env.DB.prepare('SELECT COUNT(*) AS count FROM documents WHERE project_id=?').bind(PROJECT_ID).first();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM project_invitations WHERE project_id=?').bind(PROJECT_ID),
    env.DB.prepare('DELETE FROM notion_people WHERE project_id=?').bind(PROJECT_ID),
    env.DB.prepare('DELETE FROM notion_imports WHERE project_id=?').bind(PROJECT_ID),
    env.DB.prepare('DELETE FROM workspace_templates WHERE project_id=? AND is_builtin=0').bind(PROJECT_ID),
    env.DB.prepare('DELETE FROM documents WHERE project_id=?').bind(PROJECT_ID),
    env.DB.prepare('DELETE FROM project_members WHERE project_id=? AND user_id<>?').bind(PROJECT_ID, actor.id)
  ]);
  await env.DB.prepare('DELETE FROM users WHERE id<>? AND NOT EXISTS (SELECT 1 FROM project_members m WHERE m.user_id=users.id)').bind(actor.id).run();
  return json({ done: true, phase: 'complete', deleted_documents: Number(before?.count || 0), preserved_user_id: actor.id });
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
  if (!data || ![2, 3].includes(Number(data.version)) || !Array.isArray(data.columns) || !Array.isArray(data.rows)) throw new HttpError(400, '데이터베이스 버전 또는 구조가 올바르지 않습니다.');
  if (String(data.title || '').length > 120 || data.columns.length < 1 || data.columns.length > DATABASE_MAX_COLUMNS || data.rows.length > DATABASE_MAX_ROWS) throw new HttpError(400, '데이터베이스는 최대 ' + DATABASE_MAX_ROWS + '개 작업과 ' + DATABASE_MAX_COLUMNS + '개 속성을 지원합니다.');
  const propertyTypes = new Set(['text', 'select', 'multi_select', 'status', 'person', 'people', 'number', 'date', 'checkbox', 'url', 'email', 'phone_number', 'files', 'relation', 'rollup', 'formula', 'unique_id', 'created_time', 'last_edited_time', 'created_by', 'last_edited_by']);
  const columnIds = new Set();
  const columns = data.columns.map((column) => {
    const id = String(column && column.id || '');
    const name = String(column && column.name || '');
    const type = String(column && column.type || '');
    if (!/^[A-Za-z0-9_-]{3,40}$/.test(id) || columnIds.has(id) || !name || name.length > 80 || !propertyTypes.has(type)) throw new HttpError(400, '데이터베이스 속성 정보가 올바르지 않습니다.');
    const options = [...new Set((Array.isArray(column.options) ? column.options : []).map(value => String(value)))];
    if (options.length > 30 || options.some(value => !value || value.length > 80)) throw new HttpError(400, '선택 속성은 최대 30개 옵션을 지원합니다.');
    columnIds.add(id);
    return { id, name, type, sourceType: String(column && (column.sourceType || column.source_type) || type), sourceId: String(column && (column.sourceId || column.source_id) || ''), options };
  });
  const rowIds = new Set();
  const rows = data.rows.map((row) => {
    const id = String(row && row.id || '');
    if (!/^[A-Za-z0-9_-]{3,50}$/.test(id) || rowIds.has(id) || !row.cells || typeof row.cells !== 'object' || Array.isArray(row.cells)) throw new HttpError(400, '데이터베이스 작업 정보가 올바르지 않습니다.');
    rowIds.add(id);
    const cells = {};
    for (const column of columns) {
      const raw = row.cells[column.id];
      if (column.type === 'checkbox') {
        cells[column.id] = raw === true || raw === 1 || raw === '1' || raw === 'true';
        continue;
      }
      const value = String(raw ?? '');
      const normalized = value.trim();
      if (value.length > 500) throw new HttpError(400, '데이터베이스 셀은 500자 이하여야 합니다.');
      if (column.type === 'number' && normalized && !Number.isFinite(Number(normalized))) throw new HttpError(400, '숫자 속성에는 유효한 숫자만 입력할 수 있습니다.');
      if (column.type === 'date' && normalized && !/^\d{4}-\d{2}-\d{2}(?:T.*|\s+.*)?(?:\s+→\s+\d{4}-\d{2}-\d{2}(?:T.*|\s+.*)?)?$/.test(normalized)) throw new HttpError(400, '날짜 속성은 YYYY-MM-DD 형식이어야 합니다.');
      if (column.type === 'date' && normalized) {
        const dateParts = normalized.split(' → ');
        for (const part of dateParts) { const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(part) ? part + 'T00:00:00Z' : part); if (Number.isNaN(date.getTime()) || (/^\d{4}-\d{2}-\d{2}$/.test(part) && date.toISOString().slice(0, 10) !== part)) throw new HttpError(400, '날짜 속성은 유효한 날짜여야 합니다.'); }
      }
      if (column.type === 'url' && normalized) {
        try {
          const url = new URL(normalized);
          if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol');
        } catch {
          throw new HttpError(400, 'URL 속성에는 http 또는 https 주소만 입력할 수 있습니다.');
        }
      }
      cells[column.id] = value;
    }
    return { id, cells };
  });
  const view = data.view && typeof data.view === 'object' ? data.view : {};
  const filter = view.filter && typeof view.filter === 'object' ? view.filter : {};
  const filterColumn = columnIds.has(String(filter.column || '')) ? String(filter.column) : '';
  const filterOperators = new Set(['contains', 'equals', 'not_equals', 'empty', 'not_empty', 'gte', 'lte']);
  return JSON.stringify({
    version: Number(data.version) === 3 ? 3 : 2,
    title: String(data.title || '작업 목록'),
    columns,
    rows,
    source_id: String(data.source_id || ''),
    views: Array.isArray(data.views) ? data.views.slice(0, 50) : [],
    view: {
      mode: ['table', 'board', 'calendar', 'timeline', 'gallery', 'list'].includes(String(view.mode)) ? String(view.mode) : 'table',
      groupBy: columnIds.has(String(view.groupBy || '')) ? String(view.groupBy) : columns[0].id,
      sortBy: columnIds.has(String(view.sortBy || '')) ? String(view.sortBy) : '',
      sortDir: view.sortDir === 'desc' ? 'desc' : 'asc',
      filter: {
        column: filterColumn,
        operator: filterOperators.has(String(filter.operator || '')) ? String(filter.operator) : 'contains',
        value: String(filter.value || '').slice(0, 120)
      }
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
    if (['image', 'video', 'audio', 'file', 'bookmark', 'embed', 'page_link'].includes(type) && content) {
      // Page links may carry the imported title/document id alongside the URL.
      // Validate the URL inside that envelope while allowing an empty draft link.
      let url = content;
      if (type === 'page_link' && content.trim().startsWith('{')) {
        try {
          const metadata = JSON.parse(content);
          if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new Error('metadata');
          url = String(metadata.url || '');
        } catch {
          throw new HttpError(400, '문서 링크 형식이 올바르지 않습니다.');
        }
      }
      if (url && !/^https?:\/\/[^\s]+$/i.test(url)) throw new HttpError(400, 'URL 블록에는 http 또는 https 주소만 사용할 수 있습니다.');
    }
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
    const indentLevel = INDENTABLE_BLOCK_TYPES.includes(type) && Number.isInteger(requestedIndent) ? Math.max(0, Math.min(4, requestedIndent)) : 0;
    const normalized = normalizeBlockSnapshot({ id, type, content: (type === 'divider' || type === 'toc') ? '' : content, checked: (type === 'todo' || type === 'toggle') && !!block.checked, indent_level: indentLevel });
    return { id: normalized.id, type: normalized.type, content: normalized.content, checked: normalized.checked, indent_level: normalized.indent_level };
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
    parent_title: String(row.parent_title || ''),
    title: row.title,
    page_icon_emoji: String(row.page_icon_emoji || ''),
    page_icon_url: String(row.page_icon_url || ''),
    title_search: row.title_search,
    status: row.status,
    version: Number(row.version),
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
    trashed_at: row.trashed_at == null ? null : Number(row.trashed_at),
    list_sort: row.list_sort == null ? null : row.list_sort,
    is_favorite: !!row.is_favorite,
    has_children: !!row.has_children,
    is_notion_import: !!row.source_page_id,
    is_notion_root: /\/root$/i.test(String(row.source_path || '')),
    child_count: Number(row.child_count || 0),
    has_database: !!row.has_database,
    preview: String(row.preview || ''),
    preview_type: String(row.preview_type || ''),
    search_match: String(row.search_match || '')
  };
}

function publicBlock(row) {
  return { id: row.id, type: row.block_type, content: row.content, position: Number(row.position), checked: !!row.checked, indent_level: Number(row.indent_level || 0) };
}

async function enrichPageLinkBlocks(db, rows) {
  const links = new Map();
  const targetDocumentId = value => {
    const explicit = String(value?.document_id || '');
    if (/^doc_notion(?:db)?_[0-9a-f]{32}$/i.test(explicit)) return explicit;
    const direct = String(value?.url || '').match(/\/doc\/(doc_notion(?:db)?_[0-9a-f]{32})\b/i)?.[1];
    if (direct) return direct;
    const pageId = notionPageIdFromUrl(value?.url || '');
    return pageId ? 'doc_notion_' + pageId : '';
  };
  for (const row of rows || []) {
    if (row.block_type !== 'page_link') continue;
    try {
      const value = JSON.parse(String(row.content || ''));
      const id = targetDocumentId(value);
      if (/^doc_notion(?:db)?_[0-9a-f]{32}$/i.test(id)) links.set(id, null);
    } catch {}
  }
  const ids = [...links.keys()];
  for (let offset = 0; offset < ids.length; offset += 80) {
    const batch = ids.slice(offset, offset + 80);
    const placeholders = batch.map(() => '?').join(',');
    const result = await db.prepare(`SELECT id,page_icon_emoji,page_icon_url FROM documents WHERE project_id=? AND id IN (${placeholders})`).bind(PROJECT_ID, ...batch).all();
    for (const item of result.results || []) links.set(String(item.id), item);
  }
  return (rows || []).map(row => {
    const block = publicBlock(row);
    if (row.block_type !== 'page_link') return block;
    let value;
    try { value = JSON.parse(String(row.content || '')); } catch { value = null; }
    const targetId = targetDocumentId(value);
    const target = links.get(targetId);
    if (target) {
      block.document_id = targetId;
      block.page_icon_emoji = String(target.page_icon_emoji || '');
      block.page_icon_url = String(target.page_icon_url || '');
    }
    return block;
  });
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

function searchTerms(value) {
  return [...new Set(normalizeSearch(value).split(/\s+/).filter(Boolean))].slice(0, 12);
}

function searchText(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/^@qwerty-rich:/, '')
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/gi, (entity) => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' }[entity.toLowerCase()] || ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function searchBlockText(block) {
  const type = String(block?.block_type || '');
  const raw = String(block?.content || '');
  if (type === 'table' || type === 'page_link') {
    try {
      const value = JSON.parse(raw);
      if (type === 'table' && Array.isArray(value)) return value.flatMap((row) => Array.isArray(row) ? row : [row]).map(searchText).join(' · ');
      if (type === 'page_link' && value && typeof value === 'object') return [value.title, value.url].filter(Boolean).map(searchText).join(' · ');
    } catch {}
  }
  return searchText(raw);
}

function searchSnippet(value, terms) {
  const text = searchText(value);
  if (!text) return '';
  const lower = text.toLocaleLowerCase('ko-KR');
  const positions = terms.map((term) => lower.indexOf(term)).filter((position) => position >= 0);
  const matchAt = positions.length ? Math.min(...positions) : 0;
  const start = Math.max(0, matchAt - 72);
  const end = Math.min(text.length, start + 180);
  return (start ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '');
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

async function sha256HexBytes(value) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', value));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
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
  return securedResponse(new Response(value, { headers: { 'content-type': contentType, 'cache-control': 'public, max-age=31536000, immutable' } }));
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
