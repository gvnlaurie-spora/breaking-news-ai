import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// News sources to scrape
const NEWS_SOURCES = [
  { name: 'BBC News', url: 'https://www.youtube.com/@BBCNews/videos', category: 'world' },
  { name: 'CNN', url: 'https://www.youtube.com/@CNN/videos', category: 'world' },
  { name: 'Sky News', url: 'https://www.youtube.com/@SkyNews/videos', category: 'world' },
  { name: 'Al Jazeera English', url: 'https://www.youtube.com/@AlJazeeraEnglish/videos', category: 'world' },
  { name: 'SABC News', url: 'https://www.youtube.com/@SABCNews/videos', category: 'local' },
];

export interface NewsClip {
  id: string;
  title: string;
  url: string;
  duration: number;
  views: number;
  source: string;
  category: string;
  downloadedPath: string;
  aiIntro: string;
  audioPath: string;
}

export async function getTrendingNews(): Promise<NewsClip[]> {
  const clips: NewsClip[] = [];
  
  for (const source of NEWS_SOURCES) {
    console.log(`📺 Scraping ${source.name}...`);
    
    try {
      const { stdout } = await execAsync(
        `yt-dlp --flat-playlist --dump-json --playlist-end 10 "${source.url}" 2>/dev/null`
      );
      
      const lines = stdout.trim().split('\n').filter(Boolean);
      
      for (const line of lines) {
        try {
          const video = JSON.parse(line);
          clips.push({
            id: video.id,
            title: video.title,
            url: `https://youtube.com/watch?v=${video.id}`,
            duration: video.duration || 180,
            views: video.view_count || 0,
            source: source.name,
            category: source.category,
            downloadedPath: '',
            aiIntro: '',
            audioPath: '',
          });
        } catch (e) {
          console.error(`  Failed to parse video: ${e.message}`);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to scrape ${source.name}:`, error.message);
    }
  }
  
  // Sort by views (most popular first) and take top 10
  const sorted = clips.sort((a, b) => b.views - a.views).slice(0, 10);
  console.log(`✅ Found ${sorted.length} trending clips`);
  return sorted;
}

export async function downloadClip(clip: NewsClip): Promise<string> {
  const outputDir = path.join(process.cwd(), 'output', 'clips');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  
  const outputPath = path.join(outputDir, `${clip.id}.mp4`);
  
  if (!fs.existsSync(outputPath)) {
    console.log(`📥 Downloading: ${clip.title.substring(0, 50)}...`);
    await execAsync(
      `yt-dlp -f "best[height<=720]" -o "${outputPath}" "${clip.url}" 2>/dev/null`
    );
    console.log(`✅ Downloaded to: ${outputPath}`);
  } else {
    console.log(`📁 Already downloaded: ${clip.title.substring(0, 50)}`);
  }
  
  clip.downloadedPath = outputPath;
  return outputPath;
}
