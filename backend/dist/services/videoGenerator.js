"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateVideo = generateVideo;
const prisma_1 = require("../utils/prisma");
const tts_1 = require("./tts");
const ffmpeg_1 = require("./ffmpeg");
const subtitles_1 = require("./subtitles");
const thumbnail_1 = require("./youtube/thumbnail");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function generateVideo(scriptId) {
    const script = await prisma_1.prisma.script.findUnique({
        where: { id: scriptId },
        include: { article: true },
    });
    if (!script) {
        console.error(`❌ Script ${scriptId} not found.`);
        return null;
    }
    try {
        console.log(`🎥 Generating video for script: ${scriptId}`);
        // --- Step 1: Generate TTS audio ---
        const audioDir = path_1.default.join(__dirname, "../../media/audio");
        const audioPath = path_1.default.join(audioDir, `${scriptId}.wav`);
        await (0, tts_1.generateTTS)(script.content, audioPath, "male");
        // --- Step 2: Create video from audio + background ---
        const videoDir = path_1.default.join(__dirname, "../../media/videos");
        const tempVideoPath = path_1.default.join(videoDir, `${scriptId}_temp.mp4`);
        const backgroundImage = path_1.default.join(__dirname, "../../media/stock_footage/breaking_news_bg.png");
        // Ensure background image exists (create a default one if not)
        if (!fs_1.default.existsSync(backgroundImage)) {
            await createDefaultBackground(backgroundImage);
        }
        await (0, ffmpeg_1.createVideoFromAudio)(audioPath, backgroundImage, tempVideoPath);
        // --- Step 3: Generate subtitles ---
        const subtitlesDir = path_1.default.join(__dirname, "../../media/subtitles");
        const subtitlesPath = path_1.default.join(subtitlesDir, `${scriptId}.srt`);
        (0, subtitles_1.generateSubtitles)(script.content, subtitlesPath);
        // --- Step 4: Add subtitles to video ---
        const finalVideoPath = path_1.default.join(videoDir, `${scriptId}.mp4`);
        await (0, ffmpeg_1.addSubtitlesToVideo)(tempVideoPath, subtitlesPath, finalVideoPath);
        // --- Step 5: Generate thumbnail ---
        const thumbnailDir = path_1.default.join(__dirname, "../../media/thumbnails");
        const thumbnailPath = path_1.default.join(thumbnailDir, `${scriptId}.png`);
        await (0, thumbnail_1.generateThumbnail)(script.article.title, script.article.category, thumbnailPath);
        // --- Step 6: Save video metadata to database ---
        const video = await prisma_1.prisma.video.upsert({
            where: { scriptId },
            create: {
                scriptId,
                title: script.article.title,
                description: `Breaking news: ${script.article.title}. ${script.article.description || ""}`,
                filePath: finalVideoPath,
                thumbnailPath,
                duration: 60, // Default duration (1 min)
                status: "completed",
            },
            update: {
                filePath: finalVideoPath,
                thumbnailPath,
                status: "completed",
            },
        });
        // --- Clean up temp files ---
        fs_1.default.unlinkSync(audioPath);
        fs_1.default.unlinkSync(tempVideoPath);
        fs_1.default.unlinkSync(subtitlesPath);
        console.log(`✅ Video generated for script: ${scriptId} (Video ID: ${video.id})`);
        return video;
    }
    catch (error) {
        console.error(`❌ Video generation failed for script ${scriptId}:`, error);
        await prisma_1.prisma.video.upsert({
            where: { scriptId },
            create: {
                scriptId,
                title: script.article.title,
                status: "failed",
            },
            update: {
                status: "failed",
            },
        });
        return null;
    }
}
// --- Helper: Create a default background image ---
async function createDefaultBackground(outputPath) {
    const { createCanvas } = await Promise.resolve().then(() => __importStar(require("canvas")));
    const width = 1920;
    const height = 1080;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    // Black background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);
    // Add "BREAKING NEWS" watermark
    ctx.font = "bold 48px Arial";
    ctx.fillStyle = "#FF0000";
    ctx.textAlign = "center";
    ctx.fillText("BREAKING NEWS", width / 2, height / 2);
    // Save
    const out = fs_1.default.createWriteStream(outputPath);
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    out.on("finish", () => console.log(`✅ Default background created at: ${outputPath}`));
}
