PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  snapshot_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (document_id, version),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

INSERT OR IGNORE INTO document_versions (id, project_id, document_id, version, snapshot_id, title, created_by, created_at)
SELECT 'ver_' || id || '_' || version, project_id, id, version, active_snapshot_id, title, updated_by, updated_at FROM documents;

CREATE INDEX IF NOT EXISTS idx_document_versions_page ON document_versions(document_id, version DESC, id DESC);

CREATE TABLE IF NOT EXISTS document_comments (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  block_id TEXT,
  body TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  resolved_at INTEGER,
  resolved_by TEXT,
  deleted_at INTEGER,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_document_comments_page ON document_comments(document_id, deleted_at, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  actor_id TEXT,
  document_id TEXT,
  comment_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('mention', 'comment', 'document', 'permission', 'upload')),
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  read_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (comment_id) REFERENCES document_comments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_page ON notifications(project_id, user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(project_id, user_id, read_at, created_at DESC);

CREATE TABLE IF NOT EXISTS activity_events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  document_id TEXT,
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_activity_events_page ON activity_events(project_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS workspace_templates (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  blocks_json TEXT NOT NULL,
  created_by TEXT,
  is_builtin INTEGER NOT NULL DEFAULT 0 CHECK (is_builtin IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (project_id, name),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_workspace_templates_page ON workspace_templates(project_id, is_builtin DESC, updated_at DESC, id DESC);

INSERT OR IGNORE INTO workspace_templates (id, project_id, name, description, icon, blocks_json, created_by, is_builtin, created_at, updated_at) VALUES
('tpl_meeting', 'qwerty', '회의록', '안건, 논의 내용과 할 일을 정리합니다.', '🗒️', '[{"type":"heading2","content":"회의 정보"},{"type":"bullet","content":"일시: "},{"type":"bullet","content":"참석자: "},{"type":"heading2","content":"안건"},{"type":"text","content":"논의할 안건을 입력하세요."},{"type":"heading2","content":"결정 및 할 일"},{"type":"todo","content":"담당자와 기한을 적어 주세요."}]', NULL, 1, unixepoch(), unixepoch()),
('tpl_daily', 'qwerty', '업무일지', '오늘의 목표와 진행 상황을 기록합니다.', '✅', '[{"type":"heading2","content":"오늘의 목표"},{"type":"todo","content":"가장 중요한 일을 적어 주세요."},{"type":"heading2","content":"진행 내용"},{"type":"text","content":"진행한 내용을 적어 주세요."},{"type":"heading2","content":"내일 할 일"},{"type":"todo","content":"다음 할 일을 적어 주세요."}]', NULL, 1, unixepoch(), unixepoch()),
('tpl_project', 'qwerty', '프로젝트 계획서', '목표, 일정, 담당자와 위험 요소를 정리합니다.', '🚀', '[{"type":"heading2","content":"프로젝트 목표"},{"type":"text","content":"달성하려는 목표를 적어 주세요."},{"type":"heading2","content":"주요 일정"},{"type":"database","content":"{\"version\":2,\"title\":\"일정\",\"columns\":[{\"id\":\"col_task\",\"name\":\"작업\",\"type\":\"text\",\"options\":[]},{\"id\":\"col_status\",\"name\":\"상태\",\"type\":\"select\",\"options\":[\"예정\",\"진행 중\",\"완료\"]}],\"rows\":[],\"view\":{\"mode\":\"table\",\"groupBy\":\"col_status\",\"sortBy\":\"\",\"sortDir\":\"asc\"}}"},{"type":"heading2","content":"위험 요소"},{"type":"callout","content":"예상되는 위험과 대응 방법을 적어 주세요."}]', NULL, 1, unixepoch(), unixepoch());

CREATE TABLE IF NOT EXISTS document_access (
  document_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'workspace' CHECK (visibility IN ('workspace', 'restricted')),
  updated_by TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT
);

INSERT OR IGNORE INTO document_access (document_id, project_id, visibility, updated_by, updated_at)
SELECT id, project_id, 'workspace', updated_by, updated_at FROM documents;

CREATE TABLE IF NOT EXISTS document_grants (
  document_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  permission TEXT NOT NULL CHECK (permission IN ('viewer', 'editor')),
  granted_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (document_id, user_id),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_document_grants_user ON document_grants(user_id, document_id);

CREATE TABLE IF NOT EXISTS file_uploads (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_file_uploads_document ON file_uploads(document_id, deleted_at, created_at DESC);
