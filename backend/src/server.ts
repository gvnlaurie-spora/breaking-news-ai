import "dotenv/config";
import fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import healthRoute from './routes/health';
import articleRoutes from './routes/articles';
import pipelineRoutes from "./routes/pipeline";

const server = fastify({ logger: true });

server.register(fastifyCors, { origin: true });
server.register(fastifyHelmet);

server.register(healthRoute, { prefix: '/api' });
server.register(articleRoutes, { prefix: '/api' });
server.register(pipelineRoutes, { prefix: '/api' });

server.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString()
}));

server.get('/', async () => ({
  name: 'Breaking News AI API',
  version: '1.0.0',
  status: 'running',
  timestamp: new Date().toISOString()
}));

const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;

const start = async () => {
  try {
    await server.listen({ port, host: "0.0.0.0" });
    console.log(`Server running on port ${port}`);
  } catch (err) {
    console.error("Server failed to start:", err);
    process.exit(1);
  }
};

start();
export default server;
