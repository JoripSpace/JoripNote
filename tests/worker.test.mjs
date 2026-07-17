import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

import worker, {
  buildCaptchaSvg,
  escapeXml,
  hashPassword,
  normalizeUsername,
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
  }

  prepare(sql) {
    return new D1Statement(this.database, sql);
  }

  async batch(statements) {
    return Promise.all(statements.map((statement) => statement.run()));
  }
}

function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && typeof options.body !== 'string') {
    headers.set('content-type', 'application/json');
    options = { ...options, body: JSON.stringify(options.body) };
  }
  return new Request('https://accord.example' + path, { ...options, headers });
}

function sessionCookie(response) {
  return response.headers.get('set-cookie').split(';', 1)[0];
}

test('username rules keep IDs simple and predictable', () => {
  assert.equal(normalizeUsername('  User_01  '), 'User_01');
  assert.equal(validateUsername('User_01'), true);
  assert.equal(validateUsername('ab'), false);
  assert.equal(validateUsername('한글아이디'), false);
  assert.equal(validateUsername('user-name'), false);
});

test('password rules enforce the documented length', () => {
  assert.equal(validatePassword('12345678'), true);
  assert.equal(validatePassword('short'), false);
  assert.equal(validatePassword('x'.repeat(73)), false);
});

test('password hashing is salted and verifiable', async () => {
  const password = 'correct horse battery staple';
  const first = await hashPassword(password, 'salt-one', 1000);
  const second = await hashPassword(password, 'salt-two', 1000);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(password, 'salt-one', 1000, first), true);
  assert.equal(await verifyPassword('wrong password', 'salt-one', 1000, first), false);
});

test('cookie parser does not truncate values containing equals', () => {
  assert.deepEqual(parseCookies('a=1; accord_session=abc==; theme=dark'), {
    a: '1',
    accord_session: 'abc==',
    theme: 'dark'
  });
});

test('captcha SVG escapes markup and contains no executable content', () => {
  const svg = buildCaptchaSvg('<A&"');
  assert.match(svg, /&lt;A&amp;&quot;/);
  assert.doesNotMatch(svg, /<script/i);
  assert.equal(escapeXml("'<>&"), '&apos;&lt;&gt;&amp;');
});

test('home page and assets include security headers', async () => {
  const response = await worker.fetch(new Request('https://accord.example/'), {});
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  const homeBody = await response.text();
  assert.match(homeBody, /어코드/);
  assert.match(homeBody, /app\.js\?v=20260717-search/);

  const script = await worker.fetch(new Request('https://accord.example/app.js'), {});
  assert.equal(script.headers.get('content-type'), 'text/javascript; charset=utf-8');
  assert.equal(script.headers.get('cache-control'), 'no-cache');
  const scriptBody = await script.text();
  assert.match(scriptBody, /_joripspace\/realtime/);
  assert.match(scriptBody, /params\.set\('search', search\)/);
  assert.match(scriptBody, /appendHighlightedText/);
  assert.match(scriptBody, /event\.ctrlKey \|\| event\.metaKey/);
});

test('health endpoint stays available before DB setup', async () => {
  const response = await worker.fetch(new Request('https://accord.example/health'), {});
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, service: 'accord' });
});

test('signup, login, chat identity, profile lookup and logout work end to end', async () => {
  const DB = new D1Database();
  const env = { DB };
  const originHeaders = { origin: 'https://accord.example', 'cf-connecting-ip': '203.0.113.10' };

  const captchaResponse = await worker.fetch(request('/api/captcha', { headers: originHeaders }), env);
  assert.equal(captchaResponse.status, 200);
  const captcha = await captchaResponse.json();
  const imageResponse = await worker.fetch(request(captcha.image_url), env);
  const image = await imageResponse.text();
  const answer = image.match(/<text[^>]*>([^<]+)<\/text>/)[1];

  const signupResponse = await worker.fetch(request('/api/signup', {
    method: 'POST',
    headers: originHeaders,
    body: { username: 'accord_user', password: 'correct-password', captcha_id: captcha.id, captcha_answer: answer }
  }), env);
  assert.equal(signupResponse.status, 201);
  const cookie = sessionCookie(signupResponse);
  assert.match(cookie, /^accord_session=/);

  const storedUser = DB.database.prepare('SELECT username, password_hash, password_iterations FROM users').get();
  assert.equal(storedUser.username, 'accord_user');
  assert.notEqual(storedUser.password_hash, 'correct-password');
  assert.equal(storedUser.password_iterations, 100000);
  const storedSession = DB.database.prepare('SELECT token_hash FROM sessions').get();
  assert.doesNotMatch(cookie, new RegExp(storedSession.token_hash));

  const meResponse = await worker.fetch(request('/api/me', { headers: { cookie } }), env);
  assert.equal(meResponse.status, 200);
  assert.equal((await meResponse.json()).user.username, 'accord_user');

  const configResponse = await worker.fetch(request('/api/chat-config', { headers: { cookie } }), env);
  const config = await configResponse.json();
  assert.match(config.room, /^room_[A-Za-z0-9_-]{30}$/);
  assert.match(config.user_key, /^[A-Za-z0-9_-]{32}$/);

  const realtimeId = 'usr_accordRealtime123';
  const bindResponse = await worker.fetch(request('/api/realtime-identity', {
    method: 'POST', headers: { ...originHeaders, cookie }, body: { realtime_id: realtimeId }
  }), env);
  assert.equal(bindResponse.status, 200);

  const profilesResponse = await worker.fetch(request('/api/profiles', {
    method: 'POST', headers: { ...originHeaders, cookie }, body: { ids: [realtimeId] }
  }), env);
  assert.deepEqual((await profilesResponse.json()).profiles, { [realtimeId]: 'accord_user' });

  const logoutResponse = await worker.fetch(request('/api/logout', {
    method: 'POST', headers: { ...originHeaders, cookie }
  }), env);
  assert.equal(logoutResponse.status, 200);
  assert.match(logoutResponse.headers.get('set-cookie'), /Max-Age=0/);

  const wrongLogin = await worker.fetch(request('/api/login', {
    method: 'POST', headers: originHeaders, body: { username: 'accord_user', password: 'wrong-password' }
  }), env);
  assert.equal(wrongLogin.status, 401);

  const loginResponse = await worker.fetch(request('/api/login', {
    method: 'POST', headers: originHeaders, body: { username: 'ACCORD_USER', password: 'correct-password' }
  }), env);
  assert.equal(loginResponse.status, 200);
  assert.match(loginResponse.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Lax/);
});
