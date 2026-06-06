import { FastifyPluginAsync } from "fastify";
import { prisma } from "../utils/prisma";
import { compileNewsVideo as generateSimpleVideo } from "../services/video/compiler";
import fs from 'fs/promises';

const videoRoutes: FastifyPluginAsync = async (fastify) => {
  // Generate video for an article
  fastify.post("/video/generate/:articleId", async (request, reply) => {
    const { articleId } = request.params as { articleId: string };
    
    const article = await prisma.article.findUnique({
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
      const videoPath = await generateSimpleVideo({
        title: article.title,
        script: script
      });
      
      // Save video filePath to database (using filePath instead of videoUrl)
      await prisma.script.update({
        where: { articleId },
        data: { filePath: videoPath, status: "completed" }
      });
      
      return { 
        videoPath, 
        message: "Video generated successfully",
        articleTitle: article.title
      };
    } catch (error) {
      console.error("Video generation error:", error);
      return reply.status(500).send({ error: "Failed to generate video" });
    }
  });
  
  // Download video for an article
  fastify.get("/video/download/:articleId", async (request, reply) => {
    const { articleId } = request.params as { articleId: string };
    
    const script = await prisma.script.findUnique({
      where: { articleId },
      include: { article: true }
    });
    
    if (!script?.filePath) {
      return reply.status(404).send({ error: "Video not found. Generate it first." });
    }
    
    try {
      const videoFile = await fs.readFile(script.filePath);
      reply.header('Content-Type', 'video/mp4');
      reply.header('Content-Disposition', `attachment; filename="news_${articleId}.mp4"`);
      return videoFile;
    } catch (error) {
      return reply.status(404).send({ error: "Video file not found" });
    }
  });
  
  // Stream video for an article
  fastify.get("/video/stream/:articleId", async (request, reply) => {
    const { articleId } = request.params as { articleId: string };
    
    const script = await prisma.script.findUnique({
      where: { articleId }
    });
    
    if (!script?.filePath) {
      return reply.status(404).send({ error: "Video not found" });
    }
    
    try {
      const videoFile = await fs.readFile(script.filePath);
      reply.header('Content-Type', 'video/mp4');
      return videoFile;
    } catch (error) {
      return reply.status(404).send({ error: "Video file not found" });
    }
  });
};

export default videoRoutes;
