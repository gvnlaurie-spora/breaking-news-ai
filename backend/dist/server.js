"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const health_1 = __importDefault(require("./routes/health"));
const articles_1 = __importDefault(require("./routes/articles"));
// Create Fastify instance
const server = (0, fastify_1.default)({ logger: true });
// Register plugins
server.register(cors_1.default);
server.register(helmet_1.default);
// Register routes with /api prefix
server.register(health_1.default, { prefix: '/api' });
server.register(articles_1.default, { prefix: '/api' });
// Root endpoint (no /api prefix)
server.get('/', async () => ({
    name: 'Breaking News AI API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
        health: '/api/health',
        articles: '/api/articles'
    }
}));
// Keep a simple root health check (no /api prefix) for load balancers
server.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString()
}));
// Start server
const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;
const start = async () => {
    try {
        await server.listen({ port, host: "0.0.0.0" });
        console.log(`✅ Server running on http://localhost:${port}`);
        console.log(`📝 Health check: http://localhost:${port}/health`);
        console.log(`📝 API Health check: http://localhost:${port}/api/health`);
        console.log(`📰 Articles API: http://localhost:${port}/api/articles`);
    }
    catch (err) {
        console.error("❌ Server failed to start:", err);
        process.exit(1);
    }
};
start();
exports.default = server;
