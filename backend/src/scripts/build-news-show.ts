import "dotenv/config";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { getShow } from "../shows/config";
import { google } from "googleapis";
import { createReadStream } from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const showArg = args.find(a => a.startsWith("--show="))?.split("=")[1];
if (!showArg) {
  console.error("Usage: tsx build-news-show.ts --show=<morning|noon|evening|night>");
  process.exit(1);
}
const show = getShow(showArg);
console.log(`\n📺 Starting show: ${show.label} (${show.id})\n`);

function run(cmd: string): void {
  execSync(cmd, { stdio: "inherit", shell: "/bin/bash" });
}

async function scrape(): Promise<void> {
  console.log("📡 Scraping clips for: " + show.sources.join(", "));
  process.env.SHOW_SOURCES = show.sources.join(",");
  run("npx tsx src/scripts/scrape.ts");
}

async function processArticles(): Promise<void> {
  console.log("\n🤖 Processing articles with AI...");
  run("npx tsx src/scripts/processArticles.ts");
}

async function generateVideo(): Promise<string> {
  console.log("\n🎬 Generating 30-minute video...");
  process.env.SHOW_ID = show.id;
  process.env.MAX_CLIPS = String(show.maxClips);
  process.env.SEGMENT_DURATION = String(show.segmentDuration);
  run("npx tsx src/scripts/generate-videos.ts");

  const videosDir = path.resolve(process.cwd(), "output", "videos");
  const files = fs.readdirSync(videosDir)
    .filter(f => f.endsWith(".mp4") && !f.includes("test") && !f.includes("dummy"))
    .sort((a, b) => fs.statSync(path.join(videosDir, b)).mtimeMs - fs.statSync(path.join(videosDir, a)).mtimeMs);

  if (files.length === 0) throw new Error("No video generated");
  const videoPath = path.join(videosDir, files[0]);
  const sizeMB = (fs.statSync(videoPath).size / 1024 / 1024).toFixed(1);
  console.log(`\n✅ Video ready: ${files[0]} (${sizeMB} MB)`);
  return videoPath;
}

async function uploadToYouTube(localPath: string): Promise<void> {
  if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_REFRESH_TOKEN) {
    console.log("⚠️  YouTube credentials missing — skipping upload");
    return;
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI || "http://localhost:3000/auth-callback"
  );
  oauth2Client.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  const scripts = await prisma.script.findMany({
    where: { status: "completed" },
    include: { article: { include: { source: true } } },
    orderBy: { updatedAt: "desc" },
    take: show.maxClips,
  });

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  const shortDate = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const topHeadline = scripts[0]?.article.title || show.youtubeTitle;
  const title = `${topHeadline.substring(0, 65)} | ${show.label} ${shortDate}`;

  const storiesList = scripts.map((s, i) => {
    const src = s.article.source?.name || "Unknown";
    const summary = s.summary ? `\n   ${s.summary.substring(0, 120)}` : "";
    return `${i + 1}. ${s.article.title}${summary}\n   📰 ${src}`;
  }).join("\n\n");

  const description = [
    `🌍 Breaking News AI — Your world, right now.`,
    ``,
    `📺 ${show.label} — ${dateStr}`,
    ``,
    `📋 STORIES IN THIS BROADCAST:`,
    ``,
    storiesList,
    ``,
    `─────────────────────────────────`,
    `AI-powered international news. Sources: BBC, DW, France 24, Reuters, ABC News, Euronews.`,
    `⚠️ International news only — Europe and Americas focus.`,
    `🔔 Subscribe for 4 broadcasts daily.`,
    ``,
    `#BreakingNews #WorldNews #AINews #${show.id}`,
  ].join("\n");

  console.log(`\n📤 Uploading to YouTube: ${title}`);
  const response = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: title.substring(0, 100),
        description: description.substring(0, 5000),
        tags: ["breaking news", "world news", "AI news", show.id, "international news"],
        categoryId: "25",
        defaultLanguage: "en",
      },
      status: {
        privacyStatus: "public",
        selfDeclaredMadeForKids: false,
        madeForKids: false,
      },
    },
    media: { mimeType: "video/mp4", body: createReadStream(localPath) },
  });

  console.log(`✅ YouTube live: https://youtu.be/${response.data.id}`);
}

(async () => {
  try {
    await scrape();
    await processArticles();
    const videoPath = await generateVideo();
    await uploadToYouTube(videoPath);
    console.log(`\n✅ ${show.label} complete.`);
  } catch (err: any) {
    console.error(`\n❌ Show failed: ${err.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
