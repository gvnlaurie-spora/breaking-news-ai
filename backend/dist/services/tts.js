"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTTS = generateTTS;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const util_1 = require("util");
const path_1 = __importDefault(require("path"));
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const VOICE_MAP = {
    male: "en-US-ChristopherNeural",
    female: "en-US-JennyNeural",
};
async function generateWithEdgeTts(text, outputPath, voice) {
    const dir = path_1.default.dirname(outputPath);
    if (!(0, fs_1.existsSync)(dir))
        (0, fs_1.mkdirSync)(dir, { recursive: true });
    // edge-tts outputs to mp3 directly
    await execFileAsync("edge-tts", ["--voice", voice, "--text", text.substring(0, 3000), "--write-media", outputPath], { timeout: 60000 });
}
async function generateWithEspeak(text, outputPath) {
    const dir = path_1.default.dirname(outputPath);
    if (!(0, fs_1.existsSync)(dir))
        (0, fs_1.mkdirSync)(dir, { recursive: true });
    const clean = text.replace(/[^a-zA-Z0-9 .,!?'\-]/g, " ").trim().substring(0, 2000);
    const wavPath = outputPath.replace(/\.mp3$/, ".wav");
    await execFileAsync("espeak", ["-v", "en-us", "-s", "145", "-g", "8", "-w", wavPath, clean], {
        timeout: 60000,
    });
    await execFileAsync("ffmpeg", ["-y", "-i", wavPath, "-c:a", "libmp3lame", "-q:a", "2", outputPath], {
        timeout: 30000,
    });
    try {
        require("fs").unlinkSync(wavPath);
    }
    catch { /* ignore */ }
}
async function generateTTS(text, outputPath, voice = "male") {
    const voiceName = VOICE_MAP[voice];
    console.log(`  🎤 Edge TTS: generating ${path_1.default.basename(outputPath)}...`);
    try {
        await generateWithEdgeTts(text, outputPath, voiceName);
        console.log(`  ✅ TTS saved: ${path_1.default.basename(outputPath)}`);
    }
    catch (edgeErr) {
        console.warn(`  ⚠️  edge-tts failed, using espeak fallback:`, edgeErr.message);
        await generateWithEspeak(text, outputPath);
        console.log(`  ✅ TTS saved (espeak): ${path_1.default.basename(outputPath)}`);
    }
}
