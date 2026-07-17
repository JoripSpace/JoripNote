const SESSION_COOKIE = 'accord_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const PASSWORD_ITERATIONS = 210000;
const CAPTCHA_TTL_SECONDS = 60 * 5;
const CAPTCHA_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

const encoder = new TextEncoder();

const HTML = String.raw`<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0d1020">
  <title>어코드 — 함께 나누는 대화</title>
  <link rel="stylesheet" href="/app.css">
</head>
<body>
  <main class="shell">
    <section id="auth-view" class="auth-layout">
      <div class="brand-panel">
        <div class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></div>
        <p class="eyebrow">ACCORD</p>
        <h1>같은 공간에서<br>대화를 맞추다.</h1>
        <p class="brand-copy">어코드는 여러 사람이 편안하게 이야기를 나누는 실시간 채팅 공간입니다.</p>
        <div class="presence-preview" aria-hidden="true">
          <div class="avatar-stack"><i>한</i><i>윤</i><i>서</i><i>+</i></div>
          <span>지금, 함께 이야기해요</span>
        </div>
      </div>

      <div class="auth-panel">
        <div class="mobile-brand"><strong>어코드</strong><span>ACCORD</span></div>
        <div class="auth-card">
          <div class="tab-list" role="tablist" aria-label="계정 메뉴">
            <button id="login-tab" class="tab active" type="button" role="tab" aria-selected="true">로그인</button>
            <button id="signup-tab" class="tab" type="button" role="tab" aria-selected="false">회원가입</button>
          </div>

          <div id="auth-alert" class="alert" role="alert" hidden></div>

          <form id="login-form" class="auth-form">
            <div>
              <label for="login-id">아이디</label>
              <input id="login-id" name="username" autocomplete="username" minlength="3" maxlength="20" required placeholder="아이디를 입력하세요">
            </div>
            <div>
              <label for="login-password">비밀번호</label>
              <input id="login-password" name="password" type="password" autocomplete="current-password" minlength="8" maxlength="72" required placeholder="비밀번호를 입력하세요">
            </div>
            <button class="primary-button" type="submit">어코드 시작하기</button>
            <p class="form-note">비밀번호 찾기는 아직 제공하지 않습니다.</p>
          </form>

          <form id="signup-form" class="auth-form" hidden>
            <div>
              <label for="signup-id">아이디</label>
              <input id="signup-id" name="username" autocomplete="username" minlength="3" maxlength="20" pattern="[A-Za-z0-9_]+" required placeholder="영문, 숫자, 밑줄 3–20자">
            </div>
            <div>
              <label for="signup-password">비밀번호</label>
              <input id="signup-password" name="password" type="password" autocomplete="new-password" minlength="8" maxlength="72" required placeholder="8자 이상 입력하세요">
            </div>
            <div>
              <div class="label-row"><label for="captcha-answer">자동가입 방지</label><button id="refresh-captcha" class="text-button" type="button">새로고침</button></div>
              <div class="captcha-box"><img id="captcha-image" alt="자동가입 방지 문자"><span id="captcha-loading">불러오는 중…</span></div>
              <input id="captcha-answer" name="captcha" autocomplete="off" maxlength="5" required placeholder="이미지 속 문자를 입력하세요">
            </div>
            <button class="primary-button" type="submit">회원가입하고 입장하기</button>
            <p class="form-note">가입하면 하나의 공용 대화방에 참여합니다.</p>
          </form>
        </div>
      </div>
    </section>

    <section id="chat-view" class="chat-layout" hidden>
      <aside class="sidebar">
        <div class="sidebar-brand">
          <div class="brand-mark small" aria-hidden="true"><span></span><span></span><span></span></div>
          <div><strong>어코드</strong><span>ACCORD</span></div>
        </div>
        <div class="room-label">대화방</div>
        <button class="room-button active" type="button">
          <span class="room-icon">#</span>
          <span><strong>모두의 대화</strong><small>공용 채팅방</small></span>
          <i id="room-dot"></i>
        </button>
        <div class="sidebar-footer">
          <div class="profile-chip"><span id="profile-avatar">A</span><div><strong id="profile-name"></strong><small>온라인</small></div></div>
          <button id="logout-button" class="icon-button" type="button" aria-label="로그아웃" title="로그아웃">↗</button>
        </div>
      </aside>

      <section class="conversation">
        <header class="chat-header">
          <div>
            <p class="eyebrow">PUBLIC ROOM</p>
            <h2># 모두의 대화</h2>
          </div>
          <div class="header-actions">
            <label class="search-box">
              <span aria-hidden="true">⌕</span>
              <input id="message-search" type="search" maxlength="60" placeholder="대화 검색" aria-label="대화 검색">
            </label>
            <button id="search-button" class="secondary-button" type="button">검색</button>
          </div>
        </header>

        <div id="connection-banner" class="connection-banner">연결 준비 중…</div>
        <div id="search-summary" class="search-summary" hidden><span></span><button type="button">검색 닫기</button></div>

        <div id="message-list" class="message-list" aria-live="polite" aria-label="채팅 메시지">
          <div id="empty-state" class="empty-state">
            <div class="empty-mark">A</div>
            <h3>첫 대화를 시작해 보세요</h3>
            <p>함께 있는 사람들에게 반갑게 인사해 보세요.</p>
          </div>
        </div>

        <form id="message-form" class="composer">
          <label class="sr-only" for="message-input">메시지</label>
          <textarea id="message-input" maxlength="1000" rows="1" placeholder="# 모두의 대화에 메시지 보내기" required></textarea>
          <div class="composer-bottom">
            <span id="message-count">0 / 1000</span>
            <button id="send-button" class="send-button" type="submit" disabled aria-label="메시지 보내기">↑</button>
          </div>
        </form>
      </section>
    </section>
  </main>
  <script src="/app.js" defer></script>
</body>
</html>`;

