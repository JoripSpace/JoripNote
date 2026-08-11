import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker, { hashPassword } from '../worker.js';

class Statement {
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

class PreviewDatabase {
  constructor() {
    this.database = new DatabaseSync(':memory:');
  }
  prepare(sql) {
    return new Statement(this.database, sql);
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

const DB = new PreviewDatabase();
DB.database.exec(readFileSync(new URL('../migrations/0001_initial.sql', import.meta.url), 'utf8'));
DB.database.exec(readFileSync(new URL('../migrations/0002_collaborative_documents.sql', import.meta.url), 'utf8'));
DB.database.exec(readFileSync(new URL('../migrations/0003_toggle_blocks.sql', import.meta.url), 'utf8'));
DB.database.exec(readFileSync(new URL('../migrations/0004_extended_blocks_publications.sql', import.meta.url), 'utf8'));
DB.database.exec(readFileSync(new URL('../migrations/0005_block_indentation.sql', import.meta.url), 'utf8'));
DB.database.exec(readFileSync(new URL('../migrations/0006_workspace_collaboration.sql', import.meta.url), 'utf8'));

const password = process.env.QWERTY_PREVIEW_PASSWORD;
if (!password) throw new Error('QWERTY_PREVIEW_PASSWORD is required.');
const previewDelayMs = Math.max(0, Math.min(2000, Number(process.env.QWERTY_PREVIEW_DELAY_MS) || 0));
const salt = 'local-preview-salt';
const passwordHash = await hashPassword(password, salt, 1000);
DB.database.prepare(
  'INSERT INTO users (id,username,password_hash,password_salt,password_iterations,realtime_key,created_at) VALUES (?,?,?,?,?,?,unixepoch())'
).run('usr_previewowner', 'preview_owner', passwordHash, salt, 1000, 'preview-realtime-key');
DB.database.prepare(
  "INSERT INTO project_members (project_id,user_id,role,joined_at,updated_at) VALUES ('qwerty','usr_previewowner','owner',unixepoch(),unixepoch())"
).run();

const env = {
  DB,
  STORAGE: {
    objects: new Map(),
    async put(key, value) { this.objects.set(key, value); },
    async get(key) { const value = this.objects.get(key); return value == null ? null : { body: value }; },
    async delete(key) { this.objects.delete(key); }
  },
  EMAIL_ENCRYPTION_KEY: 'local-preview-encryption-secret',
  EMAIL_BLIND_INDEX_KEY: 'local-preview-blind-index-secret'
};

const server = createServer(async (incoming, outgoing) => {
  const origin = 'http://127.0.0.1:4173';
  if (previewDelayMs && incoming.url.startsWith('/api/')) {
    await new Promise((resolve) => setTimeout(resolve, previewDelayMs));
  }
  if (incoming.url === '/__preview_login') {
    const loginResponse = await worker.fetch(new Request(origin + '/api/login', {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json', 'cf-connecting-ip': '127.0.0.1' },
      body: JSON.stringify({ username: 'preview_owner', password })
    }), env);
    outgoing.statusCode = 302;
    outgoing.setHeader('location', '/');
    outgoing.setHeader('set-cookie', loginResponse.headers.get('set-cookie'));
    outgoing.end();
    return;
  }
  const chunks = [];
  for await (const chunk of incoming) chunks.push(chunk);
  const headers = new Headers();
  for (const [name, value] of Object.entries(incoming.headers)) {
    if (value != null) headers.set(name, Array.isArray(value) ? value.join(',') : value);
  }
  const request = new Request(origin + incoming.url, {
    method: incoming.method,
    headers,
    body: ['GET', 'HEAD'].includes(incoming.method) ? undefined : Buffer.concat(chunks)
  });
  const response = await worker.fetch(request, env);
  outgoing.statusCode = response.status;
  for (const [name, value] of response.headers) outgoing.setHeader(name, value);
  outgoing.end(Buffer.from(await response.arrayBuffer()));
});

server.listen(4173, '127.0.0.1', () => {
  console.log('qwerty preview: http://127.0.0.1:4173');
});
