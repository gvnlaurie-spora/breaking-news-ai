import "dotenv/config";
import { generateTTS } from "../services/tts";

async function testAzureTTS() {
  console.log("🎤 Testing Azure TTS...");
  
  if (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_ENDPOINT) {
    console.error("❌ Azure credentials not found in .env");
    console.log("Please add:");
    console.log("AZURE_SPEECH_KEY=your_key");
    console.log("AZURE_SPEECH_ENDPOINT=https://your-region.tts.speech.microsoft.com/");
    return;
  }
  
  console.log("✅ Azure credentials found");
  
  try {
    await generateTTS(
      "Hello! This is a test of the Azure Text to Speech service.",
      "/tmp/test-azure.mp3",
      "male"
    );
    console.log("✅ TTS generated successfully!");
    console.log("📁 File saved: /tmp/test-azure.mp3");
    
    // Play the audio
    const { exec } = require('child_process');
    exec('ffplay /tmp/test-azure.mp3', (error: Error | null) => {
      if (error) console.log("Play with: ffplay /tmp/test-azure.mp3");
    });
  } catch (error) {
    console.error("❌ TTS failed:", error);
  }
}

testAzureTTS();
