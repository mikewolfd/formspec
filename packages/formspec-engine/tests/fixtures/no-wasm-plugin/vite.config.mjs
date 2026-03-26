import { defineConfig } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  resolve: {
    alias: {
      '@formspec-org/engine': resolve(here, '../../../src/index.ts'),
    },
  },
  build: {
    emptyOutDir: true,
    outDir: resolve(here, 'dist'),
  },
});
