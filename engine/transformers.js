import { createDocumentSnapshot } from './document-model.js';

export function snapshotFromLegacyDocument(document = {}) {
  return createDocumentSnapshot({
    id: document.id,
    title: document.title,
    blocks: document.blocks,
    source: {
      provider: document.is_notion_import ? 'notion' : 'joripnote',
      sourcePageId: document.source_page_id || document.sourcePageId || ''
    },
    createdAt: document.created_at || document.createdAt || null,
    updatedAt: document.updated_at || document.updatedAt || null
  });
}

export function snapshotToLegacyBlocks(snapshot) {
  return (snapshot?.blocks || []).map(block => ({
    id: block.id,
    type: block.type,
    content: block.content,
    checked: block.checked,
    indent_level: block.indent_level
  }));
}
