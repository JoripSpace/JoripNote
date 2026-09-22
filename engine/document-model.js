export const DOCUMENT_MODEL_VERSION = 4;

export const CORE_BLOCK_TYPES = Object.freeze([
  'text', 'heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6',
  'bullet', 'numbered', 'todo', 'quote', 'code', 'divider', 'toggle', 'callout',
  'table', 'database', 'toc', 'math', 'bookmark', 'image', 'video', 'audio', 'file',
  'embed', 'page_link', 'unsupported'
]);

// Blocks that can be visually nested from the editor with Tab / Shift+Tab.
// Structured and media blocks keep Tab for their own form controls.
export const INDENTABLE_BLOCK_TYPES = Object.freeze([
  'text', 'heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6',
  'bullet', 'numbered', 'todo', 'quote', 'toggle', 'callout', 'math'
]);

const BLOCK_TYPE_SET = new Set(CORE_BLOCK_TYPES);

export function normalizeBlockType(type) {
  const value = String(type || '').trim();
  return BLOCK_TYPE_SET.has(value) ? value : 'unsupported';
}

export function normalizeBlockSnapshot(input = {}) {
  const type = normalizeBlockType(input.type);
  const content = String(input.content ?? input.inlineContent ?? '');
  const children = Array.isArray(input.children) ? input.children.map(String).filter(Boolean) : [];
  const props = input.props && typeof input.props === 'object' && !Array.isArray(input.props) ? { ...input.props } : {};
  const source = input.source && typeof input.source === 'object' && !Array.isArray(input.source) ? { ...input.source } : {};
  const indentLevel = INDENTABLE_BLOCK_TYPES.includes(type) && Number.isInteger(Number(input.indent_level))
    ? Math.max(0, Math.min(4, Number(input.indent_level)))
    : 0;
  return {
    id: String(input.id || ''),
    type,
    parentId: input.parentId == null ? null : String(input.parentId),
    children,
    props,
    inlineContent: content,
    content,
    checked: ['todo', 'toggle'].includes(type) && Boolean(input.checked),
    indent_level: indentLevel,
    source,
    version: Number(input.version || DOCUMENT_MODEL_VERSION)
  };
}

export function createDocumentSnapshot(input = {}) {
  const blocks = Array.isArray(input.blocks) ? input.blocks.map(normalizeBlockSnapshot) : [];
  return {
    version: DOCUMENT_MODEL_VERSION,
    id: String(input.id || ''),
    title: String(input.title || ''),
    icon: input.icon == null ? null : String(input.icon),
    cover: input.cover == null ? null : String(input.cover),
    properties: input.properties && typeof input.properties === 'object' ? { ...input.properties } : {},
    rootBlockIds: Array.isArray(input.rootBlockIds)
      ? input.rootBlockIds.map(String).filter(id => blocks.some(block => block.id === id))
      : blocks.filter(block => !block.parentId).map(block => block.id),
    blocks,
    dataSources: Array.isArray(input.dataSources) ? input.dataSources.map(item => ({ ...item })) : [],
    metadata: input.metadata && typeof input.metadata === 'object' ? { ...input.metadata } : {},
    source: input.source && typeof input.source === 'object' ? { ...input.source } : {},
    createdAt: input.createdAt ?? null,
    updatedAt: input.updatedAt ?? null
  };
}
