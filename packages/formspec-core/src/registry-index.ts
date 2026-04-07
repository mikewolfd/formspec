/** @filedesc Normalize raw extension registry JSON into LoadedRegistry (URL, document, entry index). */
import type { LoadedRegistry } from './types.js';

/**
 * Build a loaded registry record from a registry document payload.
 * Ensures a stable `url` on the stored document for `project.removeRegistry`.
 */
export function indexRegistryPayload(
  registry: Record<string, unknown>,
  fallbackUrl = 'urn:formspec:registry:unnamed',
): LoadedRegistry {
  const url =
    typeof registry.url === 'string' && registry.url.trim() !== ''
      ? registry.url.trim()
      : fallbackUrl;
  const document = { ...registry, url };
  const entries: Record<string, unknown> = {};
  for (const entry of (registry.entries as Iterable<Record<string, unknown>>) ?? []) {
    const e = entry as { name?: string };
    if (e?.name) entries[e.name] = entry;
  }
  return { url, document, entries };
}
