import { FastifyInstance } from 'fastify';

export default async function healthRoute(server: FastifyInstance) {
  // This becomes /api/health when registered with prefix '/api'
  server.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'breaking-news-api',
    version: '1.0.0'
  }));
}