const CSS = String.raw`:root {
  color-scheme: dark;
  --ink: #f5f3ff;
  --muted: #9c9bb0;
  --panel: #14172a;
  --panel-2: #1b1f35;
  --line: rgba(255,255,255,.09);
  --accent: #9e8cff;
  --accent-2: #6f5bf0;
  --success: #69d6a2;
  --danger: #ff8d9a;
  font-family: Inter, Pretendard, "Noto Sans KR", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}
* { box-sizing: border-box; }
body { margin: 0; min-width: 320px; min-height: 100vh; background: #090b16; color: var(--ink); }
button, input, textarea { font: inherit; }
button { color: inherit; }
[hidden] { display: none !important; }
.shell { min-height: 100vh; }
.auth-layout { min-height: 100vh; display: grid; grid-template-columns: minmax(360px, .92fr) minmax(440px, 1.08fr); }
.brand-panel { position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: center; padding: clamp(48px, 8vw, 118px); background:
  radial-gradient(circle at 22% 18%, rgba(158,140,255,.24), transparent 34%),
  radial-gradient(circle at 80% 76%, rgba(90,74,195,.22), transparent 38%),
  linear-gradient(145deg, #11142a, #090b16 70%); }
.brand-panel::before, .brand-panel::after { content: ""; position: absolute; border: 1px solid rgba(158,140,255,.12); border-radius: 50%; }
.brand-panel::before { width: 460px; height: 460px; right: -220px; top: -110px; }
.brand-panel::after { width: 300px; height: 300px; left: -170px; bottom: -110px; }
.brand-mark { display: flex; align-items: end; gap: 5px; width: 48px; height: 42px; margin-bottom: 38px; }
.brand-mark span { display: block; width: 10px; border-radius: 10px 10px 3px 3px; transform: rotate(25deg); background: linear-gradient(#b8adff, #735cf3); box-shadow: 0 0 22px rgba(158,140,255,.28); }
.brand-mark span:nth-child(1) { height: 22px; }
.brand-mark span:nth-child(2) { height: 36px; }
.brand-mark span:nth-child(3) { height: 28px; }
.brand-mark.small { width: 32px; height: 30px; gap: 3px; margin: 0; }
.brand-mark.small span { width: 7px; }
.brand-mark.small span:nth-child(1) { height: 15px; }
.brand-mark.small span:nth-child(2) { height: 25px; }
.brand-mark.small span:nth-child(3) { height: 19px; }
.eyebrow { margin: 0 0 14px; color: var(--accent); font-size: 11px; font-weight: 800; letter-spacing: .2em; }
.brand-panel h1 { margin: 0; font-size: clamp(44px, 5.4vw, 76px); line-height: 1.06; letter-spacing: -.06em; }
.brand-copy { max-width: 440px; margin: 28px 0 0; color: #b7b5ca; font-size: 17px; line-height: 1.75; }
.presence-preview { display: flex; align-items: center; gap: 14px; margin-top: 56px; color: #c8c6d8; font-size: 13px; }
.avatar-stack { display: flex; }
.avatar-stack i { display: grid; place-items: center; width: 34px; height: 34px; margin-left: -8px; border: 2px solid #0d1020; border-radius: 50%; background: #2b2f4c; color: #e8e4ff; font-size: 11px; font-style: normal; }
.avatar-stack i:first-child { margin-left: 0; background: #7061d6; }
.avatar-stack i:nth-child(2) { background: #435889; }
.avatar-stack i:nth-child(3) { background: #784c72; }
.auth-panel { display: grid; place-items: center; padding: 40px; background: #0c0e1b; }
.auth-card { width: min(100%, 430px); }
.mobile-brand { display: none; }
.tab-list { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 5px; margin-bottom: 32px; border-radius: 14px; background: #15182a; }
.tab { min-height: 44px; border: 0; border-radius: 10px; background: transparent; color: var(--muted); cursor: pointer; font-weight: 700; }
.tab.active { background: #262a43; color: white; box-shadow: 0 4px 14px rgba(0,0,0,.22); }
.auth-form { display: grid; gap: 20px; }
.auth-form label, .label-row { display: flex; justify-content: space-between; margin-bottom: 9px; color: #d9d7e6; font-size: 13px; font-weight: 700; }
input, textarea { width: 100%; border: 1px solid var(--line); outline: none; background: #15182a; color: white; transition: border-color .16s, box-shadow .16s; }
input { height: 50px; padding: 0 15px; border-radius: 11px; }
input:focus, textarea:focus { border-color: rgba(158,140,255,.7); box-shadow: 0 0 0 3px rgba(158,140,255,.12); }
input::placeholder, textarea::placeholder { color: #696b7f; }
.primary-button { height: 52px; margin-top: 6px; border: 0; border-radius: 12px; background: linear-gradient(135deg, var(--accent), var(--accent-2)); color: #0d0d18; cursor: pointer; font-weight: 900; box-shadow: 0 12px 30px rgba(111,91,240,.22); }
.primary-button:disabled { cursor: wait; opacity: .65; }
.form-note { margin: -5px 0 0; color: #76788d; font-size: 12px; text-align: center; }
.alert { padding: 12px 14px; margin: -16px 0 20px; border: 1px solid rgba(255,141,154,.25); border-radius: 10px; background: rgba(255,141,154,.08); color: #ffc1c8; font-size: 13px; line-height: 1.45; }
.text-button { padding: 0; border: 0; background: transparent; color: var(--accent); cursor: pointer; font-size: 12px; }
.captcha-box { position: relative; display: grid; place-items: center; height: 74px; margin-bottom: 10px; overflow: hidden; border: 1px solid var(--line); border-radius: 11px; background: #eee; }
.captcha-box img { width: 100%; height: 100%; object-fit: cover; }
.captcha-box span { position: absolute; color: #555; font-size: 12px; }

.chat-layout { min-height: 100vh; display: grid; grid-template-columns: 270px 1fr; background: #0b0d18; }
.sidebar { display: flex; flex-direction: column; min-height: 100vh; padding: 28px 18px 20px; border-right: 1px solid var(--line); background: #101321; }
.sidebar-brand { display: flex; align-items: center; gap: 12px; padding: 0 10px 34px; }
.sidebar-brand strong { display: block; font-size: 18px; letter-spacing: -.03em; }
.sidebar-brand div:last-child span, .mobile-brand span { display: block; margin-top: 2px; color: #696c82; font-size: 8px; font-weight: 800; letter-spacing: .18em; }
.room-label { padding: 0 12px 10px; color: #686b7f; font-size: 10px; font-weight: 800; letter-spacing: .14em; }
.room-button { display: grid; grid-template-columns: 34px 1fr 8px; align-items: center; gap: 10px; width: 100%; padding: 11px; border: 0; border-radius: 12px; background: rgba(158,140,255,.1); text-align: left; cursor: default; }
.room-button strong, .room-button small { display: block; }
.room-button strong { font-size: 13px; }
.room-button small { margin-top: 4px; color: #84869b; font-size: 10px; }
.room-icon { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: rgba(158,140,255,.16); color: var(--accent); font-weight: 800; }
.room-button i { width: 7px; height: 7px; border-radius: 50%; background: #5a5d70; }
.room-button i.online { background: var(--success); box-shadow: 0 0 10px rgba(105,214,162,.6); }
.sidebar-footer { display: flex; align-items: center; gap: 8px; padding: 14px 6px 0; margin-top: auto; border-top: 1px solid var(--line); }
.profile-chip { display: flex; align-items: center; gap: 9px; min-width: 0; flex: 1; }
.profile-chip > span { display: grid; place-items: center; width: 35px; height: 35px; flex: 0 0 auto; border-radius: 11px; background: linear-gradient(145deg, #7a68e5, #4c3e9a); font-size: 12px; font-weight: 800; }
.profile-chip strong, .profile-chip small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.profile-chip strong { max-width: 130px; font-size: 12px; }
.profile-chip small { margin-top: 3px; color: var(--success); font-size: 9px; }
.icon-button { width: 34px; height: 34px; border: 1px solid var(--line); border-radius: 9px; background: transparent; color: #85879a; cursor: pointer; }
.conversation { display: grid; grid-template-rows: auto auto auto 1fr auto; min-width: 0; height: 100vh; }
.chat-header { display: flex; align-items: center; justify-content: space-between; min-height: 88px; padding: 18px clamp(22px, 4vw, 54px); border-bottom: 1px solid var(--line); background: rgba(11,13,24,.92); backdrop-filter: blur(12px); }
.chat-header .eyebrow { margin-bottom: 6px; font-size: 8px; }
.chat-header h2 { margin: 0; font-size: 18px; letter-spacing: -.03em; }
.header-actions { display: flex; align-items: center; gap: 8px; }
.search-box { display: flex; align-items: center; gap: 8px; width: min(28vw, 270px); height: 40px; padding: 0 12px; border: 1px solid var(--line); border-radius: 10px; background: #151827; color: #797c91; }
.search-box input { height: auto; padding: 0; border: 0; background: transparent; box-shadow: none; }
.secondary-button { height: 40px; padding: 0 15px; border: 1px solid var(--line); border-radius: 10px; background: #1b1e31; cursor: pointer; font-size: 12px; font-weight: 700; }
.connection-banner { padding: 7px 24px; background: #1c2034; color: #aaaec3; font-size: 11px; text-align: center; }
.connection-banner.online { background: rgba(105,214,162,.08); color: var(--success); }
.connection-banner.error { background: rgba(255,141,154,.08); color: var(--danger); }
.search-summary { display: flex; align-items: center; justify-content: space-between; padding: 9px clamp(22px, 4vw, 54px); border-bottom: 1px solid var(--line); background: #121525; color: #bfc0d1; font-size: 12px; }
.search-summary button { border: 0; background: transparent; color: var(--accent); cursor: pointer; }
.message-list { overflow-y: auto; padding: 32px clamp(22px, 4vw, 80px) 26px; scroll-behavior: smooth; }
.empty-state { display: grid; justify-items: center; align-content: center; min-height: 100%; color: var(--muted); text-align: center; }
.empty-mark { display: grid; place-items: center; width: 58px; height: 58px; margin-bottom: 15px; border: 1px solid rgba(158,140,255,.24); border-radius: 20px; background: rgba(158,140,255,.08); color: var(--accent); font-size: 24px; font-weight: 900; }
.empty-state h3 { margin: 0 0 7px; color: #d9d7e8; font-size: 16px; }
.empty-state p { margin: 0; font-size: 12px; }
.message { display: grid; grid-template-columns: 40px minmax(0, 680px); gap: 12px; margin-bottom: 22px; }
.message.mine { justify-content: end; grid-template-columns: minmax(0, 680px) 40px; }
.message-avatar { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 13px; background: #292d46; color: #cec8ff; font-size: 12px; font-weight: 800; }
.message.mine .message-avatar { grid-column: 2; background: linear-gradient(145deg, #7a68e5, #4c3e9a); }
.message-content { min-width: 0; }
.message.mine .message-content { grid-row: 1; text-align: right; }
.message-meta { display: flex; align-items: baseline; gap: 8px; margin-bottom: 7px; }
.message.mine .message-meta { justify-content: flex-end; }
.message-meta strong { font-size: 12px; }
.message-meta time { color: #686b7e; font-size: 9px; }
.message-bubble { display: inline-block; max-width: 100%; padding: 11px 14px; border: 1px solid var(--line); border-radius: 4px 14px 14px; background: #171a2a; color: #e3e1ed; font-size: 14px; line-height: 1.55; text-align: left; white-space: pre-wrap; overflow-wrap: anywhere; }
.message.mine .message-bubble { border-color: rgba(158,140,255,.18); border-radius: 14px 4px 14px 14px; background: #2b2750; }
.composer { margin: 0 clamp(22px, 4vw, 54px) 28px; padding: 12px 14px 10px; border: 1px solid var(--line); border-radius: 15px; background: #151827; box-shadow: 0 12px 40px rgba(0,0,0,.2); }
.composer textarea { min-height: 28px; max-height: 130px; padding: 4px 0; resize: none; border: 0; background: transparent; box-shadow: none; line-height: 1.5; }
.composer-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 5px; }
.composer-bottom span { color: #616478; font-size: 9px; }
.send-button { width: 35px; height: 35px; border: 0; border-radius: 11px; background: var(--accent); color: #17142a; cursor: pointer; font-size: 18px; font-weight: 900; }
.send-button:disabled { background: #303346; color: #686b7e; cursor: not-allowed; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

@media (max-width: 820px) {
  .auth-layout { grid-template-columns: 1fr; }
  .brand-panel { display: none; }
  .auth-panel { align-content: start; padding: 28px 20px 48px; }
  .mobile-brand { display: flex; align-items: baseline; gap: 10px; width: min(100%, 430px); margin-bottom: 56px; }
  .mobile-brand strong { font-size: 21px; }
  .chat-layout { grid-template-columns: 1fr; }
  .sidebar { min-height: auto; padding: 14px 18px; border-right: 0; border-bottom: 1px solid var(--line); }
  .sidebar-brand, .room-label, .sidebar-footer { display: none; }
  .room-button { padding: 8px 10px; }
  .conversation { height: calc(100vh - 67px); }
  .chat-header { min-height: 74px; padding: 14px 18px; }
  .header-actions { gap: 5px; }
  .search-box { width: 140px; }
  .secondary-button { padding: 0 10px; }
  .message-list { padding: 24px 16px 18px; }
  .message { grid-template-columns: 34px minmax(0, 1fr); gap: 9px; }
  .message.mine { grid-template-columns: minmax(0, 1fr) 34px; }
  .message-avatar { width: 34px; height: 34px; border-radius: 11px; }
  .composer { margin: 0 12px 12px; }
}
`;

