"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSimpleVideo = generateSimpleVideo;
const ffmpeg_1 = require("../ffmpeg");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function generateSimpleVideo(options) {
    const outputDir = path_1.default.join(process.cwd(), 'output', 'videos');
    if (!fs_1.default.existsSync(outputDir))
        fs_1.default.mkdirSync(outputDir, { recursive: true });
    const outputPath = path_1.default.join(outputDir, `${Date.now()}.mp4`);
    const audioPath = path_1.default.join(process.cwd(), 'output', 'audio', `${Date.now()}.mp3`);
    // First generate TTS audio
    console.log('🎙️ Generating TTS audio...');
    // Add your TTS generation here (Azure or edge-tts)
    // Generate background
    console.log('🎬 Generating background...');
    await (0, ffmpeg_1.generateBackground)(options.title, outputPath, 30);
    console.log(`✅ Video generated: ${outputPath}`);
    return outputPath;
}
