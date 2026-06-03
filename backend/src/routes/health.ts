import { FastifyInstance } from 'fastify';

export default async function healthRoute(server: FastifyInstance) {
  // This will become /api/health when registered with prefix '/api'
  server.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString()
  }));
}
