-- Keep the persisted block model in sync with the editor's full heading scale.
-- Rebuild is required because SQLite/D1 cannot extend a CHECK constraint in place.
DROP TABLE IF EXISTS document_blocks_heading_levels;
CREATE TABLE document_blocks_heading_levels (
  id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  block_type TEXT NOT NULL CHECK (
    block_type IN (
      'text', 'heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6',
      'bullet', 'numbered', 'todo', 'quote', 'code', 'divider', 'toggle',
      'callout', 'table', 'database', 'toc', 'math',
      'bookmark', 'image', 'video', 'audio', 'file', 'embed', 'page_link'
    )
  ),
  content TEXT NOT NULL,
  position INTEGER NOT NULL,
  checked INTEGER NOT NULL DEFAULT 0 CHECK (checked IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  indent_level INTEGER NOT NULL DEFAULT 0 CHECK (indent_level BETWEEN 0 AND 4),
  PRIMARY KEY (document_id, snapshot_id, id),
  UNIQUE (document_id, snapshot_id, position),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

INSERT INTO document_blocks_heading_levels (
  id, document_id, snapshot_id, block_type, content, position, checked, created_at, updated_at, indent_level
)
SELECT
  id, document_id, snapshot_id, block_type, content, position, checked, created_at, updated_at, indent_level
FROM document_blocks;

DROP TABLE document_blocks;
ALTER TABLE document_blocks_heading_levels RENAME TO document_blocks;

CREATE INDEX idx_document_blocks_order
  ON document_blocks(document_id, snapshot_id, position);
