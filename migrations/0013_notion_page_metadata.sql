-- Preserve the small pieces of Notion page chrome that are part of the page data.
-- Existing rows remain valid; API imports fill these columns incrementally.
ALTER TABLE documents ADD COLUMN page_icon_emoji TEXT;
ALTER TABLE documents ADD COLUMN page_icon_url TEXT;
