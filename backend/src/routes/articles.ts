import { FastifyPluginAsync } from "fastify";
import { prisma } from "../utils/prisma";

const articlesRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all articles
  fastify.get("/", async () => {
    const articles = await prisma.article.findMany({
      include: { source: true },
      orderBy: { publishedAt: "desc" },
    });
    return { articles };
  });

  // Get a single article
  fastify.get("/:id", async (request) => {
    const { id } = request.params as { id: string };
    const article = await prisma.article.findUnique({
      where: { id },
      include: { source: true },
    });
    return { article };
  });
};

export default articlesRoutes;