const APP_JS = String.raw`'use strict';
const state = {
  user: null,
  captchaId: null,
  socket: null,
  reconnectTimer: null,
  reconnectAttempts: 0,
  room: null,
  realtimeKey: null,
  realtimeId: null,
  messages: new Map(),
  profiles: new Map(),
  searchMode: false
};

const $ = (selector) => document.querySelector(selector);
const authView = $('#auth-view');
const chatView = $('#chat-view');
const authAlert = $('#auth-alert');
const loginForm = $('#login-form');
const signupForm = $('#signup-form');
const loginTab = $('#login-tab');
const signupTab = $('#signup-tab');
const messageList = $('#message-list');
const emptyState = $('#empty-state');
const messageInput = $('#message-input');
const sendButton = $('#send-button');
const connectionBanner = $('#connection-banner');
const roomDot = $('#room-dot');

async function api(path, options) {
  const config = Object.assign({ credentials: 'same-origin' }, options || {});
  config.headers = Object.assign({}, config.headers || {});
  if (config.body && typeof config.body !== 'string') {
    config.headers['content-type'] = 'application/json';
    config.body = JSON.stringify(config.body);
  }
  const response = await fetch(path, config);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || '요청을 처리하지 못했습니다.');
    error.status = response.status;
    throw error;
  }
  return body;
}

function setAuthMode(mode) {
  const login = mode === 'login';
  loginForm.hidden = !login;
  signupForm.hidden = login;
  loginTab.classList.toggle('active', login);
  signupTab.classList.toggle('active', !login);
  loginTab.setAttribute('aria-selected', String(login));
  signupTab.setAttribute('aria-selected', String(!login));
  authAlert.hidden = true;
  if (!login && !state.captchaId) loadCaptcha();
}

function showAuthError(message) {
  authAlert.textContent = message;
  authAlert.hidden = false;
}

function setBusy(form, busy) {
  const button = form.querySelector('button[type="submit"]');
  button.disabled = busy;
}

async function loadCaptcha() {
  const image = $('#captcha-image');
  const loading = $('#captcha-loading');
  image.removeAttribute('src');
  loading.hidden = false;
  state.captchaId = null;
  try {
    const result = await api('/api/captcha');
    state.captchaId = result.id;
    image.src = result.image_url;
    image.onload = () => { loading.hidden = true; };
  } catch (error) {
    loading.textContent = '캡차를 불러오지 못했습니다.';
    showAuthError(error.message);
  }
}

loginTab.addEventListener('click', () => setAuthMode('login'));
signupTab.addEventListener('click', () => setAuthMode('signup'));
$('#refresh-captcha').addEventListener('click', loadCaptcha);

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setBusy(loginForm, true);
  authAlert.hidden = true;
  try {
    const form = new FormData(loginForm);
    const result = await api('/api/login', { method: 'POST', body: { username: form.get('username'), password: form.get('password') } });
    enterChat(result.user);
  } catch (error) {
    showAuthError(error.message);
  } finally {
    setBusy(loginForm, false);
  }
});

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setBusy(signupForm, true);
  authAlert.hidden = true;
  try {
    const form = new FormData(signupForm);
    const result = await api('/api/signup', {
      method: 'POST',
      body: {
        username: form.get('username'),
        password: form.get('password'),
        captcha_id: state.captchaId,
        captcha_answer: form.get('captcha')
      }
    });
    enterChat(result.user);
  } catch (error) {
    showAuthError(error.message);
    $('#captcha-answer').value = '';
    await loadCaptcha();
  } finally {
    setBusy(signupForm, false);
  }
});

$('#logout-button').addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST' }).catch(() => {});
  leaveChat();
});

function enterChat(user) {
  state.user = user;
  authView.hidden = true;
  chatView.hidden = false;
  $('#profile-name').textContent = user.username;
  $('#profile-avatar').textContent = user.username.slice(0, 1).toUpperCase();
  connectChat();
}

function leaveChat() {
  clearTimeout(state.reconnectTimer);
  if (state.socket) state.socket.close();
  state.socket = null;
  state.user = null;
  state.messages.clear();
  state.profiles.clear();
  state.realtimeId = null;
  chatView.hidden = true;
  authView.hidden = false;
  loginForm.reset();
  setAuthMode('login');
}

function setConnection(status, message) {
  connectionBanner.textContent = message;
  connectionBanner.className = 'connection-banner ' + status;
  roomDot.classList.toggle('online', status === 'online');
}

async function connectChat() {
  setConnection('', '대화방에 연결하는 중…');
  try {
    const config = await api('/api/chat-config');
    state.room = config.room;
    state.realtimeKey = config.user_key;
    await loadMessages();
    openSocket();
  } catch (error) {
    if (error.status === 401) return leaveChat();
    setConnection('error', error.message);
  }
}

function openSocket() {
  if (!state.room || !state.realtimeKey) return;
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = protocol + '//' + location.host + '/_joripspace/realtime?room=' + encodeURIComponent(state.room) + '&user=' + encodeURIComponent(state.realtimeKey);
  const socket = new WebSocket(url);
  state.socket = socket;

  socket.addEventListener('open', () => setConnection('', '연결 확인 중…'));
  socket.addEventListener('message', async (event) => {
    let message;
    try { message = JSON.parse(event.data); } catch { return; }
    if (message.type === 'system.connected') {
      state.reconnectAttempts = 0;
      state.realtimeId = message.user;
      setConnection('online', '실시간으로 연결되었습니다');
      await api('/api/realtime-identity', { method: 'POST', body: { realtime_id: message.user } }).catch(() => {});
      state.profiles.set(message.user, state.user.username);
      renderMessages(false);
      messageInput.dispatchEvent(new Event('input'));
      return;
    }
    if (message.type === 'message' && message.data && typeof message.data.text === 'string') {
      addMessage(message, true);
    }
  });
  socket.addEventListener('close', () => {
    if (!state.user) return;
    setConnection('error', '연결이 끊겼습니다. 다시 연결하는 중…');
    const delay = Math.min(1000 * Math.pow(2, state.reconnectAttempts++), 12000);
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = setTimeout(openSocket, delay);
  });
  socket.addEventListener('error', () => setConnection('error', '실시간 연결을 확인하고 있습니다…'));
}

async function loadMessages(search) {
  if (!state.room) return;
  const params = new URLSearchParams({ limit: '50' });
  if (search) params.set('search', search);
  const response = await fetch('/_joripspace/realtime/rooms/' + encodeURIComponent(state.room) + '/messages?' + params.toString(), { credentials: 'same-origin' });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error('대화 기록을 불러오지 못했습니다.');
  state.messages.clear();
  (result.messages || []).forEach((message) => {
    if (message.type === 'message' && message.data && typeof message.data.text === 'string') {
      state.messages.set(message.id, message);
    }
  });
  await loadProfiles();
  renderMessages(false);
}

function addMessage(message, scroll) {
  if (state.searchMode || state.messages.has(message.id)) return;
  state.messages.set(message.id, message);
  renderMessages(scroll);
  if (!state.profiles.has(message.user)) loadProfiles();
}

async function loadProfiles() {
  const ids = Array.from(new Set(Array.from(state.messages.values()).map((message) => message.user).filter(Boolean))).slice(0, 100);
  if (!ids.length) return;
  try {
    const result = await api('/api/profiles', { method: 'POST', body: { ids } });
    Object.entries(result.profiles || {}).forEach(([id, username]) => state.profiles.set(id, username));
  } catch {}
}

function renderMessages(scroll) {
  messageList.querySelectorAll('.message').forEach((element) => element.remove());
  const messages = Array.from(state.messages.values()).sort((a, b) => String(a.sent_at).localeCompare(String(b.sent_at)));
  emptyState.hidden = messages.length > 0;
  const fragment = document.createDocumentFragment();
  for (const message of messages) {
    const mine = message.user === state.realtimeId;
    const username = state.profiles.get(message.user) || (mine ? state.user.username : '멤버');
    const article = document.createElement('article');
    article.className = 'message' + (mine ? ' mine' : '');

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = username.slice(0, 1).toUpperCase();

    const content = document.createElement('div');
    content.className = 'message-content';
    const meta = document.createElement('div');
    meta.className = 'message-meta';
    const name = document.createElement('strong');
    name.textContent = username;
    const time = document.createElement('time');
    const date = new Date(message.sent_at);
    time.dateTime = message.sent_at;
    time.textContent = Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = message.data.text;
    meta.append(name, time);
    content.append(meta, bubble);
    article.append(avatar, content);
    fragment.append(article);
  }
  messageList.append(fragment);
  if (scroll) messageList.scrollTop = messageList.scrollHeight;
}

messageInput.addEventListener('input', () => {
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 130) + 'px';
  const length = messageInput.value.length;
  $('#message-count').textContent = length + ' / 1000';
  sendButton.disabled = !length || !state.socket || state.socket.readyState !== WebSocket.OPEN;
});
messageInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    $('#message-form').requestSubmit();
  }
});

$('#message-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text || text.length > 1000 || !state.socket || state.socket.readyState !== WebSocket.OPEN) return;
  state.socket.send(JSON.stringify({ type: 'message', id: crypto.randomUUID(), text }));
  messageInput.value = '';
  messageInput.dispatchEvent(new Event('input'));
});

$('#search-button').addEventListener('click', runSearch);
$('#message-search').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') { event.preventDefault(); runSearch(); }
});
$('#search-summary button').addEventListener('click', async () => {
  state.searchMode = false;
  $('#message-search').value = '';
  $('#search-summary').hidden = true;
  await loadMessages();
  messageList.scrollTop = messageList.scrollHeight;
});

async function runSearch() {
  const query = $('#message-search').value.trim();
  if (!query) return;
  state.searchMode = true;
  try {
    await loadMessages(query);
    const summary = $('#search-summary');
    summary.querySelector('span').textContent = '“' + query + '” 검색 결과 ' + state.messages.size + '개';
    summary.hidden = false;
  } catch (error) {
    setConnection('error', error.message);
  }
}

(async function start() {
  try {
    const result = await api('/api/me');
    enterChat(result.user);
  } catch {
    setAuthMode('login');
  }
})();
`;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export default {
  async fetch(request, env) {
    try {
      return await route(request, env);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      if (!(error instanceof HttpError)) console.error('Unhandled request error', error);
      if (new URL(request.url).pathname.startsWith('/api/')) {
        return json({ error: status === 500 ? '서버에서 요청을 처리하지 못했습니다.' : error.message }, status);
      }
      return text('요청을 처리하지 못했습니다.', status);
    }
  }
};

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'GET' && path === '/') {
    return securedResponse(new Response(HTML, { headers: { 'content-type': 'text/html; charset=utf-8' } }), true);
  }
  if (request.method === 'GET' && path === '/app.css') {
    return securedResponse(new Response(CSS, { headers: { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'public, max-age=3600' } }));
  }
  if (request.method === 'GET' && path === '/app.js') {
    return securedResponse(new Response(APP_JS, { headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'public, max-age=3600' } }));
  }
  if (request.method === 'GET' && path === '/health') {
    return json({ ok: true, service: 'accord' });
  }

  requireDb(env);

  if (request.method === 'GET' && path === '/api/captcha') return createCaptcha(request, env);
  const captchaMatch = path.match(/^\/api\/captcha\/([a-f0-9-]{36})\.svg$/);
  if (request.method === 'GET' && captchaMatch) return getCaptchaSvg(env, captchaMatch[1]);

  if (request.method === 'POST' && path === '/api/signup') {
    assertSameOrigin(request);
    return signup(request, env);
  }
  if (request.method === 'POST' && path === '/api/login') {
    assertSameOrigin(request);
    return login(request, env);
  }
  if (request.method === 'POST' && path === '/api/logout') {
    assertSameOrigin(request);
    return logout(request, env);
  }
  if (request.method === 'GET' && path === '/api/me') {
    const user = await requireUser(request, env);
    return json({ user: publicUser(user) });
  }
  if (request.method === 'GET' && path === '/api/chat-config') {
    const user = await requireUser(request, env);
    return chatConfig(env, user);
  }
  if (request.method === 'POST' && path === '/api/realtime-identity') {
    assertSameOrigin(request);
    const user = await requireUser(request, env);
    return bindRealtimeIdentity(request, env, user);
  }
  if (request.method === 'POST' && path === '/api/profiles') {
    assertSameOrigin(request);
    await requireUser(request, env);
    return profiles(request, env);
  }
  throw new HttpError(404, '페이지를 찾을 수 없습니다.');
}

