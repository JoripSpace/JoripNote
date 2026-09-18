import { createDocumentSnapshot, normalizeBlockSnapshot } from './document-model.js';

function cloneSnapshot(snapshot) {
  return createDocumentSnapshot(JSON.parse(JSON.stringify(snapshot || {})));
}

export function applyCommand(snapshot, command) {
  const next = cloneSnapshot(snapshot);
  const name = String(command?.type || '');
  const blocks = next.blocks;
  const indexOf = id => blocks.findIndex(block => block.id === String(id));
  if (name === 'insertBlock') {
    const block = normalizeBlockSnapshot(command.block);
    if (!block.id || indexOf(block.id) >= 0) throw new Error('삽입할 블록 ID가 올바르지 않습니다.');
    const after = indexOf(command.afterId);
    blocks.splice(after < 0 ? blocks.length : after + 1, 0, block);
  } else if (name === 'updateBlock') {
    const index = indexOf(command.blockId);
    if (index < 0) throw new Error('수정할 블록을 찾을 수 없습니다.');
    blocks[index] = normalizeBlockSnapshot({ ...blocks[index], ...(command.patch || {}) });
  } else if (name === 'removeBlock') {
    const index = indexOf(command.blockId);
    if (index >= 0) blocks.splice(index, 1);
  } else if (name === 'moveBlock') {
    const index = indexOf(command.blockId);
    if (index < 0) throw new Error('이동할 블록을 찾을 수 없습니다.');
    const [block] = blocks.splice(index, 1);
    const after = indexOf(command.afterId);
    blocks.splice(after < 0 ? blocks.length : after + 1, 0, block);
  } else {
    throw new Error('지원하지 않는 문서 명령입니다: ' + name);
  }
  next.blocks = blocks;
  next.rootBlockIds = blocks.filter(block => !block.parentId).map(block => block.id);
  return next;
}
