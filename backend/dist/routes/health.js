"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = healthRoute;
async function healthRoute(server) {
    // This will become /api/health when registered with prefix '/api'
    server.get('/health', async () => ({
        status: 'ok',
        timestamp: new Date().toISOString()
    }));
}