function requireDb(env) {
  if (!env || !env.DB) throw new HttpError(503, 'DB 연결을 준비하는 중입니다.');
}

function assertSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, '허용되지 않은 요청입니다.');
}

async function readJson(request) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 12000) throw new HttpError(413, '요청이 너무 큽니다.');
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, '입력값을 확인해 주세요.');
  }
}

export function normalizeUsername(value) {
  return String(value || '').normalize('NFKC').trim();
}

export function validateUsername(value) {
  return /^[A-Za-z0-9_]{3,20}$/.test(value);
}

export function validatePassword(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 72;
}

async function createCaptcha(request, env) {
  const ipKey = await requestKey(request, 'captcha');
  await enforceRateLimit(env.DB, 'captcha', ipKey, 20, 600);
  const id = crypto.randomUUID();
  const code = randomString(5, CAPTCHA_ALPHABET);
  const answerHash = await sha256Hex(id + ':' + code.toLowerCase());
  const expiresAt = nowSeconds() + CAPTCHA_TTL_SECONDS;
  const svg = buildCaptchaSvg(code);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM captcha_challenges WHERE expires_at < ? OR consumed_at IS NOT NULL').bind(nowSeconds() - 3600),
    env.DB.prepare('INSERT INTO captcha_challenges (id, answer_hash, svg, expires_at, attempts, created_at) VALUES (?, ?, ?, ?, 0, ?)').bind(id, answerHash, svg, expiresAt, nowSeconds())
  ]);
  return json({ id, image_url: '/api/captcha/' + id + '.svg', expires_in: CAPTCHA_TTL_SECONDS });
}

