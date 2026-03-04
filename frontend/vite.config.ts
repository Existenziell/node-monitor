import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs, { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sharedPath = path.resolve(__dirname, '..', 'shared', 'constants.json');
const shared = JSON.parse(readFileSync(sharedPath, 'utf-8')) as {
  DASHBOARD_PORT: number;
  API_SERVER_PORT: number;
};

const dataDir = path.resolve(__dirname, 'data');

function serveDataDir() {
  return {
    name: 'serve-data-dir',
    apply: 'serve' as const,
    configureServer(server: { middlewares: { use: (fn: (req: any, res: any, next: () => void) => void) => void } }) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/data/')) return next();
        const subPath = req.url.slice('/data'.length).replace(/^\//, '') || 'index.html';
        const safePath = path.normalize(subPath).replace(/^(\.\.(\/|\\))+/, '');
        const filePath = path.join(dataDir, safePath);
        if (!filePath.startsWith(dataDir)) return next();
        fs.stat(filePath, (err, stat) => {
          if (err || !stat.isFile()) return next();
          const ext = path.extname(filePath);
          const types: Record<string, string> = {
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.png': 'image/png',
          };
          res.setHeader('Content-Type', types[ext] ?? 'application/octet-stream');
          fs.createReadStream(filePath).pipe(res);
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), serveDataDir()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, '..', 'shared'),
    },
  },
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  preview: {
    allowedHosts: ['dashboard.local', 'localhost'],
  },
  server: {
    port: shared.DASHBOARD_PORT,
    proxy: {
      '/api': { target: `http://localhost:${shared.API_SERVER_PORT}`, changeOrigin: true },
    },
  },
});
