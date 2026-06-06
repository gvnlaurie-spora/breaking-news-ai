"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const compiler_1 = require("../services/video/compiler");
const prisma_1 = require("../utils/prisma");
async function generateVideos() {
    console.log("🎬 Breaking News AI — Video Compiler\n");
    try {
        const videoPath = await (0, compiler_1.compileNewsVideo)();
        console.log(`\n🎉 30-minute video ready: ${videoPath}`);
    }
    catch (err) {
        console.error(`\n❌ Video compilation failed: ${err.message}`);
        process.exit(1);
    }
    finally {
        await prisma_1.prisma.$disconnect();
    }
}
generateVideos();
