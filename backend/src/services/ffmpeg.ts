import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const W = 1920;
const H = 1080;
const FF = "/usr/bin/ffmpeg";

function exec(cmd: string): void {
  execSync(cmd, { stdio: ["pipe", "pipe", "pipe"] });
}

function safeTitle(text: string): string {
  return text
    .replace(/'/g, "\u2019")
    .replace(/\\/g, "")
    .replace(/:/g, "\\:")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/,/g, "\\,")
    .replace(/"/g, '\\"')
    .replace(/%/g, "\\%")
    .substring(0, 70);
}

function font(bold = false): string {
  const b = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
  const r = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
  return bold ? b : r;
}

export async function generateBackground(title: string, outputPath: string, durationSeconds: number): Promise<void> {
  const safe = safeTitle(title);
  exec(`${FF} -y -f lavfi -i "color=c=0x0a0a1a:size=${W}x${H}:rate=25" -vf "drawtext=text='BREAKING NEWS':fontcolor=0xff3333:fontsize=52:x=(w-text_w)/2:y=h*0.38:fontfile='${font(true)}',drawtext=text='${safe}':fontcolor=white:fontsize=32:x=(w-text_w)/2:y=h*0.54:fontfile='${font()}'" -t ${durationSeconds} -c:v libx264 -preset ultrafast -pix_fmt yuv420p "${outputPath}"`);
}

export async function prepareVideoClip(inputPath: string, outputPath: string, durationSeconds: number): Promise<void> {
  exec(`${FF} -y -stream_loop -1 -i "${inputPath}" -t ${durationSeconds} -c:v libx264 -preset ultrafast -pix_fmt yuv420p -vf "scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black" -an "${outputPath}"`);
}

export async function imageToVideo(imagePath: string, outputPath: string, durationSeconds: number): Promise<void> {
  exec(`${FF} -y -loop 1 -i "${imagePath}" -t ${durationSeconds} -c:v libx264 -preset ultrafast -tune stillimage -pix_fmt yuv420p -vf "scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black" -an "${outputPath}"`);
}

export async function buildStorySegment(opts: { videoPath: string; audioPath: string; title: string; source: string; outputPath: string; }): Promise<void> {
  const { videoPath, audioPath, title, source, outputPath } = opts;
  const safeT = safeTitle(title);
  const safeSrc = safeTitle(source);
  exec(`${FF} -y -i "${videoPath}" -i "${audioPath}" -vf "drawbox=x=0:y=h-145:w=iw:h=145:color=0xcc0000@0.92:t=fill,drawtext=text='BREAKING NEWS':fontcolor=white:fontsize=26:x=30:y=h-128:fontfile='${font(true)}',drawtext=text='${safeT}':fontcolor=white:fontsize=34:x=30:y=h-92:fontfile='${font(true)}',drawtext=text='Source\\: ${safeSrc}':fontcolor=0xffdd00:fontsize=22:x=30:y=h-48:fontfile='${font()}'" -c:v libx264 -preset fast -c:a aac -b:a 192k -shortest -pix_fmt yuv420p "${outputPath}"`);
}

export async function buildTransition(outputPath: string): Promise<void> {
  exec(`${FF} -y -f lavfi -i "color=c=black:size=${W}x${H}:rate=25" -t 5 -c:v libx264 -preset ultrafast -pix_fmt yuv420p -vf "fade=t=in:st=0:d=1,fade=t=out:st=4:d=1" "${outputPath}"`);
}

export async function buildIntro(outputPath: string): Promise<void> {
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const safeDate = safeTitle(date);
  exec(`${FF} -y -f lavfi -i "color=c=0x0a0a1a:size=${W}x${H}:rate=25" -vf "drawtext=text='BREAKING':fontcolor=0xff3333:fontsize=110:x=(w-text_w)/2-160:y=h*0.28:fontfile='${font(true)}',drawtext=text='NEWS AI':fontcolor=white:fontsize=110:x=(w-text_w)/2+120:y=h*0.28:fontfile='${font(true)}',drawtext=text='Your world. Right now.':fontcolor=0xcccccc:fontsize=44:x=(w-text_w)/2:y=h*0.56:fontfile='${font()}',drawtext=text='${safeDate}':fontcolor=0x888888:fontsize=28:x=(w-text_w)/2:y=h*0.70:fontfile='${font()}',fade=t=out:st=13:d=2" -t 15 -c:v libx264 -preset ultrafast -pix_fmt yuv420p "${outputPath}"`);
}

export async function buildOutro(outputPath: string): Promise<void> {
  exec(`${FF} -y -f lavfi -i "color=c=0x0a0a1a:size=${W}x${H}:rate=25" -vf "drawtext=text='Thank you for watching':fontcolor=white:fontsize=56:x=(w-text_w)/2:y=h*0.35:fontfile='${font(true)}',drawtext=text='BREAKING NEWS AI':fontcolor=0xff3333:fontsize=72:x=(w-text_w)/2:y=h*0.50:fontfile='${font(true)}',drawtext=text='Subscribe for updates every 4 hours':fontcolor=0xaaaaaa:fontsize=32:x=(w-text_w)/2:y=h*0.68:fontfile='${font()}',fade=t=in:st=0:d=2,fade=t=out:st=13:d=2" -t 15 -c:v libx264 -preset ultrafast -pix_fmt yuv420p "${outputPath}"`);
}

export async function concatSegments(segmentPaths: string[], outputPath: string): Promise<void> {
  const listPath = outputPath.replace(".mp4", "_list.txt");
  fs.writeFileSync(listPath, segmentPaths.map(p => `file '${p}'`).join("\n"));
  console.log(`\n🎬 Concatenating ${segmentPaths.length} segments...`);
  exec(`${FF} -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`);
  fs.unlinkSync(listPath);
  console.log(`✅ Final video: ${outputPath}`);
}
