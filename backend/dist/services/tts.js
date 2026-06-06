"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTTS = generateTTS;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function generateTTS(text, outputPath, voice = "male") {
    const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
    const AZURE_SPEECH_ENDPOINT = process.env.AZURE_SPEECH_ENDPOINT;
    if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_ENDPOINT) {
        throw new Error("AZURE_SPEECH_KEY or AZURE_SPEECH_ENDPOINT not set in .env");
    }
    const dir = path_1.default.dirname(outputPath);
    if (!fs_1.default.existsSync(dir))
        fs_1.default.mkdirSync(dir, { recursive: true });
    const voiceMap = {
        male: "en-US-ChristopherNeural",
        female: "en-US-JennyNeural",
    };
    const voiceName = voiceMap[voice];
    // Sanitise text for SSML
    const safeText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .substring(0, 3000); // Azure limit
    const ssml = `<?xml version="1.0" encoding="UTF-8"?>
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
  <voice name="${voiceName}">
    <prosody rate="-5%" pitch="0%">
      ${safeText}
    </prosody>
  </voice>
</speak>`;
    const endpoint = AZURE_SPEECH_ENDPOINT.replace(/\/$/, '');
    const apiUrl = `${endpoint}/cognitiveservices/v1`;
    console.log(`  🎤 Azure TTS: generating ${path_1.default.basename(outputPath)}...`);
    const response = await axios_1.default.post(apiUrl, ssml, {
        headers: {
            "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
            "User-Agent": "BreakingNewsAI/2.0",
        },
        responseType: "arraybuffer",
        timeout: 30000,
    });
    fs_1.default.writeFileSync(outputPath, Buffer.from(response.data));
    console.log(`  ✅ TTS saved: ${path_1.default.basename(outputPath)}`);
}
