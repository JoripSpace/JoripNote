PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS notion_imports (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  archive_sha256 TEXT NOT NULL,
  filename TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'partial')),
  total_items INTEGER NOT NULL DEFAULT 0,
  imported_items INTEGER NOT NULL DEFAULT 0,
  skipped_items INTEGER NOT NULL DEFAULT 0,
  failed_items INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  UNIQUE (project_id, archive_sha256),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notion_import_items (
  import_id TEXT NOT NULL,
  source_path TEXT NOT NULL,
  document_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('imported', 'failed')),
  error TEXT,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (import_id, source_path),
  FOREIGN KEY (import_id) REFERENCES notion_imports(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_notion_imports_project_created
  ON notion_imports(project_id, created_at DESC);
