"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanArticleForAI = cleanArticleForAI;
function cleanArticleForAI(article) {
    return {
        id: article.id,
        title: (article.title || "").substring(0, 200),
        description: (article.description || "").substring(0, 500),
        category: article.category || "general",
        region: article.region || "Global",
    };
}
