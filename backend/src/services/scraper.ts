import "dotenv/config";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { prisma } from "../utils/prisma";
import { categoriseArticle, isAfricanNews } from "./filter";

const CLIPS_DIR = path.resolve(process.cwd(), "media", "clips");
fs.mkdirSync(CLIPS_DIR, { recursive: true });

const NEWS_CHANNELS = [
  { name: "ABC News",     handle: "@ABCNews",         region: "USA" },
  { name: "BBC News",     handle: "@BBCNews",          region: "Europe" },
  { name: "DW News",      handle: "@DWNews",           region: "Europe" },
  { name: "Euronews",     handle: "@euronews",         region: "Europe" },
  { name: "France 24",    handle: "@France24English",  region: "Europe" },
  { name: "Reuters",      handle: "@ReutersNews",      region: "Global" },
];

interface ClipMeta {
  id: string;
  title: string;
  description: string;
  url: string;
  channel: string;
  region: string;
  duration: number;
  filePath: string;
}

function ytdlp(args: string[]): string {
  return execSync(`yt-dlp ${args.join(" ")}`, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    timeout: 180000,
  }).trim();
}

async function fetchChannelClips(channel: { name: string; handle: string; region: string }): Promise<ClipMeta[]> {
  console.log(`\n📡 Fetching from ${channel.name}...`);
  const clips: ClipMeta[] = [];
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
      if (!entry.title || !entry.id) continue;
      if (!entry.duration || entry.duration > 600 || entry.duration < 30) continue;
      const title = entry.title as string;
      const description = (entry.description || "") as string;
      if (isAfricanNews(title, description, channel.region)) {
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
        filePath: path.join(CLIPS_DIR, `${entry.id}.mp4`),
      });
    }
    console.log(`  ✅ Found ${clips.length} clips from ${channel.name}`);
  } catch (err: any) {
    console.error(`  ❌ Failed ${channel.name}: ${err.message.substring(0, 100)}`);
  }
  return clips;
}

async function downloadClip(clip: ClipMeta): Promise<boolean> {
  if (fs.existsSync(clip.filePath)) {
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
    return fs.existsSync(clip.filePath);
  } catch (err: any) {
    console.error(`  ❌ Download failed: ${err.message.substring(0, 100)}`);
    return false;
  }
}

export async function scrapeNews() {
  console.log("🎬 Starting YouTube clip scraper...\n");
  try {
    await prisma.$connect();
  } catch (err) {
    console.error("❌ DB connection failed:", err);
    return;
  }

  const allClips: ClipMeta[] = [];
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
    if (!ok) continue;
    const category = categoriseArticle(clip.title);
    try {
      await prisma.article.upsert({
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
    } catch {}
  }

  console.log(`\n✅ Done. ${saved} clips saved.`);
  await prisma.$disconnect();
}
