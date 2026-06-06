import "dotenv/config";
import { google } from "googleapis";
import { createReadStream, readdirSync, statSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function uploadToYouTube(
  videoPath: string,
  title: string,
  description: string
): Promise<string> {
  if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
    throw new Error("YOUTUBE_CLIENT_ID or YOUTUBE_CLIENT_SECRET missing from .env");
  }
  if (!process.env.YOUTUBE_REFRESH_TOKEN) {
    throw new Error("YOUTUBE_REFRESH_TOKEN missing. Run: npx tsx src/scripts/getRefreshToken.ts");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI || "http://localhost:3000/auth-callback"
  );
  oauth2Client.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });

  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  const response = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: title.substring(0, 100),
        description: description.substring(0, 5000),
        tags: [
          "breaking news", "world news", "AI news", "news today",
          "latest news", "international news", "news compilation",
        ],
        categoryId: "25",
        defaultLanguage: "en",
      },
      status: {
        privacyStatus: "public",
        selfDeclaredMadeForKids: false,
        madeForKids: false,
      },
    },
    media: {
      mimeType: "video/mp4",
      body: createReadStream(videoPath),
    },
  });

  const videoId = response.data.id;
  if (!videoId) throw new Error("No video ID returned from YouTube");
  return `https://youtu.be/${videoId}`;
}

async function buildMetadataFromDB(): Promise<{ title: string; description: string }> {
  const scripts = await prisma.script.findMany({
    where: { status: "completed" },
    include: { article: { include: { source: true } } },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  if (scripts.length === 0) {
    return {
      title: `Breaking News Compilation — ${dateStr}`,
      description: [
        `🌍 Breaking News AI — Your world, right now.`,
        ``,
        `AI-powered news compilation covering the biggest stories from around the world.`,
        `Stories sourced from BBC, Al Jazeera, Reuters, NY Times, The Guardian and more.`,
        ``,
        `🔔 Subscribe and hit the bell for daily updates.`,
        ``,
        `#BreakingNews #WorldNews #AINews #NewsToday`,
      ].join("\n"),
    };
  }

  const topHeadline = scripts[0].article.title;
  const shortDate = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const title = `${topHeadline.substring(0, 70)} | Breaking News ${shortDate}`;

  const storiesList = scripts
    .map((s, i) => {
      const source = s.article.source?.name || "Unknown";
      const summary = s.summary ? `\n   ${s.summary.substring(0, 150)}` : "";
      return `${i + 1}. ${s.article.title}${summary}\n   📰 ${source}`;
    })
    .join("\n\n");

  const description = [
    `🌍 Breaking News AI — Your world, right now.`,
    ``,
    `📋 STORIES IN THIS COMPILATION:`,
    ``,
    storiesList,
    ``,
    `─────────────────────────────────`,
    `AI-powered news compilation covering the biggest stories from around the world.`,
    `Stories sourced from BBC, Al Jazeera, Reuters, NY Times, The Guardian and more.`,
    ``,
    `⚠️ Coverage focuses on international news only.`,
    ``,
    `🔔 Subscribe and hit the bell for updates every 4 hours.`,
    ``,
    `#BreakingNews #WorldNews #AINews #NewsToday`,
  ].join("\n");

  return { title, description };
}

async function main() {
  console.log("🚀 YouTube Upload — Breaking News AI\n");

  const videosDir = resolve(process.cwd(), "output", "videos");

  let files: string[] = [];
  try {
    files = readdirSync(videosDir)
      .filter(f => f.endsWith(".mp4") && !f.includes("test") && !f.includes("dummy"))
      .sort((a, b) => {
        const aStat = statSync(resolve(videosDir, a));
        const bStat = statSync(resolve(videosDir, b));
        return bStat.mtimeMs - aStat.mtimeMs;
      });
  } catch {
    console.error("❌ No output/videos directory found. Run generate-videos first.");
    process.exit(1);
  }

  if (files.length === 0) {
    console.log("⚠️  No video files found in output/videos/. Run generate-videos first.");
    return;
  }

  const latest = files[0];
  const videoPath = resolve(videosDir, latest);
  const fileSizeMB = (statSync(videoPath).size / 1024 / 1024).toFixed(1);

  console.log(`📹 Latest video: ${latest} (${fileSizeMB} MB)`);
  console.log(`📊 Fetching article metadata from DB...\n`);

  const { title, description } = await buildMetadataFromDB();

  console.log(`📌 Title: ${title}`);
  console.log(`📝 Description preview:\n${description.substring(0, 300)}...\n`);
  console.log(`📤 Uploading to YouTube...`);

  try {
    const url = await uploadToYouTube(videoPath, title, description);
    console.log(`\n✅ LIVE on YouTube: ${url}`);
  } catch (err: any) {
    console.error(`\n❌ Upload failed: ${err.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
