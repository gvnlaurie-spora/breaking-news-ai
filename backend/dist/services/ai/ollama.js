"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWithOllama = generateWithOllama;
exports.generateSummaryOllama = generateSummaryOllama;
exports.generateHookOllama = generateHookOllama;
exports.generateScriptOllama = generateScriptOllama;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../../config/env");
async function generateWithOllama(prompt, model = "llama3") {
    const ollamaUrl = env_1.env.OLLAMA_URL || process.env.OLLAMA_URL || 'http://localhost:11434';
    try {
        const response = await axios_1.default.post(`${ollamaUrl}/api/generate`, { model, prompt, stream: false });
        return response.data.response.trim();
    }
    catch (error) {
        console.error("❌ Ollama error:", error);
        throw error;
    }
}
async function generateSummaryOllama(article) {
    // Handle null content
    const contentText = article.content || article.description || article.title;
    const prompt = `
    Summarize the following news article in 2-3 sentences. Focus on the most important facts.
    Article: ${article.title}. ${article.description || ""}. ${contentText.substring(0, 1500)}
  `;
    return generateWithOllama(prompt);
}
async function generateHookOllama(article) {
    const prompts = {
        politics: `Generate a 5-second hook for a breaking news video about: "${article.title}". Use urgency and political tension.`,
        business: `Generate a 5-second hook for a breaking news video about: "${article.title}". Use urgency and financial impact.`,
        technology: `Generate a 5-second hook for a breaking news video about: "${article.title}". Use innovation and impact.`,
        war: `Generate a 5-second hook for a breaking news video about: "${article.title}". Use urgency and emotion.`,
        default: `Generate a 5-second hook for a breaking news video about: "${article.title}". Use urgency and curiosity.`,
    };
    const selectedPrompt = prompts[article.category] || prompts.default;
    return generateWithOllama(selectedPrompt);
}
async function generateScriptOllama(article) {
    // Handle null content
    const contentText = article.content || article.description || article.title;
    const prompt = `
    Write a 1-2 minute news script for a faceless YouTube video about the following article.
    Structure:
    1. Immediate hook (5 seconds).
    2. What just happened (15 seconds).
    3. Why it matters (20 seconds).
    4. Escalation or global implications (20 seconds).
    5. Viewer engagement CTA (10 seconds).
    Use a serious, urgent, and engaging tone.

    Article: ${article.title}. ${article.description || ""}. ${contentText.substring(0, 2000)}
  `;
    return generateWithOllama(prompt);
}
