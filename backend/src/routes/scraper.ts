import { FastifyPluginAsync } from "fastify";
import { scrapeNews } from "../services/scraper";

const scraperRoutes: FastifyPluginAsync = async (fastify) => {
  // Trigger scraping manually
  fastify.post("/scrape", async (request, reply) => {
    try {
      // Run scraping in background
      scrapeNews().catch(console.error);
      return { message: "Scraping started in background" };
    } catch (error) {
      reply.status(500).send({ error: "Failed to start scraping" });
    }
  });
  
  // Get scraping status
  fastify.get("/scrape/status", async () => {
    return { status: "idle", message: "Scraper is ready" };
  });
};

export default scraperRoutes;
