import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sharedPath = path.resolve(__dirname, '..', 'shared', 'constants.json');
const shared = JSON.parse(readFileSync(sharedPath, 'utf-8')) as {
  DASHBOARD_PORT: number;
  API_SERVER_PORT: number;
};

export default defineConfig({
  plugins: [react()],
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
  server: {
    port: shared.DASHBOARD_PORT,
    proxy: {
      '/api': { target: `http://localhost:${shared.API_SERVER_PORT}`, changeOrigin: true },
    },
  },
});
