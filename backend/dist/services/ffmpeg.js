"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVideoFromAudio = createVideoFromAudio;
exports.addSubtitlesToVideo = addSubtitlesToVideo;
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
fluent_ffmpeg_1.default.setFfmpegPath("/usr/bin/ffmpeg"); // Ensure FFmpeg is in this path
// --- Create a video from audio + background ---
async function createVideoFromAudio(audioPath, backgroundImage, outputPath) {
    return new Promise((resolve, reject) => {
        (0, fluent_ffmpeg_1.default)()
            .input(backgroundImage)
            .input(audioPath)
            .outputOptions([
            "-c:v libx264",
            "-preset ultrafast",
            "-tune stillimage",
            "-c:a aac",
            "-b:a 192k",
            "-shortest", // End video when audio ends
        ])
            .output(outputPath)
            .on("end", () => {
            console.log(`✅ Video created at: ${outputPath}`);
            resolve();
        })
            .on("error", (err) => {
            console.error("❌ FFmpeg error:", err);
            reject(err);
        })
            .run();
    });
}
// --- Add subtitles to a video ---
async function addSubtitlesToVideo(videoPath, subtitlesPath, outputPath) {
    return new Promise((resolve, reject) => {
        (0, fluent_ffmpeg_1.default)()
            .input(videoPath)
            .input(subtitlesPath)
            .outputOptions([
            "-c:v libx264",
            "-c:a copy",
            "-vf subtitles=${subtitlesPath}:force_style='Fontsize=24,PrimaryColour=&HFFFFFF&'",
        ])
            .output(outputPath)
            .on("end", () => {
            console.log(`✅ Subtitles added to video: ${outputPath}`);
            resolve();
        })
            .on("error", (err) => {
            console.error("❌ Subtitle addition failed:", err);
            reject(err);
        })
            .run();
    });
}
