"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../utils/prisma");
const articlesRoutes = async (fastify) => {
    // Get all articles
    fastify.get("/", async () => {
        const articles = await prisma_1.prisma.article.findMany({
            include: { source: true },
            orderBy: { publishedAt: "desc" },
        });
        return { articles };
    });
    // Get a single article
    fastify.get("/:id", async (request) => {
        const { id } = request.params;
        const article = await prisma_1.prisma.article.findUnique({
            where: { id },
            include: { source: true },
        });
        return { article };
    });
};
exports.default = articlesRoutes;
