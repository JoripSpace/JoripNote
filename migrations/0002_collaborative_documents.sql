PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN email_ciphertext TEXT;
ALTER TABLE users ADD COLUMN email_nonce TEXT;
ALTER TABLE users ADD COLUMN email_blind_index TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_blind_index
  ON users(email_blind_index)
  WHERE email_blind_index IS NOT NULL;

CREATE TABLE IF NOT EXISTS project_members (
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (project_id, user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO project_members (project_id, user_id, role, joined_at, updated_at)
SELECT
  'qwerty',
  id,
  CASE
    WHEN id = (SELECT id FROM users ORDER BY created_at ASC, id ASC LIMIT 1) THEN 'owner'
    ELSE 'member'
  END,
  created_at,
  unixepoch()
FROM users;

CREATE INDEX IF NOT EXISTS idx_project_members_page
  ON project_members(project_id, joined_at DESC, user_id DESC);
CREATE INDEX IF NOT EXISTS idx_project_members_role
  ON project_members(project_id, role, user_id);

CREATE TABLE IF NOT EXISTS project_invitations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  email_ciphertext TEXT NOT NULL,
  email_nonce TEXT NOT NULL,
  email_blind_index TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired')),
  invited_by TEXT NOT NULL,
  accepted_by TEXT,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (invited_by) REFERENCES users(id),
  FOREIGN KEY (accepted_by) REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_invitations_pending_email
  ON project_invitations(project_id, email_blind_index)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_project_invitations_page
  ON project_invitations(project_id, status, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_project_invitations_token_hash
  ON project_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_project_invitations_expiry
  ON project_invitations(project_id, status, expires_at);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  parent_document_id TEXT,
  title TEXT NOT NULL,
  title_search TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'trashed')),
  version INTEGER NOT NULL DEFAULT 1,
  active_snapshot_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  trashed_at INTEGER,
  FOREIGN KEY (parent_document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_documents_root_page
  ON documents(project_id, status, parent_document_id, updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_documents_recently_updated
  ON documents(project_id, status, updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_documents_trash_page
  ON documents(project_id, status, trashed_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_documents_search
  ON documents(project_id, status, title_search, id);

CREATE TABLE IF NOT EXISTS document_blocks (
  id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  block_type TEXT NOT NULL CHECK (
    block_type IN ('text', 'heading1', 'heading2', 'heading3', 'bullet', 'numbered', 'todo', 'quote', 'code', 'divider')
  ),
  content TEXT NOT NULL,
  position INTEGER NOT NULL,
  checked INTEGER NOT NULL DEFAULT 0 CHECK (checked IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (document_id, snapshot_id, id),
  UNIQUE (document_id, snapshot_id, position),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_document_blocks_order
  ON document_blocks(document_id, snapshot_id, position);

CREATE TABLE IF NOT EXISTS document_favorites (
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (project_id, user_id, document_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_document_favorites_page
  ON document_favorites(project_id, user_id, created_at DESC, document_id DESC);

CREATE TABLE IF NOT EXISTS recent_documents (
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  opened_at INTEGER NOT NULL,
  PRIMARY KEY (project_id, user_id, document_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_recent_documents_page
  ON recent_documents(project_id, user_id, opened_at DESC, document_id DESC);
