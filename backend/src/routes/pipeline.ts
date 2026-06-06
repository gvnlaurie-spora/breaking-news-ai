import { FastifyInstance } from 'fastify';
import { exec } from 'child_process';

export default async function pipelineRoutes(server: FastifyInstance) {
  
  // Trigger the full pipeline
  server.get('/api/run-pipeline', async (request, reply) => {
    // Check secret for security
    const secretKey = request.headers['x-cron-secret'];
    const expectedSecret = process.env.CRON_SECRET || 'breaking-news-secret';
    
    if (secretKey !== expectedSecret) {
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
        console.log(stdout);
      }
    });
    
    return { 
      status: 'started', 
      message: 'Full pipeline is running in the background',
      timestamp: new Date().toISOString()
    };
  });
  
  // Health check for the pipeline endpoint
  server.get('/api/pipeline-health', async () => {
    return { 
      status: 'ready', 
      message: 'Pipeline trigger is available',
      timestamp: new Date().toISOString()
    };
  });
}
