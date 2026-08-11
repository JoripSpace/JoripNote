CREATE TABLE document_blocks_extended (
  id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  block_type TEXT NOT NULL CHECK (
    block_type IN (
      'text', 'heading1', 'heading2', 'heading3', 'heading4',
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
  PRIMARY KEY (document_id, snapshot_id, id),
  UNIQUE (document_id, snapshot_id, position),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

INSERT INTO document_blocks_extended (
  id, document_id, snapshot_id, block_type, content, position, checked, created_at, updated_at
)
SELECT
  id, document_id, snapshot_id, block_type, content, position, checked, created_at, updated_at
FROM document_blocks;

DROP TABLE document_blocks;
ALTER TABLE document_blocks_extended RENAME TO document_blocks;

CREATE INDEX idx_document_blocks_order
  ON document_blocks(document_id, snapshot_id, position);

CREATE TABLE document_publications (
  project_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  published_by TEXT NOT NULL,
  published_at INTEGER NOT NULL,
  PRIMARY KEY (project_id, document_id),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (published_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_document_publications_published
  ON document_publications(project_id, published_at DESC, document_id);
