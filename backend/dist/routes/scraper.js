"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const scraper_1 = require("../services/scraper");
const scraperRoutes = async (fastify) => {
    // Trigger scraping manually
    fastify.post("/scrape", async (request, reply) => {
        try {
            // Run scraping in background
            (0, scraper_1.scrapeNews)().catch(console.error);
            return { message: "Scraping started in background" };
        }
        catch (error) {
            reply.status(500).send({ error: "Failed to start scraping" });
        }
    });
    // Get scraping status
    fastify.get("/scrape/status", async () => {
        return { status: "idle", message: "Scraper is ready" };
    });
};
exports.default = scraperRoutes;
