import axios from "axios";
import fs from "fs";
import path from "path";

const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY!;
const AZURE_SPEECH_ENDPOINT = process.env.AZURE_SPEECH_ENDPOINT!;

export async function generateTTS(
  text: string,
  outputPath: string,
  voice: "male" | "female" = "male"
): Promise<void> {
  try {
    // Ensure output directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
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

    const response = await axios.post(
      apiUrl,
      ssml,
      {
        headers: {
          "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
          "User-Agent": "BreakingNewsAI/1.0",
        },
        responseType: "arraybuffer",
      }
    );

    // Save the audio file
    fs.writeFileSync(outputPath, Buffer.from(response.data));
    console.log(`✅ Azure TTS generated at: ${outputPath}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("❌ Azure TTS generation failed:");
      console.error(`   Status: ${error.response?.status}`);
      console.error(`   Message: ${error.message}`);
      if (error.response?.status === 401) {
        console.error("   Invalid API key. Please check your AZURE_SPEECH_KEY");
      } else if (error.response?.status === 404) {
        console.error("   Endpoint not found. Please check your AZURE_SPEECH_ENDPOINT");
        console.error("   Expected format: https://your-region.api.cognitive.microsoft.com/");
      }
    } else {
      console.error("❌ Azure TTS generation failed:", error);
    }
    throw error;
  }
}
