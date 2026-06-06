import { FastifyPluginAsync } from "fastify";
import { prisma } from "../utils/prisma";
import { compileNewsVideo } from "../services/video/compiler";
import fs from 'fs/promises';

const videoRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/video/generate", async (request, reply) => {
    try {
      const videoPath = await compileNewsVideo();
      return { 
        videoPath, 
        message: "Video generated successfully"
      };
    } catch (error: any) {
      return reply.status(500).send({ error: error.message || "Failed to generate video" });
    }
  });

  fastify.get("/video/download/:articleId", async (request, reply) => {
    const { articleId } = request.params as { articleId: string };
    const script = await prisma.script.findUnique({ where: { articleId } });
    if (!script?.filePath) return reply.status(404).send({ error: "Video not found. Generate it first." });
    try {
      const videoFile = await fs.readFile(script.filePath);
      reply.header('Content-Type', 'video/mp4');
      reply.header('Content-Disposition', `attachment; filename="news_${articleId}.mp4"`);
      return videoFile;
    } catch {
      return reply.status(404).send({ error: "Video file not found" });
    }
  });

  fastify.get("/video/stream/:articleId", async (request, reply) => {
    const { articleId } = request.params as { articleId: string };
    const script = await prisma.script.findUnique({ where: { articleId } });
    if (!script?.filePath) return reply.status(404).send({ error: "Video not found" });
    try {
      const videoFile = await fs.readFile(script.filePath);
      reply.header('Content-Type', 'video/mp4');
      return videoFile;
    } catch {
      return reply.status(404).send({ error: "Video file not found" });
    }
  });
};

export default videoRoutes;
