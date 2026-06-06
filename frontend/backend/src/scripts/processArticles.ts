import "dotenv/config";
import { prisma } from "../utils/prisma";
import { orchestrateArticle } from "../services/ai/orchestrator";

async function processAllArticles() {
  console.log("🔄 Starting AI processing for all articles...");

  // --- Find articles without scripts ---
  const articles = await prisma.article.findMany({
    where: {
      scripts: {
        none: {},
      },
    },
    take: 10, // Process 10 at a time to avoid rate limits
  });

  if (articles.length === 0) {
    console.log("✅ No new articles to process.");
    await prisma.$disconnect();
    return;
  }

  console.log(`📰 Found ${articles.length} articles to process.`);

  // --- Process each article ---
  for (const article of articles) {
    try {
      await orchestrateArticle(article.id);
      console.log(`✅ Processed: ${article.title.substring(0, 50)}...`);
    } catch (error) {
      console.error(`❌ Failed to process article ${article.id}:`, error);
    }
  }

  console.log("✅ AI processing completed.");
  await prisma.$disconnect();
}

processAllArticles().catch((error) => {
  console.error("Fatal error:", error);
  prisma.$disconnect();
  process.exit(1);
});
