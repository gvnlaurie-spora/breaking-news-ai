import "dotenv/config";
import fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import healthRoute from './routes/health';
import articleRoutes from './routes/articles';

const server = fastify({ logger: true });

// Register plugins
server.register(fastifyCors, { origin: true });
server.register(fastifyHelmet);

// Register routes with /api prefix
server.register(healthRoute, { prefix: '/api' });
server.register(articleRoutes, { prefix: '/api' });

// Root health check for load balancers
server.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString()
}));

// Root endpoint with API info
server.get('/', async () => ({
  name: 'Breaking News AI API',
  version: '1.0.0',
  status: 'running',
  timestamp: new Date().toISOString(),
  endpoints: {
    health: '/health',
    apiHealth: '/api/health',
    articles: '/api/articles',
    articleById: '/api/articles/:id'
  }
}));

const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;

const start = async () => {
  try {
    await server.listen({ port, host: "0.0.0.0" });
    console.log(`✅ Server running on http://localhost:${port}`);
    console.log(`📝 Health: http://localhost:${port}/health`);
    console.log(`📝 API Health: http://localhost:${port}/api/health`);
    console.log(`📰 Articles: http://localhost:${port}/api/articles`);
  } catch (err) {
    console.error("❌ Server failed to start:", err);
    process.exit(1);
  }
};

start();

export default server;
