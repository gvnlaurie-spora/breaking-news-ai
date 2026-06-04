"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSimpleVideo = generateSimpleVideo;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
async function generateSimpleVideo(article) {
    const outputPath = `/tmp/audio_${Date.now()}.mp3`;
    // Clean text for espeak
    const cleanText = article.script
        .replace(/[^a-zA-Z0-9\s.,!?-]/g, '')
        .replace(/\n/g, ' ')
        .substring(0, 500);
    console.log(`🎙️ Generating audio for: ${article.title.substring(0, 50)}...`);
    try {
        await execAsync(`espeak "${cleanText}" -w ${outputPath}`);
        console.log(`✅ Audio saved: ${outputPath}`);
        return outputPath;
    }
    catch (error) {
        console.error('❌ Audio generation failed:', error);
        throw error;
    }
}
