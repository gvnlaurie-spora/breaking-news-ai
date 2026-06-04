import { cleanArticleForAI } from './cleanArticle';

// These are placeholder functions - replace with your actual imports
async function generateSummaryOllama(article: any) {
  console.log('Generating summary for:', article.title);
  return `Summary of ${article.title}`;
}

async function generateHookOllama(article: any) {
  console.log('Generating hook for:', article.title);
  return `Breaking: ${article.title}`;
}

async function generateScriptOllama(article: any) {
  console.log('Generating script for:', article.title);
  return `Script content for ${article.title}`;
}

// Main orchestrator function
export async function orchestrateArticle(article: any) {
  // Clean the article data before passing to AI functions
  const cleanArticle = cleanArticleForAI(article);
  
  // Now pass the cleaned article to each function
  const summary = await generateSummaryOllama(cleanArticle);
  const hook = await generateHookOllama(cleanArticle);
  const script = await generateScriptOllama(cleanArticle);
  
  return {
    summary,
    hook,
    script,
    originalArticle: article
  };
}

// Keep your existing functions if they're called elsewhere
export { generateSummaryOllama, generateHookOllama, generateScriptOllama };
