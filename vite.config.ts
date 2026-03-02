import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';

export default defineConfig({
  root: 'tests/e2e/fixtures',
  server: {
    port: 8080
  },
  build: {
    outDir: '../../../dist',
    emptyOutDir: true
  },
  plugins: [
    {
      name: 'serve-grant-app-tools',
      configureServer(server) {
        const MIME: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
        const grantDir = path.resolve(__dirname, 'examples/grant-application');
        server.middlewares.use((req, res, next) => {
          if (req.url !== '/tools.html' && !req.url?.startsWith('/tools.js')) return next();
          const filePath = path.join(grantDir, req.url.split('?')[0]);
          const ext = path.extname(filePath).toLowerCase();
          const mime = MIME[ext];
          if (!mime) return next();
          fs.readFile(filePath, (err, data) => {
            if (err) return next();
            res.setHeader('Content-Type', mime);
            res.end(data);
          });
        });
      },
    },
  ],
});
