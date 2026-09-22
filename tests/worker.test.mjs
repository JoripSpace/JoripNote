import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import vm from 'node:vm';
import { strToU8, zipSync } from 'fflate';

import worker, {
  buildCaptchaSvg,
  escapeXml,
  hashPassword,
  normalizeUsername,
  parseMarkdownBlocks,
  parseCookies,
  repairLegacyImportedBlocks,
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
    this.database.exec(readFileSync(new URL('../migrations/0008_notion_imports.sql', import.meta.url), 'utf8'));
    this.database.exec(readFileSync(new URL('../migrations/0009_large_notion_imports.sql', import.meta.url), 'utf8'));
    this.database.exec(readFileSync(new URL('../migrations/0010_notion_source_identity.sql', import.meta.url), 'utf8'));
    this.database.exec(readFileSync(new URL('../migrations/0011_notion_people.sql', import.meta.url), 'utf8'));
    this.database.exec(readFileSync(new URL('../migrations/0012_heading_levels.sql', import.meta.url), 'utf8'));
    this.database.exec(readFileSync(new URL('../migrations/0013_notion_page_metadata.sql', import.meta.url), 'utf8'));
    this.database.exec(readFileSync(new URL('../migrations/0014_database_view_preferences.sql', import.meta.url), 'utf8'));
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
  const headers = new Headers(options.headers || {});
  if (options.body && typeof options.body !== 'string') {
    headers.set('content-type', 'application/json');
    options = { ...options, body: JSON.stringify(options.body) };
  }
  return new Request(ORIGIN + path, { ...options, headers });
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
  const multiparts = new Map();
  async function bytes(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    return new Uint8Array(await new Response(value).arrayBuffer());
  }
  function multipart(key, uploadId) {
    return {
      async uploadPart(partNumber, value) {
        const upload = multiparts.get(uploadId);
        if (!upload || upload.key !== key) throw new Error('NoSuchUpload');
        const data = await bytes(value);
        upload.parts.set(partNumber, data);
        return { partNumber, etag: 'etag-' + partNumber };
      },
      async complete(parts) {
        const upload = multiparts.get(uploadId);
        const chunks = parts.map(part => upload.parts.get(part.partNumber));
        const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const data = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
        objects.set(key, data);
        multiparts.delete(uploadId);
        return { key, size: total };
      }
    };
  }
  return {
    DB: new D1Database(),
    STORAGE: {
      async put(key, value) { objects.set(key, await bytes(value)); },
      async get(key) { const value = objects.get(key); return value == null ? null : { body: value }; },
      async delete(key) { objects.delete(key); },
      async createMultipartUpload(key) { const uploadId = 'upload-' + multiparts.size; multiparts.set(uploadId, { key, parts: new Map() }); return { uploadId, ...multipart(key, uploadId) }; },
      resumeMultipartUpload(key, uploadId) { return multipart(key, uploadId); }
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
  assert.match(html, /<link rel="icon" href="data:image\/svg\+xml,/);
  assert.match(html, /id="document-editor" class="document-editor"/);
  assert.match(html, /멤버 관리/);
  assert.match(html, /id="auth-view" class="auth-shell" hidden/);
  assert.match(html, /class="wordmark">JoripNote</);
  assert.match(html, /id="setup-view" class="setup-shell" hidden/);
  assert.match(html, /id="setup-form" class="setup-card"/);
  assert.match(html, /관리자 계정 만들기/);
  assert.doesNotMatch(html, /workspace-avatar large">N/);
  assert.doesNotMatch(html, /<h2>로그인<\/h2>/);
  assert.match(html, /id="sidebar-collapse"/);
  assert.match(html, />공용 문서</);
  assert.match(html, /data-create-document="root"[^>]+aria-label="공용 문서에 페이지 추가"/);
  assert.match(html, /class="sidebar-all active shared-space-only"[^>]+data-view="all"/);
  assert.match(html, /data-create-document="root"[^>]+aria-label="모든 문서에 페이지 추가"/);
  assert.match(html, /id="personal-tree"[^>]+aria-label="내 문서"/);
  assert.match(html, /data-create-document="root"[^>]+aria-label="내 문서에 페이지 추가"/);
  assert.match(html, />새 페이지 추가</);
  assert.match(html, /SUIT@2\/fonts\/variable\/woff2\/SUIT-Variable\.css/);
  assert.match(html, /app\.css\?v=20260922-joripnote-62/);
  assert.match(html, /id="settings-view" class="page-view settings-page"/);
  assert.doesNotMatch(html, /로그인한 멤버만 접근할 수 있는 협업 문서 공간/);
  assert.match(html, /id="brand-workspace-note"/);
  assert.match(html, /class="workspace-note-logo"/);
  assert.match(html, /class="star-icon"/);
  assert.match(html, /class="boot-spinner"/);
  assert.match(html, /워크스페이스를 여는 중<\/span>/);
  assert.doesNotMatch(html, /boot-mark|워크스페이스를 여는 중…/);
  assert.doesNotMatch(html, /Markdown 업로드/);
  assert.doesNotMatch(html, /<h2>Notion 가져오기<\/h2>/);
  assert.match(html, /id="agent-import-controls" hidden aria-hidden="true"/);
  assert.match(html, /notion-api-import-button[^>]+hidden/);
  assert.doesNotMatch(html, />Notion API 전체 가져오기<\/button>/);
  assert.doesNotMatch(html, /Notion ZIP 업로드/);
  assert.match(html, /textarea id="document-title"/);
  assert.match(html, /id="document-page-icon" class="document-page-icon"[^>]+hidden/);
  assert.match(html, /app\.js\?v=20260922-joripnote-54/);
  assert.match(html, /id="tree-menu" class="block-menu tree-context-menu" role="menu" aria-label="문서 메뉴"/);
  assert.match(html, /class="workspace-header-actions"[\s\S]*class="icon-button header-notification"[\s\S]*id="notification-badge"/);
  const primarySidebarNav = html.match(/<nav class="main-nav sidebar-primary-nav" aria-label="공간 빠른 메뉴">([\s\S]*?)<\/nav>/)?.[1] || '';
  assert.match(primarySidebarNav, /data-view="search"[\s\S]*data-view="recent"[\s\S]*data-view="favorites"[\s\S]*data-view="trash"[\s\S]*data-view="templates"[\s\S]*data-view="members"[\s\S]*data-view="settings"/);
  assert.doesNotMatch(primarySidebarNav, /data-view="notifications"/);
  assert.doesNotMatch(primarySidebarNav, /class="nav-label"/);
  assert.doesNotMatch(html, /class="main-nav sidebar-secondary-nav"/);
  assert.doesNotMatch(html, /class="main-nav bottom-nav"/);
  assert.match(html, /id="workspace-access-form"/);
  assert.match(html, /id="space-profile-form"/);
  assert.match(html, /id="workspace-settings-form" class="settings-grid"/);
  assert.match(html, /id="settings-save-button"[^>]+>변경사항 저장<\/button>/);
  assert.doesNotMatch(html, /공간 설정 저장|가입 정책 저장|IP 정책 저장/);
  assert.match(html, /id="space-name"/);
  assert.match(html, /id="space-mode"[\s\S]*value="personal">개인 공간<[\s\S]*value="team">팀 공간</);
  assert.match(html, /id="list-controls" class="list-controls" hidden/);
  assert.match(html, /id="list-filter-query"/);
  assert.match(html, /id="list-kind-filter"[\s\S]*value="database">데이터베이스</);
  assert.match(html, /data-list-layout="list"[\s\S]*data-list-layout="grid"[\s\S]*data-list-layout="preview"/);
  assert.match(html, /id="ip-access-form"/);
  const appScript = await (await worker.fetch(request('/app.js'), {})).text();
  assert.doesNotThrow(() => new vm.Script(appScript));
  assert.match(appScript, /needsAutomaticNotionRepair/);
  assert.match(appScript, /importMissingNotionDatabase/);
  assert.match(appScript, /이전 Notion 문서 형식을 자동 교정했습니다/);
  assert.match(appScript, /pageLinkDocumentId/);
  assert.match(appScript, /function sidebarDocumentIconName/);
  assert.match(appScript, /function documentIconMarkup/);
  assert.match(appScript, /\$\('document-page-icon'\)\.hidden=true/);
  assert.match(appScript, /renderBlocks\(state\.current\.blocks\);\$\('document-page-icon'\)\.hidden=false/);
  assert.match(appScript, /function showTreeMenu/);
  assert.match(appScript, /view-preferences/);
  assert.match(appScript, /function applyDatabaseViewPreference/);
  assert.match(appScript, /function persistDatabaseViewPreference/);
  assert.match(appScript, /function activateDatabaseView/);
  assert.match(appScript, /data-create-document/);
  assert.match(appScript, /createDocument\(\)/);
  assert.match(appScript, /row\.oncontextmenu=event=>/);
  assert.match(appScript, /treeMenuButton\('하위 문서 추가','plus','add-child'\)/);
  assert.match(appScript, /treeMenuButton\('문서 복제','copy','duplicate'\)/);
  assert.match(appScript, /treeMenuButton\('휴지통으로 이동','trash','trash',true\)/);
  assert.doesNotMatch(appScript, /tree-action tree-(?:add|trash)/);
  assert.match(appScript, /function normalizeImportedBlock/);
  assert.match(appScript, /function resizeDocumentTitle\(\)\{const title=\$\('document-title'\);title\.style\.height='0px';/);
  assert.match(appScript, /function isLegacyNotionJsonFragment/);
  assert.match(appScript, /function legacyNotionJsonRun/);
  assert.match(appScript, /block\.type!=='code'&&!isLegacyNotionJsonFragment/);
  assert.match(appScript, /function selectBlock\(row,additive=false\)/);
  assert.match(appScript, /media-preview img:not\(\.inline-link-favicon\)/);
  assert.match(appScript, /row\.addEventListener\('click',event=>\{const image=event\.target\?\.closest\?\./);
  assert.match(appScript, /function applySpaceProfile/);
  assert.match(appScript, /state\.workspaceSettings\?\.space_mode==='personal'/);
  assert.match(appScript, /function setListLayout/);
  assert.match(appScript, /function listPreviewText/);
  assert.match(appScript, /params\.set\('kind',state\.listKind\)/);
  assert.match(appScript, /\$\('workspace-settings-form'\)\.onsubmit/);
  assert.match(appScript, /space_name:\$\('space-name'\)\.value,space_mode:\$\('space-mode'\)\.value,public_signup_enabled/);
  assert.match(appScript, /sanitizeRichHtml\(value\)/);
  assert.match(appScript, /function safeInlineHref/);
  assert.doesNotMatch(appScript, /직접 만든 페이지가 없습니다/);
  assert.match(appScript, /glyph\.innerHTML=documentIconMarkup\(doc,root\)/);
  assert.doesNotMatch(appScript, /glyph\.textContent=sidebarDocumentGlyph\(doc\.title,root\)/);
  assert.match(appScript, /document-page-icon'\)\.innerHTML=documentIconMarkup\(state\.current,true\)/);
  assert.doesNotMatch(appScript, /document-page-icon'\)\.textContent/);
  const appCss = await (await worker.fetch(request('/app.css'), {})).text();
  assert.match(appCss, /--toss-blue:#3182f6/);
  assert.match(appCss, /\.sidebar-document-scroll\{overflow-x:hidden;overscroll-behavior-x:none\}/);
  assert.match(appCss, /\.sidebar \[data-tooltip\]::after\{display:none!important\}/);
  assert.match(appCss, /\.tree-context-menu\{z-index:270;width:210px\}/);
  assert.match(appCss, /\.workspace-header-actions\{display:flex;align-items:center;gap:2px;flex:none\}/);
  assert.match(appCss, /\.header-notification \.notification-badge\{position:absolute/);
  assert.match(appCss, /\.sidebar-primary-nav\{position:relative;z-index:30;display:grid;grid-template-columns:repeat\(7,minmax\(0,1fr\)\);gap:2px;padding:8px 10px 10px;overflow:visible\}/);
  assert.match(appCss, /\.sidebar-primary-nav button\{width:100%;min-width:0;height:34px;justify-content:center;padding:0\}/);
  assert.match(appCss, /\.sidebar \.sidebar-primary-nav \[data-tooltip\]:hover::after,\.sidebar \.sidebar-primary-nav \[data-tooltip\]:focus-visible::after\{display:block!important\}/);
  assert.match(appCss, /\.tree-toggle\{position:absolute;top:2px;right:0/);
  assert.match(appCss, /\.sidebar-document-scroll \.document-tree\{min-height:0;max-height:none;overflow:visible;padding-bottom:0;scrollbar-gutter:auto\}/);
  assert.match(appCss, /\.main-nav button\.active\{background:var\(--toss-blue-soft\)/);
  assert.match(appCss, /\.block-row\.selected::before\{display:none\}/);
  assert.match(appCss, /\.block-row\.selected \.media-block\{outline:none;border-radius:8px;background:#e8f3ff\}/);
  assert.match(appCss, /\.block-row\.selected:hover\{background:transparent\}\.block-row\.selected:hover \.block-content\{background:#e8f3ff\}/);
  assert.match(appCss, /\.block-row\.selected:hover \.media-block,\.block-editor\.block-selecting \.block-row\.selected \.media-block\{background:#e8f3ff\}/);
  assert.match(appCss, /\.block-row\.selected \.media-preview\{border-color:transparent;background:transparent;box-shadow:none\}/);
  assert.match(appCss, /Minimum readable UI text scale: keep every visible text surface at 14px or larger/);
  assert.match(appCss, /\.document-card small[^}]*font-size:14px!important/);
  assert.match(appCss, /\.code-block-shell>\.code-block-content[^}]*font-size:14px!important/);
  assert.match(appCss, /\.app-shell\.space-mode-personal \.shared-space-only/);
  assert.match(appCss, /\.app-shell\.sidebar-collapsed\.space-mode-personal \.sidebar-primary-nav\{grid-template-columns:1fr\}/);
  assert.match(appCss, /\.document-list\.layout-grid\{grid-template-columns:repeat\(auto-fill,minmax\(260px,1fr\)\)/);
  assert.match(appCss, /\.document-list\.layout-preview \.document-card-preview\{display:-webkit-box/);
  assert.match(appCss, /\.settings-page \.setting-select>input,\.settings-page \.setting-select select,\.settings-page \.ip-tag-input\{height:34px;font-size:12px\}/);
  assert.match(appCss, /\.settings-save-bar\{grid-column:1\/-1;display:flex/);
  assert.match(appCss, /\.settings-save-bar\{[^}]*padding:18px/);
  assert.match(appCss, /\.settings-save-bar\{[^}]*border-top:1px solid var\(--toss-line\);background:transparent/);
  assert.doesNotMatch(appCss, /\.settings-save-bar\{[^}]*box-shadow/);
  assert.match(appCss, /\.document-title\{font-size:40px;font-weight:800/);
  assert.match(appCss, /\.editor-view:not\(\.database-page\) \.document-title\{font-size:38px/);
  assert.match(appCss, /\.notion-property-table\{margin:4px 0 14px;padding:8px 14px/);
  assert.match(appCss, /\.notion-page-link \.media-preview a\{display:flex;width:max-content;max-width:100%;min-height:30px/);
  assert.match(appCss, /\.notion-page-link \.media-preview\{display:block;min-height:30px;border:0;background:transparent;border-radius:0\}/);
  assert.match(appCss, /\.inline-link-favicon\{display:inline-block;width:16px;height:16px/);
  assert.match(appCss, /\.media-preview a \.inline-link-favicon\{width:18px;height:18px/);
  assert.match(appCss, /\.sidebar-glyph \.sidebar-doc-icon\{[^}]*width:15px;[^}]*stroke:currentColor/);
  assert.match(appCss, /\.document-page-icon-svg\{[^}]*width:30px;[^}]*stroke:currentColor/);
  assert.match(appCss, /\.sidebar-page-emoji,.sidebar-page-icon\{display:block;width:15px;height:15px/);
  assert.match(appCss, /\.document-page-icon-emoji,.document-page-icon-image\{display:block;width:30px;height:30px/);
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
  assert.match(html, /<strong id="workspace-display-name">JoripNote<\/strong><small id="sidebar-role"/);
  assert.match(html, /<p id="list-space-name" class="eyebrow">JoripNote<\/p>/);
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
  assert.match(styles, /\.app-shell\.document-width-full \.document-editor,\.app-shell\.document-width-full \.editor-view\.database-page \.document-editor,\.app-shell\.document-width-full \.page-view\{width:100%;max-width:none;margin-inline:0/);
  assert.match(styles, /\.app-shell\.document-width-full \.editor-view\.notion-imported:not\(\.database-page\) \.document-editor\{width:100%;max-width:none;margin-inline:0/);
  assert.match(styles, /\.sidebar-document-scroll\{scrollbar-width:thin;scrollbar-color:rgba\(139,149,161,\.55\) transparent\}/);
  assert.match(styles, /\.sidebar-document-scroll::-webkit-scrollbar-thumb\{min-height:44px;border:2px solid transparent;border-radius:999px/);
  assert.match(styles, /@media\(max-width:760px\)\{\.settings-page\{width:calc\(100% - 24px\)/);
  assert.match(styles, /select:not\(:disabled\)\{cursor:pointer\}select:disabled\{cursor:not-allowed\}/);
  assert.match(styles, /\.skip-link\{position:fixed/);
  assert.match(styles, /:focus-visible\{outline:2px solid #1f5fbf/);
  assert.match(styles, /body\.pointer-mode \.document-title:focus,body\.pointer-mode \.block-content\[contenteditable="true"\]:focus\{outline:none;box-shadow:none\}/);
  assert.match(styles, /\.todo-wrap\{grid-template-columns:20px minmax\(0,1fr\);gap:6px/);
  assert.match(styles, /\.block-content\[data-type=heading5\]/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(styles, /\.block-content:empty:before,\.document-title::placeholder\{color:#73726c\}/);
  assert.match(styles, /\.main-nav button \.nav-label\{width:auto/);
  assert.match(styles, /\.sidebar \.main-nav button,\.sidebar \.tree-title,\.sidebar \.sidebar-all,\.sidebar \.sidebar-new-page\{font-size:14px\}/);
  assert.match(styles, /\.sidebar \.tree-heading\{font-size:12px\}/);
  assert.match(styles, /\.sidebar \.sidebar-primary-nav \[data-tooltip\]::after\{font-size:13px\}/);
  assert.match(styles, /\.slash-item strong\{font-size:14px\}/);
  assert.match(styles, /@media\(max-width:900px\) and \(min-width:761px\)/);
  assert.match(styles, /\.toolbar-actions #comments-button,.toolbar-actions #history-button,.toolbar-actions #upload-button,.toolbar-actions #access-button,.toolbar-actions #duplicate-button,.toolbar-actions #new-child-button\{display:none\}/);
  assert.match(styles, /\.block-menu button\{font-size:13px\}/);
  assert.match(styles, /\.db-view-tab,\.db-control\{font-size:13px\}/);
  assert.match(styles, /\.notion-page-link \.media-url:not\(\[hidden\]\)\{display:block\}/);
  assert.match(styles, /\.document-title:not\(:read-only\),\.block-content\[contenteditable="true"\]\{cursor:text\}/);
  assert.match(styles, /\[data-tooltip\]:hover::after/);
  assert.match(styles, /@keyframes boot-spin/);
  assert.match(styles, /--accent:#59647f/);
  assert.match(styles, /\.url-paste-menu\{position:fixed/);
  assert.match(styles, /\.link-dialog-card\{width:min\(92vw,460px\)/);
  assert.match(styles, /\.skeleton::after\{/);
  assert.match(styles, /@keyframes skeleton-sweep/);
  assert.match(styles, /\.document-title\.skeleton-title/);
  assert.match(styles, /\.document-title\.skeleton-title::placeholder\{color:transparent!important\}/);
  assert.match(styles, /\.document-title:focus-visible,\.block-content\[contenteditable="true"\]:focus-visible\{outline:none;box-shadow:none\}/);
  assert.match(styles, /\.db-board\{display:flex/);
  assert.match(styles, /\.db-property-head\{display:grid/);
  assert.match(styles, /\.db-card\{display:grid/);
  assert.match(styles, /\/\* Database spacing refinement \*\//);
  assert.match(styles, /\.db-toolbar\{gap:8px;padding:10px 12px;border-bottom:1px solid #ececf0;background:#fbfbfc\}/);
  assert.match(styles, /\.db-table td\.db-cell\{height:44px;padding:6px\}/);
  assert.match(styles, /\.db-footer\{padding:11px 12px;border-top:1px solid #ececf0;background:#fbfbfc\}/);
  assert.match(styles, /grid-template-areas:"name" "type"/);
  assert.match(styles, /\.db-property-head:hover \.db-property-actions/);
  assert.match(styles, /\.db-card-footer\{position:absolute;top:6px;right:6px/);
  assert.match(styles, /\.db-card-page-icon:hover\{background:#efefed/);
  assert.match(styles, /\.db-calendar-heading\{[^}]*min-height:58px[^}]*padding:14px 12px 12px/);
  assert.match(styles, /\.db-calendar-day\.today \.db-calendar-date\{background:#2f6feb/);
  assert.match(styles, /\.db-calendar-range\{[^}]*margin:2px 4px/);
  assert.match(styles, /\/\* Notion-fidelity database chrome \*\//);
  assert.match(styles, /\.editor-view\.database-page \.document-editor\{width:min\(calc\(100% - 72px\),1800px\)/);
  assert.match(styles, /\.db-chrome\{display:flex;align-items:center;justify-content:space-between/);
  assert.match(styles, /\.db-calendar-range\{display:flex;align-items:center;gap:6px;height:27px/);
  assert.match(styles, /\.db-calendar-day\.drag-over\{background:#eef6ff/);
  assert.match(styles, /\.block-editor\.block-selecting\{user-select:none;cursor:default\}/);
  assert.match(styles, /\.block-row\.selected\{background:#e8f3ff;box-shadow:inset 3px 0 #3182f6/);
  assert.match(styles, /\.block-row\.selected \.block-handle\{visibility:hidden/);
  assert.match(styles, /\.block-editor\.block-selecting \.block-row\.selected \.block-handle\{visibility:visible\}/);
assert.match(styles, /\.block-row\.selected\{margin-right:0;background:transparent;box-shadow:none;color:inherit\}/);
assert.match(styles, /\.block-row\.selected \.media-preview\{border-color:transparent;background:transparent;box-shadow:none\}/);
  assert.match(styles, /\.block-row\.selected::before\{display:none\}/);
  assert.match(styles, /\.block-row\.selected \.block-content\{border-radius:8px;background:#e8f3ff\}/);
  assert.match(styles, /\.block-editor\.block-selecting \.block-row\.selected \.block-content\{background:#dceeff\}/);
  assert.match(styles, /body\[data-drag-mode="copy"\]::after\{display:none\}/);
  assert.match(styles, /\.editor-view:not\(\.database-page\) \.block-editor\{margin-left:-52px;padding-left:52px\}/);
  assert.match(styles, /\.editor-view:not\(\.database-page\) \.block-editor\{--handle-gutter:28px;--marker-gutter:22px;--indent-step:24px;gap:6px;margin-left:-52px;padding-left:52px;padding-right:16px\}/);
  assert.match(styles, /\.editor-view:not\(\.database-page\) \.block-editor\{--handle-gutter:28px;--marker-gutter:22px;--indent-step:24px;gap:6px;margin-left:-52px;padding-left:52px;padding-right:16px\}/);
  assert.match(styles, /\.editor-view:not\(\.database-page\) \.block-row\{grid-template-columns:var\(--handle-gutter\) minmax\(0,1fr\);margin-left:calc\(-1 \* var\(--handle-gutter\)\);padding-left:calc\(var\(--indent,0\) \* var\(--indent-step\)\)\}/);
  assert.match(styles, /\.editor-view:not\(\.database-page\) \.block-content\[data-type="bullet"\],\.editor-view:not\(\.database-page\) \.block-content\[data-type="numbered"\]\{position:relative;padding-left:var\(--marker-gutter\)\}/);
  assert.match(styles, /\.editor-view:not\(\.database-page\) \.todo-wrap\{grid-template-columns:var\(--marker-gutter\) minmax\(0,1fr\);gap:0;min-width:0;padding:0\}/);
  assert.match(styles, /@media\(max-width:760px\)\{\.editor-view:not\(\.database-page\) \.block-editor\{--handle-gutter:22px;--marker-gutter:20px;--indent-step:20px;padding-right:8px\}/);
  assert.match(styles, /\.block-content\[contenteditable="true"\]:hover\{background:transparent;border-radius:0\}/);
  assert.match(styles, /\.block-row\.drop-before::before,.block-row\.drop-after::after\{right:16px;left:28px;height:2px;border-radius:2px;background:#b6bec9/);
  assert.match(styles, /\.db-board-column\.drag-copy-over,.db-calendar-day\.drag-copy-over,.db-timeline-track\.drag-copy-over\{background:#f7fbff;box-shadow:inset 0 0 0 1px #b9d5ff\}/);
  assert.match(styles, /\.block-content\[data-type="quote"\]\{padding-inline:12px;border-left:2px solid #d5dae2;background:transparent\}/);
  assert.match(styles, /\.editor-view\.notion-imported:not\(\.database-page\) \.block-content\[data-type="quote"\]\{padding:8px 12px\}/);
  assert.match(styles, /\/\* Universal Notion database views \*\//);
  assert.match(styles, /\.db-gallery\{display:grid;grid-template-columns:repeat\(auto-fill,minmax\(220px,1fr\)\)/);
  assert.match(styles, /\.db-timeline-grid\{display:grid;grid-template-columns:220px repeat\(var\(--timeline-days\),40px\)/);
  assert.match(styles, /\.db-timeline-bar\{align-self:center;display:flex;align-items:center;/);
  assert.match(styles, /\.db-timeline-bar>span\{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\}/);
  assert.doesNotMatch(styles, /radial-gradient\(circle at 82% 3%/);
  assert.doesNotMatch(styles, /\.document-editor\{width:min\(calc\(100% - 56px\),900px\);margin:24px auto 72px/);
  assert.match(styles, /\/\* UI spacing system: one rhythm, with intentional per-surface tuning\. \*\//);
  assert.match(styles, /:root\{--ui-space-1:4px;--ui-space-2:8px;--ui-space-3:12px;--ui-space-4:16px;--ui-space-5:20px/);
  assert.match(styles, /\.document-title-line>\.document-page-icon\{display:none!important\}/);
  assert.match(styles, /\.editor-view\.notion-imported:not\(\.database-page\) \.block-content:not\(\.media-block\) a\{[^}]*padding-inline:0/);
  assert.doesNotMatch(styles, /\.editor-view\.notion-imported:not\(\.database-page\) \.block-content a\{[^}]*padding-inline:2px/);
  assert.match(styles, /\.media-block:not\(\.notion-page-link\) \.media-preview> a\{[^}]*padding:0 var\(--ui-space-4\)/);
  assert.match(styles, /\.notion-page-link \.media-preview> a\{[^}]*padding:0 var\(--ui-space-2\)/);
  assert.match(styles, /\.table-edge-actions\{position:absolute;inset:0;z-index:4;pointer-events:none\}/);
  assert.match(styles, /\.structured-block\{position:relative;padding-block:0\}/);
  assert.match(styles, /\.table-edge-action\[data-edge=top\]\{top:-13px;left:50%/);
  assert.match(styles, /\.table-edge-action\[data-edge=bottom\]\{bottom:-13px;left:50%/);
  assert.match(styles, /\.table-edge-action\[data-edge=left\]\{left:-13px;top:50%/);
  assert.match(styles, /\.table-edge-action\[data-edge=right\]\{right:-13px;top:50%/);
  assert.match(styles, /\.structured-block\[data-hover-edge=top\] \.table-edge-action\[data-edge=top\]/);
  assert.match(styles, /\.table-cell-selection-actions\{position:absolute/);
  assert.match(styles, /\.block-table th\.cell-selected,\.block-table td\.cell-selected\{background:#e8f3ff/);
  assert.match(styles, /@media\(pointer:coarse\),\(max-width:760px\)\{\s+\.table-edge-action\{width:30px;height:30px;opacity:1;pointer-events:auto\}/);
  assert.match(styles, /\.table-edge-action\[data-edge=bottom\]\{bottom:-15px\}/);
  assert.match(styles, /\.code-block-shell>\.code-block-content,\.code-block-shell \.block-content\[data-type="code"\]\{padding-inline:var\(--ui-space-4\)!important\}/);
  assert.match(styles, /\.document-card\{padding-inline:var\(--ui-space-4\)\}/);
  assert.match(styles, /\.block-row\.selected\{margin-right:0;background:transparent;box-shadow:none;color:inherit\}/);
  assert.match(styles, /@media\(max-width:760px\)\{\s+\.media-block:not\(\.notion-page-link\) \.media-preview> a\{min-height:48px;padding-inline:var\(--ui-space-3\)\}/);
  assert.match(styles, /\.document-card\{padding-inline:var\(--ui-space-3\)\}/);
  assert.match(styles, /\.toggle-summary\{align-items:center;min-height:30px\}/);
  assert.match(styles, /\.toggle-caret\{align-self:center;display:grid;place-items:center;width:var\(--marker-gutter,22px\);height:30px/);
  assert.match(styles, /\.todo-wrap input\[type="checkbox"\]\{display:block;width:18px;height:18px;align-self:center;justify-self:center;margin:0\}/);
  assert.match(styles, /\.editor-view:not\(\.database-page\) \.todo-wrap\{align-items:center;grid-template-columns:var\(--marker-gutter,22px\) minmax\(0,1fr\);gap:6px;min-width:0;min-height:30px;padding:0 10px 0 0\}/);
  assert.match(styles, /\.editor-view:not\(\.database-page\) \.todo-wrap input\[type="checkbox"\]\{display:block;width:18px;height:18px;align-self:center;justify-self:center;margin:0\}/);
  assert.match(styles, /\.block-content\[data-type="bullet"\]::before,\.editor-view:not\(\.database-page\) \.block-content\[data-type="numbered"\]::before\{top:3px;display:flex;align-items:center;height:1\.75em;line-height:1\}/);
  assert.match(styles, /\.block-content\[data-type="bullet"\],\.block-content\[data-type="numbered"\]\{position:relative;padding-right:10px\}/);
  assert.match(styles, /\.block-content\[data-type="text"\],\.block-content\[data-type\^="heading"\].*padding-inline-end:10px/);
  assert.match(styles, /\.callout-wrap>\.ui-icon\{align-self:center;margin-top:0\}/);
  assert.match(styles, /\.inline-link-favicon\{margin-block:0;vertical-align:middle\}/);
  assert.match(styles, /\.db-view-tab\{display:inline-flex;justify-content:center;line-height:1\.2\}/);
  assert.match(styles, /\.db-card-title-row\{align-items:center\}/);
  assert.match(styles, /\.db-search-wrap>\.ui-icon\{top:50%;transform:translateY\(-50%\)\}/);

  const script = await worker.fetch(request('/app.js'), {});
  const source = await script.text();
  assert.doesNotThrow(() => new vm.Script(source));
  assert.match(source, /chip\.innerHTML=icon\('files'\)/);
  assert.match(source, /className='db-chrome'/);
  assert.match(source, /classList\.toggle\('database-page'/);
  assert.match(source, /function renderDatabaseList/);
  assert.match(source, /function renderDatabaseGallery/);
  assert.match(source, /function bindCalendarDrag/);
  assert.match(source, /dataTransfer\.setData\('text\/plain',context\.row\.id\)/);
  assert.match(source, /application\/x-joripspace-drag-intent/);
  assert.match(source, /effectAllowed='copyMove'/);
  assert.match(source, /state\.dragCopy/);
  assert.match(source, /function copyDatabaseRowForDrag/);
  assert.match(source, /function bindTimelineDrag/);
  assert.match(source, /타임라인 항목을 복사했습니다/);
  assert.match(source, /블록을 복사했습니다/);
  assert.match(source, /state\.dragSession/);
  assert.match(source, /event\.key==='Escape'/);
  assert.match(source, /data-drag-mode/);
  assert.match(source, /data-universal-drag-bound/);
  assert.match(source, /function bindBlockMarqueeSelection/);
  assert.match(source, /aria-multiselectable/);
  assert.match(source, /state\.selectedBlocks=next/);
  assert.match(source, /openDocument=async\(id,pushUrl=true\)=>\{clearBlockSelection\(\)/);
  assert.match(source, /shiftCalendarValue\(context\.row\.cells\[context\.dateColumn\.id\],delta\)/);
  assert.match(source, /function renderDatabaseTimeline/);
  assert.match(source, /function structuredTableBlock\(block,database\)/);
  assert.match(source, /table-edge-action/);
  assert.match(source, /hoverEdge/);
  assert.match(source, /table-cell-selection-actions/);
  assert.match(source, /deleteSelectedRows/);
  assert.match(source, /deleteSelectedColumns/);
  assert.match(source, /cellGesture/);
  assert.match(source, /위에 행 추가/);
  assert.match(source, /왼쪽에 열 추가/);
  assert.doesNotMatch(source, /actions\.className='block-table-actions'/);
  assert.match(source, /view\.type==='timeline'/);
  assert.match(source, /function databaseStructuredFilter/);
  assert.match(source, /const databaseRowsBase=databaseRows/);
  assert.match(source, /sort\.property_id\|\|sort\.property/);
  assert.match(source, /const fallback=\{calendar:0,table:1,board:2,timeline:3,gallery:4,list:5\}/);
  assert.match(source, /scheduleSave/);
  assert.match(source, /editRevision/);
  assert.match(source, /beforeunload/);
  assert.match(source, /heading1/);
  assert.match(source, /showSlashMenu/);
  assert.match(source, /applyInputShortcut/);
  assert.match(source, /const offset=caretOffset\(el\);if\(offset===null\)return false;const text=el\.textContent;const before=text\.slice\(0,offset\)/);
  assert.match(source, /replaceBlockType\(el,match\[0\],match\[1\],text\.slice\(offset\)\)/);
  assert.match(source, /function replaceBlockType\(el,type,checked=false,content=''\)/);
  assert.match(source, /CONTINUING_BLOCK_TYPES=new Set\(\['bullet','numbered','todo'\]\)/);
  assert.match(source, /function splitEditableBlock/);
  assert.match(source, /function mergeWithPrevious/);
  assert.match(source, /const INDENTABLE_BLOCK_TYPES=new Set\(\['text','heading1','heading2','heading3','heading4','heading5','heading6','bullet','numbered','todo','quote','toggle','callout','math'\]\)/);
  assert.match(source, /function changeBlockIndent/);
  assert.match(source, /el\.dataset\.type==='code'\)\{event\.preventDefault\(\);document\.execCommand\('insertText',false,'\\t'\)/);
  assert.match(source, /application\/x-qwerty-blocks/);
  assert.match(source, /function openUrlPasteMenu/);
  assert.match(source, /function openLinkDialog/);
  assert.match(source, /function notionInlineHref/);
  assert.match(source, /function importedInlineHtml/);
  assert.match(source, /data-internal-page/);
  assert.match(source, /function bindEditableLinks/);
  assert.match(source, /anchor\.contentEditable='false'/);
  assert.match(source, /function linkFaviconUrl/);
  assert.match(source, /iopen\.kakaocdn\.net\/favicon\.ico/);
  assert.match(source, /favicon\.className='inline-link-favicon'/);
  assert.match(source, /anchor\.prepend\(favicon\)/);
  assert.match(source, /if\(type==='bookmark'\)\{const src=linkFaviconUrl\(href\)/);
  assert.match(source, /function pageLinkIconMarkup/);
  assert.match(source, /renderMediaPreview\(preview,block\.type,input\.value,pageLink&&pageLink\.title,pageLink\)/);
  assert.match(source, /img\.onerror=\(\)=>\{/);
  assert.match(source, /이미지를 불러올 수 없습니다/);
  assert.match(source, /link\.className='media-unavailable'/);
  assert.match(source, /else if\(\/\^https\?:\/i\.test\(href\)\)/);
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
  assert.match(source, /function calendarVisibleItems/);
  assert.match(source, /const visibleStart=calendarDateKey\(start\),visibleEnd=calendarDateKey\(end\)/);
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
  assert.match(source, /heading5:'제목 5',heading6:'제목 6'/);
  assert.match(source, /handleSlashKey/);
  assert.match(source, /bindBlockInteractions/);
  assert.match(source, /showBlockMenu/);
  assert.match(source, /contextmenu/);
  assert.match(source, /item\('페이지 열기','files'/);
  assert.match(source, /item\('다음 주로 복제','copy'/);
  assert.match(source, /shiftedCalendarValue\(row\.cells\[dateColumn\.id\]\)/);
  assert.match(source, /const doc=String\(path\)\.match/);
  assert.match(source, /function push\(path\)\{setSidebar\(false\)/);
  assert.match(source, /function updateDocumentChrome/);
  assert.match(source, /function resizeDocumentTitle/);
  assert.match(source, /addEventListener\('resize',resizeDocumentTitle\)/);
  assert.match(source, /visibleRoles=allowed\.includes\(member\.role\)/);
  assert.match(source, /notion-import-input/);
  assert.match(source, /agent_action.*notion-import/);
  assert.match(source, /function importAllFromNotionApi/);
  assert.match(source, /function importNotionApiSourceByAgent/);
  assert.match(source, /function importMissingNotionPage/);
  assert.match(source, /원본 Notion에서 열기/);
  assert.match(source, /agentAction==='notion-import-source'/);
  assert.match(source, /function auditLinksByAgent/);
  assert.match(source, /function editorFileBlockType/);
  assert.match(source, /async function uploadEditorFile/);
  assert.match(source, /async function insertEditorFiles/);
  assert.match(source, /event\.clipboardData\?\.items/);
  assert.match(source, /item\.kind==='file'/);
  assert.match(source, /image\\\//i);
  assert.match(source, /event\.dataTransfer\?\.files/);
  assert.match(source, /event\.target\?\.closest\?\.\('\.document-editor'\)/);
  assert.match(source, /agentAction==='notion-link-audit'/);
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
  assert.match(source, /function clientNotionTitle/);
  assert.match(source, /const DATABASE_MAX_ROWS=500/);
  assert.match(source, /function cleanNotionDatabaseTitle/);
  assert.match(source, /function databaseStatusOptions/);
  assert.match(source, /function openDatabaseRowPage/);
  assert.match(source, /원본 페이지 열기/);
  assert.match(source, /연결된 원본 페이지는 삭제되지 않습니다/);
  assert.match(source, /grouped\.length>99\?'99\+'/);
  assert.match(source, /'보드','files'.*groupColumn\.name.*'별'/);
  assert.match(source, /function renderDatabaseBoard/);
  assert.match(source, /function renderDatabaseTable/);
  assert.match(source, /function databaseFilterControls/);
  assert.match(source, /조건에 맞는 작업이 없습니다/);
  assert.match(source, /DATABASE_PROPERTY_TYPES=\{text:'텍스트',select:'선택',person:'담당자'/);
  assert.match(source, /type==='database'\?100000:20000/);
  assert.match(source, /const next='\/search'\+\(state\.search\?'\?q='/);
  assert.match(source, /new URLSearchParams\(location\.search\)\.get\('q'\)/);
  assert.match(source, /function appendSearchHighlight/);
  assert.match(source, /globalSearchRequest/);
  assert.match(source, /global-search-preview/);
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
  const pageLinkSaved = await call(env, '/api/documents/' + id, {
    method: 'PUT',
    headers: auth(ownerCookie),
    body: {
      title: '기능 문서',
      version: saved.body.version,
      save_id: 'snap_featurepagelink01',
      blocks: [{ id: 'blk_featurepagelink1', type: 'page_link', content: JSON.stringify({ title: '연결된 문서', url: '', document_id: 'doc_notion_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }) }]
    }
  });
  assert.equal(pageLinkSaved.response.status, 200, JSON.stringify(pageLinkSaved.body));
  const invalidPageLink = await call(env, '/api/documents/' + id, {
    method: 'PUT',
    headers: auth(ownerCookie),
    body: {
      title: '기능 문서',
      version: pageLinkSaved.body.version,
      save_id: 'snap_featurepagelink02',
      blocks: [{ id: 'blk_featurepagelink2', type: 'page_link', content: JSON.stringify({ title: '잘못된 링크', url: 'javascript:alert(1)' }) }]
    }
  });
  assert.equal(invalidPageLink.response.status, 400, JSON.stringify(invalidPageLink.body));
  const versions = await call(env, '/api/documents/' + id + '/versions', { headers: { cookie: ownerCookie } });
  assert.deepEqual(versions.body.versions.map((item) => item.version), [3, 2, 1]);
  const restored = await call(env, '/api/documents/' + id + '/versions/1/restore', { method: 'POST', headers: auth(ownerCookie), body: {} });
  assert.equal(restored.body.version, 4);

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
  const parsed = parseMarkdownBlocks('# 가져온 문서\n## 개요\n#### 세부\n- 항목\n- [x] 완료\n> 인용\n![화면](https://example.com/image.png)\n[참고](https://example.com/guide)\n[연결 문서](https://www.notion.so/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)\n```js\nconst ok = true;\n```\n---');
  assert.equal(parsed.title, '가져온 문서');
  assert.deepEqual(parsed.blocks.map((block) => block.type), ['heading2', 'heading4', 'bullet', 'todo', 'quote', 'image', 'bookmark', 'page_link', 'code', 'divider']);
  assert.equal(parsed.blocks[3].checked, true);
  assert.deepEqual(JSON.parse(parsed.blocks[7].content), { title: '연결 문서', url: 'https://www.notion.so/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', document_id: 'doc_notion_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' });

  const indentedCode = parseMarkdownBlocks('##### 제목 5\n###### 제목 6\n\t```json\n\t{\n\t  "safe": "<script>문자열</script>"\n\t}\n\t```');
  assert.deepEqual(indentedCode.blocks.map((block) => block.type), ['heading5', 'heading6', 'code']);
  assert.match(indentedCode.blocks[2].content, /<script>문자열<\/script>/);

  const nestedOrdered = parseMarkdownBlocks('#### 동작 프로세스 요약\n1. 액션 설정\n   ```json\n   {\n     "app": "chat-to-table"\n   }\n   ```\n1. 사용자 채팅\n   - 예\n     > 안녕하세요\n1. agent-util.js');
  assert.deepEqual(nestedOrdered.blocks.map((block) => block.type), ['heading4', 'numbered', 'code', 'numbered', 'bullet', 'quote', 'numbered']);
  assert.deepEqual(nestedOrdered.blocks.filter((block) => block.type === 'numbered').map((block) => block.indent_level), [0, 0, 0]);
  assert.equal(nestedOrdered.blocks.find((block) => block.type === 'code').content, '{\n  "app": "chat-to-table"\n}');
  assert.doesNotMatch(nestedOrdered.blocks.find((block) => block.type === 'code').content, /```|json/);

  const extended = parseMarkdownBlocks('<columns>\n\t<column ratio="50">\n<empty-block/>\n<unknown url="https://app.notion.com/p/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa#bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" alt="alias"/>\n\t</column>\n</columns>');
  assert.deepEqual(extended.blocks.map((block) => block.type), ['page_link']);
  assert.equal(JSON.parse(extended.blocks[0].content).title, '연결된 Notion 블록');
  const inlineDatabase = parseMarkdownBlocks('<database url="https://app.notion.com/p/1bc891a7da5d4401af1d8ef2436f8c18" inline="true" data-source-url="collection://c42bd05f-54d8-48a2-9c34-8504ef13321f">작업 목록</database>');
  assert.deepEqual(JSON.parse(inlineDatabase.blocks[0].content), {
    title: '작업 목록',
    url: 'https://app.notion.com/p/1bc891a7da5d4401af1d8ef2436f8c18',
    document_id: 'doc_notiondb_c42bd05f54d848a29c348504ef13321f'
  });

  const html = parseMarkdownBlocks('<h2>HTML 제목</h2>\n<p>본문 <strong>강조</strong> <a href="https://example.com">링크</a><script>alert(1)</script></p>\n<ul><li>첫 항목</li><li>[x] 완료</li></ul>\n<h5>작은 제목</h5>');
  assert.deepEqual(html.blocks.map((block) => block.type), ['heading2', 'text', 'bullet', 'todo', 'heading5']);
  assert.match(html.blocks[1].content, /^@qwerty-rich:/);
  assert.match(html.blocks[1].content, /<strong>강조<\/strong>/);
  assert.doesNotMatch(html.blocks[1].content, /script|alert/);
  assert.equal(html.blocks[3].checked, true);

  const inlineNotionPage = parseMarkdownBlocks('<page url="https://app.notion.com/p/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb">연결된 **페이지**</page>');
  assert.equal(inlineNotionPage.blocks.length, 1);
  assert.equal(inlineNotionPage.blocks[0].type, 'text');
  assert.match(inlineNotionPage.blocks[0].content, /^@qwerty-rich:/);
  assert.match(inlineNotionPage.blocks[0].content, /href="https:\/\/app\.notion\.com\/p\/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"/);

  const notionPageBullet = parseMarkdownBlocks('- [항목 코드(Field Key) 작성 방법](https://app.notion.com/p/cccccccccccccccccccccccccccccccc)');
  assert.equal(notionPageBullet.blocks[0].type, 'page_link');
  assert.deepEqual(JSON.parse(notionPageBullet.blocks[0].content), {
    title: '항목 코드(Field Key) 작성 방법',
    url: 'https://app.notion.com/p/cccccccccccccccccccccccccccccccc',
    document_id: 'doc_notion_cccccccccccccccccccccccccccccccc'
  });

  const inlineHtmlLink = parseMarkdownBlocks('<p>외부 <a href="https://example.com/docs">문서</a>, <a href="mailto:help@example.com">메일</a>, <a href="tel:+82-2-1234-5678">전화</a>와 <a href="javascript:alert(1)">위험한 링크</a></p>');
  assert.match(inlineHtmlLink.blocks[0].content, /href="https:\/\/example\.com\/docs"/);
  assert.match(inlineHtmlLink.blocks[0].content, /href="mailto:help@example\.com"/);
  assert.match(inlineHtmlLink.blocks[0].content, /href="tel:\+82-2-1234-5678"/);
  assert.doesNotMatch(inlineHtmlLink.blocks[0].content, /javascript|alert/);

  const markdownTable = parseMarkdownBlocks('| 이름 | 상태 |\n| --- | --- |\n| 작업 | 진행 중 |');
  assert.deepEqual(markdownTable.blocks.map((block) => block.type), ['table']);
  assert.deepEqual(JSON.parse(markdownTable.blocks[0].content), [['이름', '상태'], ['작업', '진행 중']]);
  const htmlTable = parseMarkdownBlocks('<table><tr><th>이름</th><th>상태</th></tr><tr><td>작업</td><td>완료</td></tr></table>');
  assert.deepEqual(htmlTable.blocks.map((block) => block.type), ['table']);
  assert.deepEqual(JSON.parse(htmlTable.blocks[0].content), [['이름', '상태'], ['작업', '완료']]);
  const math = parseMarkdownBlocks('$$x^2 + y^2$$\n~~취소선~~ **굵게** *기울임*');
  assert.deepEqual(math.blocks.map((block) => block.type), ['math', 'text']);
  assert.equal(math.blocks[0].content, 'x^2 + y^2');
  const advanced = parseMarkdownBlocks('<callout>⚠️ 주의</callout>\n<details><summary>더 보기</summary>숨겨진 내용</details>\n<table-of-contents />');
  assert.deepEqual(advanced.blocks.map((block) => block.type), ['callout', 'toggle', 'toc']);
  assert.equal(advanced.blocks[1].content, '더 보기\n숨겨진 내용');

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

test('Notion ZIP import restores hierarchy, CSV data, assets and remains idempotent', async () => {
  const env = envWithDb();
  await addUser(env, { id: 'usr_owner0001', username: 'owner', role: 'owner' });
  const cookie = await login(env, 'owner');
  const parentKey = 'Parent 11111111111111111111111111111111';
  const zip = zipSync({
    [parentKey + '.md']: strToU8('# Parent\n\nWelcome\n\n![Cover](' + encodeURIComponent(parentKey) + '/cover.png)'),
    [parentKey + '/Child 22222222222222222222222222222222.md']: strToU8('# Child\n\n- nested item'),
    [parentKey + '/Tasks 33333333333333333333333333333333.csv']: strToU8('Task,Status\nWrite spec,Done\nShip,Doing'),
    [parentKey + '/cover.png']: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
  });
  const upload = async () => {
    const form = new FormData();
    form.append('file', new Blob([zip], { type: 'application/zip' }), 'notion-export.zip');
    const response = await worker.fetch(new Request(ORIGIN + '/api/import/notion-zip', { method: 'POST', headers: auth(cookie), body: form }), env);
    return { response, body: await response.json() };
  };
  const first = await upload();
  assert.equal(first.response.status, 201, JSON.stringify(first.body));
  assert.deepEqual({ imported: first.body.imported, skipped: first.body.skipped, failed: first.body.failed }, { imported: 3, skipped: 0, failed: 0 });
  const documents = env.DB.database.prepare("SELECT id,parent_document_id,title FROM documents WHERE project_id='qwerty' ORDER BY title").all();
  assert.equal(documents.length, 3);
  const parent = documents.find(document => document.title === 'Parent');
  assert.equal(documents.find(document => document.title === 'Child').parent_document_id, parent.id);
  assert.equal(documents.find(document => document.title === 'Tasks').parent_document_id, parent.id);
  const csvBlock = env.DB.database.prepare("SELECT content FROM document_blocks b JOIN documents d ON d.id=b.document_id WHERE d.title='Tasks' AND b.block_type='database'").get();
  assert.equal(JSON.parse(csvBlock.content).rows.length, 2);
  const stored = env.DB.database.prepare('SELECT id,document_id,content_type FROM file_uploads').get();
  assert.equal(stored.document_id, parent.id);
  assert.equal(stored.content_type, 'image/png');
  const download = await call(env, '/api/files/' + stored.id, { headers: auth(cookie) });
  assert.equal(download.response.status, 200);
  const second = await upload();
  assert.equal(second.response.status, 200);
  assert.equal(second.body.idempotent, true);
  assert.equal(env.DB.database.prepare("SELECT COUNT(*) AS count FROM documents WHERE project_id='qwerty'").get().count, 3);

  await addUser(env, { id: 'usr_member0001', username: 'member', role: 'member' });
  const memberCookie = await login(env, 'member');
  const deniedForm = new FormData();
  deniedForm.append('file', new Blob([zip], { type: 'application/zip' }), 'other.zip');
  const denied = await worker.fetch(new Request(ORIGIN + '/api/import/notion-zip', { method: 'POST', headers: auth(memberCookie), body: deniedForm }), env);
  assert.equal(denied.status, 403);
});

test('legacy Notion structural tags are repaired into native blocks without losing grouped content', () => {
  const encodedFile = 'file://' + encodeURIComponent(JSON.stringify({
    source: 'https://example.com/files/%EC%98%88%EC%95%BD_sms.pptx'
  }));
  const rows = [
    { id: 'blk_file', block_type: 'text', content: '<file src="' + encodedFile + '"></file>', position: 0, checked: 0, indent_level: 0 },
    { id: 'blk_video', block_type: 'text', content: '<video src="https://youtu.be/2W6Yir0sXeY"></video>', position: 1, checked: 0, indent_level: 0 },
    { id: 'blk_details', block_type: 'text', content: '<details>', position: 2, checked: 0, indent_level: 0 },
    { id: 'blk_summary', block_type: 'text', content: '<summary><span color="green_bg">사용자별 설정</span></summary>', position: 3, checked: 0, indent_level: 0 },
    { id: 'blk_body', block_type: 'text', content: '\t설명', position: 4, checked: 0, indent_level: 0 },
    { id: 'blk_image', block_type: 'image', content: 'https://example.com/screen.png', position: 5, checked: 0, indent_level: 0 },
    { id: 'blk_details_end', block_type: 'text', content: '</details>', position: 6, checked: 0, indent_level: 0 },
    { id: 'blk_table', block_type: 'text', content: '<table>', position: 7, checked: 0, indent_level: 0 },
    { id: 'blk_row', block_type: 'text', content: '<tr>', position: 8, checked: 0, indent_level: 0 },
    { id: 'blk_cell_a', block_type: 'text', content: '<td>**필드**</td>', position: 9, checked: 0, indent_level: 0 },
    { id: 'blk_cell_b', block_type: 'text', content: '<td>값</td>', position: 10, checked: 0, indent_level: 0 },
    { id: 'blk_table_end', block_type: 'text', content: '</table>', position: 11, checked: 0, indent_level: 0 },
    { id: 'blk_callout', block_type: 'text', content: '<callout icon="💡" color="gray_bg">', position: 12, checked: 0, indent_level: 0 },
    { id: 'blk_callout_body', block_type: 'text', content: '\t중요 안내', position: 13, checked: 0, indent_level: 0 },
    { id: 'blk_callout_end', block_type: 'text', content: '</callout>', position: 14, checked: 0, indent_level: 0 },
    { id: 'blk_page', block_type: 'text', content: '<page url="https://app.notion.com/p/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa">연결 문서</page>', position: 15, checked: 0, indent_level: 0 },
    { id: 'blk_toc', block_type: 'text', content: '<table_of_contents color="gray"/>', position: 16, checked: 0, indent_level: 0 },
    { id: 'blk_heading', block_type: 'heading3', content: '작업 목록 {toggle="true"}', position: 17, checked: 0, indent_level: 0 }
  ];

  const repaired = repairLegacyImportedBlocks(rows);
  assert.deepEqual(repaired.map(block => block.block_type), [
    'file', 'embed', 'toggle', 'text', 'image', 'table', 'callout', 'page_link', 'toc', 'heading3'
  ]);
  assert.equal(repaired[0].content, 'https://example.com/files/예약_sms.pptx');
  assert.equal(repaired[1].content, 'https://youtu.be/2W6Yir0sXeY');
  assert.equal(repaired[2].content, '@qwerty-toggle-group:2\n사용자별 설정');
  assert.equal(repaired[3].content, '설명');
  assert.equal(repaired[4].indent_level, 1);
  assert.deepEqual(JSON.parse(repaired[5].content), [['필드', '값']]);
  assert.equal(repaired[6].content, '💡 중요 안내');
  assert.deepEqual(JSON.parse(repaired[7].content), {
    title: '연결 문서',
    url: 'https://app.notion.com/p/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    document_id: 'doc_notion_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  });
  assert.equal(repaired[9].content, '작업 목록');
  assert.doesNotMatch(repaired.map(block => block.content).join('\n'), /<(?:file|video|details|summary|table|t[rd]|callout|page)\b/i);
});

test('legacy attachment-only media becomes an explicit unavailable attachment callout', () => {
  const encoded = 'file://' + encodeURIComponent(JSON.stringify({
    source: 'attachment:12345678:old-demo.mp4'
  }));
  const [block] = repairLegacyImportedBlocks([
    { id: 'blk_attachment', block_type: 'text', content: '<video src="' + encoded + '"></video>', position: 0, checked: 0, indent_level: 0 }
  ]);
  assert.equal(block.block_type, 'callout');
  assert.match(block.content, /old-demo\.mp4/);
  assert.match(block.content, /원본 첨부 링크/);
});

test('legacy inline breaks and Notion span wrappers render as clean text', () => {
  const repaired = repairLegacyImportedBlocks([
    { id: 'blk_breaks', block_type: 'text', content: '첫 줄<br>둘째 줄<br/>셋째 줄', position: 0, checked: 0, indent_level: 0 },
    { id: 'blk_span', block_type: 'text', content: '<span color="gray">안내 **문구**</span> {color="gray"}', position: 1, checked: 0, indent_level: 0 },
    { id: 'blk_inline_span', block_type: 'bullet', content: '가격 <span color="red">필수</span>', position: 2, checked: 0, indent_level: 0 },
    { id: 'blk_json', block_type: 'text', content: '\\{ "status": "ready" \\}<br>\\{ "success": true \\}', position: 3, checked: 0, indent_level: 0 },
    { id: 'blk_color', block_type: 'heading3', content: '제목 {color="gray"}', position: 4, checked: 0, indent_level: 0 },
    { id: 'blk_encoded_span', block_type: 'text', content: '@qwerty-rich:&lt;span color=&quot;gray&quot;&gt;다이어그램을 첨부하면 유용합니다.&lt;/span&gt;', position: 5, checked: 0, indent_level: 0 }
  ]);
  assert.equal(repaired[0].content, '첫 줄\n둘째 줄\n셋째 줄');
  assert.equal(repaired[1].content, '안내 **문구**');
  assert.equal(repaired[2].content, '가격 필수');
  assert.equal(repaired[3].content, '{ "status": "ready" }\n{ "success": true }');
  assert.equal(repaired[4].content, '제목');
  assert.equal(repaired[5].content, '@qwerty-rich:<span color=&quot;gray&quot;>다이어그램을 첨부하면 유용합니다.</span>');
  assert.doesNotMatch(repaired.slice(0, 5).map(block => block.content).join('\n'), /<br|<span|\\[{}]|\{color=/i);
  assert.doesNotMatch(repaired[5].content, /&lt;\/?span/i);
});

test('legacy media tags with an empty source become an explicit unavailable attachment', () => {
  const [block] = repairLegacyImportedBlocks([
    { id: 'blk_empty_file', block_type: 'text', content: '<file src=""></file>', position: 0, checked: 0, indent_level: 0 }
  ]);
  assert.equal(block.block_type, 'callout');
  assert.match(block.content, /첨부 파일/);
  assert.match(block.content, /원본 첨부 링크/);
});

test('sidebar separates imported teamspaces from personal root pages', async () => {
  const env = envWithDb();
  await addUser(env, { id: 'usr_owner0001', username: 'owner', role: 'owner' });
  const cookie = await login(env, 'owner');
  const imported = await call(env, '/api/documents', { method: 'POST', headers: auth(cookie), body: {} });
  const personal = await call(env, '/api/documents', { method: 'POST', headers: auth(cookie), body: {} });
  env.DB.database.prepare('UPDATE documents SET title=?, title_search=?, source_page_id=?, source_path=? WHERE id=?')
    .run('프로젝트 작업', '프로젝트 작업', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'notion-api/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/root', imported.body.document.id);
  env.DB.database.prepare('UPDATE documents SET title=?, title_search=? WHERE id=?')
    .run('개인 메모', '개인 메모', personal.body.document.id);

  const sidebar = await call(env, '/api/documents?scope=sidebar&limit=200', { headers: { cookie } });
  assert.equal(sidebar.response.status, 200);
  assert.deepEqual(sidebar.body.documents.map(document => document.title), ['프로젝트 작업', '개인 메모']);
  assert.deepEqual(sidebar.body.documents.map(document => document.is_notion_import), [true, false]);
  assert.deepEqual(sidebar.body.documents.map(document => document.is_notion_root), [true, false]);
});

test('Notion ZIP import rejects unsafe archive paths without recording an import', async () => {
  const env = envWithDb();
  await addUser(env, { id: 'usr_owner0001', username: 'owner', role: 'owner' });
  const cookie = await login(env, 'owner');
  const zip = zipSync({ '../outside.md': strToU8('# Unsafe') });
  const form = new FormData();
  form.append('file', new Blob([zip], { type: 'application/zip' }), 'unsafe.zip');
  const response = await worker.fetch(new Request(ORIGIN + '/api/import/notion-zip', { method: 'POST', headers: auth(cookie), body: form }), env);
  assert.equal(response.status, 400);
  assert.equal(env.DB.database.prepare('SELECT COUNT(*) AS count FROM notion_imports').get().count, 0);
});

test('Notion API importer discovers accessible pages and stores page properties and body', async () => {
  const env = envWithDb();
  await addUser(env, { id: 'usr_owner0001', username: 'owner', role: 'owner' });
  const cookie = await login(env, 'owner');
  const missing = await call(env, '/api/import/notion-api/status', { headers: { cookie } });
  assert.equal(missing.body.configured, false);
  env.NOTION_API_TOKEN = 'ntn_test_secret';
  const pageId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const aliasBlockId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const linkedPageId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    assert.equal(init.headers.authorization, 'Bearer ntn_test_secret');
    assert.equal(init.headers['notion-version'], '2026-03-11');
    if (url.endsWith('/v1/search')) return Response.json({ results: [{ object: 'page', id: pageId }], has_more: false, next_cursor: null });
    if (url.endsWith('/v1/pages/' + pageId.replaceAll('-', '') + '/markdown')) return Response.json({ markdown: '# API 본문\n문단\n<unknown url="https://app.notion.com/p/' + pageId.replaceAll('-', '') + '#' + aliasBlockId.replaceAll('-', '') + '" alt="alias"/>\n[블록 링크](https://www.notion.so/' + linkedPageId.replaceAll('-', '') + '#' + aliasBlockId.replaceAll('-', '') + ')', truncated: false, unknown_block_ids: [aliasBlockId] });
    if (url.endsWith('/v1/pages/' + linkedPageId.replaceAll('-', '') + '/markdown')) return Response.json({ markdown: '# 연결 문서\n본문', truncated: false, unknown_block_ids: [] });
    if (url.endsWith('/v1/blocks/' + aliasBlockId.replaceAll('-', ''))) return Response.json({ object: 'block', id: aliasBlockId, type: 'link_to_page', link_to_page: { type: 'page_id', page_id: linkedPageId } });
    if (url.endsWith('/v1/pages/' + linkedPageId.replaceAll('-', ''))) return Response.json({ object: 'page', id: linkedPageId, icon: { type: 'emoji', emoji: '📄' }, properties: { Name: { id: 'title', type: 'title', title: [{ plain_text: '연결 문서' }] } } });
    if (url.endsWith('/v1/pages/' + pageId.replaceAll('-', ''))) return Response.json({
      object: 'page', id: pageId, icon: { type: 'emoji', emoji: '📆' }, parent: { type: 'workspace', workspace: true },
      properties: {
        Name: { id: 'title', type: 'title', title: [{ plain_text: 'API 문서' }] },
        Status: { id: 'status', type: 'status', status: { name: '진행 중' } }
      }
    });
    return new Response('not found', { status: 404 });
  };
  try {
    const discovered = await call(env, '/api/import/notion-api/search', { method: 'POST', headers: auth(cookie), body: { cursor: null } });
    assert.equal(discovered.response.status, 200, JSON.stringify(discovered.body));
    assert.deepEqual(discovered.body.items, [{ id: pageId, object: 'page', imported: false }]);
    const imported = await call(env, '/api/import/notion-api/pages/' + pageId, { method: 'POST', headers: auth(cookie), body: {} });
    assert.equal(imported.response.status, 200, JSON.stringify(imported.body));
    const rediscovered = await call(env, '/api/import/notion-api/search', { method: 'POST', headers: auth(cookie), body: { cursor: null } });
    assert.equal(rediscovered.body.items[0].imported, true);
    const linkedImport = await call(env, '/api/import/notion-api/pages/' + linkedPageId, { method: 'POST', headers: auth(cookie), body: {} });
    assert.equal(linkedImport.response.status, 200, JSON.stringify(linkedImport.body));
  } finally {
    globalThis.fetch = originalFetch;
  }
  const document = env.DB.database.prepare("SELECT id,title,source_page_id,source_path,page_icon_emoji,page_icon_url FROM documents WHERE title='API 문서'").get();
  assert.equal(document.source_page_id, pageId.replaceAll('-', ''));
  assert.match(document.source_path, /^notion-api\//);
  assert.equal(document.page_icon_emoji, '📆');
  assert.equal(document.page_icon_url, null);
  const blocks = env.DB.database.prepare('SELECT block_type,content FROM document_blocks WHERE document_id=? ORDER BY position').all(document.id);
  assert.equal(blocks[0].block_type, 'table');
  assert.match(blocks[0].content, /진행 중/);
  assert.equal(blocks[1].content, '문단');
  assert.equal(blocks[2].block_type, 'page_link');
  assert.deepEqual(JSON.parse(blocks[2].content), { title: '연결 문서', url: 'https://www.notion.so/' + linkedPageId.replaceAll('-', ''), document_id: 'doc_notion_' + linkedPageId.replaceAll('-', '') });
  const loaded = await call(env, '/api/documents/' + document.id, { headers: auth(cookie) });
  const linkedBlock = loaded.body.document.blocks.find(block => {
    try { return JSON.parse(block.content || '').document_id === 'doc_notion_' + linkedPageId.replaceAll('-', ''); } catch { return false; }
  });
  assert.equal(linkedBlock.page_icon_emoji, '📄');
  const linked = await call(env, '/api/import/notion-api/linked-missing', { method: 'POST', headers: auth(cookie), body: {} });
  assert.equal(linked.response.status, 200, JSON.stringify(linked.body));
  assert.deepEqual(linked.body.items, []);
});

test('Notion API data source import returns row page ids for complete page-body import', async () => {
  const env = envWithDb();
  await addUser(env, { id: 'usr_owner0001', username: 'owner', role: 'owner' });
  const cookie = await login(env, 'owner');
  env.NOTION_API_TOKEN = 'ntn_test_secret';
  const sourceId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const rowId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    const url = String(input);
    if (url.endsWith('/v1/data_sources/' + sourceId.replaceAll('-', ''))) return Response.json({
      object: 'data_source', id: sourceId, title: [{ plain_text: '작업 목록' }], parent: { type: 'workspace', workspace: true },
      properties: { Name: { id: 'title', type: 'title', title: {} } }
    });
    if (url.endsWith('/v1/data_sources/' + sourceId.replaceAll('-', '') + '/query')) return Response.json({
      results: [{ object: 'page', id: rowId, properties: { Name: { id: 'title', type: 'title', title: [{ plain_text: '행 페이지' }] } } }],
      has_more: false, next_cursor: null
    });
    return new Response('not found', { status: 404 });
  };
  try {
    const imported = await call(env, '/api/import/notion-api/data-sources/' + sourceId, { method: 'POST', headers: auth(cookie), body: {} });
    assert.equal(imported.response.status, 200, JSON.stringify(imported.body));
    assert.equal(imported.body.rows, 1);
    assert.deepEqual(imported.body.page_ids, [rowId]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Notion member sync preserves encrypted emails and enriches people properties', async () => {
  const env = envWithDb();
  await addUser(env, { id: 'usr_owner0001', username: 'owner', role: 'owner' });
  const cookie = await login(env, 'owner');
  env.NOTION_API_TOKEN = 'ntn_test_secret';
  const personId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  const sourceId = '12121212-1212-1212-1212-121212121212';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    const url = String(input);
    if (url.includes('/v1/users?')) return Response.json({ results: [{ object: 'user', id: personId, type: 'person', name: '김세현', avatar_url: 'https://example.com/avatar.png', person: { email: 'Sehyun@example.com' } }], has_more: false, next_cursor: null });
    if (url.endsWith('/v1/data_sources/' + sourceId.replaceAll('-', ''))) return Response.json({ object: 'data_source', id: sourceId, title: [{ plain_text: '담당 업무' }], parent: { workspace: true }, properties: { Name: { id: 'title', type: 'title', title: {} }, Owner: { id: 'person', type: 'people', people: {} } } });
    if (url.includes('/v1/views?')) return Response.json({ results: [], has_more: false, next_cursor: null });
    if (url.endsWith('/v1/data_sources/' + sourceId.replaceAll('-', '') + '/query')) return Response.json({ results: [{ id: '34343434-3434-3434-3434-343434343434', properties: { Name: { id: 'title', type: 'title', title: [{ plain_text: '업무' }] }, Owner: { id: 'person', type: 'people', people: [{ id: personId }] } } }], has_more: false, next_cursor: null });
    return new Response('not found', { status: 404 });
  };
  try {
    const synced = await call(env, '/api/import/notion-api/users', { method: 'POST', headers: auth(cookie), body: {} });
    assert.equal(synced.response.status, 200, JSON.stringify(synced.body));
    assert.deepEqual({ people: synced.body.people, emails: synced.body.emails, complete: synced.body.email_complete }, { people: 1, emails: 1, complete: true });
    const stored = env.DB.database.prepare('SELECT name,email_ciphertext,email_nonce FROM notion_people WHERE notion_user_id=?').get(personId.replaceAll('-', ''));
    assert.equal(stored.name, '김세현');
    assert.notEqual(stored.email_ciphertext, 'sehyun@example.com');
    const members = await call(env, '/api/notion-members', { headers: { cookie } });
    assert.equal(members.body.members[0].email, 'sehyun@example.com');
    const imported = await call(env, '/api/import/notion-api/data-sources/' + sourceId, { method: 'POST', headers: auth(cookie), body: {} });
    assert.equal(imported.response.status, 200, JSON.stringify(imported.body));
    const model = JSON.parse(env.DB.database.prepare("SELECT content FROM document_blocks WHERE block_type='database'").get().content);
    assert.equal(model.rows[0].cells.col_1, '김세현 <sehyun@example.com>');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('owner migration reset removes documents, files and non-admin accounts in bounded steps', async () => {
  const env = envWithDb();
  await addUser(env, { id: 'usr_owner0001', username: 'owner', role: 'owner' });
  await addUser(env, { id: 'usr_member0001', username: 'member', role: 'member' });
  const cookie = await login(env, 'owner');
  const created = await call(env, '/api/documents', { method: 'POST', headers: auth(cookie), body: {} });
  env.DB.database.prepare(`INSERT INTO file_uploads (id,project_id,document_id,storage_key,filename,content_type,size,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?)`).run('fil_reset0001', 'qwerty', created.body.document.id, 'documents/reset/file', 'file.txt', 'text/plain', 4, 'usr_owner0001', 100);
  await env.STORAGE.put('documents/reset/file', new TextEncoder().encode('test'));
  const first = await call(env, '/api/admin/reset-notion-migration', { method: 'POST', headers: auth(cookie), body: { confirm: 'qwerty' } });
  assert.equal(first.body.done, false);
  assert.equal(first.body.deleted_files, 1);
  const second = await call(env, '/api/admin/reset-notion-migration', { method: 'POST', headers: auth(cookie), body: { confirm: 'qwerty' } });
  assert.equal(second.body.done, true);
  assert.equal(env.DB.database.prepare("SELECT COUNT(*) AS count FROM documents WHERE project_id='qwerty'").get().count, 0);
  assert.deepEqual(env.DB.database.prepare("SELECT username FROM users ORDER BY username").all().map(row => row.username), ['owner']);
});

test('Notion API data source import preserves paginated views, calendar ranges and property semantics', async () => {
  const env = envWithDb();
  await addUser(env, { id: 'usr_owner0001', username: 'owner', role: 'owner' });
  const cookie = await login(env, 'owner');
  env.NOTION_API_TOKEN = 'ntn_test_secret';
  const sourceId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  const rowId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  const viewCalendar = '11111111-1111-1111-1111-111111111111';
  const viewBoard = '22222222-2222-2222-2222-222222222222';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    const url = String(input);
    if (url.endsWith('/v1/data_sources/' + sourceId.replaceAll('-', ''))) return Response.json({
      object: 'data_source', id: sourceId, title: [{ plain_text: '작업 목록' }], parent: { type: 'workspace', workspace: true },
      properties: {
        Name: { id: 'title', type: 'title', title: {} },
        Date: { id: 'date', type: 'date', date: {} },
        Status: { id: 'status', type: 'status', status: { options: [{ name: '진행 중' }] } },
        Owner: { id: 'person', type: 'people', people: {} }
      }
    });
    if (url.includes('/v1/views?')) return Response.json(url.includes('start_cursor=next')
      ? { results: [{ object: 'view', id: viewBoard }], has_more: false, next_cursor: null }
      : { results: [{ object: 'view', id: viewCalendar }], has_more: true, next_cursor: 'next' });
    if (url.endsWith('/v1/views/' + viewCalendar.replaceAll('-', ''))) return Response.json({ id: viewCalendar, name: '캘린더', type: 'calendar', is_default: true, configuration: { date_property_id: 'date' } });
    if (url.endsWith('/v1/views/' + viewBoard.replaceAll('-', ''))) return Response.json({ id: viewBoard, name: '보드', type: 'board', configuration: { group_by: { property_id: 'status' } } });
    if (url.endsWith('/v1/data_sources/' + sourceId.replaceAll('-', '') + '/query')) return Response.json({
      results: [{ object: 'page', id: rowId, properties: {
        Name: { id: 'title', type: 'title', title: [{ plain_text: '주간 목표' }] },
        Date: { id: 'date', type: 'date', date: { start: '2026-09-01', end: '2026-09-07', time_zone: 'Asia/Seoul' } },
        Status: { id: 'status', type: 'status', status: { name: '진행 중' } },
        Owner: { id: 'person', type: 'people', people: [{ id: 'ffffffff-ffff-ffff-ffff-ffffffffffff' }] }
      } }], has_more: false, next_cursor: null
    });
    return new Response('not found', { status: 404 });
  };
  try {
    const imported = await call(env, '/api/import/notion-api/data-sources/' + sourceId, { method: 'POST', headers: auth(cookie), body: {} });
    assert.equal(imported.response.status, 200, JSON.stringify(imported.body));
    const block = env.DB.database.prepare("SELECT content FROM document_blocks WHERE block_type='database'").get();
    const model = JSON.parse(block.content);
    assert.equal(model.version, 3);
    assert.equal(model.views.length, 2);
    assert.equal(model.views[0].type, 'calendar');
    assert.equal(model.view.mode, 'calendar');
    assert.equal(model.view.datePropertyId, 'col_1');
    assert.equal(model.rows[0].cells.col_1, '2026-09-01 → 2026-09-07');
    assert.equal(model.columns.find(column => column.name === 'Owner').type, 'people');
    const paginated = await call(env, '/api/import/notion-api/views?data_source_id=' + sourceId, { headers: { cookie } });
    assert.equal(paginated.response.status, 200, JSON.stringify(paginated.body));
    assert.equal(paginated.body.views.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Notion API importer keeps data sources when an unsupported view detail returns 400', async () => {
  const env = envWithDb();
  await addUser(env, { id: 'usr_owner0001', username: 'owner', role: 'owner' });
  const cookie = await login(env, 'owner');
  env.NOTION_API_TOKEN = 'ntn_test_secret';
  const sourceId = 'abababab-abab-abab-abab-abababababab';
  const rowId = 'cdcdcdcd-cdcd-cdcd-cdcd-cdcdcdcdcdcd';
  const viewId = 'efefefef-efef-efef-efef-efefefefefef';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    const url = String(input);
    if (url.endsWith('/v1/data_sources/' + sourceId.replaceAll('-', ''))) return Response.json({
      object: 'data_source', id: sourceId, title: [{ plain_text: '피드 데이터' }], parent: { type: 'workspace', workspace: true },
      properties: { Name: { id: 'title', type: 'title', title: {} } }
    });
    if (url.includes('/v1/views?')) return Response.json({ results: [{ object: 'view', id: viewId, name: '피드', type: 'feed' }], has_more: false, next_cursor: null });
    if (url.endsWith('/v1/views/' + viewId.replaceAll('-', ''))) return Response.json({ object: 'error', message: 'Unsupported view type: feed' }, { status: 400 });
    if (url.endsWith('/v1/data_sources/' + sourceId.replaceAll('-', '') + '/query')) return Response.json({
      results: [{ object: 'page', id: rowId, properties: { Name: { id: 'title', type: 'title', title: [{ plain_text: '피드 항목' }] } } }], has_more: false, next_cursor: null
    });
    return new Response('not found', { status: 404 });
  };
  try {
    const imported = await call(env, '/api/import/notion-api/data-sources/' + sourceId, { method: 'POST', headers: auth(cookie), body: {} });
    assert.equal(imported.response.status, 200, JSON.stringify(imported.body));
    const block = env.DB.database.prepare("SELECT content FROM document_blocks WHERE block_type='database'").get();
    const model = JSON.parse(block.content);
    assert.equal(model.version, 3);
    assert.equal(model.views[0].type, 'feed');
    assert.equal(model.rows[0].source_id, rowId.replaceAll('-', ''));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('large Notion imports register entries, upload assets in pieces and finalize document hierarchy', async () => {
  const env = envWithDb();
  await addUser(env, { id: 'usr_owner0001', username: 'owner', role: 'owner' });
  const cookie = await login(env, 'owner');
  const created = await call(env, '/api/import/notion-sessions', {
    method: 'POST', headers: auth(cookie), body: {
      filename: 'large-export.zip', size: 400_000_000, entries: 3, unpacked_size: 800_000_000, fingerprint: 'a'.repeat(64)
    }
  });
  assert.equal(created.response.status, 201, JSON.stringify(created.body));
  const importId = created.body.import_id;
  const registeredDocs = await call(env, `/api/import/notion-sessions/${importId}/documents`, {
    method: 'POST', headers: auth(cookie), body: { entries: [
      { index: 0, path: 'Parent aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.md', size: 12 },
      { index: 1, path: 'Parent aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Child bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.md', size: 11 }
    ] }
  });
  assert.equal(registeredDocs.response.status, 200, JSON.stringify(registeredDocs.body));
  const [parent, child] = registeredDocs.body.entries;
  const registeredAsset = await call(env, `/api/import/notion-sessions/${importId}/assets`, {
    method: 'POST', headers: auth(cookie), body: { entries: [
      { index: 2, path: 'Parent aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/photo.png', size: 3, owner_document_id: parent.document_id }
    ] }
  });
  assert.equal(registeredAsset.response.status, 200, JSON.stringify(registeredAsset.body));
  const assetUpload = await worker.fetch(new Request(`${ORIGIN}/api/import/notion-sessions/${importId}/assets/2`, {
    method: 'PUT', headers: auth(cookie, { 'content-type': 'application/octet-stream' }), body: new Uint8Array([1, 2, 3])
  }), env);
  assert.equal(assetUpload.status, 200, await assetUpload.text());
  const childAsset = await call(env, `/api/import/notion-sessions/${importId}/assets`, {
    method: 'POST', headers: auth(cookie), body: { entries: [
      { index: 3, path: 'Parent aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Child bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb /photo.png', size: 2, owner_document_id: child.document_id }
    ] }
  });
  assert.equal(childAsset.response.status, 200, JSON.stringify(childAsset.body));
  const childAssetUpload = await worker.fetch(new Request(`${ORIGIN}/api/import/notion-sessions/${importId}/assets/3`, {
    method: 'PUT', headers: auth(cookie, { 'content-type': 'application/octet-stream' }), body: new Uint8Array([4, 5])
  }), env);
  assert.equal(childAssetUpload.status, 200, await childAssetUpload.text());
  const database = JSON.stringify({ version: 2, title: '작업 목록', columns: [{ id: 'col_title', name: '이름', type: 'text', options: [] }], rows: [{ id: 'row_1', cells: { col_title: '첫 작업' } }], view: { mode: 'table', groupBy: '', sortBy: '', sortDir: 'asc', filter: { column: '', operator: 'contains', value: '' } } });
  const imported = await call(env, `/api/import/notion-sessions/${importId}/documents-batch`, {
    method: 'POST', headers: auth(cookie), body: { documents: [
      { index: 0, content: '# Parent\nBody', parent_document_id: null, databases: [database] },
      { index: 1, content: '# Child\nBody', parent_document_id: parent.document_id }
    ] }
  });
  assert.equal(imported.response.status, 200, JSON.stringify(imported.body));
  const completed = await call(env, `/api/import/notion-sessions/${importId}/complete`, { method: 'POST', headers: auth(cookie), body: {} });
  assert.equal(completed.response.status, 200, JSON.stringify(completed.body));
  assert.equal(completed.body.imported, 2);
  assert.equal(env.DB.database.prepare('SELECT parent_document_id FROM documents WHERE id=?').get(child.document_id).parent_document_id, parent.document_id);
  assert.equal(env.DB.database.prepare('SELECT COUNT(*) count FROM file_uploads WHERE document_id=?').get(parent.document_id).count, 1);
  assert.equal(env.DB.database.prepare('SELECT COUNT(*) count FROM file_uploads WHERE document_id=?').get(child.document_id).count, 1);
  assert.equal(env.DB.database.prepare("SELECT COUNT(*) count FROM document_blocks WHERE document_id=? AND block_type='database'").get(parent.document_id).count, 1);
  assert.equal(env.DB.database.prepare('SELECT source_page_id FROM documents WHERE id=?').get(parent.document_id).source_page_id, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  const resumed = await call(env, `/api/import/notion-sessions/${importId}/documents-batch`, {
    method: 'POST', headers: auth(cookie), body: { documents: [
      { index: 0, content: '# Parent\nUpdated body', parent_document_id: null },
      { index: 1, content: '# Child\nUpdated body', parent_document_id: parent.document_id }
    ] }
  });
  assert.equal(resumed.response.status, 200, JSON.stringify(resumed.body));
  assert.equal(env.DB.database.prepare('SELECT version FROM documents WHERE id=?').get(child.document_id).version, 2);
  assert.equal(env.DB.database.prepare('SELECT COUNT(*) count FROM file_uploads WHERE document_id=?').get(parent.document_id).count, 1);
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
  assert.equal(initial.body.space_mode, 'team');
  assert.equal(initial.body.space_name, 'JoripNote');

  const spaceProfile = await call(env, '/api/settings', {
    method: 'PATCH', headers: auth(ownerCookie), body: { space_mode: 'personal', space_name: '내 작업실' }
  });
  assert.equal(spaceProfile.response.status, 200, JSON.stringify(spaceProfile.body));
  assert.equal(spaceProfile.body.space_mode, 'personal');
  assert.equal(spaceProfile.body.space_name, '내 작업실');
  const sessionProfile = await call(env, '/api/me', { headers: auth(ownerCookie) });
  assert.deepEqual(sessionProfile.body.workspace, { space_mode: 'personal', space_name: '내 작업실' });

  const invalidSpaceMode = await call(env, '/api/settings', {
    method: 'PATCH', headers: auth(ownerCookie), body: { space_mode: 'shared' }
  });
  assert.equal(invalidSpaceMode.response.status, 400);
  const invalidSpaceName = await call(env, '/api/settings', {
    method: 'PATCH', headers: auth(ownerCookie), body: { space_name: '   ' }
  });
  assert.equal(invalidSpaceName.response.status, 400);

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
    title: '작업 목록',
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
  const types = ['text', 'heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6', 'bullet', 'numbered', 'todo', 'quote', 'code', 'divider', 'toggle', 'callout', 'table', 'database', 'toc', 'math', 'bookmark', 'image', 'video', 'audio', 'file', 'embed', 'page_link'];
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
  assert.equal(reloaded.body.document.blocks.find((block) => block.type === 'heading1').indent_level, 3);
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
  assert.equal(roots.body.documents[0].has_database, true);
  assert.match(roots.body.documents[0].preview, /굵게/);
  const databaseOnly = await call(env, '/api/documents?scope=all&kind=database&sort=title_asc&limit=20', { headers: { cookie } });
  assert.deepEqual(databaseOnly.body.documents.map((doc) => doc.id), [parentId]);
  const regularOnly = await call(env, '/api/documents?scope=all&kind=document&limit=20', { headers: { cookie } });
  assert.deepEqual(regularOnly.body.documents, []);
  const filteredRoots = await call(env, '/api/documents?scope=all&q=' + encodeURIComponent('제품') + '&limit=20', { headers: { cookie } });
  assert.deepEqual(filteredRoots.body.documents.map((doc) => doc.id), [parentId]);
  const children = await call(env, '/api/documents?scope=all&parent_id=' + parentId + '&limit=20', { headers: { cookie } });
  assert.deepEqual(children.body.documents.map((doc) => doc.id), [childId]);

  assert.equal((await call(env, '/api/documents/' + parentId + '/favorite', { method: 'PUT', headers: auth(cookie) })).response.status, 200);
  const favorites = await call(env, '/api/documents?scope=favorites&limit=20', { headers: { cookie } });
  assert.deepEqual(favorites.body.documents.map((doc) => doc.id), [parentId]);
  const recent = await call(env, '/api/documents?scope=recent&limit=20', { headers: { cookie } });
  assert.ok(recent.body.documents.some((doc) => doc.id === parentId));
  const search = await call(env, '/api/documents?scope=search&q=' + encodeURIComponent('제품') + '&limit=20', { headers: { cookie } });
  assert.deepEqual(search.body.documents.map((doc) => doc.id), [parentId]);
  assert.equal(search.body.documents[0].search_match, 'title');
  const contentSearch = await call(env, '/api/documents?scope=search&q=' + encodeURIComponent('heading4') + '&limit=20', { headers: { cookie } });
  assert.deepEqual(contentSearch.body.documents.map((doc) => doc.id), [parentId]);
  assert.equal(contentSearch.body.documents[0].search_match, 'content');
  assert.match(contentSearch.body.documents[0].preview, /heading4 내용/);
  const multiTermSearch = await call(env, '/api/documents?scope=search&q=' + encodeURIComponent('제품 heading4') + '&limit=20', { headers: { cookie } });
  assert.deepEqual(multiTermSearch.body.documents.map((doc) => doc.id), [parentId]);

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

  const largeDatabase = structuredClone(database);
  largeDatabase.rows = Array.from({ length: 404 }, (_, index) => ({
    id: 'row_' + String(index).padStart(4, '0'),
    cells: {
      col_text: '작업 ' + (index + 1),
      col_num: String(index + 1),
      col_date: '2026-09-10',
      col_url: 'https://example.com/' + (index + 1),
      col_done: false,
      col_status: index % 2 ? '진행 중' : '완료'
    }
  }));
  const largeSaved = await call(env, '/api/documents/' + id, {
    method: 'PUT',
    headers: auth(cookie),
    body: { title: '404개 보드', version: 2, save_id: 'snap_valid_database_404', blocks: [{ id: 'blk_database1', type: 'database', content: JSON.stringify(largeDatabase) }] }
  });
  assert.equal(largeSaved.response.status, 200, JSON.stringify(largeSaved.body));
  const largeReloaded = await call(env, '/api/documents/' + id, { headers: { cookie } });
  assert.equal(JSON.parse(largeReloaded.body.document.blocks[0].content).rows.length, 404);
});

test('database view preferences persist per member without changing document content', async () => {
  const env = envWithDb();
  await addUser(env, { id: 'usr_owner0001', username: 'owner', role: 'owner' });
  await addUser(env, { id: 'usr_member0001', username: 'member', role: 'member' });
  const ownerCookie = await login(env, 'owner');
  const memberCookie = await login(env, 'member');
  const created = await call(env, '/api/documents', { method: 'POST', headers: auth(ownerCookie), body: {} });
  assert.equal(created.response.status, 201, JSON.stringify(created.body));
  const documentId = created.body.document.id;
  const database = JSON.stringify({
    version: 3,
    title: '작업 목록',
    columns: [
      { id: 'col_title', name: '작업', type: 'text', options: [] },
      { id: 'col_due', name: '마감일', type: 'date', options: [] }
    ],
    rows: [{ id: 'row_1', cells: { col_title: '출시 준비', col_due: '2026-09-22' } }],
    views: [
      { id: 'view_table', name: '표', type: 'table', order: 0 },
      { id: 'view_calendar', name: '캘린더', type: 'calendar', order: 1, datePropertyId: 'col_due' },
      { id: 'view_board', name: '프로젝트', type: 'board', order: 2, groupBy: 'col_title' }
    ],
    view: { mode: 'table', groupBy: '', sortBy: '', sortDir: 'asc', filter: { column: '', operator: 'contains', value: '' } }
  });
  const saved = await call(env, '/api/documents/' + documentId, {
    method: 'PUT',
    headers: auth(ownerCookie),
    body: { title: '작업 목록', version: 1, save_id: 'snap_viewprefsave0001', blocks: [{ id: 'blk_viewpref0001', type: 'database', content: database }] }
  });
  assert.equal(saved.response.status, 200, JSON.stringify(saved.body));

  const ownerSet = await call(env, '/api/documents/' + documentId + '/view-preferences', {
    method: 'PUT',
    headers: auth(ownerCookie),
    body: { block_id: 'blk_viewpref0001', view_id: 'view_calendar', view_type: 'calendar' }
  });
  assert.equal(ownerSet.response.status, 200, JSON.stringify(ownerSet.body));
  const ownerRead = await call(env, '/api/documents/' + documentId + '/view-preferences', { headers: auth(ownerCookie) });
  assert.deepEqual(ownerRead.body.preferences.map(({ block_id, view_id, view_type }) => ({ block_id, view_id, view_type })), [{ block_id: 'blk_viewpref0001', view_id: 'view_calendar', view_type: 'calendar' }]);

  const memberInitial = await call(env, '/api/documents/' + documentId + '/view-preferences', { headers: auth(memberCookie) });
  assert.deepEqual(memberInitial.body.preferences, []);
  const memberSet = await call(env, '/api/documents/' + documentId + '/view-preferences', {
    method: 'PUT',
    headers: auth(memberCookie),
    body: { block_id: 'blk_viewpref0001', view_id: 'view_board', view_type: 'board' }
  });
  assert.equal(memberSet.response.status, 200, JSON.stringify(memberSet.body));
  const memberRead = await call(env, '/api/documents/' + documentId + '/view-preferences', { headers: auth(memberCookie) });
  assert.equal(memberRead.body.preferences[0].view_type, 'board');
  const ownerAgain = await call(env, '/api/documents/' + documentId + '/view-preferences', { headers: auth(ownerCookie) });
  assert.equal(ownerAgain.body.preferences[0].view_type, 'calendar');
  const content = await call(env, '/api/documents/' + documentId, { headers: auth(ownerCookie) });
  assert.equal(JSON.parse(content.body.document.blocks[0].content).view.mode, 'table');
});

test('link audit scans active document snapshots without mutating them', async () => {
  const env = envWithDb();
  await addUser(env, { id: 'usr_owner0001', username: 'owner', role: 'owner' });
  const cookie = await login(env, 'owner');
  const created = await call(env, '/api/documents', { method: 'POST', headers: auth(cookie), body: {} });
  assert.equal(created.response.status, 201);
  const documentId = created.body.document.id;
  const notionId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const saved = await call(env, '/api/documents/' + documentId, {
    method: 'PUT',
    headers: auth(cookie),
    body: {
      title: '링크 감사 문서',
      version: 1,
      save_id: 'snap_linkaudit0000001',
      blocks: [{ id: 'blk_linkaudit0001', type: 'text', content: '[외부](https://example.com/docs) https://www.notion.so/' + notionId + ' javascript:alert(1)', checked: false, position: 0 }]
    }
  });
  assert.equal(saved.response.status, 200, JSON.stringify(saved.body));
  const before = env.DB.database.prepare('SELECT version,active_snapshot_id FROM documents WHERE id=?').get(documentId);
  const audited = await call(env, '/api/import/notion-api/link-audit', { headers: auth(cookie) });
  assert.equal(audited.response.status, 200, JSON.stringify(audited.body));
  assert.equal(audited.body.read_only, true);
  assert.equal(audited.body.scope.documents, 1);
  assert.equal(audited.body.scope.blocks, 1);
  assert.equal(audited.body.totals.external_http, 1);
  assert.equal(audited.body.totals.internal_notion, 1);
  assert.equal(audited.body.totals.missing_targets, 1);
  assert.equal(audited.body.totals.unsupported_scheme, 1);
  const after = env.DB.database.prepare('SELECT version,active_snapshot_id FROM documents WHERE id=?').get(documentId);
  assert.deepEqual(after, before);
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
