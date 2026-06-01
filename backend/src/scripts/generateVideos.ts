import "dotenv/config";
import { prisma } from "../utils/prisma";
import { generateVideo } from "../services/videoGenerator";

async function generateVideosForAllScripts() {
  console.log("🎬 Starting video generation for all scripts...");

  // --- Find scripts without videos ---
  const scripts = await prisma.script.findMany({
    where: {
      videos: {
        none: {},
      },
      status: "completed",
    },
    take: 5, // Process 5 at a time to avoid overloading
    include: { article: true },
  });

  if (scripts.length === 0) {
    console.log("✅ No new scripts to process.");
    return;
  }

  console.log(`📜 Found ${scripts.length} scripts to process.`);

  // --- Process each script ---
  for (const script of scripts) {
    try {
      await generateVideo(script.id);
    } catch (error) {
      console.error(`❌ Failed to generate video for script ${script.id}:`, error);
    }
  }

  console.log("✅ Video generation completed.");
}

generateVideosForAllScripts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
