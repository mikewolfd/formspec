import { defineConfig } from 'vite';

export default defineConfig({
  root: 'playground',
  server: {
    host: '127.0.0.1',
    port: 8081,
  },
  build: {
    outDir: '../dist-playground',
    emptyOutDir: true,
  },
});
