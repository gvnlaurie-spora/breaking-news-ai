"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateScript = generateScript;
exports.orchestrateArticle = orchestrateArticle;
require("dotenv/config");
const mistralai_1 = require("@mistralai/mistralai");
const prisma_1 = require("../../utils/prisma");
const cleanArticle_1 = require("./cleanArticle");
const mistral = new mistralai_1.Mistral({ apiKey: process.env.MISTRAL_API_KEY });
const MODEL = "mistral-small-latest"; // fast + cheap
async function callMistral(prompt) {
    const res = await mistral.chat.complete({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        maxTokens: 600,
        temperature: 0.7,
    });
    const content = res.choices?.[0]?.message?.content;
    if (!content)
        throw new Error("Empty Mistral response");
    return typeof content === "string" ? content.trim() : content[0]?.type === "text" ? content[0].text.trim() : "";
}
async function generateScript(article) {
    const desc = article.description || "";
    const hook = await callMistral(`You are a TV news anchor. Write a single punchy HOOK sentence (max 20 words) to open a news story. 
No preamble, just the hook sentence.
Story: "${article.title}"`);
    const summary = await callMistral(`Summarise this news story in exactly 2 sentences for a TV broadcast. Be factual, neutral, professional.
Title: "${article.title}"
Details: "${desc}"`);
    const content = await callMistral(`Write a 60-second TV news script (approximately 150 words) for this story. 
- Start with the hook already provided
- Use clear, spoken English — no jargon
- Include: what happened, where, who is involved, why it matters
- End with a forward-looking statement
- Do NOT include stage directions, [ANCHOR], or formatting tags
- Just the spoken words only

Hook: ${hook}
Story: "${article.title}"
Background: "${desc}"`);
    return { hook, summary, content };
}
async function orchestrateArticle(articleId) {
    const article = await prisma_1.prisma.article.findUnique({ where: { id: articleId } });
    if (!article)
        throw new Error(`Article not found: ${articleId}`);
    const clean = (0, cleanArticle_1.cleanArticleForAI)(article);
    const { hook, summary, content } = await generateScript(clean);
    const script = await prisma_1.prisma.script.upsert({
        where: { articleId: article.id },
        update: { hook, summary, content, status: "ready" },
        create: { articleId: article.id, hook, summary, content, status: "ready" },
    });
    return { hook, summary, content, scriptId: script.id, originalArticle: article };
}
