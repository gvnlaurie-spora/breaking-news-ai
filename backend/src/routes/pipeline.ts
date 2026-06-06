import { FastifyInstance } from 'fastify';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function pipelineRoutes(server: FastifyInstance) {
  
  // Trigger the full pipeline
  server.get('/api/run-pipeline', async (request, reply) => {
    // Optional: Add a secret key for security
    const secretKey = request.headers['x-cron-secret'];
    const expectedSecret = process.env.CRON_SECRET || 'breaking-news-secret';
    
    if (secretKey !== expectedSecret) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    
    console.log('🚀 Pipeline triggered via cron job');
    
    // Run the pipeline in the background (don't wait for completion)
    // Using the full-run script from package.json
    execAsync('npm run full-run', { cwd: '/opt/render/project/src/backend' })
      .then(() => console.log('✅ Pipeline completed'))
      .catch(err => console.error('❌ Pipeline failed:', err));
    
    return { 
      status: 'started', 
      message: 'Pipeline is running in the background',
      timestamp: new Date().toISOString()
    };
  });
  
  // Simple health check for the pipeline endpoint
  server.get('/api/pipeline-health', async () => {
    return { status: 'ready', timestamp: new Date().toISOString() };
  });
}
