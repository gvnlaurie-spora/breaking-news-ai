"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = healthRoute;
async function healthRoute(server) {
    // This becomes /api/health when registered with prefix '/api'
    server.get('/health', async () => ({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'breaking-news-api',
        version: '1.0.0'
    }));
}
