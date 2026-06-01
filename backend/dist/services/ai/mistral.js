"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSummary = generateSummary;
exports.generateHook = generateHook;
exports.generateScript = generateScript;
const env_1 = require("../../config/env");
const https_1 = __importDefault(require("https"));
// Create an Agent that forces IPv4
const agent = new https_1.default.Agent({
    family: 4, // Force IPv4
    timeout: 30000,
});
async function callMistral(prompt) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const url = new URL("https://api.mistral.ai/v1/chat/completions");
    try {
        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${env_1.env.MISTRAL_API_KEY}`,
            },
            body: JSON.stringify({
                model: "mistral-tiny",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 500,
            }),
            signal: controller.signal,
            // @ts-ignore - Node.js specific option
            agent: agent,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Mistral API error: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        return data.choices[0].message.content;
    }
    catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timeout');
        }
        throw error;
    }
}
async function generateSummary(article) {
    const prompt = `Summarize this news article in 2-3 short sentences.
  
Title: ${article.title}
Content: ${article.content.substring(0, 800)}

Summary:`;
    return callMistral(prompt);
}
async function generateHook(article) {
    const prompt = `Write ONE short, dramatic hook (max 8 words) for a breaking news video: "${article.title.substring(0, 100)}"

Hook:`;
    return callMistral(prompt);
}
async function generateScript(article) {
    const prompt = `Write a quick 30-second script for a news video about: ${article.title.substring(0, 100)}
  
Structure:
HOOK: Grab attention
NEWS: Key facts (2-3 sentences)
WRAP: Call to action

Script:`;
    return callMistral(prompt);
}
