import "dotenv/config";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { prisma } from "../../utils/prisma";
import { generateTTS } from "../tts";

const OUTPUT_DIR = path.resolve(process.cwd(), "output", "videos");
const TMP_DIR    = path.resolve(process.cwd(), "output", "tmp");
const AUDIO_DIR  = path.resolve(process.cwd(), "output", "audio");
const W = 1920, H = 1080;
const FF = "ffmpeg";
const MAX_STORIES = 10;
const MIN_STORIES = 6;

[OUTPUT_DIR, TMP_DIR, AUDIO_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

function exec(cmd: string): string {
  return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function font(bold = false): string {
  return bold
    ? "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    : "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
}

function safeText(text: string): string {
  return text
    .replace(/'/g, "\u2019")
    .replace(/\\/g, "")
    .replace(/:/g, "\\:")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/,/g, "\\,")
    .replace(/"/g, '\\"')
    .replace(/%/g, "\\%")
    .substring(0, 65);
}

function getMediaDuration(filePath: string): number {
  try {
    const out = exec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`);
    return parseFloat(out) || 60;
  } catch { return 60; }
}

async function buildIntro(outputPath: string): Promise<void> {
  if (fs.existsSync(outputPath)) return;
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  exec(`${FF} -y \
-f lavfi -i "color=c=0x0d0d0d:size=${W}x${H}:rate=25" \
-vf "drawtext=text='BREAKING NEWS AI':fontcolor=0xff2222:fontsize=108:x=(w-text_w)/2:y=h*0.28:fontfile='${font(true)}', \
drawtext=text='Your world. Right now.':fontcolor=white:fontsize=46:x=(w-text_w)/2:y=h*0.50:fontfile='${font()}', \
drawtext=text='${safeText(date)}':fontcolor=0x888888:fontsize=30:x=(w-text_w)/2:y=h*0.64:fontfile='${font()}', \
fade=t=in:st=0:d=1.5,fade=t=out:st=13:d=2" \
-t 15 -c:v libx264 -preset ultrafast -pix_fmt yuv420p "${outputPath}"`);
}

async function buildOutro(outputPath: string): Promise<void> {
  if (fs.existsSync(outputPath)) return;
  exec(`${FF} -y \
-f lavfi -i "color=c=0x0d0d0d:size=${W}x${H}:rate=25" \
-vf "drawtext=text='Thank you for watching':fontcolor=white:fontsize=58:x=(w-text_w)/2:y=h*0.33:fontfile='${font(true)}', \
drawtext=text='BREAKING NEWS AI':fontcolor=0xff2222:fontsize=74:x=(w-text_w)/2:y=h*0.48:fontfile='${font(true)}', \
drawtext=text='Subscribe for updates every 4 hours':fontcolor=0x999999:fontsize=34:x=(w-text_w)/2:y=h*0.65:fontfile='${font()}', \
fade=t=in:st=0:d=2,fade=t=out:st=13:d=2" \
-t 15 -c:v libx264 -preset ultrafast -pix_fmt yuv420p "${outputPath}"`);
}

async function buildTransition(outputPath: string): Promise<void> {
  if (fs.existsSync(outputPath)) return;
  exec(`${FF} -y \
-f lavfi -i "color=c=black:size=${W}x${H}:rate=25" \
-vf "fade=t=in:st=0:d=0.5,fade=t=out:st=1.5:d=0.5" \
-t 2 -c:v libx264 -preset ultrafast -pix_fmt yuv420p "${outputPath}"`);
}

async function buildNarrationCard(audioPath: string, title: string, source: string, outputPath: string): Promise<void> {
  const duration = getMediaDuration(audioPath) + 0.5;
  exec(`${FF} -y \
-f lavfi -i "color=c=0x0d0d0d:size=${W}x${H}:rate=25" \
-i "${audioPath}" \
-vf "drawbox=x=60:y=h*0.55:w=iw-120:h=3:color=0xff2222:t=fill, \
drawtext=text='NEXT STORY':fontcolor=0xff2222:fontsize=28:x=60:y=h*0.38:fontfile='${font(true)}', \
drawtext=text='${safeText(title)}':fontcolor=white:fontsize=44:x=60:y=h*0.46:fontfile='${font(true)}', \
drawtext=text='${safeText(source)}':fontcolor=0x999999:fontsize=26:x=60:y=h*0.61:fontfile='${font()}', \
fade=t=in:st=0:d=0.5" \
-t ${duration} \
-c:v libx264 -preset fast \
-c:a aac -b:a 192k \
-map 0:v -map 1:a \
-pix_fmt yuv420p "${outputPath}"`);
}

async function brandedClip(clipPath: string, title: string, source: string, outputPath: string): Promise<void> {
  const duration = getMediaDuration(clipPath);
  exec(`${FF} -y \
-i "${clipPath}" \
-vf "scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black, \
drawbox=x=0:y=h-160:w=iw:h=160:color=0x0d0d0d@0.88:t=fill, \
drawbox=x=0:y=h-160:w=10:h=160:color=0xff2222:t=fill, \
drawtext=text='BREAKING NEWS AI':fontcolor=0xff2222:fontsize=22:x=22:y=h-148:fontfile='${font(true)}', \
drawtext=text='${safeText(title)}':fontcolor=white:fontsize=38:x=22:y=h-112:fontfile='${font(true)}', \
drawtext=text='Source\\: ${safeText(source)}':fontcolor=0xaaaaaa:fontsize=24:x=22:y=h-58:fontfile='${font()}'" \
-t ${duration} \
-c:v libx264 -preset fast \
-c:a aac -b:a 192k \
-pix_fmt yuv420p "${outputPath}"`);
}

async function buildOneStory(
  story: { id: string; title: string; hook: string; summary: string; source: string; clipPath: string | null },
  index: number
): Promise<string | null> {
  const segOut = path.join(TMP_DIR, `seg_${index}_${story.id}.mp4`);
  if (fs.existsSync(segOut)) return segOut;

  try {
    // 1. TTS narration
    const narrationText = `${story.hook} ${story.summary}`.trim();
    const audioPath = path.join(AUDIO_DIR, `${story.id}.mp3`);
    if (!fs.existsSync(audioPath)) {
      console.log(`  🎤 Generating narration...`);
      await generateTTS(narrationText, audioPath, index % 2 === 0 ? "male" : "female");
    }

    // 2. Narration title card
    const narrationCardPath = path.join(TMP_DIR, `narr_${story.id}.mp4`);
    console.log(`  🎬 Building narration card...`);
    await buildNarrationCard(audioPath, story.title, story.source, narrationCardPath);

    const parts: string[] = [narrationCardPath];

    // 3. Real clip with branding overlay
    if (story.clipPath && fs.existsSync(story.clipPath)) {
      console.log(`  🎥 Branding real clip...`);
      const brandedPath = path.join(TMP_DIR, `clip_${story.id}.mp4`);
      await brandedClip(story.clipPath, story.title, story.source, brandedPath);
      parts.push(brandedPath);
    }

    // 4. Concat narration + clip
    if (parts.length === 1) {
      fs.copyFileSync(parts[0], segOut);
    } else {
      const listPath = path.join(TMP_DIR, `lst_${story.id}.txt`);
      fs.writeFileSync(listPath, parts.map(p => `file '${p}'`).join("\n"));
      exec(`${FF} -y -f concat -safe 0 -i "${listPath}" -c copy "${segOut}"`);
      try { fs.unlinkSync(listPath); } catch {}
    }

    console.log(`  ✅ Story ${index + 1} done`);
    return segOut;
  } catch (err: any) {
    console.error(`  ❌ Story ${index + 1} failed: ${err.message}`);
    return null;
  }
}

export async function compileNewsVideo(): Promise<string> {
  console.log("\n🎬 Compiling news video...");

  const scripts = await prisma.script.findMany({
    where: { status: "ready" },
    include: { article: { include: { source: true } } },
    orderBy: { article: { publishedAt: "desc" } },
    take: MAX_STORIES,
  });

  if (scripts.length < MIN_STORIES) {
    throw new Error(`Need ${MIN_STORIES} scripts, have ${scripts.length}. Run process-articles first.`);
  }

  console.log(`📋 ${scripts.length} stories ready\n`);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);
  const finalOutput = path.join(OUTPUT_DIR, `breaking-news-${timestamp}.mp4`);
  const allSegments: string[] = [];

  const introPath = path.join(TMP_DIR, "intro.mp4");
  await buildIntro(introPath);
  allSegments.push(introPath);

  for (let i = 0; i < scripts.length; i++) {
    const s = scripts[i];
    console.log(`\n📰 Story ${i + 1}/${scripts.length}: ${s.article.title.substring(0, 65)}...`);
    const seg = await buildOneStory({
      id: s.id,
      title: s.article.title,
      hook: s.hook || "",
      summary: s.summary || s.content.substring(0, 300),
      source: s.article.source?.name || "Breaking News AI",
      clipPath: s.article.content || null,
    }, i);

    if (seg) {
      allSegments.push(seg);
      if (i < scripts.length - 1) {
        const trans = path.join(TMP_DIR, `trans_${i}.mp4`);
        await buildTransition(trans);
        allSegments.push(trans);
      }
    }
  }

  const outroPath = path.join(TMP_DIR, "outro.mp4");
  await buildOutro(outroPath);
  allSegments.push(outroPath);

  const listPath = finalOutput.replace(".mp4", "_list.txt");
  fs.writeFileSync(listPath, allSegments.map(p => `file '${p}'`).join("\n"));
  console.log(`\n🎬 Concatenating ${allSegments.length} segments...`);
  exec(`${FF} -y -f concat -safe 0 -i "${listPath}" -c copy "${finalOutput}"`);
  try { fs.unlinkSync(listPath); } catch {}

  await prisma.script.updateMany({
    where: { id: { in: scripts.map(s => s.id) } },
    data: { status: "completed", filePath: finalOutput },
  });

  try {
    fs.readdirSync(TMP_DIR).forEach(f => {
      try { fs.unlinkSync(path.join(TMP_DIR, f)); } catch {}
    });
  } catch {}

  const sizeMB = (fs.statSync(finalOutput).size / 1024 / 1024).toFixed(1);
  console.log(`\n✅ DONE: ${path.basename(finalOutput)} (${sizeMB} MB)`);
  return finalOutput;
}
