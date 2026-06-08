import { execSync } from "child_process";
import fs from "fs";

const W = 1920;
const H = 1080;
const FF = "ffmpeg";

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
  return bold
    ? "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    : "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
}

export async function generateBackground(title: string, outputPath: string, durationSeconds: number): Promise<void> {
  const safe = safeTitle(title);
  exec(`${FF} -y -f lavfi -i "color=c=0x0a0a1a:size=${W}x${H}:rate=25" -vf "drawtext=text='BREAKING NEWS AI':fontcolor=0xff3333:fontsize=52:x=(w-text_w)/2:y=h*0.35:fontfile='${font(true)}',drawtext=text='${safe}':fontcolor=white:fontsize=34:x=(w-text_w)/2:y=h*0.54:fontfile='${font()}'" -t ${durationSeconds} -c:v libx264 -preset ultrafast -pix_fmt yuv420p "${outputPath}"`);
}

export async function prepareVideoClip(inputPath: string, outputPath: string, durationSeconds: number): Promise<void> {
  exec(`${FF} -y -i "${inputPath}" -t ${durationSeconds} -c:v libx264 -preset ultrafast -pix_fmt yuv420p -vf "scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black" -an "${outputPath}"`);
}

export async function imageToVideo(imagePath: string, outputPath: string, durationSeconds: number): Promise<void> {
  exec(`${FF} -y -loop 1 -i "${imagePath}" -t ${durationSeconds} -c:v libx264 -preset ultrafast -tune stillimage -pix_fmt yuv420p -vf "scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black" -an "${outputPath}"`);
}

export async function buildStorySegment(opts: { videoPath: string; audioPath: string; title: string; source: string; outputPath: string }): Promise<void> {
  const { videoPath, audioPath, title, source, outputPath } = opts;
  const safeT = safeTitle(title);
  const safeSrc = safeTitle(source);
  exec(`${FF} -y -stream_loop -1 -i "${videoPath}" -i "${audioPath}" -vf "drawbox=x=0:y=h-150:w=iw:h=150:color=0x0d0d0d@0.88:t=fill,drawbox=x=0:y=h-150:w=10:h=150:color=0xff2222:t=fill,drawtext=text='BREAKING NEWS AI':fontcolor=0xff2222:fontsize=22:x=22:y=h-138:fontfile='${font(true)}',drawtext=text='${safeT}':fontcolor=white:fontsize=36:x=22:y=h-105:fontfile='${font(true)}',drawtext=text='Source\\: ${safeSrc}':fontcolor=0xaaaaaa:fontsize=22:x=22:y=h-52:fontfile='${font()}'" -map 0:v -map 1:a -c:v libx264 -preset fast -c:a aac -b:a 192k -shortest -pix_fmt yuv420p "${outputPath}"`);
}

export async function buildTransition(outputPath: string): Promise<void> {
  exec(`${FF} -y -f lavfi -i "color=c=black:size=${W}x${H}:rate=25" -t 2 -c:v libx264 -preset ultrafast -pix_fmt yuv420p -vf "fade=t=in:st=0:d=0.5,fade=t=out:st=1.5:d=0.5" "${outputPath}"`);
}

export async function buildIntro(outputPath: string): Promise<void> {
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const safeDate = safeTitle(date);
  exec(`${FF} -y -f lavfi -i "color=c=0x0d0d0d:size=${W}x${H}:rate=25" -vf "drawtext=text='BREAKING NEWS AI':fontcolor=0xff2222:fontsize=108:x=(w-text_w)/2:y=h*0.28:fontfile='${font(true)}',drawtext=text='Your world. Right now.':fontcolor=white:fontsize=46:x=(w-text_w)/2:y=h*0.50:fontfile='${font()}',drawtext=text='${safeDate}':fontcolor=0x888888:fontsize=30:x=(w-text_w)/2:y=h*0.64:fontfile='${font()}',fade=t=in:st=0:d=1.5,fade=t=out:st=13:d=2" -t 15 -c:v libx264 -preset ultrafast -pix_fmt yuv420p "${outputPath}"`);
}

export async function buildOutro(outputPath: string): Promise<void> {
  exec(`${FF} -y -f lavfi -i "color=c=0x0d0d0d:size=${W}x${H}:rate=25" -vf "drawtext=text='Thank you for watching':fontcolor=white:fontsize=58:x=(w-text_w)/2:y=h*0.33:fontfile='${font(true)}',drawtext=text='BREAKING NEWS AI':fontcolor=0xff2222:fontsize=74:x=(w-text_w)/2:y=h*0.48:fontfile='${font(true)}',drawtext=text='Subscribe for updates every 4 hours':fontcolor=0x999999:fontsize=34:x=(w-text_w)/2:y=h*0.65:fontfile='${font()}',fade=t=in:st=0:d=2,fade=t=out:st=13:d=2" -t 15 -c:v libx264 -preset ultrafast -pix_fmt yuv420p "${outputPath}"`);
}

export async function concatSegments(segmentPaths: string[], outputPath: string): Promise<void> {
  const listPath = outputPath.replace(".mp4", "_list.txt");
  fs.writeFileSync(listPath, segmentPaths.map(p => `file '${p}'`).join("\n"));
  console.log(`\n🎬 Concatenating ${segmentPaths.length} segments...`);
  exec(`${FF} -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`);
  fs.unlinkSync(listPath);
  console.log(`✅ Final video: ${outputPath}`);
}
