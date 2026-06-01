import { prisma } from "../../utils/prisma";
import {
  generateSummary,
  generateHook,
  generateScript,
} from "./mistral";
import {
  generateSummaryOllama,
  generateHookOllama,
  generateScriptOllama,
} from "./ollama";

export async function processArticleWithAI(articleId: string) {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
  });

  if (!article) {
    console.error(`❌ Article ${articleId} not found.`);
    return null;
  }

  try {
    console.log(`🤖 Processing article with AI: ${article.title.substring(0, 60)}...`);

    // --- Generate summary ---
    let summary: string;
    try {
      summary = await generateSummary({
        title: article.title,
        description: article.description || "",
        content: article.content || article.description || article.title
      });
      console.log(`   ✅ Summary generated (Mistral).`);
    } catch (error) {
      console.warn(`   ⚠️ Mistral summary failed, falling back to Ollama.`);
      summary = await generateSummaryOllama(article);
      console.log(`   ✅ Summary generated (Ollama).`);
    }

    // --- Generate hook ---
    let hook: string;
    try {
      hook = await generateHook({
        title: article.title,
        category: article.category || "general"
      });
      console.log(`   ✅ Hook generated (Mistral).`);
    } catch (error) {
      console.warn(`   ⚠️ Mistral hook failed, falling back to Ollama.`);
      hook = await generateHookOllama(article);
      console.log(`   ✅ Hook generated (Ollama).`);
    }

    // --- Generate script ---
    let script: string;
    try {
      script = await generateScript({
        title: article.title,
        description: article.description || "",
        content: article.content || article.description || article.title,
        category: article.category || "general"
      });
      console.log(`   ✅ Script generated (Mistral).`);
    } catch (error) {
      console.warn(`   ⚠️ Mistral script failed, falling back to Ollama.`);
      script = await generateScriptOllama(article);
      console.log(`   ✅ Script generated (Ollama).`);
    }

    // --- Save to database ---
    const savedScript = await prisma.script.upsert({
      where: { articleId },
      create: {
        articleId,
        content: script,
        hook,
        status: "completed",
      },
      update: {
        content: script,
        hook,
        status: "completed",
      },
    });

    console.log(`   📝 Script saved to database (ID: ${savedScript.id}).`);
    return savedScript;
  } catch (error) {
    console.error(`❌ AI processing failed for article ${articleId}:`, error);
    await prisma.script.upsert({
      where: { articleId },
      create: {
        articleId,
        content: "",
        hook: "",
        status: "failed",
      },
      update: {
        status: "failed",
      },
    });
    return null;
  }
}
