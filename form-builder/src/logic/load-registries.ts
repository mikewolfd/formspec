const modules = import.meta.glob('../../registries/*.registry.json', { eager: true, import: 'default' });

export function getBuiltinRegistries(): unknown[] {
  return Object.values(modules);
}
