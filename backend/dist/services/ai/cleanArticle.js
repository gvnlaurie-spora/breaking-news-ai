"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanArticleForAI = cleanArticleForAI;
// This function converts null values to undefined (what TypeScript expects)
function cleanArticleForAI(article) {
    return {
        title: article.title,
        description: article.description === null ? undefined : article.description,
        content: article.content,
        category: article.category === null ? '' : article.category
    };
}
