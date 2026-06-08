"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const child_process_1 = require("child_process");
// Create Fastify instance
const server = (0, fastify_1.default)({ logger: true });
// Register plugins
server.register(cors_1.default, { origin: true });
server.register(helmet_1.default);
// Health check endpoints
server.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString()
}));
server.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString()
}));
// PIPELINE TRIGGER ENDPOINT - This is what we need!
server.get('/api/run-pipeline', async (request, reply) => {
    const secretKey = request.headers['x-cron-secret'];
    const expectedSecret = process.env.CRON_SECRET || 'breaking-news-secret';
    console.log('🔐 Pipeline trigger attempt, secret present:', !!secretKey);
    if (secretKey !== expectedSecret) {
        console.log('❌ Unauthorized pipeline trigger attempt');
        return reply.code(401).send({ error: 'Unauthorized' });
    }
    console.log('🚀 Pipeline triggered via cron job at:', new Date().toISOString());
    // Run the full pipeline in the background
    (0, child_process_1.exec)('npm run full-run', {
        cwd: '/opt/render/project/src/backend',
        env: process.env
    }, (error, stdout, stderr) => {
        if (error) {
            console.error('❌ Pipeline failed:', error.message);
            console.error('stderr:', stderr);
        }
        else {
            console.log('✅ Pipeline completed successfully');
            console.log('stdout:', stdout);
        }
    });
    return {
        status: 'started',
        message: 'Full pipeline is running in the background',
        timestamp: new Date().toISOString()
    };
});
// Pipeline health check
server.get('/api/pipeline-health', async () => {
    return {
        status: 'ready',
        message: 'Pipeline trigger is available',
        timestamp: new Date().toISOString()
    };
});
// Root endpoint
server.get('/', async () => ({
    name: 'Breaking News AI API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
        health: '/health',
        apiHealth: '/api/health',
        pipeline: '/api/run-pipeline',
        pipelineHealth: '/api/pipeline-health'
    }
}));
const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;
const start = async () => {
    try {
        await server.listen({ port, host: "0.0.0.0" });
        console.log(`✅ Server running on http://localhost:${port}`);
        console.log(`📝 Pipeline trigger available at: /api/run-pipeline`);
    }
    catch (err) {
        console.error("❌ Server failed to start:", err);
        process.exit(1);
    }
};
start();
exports.default = server;
