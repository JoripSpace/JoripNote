PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS notion_import_staged_entries (
  import_id TEXT NOT NULL,
  entry_index INTEGER NOT NULL,
  source_path TEXT NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('document', 'asset')),
  source_size INTEGER NOT NULL,
  document_id TEXT,
  parent_document_id TEXT,
  owner_document_id TEXT,
  file_id TEXT,
  storage_key TEXT,
  content_type TEXT,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'uploading', 'uploaded', 'imported', 'failed')),
  upload_id TEXT,
  error TEXT,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (import_id, entry_index),
  UNIQUE (import_id, source_path),
  FOREIGN KEY (import_id) REFERENCES notion_imports(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notion_staged_import_type
  ON notion_import_staged_entries(import_id, entry_type, status);

CREATE INDEX IF NOT EXISTS idx_notion_staged_owner
  ON notion_import_staged_entries(import_id, owner_document_id);
