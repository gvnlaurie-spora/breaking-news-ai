"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterNews = filterNews;
const BREAKING_KEYWORDS = [
    'breaking', 'urgent', 'just in', 'developing', 'live', 'update',
    'emergency', 'critical', 'explosion', 'attack', 'crash', 'accident',
    'earthquake', 'flood', 'storm', 'shooting', 'arrest', 'resigns',
    'election', 'crisis', 'war', 'peace'
];
async function filterNews(newsItem) {
    const titleLower = newsItem.title.toLowerCase();
    const isBreaking = BREAKING_KEYWORDS.some(keyword => titleLower.includes(keyword));
    if (!isBreaking) {
        return null;
    }
    return {
        ...newsItem,
        content: newsItem.description || '',
        category: 'general',
        isBreaking,
    };
}
