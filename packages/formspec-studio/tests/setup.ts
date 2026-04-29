/** @filedesc Vitest global setup for formspec-studio: jest-dom matchers, cleanup, and module mocks. */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { initFormspecEngine, initFormspecEngineTools } from '@formspec-org/engine';
import { afterEach, vi } from 'vitest';

vi.mock('../src/workspaces/preview/formspec-base-css-url', () => ({
  formspecLayoutCssHref: '',
  formspecDefaultCssHref: '',
}));

await initFormspecEngine();
await initFormspecEngineTools();

if (typeof window.localStorage?.getItem !== 'function') {
  const entries = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return entries.size;
    },
    clear() {
      entries.clear();
    },
    getItem(key: string) {
      return entries.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(entries.keys())[index] ?? null;
    },
    removeItem(key: string) {
      entries.delete(key);
    },
    setItem(key: string, value: string) {
      entries.set(key, String(value));
    },
  };
  Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
}

window.confirm = vi.fn();

afterEach(() => {
  cleanup();
});
