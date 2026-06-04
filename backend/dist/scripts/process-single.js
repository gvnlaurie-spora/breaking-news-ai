"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const prisma_1 = require("../utils/prisma");
const orchestrator_1 = require("../services/ai/orchestrator");
const TARGET_ARTICLE_ID = 'cmps79khg00ayvbg1bbewe7tv';
async function processSingleArticle() {
    console.log(`🎯 Processing specific article: ${TARGET_ARTICLE_ID}`);
    const article = await prisma_1.prisma.article.findUnique({
        where: { id: TARGET_ARTICLE_ID }
    });
    if (!article) {
        console.error(`❌ Article not found`);
        return;
    }
    console.log(`📰 Title: ${article.title}`);
    console.log(`📝 Content available: ${article.content ? 'Yes' : 'No'}`);
    const result = await (0, orchestrator_1.orchestrateArticle)(TARGET_ARTICLE_ID);
    if (result) {
        console.log(`✅ Success! Script saved with ID: ${result.originalArticle.id}`);
    }
    else {
        console.log(`❌ Failed to generate script`);
    }
    await prisma_1.prisma.$disconnect();
}
processSingleArticle().catch(console.error);
