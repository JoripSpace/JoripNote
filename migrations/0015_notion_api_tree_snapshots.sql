ALTER TABLE documents ADD COLUMN active_notion_snapshot_id TEXT;

CREATE TABLE notion_api_snapshots (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('building', 'active', 'superseded')),
  complete INTEGER NOT NULL DEFAULT 1 CHECK (complete IN (0, 1)),
  warning_codes_json TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX idx_notion_api_snapshots_document
  ON notion_api_snapshots(document_id, created_at DESC, id DESC);

CREATE TABLE notion_api_objects (
  snapshot_id TEXT NOT NULL,
  object_key TEXT NOT NULL,
  object_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  parent_object_key TEXT,
  parent_type TEXT,
  parent_source_id TEXT,
  position INTEGER NOT NULL CHECK (position >= 0),
  raw_json TEXT NOT NULL,
  PRIMARY KEY (snapshot_id, object_key),
  FOREIGN KEY (snapshot_id) REFERENCES notion_api_snapshots(id) ON DELETE CASCADE
);

CREATE INDEX idx_notion_api_objects_tree
  ON notion_api_objects(snapshot_id, parent_object_key, position);

CREATE INDEX idx_notion_api_objects_source
  ON notion_api_objects(object_type, source_id, snapshot_id);
