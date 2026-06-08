import { FastifyInstance } from 'fastify';
import { exec } from 'child_process';
import { prisma } from '../utils/prisma';

export default async function pipelineRoutes(server: FastifyInstance) {

  server.get('/run-pipeline', async (request, reply) => {
    const secretKey = request.headers['x-cron-secret'];
    const expectedSecret = process.env.CRON_SECRET || 'breaking-news-secret';
    if (secretKey !== expectedSecret) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    console.log('🚀 Pipeline triggered at:', new Date().toISOString());
    exec('npm run scrape && npm run process-articles', {
      cwd: '/opt/render/project/src/backend',
      env: process.env
    }, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Pipeline failed:', error.message, stderr);
      } else {
        console.log('✅ Pipeline completed\n', stdout);
      }
    });
    return { status: 'started', timestamp: new Date().toISOString() };
  });

  server.get('/pipeline-health', async () => {
    const articles = await prisma.article.count();
    const ready = await prisma.script.count({ where: { status: 'ready' } });
    const completed = await prisma.script.count({ where: { status: 'completed' } });
    return { status: 'ready', articles, ready, completed, timestamp: new Date().toISOString() };
  });

  server.get('/scrape', async (request, reply) => {
    const secretKey = request.headers['x-cron-secret'];
    const expectedSecret = process.env.CRON_SECRET || 'breaking-news-secret';
    if (secretKey !== expectedSecret) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    exec('npm run scrape', {
      cwd: '/opt/render/project/src/backend',
      env: process.env
    }, (error, stdout, stderr) => {
      if (error) console.error('❌ Scrape failed:', error.message, stderr);
      else console.log('✅ Scrape done\n', stdout);
    });
    return { status: 'scraping', timestamp: new Date().toISOString() };
  });
}
