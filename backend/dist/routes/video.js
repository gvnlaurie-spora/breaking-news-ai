"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../utils/prisma");
const generator_1 = require("../services/video/generator");
const promises_1 = __importDefault(require("fs/promises"));
const videoRoutes = async (fastify) => {
    // Generate video for an article
    fastify.post("/video/generate/:articleId", async (request, reply) => {
        const { articleId } = request.params;
        const article = await prisma_1.prisma.article.findUnique({
            where: { id: articleId },
            include: { scripts: true }
        });
        if (!article) {
            return reply.status(404).send({ error: "Article not found" });
        }
        const script = article.scripts[0]?.content;
        if (!script) {
            return reply.status(404).send({ error: "No script found for this article. Run process-articles first." });
        }
        try {
            const videoPath = await (0, generator_1.generateSimpleVideo)({
                title: article.title,
                script: script
            });
            // Save video filePath to database (using filePath instead of videoUrl)
            await prisma_1.prisma.script.update({
                where: { articleId },
                data: { filePath: videoPath, status: "completed" }
            });
            return {
                videoPath,
                message: "Video generated successfully",
                articleTitle: article.title
            };
        }
        catch (error) {
            console.error("Video generation error:", error);
            return reply.status(500).send({ error: "Failed to generate video" });
        }
    });
    // Download video for an article
    fastify.get("/video/download/:articleId", async (request, reply) => {
        const { articleId } = request.params;
        const script = await prisma_1.prisma.script.findUnique({
            where: { articleId },
            include: { article: true }
        });
        if (!script?.filePath) {
            return reply.status(404).send({ error: "Video not found. Generate it first." });
        }
        try {
            const videoFile = await promises_1.default.readFile(script.filePath);
            reply.header('Content-Type', 'video/mp4');
            reply.header('Content-Disposition', `attachment; filename="news_${articleId}.mp4"`);
            return videoFile;
        }
        catch (error) {
            return reply.status(404).send({ error: "Video file not found" });
        }
    });
    // Stream video for an article
    fastify.get("/video/stream/:articleId", async (request, reply) => {
        const { articleId } = request.params;
        const script = await prisma_1.prisma.script.findUnique({
            where: { articleId }
        });
        if (!script?.filePath) {
            return reply.status(404).send({ error: "Video not found" });
        }
        try {
            const videoFile = await promises_1.default.readFile(script.filePath);
            reply.header('Content-Type', 'video/mp4');
            return videoFile;
        }
        catch (error) {
            return reply.status(404).send({ error: "Video file not found" });
        }
    });
};
exports.default = videoRoutes;
