/** @filedesc Tests for the unified provider-config localStorage module and legacy-key migration. */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  CANONICAL_PROVIDER_CONFIG_KEY,
  loadProviderConfig,
  saveProviderConfig,
  clearProviderConfig,
} from '../../src/lib/provider-config-storage';

beforeEach(() => {
  localStorage.clear();
});

describe('provider-config storage key', () => {
  it('uses a single canonical key not tied to either surface', () => {
    expect(CANONICAL_PROVIDER_CONFIG_KEY).toBe('formspec:provider-config');
  });
});

describe('loadProviderConfig / saveProviderConfig / clearProviderConfig', () => {
  it('round-trips a config through the canonical key', () => {
    saveProviderConfig({ provider: 'google', apiKey: 'abc' });
    expect(localStorage.getItem(CANONICAL_PROVIDER_CONFIG_KEY)).toBe(
      JSON.stringify({ provider: 'google', apiKey: 'abc' }),
    );
    expect(loadProviderConfig()).toEqual({ provider: 'google', apiKey: 'abc' });
  });

  it('returns null when nothing is stored', () => {
    expect(loadProviderConfig()).toBeNull();
  });

  it('returns null (not a throw) when stored value is malformed JSON', () => {
    localStorage.setItem(CANONICAL_PROVIDER_CONFIG_KEY, '{not json');
    expect(loadProviderConfig()).toBeNull();
  });

  it('clearProviderConfig removes the canonical key', () => {
    saveProviderConfig({ provider: 'anthropic', apiKey: 'k' });
    clearProviderConfig();
    expect(localStorage.getItem(CANONICAL_PROVIDER_CONFIG_KEY)).toBeNull();
  });
});

describe('cross-surface unification', () => {
  it('studio-embedded surface reads and writes the canonical key', async () => {
    const { getSavedProviderConfig } = await import('../../src/components/AppSettingsDialog');

    saveProviderConfig({ provider: 'google', apiKey: 'shared' });
    expect(getSavedProviderConfig()).toEqual({ provider: 'google', apiKey: 'shared' });
  });

  it('no source file references a legacy storage key anymore (only the legacy constant itself)', async () => {
    // If a caller ever drifts back to a hardcoded legacy string the unification is broken.
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, resolve } = await import('node:path');

    const here = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(here, '../../src');
    const files = [
      resolve(srcRoot, 'components/AppSettingsDialog.tsx'),
      resolve(srcRoot, 'components/ChatPanel.tsx'),
      resolve(srcRoot, 'main.tsx'),
    ];

    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      expect(text, `${file} must not hardcode formspec-studio:provider-config`).not.toMatch(
        /['"]formspec-studio:provider-config['"]/,
      );
      expect(text, `${file} must not hardcode formspec-chat:provider`).not.toMatch(
        /['"]formspec-chat:provider['"]/,
      );
    }
  });
});
