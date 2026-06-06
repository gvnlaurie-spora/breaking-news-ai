import { FastifyPluginAsync } from "fastify";
import { prisma } from "../utils/prisma";
import { generateScript } from "../services/ai/orchestrator";

const aiRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/ai/summarize/:articleId", async (request, reply) => {
    const { articleId } = request.params as { articleId: string };
    const article = await prisma.article.findUnique({ where: { id: articleId } });
    if (!article) return reply.status(404).send({ error: "Article not found" });
    const { summary } = await generateScript({ title: article.title, description: article.description || "" });
    return { summary };
  });

  fastify.post("/ai/hook/:articleId", async (request, reply) => {
    const { articleId } = request.params as { articleId: string };
    const article = await prisma.article.findUnique({ where: { id: articleId } });
    if (!article) return reply.status(404).send({ error: "Article not found" });
    const { hook } = await generateScript({ title: article.title, description: article.description || "" });
    return { hook };
  });

  fastify.post("/ai/script/:articleId", async (request, reply) => {
    const { articleId } = request.params as { articleId: string };
    const article = await prisma.article.findUnique({ where: { id: articleId } });
    if (!article) return reply.status(404).send({ error: "Article not found" });
    const script = await generateScript({ title: article.title, description: article.description || "" });
    return { script };
  });
};

export default aiRoutes;
