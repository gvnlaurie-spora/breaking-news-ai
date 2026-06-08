import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testYtDlp() {
  console.log('🔍 Testing yt-dlp...');
  
  try {
    // Test 1: Check yt-dlp version
    const { stdout: version } = await execAsync('yt-dlp --version');
    console.log(`✅ yt-dlp version: ${version.trim()}`);
  } catch (error: any) {
    console.error(`❌ yt-dlp not found: ${error.message}`);
    return;
  }
  
  console.log('\n📺 Testing YouTube fetch...');
  
  try {
    const { stdout } = await execAsync(
      `yt-dlp --flat-playlist --dump-json --playlist-end 2 "https://www.youtube.com/@BBCNews/videos" 2>/dev/null`
    );
    
    const lines = stdout.trim().split('\n').filter(Boolean);
    console.log(`Found ${lines.length} videos`);
    
    for (const line of lines) {
      try {
        const video = JSON.parse(line);
        console.log(`\n📹 Title: ${video.title}`);
        console.log(`   ID: ${video.id}`);
        console.log(`   Views: ${video.view_count || 'N/A'}`);
      } catch (e) {
        console.log(`Failed to parse: ${line.substring(0, 50)}`);
      }
    }
  } catch (error: any) {
    console.error(`❌ Fetch failed: ${error.message}`);
  }
}

testYtDlp();
