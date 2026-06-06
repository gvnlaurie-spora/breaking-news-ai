import "dotenv/config";
import { prisma } from "../utils/prisma";
import { generateSimpleVideo } from "../services/video/generator-simple";

async function generateVideos() {
  console.log("🎬 Starting video generation from scripts...");

  const scripts = await prisma.script.findMany({
    where: {
      filePath: null,
      status: "ready",        // ← was "completed", must match what orchestrator saves
    },
    include: { article: true },
    take: 5
  });

  if (scripts.length === 0) {
    console.log("✅ No scripts ready for video generation.");
    await prisma.$disconnect();
    return;
  }

  console.log(`📹 Found ${scripts.length} script(s) to convert to video.`);

  for (const script of scripts) {
    try {
      console.log(`🎥 Processing: ${script.article.title.substring(0, 50)}...`);

      const videoPath = await generateSimpleVideo({
        title: script.article.title,
        script: script.content
      });

      await prisma.script.update({
        where: { id: script.id },
        data: {
          filePath: videoPath,
          status: "completed"   // ← mark completed AFTER video is made
        }
      });

      console.log(`✅ Video saved: ${videoPath}`);
    } catch (error) {
      console.error(`❌ Failed for script ${script.id}:`, error);
      await prisma.script.update({
        where: { id: script.id },
        data: { status: "failed" }
      });
    }
  }

  console.log("✅ Video generation completed.");
  await prisma.$disconnect();
}

generateVideos().catch((error) => {
  console.error("Fatal error:", error);
  prisma.$disconnect();
  process.exit(1);
});
