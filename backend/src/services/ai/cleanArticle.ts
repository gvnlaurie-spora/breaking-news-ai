export function cleanArticleForAI(article: any) {
  return {
    id: article.id,
    title: (article.title || "").substring(0, 200),
    description: (article.description || "").substring(0, 500),
    category: article.category || "general",
    region: article.region || "Global",
  };
}
