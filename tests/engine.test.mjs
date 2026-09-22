import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocumentSnapshot, normalizeBlockSnapshot } from '../engine/document-model.js';
import { createBlockRegistry } from '../engine/block-registry.js';
import { applyCommand } from '../engine/commands.js';
import { snapshotFromLegacyDocument, snapshotToLegacyBlocks } from '../engine/transformers.js';

test('document engine normalizes blocks and preserves source metadata', () => {
  const block = normalizeBlockSnapshot({ id: 'blk_a', type: 'heading2', content: '제목', source: { notionBlockId: 'n1' } });
  assert.equal(block.type, 'heading2');
  assert.equal(block.inlineContent, '제목');
  assert.equal(normalizeBlockSnapshot({ id: 'blk_indent', type: 'heading2', content: '들여쓰기', indent_level: 3 }).indent_level, 3);
  assert.equal(block.source.notionBlockId, 'n1');
  assert.equal(normalizeBlockSnapshot({ id: 'blk_b', type: 'future_block' }).type, 'unsupported');
});

test('block registry provides schema, normalization and validation contracts', () => {
  const registry = createBlockRegistry([{ type: 'paragraph', schema: { content: 'inline' }, validate: block => typeof block.content === 'string' }]);
  assert.equal(registry.has('paragraph'), true);
  assert.equal(registry.validate({ type: 'paragraph', content: 'ok' }), true);
  assert.equal(registry.normalize({ type: 'missing', content: 'raw' }).type, 'unsupported');
  assert.throws(() => createBlockRegistry([{ type: 'paragraph' }, { type: 'paragraph' }]));
});

test('commands update a document snapshot without mutating the source', () => {
  const source = createDocumentSnapshot({ id: 'doc_1', title: '문서', blocks: [{ id: 'blk_a', type: 'text', content: '처음' }] });
  const inserted = applyCommand(source, { type: 'insertBlock', afterId: 'blk_a', block: { id: 'blk_b', type: 'todo', content: '할 일' } });
  const updated = applyCommand(inserted, { type: 'updateBlock', blockId: 'blk_a', patch: { content: '수정' } });
  const moved = applyCommand(updated, { type: 'moveBlock', blockId: 'blk_a', afterId: 'blk_b' });
  assert.equal(source.blocks[0].content, '처음');
  assert.deepEqual(moved.blocks.map(block => block.id), ['blk_b', 'blk_a']);
  assert.equal(moved.blocks[1].content, '수정');
});

test('legacy document transformer round-trips block fields', () => {
  const snapshot = snapshotFromLegacyDocument({ id: 'doc_legacy', title: '기존 문서', is_notion_import: true, source_page_id: 'notion-1', blocks: [{ id: 'blk_a', type: 'todo', content: '완료', checked: true }] });
  assert.equal(snapshot.source.provider, 'notion');
  assert.equal(snapshot.blocks[0].checked, true);
  assert.deepEqual(snapshotToLegacyBlocks(snapshot), [{ id: 'blk_a', type: 'todo', content: '완료', checked: true, indent_level: 0 }]);
});