async function getCaptchaSvg(env, id) {
  const row = await env.DB.prepare('SELECT svg FROM captcha_challenges WHERE id = ? AND consumed_at IS NULL AND expires_at >= ?').bind(id, nowSeconds()).first();
  if (!row) throw new HttpError(404, '캡차가 만료되었습니다.');
  return securedResponse(new Response(row.svg, { headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'no-store' } }));
}

export function buildCaptchaSvg(code) {
  const escaped = escapeXml(code);
  const lines = Array.from({ length: 7 }, (_, index) => {
    const x1 = (index * 31 + randomInt(0, 18)) % 220;
    const y1 = randomInt(5, 65);
    const x2 = (x1 + randomInt(70, 170)) % 240;
    const y2 = randomInt(5, 65);
    return '<path d="M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 + '" />';
  }).join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="280" height="74" viewBox="0 0 280 74" role="img" aria-label="자동가입 방지 문자">' +
    '<rect width="280" height="74" fill="#eeedf4"/><g stroke="#b8b3cb" stroke-width="1.2" opacity=".65">' + lines + '</g>' +
    '<text x="140" y="50" text-anchor="middle" font-family="monospace" font-size="34" font-weight="800" letter-spacing="10" fill="#29243b" transform="rotate(-2 140 37)">' + escaped + '</text>' +
    '<g fill="#786fa0" opacity=".55"><circle cx="24" cy="18" r="2"/><circle cx="251" cy="51" r="3"/><circle cx="207" cy="14" r="2"/><circle cx="73" cy="61" r="2"/></g></svg>';
}

