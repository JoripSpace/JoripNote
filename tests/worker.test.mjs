import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import vm from 'node:vm';

import worker, {
  buildCaptchaSvg,
  escapeXml,
  hashPassword,
  normalizeUsername,
  parseMarkdownBlocks,
  parseCookies,
  validatePassword,
  validateUsername,
  verifyPassword
} from '../worker.js';

class D1Statement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
    this.values = [];
  }
  bind(...values) {
    this.values = values;
    return this;
  }
  async first() {
    return this.database.prepare(this.sql).get(...this.values) || null;
  }
  async all() {
    return { results: this.database.prepare(this.sql).all(...this.values) };
  }
  async run() {
    const result = this.database.prepare(this.sql).run(...this.values);
    return { meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid || 0) } };
  }
}

class D1Database {
  constructor() {
    this.database = new DatabaseSync(':memory:');
    this.database.exec(readFileSync(new URL('../migrations/0001_initial.sql', import.meta.url), 'utf8'));
    this.database.exec(readFileSync(new URL('../migrations/0002_collaborative_documents.sql', import.meta.url), 'utf8'));
    this.database.exec(readFileSync(new URL('../migrations/0003_toggle_blocks.sql', import.meta.url), 'utf8'));
    this.database.exec(readFileSync(new URL('../migrations/0004_extended_blocks_publications.sql', import.meta.url), 'utf8'));
    this.database.exec(readFileSync(new URL('../migrations/0005_block_indentation.sql', import.meta.url), 'utf8'));
    this.database.exec(readFileSync(new URL('../migrations/0006_workspace_collaboration.sql', import.meta.url), 'utf8'));
  }
  prepare(sql) {
    return new D1Statement(this.database, sql);
  }
  async batch(statements) {
    this.database.exec('BEGIN IMMEDIATE');
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.database.exec('COMMIT');
      return results;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }
}

const ORIGIN = 'https://qwerty.example';
const ORIGIN_HEADERS = { origin: ORIGIN, 'cf-connecting-ip': '203.0.113.10' };

function request(path, options = {}) {
  const origin = options.origin || ORIGIN;
  const headers = new Headers(options.headers || {});
  if (options.body && typeof options.body !== 'string') {
    headers.set('content-type', 'application/json');
    options = { ...options, body: JSON.stringify(options.body) };
  }
  const { origin: _origin, ...requestOptions } = options;
  return new Request(origin + path, { ...requestOptions, headers });
}

function cookieFrom(response) {
  return response.headers.get('set-cookie').split(';', 1)[0];
}

async function call(env, path, options = {}) {
  const response = await worker.fetch(request(path, options), env);
  let body = null;
  try {
    body = await response.json();
  } catch {}
  return { response, body };
}

async function addUser(env, { id, username, role, password = 'correct-password', project = 'qwerty', createdAt = 100 }) {
  const salt = 'salt-' + id;
  const hash = await hashPassword(password, salt, 1000);
  env.DB.database.prepare(
    'INSERT INTO users (id,username,password_hash,password_salt,password_iterations,realtime_key,created_at) VALUES (?,?,?,?,?,?,?)'
  ).run(id, username, hash, salt, 1000, 'key-' + id, createdAt);
  if (role) {
    env.DB.database.prepare(
      'INSERT INTO project_members (project_id,user_id,role,joined_at,updated_at) VALUES (?,?,?,?,?)'
    ).run(project, id, role, createdAt, createdAt);
  }
}

