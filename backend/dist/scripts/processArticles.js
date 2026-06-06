"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const prisma_1 = require("../utils/prisma");
const orchestrator_1 = require("../services/ai/orchestrator");
const BATCH_SIZE = 10; // Process up to 10 articles per run
async function processArticles() {
    console.log("🤖 Starting AI script generation...");
    // Get articles that don't have scripts yet
    const articles = await prisma_1.prisma.article.findMany({
        where: {
            scripts: { none: {} },
        },
        orderBy: { publishedAt: "desc" },
        take: BATCH_SIZE,
    });
    if (articles.length === 0) {
        console.log("✅ No new articles to process.");
        await prisma_1.prisma.$disconnect();
        return;
    }
    console.log(`📰 Processing ${articles.length} articles with Mistral AI...\n`);
    let success = 0;
    let failed = 0;
    for (const article of articles) {
        try {
            console.log(`📝 [${success + failed + 1}/${articles.length}] ${article.title.substring(0, 70)}...`);
            await (0, orchestrator_1.orchestrateArticle)(article.id);
            console.log(`  ✅ Script generated`);
            success++;
            // Small delay to avoid rate limits
            await new Promise(r => setTimeout(r, 500));
        }
        catch (err) {
            console.error(`  ❌ Failed: ${err.message}`);
            failed++;
        }
    }
    console.log(`\n✅ Done. Success: ${success} | Failed: ${failed}`);
    await prisma_1.prisma.$disconnect();
}
processArticles().catch(async (err) => {
    console.error("Fatal:", err);
    await prisma_1.prisma.$disconnect();
    process.exit(1);
});
