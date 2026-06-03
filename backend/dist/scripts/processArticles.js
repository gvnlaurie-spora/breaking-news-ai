"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const prisma_1 = require("../utils/prisma");
const orchestrator_1 = require("../services/ai/orchestrator");
async function processAllArticles() {
    console.log("🔄 Starting AI processing for all articles...");
    // --- Find articles without scripts ---
    const articles = await prisma_1.prisma.article.findMany({
        where: {
            scripts: {
                none: {},
            },
        },
        take: 10, // Process 10 at a time to avoid rate limits
    });
    if (articles.length === 0) {
        console.log("✅ No new articles to process.");
        await prisma_1.prisma.$disconnect();
        return;
    }
    console.log(`📰 Found ${articles.length} articles to process.`);
    // --- Process each article ---
    for (const article of articles) {
        try {
            await (0, orchestrator_1.orchestrateArticle)(article.id);
            console.log(`✅ Processed: ${article.title.substring(0, 50)}...`);
        }
        catch (error) {
            console.error(`❌ Failed to process article ${article.id}:`, error);
        }
    }
    console.log("✅ AI processing completed.");
    await prisma_1.prisma.$disconnect();
}
processAllArticles().catch((error) => {
    console.error("Fatal error:", error);
    prisma_1.prisma.$disconnect();
    process.exit(1);
});
