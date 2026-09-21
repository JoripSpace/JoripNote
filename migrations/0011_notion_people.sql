PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS notion_people (
  project_id TEXT NOT NULL,
  notion_user_id TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('person', 'bot', 'unknown')),
  name TEXT,
  avatar_url TEXT,
  email_ciphertext TEXT,
  email_nonce TEXT,
  email_blind_index TEXT,
  last_seen_at INTEGER NOT NULL,
  synced_at INTEGER NOT NULL,
  PRIMARY KEY (project_id, notion_user_id)
);

CREATE INDEX IF NOT EXISTS idx_notion_people_project_name
  ON notion_people(project_id, name, notion_user_id);

CREATE INDEX IF NOT EXISTS idx_notion_people_project_email
  ON notion_people(project_id, email_blind_index)
  WHERE email_blind_index IS NOT NULL;