async function signup(request, env) {
  const body = await readJson(request);
  const username = normalizeUsername(body.username);
  if (!validateUsername(username)) throw new HttpError(400, '아이디는 영문, 숫자, 밑줄을 사용해 3–20자로 입력해 주세요.');
  if (!validatePassword(body.password)) throw new HttpError(400, '비밀번호는 8–72자로 입력해 주세요.');
  if (!body.captcha_id || !body.captcha_answer) throw new HttpError(400, '자동가입 방지 문자를 입력해 주세요.');

  const ipKey = await requestKey(request, 'signup');
  await enforceRateLimit(env.DB, 'signup', ipKey, 5, 3600);
  await verifyCaptcha(env.DB, String(body.captcha_id), String(body.captcha_answer));

  const salt = randomString(24);
  const passwordHash = await hashPassword(body.password, salt, PASSWORD_ITERATIONS);
  const id = crypto.randomUUID();
  const realtimeKey = randomString(32);
  try {
    await env.DB.prepare('INSERT INTO users (id, username, password_hash, password_salt, password_iterations, realtime_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, username, passwordHash, salt, PASSWORD_ITERATIONS, realtimeKey, nowSeconds()).run();
  } catch (error) {
    if (/unique|constraint/i.test(String(error && error.message))) throw new HttpError(409, '이미 사용 중인 아이디입니다.');
    throw error;
  }
  return createSessionResponse(env.DB, { id, username }, 201);
}

async function login(request, env) {
  const body = await readJson(request);
  const username = normalizeUsername(body.username);
  if (!validateUsername(username) || !validatePassword(body.password)) throw new HttpError(401, '아이디 또는 비밀번호가 올바르지 않습니다.');
  const ipKey = await requestKey(request, 'login:' + username.toLowerCase());
  await enforceRateLimit(env.DB, 'login', ipKey, 10, 900);

  const user = await env.DB.prepare('SELECT id, username, password_hash, password_salt, password_iterations FROM users WHERE username = ? COLLATE NOCASE').bind(username).first();
  if (!user || !(await verifyPassword(body.password, user.password_salt, Number(user.password_iterations), user.password_hash))) {
    throw new HttpError(401, '아이디 또는 비밀번호가 올바르지 않습니다.');
  }
  return createSessionResponse(env.DB, user);
}

async function logout(request, env) {
  const cookies = parseCookies(request.headers.get('cookie'));
  if (cookies[SESSION_COOKIE]) {
    const tokenHash = await sha256Hex(cookies[SESSION_COOKIE]);
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
  }
  return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie() });
}

