import "dotenv/config";
import { prisma } from "../utils/prisma";
import { generateSimpleVideo } from "../services/video/generator-simple";

async function generateVideos() {
  console.log("🎬 Starting audio generation for articles...");
  
  // Find articles with scripts but no filePath
  const scripts = await prisma.script.findMany({
    where: {
      filePath: null,
      status: "completed"
    },
    include: {
      article: true
    },
    take: 5
  });
  
  if (scripts.length === 0) {
    console.log("✅ No audio to generate.");
    await prisma.$disconnect();
    return;
  }
  
  console.log(`📹 Found ${scripts.length} scripts to convert to audio.`);
  
  for (const script of scripts) {
    try {
      console.log(`🎥 Processing: ${script.article.title.substring(0, 50)}...`);
      
      const audioPath = await generateSimpleVideo({
        title: script.article.title,
        script: script.content
      });
      
      // Update the script with filePath
      await prisma.script.update({
        where: { id: script.id },
        data: { 
          filePath: audioPath,
          status: "completed"
        }
      });
      
      console.log(`✅ Audio saved: ${audioPath}`);
    } catch (error) {
      console.error(`❌ Failed to generate audio for script ${script.id}:`, error);
      
      // Mark as failed
      await prisma.script.update({
        where: { id: script.id },
        data: { status: "failed" }
      });
    }
  }
  
  console.log("✅ Audio generation completed.");
  await prisma.$disconnect();
}

generateVideos().catch((error) => {
  console.error("Fatal error:", error);
  prisma.$disconnect();
  process.exit(1);
});
