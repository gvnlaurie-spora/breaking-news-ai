#!/usr/bin/env node
/**
 * Breaking News AI — Complete Pipeline v4
 *
 * Fixes vs v3:
 *   1. ENOBUFS crash fixed — ff() now passes -loglevel error to suppress FFmpeg
 *      verbose frame-by-frame output, and sets maxBuffer to 64 MB as safety net
 *   2. Resolution actually locked to 1920x1080 (v3 had W:1280 H:720 despite comment)
 *   3. buildStockClipSegment dead-code removed — both branches were identical
 *   4. fontPath() now logs a warning when falling back to a non-existent path
 *   5. safeText() adds ellipsis when truncating so text doesn't cut mid-word
 *   6. probeDuration() called only once in segment cache check
 *   7. buildNarrationCard still-image input gets explicit -r flag to avoid VFR
 *   8. execFileSync for edge-tts now also suppresses output via stdio
 *
 * Run: npx tsx src/scripts/broadcast.ts
 */

import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
process.env.PATH = `${require('path').dirname(ffmpegInstaller.path)}:${process.env.PATH}`;
import "dotenv/config";
import axios from "axios";
import { execSync, execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { pipeline } from "stream";
import { promisify } from "util";
import { parseStringPromise } from "xml2js";
import { google } from "googleapis";
import { createReadStream } from "fs";

const streamPipeline = promisify(pipeline);

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const CFG = {
  maxStories:       10,
  minStories:        5,
  segmentDurationS: 150,

  // FIX 2: Actually 1920x1080 now (v3 had 1280x720 despite the comment)
  W: 1920, H: 1080,
  fps: 25,
  preset: "ultrafast",
  crf: 35,
  audioBitrate: "128k",
  sampleRate: 44100,
  ffmpegTimeoutMs: 600_000,

  // FIX 1: 64 MB buffer so FFmpeg output never causes ENOBUFS
  ffmpegMaxBuffer: 64 * 1024 * 1024,

  primaryRed:  "0xff2222",
  darkBg:      "0x0d0d0d",
  channelName: "Breaking News AI",

  azureVoice:   "en-US-JennyNeural",
  edgeTtsVoice: "en-US-JennyNeural",

  outputDir: path.resolve(process.cwd(), "output"),
  tmpDir:    path.resolve(process.cwd(), "output", "tmp"),
  videoDir:  path.resolve(process.cwd(), "output", "videos"),
  audioDir:  path.resolve(process.cwd(), "output", "audio"),
  mediaDir:  path.resolve(process.cwd(), "output", "media"),

  mistralKey:  process.env.MISTRAL_API_KEY   || "",
  azureKey:    process.env.AZURE_SPEECH_KEY  || "",
  azureRegion: "eastus",
  pexelsKey:   process.env.PEXELS_API_KEY    || "",
  pixabayKey:  process.env.PIXABAY_API_KEY   || "",

  ytClientId:     process.env.YOUTUBE_CLIENT_ID     || "",
  ytClientSecret: process.env.YOUTUBE_CLIENT_SECRET || "",
  ytRedirectUri:  process.env.YOUTUBE_REDIRECT_URI  || "",
  ytRefreshToken: process.env.YOUTUBE_REFRESH_TOKEN || "",
};

const AFRICA_TERMS = [
  "africa","african","nigeria","nigerian","kenya","kenyan","ethiopia","ethiopian",
  "egypt","egyptian","ghana","ghanaian","tanzania","ugandan","south africa",
  "zimbabwe","mozambique","senegal","mali","cameroon","ivory coast","angola",
  "zambia","somalia","somali","sudan","sudanese","libya","libyan","algeria",
  "algerian","morocco","moroccan","tunisia","tunisian","rwanda","burundi",
  "congo","botswana","namibia","lesotho","eswatini","madagascar","malawi",
  "burkina faso","togo","benin","guinea","sierra leone","liberia","gambia",
  "lagos","nairobi","kinshasa","luanda","khartoum","addis ababa","abidjan",
  "dakar","accra","kampala","harare","lusaka","maputo","ouagadougou",
  "mogadishu","kigali","bujumbura","abuja","pretoria","cape town","durban",
  "johannesburg","sabc","eskom","ramaphosa","zuma",
];

const RSS_FEEDS = [
  { name: "BBC News",   url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { name: "DW News",    url: "https://rss.dw.com/xml/rss-en-world" },
  { name: "France 24",  url: "https://www.france24.com/en/rss" },
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { name: "NPR World",  url: "https://feeds.npr.org/1004/rss.xml" },
  { name: "ABC News",   url: "https://feeds.abcnews.com/abcnews/internationalheadlines" },
  { name: "Sky News",   url: "https://feeds.skynews.com/feeds/rss/world.xml" },
  { name: "AP News",    url: "https://rsshub.app/apnews/topics/apf-topnews" },
];

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Article {
  id:          string;
  title:       string;
  description: string;
  url:         string;
  source:      string;
  publishedAt: Date;
}

interface ProcessedStory extends Article {
  hook:      string;
  narration: string;
  audioPath: string;
  videoPath: string | null;
  imagePath: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGGER
// ─────────────────────────────────────────────────────────────────────────────

const ts  = () => new Date().toISOString().substring(11, 19);
const log = {
  info:  (m: string) => console.log(`[${ts()}] ℹ️  ${m}`),
  ok:    (m: string) => console.log(`[${ts()}] ✅ ${m}`),
  warn:  (m: string) => console.warn(`[${ts()}] ⚠️  ${m}`),
  error: (m: string) => console.error(`[${ts()}] ❌ ${m}`),
  step:  (n: number|string, m: string) => console.log(`\n[${ts()}] ━━━ STEP ${n}: ${m} ━━━`),
};

// ─────────────────────────────────────────────────────────────────────────────
// SETUP DIRS
// ─────────────────────────────────────────────────────────────────────────────

[CFG.outputDir, CFG.tmpDir, CFG.videoDir, CFG.audioDir, CFG.mediaDir]
  .forEach(d => fs.mkdirSync(d, { recursive: true }));

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// FIX 1: -loglevel error suppresses FFmpeg's frame-by-frame progress output,
// which was the root cause of the ENOBUFS crash. maxBuffer is a safety net.
function ff(cmd: string): void {
  execSync(`ffmpeg -loglevel error ${cmd}`, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    timeout: CFG.ffmpegTimeoutMs,
    maxBuffer: CFG.ffmpegMaxBuffer,
  });
}

function probeDuration(filePath: string): number {
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration \
-of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      {
        encoding: "utf8",
        stdio: ["pipe","pipe","pipe"],
        timeout: 15_000,
        maxBuffer: CFG.ffmpegMaxBuffer,
      }
    ).trim();
    return parseFloat(out) || 0;
  } catch { return 0; }
}

