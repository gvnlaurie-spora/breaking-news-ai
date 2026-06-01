"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processArticleWithAI = processArticleWithAI;
const prisma_1 = require("../../utils/prisma");
const mistral_1 = require("./mistral");
const ollama_1 = require("./ollama");
async function processArticleWithAI(articleId) {
    const article = await prisma_1.prisma.article.findUnique({
        where: { id: articleId },
    });
    if (!article) {
        console.error(`❌ Article ${articleId} not found.`);
        return null;
    }
    try {
        console.log(`🤖 Processing article with AI: ${article.title.substring(0, 60)}...`);
        // --- Generate summary ---
        let summary;
        try {
            summary = await (0, mistral_1.generateSummary)({
                title: article.title,
                description: article.description || "",
                content: article.content || article.description || article.title
            });
            console.log(`   ✅ Summary generated (Mistral).`);
        }
        catch (error) {
            console.warn(`   ⚠️ Mistral summary failed, falling back to Ollama.`);
            summary = await (0, ollama_1.generateSummaryOllama)(article);
            console.log(`   ✅ Summary generated (Ollama).`);
        }
        // --- Generate hook ---
        let hook;
        try {
            hook = await (0, mistral_1.generateHook)({
                title: article.title,
                category: article.category || "general"
            });
            console.log(`   ✅ Hook generated (Mistral).`);
        }
        catch (error) {
            console.warn(`   ⚠️ Mistral hook failed, falling back to Ollama.`);
            hook = await (0, ollama_1.generateHookOllama)(article);
            console.log(`   ✅ Hook generated (Ollama).`);
        }
        // --- Generate script ---
        let script;
        try {
            script = await (0, mistral_1.generateScript)({
                title: article.title,
                description: article.description || "",
                content: article.content || article.description || article.title,
                category: article.category || "general"
            });
            console.log(`   ✅ Script generated (Mistral).`);
        }
        catch (error) {
            console.warn(`   ⚠️ Mistral script failed, falling back to Ollama.`);
            script = await (0, ollama_1.generateScriptOllama)(article);
            console.log(`   ✅ Script generated (Ollama).`);
        }
        // --- Save to database ---
        const savedScript = await prisma_1.prisma.script.upsert({
            where: { articleId },
            create: {
                articleId,
                content: script,
                hook,
                status: "completed",
            },
            update: {
                content: script,
                hook,
                status: "completed",
            },
        });
        console.log(`   📝 Script saved to database (ID: ${savedScript.id}).`);
        return savedScript;
    }
    catch (error) {
        console.error(`❌ AI processing failed for article ${articleId}:`, error);
        await prisma_1.prisma.script.upsert({
            where: { articleId },
            create: {
                articleId,
                content: "",
                hook: "",
                status: "failed",
            },
            update: {
                status: "failed",
            },
        });
        return null;
    }
}
