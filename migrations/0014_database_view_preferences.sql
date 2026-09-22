-- Keep each member's last selected database view independent from document content.
CREATE TABLE IF NOT EXISTS document_view_preferences (
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  block_id TEXT NOT NULL,
  view_id TEXT NOT NULL,
  view_type TEXT NOT NULL CHECK (view_type IN ('table', 'board', 'calendar', 'timeline', 'gallery', 'list')),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (project_id, user_id, document_id, block_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_document_view_preferences_user
  ON document_view_preferences(project_id, user_id, document_id);
