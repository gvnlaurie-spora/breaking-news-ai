import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Helper function to escape text for FFmpeg drawtext
function escapeTextForFFmpeg(text: string): string {
  // Remove special characters that break FFmpeg
  return text
    .replace(/[\\'":*?<>|]/g, '') // Remove problematic characters
    .replace(/[^\w\s.,!?-]/g, '') // Remove emojis and special symbols
    .replace(/\n/g, ' ') // Replace newlines with spaces
    .substring(0, 150); // Limit length
}

export async function generateAudioFromText(text: string, outputPath: string): Promise<string> {
  // Clean text for espeak (remove special characters)
  const cleanText = text
    .replace(/[^a-zA-Z0-9\s.,!?-]/g, '')
    .substring(0, 500);
  
  await execAsync(`espeak "${cleanText}" -w ${outputPath}`);
  return outputPath;
}

export async function createVideoFromScript(script: string, articleTitle: string, outputPath: string): Promise<string> {
  const tempAudio = '/tmp/temp_audio.mp3';
  
  // Clean and escape text for FFmpeg
  const cleanTitle = escapeTextForFFmpeg(articleTitle);
  const cleanScript = escapeTextForFFmpeg(script);
  
  // Generate audio from cleaned script
  await generateAudioFromText(script, tempAudio);
  
  // Get audio duration
  const { stdout: durationOutput } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${tempAudio}`);
  const duration = parseFloat(durationOutput.trim());
  
  if (isNaN(duration) || duration <= 0) {
    throw new Error(`Invalid audio duration: ${duration}`);
  }
  
  return new Promise((resolve, reject) => {
    const command = ffmpeg()
      .input(`testsrc=duration=${duration}:size=1280x720:rate=1`)
      .inputFormat('lavfi')
      .input(tempAudio)
      .videoFilter([
        `drawtext=text='${cleanTitle}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=100:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf`,
        `drawtext=text='${cleanScript.substring(0, 100)}...':fontcolor=white:fontsize=32:x=(w-text_w)/2:y=400:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf`
      ])
      .outputOptions([
        '-c:v libx264',
        '-c:a aac',
        '-shortest',
        '-pix_fmt yuv420p',
        '-t', duration.toString()
      ])
      .output(outputPath);
    
    command
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .run();
  });
}

export async function generateSimpleVideo(article: { title: string; script: string }): Promise<string> {
  const outputPath = `/tmp/video_${Date.now()}.mp4`;
  return createVideoFromScript(article.script, article.title, outputPath);
}
