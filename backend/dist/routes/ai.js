"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = aiRoutes;
const orchestrator_1 = require("../services/ai/orchestrator");
async function aiRoutes(server) {
    // Generate summary for an article
    server.post('/api/ai/summary/:articleId', async (request, reply) => {
        const { articleId } = request.params;
        try {
            const result = await (0, orchestrator_1.orchestrateArticle)(articleId);
            return { summary: result.summary, hook: result.hook, script: result.scriptId };
        }
        catch (error) {
            reply.code(500).send({ error: 'Failed to generate summary' });
        }
    });
}
