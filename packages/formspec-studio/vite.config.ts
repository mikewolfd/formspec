import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

const repoRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  base: './',
  appType: 'spa',
  plugins: [react(), tailwindcss()],
  define: {
    'process.env': '{}',
  },
  resolve: {
    alias: {
      'react': path.resolve(repoRoot, 'node_modules/react'),
      'react-dom': path.resolve(repoRoot, 'node_modules/react-dom'),
      'formspec-studio-core': path.resolve(repoRoot, 'packages/formspec-studio-core/src/index.ts'),
      'formspec-engine': path.resolve(repoRoot, 'packages/formspec-engine/src/index.ts'),
      'formspec-layout': path.resolve(repoRoot, 'packages/formspec-layout/src/index.ts'),
      // formspec-webcomponent: use workspace dep from node_modules so formspec-base.css?url resolves correctly
    },
    dedupe: ['react', 'react-dom']
  },
  optimizeDeps: {
    exclude: ['formspec-webcomponent'],
  },
  server: {
    allowedHosts: true,
    fs: {
      allow: [repoRoot]
    }
  }
});
