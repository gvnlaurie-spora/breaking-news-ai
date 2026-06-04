import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

export async function generateSimpleVideo(article: { title: string; script: string }): Promise<string> {
  const tempAudio = `/tmp/audio_${Date.now()}.mp3`;
  const outputPath = `/tmp/video_${Date.now()}.mp4`;
  const tempImage = '/tmp/background.png';
  
  // Clean text
  const cleanText = article.script
    .replace(/[^a-zA-Z0-9\s.,!?-]/g, '')
    .substring(0, 500);
  
  // Generate audio
  await execAsync(`espeak "${cleanText}" -w ${tempAudio}`);
  
  // Create a simple black image with text using ImageMagick
  await execAsync(`convert -size 1280x720 xc:black -gravity north -pointsize 48 -fill white -annotate +0+100 "${article.title.substring(0, 60)}" -gravity center -pointsize 32 -fill white -annotate +0+0 "${cleanText.substring(0, 200)}" ${tempImage}`);
  
  // Get audio duration
  const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${tempAudio}`);
  const duration = parseFloat(stdout.trim());
  
  // Create video from image and audio
  await execAsync(`ffmpeg -loop 1 -i ${tempImage} -i ${tempAudio} -c:v libx264 -c:a aac -shortest -pix_fmt yuv420p -t ${duration} ${outputPath} -y`);
  
  return outputPath;
}
