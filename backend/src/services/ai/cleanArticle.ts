// This function converts null values to undefined (what TypeScript expects)
export function cleanArticleForAI(article: any) {
  return {
    title: article.title,
    description: article.description === null ? undefined : article.description,
    content: article.content,
    category: article.category === null ? '' : article.category
  };
}
