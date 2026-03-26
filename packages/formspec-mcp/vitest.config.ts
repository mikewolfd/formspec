/** @filedesc Vitest configuration for the formspec-mcp package. */
import { defineConfig } from 'vitest/config';
import path from 'path';

const repoRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  resolve: {
    alias: {
      // Subpaths must precede the package root alias — otherwise `@formspec/engine/foo` resolves as `index.ts/foo`.
      '@formspec/engine/init-formspec-engine': path.resolve(
        repoRoot,
        'packages/formspec-engine/src/init-formspec-engine.ts',
      ),
      '@formspec/engine/render': path.resolve(repoRoot, 'packages/formspec-engine/src/engine-render-entry.ts'),
      '@formspec/engine/fel-runtime': path.resolve(repoRoot, 'packages/formspec-engine/src/fel/fel-api-runtime.ts'),
      '@formspec/engine/fel-tools': path.resolve(repoRoot, 'packages/formspec-engine/src/fel/fel-api-tools.ts'),
      '@formspec/engine': path.resolve(repoRoot, 'packages/formspec-engine/src/index.ts'),
      '@formspec/core': path.resolve(__dirname, '../formspec-core/src/index.ts'),
      '@formspec/studio-core': path.resolve(__dirname, '../formspec-studio-core/src/index.ts'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
});
