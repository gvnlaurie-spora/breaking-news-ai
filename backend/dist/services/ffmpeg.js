"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBackground = generateBackground;
exports.prepareVideoClip = prepareVideoClip;
exports.imageToVideo = imageToVideo;
exports.buildStorySegment = buildStorySegment;
exports.buildTransition = buildTransition;
exports.buildIntro = buildIntro;
exports.buildOutro = buildOutro;
exports.concatSegments = concatSegments;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const W = 1920;
const H = 1080;
const FF = "ffmpeg";
function exec(cmd) {
    (0, child_process_1.execSync)(cmd, { stdio: ["pipe", "pipe", "pipe"] });
}
function safeTitle(text) {
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
function font(bold = false) {
    return bold
        ? "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
        : "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
}
async function generateBackground(title, outputPath, durationSeconds) {
    const safe = safeTitle(title);
    exec(`${FF} -y -f lavfi -i "color=c=0x0a0a1a:size=${W}x${H}:rate=25" -vf "drawtext=text='BREAKING NEWS AI':fontcolor=0xff3333:fontsize=52:x=(w-text_w)/2:y=h*0.35:fontfile='${font(true)}',drawtext=text='${safe}':fontcolor=white:fontsize=34:x=(w-text_w)/2:y=h*0.54:fontfile='${font()}'" -t ${durationSeconds} -c:v libx264 -preset ultrafast -pix_fmt yuv420p "${outputPath}"`);
}
async function prepareVideoClip(inputPath, outputPath, durationSeconds) {
    exec(`${FF} -y -i "${inputPath}" -t ${durationSeconds} -c:v libx264 -preset ultrafast -pix_fmt yuv420p -vf "scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black" -an "${outputPath}"`);
}
async function imageToVideo(imagePath, outputPath, durationSeconds) {
    exec(`${FF} -y -loop 1 -i "${imagePath}" -t ${durationSeconds} -c:v libx264 -preset ultrafast -tune stillimage -pix_fmt yuv420p -vf "scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black" -an "${outputPath}"`);
}
async function buildStorySegment(opts) {
    const { videoPath, audioPath, title, source, outputPath } = opts;
    const safeT = safeTitle(title);
    const safeSrc = safeTitle(source);
    exec(`${FF} -y -stream_loop -1 -i "${videoPath}" -i "${audioPath}" -vf "drawbox=x=0:y=h-150:w=iw:h=150:color=0x0d0d0d@0.88:t=fill,drawbox=x=0:y=h-150:w=10:h=150:color=0xff2222:t=fill,drawtext=text='BREAKING NEWS AI':fontcolor=0xff2222:fontsize=22:x=22:y=h-138:fontfile='${font(true)}',drawtext=text='${safeT}':fontcolor=white:fontsize=36:x=22:y=h-105:fontfile='${font(true)}',drawtext=text='Source\\: ${safeSrc}':fontcolor=0xaaaaaa:fontsize=22:x=22:y=h-52:fontfile='${font()}'" -map 0:v -map 1:a -c:v libx264 -preset fast -c:a aac -b:a 192k -shortest -pix_fmt yuv420p "${outputPath}"`);
}
async function buildTransition(outputPath) {
    exec(`${FF} -y -f lavfi -i "color=c=black:size=${W}x${H}:rate=25" -t 2 -c:v libx264 -preset ultrafast -pix_fmt yuv420p -vf "fade=t=in:st=0:d=0.5,fade=t=out:st=1.5:d=0.5" "${outputPath}"`);
}
async function buildIntro(outputPath) {
    const date = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const safeDate = safeTitle(date);
    exec(`${FF} -y -f lavfi -i "color=c=0x0d0d0d:size=${W}x${H}:rate=25" -vf "drawtext=text='BREAKING NEWS AI':fontcolor=0xff2222:fontsize=108:x=(w-text_w)/2:y=h*0.28:fontfile='${font(true)}',drawtext=text='Your world. Right now.':fontcolor=white:fontsize=46:x=(w-text_w)/2:y=h*0.50:fontfile='${font()}',drawtext=text='${safeDate}':fontcolor=0x888888:fontsize=30:x=(w-text_w)/2:y=h*0.64:fontfile='${font()}',fade=t=in:st=0:d=1.5,fade=t=out:st=13:d=2" -t 15 -c:v libx264 -preset ultrafast -pix_fmt yuv420p "${outputPath}"`);
}
async function buildOutro(outputPath) {
    exec(`${FF} -y -f lavfi -i "color=c=0x0d0d0d:size=${W}x${H}:rate=25" -vf "drawtext=text='Thank you for watching':fontcolor=white:fontsize=58:x=(w-text_w)/2:y=h*0.33:fontfile='${font(true)}',drawtext=text='BREAKING NEWS AI':fontcolor=0xff2222:fontsize=74:x=(w-text_w)/2:y=h*0.48:fontfile='${font(true)}',drawtext=text='Subscribe for updates every 4 hours':fontcolor=0x999999:fontsize=34:x=(w-text_w)/2:y=h*0.65:fontfile='${font()}',fade=t=in:st=0:d=2,fade=t=out:st=13:d=2" -t 15 -c:v libx264 -preset ultrafast -pix_fmt yuv420p "${outputPath}"`);
}
async function concatSegments(segmentPaths, outputPath) {
    const listPath = outputPath.replace(".mp4", "_list.txt");
    fs_1.default.writeFileSync(listPath, segmentPaths.map(p => `file '${p}'`).join("\n"));
    console.log(`\n🎬 Concatenating ${segmentPaths.length} segments...`);
    exec(`${FF} -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`);
    fs_1.default.unlinkSync(listPath);
    console.log(`✅ Final video: ${outputPath}`);
}
