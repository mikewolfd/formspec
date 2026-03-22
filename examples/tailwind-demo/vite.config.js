import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';

const repoRoot = path.resolve(__dirname, '../..');

const basePath = process.env.FORMSPEC_BASE_PATH || '/';
const baseNoSlash = basePath.replace(/\/$/, '') || '';

export default defineConfig({
  base: basePath,
  build: {
    target: 'es2022',
  },
  server: {
    allowedHosts: true,
    fs: {
      allow: [repoRoot],
    },
  },
  plugins: [
    tailwindcss(),
    {
      name: 'repo-root-static',
      configureServer(server) {
        const MIME = { '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };
        server.middlewares.use((req, res, next) => {
          let pathname = req.url?.split('?')[0] || '';
          if (baseNoSlash && pathname.startsWith(baseNoSlash)) {
            pathname = pathname.slice(baseNoSlash.length) || '/';
          }
          if (
            !pathname.startsWith('/packages/') &&
            !pathname.startsWith('/examples/') &&
            !pathname.startsWith('/registries/')
          ) {
            return next();
          }
          const fsPath = path.join(repoRoot, pathname);
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
