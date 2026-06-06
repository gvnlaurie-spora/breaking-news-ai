import "dotenv/config";
import { compileNewsVideo } from "../services/video/compiler";
import { prisma } from "../utils/prisma";

async function generateVideos() {
  console.log("🎬 Breaking News AI — Video Compiler\n");

  try {
    const videoPath = await compileNewsVideo();
    console.log(`\n🎉 30-minute video ready: ${videoPath}`);
  } catch (err: any) {
    console.error(`\n❌ Video compilation failed: ${err.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

generateVideos();
