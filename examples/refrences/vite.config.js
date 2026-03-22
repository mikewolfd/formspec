import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';

const repoRoot = path.resolve(__dirname, '../..');

const basePath = process.env.FORMSPEC_BASE_PATH || '/';

export default defineConfig({
  base: basePath,
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        tools: path.resolve(__dirname, 'tools.html'),
      },
    },
  },
  server: {
    allowedHosts: true,
    fs: {
      allow: [repoRoot],
    },
  },
  plugins: [
    {
      name: 'repo-root-static',
      configureServer(server) {
        const MIME = { '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };
        server.middlewares.use((req, res, next) => {
          if (!req.url?.startsWith('/packages/') && !req.url?.startsWith('/examples/') && !req.url?.startsWith('/registries/')) return next();
          const fsPath = path.join(repoRoot, req.url.split('?')[0]);
          const mime = MIME[path.extname(fsPath).toLowerCase()];
          if (!mime) return next();
          fs.readFile(fsPath, (err, data) => {
            if (err) return next();
            res.setHeader('Content-Type', mime);
            res.end(data);
          });
        });
      },
    },
  ],
});
