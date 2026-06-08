import "dotenv/config";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { getShow } from "../shows/config";
import { uploadVideo } from "../lib/storage";
import { google } from "googleapis";
import { createReadStream } from "fs";

// ── CLI arg ──
const args = process.argv.slice(2);
const showArg = args.find(a => a.startsWith("--show="))?.split("=")[1];
if (!showArg) {
  console.error("Usage: tsx build-news-show.ts --show=<morning|noon|evening|night>");
  process.exit(1);
}
const show = getShow(showArg);
console.log(`\n📺 Starting show: ${show.label} (${show.id})\n`);

function exec(cmd: string): string {
  return execSync(cmd, { encoding: "utf8", stdio: "inherit", shell: "/bin/bash" }) || "";
}

// ── 1. Scrape clips for this show's sources ──
async function scrape() {
  console.log("📡 Scraping clips...");
  process.env.SHOW_SOURCES = show.sources.join(",");
  exec("npx tsx src/scripts/scrape.ts");
}

// ── 2. Process articles with AI ──
async function process() {
  console.log("\n🤖 Processing articles with AI...");
  exec("npx tsx src/scripts/processArticles.ts");
}

// ── 3. Generate video ──
async function generate(): Promise<string> {
  console.log("\n🎬 Generating video...");
  process.env.SHOW_ID = show.id;
  process.env.MAX_CLIPS = String(show.maxClips);
  process.env.SEGMENT_DURATION = String(show.segmentDuration);
  exec("npx tsx src/scripts/generate-videos.ts");

  const videosDir = path.resolve(process.cwd(), "output", "videos");
  const files = fs.readdirSync(videosDir)
    .filter(f => f.endsWith(".mp4") && !f.includes("test") && !f.includes("dummy"))
    .sort((a, b) => {
      return fs.statSync(path.join(videosDir, b)).mtimeMs - fs.statSync(path.join(videosDir, a)).mtimeMs;
    });

  if (files.length === 0) throw new Error("No video generated");
  return path.join(videosDir, files[0]);
}

// ── 4. Upload to R2 ──
async function uploadToR2(localPath: string): Promise<string> {
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_BUCKET) {
    console.log("⚠️  R2 not configured — skipping R2 upload");
    return "";
  }
  const dateStr = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);
  const key = `videos/${show.id}/${dateStr}.mp4`;
  const publicBase = process.env.R2_PUBLIC_BASE || undefined;
  console.log(`\n📤 Uploading to R2: ${key}`);
  const url = await uploadVideo(localPath, key, publicBase);
  console.log(`✅ R2 URL: ${url}`);
  return url;
}

// ── 5. Upload to YouTube ──
async function uploadToYouTube(localPath: string): Promise<string> {
  if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_REFRESH_TOKEN) {
    console.log("⚠️  YouTube not configured — skipping YouTube upload");
    return "";
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI || "http://localhost:3000/auth-callback"
  );
  oauth2Client.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric"
  });
  const title = `${show.youtubeTitle} — ${dateStr} | Breaking News AI`;
  const description = [
    `🌍 Breaking News AI — Your world, right now.`,
    ``,
    `📺 ${show.label}`,
    ``,
    `AI-powered news compilation covering the biggest international stories.`,
    `Sources: BBC, DW, France 24, Reuters, ABC News, Euronews.`,
    ``,
    `⚠️ International news only — Europe and Americas focus.`,
    ``,
    `🔔 Subscribe for updates 4 times daily.`,
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

  const url = `https://youtu.be/${response.data.id}`;
  console.log(`✅ YouTube: ${url}`);
  return url;
}

// ── MAIN ──
(async () => {
  try {
    await scrape();
    await process();
    const videoPath = await generate();
    await uploadToR2(videoPath);
    await uploadToYouTube(videoPath);
    console.log(`\n✅ Show complete: ${show.label}`);
  } catch (err: any) {
    console.error(`\n❌ Show failed: ${err.message}`);
    process.exit(1);
  }
})();
