"use strict";
// ============================================================
// compiler.ts — Build ONE 30-minute compilation video
// Structure: Intro → [Story + Transition] x 8-10 → Outro
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileNewsVideo = compileNewsVideo;
require("dotenv/config");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma_1 = require("../../utils/prisma");
const tts_1 = require("../tts");
const mediaFetcher_1 = require("../media/mediaFetcher");
const ffmpeg_1 = require("../ffmpeg");
const OUTPUT_DIR = path_1.default.resolve(process.cwd(), "output", "videos");
const TMP_DIR = path_1.default.resolve(process.cwd(), "output", "tmp");
const AUDIO_DIR = path_1.default.resolve(process.cwd(), "output", "audio");
[OUTPUT_DIR, TMP_DIR, AUDIO_DIR].forEach(d => fs_1.default.mkdirSync(d, { recursive: true }));
const MAX_STORIES = 10;
const MIN_STORIES = 6;
const TARGET_DURATION = 30 * 60; // 30 minutes in seconds
const INTRO_DURATION = 15;
const OUTRO_DURATION = 15;
const TRANSITION_DURATION = 5;
// ─────────────────────────────────────────────────────────────
// CORE: Build one story segment (visual + audio → mp4)
// ─────────────────────────────────────────────────────────────
async function buildOneStory(story, index, audioDuration) {
    const segOut = path_1.default.join(TMP_DIR, `seg_${index}_${story.id}.mp4`);
    if (fs_1.default.existsSync(segOut)) {
        console.log(`  ⏭️  Segment already exists, reusing: ${path_1.default.basename(segOut)}`);
        return segOut;
    }
    try {
        // 1. TTS voiceover
        const audioPath = path_1.default.join(AUDIO_DIR, `${story.id}.mp3`);
        if (!fs_1.default.existsSync(audioPath)) {
            await (0, tts_1.generateTTS)(story.content, audioPath, index % 2 === 0 ? "male" : "female");
        }
        // Get actual audio duration via ffprobe
        const realDuration = await getAudioDuration(audioPath);
        const segDuration = Math.max(realDuration + 2, 30); // minimum 30s per story
        // 2. Fetch media (images + MP4 footage)
        console.log(`  📦 Fetching media for story ${index + 1}...`);
        const media = await (0, mediaFetcher_1.fetchMediaForStory)(story.title, story.id);
        // 3. Build silent visual track
        const silentVideoPath = path_1.default.join(TMP_DIR, `visual_${story.id}.mp4`);
        if (media.videos.length > 0) {
            // Use real MP4 footage
            console.log(`  🎥 Using stock footage`);
            await (0, ffmpeg_1.prepareVideoClip)(media.videos[0], silentVideoPath, segDuration);
        }
        else if (media.images.length > 0) {
            // Slideshow from images — cycle through if multiple
            console.log(`  🖼️  Building image slideshow`);
            await (0, ffmpeg_1.imageToVideo)(media.images[0], silentVideoPath, segDuration);
        }
        else {
            // Fallback: generated dark background
            console.log(`  🎨 Using generated background`);
            await (0, ffmpeg_1.generateBackground)(story.title, silentVideoPath, segDuration);
        }
        // 4. Combine visual + voiceover + lower-third overlay
        await (0, ffmpeg_1.buildStorySegment)({
            videoPath: silentVideoPath,
            audioPath,
            title: story.title,
            source: story.source,
            outputPath: segOut,
        });
        // Cleanup intermediate visual
        if (fs_1.default.existsSync(silentVideoPath))
            fs_1.default.unlinkSync(silentVideoPath);
        // Cleanup downloaded media
        [...media.images, ...media.videos].forEach(f => {
            try {
                fs_1.default.unlinkSync(f);
            }
            catch { }
        });
        console.log(`  ✅ Story ${index + 1} segment built: ${path_1.default.basename(segOut)}`);
        return segOut;
    }
    catch (err) {
        console.error(`  ❌ Failed story ${index + 1}: ${err.message}`);
        return null;
    }
}
// ─────────────────────────────────────────────────────────────
// AUDIO DURATION via ffprobe
// ─────────────────────────────────────────────────────────────
function getAudioDuration(audioPath) {
    return new Promise((resolve) => {
        const { execSync } = require("child_process");
        try {
            const out = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`, { encoding: "utf8" }).trim();
            resolve(parseFloat(out) || 60);
        }
        catch {
            resolve(60);
        }
    });
}
// ─────────────────────────────────────────────────────────────
// MAIN COMPILER
// ─────────────────────────────────────────────────────────────
async function compileNewsVideo() {
    console.log("\n🎬 Starting 30-minute news compilation...");
    // Fetch ready scripts from DB
    const scripts = await prisma_1.prisma.script.findMany({
        where: { status: "ready" },
        include: { article: { include: { source: true } } },
        orderBy: { article: { publishedAt: "desc" } },
        take: MAX_STORIES,
    });
    if (scripts.length < MIN_STORIES) {
        throw new Error(`Not enough scripts ready. Need ${MIN_STORIES}, have ${scripts.length}. Run process-articles first.`);
    }
    console.log(`📋 Building video from ${scripts.length} stories\n`);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);
    const finalOutput = path_1.default.join(OUTPUT_DIR, `breaking-news-${timestamp}.mp4`);
    const allSegments = [];
    // ── INTRO ──
    const introPath = path_1.default.join(TMP_DIR, "intro.mp4");
    console.log("🎬 Building intro...");
    await (0, ffmpeg_1.buildIntro)(introPath);
    allSegments.push(introPath);
    // ── STORIES + TRANSITIONS ──
    for (let i = 0; i < scripts.length; i++) {
        const script = scripts[i];
        const story = {
            id: script.id,
            title: script.article.title,
            content: script.content,
            source: script.article.source?.name || "Breaking News AI",
        };
        console.log(`\n📰 Story ${i + 1}/${scripts.length}: ${story.title.substring(0, 60)}...`);
        const segPath = await buildOneStory(story, i, 60);
        if (segPath) {
            allSegments.push(segPath);
            // Add transition between stories (not after last one)
            if (i < scripts.length - 1) {
                const transPath = path_1.default.join(TMP_DIR, `trans_${i}.mp4`);
                await (0, ffmpeg_1.buildTransition)(transPath);
                allSegments.push(transPath);
            }
        }
    }
    // ── OUTRO ──
    const outroPath = path_1.default.join(TMP_DIR, "outro.mp4");
    console.log("\n🎬 Building outro...");
    await (0, ffmpeg_1.buildOutro)(outroPath);
    allSegments.push(outroPath);
    // ── CONCAT ALL SEGMENTS ──
    await (0, ffmpeg_1.concatSegments)(allSegments, finalOutput);
    // ── MARK SCRIPTS AS COMPLETED ──
    await prisma_1.prisma.script.updateMany({
        where: { id: { in: scripts.map(s => s.id) } },
        data: { status: "completed", filePath: finalOutput },
    });
    // ── CLEANUP TMP ──
    console.log("\n🧹 Cleaning up temp files...");
    try {
        fs_1.default.readdirSync(TMP_DIR).forEach(f => {
            const fp = path_1.default.join(TMP_DIR, f);
            if (fp !== finalOutput)
                fs_1.default.unlinkSync(fp);
        });
    }
    catch { }
    const fileSizeMB = (fs_1.default.statSync(finalOutput).size / 1024 / 1024).toFixed(1);
    console.log(`\n✅ DONE: ${path_1.default.basename(finalOutput)} (${fileSizeMB} MB)`);
    return finalOutput;
}
