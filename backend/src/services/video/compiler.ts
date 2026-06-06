// ============================================================
// compiler.ts — Build ONE 30-minute compilation video
// Structure: Intro → [Story + Transition] x 8-10 → Outro
// ============================================================

import "dotenv/config";
import fs from "fs";
import path from "path";
import { prisma } from "../../utils/prisma";
import { generateTTS } from "../tts";
import { fetchMediaForStory } from "../media/mediaFetcher";
import {
  generateBackground,
  prepareVideoClip,
  imageToVideo,
  buildStorySegment,
  buildTransition,
  buildIntro,
  buildOutro,
  concatSegments,
} from "../ffmpeg";

const OUTPUT_DIR   = path.resolve(process.cwd(), "output", "videos");
const TMP_DIR      = path.resolve(process.cwd(), "output", "tmp");
const AUDIO_DIR    = path.resolve(process.cwd(), "output", "audio");

[OUTPUT_DIR, TMP_DIR, AUDIO_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

const MAX_STORIES        = 10;
const MIN_STORIES        = 6;
const TARGET_DURATION    = 30 * 60; // 30 minutes in seconds
const INTRO_DURATION     = 15;
const OUTRO_DURATION     = 15;
const TRANSITION_DURATION = 5;

// ─────────────────────────────────────────────────────────────
// CORE: Build one story segment (visual + audio → mp4)
// ─────────────────────────────────────────────────────────────

async function buildOneStory(
  story: {
    id: string;
    title: string;
    content: string;
    source: string;
  },
  index: number,
  audioDuration: number
): Promise<string | null> {
  const segOut = path.join(TMP_DIR, `seg_${index}_${story.id}.mp4`);

  if (fs.existsSync(segOut)) {
    console.log(`  ⏭️  Segment already exists, reusing: ${path.basename(segOut)}`);
    return segOut;
  }

  try {
    // 1. TTS voiceover
    const audioPath = path.join(AUDIO_DIR, `${story.id}.mp3`);
    if (!fs.existsSync(audioPath)) {
      await generateTTS(story.content, audioPath, index % 2 === 0 ? "male" : "female");
    }

    // Get actual audio duration via ffprobe
    const realDuration = await getAudioDuration(audioPath);
    const segDuration = Math.max(realDuration + 2, 30); // minimum 30s per story

    // 2. Fetch media (images + MP4 footage)
    console.log(`  📦 Fetching media for story ${index + 1}...`);
    const media = await fetchMediaForStory(story.title, story.id);

    // 3. Build silent visual track
    const silentVideoPath = path.join(TMP_DIR, `visual_${story.id}.mp4`);

    if (media.videos.length > 0) {
      // Use real MP4 footage
      console.log(`  🎥 Using stock footage`);
      await prepareVideoClip(media.videos[0], silentVideoPath, segDuration);
    } else if (media.images.length > 0) {
      // Slideshow from images — cycle through if multiple
      console.log(`  🖼️  Building image slideshow`);
      await imageToVideo(media.images[0], silentVideoPath, segDuration);
    } else {
      // Fallback: generated dark background
      console.log(`  🎨 Using generated background`);
      await generateBackground(story.title, silentVideoPath, segDuration);
    }

    // 4. Combine visual + voiceover + lower-third overlay
    await buildStorySegment({
      videoPath: silentVideoPath,
      audioPath,
      title: story.title,
      source: story.source,
      outputPath: segOut,
    });

    // Cleanup intermediate visual
    if (fs.existsSync(silentVideoPath)) fs.unlinkSync(silentVideoPath);

    // Cleanup downloaded media
    [...media.images, ...media.videos].forEach(f => {
      try { fs.unlinkSync(f); } catch {}
    });

    console.log(`  ✅ Story ${index + 1} segment built: ${path.basename(segOut)}`);
    return segOut;

  } catch (err: any) {
    console.error(`  ❌ Failed story ${index + 1}: ${err.message}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// AUDIO DURATION via ffprobe
// ─────────────────────────────────────────────────────────────

function getAudioDuration(audioPath: string): Promise<number> {
  return new Promise((resolve) => {
    const { execSync } = require("child_process");
    try {
      const out = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`,
        { encoding: "utf8" }
      ).trim();
      resolve(parseFloat(out) || 60);
    } catch {
      resolve(60);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPILER
// ─────────────────────────────────────────────────────────────

export async function compileNewsVideo(): Promise<string> {
  console.log("\n🎬 Starting 30-minute news compilation...");

  // Fetch ready scripts from DB
  const scripts = await prisma.script.findMany({
    where: { status: "ready" },
    include: { article: { include: { source: true } } },
    orderBy: { article: { publishedAt: "desc" } },
    take: MAX_STORIES,
  });

  if (scripts.length < MIN_STORIES) {
    throw new Error(
      `Not enough scripts ready. Need ${MIN_STORIES}, have ${scripts.length}. Run process-articles first.`
    );
  }

  console.log(`📋 Building video from ${scripts.length} stories\n`);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);
  const finalOutput = path.join(OUTPUT_DIR, `breaking-news-${timestamp}.mp4`);
  const allSegments: string[] = [];

  // ── INTRO ──
  const introPath = path.join(TMP_DIR, "intro.mp4");
  console.log("🎬 Building intro...");
  await buildIntro(introPath);
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
        const transPath = path.join(TMP_DIR, `trans_${i}.mp4`);
        await buildTransition(transPath);
        allSegments.push(transPath);
      }
    }
  }

  // ── OUTRO ──
  const outroPath = path.join(TMP_DIR, "outro.mp4");
  console.log("\n🎬 Building outro...");
  await buildOutro(outroPath);
  allSegments.push(outroPath);

  // ── CONCAT ALL SEGMENTS ──
  await concatSegments(allSegments, finalOutput);

  // ── MARK SCRIPTS AS COMPLETED ──
  await prisma.script.updateMany({
    where: { id: { in: scripts.map(s => s.id) } },
    data: { status: "completed", filePath: finalOutput },
  });

  // ── CLEANUP TMP ──
  console.log("\n🧹 Cleaning up temp files...");
  try {
    fs.readdirSync(TMP_DIR).forEach(f => {
      const fp = path.join(TMP_DIR, f);
      if (fp !== finalOutput) fs.unlinkSync(fp);
    });
  } catch {}

  const fileSizeMB = (fs.statSync(finalOutput).size / 1024 / 1024).toFixed(1);
  console.log(`\n✅ DONE: ${path.basename(finalOutput)} (${fileSizeMB} MB)`);

  return finalOutput;
}
