import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import path from 'path';

const repoRoot = path.resolve(__dirname, '..');

export default defineConfig({
  plugins: [preact()],
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      'formspec-webcomponent': path.resolve(repoRoot, 'packages/formspec-webcomponent/src/index.ts'),
      'formspec-engine': path.resolve(repoRoot, 'packages/formspec-engine/src/index.ts'),
    },
  },
  server: {
    fs: {
      allow: [repoRoot],
    },
  },
});
