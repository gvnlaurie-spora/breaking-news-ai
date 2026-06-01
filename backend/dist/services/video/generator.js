"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAudioFromText = generateAudioFromText;
exports.createVideoFromScript = createVideoFromScript;
exports.generateSimpleVideo = generateSimpleVideo;
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const ffmpeg_1 = __importDefault(require("@ffmpeg-installer/ffmpeg"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
// Set FFmpeg path
fluent_ffmpeg_1.default.setFfmpegPath(ffmpeg_1.default.path);
// Helper function to escape text for FFmpeg drawtext
function escapeTextForFFmpeg(text) {
    // Remove special characters that break FFmpeg
    return text
        .replace(/[\\'":*?<>|]/g, '') // Remove problematic characters
        .replace(/[^\w\s.,!?-]/g, '') // Remove emojis and special symbols
        .replace(/\n/g, ' ') // Replace newlines with spaces
        .substring(0, 150); // Limit length
}
async function generateAudioFromText(text, outputPath) {
    // Clean text for espeak (remove special characters)
    const cleanText = text
        .replace(/[^a-zA-Z0-9\s.,!?-]/g, '')
        .substring(0, 500);
    await execAsync(`espeak "${cleanText}" -w ${outputPath}`);
    return outputPath;
}
async function createVideoFromScript(script, articleTitle, outputPath) {
    const tempAudio = '/tmp/temp_audio.mp3';
    // Clean and escape text for FFmpeg
    const cleanTitle = escapeTextForFFmpeg(articleTitle);
    const cleanScript = escapeTextForFFmpeg(script);
    // Generate audio from cleaned script
    await generateAudioFromText(script, tempAudio);
    // Get audio duration
    const { stdout: durationOutput } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${tempAudio}`);
    const duration = parseFloat(durationOutput.trim());
    if (isNaN(duration) || duration <= 0) {
        throw new Error(`Invalid audio duration: ${duration}`);
    }
    return new Promise((resolve, reject) => {
        const command = (0, fluent_ffmpeg_1.default)()
            .input(`testsrc=duration=${duration}:size=1280x720:rate=1`)
            .inputFormat('lavfi')
            .input(tempAudio)
            .videoFilter([
            `drawtext=text='${cleanTitle}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=100:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf`,
            `drawtext=text='${cleanScript.substring(0, 100)}...':fontcolor=white:fontsize=32:x=(w-text_w)/2:y=400:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf`
        ])
            .outputOptions([
            '-c:v libx264',
            '-c:a aac',
            '-shortest',
            '-pix_fmt yuv420p',
            '-t', duration.toString()
        ])
            .output(outputPath);
        command
            .on('end', () => resolve(outputPath))
            .on('error', (err) => reject(err))
            .run();
    });
}
async function generateSimpleVideo(article) {
    const outputPath = `/tmp/video_${Date.now()}.mp4`;
    return createVideoFromScript(article.script, article.title, outputPath);
}
