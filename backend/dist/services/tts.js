"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTTS = generateTTS;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_SPEECH_ENDPOINT = process.env.AZURE_SPEECH_ENDPOINT;
async function generateTTS(text, outputPath, voice = "male") {
    try {
        // Ensure output directory exists
        const dir = path_1.default.dirname(outputPath);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        // Azure Neural TTS voice mapping
        const voiceMap = {
            male: "en-US-ChristopherNeural",
            female: "en-US-JennyNeural",
        };
        const voiceName = voiceMap[voice] || voiceMap.male;
        // Create SSML request body (Azure requires SSML format)
        const ssml = `<?xml version="1.0" encoding="UTF-8"?>
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
  <voice name="${voiceName}">
    <prosody rate="0%">
      ${text}
    </prosody>
  </voice>
</speak>`;
        // Remove trailing slash from endpoint if present
        const endpoint = AZURE_SPEECH_ENDPOINT.replace(/\/$/, '');
        // Correct Azure TTS API URL
        const apiUrl = `${endpoint}/cognitiveservices/v1`;
        console.log(`🎤 Calling Azure TTS API: ${apiUrl}`);
        const response = await axios_1.default.post(apiUrl, ssml, {
            headers: {
                "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY,
                "Content-Type": "application/ssml+xml",
                "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
                "User-Agent": "BreakingNewsAI/1.0",
            },
            responseType: "arraybuffer",
        });
        // Save the audio file
        fs_1.default.writeFileSync(outputPath, Buffer.from(response.data));
        console.log(`✅ Azure TTS generated at: ${outputPath}`);
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
            console.error("❌ Azure TTS generation failed:");
            console.error(`   Status: ${error.response?.status}`);
            console.error(`   Message: ${error.message}`);
            if (error.response?.status === 401) {
                console.error("   Invalid API key. Please check your AZURE_SPEECH_KEY");
            }
            else if (error.response?.status === 404) {
                console.error("   Endpoint not found. Please check your AZURE_SPEECH_ENDPOINT");
                console.error("   Expected format: https://your-region.api.cognitive.microsoft.com/");
            }
        }
        else {
            console.error("❌ Azure TTS generation failed:", error);
        }
        throw error;
    }
}