function hasAudioStream(filePath: string): boolean {
  try {
    const out = execSync(
      `ffprobe -v error -select_streams a \
-show_entries stream=codec_type \
-of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      {
        encoding: "utf8",
        stdio: ["pipe","pipe","pipe"],
        timeout: 10_000,
        maxBuffer: CFG.ffmpegMaxBuffer,
      }
    ).trim();
    return out.includes("audio");
  } catch { return false; }
}

// FIX 5: Truncate at a word boundary and append ellipsis rather than cutting mid-word
function safeText(text: string, maxLen = 60): string {
  const escaped = text
    .replace(/'/g, "\u2019")
    .replace(/\\/g, "")
    .replace(/:/g, "\\:")
    .replace(/\[/g, "\\[").replace(/\]/g, "\\]")
    .replace(/,/g, "\\,")
    .replace(/"/g, '\\"')
    .replace(/%/g, "\\%");

  if (escaped.length <= maxLen) return escaped;

  // Trim to last space before the limit so we don't cut mid-word
  const trimmed = escaped.substring(0, maxLen);
  const lastSpace = trimmed.lastIndexOf(" ");
  return (lastSpace > maxLen * 0.6 ? trimmed.substring(0, lastSpace) : trimmed) + "...";
}

// FIX 4: Log a warning if no valid font path found
function fontPath(bold = false): string {
  const candidates = bold
    ? [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
      ]
    : [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
      ];
  const found = candidates.find(p => fs.existsSync(p));
  if (!found) {
    log.warn(`No system font found — FFmpeg text rendering may fail. Tried: ${candidates.join(", ")}`);
    return candidates[0];
  }
  return found;
}

function isAfrican(text: string): boolean {
  const lower = text.toLowerCase();
  for (const term of AFRICA_TERMS) {
    if (term.includes(" ")) {
      if (lower.includes(term)) return true;
    } else {
      if (new RegExp(`\\b${term}\\b`).test(lower)) return true;
    }
  }
  return false;
}

function extractKeywords(title: string): string {
  const stop = new Set([
    "the","a","an","and","or","but","in","on","at","to","for","of","with",
    "by","from","is","are","was","were","be","has","have","will","says","said",
    "breaking","news","just","report","amid","after","before","over","new",
    "that","this","their","they","what","when","where","into","than","more",
  ]);
  return title
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 3 && !stop.has(w))
    .slice(0, 3)
    .join(" ");
}

async function downloadFile(url: string, dest: string): Promise<boolean> {
  try {
    const r = await axios({
      url, method: "GET", responseType: "stream", timeout: 60_000,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BreakingNewsAI/4.0)" },
    });
    await streamPipeline(r.data, fs.createWriteStream(dest));
    return fs.existsSync(dest) && fs.statSync(dest).size > 10_000;
  } catch { return false; }
}

function slugId(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, "-").substring(0, 28)
    + "-" + Date.now().toString(36);
}

async function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — SCRAPE RSS
// ─────────────────────────────────────────────────────────────────────────────

async function scrapeRSS(): Promise<Article[]> {
  log.step(1, "Scraping RSS feeds");
  const articles: Article[] = [];
  const seen = new Set<string>();

  for (const feed of RSS_FEEDS) {
    log.info(`Fetching ${feed.name}...`);
    try {
      const res = await axios.get(feed.url, {
        timeout: 20_000,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; BreakingNewsAI/4.0)" },
      });
      const parsed = await parseStringPromise(res.data, { explicitArray: false });
      const items: any[] =
        parsed?.rss?.channel?.item ||
        parsed?.["rdf:RDF"]?.item  || [];
      const itemList = Array.isArray(items) ? items : [items];
      let added = 0;

      for (const item of itemList) {
        const title       = (item.title?._ || item.title || "").trim();
        const description = (item.description?._ || item.description || "").trim();
        const url         = (item.link?._ || item.link || item.guid?._ || item.guid || "").trim();
        const pubDate     = item.pubDate || item["dc:date"] || new Date().toISOString();

        if (!title || !url || seen.has(url)) continue;
        if (isAfrican(`${title} ${description}`)) {
          log.warn(`Filtered (Africa): ${title.substring(0, 60)}`);
          continue;
        }
        seen.add(url);
        articles.push({
          id: slugId(title),
          title,
          description: description.replace(/<[^>]+>/g, "").substring(0, 500),
          url,
          source: feed.name,
          publishedAt: new Date(pubDate),
        });
        added++;
      }
      log.ok(`${feed.name}: ${added} stories`);
    } catch (err: any) {
      log.error(`${feed.name} failed: ${err.message.substring(0, 80)}`);
    }
  }

  articles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  log.ok(`Total articles after filter: ${articles.length}`);
  return articles;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — GENERATE NARRATION (Mistral AI with retry)
// ─────────────────────────────────────────────────────────────────────────────

async function generateNarration(article: Article): Promise<{ hook: string; narration: string }> {
  const fallback = {
    hook:      article.title,
    narration: `${article.title}. ${article.description.substring(0, 500)}`,
  };
  if (!CFG.mistralKey) return fallback;

  const prompt = `You are a professional female TV news anchor for Breaking News AI.
Write a broadcast narration for this story.
Target: 50-60 seconds when read aloud (approximately 130-150 words).
Tone: authoritative, clear, professional news anchor.

Return ONLY a JSON object — no markdown, no extra text:
{"hook":"Single punchy opening sentence under 20 words","narration":"Full 130-150 word broadcast script in natural spoken English"}

Story title: ${article.title}
Summary: ${article.description.substring(0, 400)}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await axios.post(
        "https://api.mistral.ai/v1/chat/completions",
        {
          model: "mistral-small-latest",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.4,
          max_tokens: 500,
        },
        {
          headers: {
            Authorization: `Bearer ${CFG.mistralKey}`,
            "Content-Type": "application/json",
          },
          timeout: 45_000,
        }
      );
      const content = res.data.choices[0]?.message?.content || "";
      const clean   = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const match   = clean.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON in response");
      const parsed = JSON.parse(match[0]);
      if (!parsed.hook || !parsed.narration) throw new Error("Missing fields");
      log.ok(`Mistral: "${article.title.substring(0, 45)}"`);
      return { hook: parsed.hook, narration: parsed.narration };
    } catch (err: any) {
      log.warn(`Mistral attempt ${attempt}/3: ${err.message.substring(0, 60)}`);
      if (attempt < 3) await sleep(2000 * attempt);
    }
  }
  return fallback;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — TTS AUDIO (Azure Jenny → edge-tts Jenny)
// ─────────────────────────────────────────────────────────────────────────────

async function generateTTS(text: string, outputPath: string): Promise<void> {
  const clean = text.replace(/[<>&"]/g, " ").replace(/\s+/g, " ").trim().substring(0, 3000);

  if (CFG.azureKey) {
    try {
      const ssml = `<speak version='1.0' xml:lang='en-US'><voice name='${CFG.azureVoice}'><prosody rate='-5%'>${clean}</prosody></voice></speak>`;
      const r = await axios({
        method: "post",
        url: `https://${CFG.azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
        data: ssml,
        headers: {
          "Ocp-Apim-Subscription-Key": CFG.azureKey,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-24khz-160kbitrate-mono-mp3",
        },
        responseType: "stream",
        timeout: 30_000,
      });
      if (r.status >= 200 && r.status < 300) {
        const w = fs.createWriteStream(outputPath);
        r.data.pipe(w);
        await new Promise<void>((res, rej) => { w.on("finish", res); w.on("error", rej); });
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 500) {
          log.ok(`Azure TTS (Jenny): ${path.basename(outputPath)}`);
          return;
        }
      }
    } catch (err: any) {
      log.warn(`Azure TTS failed: ${err.message.substring(0, 60)}`);
    }
  }

  // FIX 8: Suppress edge-tts output via stdio
  try {
    execFileSync("edge-tts",
      ["--voice", CFG.edgeTtsVoice, "--text", clean, "--write-media", outputPath],
      { timeout: 90_000, stdio: ["pipe", "pipe", "pipe"] }
    );
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 500) {
      log.ok(`edge-tts (Jenny): ${path.basename(outputPath)}`);
      return;
    }
  } catch (err: any) {
    log.warn(`edge-tts failed: ${err.message.substring(0, 60)}`);
  }

  log.warn("Both TTS engines failed — silence fallback");
  ff(`-y -f lavfi -i anullsrc=r=${CFG.sampleRate}:cl=stereo -t 60 -c:a aac -b:a 128k "${outputPath}"`);
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 — FETCH STOCK MEDIA
// ─────────────────────────────────────────────────────────────────────────────

async function fetchStockVideo(title: string, storyId: string): Promise<string | null> {
  const keywords = extractKeywords(title);
  const destPath = path.join(CFG.mediaDir, `${storyId}_vid.mp4`);

  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 50_000) {
    return destPath;
  }

  if (CFG.pexelsKey) {
    const queries = [keywords, keywords.split(" ").slice(0, 2).join(" "), "world news city"];
    for (const q of queries) {
      try {
        const res = await axios.get("https://api.pexels.com/videos/search", {
          headers: { Authorization: CFG.pexelsKey },
          params: { query: q, per_page: 8, orientation: "landscape" },
          timeout: 15_000,
        });
        const videos = res.data.videos || [];
        if (videos.length > 0) {
          const pick  = videos[Math.floor(Math.random() * Math.min(3, videos.length))];
          const files = pick.video_files || [];
          const file  = files.find((f: any) => f.quality === "hd" && f.width <= 1920) ||
                        files.find((f: any) => f.quality === "sd") ||
                        files[0];
          if (file?.link) {
            const ok = await downloadFile(file.link, destPath);
            if (ok) { log.ok(`Pexels video: "${q}"`); return destPath; }
          }
        }
      } catch (err: any) {
        log.warn(`Pexels failed "${q}": ${err.message.substring(0, 50)}`);
      }
    }
  }

  if (CFG.pixabayKey) {
    try {
      const res = await axios.get("https://pixabay.com/api/videos/", {
        params: { key: CFG.pixabayKey, q: keywords, per_page: 5 },
        timeout: 15_000,
      });
      const hits = res.data.hits || [];
      if (hits.length > 0) {
        const url = hits[0].videos?.medium?.url || hits[0].videos?.small?.url;
        if (url) {
          const ok = await downloadFile(url, destPath);
          if (ok) { log.ok(`Pixabay video: "${keywords}"`); return destPath; }
        }
      }
    } catch {}
  }

  try {
    const res = await axios.get("https://archive.org/advancedsearch.php", {
      params: { q: `${keywords} news`, fl: "identifier", rows: 5, output: "json", mediatype: "movies" },
      timeout: 15_000,
    });
    for (const doc of (res.data?.response?.docs || [])) {
      try {
        const meta = await axios.get(`https://archive.org/metadata/${doc.identifier}`, { timeout: 10_000 });
        const mp4  = (meta.data.files || []).find((f: any) =>
          f.name?.endsWith(".mp4") && parseInt(f.size || "0") < 50_000_000
        );
        if (mp4) {
          const ok = await downloadFile(
            `https://archive.org/download/${doc.identifier}/${mp4.name}`, destPath
          );
          if (ok) { log.ok(`Archive.org: "${keywords}"`); return destPath; }
        }
      } catch {}
    }
  } catch {}

  log.warn(`No stock video found for: "${keywords}"`);
  return null;
}

async function fetchStockImage(title: string, storyId: string): Promise<string | null> {
  if (!CFG.pexelsKey) return null;
  const keywords = extractKeywords(title);
  const destPath = path.join(CFG.mediaDir, `${storyId}_img.jpg`);
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 10_000) return destPath;

  try {
    const res = await axios.get("https://api.pexels.com/v1/search", {
      headers: { Authorization: CFG.pexelsKey },
      params: { query: keywords, per_page: 5, orientation: "landscape" },
      timeout: 10_000,
    });
    const photos = res.data.photos || [];
    if (photos.length > 0) {
      const url = photos[0].src?.large2x || photos[0].src?.large;
      if (url) {
        const ok = await downloadFile(url, destPath);
        if (ok) { log.ok(`Pexels image: "${keywords}"`); return destPath; }
      }
    }
  } catch {}
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5 — BUILD VIDEO SEGMENTS
// ─────────────────────────────────────────────────────────────────────────────

function buildIntro(outputPath: string): void {
  if (fs.existsSync(outputPath)) return;
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const fb = fontPath(true);
  const fn = fontPath(false);

  ff(`-y \
-f lavfi -i "color=c=${CFG.darkBg}:size=${CFG.W}x${CFG.H}:rate=${CFG.fps}" \
-f lavfi -i anullsrc=r=${CFG.sampleRate}:cl=stereo \
-vf "\
drawtext=text='BREAKING':fontcolor=${CFG.primaryRed}:fontsize=130:\
x=(w-text_w)/2:y=h*0.22:fontfile='${fb}',\
drawtext=text='NEWS AI':fontcolor=white:fontsize=130:\
x=(w-text_w)/2:y=h*0.38:fontfile='${fb}',\
drawtext=text='Your world. Right now.':fontcolor=0xcccccc:fontsize=48:\
x=(w-text_w)/2:y=h*0.62:fontfile='${fn}',\
drawtext=text='${safeText(date, 50)}':fontcolor=0x777777:fontsize=30:\
x=(w-text_w)/2:y=h*0.74:fontfile='${fn}',\
drawbox=x=0:y=h-8:w=iw:h=8:color=${CFG.primaryRed}:t=fill,\
fade=t=in:st=0:d=1.5,fade=t=out:st=13:d=2" \
-t 15 \
-c:v libx264 -preset ${CFG.preset} -crf ${CFG.crf} \
-c:a aac -b:a 128k \
-map 0:v -map 1:a \
-pix_fmt yuv420p "${outputPath}"`);
  log.ok("Intro built");
}

function buildOutro(outputPath: string): void {
  if (fs.existsSync(outputPath)) return;
  const fb = fontPath(true);
  const fn = fontPath(false);
  ff(`-y \
-f lavfi -i "color=c=${CFG.darkBg}:size=${CFG.W}x${CFG.H}:rate=${CFG.fps}" \
-f lavfi -i anullsrc=r=${CFG.sampleRate}:cl=stereo \
-vf "\
drawtext=text='Thank you for watching':fontcolor=white:fontsize=62:\
x=(w-text_w)/2:y=h*0.28:fontfile='${fb}',\
drawtext=text='BREAKING NEWS AI':fontcolor=${CFG.primaryRed}:fontsize=90:\
x=(w-text_w)/2:y=h*0.44:fontfile='${fb}',\
drawtext=text='New broadcast every 4 hours':fontcolor=0x999999:fontsize=36:\
x=(w-text_w)/2:y=h*0.64:fontfile='${fn}',\
drawtext=text='Subscribe and tap the bell':fontcolor=0x666666:fontsize=28:\
x=(w-text_w)/2:y=h*0.74:fontfile='${fn}',\
drawbox=x=0:y=h-8:w=iw:h=8:color=${CFG.primaryRed}:t=fill,\
fade=t=in:st=0:d=2,fade=t=out:st=13:d=2" \
-t 15 \
-c:v libx264 -preset ${CFG.preset} -crf ${CFG.crf} \
-c:a aac -b:a 128k \
-map 0:v -map 1:a \
-pix_fmt yuv420p "${outputPath}"`);
  log.ok("Outro built");
}

function buildTransition(outputPath: string): void {
  if (fs.existsSync(outputPath)) return;
  ff(`-y \
-f lavfi -i "color=c=black:size=${CFG.W}x${CFG.H}:rate=${CFG.fps}" \
-f lavfi -i anullsrc=r=${CFG.sampleRate}:cl=stereo \
-vf "fade=t=in:st=0:d=0.5,fade=t=out:st=1.5:d=0.5" \
-t 2 \
-c:v libx264 -preset ${CFG.preset} \
-c:a aac -b:a 128k \
-map 0:v -map 1:a \
-pix_fmt yuv420p "${outputPath}"`);
}

// FIX 7: Added -r ${CFG.fps} to the -loop 1 still-image input to force
// constant frame rate and prevent VFR issues in the final concat.
async function buildNarrationCard(
  audioPath: string,
  title:     string,
  storyNum:  number,
  source:    string,
  outputPath: string,
  imagePath: string | null
): Promise<void> {
  const dur = probeDuration(audioPath) + 0.3;
  const fb  = fontPath(true);
  const fn  = fontPath(false);

  const overlayFilters = [
    `scale=${CFG.W}:${CFG.H}:force_original_aspect_ratio=increase`,
    `crop=${CFG.W}:${CFG.H}`,
    `drawbox=x=0:y=0:w=iw:h=ih:color=black@0.60:t=fill`,
    `drawbox=x=0:y=h-180:w=iw:h=180:color=black@0.92:t=fill`,
    `drawbox=x=0:y=h-180:w=12:h=180:color=${CFG.primaryRed}:t=fill`,
    `drawbox=x=60:y=50:w=220:h=65:color=${CFG.primaryRed}:t=fill`,
    `drawtext=text='STORY ${storyNum}':fontcolor=white:fontsize=32:x=70:y=62:fontfile='${fb}'`,
    `drawtext=text='${safeText(title, 55)}':fontcolor=white:fontsize=54:x=60:y=h*0.42:fontfile='${fb}'`,
    `drawtext=text='${safeText(source, 40)}':fontcolor=0xaaaaaa:fontsize=28:x=25:y=h-148:fontfile='${fn}'`,
    `fade=t=in:st=0:d=0.5`,
  ].join(",");

  const darkFilters = [
    `drawbox=x=0:y=0:w=iw:h=ih/3:color=0x1a1a2e@0.8:t=fill`,
    `drawbox=x=0:y=h-180:w=iw:h=180:color=${CFG.darkBg}@0.95:t=fill`,
    `drawbox=x=0:y=h-180:w=12:h=180:color=${CFG.primaryRed}:t=fill`,
    `drawbox=x=60:y=50:w=220:h=65:color=${CFG.primaryRed}:t=fill`,
    `drawtext=text='STORY ${storyNum}':fontcolor=white:fontsize=32:x=70:y=62:fontfile='${fb}'`,
    `drawtext=text='${safeText(title, 55)}':fontcolor=white:fontsize=54:x=60:y=h*0.42:fontfile='${fb}'`,
    `drawtext=text='${safeText(source, 40)}':fontcolor=0xaaaaaa:fontsize=28:x=25:y=h-148:fontfile='${fn}'`,
    `fade=t=in:st=0:d=0.5`,
  ].join(",");

  if (imagePath && fs.existsSync(imagePath)) {
    ff(`-y \
-r ${CFG.fps} -loop 1 -i "${imagePath}" \
-i "${audioPath}" \
-vf "${overlayFilters}" \
-t ${dur} \
-c:v libx264 -preset ${CFG.preset} -crf ${CFG.crf} \
-c:a aac -b:a ${CFG.audioBitrate} \
-map 0:v -map 1:a \
-shortest \
-pix_fmt yuv420p "${outputPath}"`);
  } else {
    ff(`-y \
-f lavfi -i "color=c=0x111118:size=${CFG.W}x${CFG.H}:rate=${CFG.fps}" \
-i "${audioPath}" \
-vf "${darkFilters}" \
-t ${dur} \
-c:v libx264 -preset ${CFG.preset} -crf ${CFG.crf} \
-c:a aac -b:a ${CFG.audioBitrate} \
-map 0:v -map 1:a \
-shortest \
-pix_fmt yuv420p "${outputPath}"`);
  }
}

// FIX 3: Removed the dead if/else — both branches were identical.
// We always add a silent audio track because we only want the visuals
// from the stock footage (no background music from random Pexels clips).
async function buildStockClipSegment(
  videoPath:      string,
  title:          string,
  source:         string,
  targetDuration: number,
  outputPath:     string
): Promise<void> {
  const clipDur = probeDuration(videoPath);
  if (clipDur < 1) { log.warn("Clip too short — skipping"); return; }

  const fb = fontPath(true);
  const fn = fontPath(false);

  const lowerThird = [
    `scale=${CFG.W}:${CFG.H}:force_original_aspect_ratio=decrease`,
    `pad=${CFG.W}:${CFG.H}:(ow-iw)/2:(oh-ih)/2:black`,
    `drawbox=x=0:y=h-160:w=iw:h=160:color=${CFG.darkBg}@0.88:t=fill`,
    `drawbox=x=0:y=h-160:w=12:h=160:color=${CFG.primaryRed}:t=fill`,
    `drawtext=text='BREAKING NEWS AI':fontcolor=${CFG.primaryRed}:fontsize=24:x=24:y=h-148:fontfile='${fb}'`,
    `drawtext=text='${safeText(title, 55)}':fontcolor=white:fontsize=42:x=24:y=h-110:fontfile='${fb}'`,
    `drawtext=text='Source\\: ${safeText(source, 40)}':fontcolor=0xaaaaaa:fontsize=24:x=24:y=h-54:fontfile='${fn}'`,
  ].join(",");

  const loopFlag = clipDur < targetDuration ? "-stream_loop -1" : "";

  // Always replace the footage audio with a silent track — we never want
  // random background audio from stock clips in the broadcast
  ff(`-y ${loopFlag} \
-i "${videoPath}" \
-f lavfi -i anullsrc=r=${CFG.sampleRate}:cl=stereo \
-vf "${lowerThird}" \
-t ${targetDuration} \
-c:v libx264 -preset ${CFG.preset} -crf ${CFG.crf} \
-c:a aac -b:a ${CFG.audioBitrate} \
-map 0:v -map 1:a \
-pix_fmt yuv420p "${outputPath}"`);
}

async function buildImageSegment(
  imagePath:      string,
  title:          string,
  source:         string,
  targetDuration: number,
  outputPath:     string
): Promise<void> {
  const fb = fontPath(true);
  const fn = fontPath(false);
  ff(`-y \
-r ${CFG.fps} -loop 1 -i "${imagePath}" \
-f lavfi -i anullsrc=r=${CFG.sampleRate}:cl=stereo \
-vf "\
scale=${CFG.W}:${CFG.H}:force_original_aspect_ratio=increase,\
crop=${CFG.W}:${CFG.H},\
drawbox=x=0:y=h-160:w=iw:h=160:color=black@0.88:t=fill,\
drawbox=x=0:y=h-160:w=12:h=160:color=${CFG.primaryRed}:t=fill,\
drawtext=text='BREAKING NEWS AI':fontcolor=${CFG.primaryRed}:fontsize=24:x=24:y=h-148:fontfile='${fb}',\
drawtext=text='${safeText(title, 55)}':fontcolor=white:fontsize=42:x=24:y=h-110:fontfile='${fb}',\
drawtext=text='${safeText(source, 40)}':fontcolor=0xaaaaaa:fontsize=24:x=24:y=h-54:fontfile='${fn}'" \
-t ${targetDuration} \
-c:v libx264 -preset ${CFG.preset} -crf ${CFG.crf} \
-c:a aac -b:a ${CFG.audioBitrate} \
-map 0:v -map 1:a \
-pix_fmt yuv420p "${outputPath}"`);
}

function buildBackgroundCard(
  title:          string,
  source:         string,
  targetDuration: number,
  outputPath:     string
): void {
  const fb = fontPath(true);
  const fn = fontPath(false);
  ff(`-y \
-f lavfi -i "color=c=0x111118:size=${CFG.W}x${CFG.H}:rate=${CFG.fps}" \
-f lavfi -i anullsrc=r=${CFG.sampleRate}:cl=stereo \
-vf "\
drawbox=x=0:y=h-160:w=iw:h=160:color=${CFG.darkBg}@0.92:t=fill,\
drawbox=x=0:y=h-160:w=12:h=160:color=${CFG.primaryRed}:t=fill,\
drawtext=text='BREAKING NEWS AI':fontcolor=${CFG.primaryRed}:fontsize=24:x=24:y=h-148:fontfile='${fb}',\
drawtext=text='${safeText(title, 55)}':fontcolor=white:fontsize=42:x=24:y=h-110:fontfile='${fb}',\
drawtext=text='${safeText(source, 40)}':fontcolor=0xaaaaaa:fontsize=24:x=24:y=h-54:fontfile='${fn}'" \
-t ${targetDuration} \
-c:v libx264 -preset ${CFG.preset} -crf ${CFG.crf} \
-c:a aac -b:a ${CFG.audioBitrate} \
-map 0:v -map 1:a \
-pix_fmt yuv420p "${outputPath}"`);
}

async function buildStorySegment(
  story:    ProcessedStory,
  storyNum: number
): Promise<string | null> {
  const segPath = path.join(CFG.tmpDir, `seg_${storyNum}_${story.id}.mp4`);

  // FIX 6: probeDuration called once and result reused
  const cachedDur = probeDuration(segPath);
  if (fs.existsSync(segPath) && cachedDur > 30) {
    log.ok(`Story ${storyNum} cached (${cachedDur.toFixed(0)}s)`);
    return segPath;
  }

  try {
    const narrPath = path.join(CFG.tmpDir, `narr_${story.id}.mp4`);
    log.info(`Story ${storyNum}: Building narration card...`);
    await buildNarrationCard(
      story.audioPath, story.title, storyNum, story.source, narrPath, story.imagePath
    );
    const narrDur   = probeDuration(narrPath);
    const remainDur = Math.max(60, CFG.segmentDurationS - narrDur);

    const parts: string[] = [narrPath];

    const visualPath = path.join(CFG.tmpDir, `vis_${story.id}.mp4`);

    if (story.videoPath && fs.existsSync(story.videoPath)) {
      log.info(`Story ${storyNum}: Building stock footage segment (${remainDur.toFixed(0)}s)...`);
      await buildStockClipSegment(
        story.videoPath, story.title, story.source, remainDur, visualPath
      );
    } else if (story.imagePath && fs.existsSync(story.imagePath)) {
      log.info(`Story ${storyNum}: Building image slideshow (${remainDur.toFixed(0)}s)...`);
      await buildImageSegment(
        story.imagePath, story.title, story.source, remainDur, visualPath
      );
    } else {
      log.warn(`Story ${storyNum}: No media — using background card`);
      buildBackgroundCard(story.title, story.source, remainDur, visualPath);
    }

    if (fs.existsSync(visualPath) && probeDuration(visualPath) > 5) {
      parts.push(visualPath);
    }

    if (parts.length === 1) {
      fs.copyFileSync(parts[0], segPath);
    } else {
      const listPath = path.join(CFG.tmpDir, `lst_${story.id}.txt`);
      fs.writeFileSync(listPath, parts.map(p => `file '${p}'`).join("\n"));
      ff(`-y -f concat -safe 0 -i "${listPath}" -c copy "${segPath}"`);
      try { fs.unlinkSync(listPath); } catch {}
    }

    const dur = probeDuration(segPath);
    log.ok(`Story ${storyNum} done (${dur.toFixed(0)}s): ${story.title.substring(0, 55)}`);
    return segPath;

  } catch (err: any) {
    log.error(`Story ${storyNum} failed: ${err.message.substring(0, 120)}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 6 — COMPILE FINAL VIDEO
// ─────────────────────────────────────────────────────────────────────────────

async function compileFinalVideo(segments: string[]): Promise<string> {
  log.step(6, "Compiling final video");

  const introPath = path.join(CFG.tmpDir, "intro.mp4");
  const outroPath = path.join(CFG.tmpDir, "outro.mp4");
  buildIntro(introPath);
  buildOutro(outroPath);

  const allParts: string[] = [introPath];
  for (let i = 0; i < segments.length; i++) {
    allParts.push(segments[i]);
    if (i < segments.length - 1) {
      const transPath = path.join(CFG.tmpDir, `trans_${i}.mp4`);
      buildTransition(transPath);
      allParts.push(transPath);
    }
  }
  allParts.push(outroPath);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);
  const finalPath = path.join(CFG.videoDir, `breaking-news-${timestamp}.mp4`);
  const listPath  = path.join(CFG.tmpDir, "final_list.txt");

  fs.writeFileSync(listPath, allParts.map(p => `file '${p}'`).join("\n"));
  log.info(`Concatenating ${allParts.length} parts...`);

  // FIX 1: -loglevel error in ff() prevents FFmpeg's per-frame output from
  // overflowing the buffer during this large concat operation
  ff(`-y -f concat -safe 0 -i "${listPath}" -c copy -movflags +faststart "${finalPath}"`);
  try { fs.unlinkSync(listPath); } catch {}

  if (!fs.existsSync(finalPath)) throw new Error("Final video not created");

  const sizeMB  = (fs.statSync(finalPath).size / 1024 / 1024).toFixed(1);
  const minutes = (probeDuration(finalPath) / 60).toFixed(1);
  log.ok(`Final video: ${path.basename(finalPath)} (${sizeMB} MB, ${minutes} min)`);
  return finalPath;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 7 — UPLOAD TO YOUTUBE
// ─────────────────────────────────────────────────────────────────────────────

async function uploadToYouTube(videoPath: string, stories: ProcessedStory[]): Promise<void> {
  if (!CFG.ytClientId || !CFG.ytRefreshToken) {
    log.warn("YouTube credentials missing — video saved locally");
    return;
  }

  const oauth2 = new google.auth.OAuth2(CFG.ytClientId, CFG.ytClientSecret, CFG.ytRedirectUri);
  oauth2.setCredentials({ refresh_token: CFG.ytRefreshToken });
  const yt = google.youtube({ version: "v3", auth: oauth2 });

  const dateStr   = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  const shortDate = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const title     = `🔴 BREAKING NEWS | Top ${stories.length} Stories | ${shortDate}`;

  const storiesList = stories
    .map((s, i) => `${i + 1}. ${s.title}\n   📰 ${s.source}`)
    .join("\n\n");

  const description = [
    `🌍 Breaking News AI — Your world, right now.`,
    `📺 ${dateStr}`, ``,
    `📋 STORIES IN THIS BROADCAST:`, ``, storiesList, ``,
    `─────────────────────────────────`,
    `AI-powered international news. Sources: BBC, DW, France 24, Al Jazeera, NPR, ABC News, Sky News.`,
    `Stock footage: Pexels, Pixabay (licensed). Narration: AI-generated (Jenny Neural).`,
    `🔔 Subscribe for 4 broadcasts daily.`, ``,
    `#BreakingNews #WorldNews #AINews #InternationalNews #NewsToday`,
  ].join("\n");

  log.info(`Uploading: ${title}`);
  const resp = await yt.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: title.substring(0, 100),
        description: description.substring(0, 5000),
        tags: ["breaking news","world news","AI news","international news","news today"],
        categoryId: "25",
        defaultLanguage: "en",
      },
      status: { privacyStatus: "public", selfDeclaredMadeForKids: false, madeForKids: false },
    },
    media: { mimeType: "video/mp4", body: createReadStream(videoPath) },
  });
  log.ok(`YouTube live: https://youtu.be/${resp.data.id}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const t0 = Date.now();
  log.step(0, "BREAKING NEWS AI v4 — PIPELINE START");

  if (!CFG.mistralKey) log.warn("MISTRAL_API_KEY missing — raw article text narration");
  if (!CFG.pexelsKey)  log.warn("PEXELS_API_KEY missing — Pixabay/Archive fallback only");
  if (!CFG.azureKey)   log.warn("AZURE_SPEECH_KEY missing — edge-tts fallback");

  const articles = await scrapeRSS();
  if (articles.length < CFG.minStories) {
    log.error(`Only ${articles.length} articles. Need ${CFG.minStories}. Aborting.`);
    process.exit(1);
  }
  const selected = articles.slice(0, CFG.maxStories);
  log.ok(`Selected ${selected.length} stories`);

  log.step("2-4", "Narration, TTS, and footage for each story");
  const processedStories: ProcessedStory[] = [];

  for (let i = 0; i < selected.length; i++) {
    const article  = selected[i];
    const storyNum = i + 1;
    log.info(`Story ${storyNum}/${selected.length}: ${article.title.substring(0, 65)}`);

    const { hook, narration } = await generateNarration(article);

    const audioPath = path.join(CFG.audioDir, `${article.id}.mp3`);
    if (!fs.existsSync(audioPath)) {
      await generateTTS(narration, audioPath);
    } else {
      log.info(`Audio cached: ${path.basename(audioPath)}`);
    }

    const videoPath = await fetchStockVideo(article.title, article.id);
    const imagePath = await fetchStockImage(article.title, article.id);

    processedStories.push({ ...article, hook, narration, audioPath, videoPath, imagePath });
  }

  log.step(5, "Rendering story segments");
  const segments: string[] = [];
  for (let i = 0; i < processedStories.length; i++) {
    const seg = await buildStorySegment(processedStories[i], i + 1);
    if (seg) segments.push(seg);
    else     log.warn(`Story ${i + 1} skipped`);
  }

  if (segments.length < CFG.minStories) {
    log.error(`Only ${segments.length} segments. Aborting.`);
    process.exit(1);
  }

  const finalVideo = await compileFinalVideo(segments);

  log.step(7, "Uploading to YouTube");
  await uploadToYouTube(finalVideo, processedStories);

  try {
    fs.readdirSync(CFG.tmpDir).forEach(f => {
      try { fs.unlinkSync(path.join(CFG.tmpDir, f)); } catch {}
    });
  } catch {}

  const elapsed = ((Date.now() - t0) / 1000 / 60).toFixed(1);
  log.step(0, `PIPELINE COMPLETE in ${elapsed} minutes`);
  log.ok(`Video: ${finalVideo}`);
}

main().catch(err => {
  console.error(`\n💥 FATAL: ${err.message}`);
  process.exit(1);
});
