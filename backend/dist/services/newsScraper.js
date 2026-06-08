"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrendingNews = getTrendingNews;
exports.downloadClip = downloadClip;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
// News sources to scrape
const NEWS_SOURCES = [
    { name: 'BBC News', url: 'https://www.youtube.com/@BBCNews/videos', category: 'world' },
    { name: 'CNN', url: 'https://www.youtube.com/@CNN/videos', category: 'world' },
    { name: 'Sky News', url: 'https://www.youtube.com/@SkyNews/videos', category: 'world' },
    { name: 'Al Jazeera English', url: 'https://www.youtube.com/@AlJazeeraEnglish/videos', category: 'world' },
    { name: 'SABC News', url: 'https://www.youtube.com/@SABCNews/videos', category: 'local' },
];
async function getTrendingNews() {
    const clips = [];
    for (const source of NEWS_SOURCES) {
        console.log(`📺 Scraping ${source.name}...`);
        try {
            const { stdout } = await execAsync(`yt-dlp --flat-playlist --dump-json --playlist-end 10 "${source.url}" 2>/dev/null`);
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
                }
                catch (e) {
                    console.error(`  Failed to parse video: ${e.message}`);
                }
            }
        }
        catch (error) {
            console.error(`❌ Failed to scrape ${source.name}:`, error.message);
        }
    }
    // Sort by views (most popular first) and take top 10
    const sorted = clips.sort((a, b) => b.views - a.views).slice(0, 10);
    console.log(`✅ Found ${sorted.length} trending clips`);
    return sorted;
}
async function downloadClip(clip) {
    const outputDir = path_1.default.join(process.cwd(), 'output', 'clips');
    if (!fs_1.default.existsSync(outputDir))
        fs_1.default.mkdirSync(outputDir, { recursive: true });
    const outputPath = path_1.default.join(outputDir, `${clip.id}.mp4`);
    if (!fs_1.default.existsSync(outputPath)) {
        console.log(`📥 Downloading: ${clip.title.substring(0, 50)}...`);
        await execAsync(`yt-dlp -f "best[height<=720]" -o "${outputPath}" "${clip.url}" 2>/dev/null`);
        console.log(`✅ Downloaded to: ${outputPath}`);
    }
    else {
        console.log(`📁 Already downloaded: ${clip.title.substring(0, 50)}`);
    }
    clip.downloadedPath = outputPath;
    return outputPath;
}
