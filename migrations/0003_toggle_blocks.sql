CREATE TABLE document_blocks_with_toggle (
  id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  block_type TEXT NOT NULL CHECK (
    block_type IN ('text', 'heading1', 'heading2', 'heading3', 'bullet', 'numbered', 'todo', 'quote', 'code', 'divider', 'toggle')
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

INSERT INTO document_blocks_with_toggle (
  id, document_id, snapshot_id, block_type, content, position, checked, created_at, updated_at
)
SELECT
  id, document_id, snapshot_id, block_type, content, position, checked, created_at, updated_at
FROM document_blocks;

DROP TABLE document_blocks;
ALTER TABLE document_blocks_with_toggle RENAME TO document_blocks;

CREATE INDEX idx_document_blocks_order
  ON document_blocks(document_id, snapshot_id, position);
