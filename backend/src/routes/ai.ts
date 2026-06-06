import { FastifyInstance } from 'fastify';
import { orchestrateArticle } from '../services/ai/orchestrator';

export default async function aiRoutes(server: FastifyInstance) {
  
  // Generate summary for an article
  server.post('/api/ai/summary/:articleId', async (request, reply) => {
    const { articleId } = request.params as { articleId: string };
    try {
      const result = await orchestrateArticle(articleId);
      return { summary: result.summary, hook: result.hook, script: result.scriptId };
    } catch (error) {
      reply.code(500).send({ error: 'Failed to generate summary' });
    }
  });
}
