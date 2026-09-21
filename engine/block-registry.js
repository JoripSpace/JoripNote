export function defineBlockSpec(spec) {
  if (!spec || typeof spec !== 'object' || !spec.type) throw new TypeError('블록 스펙에는 type이 필요합니다.');
  return Object.freeze({
    type: String(spec.type),
    schema: spec.schema || {},
    normalize: typeof spec.normalize === 'function' ? spec.normalize : value => value,
    validate: typeof spec.validate === 'function' ? spec.validate : () => true,
    render: typeof spec.render === 'function' ? spec.render : null,
    serialize: typeof spec.serialize === 'function' ? spec.serialize : value => value,
    deserialize: typeof spec.deserialize === 'function' ? spec.deserialize : value => value,
    commands: Object.freeze({ ...(spec.commands || {}) })
  });
}

export function createBlockRegistry(specs = []) {
  const registry = new Map();
  for (const spec of specs) {
    const normalized = defineBlockSpec(spec);
    if (registry.has(normalized.type)) throw new TypeError('중복된 블록 타입입니다: ' + normalized.type);
    registry.set(normalized.type, normalized);
  }
  return Object.freeze({
    get(type) { return registry.get(String(type)); },
    has(type) { return registry.has(String(type)); },
    types() { return [...registry.keys()]; },
    normalize(value) {
      const spec = registry.get(String(value?.type));
      return spec ? spec.normalize(value) : { ...value, type: 'unsupported' };
    },
    validate(value) {
      const spec = registry.get(String(value?.type));
      return spec ? spec.validate(value) : false;
    }
  });
}
