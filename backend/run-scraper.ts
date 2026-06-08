import { getTrendingNews } from './src/services/newsScraper';

async function main() {
  console.log('🔍 Testing news scraper...\n');
  const clips = await getTrendingNews();
  console.log(`\n✅ Found ${clips.length} clips`);
  clips.slice(0, 3).forEach((clip, i) => {
    console.log(`\n${i+1}. ${clip.title.substring(0, 70)}`);
    console.log(`   Source: ${clip.source} | Views: ${clip.views.toLocaleString()}`);
  });
}

main().catch(console.error);
