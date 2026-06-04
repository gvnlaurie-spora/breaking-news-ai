"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const prisma_1 = require("../utils/prisma");
const generator_simple_1 = require("../services/video/generator-simple");
async function generateVideos() {
    console.log("🎬 Starting audio generation for articles...");
    // Find articles with scripts but no filePath
    const scripts = await prisma_1.prisma.script.findMany({
        where: {
            filePath: null,
            status: "completed"
        },
        include: {
            article: true
        },
        take: 5
    });
    if (scripts.length === 0) {
        console.log("✅ No audio to generate.");
        await prisma_1.prisma.$disconnect();
        return;
    }
    console.log(`📹 Found ${scripts.length} scripts to convert to audio.`);
    for (const script of scripts) {
        try {
            console.log(`🎥 Processing: ${script.article.title.substring(0, 50)}...`);
            const audioPath = await (0, generator_simple_1.generateSimpleVideo)({
                title: script.article.title,
                script: script.content
            });
            // Update the script with filePath
            await prisma_1.prisma.script.update({
                where: { id: script.id },
                data: {
                    filePath: audioPath,
                    status: "completed"
                }
            });
            console.log(`✅ Audio saved: ${audioPath}`);
        }
        catch (error) {
            console.error(`❌ Failed to generate audio for script ${script.id}:`, error);
            // Mark as failed
            await prisma_1.prisma.script.update({
                where: { id: script.id },
                data: { status: "failed" }
            });
        }
    }
    console.log("✅ Audio generation completed.");
    await prisma_1.prisma.$disconnect();
}
generateVideos().catch((error) => {
    console.error("Fatal error:", error);
    prisma_1.prisma.$disconnect();
    process.exit(1);
});
