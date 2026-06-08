"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const child_process_1 = require("child_process");
const server = (0, fastify_1.default)({ logger: true });
// ── Show detection ────────────────────────────────────────────────────────────
function getShowFromUTCHour(hour) {
    if (hour >= 4 && hour < 8)
        return 'morning';
    if (hour >= 8 && hour < 14)
        return 'noon';
    if (hour >= 14 && hour < 20)
        return 'evening';
    return 'night';
}
// ── Health check endpoint ─────────────────────────────────────────────────────
server.get('/health', async () => {
    return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    };
});
// ── PIPELINE TRIGGER — cron-job.org hits this ─────────────────────────────────
server.get('/api/run-pipeline', async (request, reply) => {
    const secretKey = request.headers['x-cron-secret'];
    const expectedSecret = process.env.CRON_SECRET || 'breaking-news-secret';
    if (secretKey !== expectedSecret) {
        console.log('❌ Unauthorized pipeline trigger attempt');
        return reply.code(401).send({ error: 'Unauthorized' });
    }
    const hour = new Date().getUTCHours();
    const show = getShowFromUTCHour(hour);
    console.log(`🚀 Pipeline triggered — UTC hour ${hour} → show: ${show}`);
    const child = (0, child_process_1.spawn)('npx', ['ts-node', 'src/scripts/build-news-show.ts', `--show=${show}`], {
        cwd: '/opt/render/project/src/backend',
        env: process.env,
        detached: true,
        stdio: 'ignore',
        shell: '/bin/bash',
    });
    child.unref();
    return {
        status: 'started',
        show,
        utcHour: hour,
        pid: child.pid,
        message: `Show "${show}" is running in the background`,
        timestamp: new Date().toISOString(),
    };
});
// ── Start server ──────────────────────────────────────────────────────────────
const start = async () => {
    try {
        const port = parseInt(process.env.PORT || '4000', 10);
        await server.listen({ port: port, host: '0.0.0.0' });
        console.log(`✅ Server running on port ${port}`);
        console.log(`📋 Health check: http://localhost:${port}/health`);
        console.log(`🎬 Pipeline trigger: http://localhost:${port}/api/run-pipeline`);
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();
