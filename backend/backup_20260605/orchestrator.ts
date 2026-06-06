import { cleanArticleForAI } from './cleanArticle';
import { prisma } from '../../utils/prisma';

async function generateSummaryOllama(article: any): Promise<string> {
  console.log('Generating summary for:', article.title);
  return `Summary of ${article.title}`;
}

async function generateHookOllama(article: any): Promise<string> {
  console.log('Generating hook for:', article.title);
  return `Breaking: ${article.title}`;
}

async function generateScriptOllama(article: any): Promise<string> {
  console.log('Generating script for:', article.title);
  return `Script content for ${article.title}`;
}

export async function orchestrateArticle(articleId: string) {
  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article) throw new Error(`Article not found: ${articleId}`);

  const cleanArticle = cleanArticleForAI(article);

  const summary = await generateSummaryOllama(cleanArticle);
  const hook    = await generateHookOllama(cleanArticle);
  const content = await generateScriptOllama(cleanArticle);

  await prisma.script.create({
    data: {
      articleId: article.id,
      summary,
      hook,
      content,
      status: 'ready',
    },
  });

  return { summary, hook, content, originalArticle: article };
}

export { generateSummaryOllama, generateHookOllama, generateScriptOllama };