async function requireUser(request, env) {
  const token = parseCookies(request.headers.get('cookie'))[SESSION_COOKIE];
  if (!token || token.length > 180) throw new HttpError(401, '로그인이 필요합니다.');
  const tokenHash = await sha256Hex(token);
  const user = await env.DB.prepare(
    'SELECT u.id, u.username, u.realtime_key, u.realtime_id FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?'
  ).bind(tokenHash, nowSeconds()).first();
  if (!user) throw new HttpError(401, '로그인이 만료되었습니다.');
  return user;
}

async function createSessionResponse(db, user, status = 200) {
  const token = randomString(43);
  const tokenHash = await sha256Hex(token);
  const expiresAt = nowSeconds() + SESSION_TTL_SECONDS;
  await db.batch([
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(nowSeconds()),
    db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').bind(tokenHash, user.id, expiresAt, nowSeconds())
  ]);
  return json({ user: publicUser(user) }, status, { 'set-cookie': sessionCookie(token) });
}

async function chatConfig(env, user) {
  let setting = await env.DB.prepare("SELECT value FROM app_settings WHERE key = 'general_room_id'").first();
  if (!setting) {
    const room = 'room_' + randomString(30);
    await env.DB.prepare("INSERT INTO app_settings (key, value, updated_at) VALUES ('general_room_id', ?, ?) ON CONFLICT(key) DO NOTHING").bind(room, nowSeconds()).run();
    setting = await env.DB.prepare("SELECT value FROM app_settings WHERE key = 'general_room_id'").first();
  }
  let realtimeKey = user.realtime_key;
  if (!realtimeKey) {
    realtimeKey = randomString(32);
    await env.DB.prepare('UPDATE users SET realtime_key = ? WHERE id = ?').bind(realtimeKey, user.id).run();
  }
  return json({ room: setting.value, user_key: realtimeKey });
}

