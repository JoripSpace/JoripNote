ALTER TABLE document_blocks
  ADD COLUMN indent_level INTEGER NOT NULL DEFAULT 0
  CHECK (indent_level BETWEEN 0 AND 4);
