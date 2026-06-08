"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeNews = scrapeNews;
require("dotenv/config");
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma_1 = require("../utils/prisma");
const filter_1 = require("./filter");
const CLIPS_DIR = path_1.default.resolve(process.cwd(), "media", "clips");
fs_1.default.mkdirSync(CLIPS_DIR, { recursive: true });
const NEWS_CHANNELS = [
    { name: "ABC News", handle: "@ABCNews", region: "USA" },
    { name: "BBC News", handle: "@BBCNews", region: "Europe" },
    { name: "DW News", handle: "@DWNews", region: "Europe" },
    { name: "Euronews", handle: "@euronews", region: "Europe" },
    { name: "France 24", handle: "@France24English", region: "Europe" },
    { name: "Reuters", handle: "@ReutersNews", region: "Global" },
];
function ytdlp(args) {
    return (0, child_process_1.execSync)(`yt-dlp ${args.join(" ")}`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 180000,
    }).trim();
}
async function fetchChannelClips(channel) {
    console.log(`\n📡 Fetching from ${channel.name}...`);
    const clips = [];
    try {
        const json = ytdlp([
            `"https://www.youtube.com/${channel.handle}/videos"`,
            "--flat-playlist",
            "--playlist-end 8",
            "--dump-single-json",
            "--no-warnings",
            "--quiet",
        ]);
        const data = JSON.parse(json);
        const entries = data.entries || [];
        for (const entry of entries) {
            if (!entry.title || !entry.id)
                continue;
            if (!entry.duration || entry.duration > 600 || entry.duration < 30)
                continue;
            const title = entry.title;
            const description = (entry.description || "");
            if ((0, filter_1.isAfricanNews)(title, description, channel.region)) {
                console.log(`  ⏭️  Skipped (Africa): ${title.substring(0, 50)}`);
                continue;
            }
            clips.push({
                id: entry.id,
                title,
                description: description.substring(0, 500),
                url: `https://www.youtube.com/watch?v=${entry.id}`,
                channel: channel.name,
                region: channel.region,
                duration: entry.duration,
                filePath: path_1.default.join(CLIPS_DIR, `${entry.id}.mp4`),
            });
        }
        console.log(`  ✅ Found ${clips.length} clips from ${channel.name}`);
    }
    catch (err) {
        console.error(`  ❌ Failed ${channel.name}: ${err.message.substring(0, 100)}`);
    }
    return clips;
}
async function downloadClip(clip) {
    if (fs_1.default.existsSync(clip.filePath)) {
        console.log(`  ⏭️  Already downloaded: ${clip.id}`);
        return true;
    }
    console.log(`  ⬇️  Downloading: ${clip.title.substring(0, 60)}...`);
    try {
        ytdlp([
            `"${clip.url}"`,
            `-f "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best[height<=720]"`,
            `--merge-output-format mp4`,
            `-o "${clip.filePath}"`,
            "--no-playlist",
            "--quiet",
            "--no-warnings",
        ]);
        return fs_1.default.existsSync(clip.filePath);
    }
    catch (err) {
        console.error(`  ❌ Download failed: ${err.message.substring(0, 100)}`);
        return false;
    }
}
async function scrapeNews() {
    console.log("🎬 Starting YouTube clip scraper...\n");
    try {
        await prisma_1.prisma.$connect();
    }
    catch (err) {
        console.error("❌ DB connection failed:", err);
        return;
    }
    const allClips = [];
    for (const channel of NEWS_CHANNELS) {
        const clips = await fetchChannelClips(channel);
        allClips.push(...clips);
    }
    allClips.sort((a, b) => b.duration - a.duration);
    const selected = allClips.slice(0, 15);
    console.log(`\n📋 Downloading ${selected.length} clips...`);
    let saved = 0;
    for (const clip of selected) {
        const ok = await downloadClip(clip);
        if (!ok)
            continue;
        const category = (0, filter_1.categoriseArticle)(clip.title);
        try {
            await prisma_1.prisma.article.upsert({
                where: { url: clip.url },
                update: { title: clip.title, description: clip.description, publishedAt: new Date(), category, content: clip.filePath },
                create: {
                    title: clip.title,
                    description: clip.description,
                    url: clip.url,
                    publishedAt: new Date(),
                    category,
                    region: clip.region,
                    content: clip.filePath,
                    source: {
                        connectOrCreate: {
                            where: { name: clip.channel },
                            create: { name: clip.channel, url: `https://www.youtube.com` }
                        }
                    }
                }
            });
            saved++;
            console.log(`  💾 Saved: ${clip.title.substring(0, 60)}`);
        }
        catch { }
    }
    console.log(`\n✅ Done. ${saved} clips saved.`);
    await prisma_1.prisma.$disconnect();
}
