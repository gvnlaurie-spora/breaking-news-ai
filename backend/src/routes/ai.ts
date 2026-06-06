import { FastifyPluginAsync } from "fastify";
import { prisma } from "../utils/prisma";
import { generateSummaryOllama as generateSummary, generateHookOllama as generateHook, generateScriptOllama as generateScript } from "../services/ai/orchestrator";

const aiRoutes: FastifyPluginAsync = async (fastify) => {
  // Generate summary for an article
  fastify.post("/ai/summarize/:articleId", async (request, reply) => {
    const { articleId } = request.params as { articleId: string };
    
    const article = await prisma.article.findUnique({
      where: { id: articleId }
    });
    
    if (!article) {
      return reply.status(404).send({ error: "Article not found" });
    }
    
    const summary = await generateSummary({
      title: article.title,
      description: article.description || "",
      content: article.content || ""
    });
    
    return { summary };
  });
  
  // Generate hook for an article
  fastify.post("/ai/hook/:articleId", async (request, reply) => {
    const { articleId } = request.params as { articleId: string };
    
    const article = await prisma.article.findUnique({
      where: { id: articleId }
    });
    
    if (!article) {
      return reply.status(404).send({ error: "Article not found" });
    }
    
    const hook = await generateHook({
      title: article.title,
      category: article.category || "general"
    });
    
    return { hook };
  });
  
  // Generate full script for an article
  fastify.post("/ai/script/:articleId", async (request, reply) => {
    const { articleId } = request.params as { articleId: string };
    
    const article = await prisma.article.findUnique({
      where: { id: articleId }
    });
    
    if (!article) {
      return reply.status(404).send({ error: "Article not found" });
    }
    
    const script = await generateScript({
      title: article.title,
      description: article.description || "",
      content: article.content || "",
      category: article.category || "general"
    });
    
    return { script };
  });
};

export default aiRoutes;
