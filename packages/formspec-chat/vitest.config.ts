import { defineConfig } from 'vitest/config';
import path from 'path';

const repoRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  resolve: {
    alias: {
      'formspec-studio-core': path.resolve(repoRoot, 'packages/formspec-studio-core/src/index.ts'),
      'formspec-shared': path.resolve(repoRoot, 'packages/formspec-shared/src/index.ts'),
    }
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}']
  }
});
