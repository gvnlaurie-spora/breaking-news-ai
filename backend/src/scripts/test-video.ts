import "dotenv/config";
import { generateSimpleVideo } from "../services/video/generator";

async function testVideo() {
  console.log("🎬 Testing video generation...");
  
  const testArticle = {
    title: "AI Breaking News Test",
    script: "This is a test script for our breaking news video. AI is changing the world every day."
  };
  
  try {
    const videoPath = await generateSimpleVideo(testArticle);
    console.log(`✅ Video generated: ${videoPath}`);
  } catch (error) {
    console.error("❌ Video generation failed:", error);
  }
}

testVideo();
