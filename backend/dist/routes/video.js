"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../utils/prisma");
const compiler_1 = require("../services/video/compiler");
const promises_1 = __importDefault(require("fs/promises"));
const videoRoutes = async (fastify) => {
    fastify.post("/video/generate", async (request, reply) => {
        try {
            const videoPath = await (0, compiler_1.compileNewsVideo)();
            return {
                videoPath,
                message: "Video generated successfully"
            };
        }
        catch (error) {
            return reply.status(500).send({ error: error.message || "Failed to generate video" });
        }
    });
    fastify.get("/video/download/:articleId", async (request, reply) => {
        const { articleId } = request.params;
        const script = await prisma_1.prisma.script.findUnique({ where: { articleId } });
        if (!script?.filePath)
            return reply.status(404).send({ error: "Video not found. Generate it first." });
        try {
            const videoFile = await promises_1.default.readFile(script.filePath);
            reply.header('Content-Type', 'video/mp4');
            reply.header('Content-Disposition', `attachment; filename="news_${articleId}.mp4"`);
            return videoFile;
        }
        catch {
            return reply.status(404).send({ error: "Video file not found" });
        }
    });
    fastify.get("/video/stream/:articleId", async (request, reply) => {
        const { articleId } = request.params;
        const script = await prisma_1.prisma.script.findUnique({ where: { articleId } });
        if (!script?.filePath)
            return reply.status(404).send({ error: "Video not found" });
        try {
            const videoFile = await promises_1.default.readFile(script.filePath);
            reply.header('Content-Type', 'video/mp4');
            return videoFile;
        }
        catch {
            return reply.status(404).send({ error: "Video file not found" });
        }
    });
};
exports.default = videoRoutes;
