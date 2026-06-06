import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

export async function generateSimpleVideo(article: { title: string; script: string }): Promise<string> {
  const outputPath = `/tmp/audio_${Date.now()}.mp3`;
  
  // Clean text for espeak
  const cleanText = article.script
    .replace(/[^a-zA-Z0-9\s.,!?-]/g, '')
    .replace(/\n/g, ' ')
    .substring(0, 500);
  
  console.log(`🎙️ Generating audio for: ${article.title.substring(0, 50)}...`);
  
  try {
    await execAsync(`espeak "${cleanText}" -w ${outputPath}`);
    console.log(`✅ Audio saved: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('❌ Audio generation failed:', error);
    throw error;
  }
}
