import "dotenv/config";
import { prisma } from "../utils/prisma";
import { orchestrateArticle } from "../services/ai/orchestrator";

const BATCH_SIZE = 10; // Process up to 10 articles per run

async function processArticles() {
  console.log("🤖 Starting AI script generation...");

  // Get articles that don't have scripts yet
  const articles = await prisma.article.findMany({
    where: {
      scripts: { none: {} },
    },
    orderBy: { publishedAt: "desc" },
    take: BATCH_SIZE,
  });

  if (articles.length === 0) {
    console.log("✅ No new articles to process.");
    await prisma.$disconnect();
    return;
  }

  console.log(`📰 Processing ${articles.length} articles with Mistral AI...\n`);

  let success = 0;
  let failed = 0;

  for (const article of articles) {
    try {
      console.log(`📝 [${success + failed + 1}/${articles.length}] ${article.title.substring(0, 70)}...`);
      await orchestrateArticle(article.id);
      console.log(`  ✅ Script generated`);
      success++;

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 500));
    } catch (err: any) {
      console.error(`  ❌ Failed: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n✅ Done. Success: ${success} | Failed: ${failed}`);
  await prisma.$disconnect();
}

processArticles().catch(async (err) => {
  console.error("Fatal:", err);
  await prisma.$disconnect();
  process.exit(1);
});
