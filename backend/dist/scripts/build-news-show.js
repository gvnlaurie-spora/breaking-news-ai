"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../shows/config");
const googleapis_1 = require("googleapis");
const fs_2 = require("fs");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const args = process.argv.slice(2);
const showArg = args.find(a => a.startsWith("--show="))?.split("=")[1];
if (!showArg) {
    console.error("Usage: tsx build-news-show.ts --show=<morning|noon|evening|night>");
    process.exit(1);
}
const show = (0, config_1.getShow)(showArg);
console.log(`\n📺 Starting show: ${show.label} (${show.id})\n`);
function run(cmd) {
    (0, child_process_1.execSync)(cmd, { stdio: "inherit", shell: "/bin/bash" });
}
async function scrape() {
    console.log("📡 Scraping clips for: " + show.sources.join(", "));
    process.env.SHOW_SOURCES = show.sources.join(",");
    run("npx tsx src/scripts/scrape.ts");
}
async function processArticles() {
    console.log("\n🤖 Processing articles with AI...");
    run("npx tsx src/scripts/processArticles.ts");
}
async function generateVideo() {
    console.log("\n🎬 Generating 30-minute video...");
    process.env.SHOW_ID = show.id;
    process.env.MAX_CLIPS = String(show.maxClips);
    process.env.SEGMENT_DURATION = String(show.segmentDuration);
    run("npx tsx src/scripts/generate-videos.ts");
    const videosDir = path_1.default.resolve(process.cwd(), "output", "videos");
    const files = fs_1.default.readdirSync(videosDir)
        .filter(f => f.endsWith(".mp4") && !f.includes("test") && !f.includes("dummy"))
        .sort((a, b) => fs_1.default.statSync(path_1.default.join(videosDir, b)).mtimeMs - fs_1.default.statSync(path_1.default.join(videosDir, a)).mtimeMs);
    if (files.length === 0)
        throw new Error("No video generated");
    const videoPath = path_1.default.join(videosDir, files[0]);
    const sizeMB = (fs_1.default.statSync(videoPath).size / 1024 / 1024).toFixed(1);
    console.log(`\n✅ Video ready: ${files[0]} (${sizeMB} MB)`);
    return videoPath;
}
async function uploadToYouTube(localPath) {
    if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_REFRESH_TOKEN) {
        console.log("⚠️  YouTube credentials missing — skipping upload");
        return;
    }
    const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET, process.env.YOUTUBE_REDIRECT_URI || "http://localhost:3000/auth-callback");
    oauth2Client.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
    const youtube = googleapis_1.google.youtube({ version: "v3", auth: oauth2Client });
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
        media: { mimeType: "video/mp4", body: (0, fs_2.createReadStream)(localPath) },
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
    }
    catch (err) {
        console.error(`\n❌ Show failed: ${err.message}`);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
})();
