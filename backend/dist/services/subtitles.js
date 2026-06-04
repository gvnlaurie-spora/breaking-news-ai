"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSubtitles = generateSubtitles;
const fs_1 = __importDefault(require("fs"));
function generateSubtitles(text, outputPath) {
    // Split text into sentences (roughly)
    const sentences = text.split(/(?<=[.!?])\s+/);
    let srtContent = "";
    let startTime = 0;
    const durationPerSentence = 3; // 3 seconds per sentence
    sentences.forEach((sentence, index) => {
        const endTime = startTime + durationPerSentence;
        srtContent += `${index + 1}\n`;
        srtContent += `00:00:${startTime.toString().padStart(2, "0")},000 --> 00:00:${endTime.toString().padStart(2, "0")},000\n`;
        srtContent += `${sentence.trim()}\n\n`;
        startTime = endTime;
    });
    fs_1.default.writeFileSync(outputPath, srtContent.trim());
    console.log(`✅ Subtitles generated at: ${outputPath}`);
}
