import "dotenv/config";
import fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
import articlesRoutes from "./routes/articles";
import aiRoutes from "./routes/ai";
import scraperRoutes from "./routes/scraper";

export const app = fastify({
  logger: true,
});

// Security plugins
app.register(fastifyCors, {
  origin: true,
  credentials: true,
});
app.register(fastifyHelmet);
app.register(fastifyRateLimit, {
  max: 100,
  timeWindow: "15 minutes",
});

// Register routes
app.register(articlesRoutes, { prefix: "/api/articles" });
app.register(aiRoutes, { prefix: "/api" });
app.register(scraperRoutes, { prefix: "/api" });

// Health check route
app.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// Register video routes
import videoRoutes from "./routes/video";
app.register(videoRoutes, { prefix: "/api" });