async function login(env, username, password = 'correct-password') {
  const result = await call(env, '/api/login', {
    method: 'POST',
    headers: ORIGIN_HEADERS,
    body: { username, password }
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  return cookieFrom(result.response);
}

function auth(cookie, extra = {}) {
  return { ...ORIGIN_HEADERS, cookie, ...extra };
}

function envWithDb() {
  const objects = new Map();
  return {
    DB: new D1Database(),
    STORAGE: {
      async put(key, value) { objects.set(key, value instanceof ArrayBuffer ? new Uint8Array(value) : value); },
      async get(key) { const value = objects.get(key); return value == null ? null : { body: value }; },
      async delete(key) { objects.delete(key); }
    },
    EMAIL_ENCRYPTION_KEY: 'test-encryption-secret-at-least-16',
    EMAIL_BLIND_INDEX_KEY: 'test-blind-index-secret-at-least-16'
  };
}

test('validation and password helpers remain safe', async () => {
  assert.equal(normalizeUsername('  User_01  '), 'User_01');
  assert.equal(validateUsername('User_01'), true);
  assert.equal(validateUsername('한글아이디'), false);
  assert.equal(validatePassword('12345678'), true);
  assert.equal(validatePassword('short'), false);
  const first = await hashPassword('correct horse battery staple', 'salt-one', 1000);
  const second = await hashPassword('correct horse battery staple', 'salt-two', 1000);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('correct horse battery staple', 'salt-one', 1000, first), true);
  assert.deepEqual(parseCookies('a=1; qwerty_session=abc==; theme=light'), {
    a: '1',
    qwerty_session: 'abc==',
    theme: 'light'
  });
  assert.match(buildCaptchaSvg('<A&"'), /&lt;A&amp;&quot;/);
  assert.equal(escapeXml("'<>&\""), '&apos;&lt;&gt;&amp;&quot;');
});

test('app shell, editor capabilities and security headers are served', async () => {
  const home = await worker.fetch(request('/'), {});
  assert.equal(home.status, 200);
  assert.match(home.headers.get('content-security-policy'), /default-src 'self'/);
  assert.match(home.headers.get('content-security-policy'), /font-src 'self' https:\/\/cdn\.jsdelivr\.net/);
  assert.equal(home.headers.get('x-frame-options'), 'DENY');
  const html = await home.text();
  assert.match(html, /<title>JoripNote<\/title>/);
  assert.match(html, /멤버 관리/);
  assert.match(html, /id="auth-view" class="auth-shell" hidden/);
  assert.match(html, /class="wordmark">JoripNote</);
  assert.match(html, /id="setup-view" class="setup-shell" hidden/);
  assert.match(html, /id="setup-form" class="setup-card"/);
  assert.match(html, /관리자 계정 만들기/);
  assert.doesNotMatch(html, /workspace-avatar large">N/);
  assert.doesNotMatch(html, /<h2>로그인<\/h2>/);
  assert.match(html, /id="sidebar-collapse"/);
  assert.match(html, /SUIT@2\/fonts\/variable\/woff2\/SUIT-Variable\.css/);
  assert.match(html, /app\.css\?v=20260903-joripnote-8/);
  assert.match(html, /app\.js\?v=20260903-joripnote-8/);
  assert.match(html, /id="publication-private-option"[^>]+>.*비공개/s);
  assert.match(html, /id="publication-public-option"[^>]+>.*웹에 공개/s);
  assert.match(html, /class="public-try-button" href="https:\/\/joripspace\.com\/marketplace\/joripnote\/">무료로 이용해보기<\/a>/);
  assert.match(html, /id="settings-view" class="page-view settings-page"/);
  assert.doesNotMatch(html, /로그인한 멤버만 접근할 수 있는 협업 문서 공간/);
  assert.match(html, /id="brand-workspace-note"/);
  assert.match(html, /class="workspace-note-logo"/);
  assert.match(html, /class="star-icon"/);
  assert.match(html, /class="boot-spinner"/);
  assert.match(html, /워크스페이스를 여는 중<\/span>/);
  assert.doesNotMatch(html, /boot-mark|워크스페이스를 여는 중…/);
  assert.match(html, /Markdown 업로드/);
  assert.match(html, /textarea id="document-title"/);
  assert.match(html, /id="workspace-access-form"/);
  assert.match(html, /id="ip-access-form"/);
  assert.match(html, /id="ip-tag-editor" class="ip-tag-editor"/);
  assert.match(html, /id="add-current-ip"/);
  assert.match(html, /data-document-width="narrow"/);
  assert.match(html, /id="global-search-dialog"/);
  assert.match(html, /id="publish-dialog"/);
  assert.match(html, /id="inline-toolbar"/);
  assert.match(html, /id="link-dialog"/);
  assert.match(html, /id="link-form"/);
  assert.match(html, /id="icon-link"/);
  assert.match(html, /id="url-paste-menu"/);
  assert.match(html, /<strong>JoripNote<\/strong><small id="sidebar-role"/);
  assert.match(html, /<p class="eyebrow">JoripNote<\/p>/);
  assert.doesNotMatch(html, />qwerty</);
  assert.doesNotMatch(html, />QWERTY</);
  assert.match(html, /id="icon-settings"/);
  assert.match(html, /data-tooltip="사이드바 축소"/);
  assert.match(html, /class="skip-link" href="#main-content">본문으로 건너뛰기/);
  assert.match(html, /id="main-content" class="main-pane" tabindex="-1"/);
  assert.match(html, /id="search-input"[^>]+aria-label="문서 제목 검색"/);
  assert.match(html, /id="save-state" class="save-state" role="status" aria-live="polite"/);
  assert.match(html, /id="invite-dialog" aria-labelledby="invite-dialog-title"/);
  assert.match(html, /id="publish-dialog" aria-labelledby="publish-dialog-title"/);
  assert.match(html, /id="link-dialog" aria-labelledby="link-dialog-title"/);
  assert.match(html, /id="global-search-input"[^>]+role="combobox"[^>]+aria-controls="global-search-results"/);
  assert.match(html, /id="global-search-results"[^>]+role="listbox"/);
  assert.match(html, /id="slash-menu" class="slash-menu" role="menu" aria-label="블록 유형 선택"/);

  const stylesheet = await worker.fetch(request('/app.css'), {});
  const styles = await stylesheet.text();
  assert.match(styles, /\.document-tree>\.empty-state\{padding:14px 8px 18px[^}]*font-size:11px/);
  assert.match(styles, /\.settings-page \.settings-grid\{grid-template-columns:minmax\(0,1fr\);gap:0/);
  assert.match(styles, /\.ip-tag-editor\{display:flex/);
  assert.match(styles, /\.app-shell\.document-width-full \.settings-page\{width:min\(100% - 72px,1440px\)/);
  assert.match(styles, /@media\(max-width:760px\)\{\.settings-page\{width:calc\(100% - 24px\)/);
  assert.match(styles, /select:not\(:disabled\)\{cursor:pointer\}select:disabled\{cursor:not-allowed\}/);
  assert.match(styles, /\.skip-link\{position:fixed/);
  assert.match(styles, /:focus-visible\{outline:2px solid #1f5fbf/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(styles, /\.block-content:empty:before,\.document-title::placeholder\{color:#73726c\}/);
  assert.match(styles, /\.main-nav button \.nav-label\{width:auto/);
  assert.match(styles, /\.document-title:not\(:read-only\),\.block-content\[contenteditable="true"\]\{cursor:text\}/);
  assert.match(styles, /\[data-tooltip\]:hover::after/);
  assert.match(styles, /@keyframes boot-spin/);
  assert.match(styles, /--accent:#59647f/);
  assert.match(styles, /\.url-paste-menu\{position:fixed/);
  assert.match(styles, /\.link-dialog-card\{width:min\(92vw,460px\)/);
  assert.match(styles, /\.publication-options\{display:grid;grid-template-columns:1fr 1fr/);
  assert.match(styles, /@media\(max-width:520px\)\{\.publication-options\{grid-template-columns:1fr\}/);
  assert.match(styles, /\.skeleton::after\{/);
  assert.match(styles, /@keyframes skeleton-sweep/);
  assert.match(styles, /\.document-title\.skeleton-title/);
  assert.match(styles, /\.db-board\{display:flex/);
  assert.match(styles, /\.db-property-head\{display:grid/);
  assert.match(styles, /\.db-card\{display:grid/);
  assert.match(styles, /\/\* Database spacing refinement \*\//);
  assert.match(styles, /\.db-toolbar\{gap:8px;padding:10px 12px;border-bottom:1px solid #ececf0;background:#fbfbfc\}/);
  assert.match(styles, /\.db-table td\.db-cell\{height:44px;padding:6px\}/);
  assert.match(styles, /\.db-footer\{padding:11px 12px;border-top:1px solid #ececf0;background:#fbfbfc\}/);
  assert.match(styles, /grid-template-areas:"name" "type"/);
  assert.match(styles, /\.db-property-head:hover \.db-property-actions/);
  assert.doesNotMatch(styles, /radial-gradient\(circle at 82% 3%/);
  assert.doesNotMatch(styles, /\.document-editor\{width:min\(calc\(100% - 56px\),900px\);margin:24px auto 72px/);

  const script = await worker.fetch(request('/app.js'), {});
  const source = await script.text();
  assert.doesNotThrow(() => new vm.Script(source));
  assert.match(source, /scheduleSave/);
  assert.match(source, /editRevision/);
  assert.match(source, /beforeunload/);
  assert.match(source, /heading1/);
  assert.match(source, /showSlashMenu/);
  assert.match(source, /applyInputShortcut/);
  assert.match(source, /CONTINUING_BLOCK_TYPES=new Set\(\['bullet','numbered','todo'\]\)/);
  assert.match(source, /function splitEditableBlock/);
  assert.match(source, /function mergeWithPrevious/);
  assert.match(source, /function changeListIndent/);
  assert.match(source, /application\/x-qwerty-blocks/);
  assert.match(source, /function openUrlPasteMenu/);
  assert.match(source, /function openLinkDialog/);
  assert.match(source, /async function setPublication\(nextPublished\)/);
  assert.match(source, /nextPublished\?'PUT':'DELETE'/);
  assert.match(source, /function restoreInlineSelection/);
  assert.match(source, /const BLOCK_A11Y_LABELS=/);
  assert.match(source, /el\.setAttribute\('role','textbox'\)/);
  assert.match(source, /el\.setAttribute\('aria-multiline','true'\)/);
  assert.match(source, /select\.setAttribute\('aria-label',member\.username\+' 역할'\)/);
  assert.match(source, /input\.setAttribute\('aria-label',\(mediaLabels\[block\.type\]/);
  assert.match(source, /button\.role='menuitem'/);
  assert.match(source, /button\.role='option'/);
  assert.match(source, /document\.querySelector\('\.skip-link'\)\.onclick=/);
  assert.match(source, /올바른 웹 주소를 입력하세요/);
  assert.doesNotMatch(source, /prompt\('연결할 웹 주소/);
  assert.match(source, /function loadingMarkup/);
  assert.match(source, /showLoading\('block-editor','document',5\)/);
  assert.match(source, /showLoading\('member-list','member',4\)/);
  assert.doesNotMatch(source, /<div class="empty-state">불러오는 중…<\/div>/);
  assert.match(source, /safeEmbedUrl\(url\)\?'embed':'bookmark'/);
  assert.match(source, /strict-origin-when-cross-origin/);
  assert.match(source, /URL을 어떻게 붙여넣을까요\?/);
  assert.match(source, /function undoDocument/);
  assert.match(source, /CONTINUING_BLOCK_TYPES\.has\(type\)&&!el\.textContent\.trim\(\)/);
  assert.match(source, /\['toggle','>','토글 목록'/);
  assert.match(source, /'\[\]':\['todo',false\]/);
  assert.match(source, /setFavoriteButton/);
  assert.match(source, /const icon=/);
  assert.match(source, /blockIconName/);
  assert.match(source, /dragstart/);
  assert.match(source, /handleSlashKey/);
  assert.match(source, /bindBlockInteractions/);
  assert.match(source, /showBlockMenu/);
  assert.match(source, /contextmenu/);
  assert.match(source, /function push\(path\)\{setSidebar\(false\)/);
  assert.match(source, /function updateDocumentChrome/);
  assert.match(source, /function resizeDocumentTitle/);
  assert.match(source, /addEventListener\('resize',resizeDocumentTitle\)/);
  assert.match(source, /visibleRoles=allowed\.includes\(member\.role\)/);
  assert.match(source, /notion-import-input/);
  assert.match(source, /function setSidebarCollapsed/);
  assert.match(source, /qwerty_sidebar_collapsed/);
  assert.match(source, /function setDocumentWidth/);
  assert.match(source, /function setupIpTagEditor/);
  assert.match(source, /function normalizeIpEntries/);
  assert.match(source, /state\.ipAllowlist\.join\('\\n'\)/);
  assert.match(source, /joripnote_document_width/);
  assert.match(source, /\/api\/settings/);
  assert.match(source, /\/api\/register/);
  assert.match(source, /openGlobalSearch/);
  assert.match(source, /openPublicationDialog/);
  assert.match(source, /structuredTableBlock/);
  assert.match(source, /function parseDatabaseModel/);
  assert.match(source, /function renderDatabaseBoard/);
  assert.match(source, /function renderDatabaseTable/);
  assert.match(source, /function databaseFilterControls/);
  assert.match(source, /조건에 맞는 작업이 없습니다/);
  assert.match(source, /DATABASE_PROPERTY_TYPES=\{text:'텍스트',select:'선택',person:'담당자'/);
  assert.match(source, /type==='database'\?100000:20000/);
  assert.match(source, /const next='\/search'\+\(state\.search\?'\?q='/);
  assert.match(source, /new URLSearchParams\(location\.search\)\.get\('q'\)/);
  assert.equal(
    [...source.matchAll(/const form=new FormData\(formEl\);alertBox\('[^']+',''\);busy\(formEl,true\)/g)].length,
    2,
    '로그인과 초대 수락 폼은 입력값을 읽은 뒤 컨트롤을 비활성화해야 한다'
  );
  assert.doesNotMatch(source, /실시간 공동 편집|AI 작성/);
  assert.match(source, /openHistoryDialog/);
  assert.match(source, /openCommentsDialog/);
  assert.match(source, /showNotifications/);
  assert.match(source, /showTemplates/);
  assert.match(source, /file-upload-input/);
  assert.match(source, /openAccessDialog/);

  const health = await worker.fetch(request('/health'), {});
  assert.deepEqual(await health.json(), { ok: true, service: 'joripnote' });
  const missingPage = await worker.fetch(request('/missing-page'), {});
  assert.equal(missingPage.status, 404);
  assert.equal(await missingPage.text(), '페이지를 찾을 수 없습니다.');
  for (const route of ['/', '/setup', '/all', '/recent', '/favorites', '/trash', '/search?q=team', '/members', '/settings', '/notifications', '/templates', '/doc/doc_12345678', '/public/pub_12345678', '/invite/' + 'a'.repeat(32)]) {
    const page = await worker.fetch(request(route), {});
    assert.equal(page.status, 200, route);
    assert.match(page.headers.get('content-type'), /text\/html/, route);
  }
});

test('versions, comments, mentions, notifications, templates, uploads and document access work together', async () => {
  const env = envWithDb();
  await addUser(env, { id: 'usr_featureowner', username: 'featureowner', role: 'owner' });
  await addUser(env, { id: 'usr_featuremember', username: 'featuremember', role: 'member' });
  await addUser(env, { id: 'usr_featureviewer', username: 'featureviewer', role: 'viewer' });
  const ownerCookie = await login(env, 'featureowner');
  const memberCookie = await login(env, 'featuremember');
  const viewerCookie = await login(env, 'featureviewer');

  const created = await call(env, '/api/documents', { method: 'POST', headers: auth(ownerCookie), body: {} });
  const id = created.body.document.id;
  const saved = await call(env, '/api/documents/' + id, {
    method: 'PUT',
    headers: auth(ownerCookie),
    body: { title: '기능 문서', version: 1, save_id: 'snap_featureversion01', blocks: [{ id: 'blk_featureversion1', type: 'text', content: '두 번째 내용' }] }
  });
  assert.equal(saved.response.status, 200, JSON.stringify(saved.body));
  const versions = await call(env, '/api/documents/' + id + '/versions', { headers: { cookie: ownerCookie } });
  assert.deepEqual(versions.body.versions.map((item) => item.version), [2, 1]);
  const restored = await call(env, '/api/documents/' + id + '/versions/1/restore', { method: 'POST', headers: auth(ownerCookie), body: {} });
  assert.equal(restored.body.version, 3);

  const comment = await call(env, '/api/documents/' + id + '/comments', {
    method: 'POST',
    headers: auth(ownerCookie),
    body: { body: '@featuremember 검토 부탁합니다.' }
  });
  assert.equal(comment.response.status, 201, JSON.stringify(comment.body));
  const memberNotifications = await call(env, '/api/notifications', { headers: { cookie: memberCookie } });
  assert.equal(memberNotifications.body.unread_count, 1);
  assert.match(memberNotifications.body.notifications[0].message, /언급/);
  assert.equal((await call(env, '/api/notifications/read', { method: 'POST', headers: auth(memberCookie), body: { all: true } })).response.status, 200);

  const templates = await call(env, '/api/templates', { headers: { cookie: ownerCookie } });
  assert.ok(templates.body.templates.length >= 3);
  const fromTemplate = await call(env, '/api/templates/tpl_meeting/documents', { method: 'POST', headers: auth(ownerCookie), body: {} });
  assert.equal(fromTemplate.response.status, 201, JSON.stringify(fromTemplate.body));
  assert.equal((await call(env, '/api/documents/' + fromTemplate.body.document.id, { headers: { cookie: ownerCookie } })).body.document.title, '회의록');

  const form = new FormData();
  form.append('file', new File([new TextEncoder().encode('hello')], 'hello.txt', { type: 'text/plain' }));
  const uploadResponse = await worker.fetch(new Request(ORIGIN + '/api/documents/' + id + '/files', {
    method: 'POST',
    headers: auth(ownerCookie),
    body: form
  }), env);
  const upload = await uploadResponse.json();
  assert.equal(uploadResponse.status, 201, JSON.stringify(upload));
  const download = await worker.fetch(request('/api/files/' + upload.file.id, { headers: { cookie: ownerCookie } }), env);
  assert.equal(download.status, 200);
  assert.equal(await download.text(), 'hello');
  assert.equal(download.headers.get('cache-control'), 'private, no-store');

  const access = await call(env, '/api/documents/' + id + '/access', {
    method: 'PUT',
    headers: auth(ownerCookie),
    body: { visibility: 'restricted', grants: [{ user_id: 'usr_featuremember', permission: 'viewer' }] }
  });
  assert.equal(access.response.status, 200, JSON.stringify(access.body));
  const memberRead = await call(env, '/api/documents/' + id, { headers: { cookie: memberCookie } });
  assert.equal(memberRead.response.status, 200);
  assert.equal(memberRead.body.document.can_edit, false);
  assert.equal((await call(env, '/api/documents/' + id, {
    method: 'PUT',
    headers: auth(memberCookie),
    body: { title: '차단', version: 3, save_id: 'snap_deniedfeature01', blocks: [{ id: 'blk_deniedfeature1', type: 'text', content: '차단' }] }
  })).response.status, 403);
  assert.equal((await call(env, '/api/documents/' + id, { headers: { cookie: viewerCookie } })).response.status, 404);
  const viewerList = await call(env, '/api/documents?scope=all', { headers: { cookie: viewerCookie } });
  assert.ok(!viewerList.body.documents.some((document) => document.id === id));

  const activity = await call(env, '/api/activity', { headers: { cookie: ownerCookie } });
  assert.ok(activity.body.events.some((event) => event.document_id === id));
});

test('Notion Markdown imports supported blocks and documents can be duplicated', async () => {
  const parsed = parseMarkdownBlocks('# 가져온 문서\n## 개요\n#### 세부\n- 항목\n- [x] 완료\n> 인용\n![화면](https://example.com/image.png)\n[참고](https://example.com/guide)\n```js\nconst ok = true;\n```\n---');
  assert.equal(parsed.title, '가져온 문서');
  assert.deepEqual(parsed.blocks.map((block) => block.type), ['heading2', 'heading4', 'bullet', 'todo', 'quote', 'image', 'bookmark', 'code', 'divider']);
  assert.equal(parsed.blocks[3].checked, true);

  const env = envWithDb();
  await addUser(env, { id: 'usr_owner0001', username: 'owner', role: 'owner' });
  const cookie = await login(env, 'owner');
  const imported = await call(env, '/api/import/markdown', {
    method: 'POST',
    headers: auth(cookie),
    body: { filename: 'notion-export.md', content: '# 가져온 문서\n본문\n- 목록' }
  });
  assert.equal(imported.response.status, 201, JSON.stringify(imported.body));
  const original = await call(env, '/api/documents/' + imported.body.document.id, { headers: { cookie } });
  assert.equal(original.body.document.title, '가져온 문서');
  assert.deepEqual(original.body.document.blocks.map((block) => block.type), ['text', 'bullet']);

  const duplicated = await call(env, '/api/documents/' + imported.body.document.id + '/duplicate', {
    method: 'POST',
    headers: auth(cookie)
  });
  assert.equal(duplicated.response.status, 201, JSON.stringify(duplicated.body));
  const copy = await call(env, '/api/documents/' + duplicated.body.document.id, { headers: { cookie } });
  assert.match(copy.body.document.title, /복사본$/);
  assert.deepEqual(copy.body.document.blocks.map((block) => block.content), ['본문', '목록']);
});

test('authentication requires qwerty membership and blocks public signup after bootstrap', async () => {
  const env = envWithDb();
  await addUser(env, { id: 'usr_owner0001', username: 'owner', role: 'owner' });
  await addUser(env, { id: 'usr_outside01', username: 'outside', role: 'member', project: 'another-project' });

  const noCookie = await call(env, '/api/documents');
  assert.equal(noCookie.response.status, 401);

  const outsiderLogin = await call(env, '/api/login', {
    method: 'POST',
    headers: ORIGIN_HEADERS,
    body: { username: 'outside', password: 'correct-password' }
  });
  assert.equal(outsiderLogin.response.status, 403);

  const signup = await call(env, '/api/bootstrap-signup', {
    method: 'POST',
    headers: ORIGIN_HEADERS,
    body: { username: 'public_user', password: 'correct-password' }
  });
  assert.equal(signup.response.status, 403);
});

test('first-run setup installs exactly one owner and seeds builtin templates', async () => {
  const env = envWithDb();
  const before = await call(env, '/api/setup-status');
  assert.equal(before.response.status, 200);
  assert.equal(before.body.installed, false);

  const mismatch = await call(env, '/api/setup', {
    method: 'POST',
    headers: ORIGIN_HEADERS,
    body: { username: 'first_owner', password: 'secure-password', password_confirmation: 'different-password' }
  });
  assert.equal(mismatch.response.status, 400);

  const installed = await call(env, '/api/setup', {
    method: 'POST',
    headers: ORIGIN_HEADERS,
    body: { username: 'first_owner', password: 'secure-password', password_confirmation: 'secure-password' }
  });
  assert.equal(installed.response.status, 201, JSON.stringify(installed.body));
  assert.equal(installed.body.membership.role, 'owner');
  assert.match(installed.response.headers.get('set-cookie'), /qwerty_session=/);
  assert.equal(env.DB.database.prepare("SELECT COUNT(*) AS count FROM project_members WHERE project_id='qwerty' AND role='owner'").get().count, 1);
  assert.equal(env.DB.database.prepare("SELECT COUNT(*) AS count FROM workspace_templates WHERE project_id='qwerty' AND is_builtin=1").get().count, 3);

  const after = await call(env, '/api/setup-status');
  assert.equal(after.body.installed, true);
  const repeated = await call(env, '/api/setup', {
    method: 'POST',
    headers: ORIGIN_HEADERS,
    body: { username: 'second_owner', password: 'secure-password', password_confirmation: 'secure-password' }
  });
  assert.equal(repeated.response.status, 409);
});

test('release build requires first-run setup and exposes no demo reset endpoint', async () => {
  const env = envWithDb();
  const origin = 'https://joripnote.joripspace.run';
  const status = await call(env, '/api/setup-status', { origin });
  assert.equal(status.response.status, 200);
  assert.equal(status.body.installed, false);
  assert.equal('demo_mode' in status.body, false);
  assert.equal(status.response.headers.get('set-cookie'), null);
  const reset = await call(env, '/__joripnote_demo/reset', { origin, method: 'POST' });
  assert.equal(reset.response.status, 404);
  assert.equal(env.DB.database.prepare("SELECT COUNT(*) AS count FROM documents WHERE project_id='qwerty'").get().count, 0);
  assert.equal(env.DB.database.prepare("SELECT COUNT(*) AS count FROM project_members WHERE project_id='qwerty'").get().count, 0);
});

test('Owner controls public signup roles and exact IP access without locking out the current IP', async () => {
  const env = envWithDb();
  await addUser(env, { id: 'usr_policyowner', username: 'policyowner', role: 'owner' });
  await addUser(env, { id: 'usr_policymember', username: 'policymember', role: 'member' });
  const ownerCookie = await login(env, 'policyowner');
  const memberCookie = await login(env, 'policymember');

  const initial = await call(env, '/api/settings', { headers: auth(ownerCookie) });
  assert.equal(initial.response.status, 200);
  assert.equal(initial.body.public_signup_enabled, false);
  assert.equal(initial.body.current_ip, '203.0.113.10');

  const memberUpdate = await call(env, '/api/settings', {
    method: 'PATCH', headers: auth(memberCookie), body: { public_signup_enabled: true }
  });
  assert.equal(memberUpdate.response.status, 403);

  const signupPolicy = await call(env, '/api/settings', {
    method: 'PATCH', headers: auth(ownerCookie), body: { public_signup_enabled: true, public_signup_role: 'viewer' }
  });
  assert.equal(signupPolicy.response.status, 200);
  assert.equal(signupPolicy.body.public_signup_role, 'viewer');
  assert.equal((await call(env, '/api/setup-status')).body.public_signup_enabled, true);

  const registered = await call(env, '/api/register', {
    method: 'POST', headers: ORIGIN_HEADERS,
    body: { username: 'self_joined', password: 'secure-password', password_confirmation: 'secure-password' }
  });
  assert.equal(registered.response.status, 201, JSON.stringify(registered.body));
  assert.equal(registered.body.membership.role, 'viewer');

  const unsafeIpPolicy = await call(env, '/api/settings', {
    method: 'PATCH', headers: auth(ownerCookie),
    body: { ip_allowlist_enabled: true, ip_allowlist: '198.51.100.20' }
  });
  assert.equal(unsafeIpPolicy.response.status, 400);
  assert.equal(unsafeIpPolicy.body.current_ip, '203.0.113.10');

  const safeIpPolicy = await call(env, '/api/settings', {
    method: 'PATCH', headers: auth(ownerCookie),
    body: { ip_allowlist_enabled: true, ip_allowlist: '203.0.113.10\n198.51.100.20' }
  });
  assert.equal(safeIpPolicy.response.status, 200, JSON.stringify(safeIpPolicy.body));
  assert.equal(safeIpPolicy.body.ip_allowlist_enabled, true);

  const blockedLogin = await call(env, '/api/login', {
    method: 'POST',
    headers: { origin: ORIGIN, 'cf-connecting-ip': '192.0.2.30' },
    body: { username: 'policyowner', password: 'correct-password' }
  });
  assert.equal(blockedLogin.response.status, 403);
  const publicStatus = await call(env, '/api/setup-status', { headers: { 'cf-connecting-ip': '192.0.2.30' } });
  assert.equal(publicStatus.response.status, 200);
});

test('documents support hierarchy, all block types, autosave persistence, favorites, recent, search and trash', async () => {
  const env = envWithDb();
  await addUser(env, { id: 'usr_owner0001', username: 'owner', role: 'owner' });
  const cookie = await login(env, 'owner');

  const created = await call(env, '/api/documents', {
    method: 'POST',
    headers: auth(cookie),
    body: {}
  });
  assert.equal(created.response.status, 201);
  const parentId = created.body.document.id;
  const databaseContent = JSON.stringify({
    version: 2,
    title: '팀 작업',
    columns: [
      { id: 'col_title', name: '작업', type: 'text', options: [] },
      { id: 'col_status', name: '상태', type: 'select', options: ['예정', '진행 중', '완료'] },
      { id: 'col_owner', name: '담당자', type: 'person', options: [] },
      { id: 'col_due', name: '마감일', type: 'date', options: [] }
    ],
    rows: [
      { id: 'row_first', cells: { col_title: '출시 준비', col_status: '진행 중', col_owner: '민수', col_due: '2026-08-01' } }
    ],
    view: { mode: 'board', groupBy: 'col_status', sortBy: 'col_due', sortDir: 'asc' }
  });
  const types = ['text', 'heading1', 'heading2', 'heading3', 'heading4', 'bullet', 'numbered', 'todo', 'quote', 'code', 'divider', 'toggle', 'callout', 'table', 'database', 'toc', 'math', 'bookmark', 'image', 'video', 'audio', 'file', 'embed', 'page_link'];
  const blocks = types.map((type, index) => ({
    id: 'blk_type' + String(index).padStart(4, '0'),
    type,
    content: type === 'text'
      ? '@qwerty-rich:<strong>굵게</strong><script>alert(1)</script><a href="javascript:alert(1)">차단</a>'
      : type === 'divider' || type === 'toc'
      ? 'ignored'
      : type === 'database'
        ? databaseContent
      : type === 'table'
        ? JSON.stringify([['이름', '상태'], ['문서', '진행']])
        : ['bookmark', 'image', 'video', 'audio', 'file', 'embed', 'page_link'].includes(type)
          ? 'https://example.com/' + type
          : type + ' 내용',
    checked: type === 'todo' || type === 'toggle',
    position: index,
    indent_level: type === 'bullet' ? 2 : type === 'heading1' ? 3 : 0
  }));
  const saved = await call(env, '/api/documents/' + parentId, {
    method: 'PUT',
    headers: auth(cookie),
    body: { title: '제품 기획', version: 1, save_id: 'snap_firstsave0000001', blocks }
  });
  assert.equal(saved.response.status, 200, JSON.stringify(saved.body));
  assert.equal(saved.body.version, 2);

  const reloaded = await call(env, '/api/documents/' + parentId, { headers: { cookie } });
  assert.equal(reloaded.body.document.title, '제품 기획');
  assert.deepEqual(reloaded.body.document.blocks.map((block) => block.type), types);
  assert.equal(reloaded.body.document.blocks.find((block) => block.type === 'todo').checked, true);
  assert.equal(reloaded.body.document.blocks.find((block) => block.type === 'toggle').checked, true);
  assert.equal(reloaded.body.document.blocks.find((block) => block.type === 'bullet').indent_level, 2);
  assert.equal(reloaded.body.document.blocks.find((block) => block.type === 'heading1').indent_level, 0);
  assert.equal(reloaded.body.document.blocks.find((block) => block.type === 'divider').content, '');
  assert.equal(reloaded.body.document.blocks.find((block) => block.type === 'toc').content, '');
  const database = JSON.parse(reloaded.body.document.blocks.find((block) => block.type === 'database').content);
  assert.equal(database.version, 2);
  assert.equal(database.view.mode, 'board');
  assert.equal(database.rows[0].cells.col_status, '진행 중');
  assert.equal(database.columns.find((column) => column.id === 'col_owner').type, 'person');
  const richText = reloaded.body.document.blocks.find((block) => block.type === 'text').content;
  assert.match(richText, /<strong>굵게<\/strong>/);
  assert.doesNotMatch(richText, /<script|javascript:/i);

  const child = await call(env, '/api/documents', {
    method: 'POST',
    headers: auth(cookie),
    body: { parent_document_id: parentId }
  });
  assert.equal(child.response.status, 201);
  const childId = child.body.document.id;
  const roots = await call(env, '/api/documents?scope=all&limit=20', { headers: { cookie } });
  assert.equal(roots.body.documents.length, 1);
  assert.equal(roots.body.documents[0].has_children, true);
  const children = await call(env, '/api/documents?scope=all&parent_id=' + parentId + '&limit=20', { headers: { cookie } });
  assert.deepEqual(children.body.documents.map((doc) => doc.id), [childId]);

  assert.equal((await call(env, '/api/documents/' + parentId + '/favorite', { method: 'PUT', headers: auth(cookie) })).response.status, 200);
  const favorites = await call(env, '/api/documents?scope=favorites&limit=20', { headers: { cookie } });
  assert.deepEqual(favorites.body.documents.map((doc) => doc.id), [parentId]);
  const recent = await call(env, '/api/documents?scope=recent&limit=20', { headers: { cookie } });
  assert.ok(recent.body.documents.some((doc) => doc.id === parentId));
  const search = await call(env, '/api/documents?scope=search&q=' + encodeURIComponent('제품') + '&limit=20', { headers: { cookie } });
  assert.deepEqual(search.body.documents.map((doc) => doc.id), [parentId]);
  const contentSearch = await call(env, '/api/documents?scope=search&q=' + encodeURIComponent('heading4') + '&limit=20', { headers: { cookie } });
  assert.deepEqual(contentSearch.body.documents.map((doc) => doc.id), [parentId]);

  assert.equal((await call(env, '/api/documents/' + parentId + '/trash', { method: 'POST', headers: auth(cookie) })).response.status, 200);
  const trash = await call(env, '/api/documents?scope=trash&limit=20', { headers: { cookie } });
  assert.deepEqual(trash.body.documents.map((doc) => doc.id), [parentId]);
  assert.equal((await call(env, '/api/documents/' + childId + '/restore', { method: 'POST', headers: auth(cookie) })).response.status, 409);
  assert.equal((await call(env, '/api/documents/' + parentId + '/restore', { method: 'POST', headers: auth(cookie) })).response.status, 200);
  assert.equal((await call(env, '/api/documents/' + parentId + '/trash', { method: 'POST', headers: auth(cookie) })).response.status, 200);
  assert.equal((await call(env, '/api/documents/' + parentId, { method: 'DELETE', headers: auth(cookie) })).response.status, 200);
  assert.equal(env.DB.database.prepare('SELECT COUNT(*) AS count FROM documents').get().count, 0);
});

test('database cells enforce typed values and persist safe filters', async () => {
  const env = envWithDb();
  await addUser(env, { id: 'usr_owner0001', username: 'owner', role: 'owner' });
  const cookie = await login(env, 'owner');
  const created = await call(env, '/api/documents', { method: 'POST', headers: auth(cookie), body: {} });
  const id = created.body.document.id;
  const database = {
    version: 2,
    title: '형식 검사',
    columns: [
      { id: 'col_text', name: '이름', type: 'text', options: [] },
      { id: 'col_num', name: '수량', type: 'number', options: [] },
      { id: 'col_date', name: '날짜', type: 'date', options: [] },
      { id: 'col_url', name: '링크', type: 'url', options: [] },
      { id: 'col_done', name: '완료', type: 'checkbox', options: [] },
      { id: 'col_status', name: '상태', type: 'select', options: ['진행 중', '완료'] }
    ],
    rows: [{ id: 'row_typed01', cells: { col_text: '  공백 보존  ', col_num: '12.50', col_date: '2026-02-28', col_url: 'https://example.com/docs', col_done: 'false', col_status: '진행 중' } }],
    view: { mode: 'table', groupBy: 'col_status', sortBy: 'col_num', sortDir: 'desc', filter: { column: 'col_status', operator: 'equals', value: '진행 중' } }
  };
  for (const [column, value] of [['col_num', '많음'], ['col_date', '2026-02-30'], ['col_url', 'javascript:alert(1)']]) {
    const invalid = structuredClone(database);
    invalid.rows[0].cells[column] = value;
    const result = await call(env, '/api/documents/' + id, {
      method: 'PUT',
      headers: auth(cookie),
      body: { title: '형식 검사', version: 1, save_id: 'snap_invalid_case_' + column, blocks: [{ id: 'blk_database1', type: 'database', content: JSON.stringify(invalid) }] }
    });
    assert.equal(result.response.status, 400, column);
  }
  const saved = await call(env, '/api/documents/' + id, {
    method: 'PUT',
    headers: auth(cookie),
    body: { title: '형식 검사', version: 1, save_id: 'snap_valid_database_001', blocks: [{ id: 'blk_database1', type: 'database', content: JSON.stringify(database) }] }
  });
  assert.equal(saved.response.status, 200, JSON.stringify(saved.body));
  const reloaded = await call(env, '/api/documents/' + id, { headers: { cookie } });
  const persisted = JSON.parse(reloaded.body.document.blocks[0].content);
  assert.equal(persisted.rows[0].cells.col_text, '  공백 보존  ');
  assert.equal(persisted.rows[0].cells.col_done, false);
  assert.deepEqual(persisted.view.filter, { column: 'col_status', operator: 'equals', value: '진행 중' });
});

test('Owner and Admin can publish documents while anonymous readers only see published content', async () => {
  const env = envWithDb();
  await addUser(env, { id: 'usr_publishowner', username: 'publishowner', role: 'owner' });
  await addUser(env, { id: 'usr_publishmember', username: 'publishmember', role: 'member' });
  const ownerCookie = await login(env, 'publishowner');
  const memberCookie = await login(env, 'publishmember');
  const created = await call(env, '/api/documents', { method: 'POST', headers: auth(ownerCookie), body: {} });
  const id = created.body.document.id;

  const privateRead = await call(env, '/api/public/documents/' + id);
  assert.equal(privateRead.response.status, 404);
  const memberPublish = await call(env, '/api/documents/' + id + '/publication', { method: 'PUT', headers: auth(memberCookie) });
  assert.equal(memberPublish.response.status, 403);

  const published = await call(env, '/api/documents/' + id + '/publication', { method: 'PUT', headers: auth(ownerCookie) });
  assert.equal(published.response.status, 200);
  assert.equal(published.body.published, true);
  assert.equal(published.body.public_url, ORIGIN + '/public/' + id);
  const publicRead = await call(env, '/api/public/documents/' + id);
  assert.equal(publicRead.response.status, 200);
  assert.equal(publicRead.body.document.id, id);
  assert.equal((await worker.fetch(request('/public/' + id), {})).status, 200);

  const unpublished = await call(env, '/api/documents/' + id + '/publication', { method: 'DELETE', headers: auth(ownerCookie) });
  assert.equal(unpublished.body.published, false);
  assert.equal((await call(env, '/api/public/documents/' + id)).response.status, 404);
});

test('cursor pagination is stable and stale autosave requests cannot overwrite newer content', async () => {
  const env = envWithDb();
  await addUser(env, { id: 'usr_owner0001', username: 'owner', role: 'owner' });
  const cookie = await login(env, 'owner');
  const ids = [];
  for (let index = 0; index < 5; index += 1) {
    const created = await call(env, '/api/documents', { method: 'POST', headers: auth(cookie), body: {} });
    ids.push(created.body.document.id);
    env.DB.database.prepare('UPDATE documents SET updated_at=? WHERE id=?').run(1000 + index, created.body.document.id);
  }
  const first = await call(env, '/api/documents?scope=all&limit=2', { headers: { cookie } });
  assert.equal(first.body.documents.length, 2);
  assert.ok(first.body.next_cursor);
  const second = await call(env, '/api/documents?scope=all&limit=2&cursor=' + encodeURIComponent(first.body.next_cursor), { headers: { cookie } });
  assert.equal(second.body.documents.length, 2);
  assert.equal(new Set([...first.body.documents, ...second.body.documents].map((doc) => doc.id)).size, 4);

  const documentId = ids[0];
  const latest = await call(env, '/api/documents/' + documentId, {
    method: 'PUT',
    headers: auth(cookie),
    body: {
      title: '최신 제목',
      version: 1,
      save_id: 'snap_latestrequest0001',
      blocks: [{ id: 'blk_latest0001', type: 'text', content: '최신 내용' }]
    }
  });
  assert.equal(latest.response.status, 200);
  const stale = await call(env, '/api/documents/' + documentId, {
    method: 'PUT',
    headers: auth(cookie),
    body: {
      title: '오래된 제목',
      version: 1,
      save_id: 'snap_stalerequest00001',
      blocks: [{ id: 'blk_stale00001', type: 'text', content: '오래된 내용' }]
    }
  });
  assert.equal(stale.response.status, 409);
  const result = await call(env, '/api/documents/' + documentId, { headers: { cookie } });
  assert.equal(result.body.document.title, '최신 제목');
  assert.equal(result.body.document.blocks[0].content, '최신 내용');
});

test('Viewer is read-only, Member edits documents, and project-scoped IDs block cross-project access', async () => {
  const env = envWithDb();
  await addUser(env, { id: 'usr_owner0001', username: 'owner', role: 'owner' });
  await addUser(env, { id: 'usr_member001', username: 'member', role: 'member' });
  await addUser(env, { id: 'usr_viewer001', username: 'viewer', role: 'viewer' });
  const ownerCookie = await login(env, 'owner');
  const memberCookie = await login(env, 'member');
  const viewerCookie = await login(env, 'viewer');
  const created = await call(env, '/api/documents', { method: 'POST', headers: auth(ownerCookie), body: {} });

  assert.equal((await call(env, '/api/documents', { method: 'POST', headers: auth(viewerCookie), body: {} })).response.status, 403);
  assert.equal((await call(env, '/api/documents/' + created.body.document.id + '/trash', { method: 'POST', headers: auth(viewerCookie) })).response.status, 403);
  assert.equal((await call(env, '/api/documents', { method: 'POST', headers: auth(memberCookie), body: {} })).response.status, 201);

  env.DB.database.prepare(`INSERT INTO documents
    (id,project_id,title,title_search,status,version,active_snapshot_id,created_by,updated_by,created_at,updated_at)
    VALUES ('doc_crossproject01','other-project','비밀','비밀','active',1,'snap_crossproject01',?,?,1,1)`)
    .run('usr_owner0001', 'usr_owner0001');
  const cross = await call(env, '/api/documents/doc_crossproject01', { headers: { cookie: ownerCookie } });
  assert.equal(cross.response.status, 404);
});

test('role changes enforce Admin limits and protect the last Owner', async () => {
  const env = envWithDb();
  await addUser(env, { id: 'usr_owner0001', username: 'owner', role: 'owner' });
  await addUser(env, { id: 'usr_admin0001', username: 'admin', role: 'admin' });
  await addUser(env, { id: 'usr_member001', username: 'member', role: 'member' });
  const ownerCookie = await login(env, 'owner');
  const adminCookie = await login(env, 'admin');

  const lastOwner = await call(env, '/api/members/usr_owner0001', {
    method: 'PATCH',
    headers: auth(ownerCookie),
    body: { role: 'admin' }
  });
  assert.equal(lastOwner.response.status, 409);
  assert.match(lastOwner.body.error, /마지막 Owner/);

  const adminPromote = await call(env, '/api/members/usr_member001', {
    method: 'PATCH',
    headers: auth(adminCookie),
    body: { role: 'admin' }
  });
  assert.equal(adminPromote.response.status, 403);
  assert.equal((await call(env, '/api/members/usr_member001', { method: 'DELETE', headers: auth(adminCookie) })).response.status, 403);
  assert.equal((await call(env, '/api/members/usr_member001', {
    method: 'PATCH',
    headers: auth(adminCookie),
    body: { role: 'viewer' }
  })).response.status, 200);
  assert.equal((await call(env, '/api/members/usr_admin0001', { method: 'DELETE', headers: auth(ownerCookie) })).response.status, 200);
});

test('invitations encrypt email, hash tokens, expire, cancel, rotate on resend and reject reuse', async () => {
  const env = envWithDb();
  const sent = [];
  env.MAIL = { send: async (message) => sent.push(message) };
  await addUser(env, { id: 'usr_owner0001', username: 'owner', role: 'owner' });
  const cookie = await login(env, 'owner');

  const created = await call(env, '/api/invitations', {
    method: 'POST',
    headers: auth(cookie),
    body: { email: 'Invitee@Example.com', role: 'member' }
  });
  assert.equal(created.response.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.delivery, 'sent');
  assert.equal(sent.length, 1);
  const token = new URL(created.body.invite_url).pathname.split('/').at(-1);
  const stored = env.DB.database.prepare('SELECT * FROM project_invitations WHERE id=?').get(created.body.invitation.id);
  assert.notEqual(stored.email_ciphertext, 'invitee@example.com');
  assert.doesNotMatch(JSON.stringify(stored), new RegExp(token));
  assert.equal(stored.token_hash.length, 64);

  const preview = await call(env, '/api/invitations/' + token);
  assert.equal(preview.response.status, 200);
  assert.match(preview.body.email_hint, /\*\*\*@example\.com/);
  const accepted = await call(env, '/api/invitations/' + token + '/accept', {
    method: 'POST',
    headers: ORIGIN_HEADERS,
    body: { username: 'invited_user', password: 'invited-password' }
  });
  assert.equal(accepted.response.status, 201, JSON.stringify(accepted.body));
  const reused = await call(env, '/api/invitations/' + token + '/accept', {
    method: 'POST',
    headers: ORIGIN_HEADERS,
    body: { username: 'second_user', password: 'second-password' }
  });
  assert.equal(reused.response.status, 404);

  const cancelCandidate = await call(env, '/api/invitations', {
    method: 'POST',
    headers: auth(cookie),
    body: { email: 'cancel@example.com', role: 'viewer' }
  });
  const cancelToken = new URL(cancelCandidate.body.invite_url).pathname.split('/').at(-1);
  assert.equal((await call(env, '/api/invitations/' + cancelCandidate.body.invitation.id, { method: 'DELETE', headers: auth(cookie) })).response.status, 200);
  assert.equal((await call(env, '/api/invitations/' + cancelToken)).response.status, 404);

  const resendCandidate = await call(env, '/api/invitations', {
    method: 'POST',
    headers: auth(cookie),
    body: { email: 'resend@example.com', role: 'member' }
  });
  const oldToken = new URL(resendCandidate.body.invite_url).pathname.split('/').at(-1);
  const resent = await call(env, '/api/invitations/' + resendCandidate.body.invitation.id + '/resend', { method: 'POST', headers: auth(cookie) });
  const newToken = new URL(resent.body.invite_url).pathname.split('/').at(-1);
  assert.notEqual(oldToken, newToken);
  assert.equal((await call(env, '/api/invitations/' + oldToken)).response.status, 404);
  assert.equal((await call(env, '/api/invitations/' + newToken)).response.status, 200);

  env.DB.database.prepare('UPDATE project_invitations SET expires_at=1 WHERE id=?').run(resendCandidate.body.invitation.id);
  assert.equal((await call(env, '/api/invitations/' + newToken)).response.status, 410);
});

test('member and invitation lists use cursor pagination', async () => {
  const env = envWithDb();
  await addUser(env, { id: 'usr_owner0001', username: 'owner', role: 'owner', createdAt: 1 });
  for (let index = 0; index < 5; index += 1) {
    await addUser(env, {
      id: 'usr_page' + String(index).padStart(6, '0'),
      username: 'page_user_' + index,
      role: 'member',
      createdAt: 10 + index
    });
  }
  const cookie = await login(env, 'owner');
  const first = await call(env, '/api/members?limit=2', { headers: { cookie } });
  const second = await call(env, '/api/members?limit=2&cursor=' + encodeURIComponent(first.body.next_cursor), { headers: { cookie } });
  assert.equal(first.body.members.length, 2);
  assert.equal(second.body.members.length, 2);
  assert.equal(new Set([...first.body.members, ...second.body.members].map((member) => member.user_id)).size, 4);

  for (let index = 0; index < 3; index += 1) {
    await call(env, '/api/invitations', {
      method: 'POST',
      headers: auth(cookie),
      body: { email: 'page' + index + '@example.com', role: 'viewer' }
    });
  }
  const inviteFirst = await call(env, '/api/invitations?limit=2', { headers: { cookie } });
  const inviteSecond = await call(env, '/api/invitations?limit=2&cursor=' + encodeURIComponent(inviteFirst.body.next_cursor), { headers: { cookie } });
  assert.equal(inviteFirst.body.invitations.length, 2);
  assert.equal(inviteSecond.body.invitations.length, 1);
});

test('query plans use intended indexes for primary access paths', () => {
  const env = envWithDb();
  const plans = [
    ["SELECT * FROM documents WHERE project_id='qwerty' AND status='active' AND parent_document_id IS NULL ORDER BY updated_at DESC,id DESC LIMIT 20", /idx_documents_root_page/],
    ["SELECT * FROM documents WHERE project_id='qwerty' AND status='active' AND parent_document_id='doc_parent' ORDER BY updated_at DESC,id DESC LIMIT 20", /idx_documents_root_page/],
    ["SELECT * FROM documents WHERE project_id='qwerty' AND status='active' ORDER BY updated_at DESC,id DESC LIMIT 20", /idx_documents_recently_updated/],
    ["SELECT * FROM documents WHERE project_id='qwerty' AND status='trashed' ORDER BY trashed_at DESC,id DESC LIMIT 20", /idx_documents_trash_page/],
    ["SELECT * FROM document_favorites WHERE project_id='qwerty' AND user_id='usr_owner' ORDER BY created_at DESC,document_id DESC LIMIT 20", /idx_document_favorites_page/],
    ["SELECT * FROM recent_documents WHERE project_id='qwerty' AND user_id='usr_owner' ORDER BY opened_at DESC,document_id DESC LIMIT 20", /idx_recent_documents_page/],
    ["SELECT * FROM document_blocks WHERE document_id='doc_a' AND snapshot_id='snap_a' ORDER BY position", /idx_document_blocks_order/],
    ["SELECT * FROM project_members WHERE project_id='qwerty' ORDER BY joined_at DESC,user_id DESC LIMIT 20", /idx_project_members_page/],
    ["SELECT * FROM project_invitations WHERE project_id='qwerty' AND status='pending' ORDER BY created_at DESC,id DESC LIMIT 20", /idx_project_invitations_page/],
    ["SELECT * FROM project_invitations WHERE token_hash='abc'", /sqlite_autoindex_project_invitations_2|idx_project_invitations_token_hash/],
    ["SELECT * FROM documents WHERE project_id='qwerty' AND status='active' AND title_search>='제' AND title_search<'제￿' ORDER BY title_search,id", /idx_documents_search/],
    ["SELECT document_id FROM document_publications WHERE project_id='qwerty' ORDER BY published_at DESC,document_id", /idx_document_publications_published/]
  ];
  for (const [sql, expected] of plans) {
    const detail = env.DB.database.prepare('EXPLAIN QUERY PLAN ' + sql).all().map((row) => row.detail).join('\n');
    assert.match(detail, expected, sql + '\n' + detail);
  }
});
