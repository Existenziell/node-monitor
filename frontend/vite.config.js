import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs, { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var sharedPath = path.resolve(__dirname, '..', 'shared', 'constants.json');
var shared = JSON.parse(readFileSync(sharedPath, 'utf-8'));
var dataDir = path.resolve(__dirname, 'data');
function serveDataDir() {
    return {
        name: 'serve-data-dir',
        apply: 'serve',
        configureServer: function (server) {
            server.middlewares.use(function (req, res, next) {
                var _a;
                if (!((_a = req.url) === null || _a === void 0 ? void 0 : _a.startsWith('/data/')))
                    return next();
                var subPath = req.url.slice('/data'.length).replace(/^\//, '') || 'index.html';
                var safePath = path.normalize(subPath).replace(/^(\.\.(\/|\\))+/, '');
                var filePath = path.join(dataDir, safePath);
                if (!filePath.startsWith(dataDir))
                    return next();
                fs.stat(filePath, function (err, stat) {
                    var _a;
                    if (err || !stat.isFile())
                        return next();
                    var ext = path.extname(filePath);
                    var types = {
                        '.svg': 'image/svg+xml',
                        '.ico': 'image/x-icon',
                        '.png': 'image/png',
                    };
                    res.setHeader('Content-Type', (_a = types[ext]) !== null && _a !== void 0 ? _a : 'application/octet-stream');
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
    server: {
        port: shared.DASHBOARD_PORT,
        proxy: {
            '/api': { target: "http://localhost:".concat(shared.API_SERVER_PORT), changeOrigin: true },
        },
    },
    preview: {
        // Allow access via hostname (miner.local) or IP on LAN
        allowedHosts: true,
    },
});
