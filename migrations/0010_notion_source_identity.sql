PRAGMA foreign_keys = ON;

ALTER TABLE documents ADD COLUMN source_page_id TEXT;
ALTER TABLE documents ADD COLUMN source_import_id TEXT;
ALTER TABLE documents ADD COLUMN source_path TEXT;
ALTER TABLE documents ADD COLUMN import_baseline_snapshot_id TEXT;
ALTER TABLE documents ADD COLUMN import_transform_version INTEGER;

ALTER TABLE notion_import_staged_entries ADD COLUMN source_page_id TEXT;
ALTER TABLE notion_import_staged_entries ADD COLUMN source_key TEXT;
ALTER TABLE notion_import_staged_entries ADD COLUMN import_role TEXT NOT NULL DEFAULT 'primary';
ALTER TABLE notion_import_staged_entries ADD COLUMN issue_code TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_source_page
  ON documents(project_id, source_page_id);
CREATE INDEX IF NOT EXISTS idx_notion_staged_source_key
  ON notion_import_staged_entries(import_id, source_key);