async function bindRealtimeIdentity(request, env, user) {
  const body = await readJson(request);
  const id = String(body.realtime_id || '');
  if (!/^usr_[A-Za-z0-9_-]{8,80}$/.test(id)) throw new HttpError(400, '실시간 사용자 정보를 확인하지 못했습니다.');
  try {
    await env.DB.prepare('UPDATE users SET realtime_id = ? WHERE id = ?').bind(id, user.id).run();
  } catch (error) {
    if (!/unique|constraint/i.test(String(error && error.message))) throw error;
  }
  return json({ ok: true });
}

async function profiles(request, env) {
  const body = await readJson(request);
  const ids = Array.isArray(body.ids) ? Array.from(new Set(body.ids.map(String).filter((id) => /^usr_[A-Za-z0-9_-]{8,80}$/.test(id)))).slice(0, 100) : [];
  if (!ids.length) return json({ profiles: {} });
  const placeholders = ids.map(() => '?').join(',');
  const result = await env.DB.prepare('SELECT username, realtime_id FROM users WHERE realtime_id IN (' + placeholders + ')').bind(...ids).all();
  const mapped = {};
  for (const row of result.results || []) mapped[row.realtime_id] = row.username;
  return json({ profiles: mapped });
}

async function verifyCaptcha(db, id, answer) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new HttpError(400, '캡차를 새로고침해 주세요.');
  const row = await db.prepare('SELECT answer_hash, expires_at, attempts, consumed_at FROM captcha_challenges WHERE id = ?').bind(id).first();
  if (!row || row.consumed_at || Number(row.expires_at) < nowSeconds() || Number(row.attempts) >= 5) {
    throw new HttpError(400, '캡차가 만료되었습니다. 새로고침해 주세요.');
  }
  const actual = await sha256Hex(id + ':' + answer.normalize('NFKC').trim().toLowerCase());
  if (!constantTimeEqual(actual, row.answer_hash)) {
    await db.prepare('UPDATE captcha_challenges SET attempts = attempts + 1 WHERE id = ?').bind(id).run();
    throw new HttpError(400, '자동가입 방지 문자가 올바르지 않습니다.');
  }
  const result = await db.prepare('UPDATE captcha_challenges SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL AND expires_at >= ?')
    .bind(nowSeconds(), id, nowSeconds()).run();
  if (!result.meta || Number(result.meta.changes) !== 1) throw new HttpError(400, '캡차가 만료되었습니다. 새로고침해 주세요.');
}

async function enforceRateLimit(db, scope, key, limit, windowSeconds) {
  const bucket = Math.floor(nowSeconds() / windowSeconds);
  await db.prepare(
    'INSERT INTO auth_rate_limits (scope, rate_key, window_bucket, attempts, updated_at) VALUES (?, ?, ?, 1, ?) ' +
    'ON CONFLICT(scope, rate_key, window_bucket) DO UPDATE SET attempts = attempts + 1, updated_at = excluded.updated_at'
  ).bind(scope, key, bucket, nowSeconds()).run();
  const row = await db.prepare('SELECT attempts FROM auth_rate_limits WHERE scope = ? AND rate_key = ? AND window_bucket = ?').bind(scope, key, bucket).first();
  if (Number(row && row.attempts) > limit) throw new HttpError(429, '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.');
}

async function requestKey(request, suffix) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
  return sha256Hex(ip.split(',')[0].trim() + ':' + suffix);
}

export async function hashPassword(password, salt, iterations = PASSWORD_ITERATIONS) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations }, key, 256);
  return bytesToBase64Url(new Uint8Array(bits));
}

export async function verifyPassword(password, salt, iterations, expected) {
  const actual = await hashPassword(password, salt, iterations);
  return constantTimeEqual(actual, expected);
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(left, right) {
  const a = encoder.encode(String(left));
  const b = encoder.encode(String(right));
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) difference |= (a[index % a.length] || 0) ^ (b[index % b.length] || 0);
  return difference === 0;
}

function randomString(length, alphabet) {
  const chars = alphabet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join('');
}

function randomInt(min, max) {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return min + (value[0] % (max - min + 1));
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function parseCookies(header) {
  const result = {};
  for (const part of String(header || '').split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) result[key] = value;
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
  return String(value).replace(/[<>&"']/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[character]));
}

function json(value, status = 200, headers = {}) {
  return securedResponse(new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }
  }));
}

function text(value, status = 200) {
  return securedResponse(new Response(value, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } }));
}

function securedResponse(response, html = false) {
  const headers = new Headers(response.headers);
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'same-origin');
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('cross-origin-opener-policy', 'same-origin');
  headers.set('x-frame-options', 'DENY');
  if (html) {
    headers.set('content-security-policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' wss://*.joripspace.run; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
    headers.set('cache-control', 'no-store');
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
