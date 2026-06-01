import "dotenv/config";
import { prisma } from "../utils/prisma";
import { processArticleWithAI } from "../services/ai/orchestrator";

const TARGET_ARTICLE_ID = 'cmps79khg00ayvbg1bbewe7tv';

async function processSingleArticle() {
  console.log(`🎯 Processing specific article: ${TARGET_ARTICLE_ID}`);
  
  const article = await prisma.article.findUnique({
    where: { id: TARGET_ARTICLE_ID }
  });
  
  if (!article) {
    console.error(`❌ Article not found`);
    return;
  }
  
  console.log(`📰 Title: ${article.title}`);
  console.log(`📝 Content available: ${article.content ? 'Yes' : 'No'}`);
  
  const result = await processArticleWithAI(TARGET_ARTICLE_ID);
  
  if (result) {
    console.log(`✅ Success! Script saved with ID: ${result.id}`);
  } else {
    console.log(`❌ Failed to generate script`);
  }
  
  await prisma.$disconnect();
}

processSingleArticle().catch(console.error);
