/** @filedesc Unified localStorage access for the AI provider config used by the studio (integrated chat + settings). */
import type { ProviderConfig, StorageBackend } from '@formspec-org/chat';

/** Canonical localStorage key — not tied to either surface. */
export const CANONICAL_PROVIDER_CONFIG_KEY = 'formspec:provider-config';

function resolveStorage(storage?: StorageBackend): StorageBackend {
  return storage ?? localStorage;
}

export function loadProviderConfig(storage?: StorageBackend): ProviderConfig | null {
  try {
    const raw = resolveStorage(storage).getItem(CANONICAL_PROVIDER_CONFIG_KEY);
    return raw ? (JSON.parse(raw) as ProviderConfig) : null;
  } catch {
    return null;
  }
}

export function saveProviderConfig(config: ProviderConfig, storage?: StorageBackend): void {
  resolveStorage(storage).setItem(CANONICAL_PROVIDER_CONFIG_KEY, JSON.stringify(config));
}

export function clearProviderConfig(storage?: StorageBackend): void {
  resolveStorage(storage).removeItem(CANONICAL_PROVIDER_CONFIG_KEY);
}
