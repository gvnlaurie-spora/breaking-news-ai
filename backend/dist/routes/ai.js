"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../utils/prisma");
const orchestrator_1 = require("../services/ai/orchestrator");
const aiRoutes = async (fastify) => {
    // Generate summary for an article
    fastify.post("/ai/summarize/:articleId", async (request, reply) => {
        const { articleId } = request.params;
        const article = await prisma_1.prisma.article.findUnique({
            where: { id: articleId }
        });
        if (!article) {
            return reply.status(404).send({ error: "Article not found" });
        }
        const summary = await (0, orchestrator_1.generateSummaryOllama)({
            title: article.title,
            description: article.description || "",
            content: article.content || ""
        });
        return { summary };
    });
    // Generate hook for an article
    fastify.post("/ai/hook/:articleId", async (request, reply) => {
        const { articleId } = request.params;
        const article = await prisma_1.prisma.article.findUnique({
            where: { id: articleId }
        });
        if (!article) {
            return reply.status(404).send({ error: "Article not found" });
        }
        const hook = await (0, orchestrator_1.generateHookOllama)({
            title: article.title,
            category: article.category || "general"
        });
        return { hook };
    });
    // Generate full script for an article
    fastify.post("/ai/script/:articleId", async (request, reply) => {
        const { articleId } = request.params;
        const article = await prisma_1.prisma.article.findUnique({
            where: { id: articleId }
        });
        if (!article) {
            return reply.status(404).send({ error: "Article not found" });
        }
        const script = await (0, orchestrator_1.generateScriptOllama)({
            title: article.title,
            description: article.description || "",
            content: article.content || "",
            category: article.category || "general"
        });
        return { script };
    });
};
exports.default = aiRoutes;
