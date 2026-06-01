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
        const dir = path_1.default.dirname(outputPath);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        // Azure Neural TTS voices
        const voiceMap = {
            male: "en-US-AriaNeural",
            female: "en-US-JennyNeural",
        };
        const voiceName = voiceMap[voice] || voiceMap.male;
        // SSML format for better control
        const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
        <voice name="${voiceName}">
          <prosody rate="0.95" pitch="0%">
            ${text}
          </prosody>
        </voice>
      </speak>
    `;
        // Azure TTS API request
        const response = await axios_1.default.post(`${AZURE_SPEECH_ENDPOINT}/cognitiveservices/v1`, ssml, {
            headers: {
                "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY,
                "Content-Type": "application/ssml+xml",
                "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
            },
            responseType: "arraybuffer",
        });
        // Save the audio file
        fs_1.default.writeFileSync(outputPath, Buffer.from(response.data));
        console.log(`✅ Azure TTS generated at: ${outputPath}`);
    }
    catch (error) {
        console.error("❌ Azure TTS generation failed:", error);
        throw error;
    }
}
