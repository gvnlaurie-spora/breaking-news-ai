import "dotenv/config";
import fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import healthRoute from './routes/health';
import articleRoutes from './routes/articles';

// Create Fastify instance
const server = fastify({ logger: true });

// Register plugins
server.register(fastifyCors);
server.register(fastifyHelmet);

// Register routes
server.register(healthRoute, { prefix: '/api' });
server.register(articleRoutes, { prefix: '/api' });

// Health check at both /health and /api/health for compatibility
server.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString()
}));

server.get('/api/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString()
}));

// Root endpoint
server.get('/', async () => ({
  name: 'Breaking News AI API',
  version: '1.0.0',
  status: 'running',
  endpoints: {
    health: '/health',
    apiHealth: '/api/health',
    articles: '/api/articles'
  }
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
  } catch (err) {
    console.error("❌ Server failed to start:", err);
    process.exit(1);
  }
};

start();

export default server;
