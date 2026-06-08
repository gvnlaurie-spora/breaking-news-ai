import "dotenv/config";
import fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import { exec } from 'child_process';

// Create Fastify instance
const server = fastify({ logger: true });

// Register plugins
server.register(fastifyCors, { origin: true });
server.register(fastifyHelmet);

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
  exec('npm run full-run', { 
    cwd: '/opt/render/project/src/backend',
    env: process.env 
  }, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Pipeline failed:', error.message);
      console.error('stderr:', stderr);
    } else {
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
  } catch (err) {
    console.error("❌ Server failed to start:", err);
    process.exit(1);
  }
};

start();

export default server;
