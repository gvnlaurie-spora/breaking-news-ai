// ============================================================
// mediaFetcher.ts — Fetch images + MP4 footage from multiple sources
// Pexels (images + video), Pixabay (video), Pollinations.ai (AI images),
// Internet Archive (news footage scrape)
// ============================================================

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { pipeline } from 'stream';

const streamPipeline = promisify(pipeline);

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || '';
const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY || '';
const MEDIA_TMP = path.resolve(process.cwd(), 'output', 'media');
fs.mkdirSync(MEDIA_TMP, { recursive: true });

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function downloadFile(url: string, destPath: string): Promise<boolean> {
  try {
    const response = await axios({ url, method: 'GET', responseType: 'stream', timeout: 30000 });
    await streamPipeline(response.data, fs.createWriteStream(destPath));
    return fs.existsSync(destPath) && fs.statSync(destPath).size > 10000;
  } catch {
    return false;
  }
}

function extractKeywords(title: string): string {
  const stopWords = new Set([
    'the','a','an','and','or','but','in','on','at','to','for','of','with',
    'by','from','up','about','into','through','during','is','are','was','were',
    'be','been','being','have','has','had','do','does','did','will','would',
    'could','should','may','might','shall','can','need','dare','ought','used',
    'breaking','news','just','report','says','amid','after','before','over'
  ]);
  return title
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w))
    .slice(0, 3)
    .join(' ');
}

// ─────────────────────────────────────────────
// PEXELS IMAGES
// ─────────────────────────────────────────────

export async function fetchPexelsImage(query: string, destPath: string): Promise<boolean> {
  if (!PEXELS_API_KEY) return false;
  try {
    const res = await axios.get('https://api.pexels.com/v1/search', {
      headers: { Authorization: PEXELS_API_KEY },
      params: { query, per_page: 5, orientation: 'landscape' },
      timeout: 10000,
    });
    const photos = res.data.photos;
    if (!photos?.length) return false;
    const photo = photos[Math.floor(Math.random() * Math.min(3, photos.length))];
    const imgUrl = photo.src.large2x || photo.src.large;
    return await downloadFile(imgUrl, destPath);
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────
// PEXELS VIDEO
// ─────────────────────────────────────────────

export async function fetchPexelsVideo(query: string, destPath: string): Promise<boolean> {
  if (!PEXELS_API_KEY) return false;
  try {
    const res = await axios.get('https://api.pexels.com/videos/search', {
      headers: { Authorization: PEXELS_API_KEY },
      params: { query, per_page: 5, orientation: 'landscape', size: 'medium' },
      timeout: 15000,
    });
    const videos = res.data.videos;
    if (!videos?.length) return false;
    const video = videos[0];
    // Pick HD file, fallback to any
    const files = video.video_files || [];
    const hd = files.find((f: any) => f.quality === 'hd') || files[0];
    if (!hd?.link) return false;
    return await downloadFile(hd.link, destPath);
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────
// PIXABAY VIDEO
// ─────────────────────────────────────────────

export async function fetchPixabayVideo(query: string, destPath: string): Promise<boolean> {
  if (!PIXABAY_API_KEY) return false;
  try {
    const res = await axios.get('https://pixabay.com/api/videos/', {
      params: { key: PIXABAY_API_KEY, q: query, per_page: 5, video_type: 'film' },
      timeout: 15000,
    });
    const hits = res.data.hits;
    if (!hits?.length) return false;
    const video = hits[0];
    const videoUrl = video.videos?.medium?.url || video.videos?.small?.url;
    if (!videoUrl) return false;
    return await downloadFile(videoUrl, destPath);
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────
// INTERNET ARCHIVE — scrape free news footage MP4s
// ─────────────────────────────────────────────

export async function fetchArchiveVideo(query: string, destPath: string): Promise<boolean> {
  try {
    // Search Internet Archive for news footage
    const searchUrl = `https://archive.org/advancedsearch.php`;
    const res = await axios.get(searchUrl, {
      params: {
        q: `${query} news footage`,
        fl: 'identifier,title',
        rows: 5,
        output: 'json',
        mediatype: 'movies',
      },
      timeout: 15000,
    });

    const docs = res.data?.response?.docs;
    if (!docs?.length) return false;

    // Try each result until we get a working MP4
    for (const doc of docs) {
      try {
        const metaRes = await axios.get(`https://archive.org/metadata/${doc.identifier}`, {
          timeout: 10000,
        });
        const files: any[] = metaRes.data?.files || [];
        const mp4File = files.find(f =>
          f.name?.endsWith('.mp4') &&
          parseInt(f.size || '0') < 100 * 1024 * 1024 // under 100MB
        );
        if (!mp4File) continue;

        const mp4Url = `https://archive.org/download/${doc.identifier}/${mp4File.name}`;
        const ok = await downloadFile(mp4Url, destPath);
        if (ok) return true;
      } catch {
        continue;
      }
    }
    return false;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────
// POLLINATIONS.AI — free AI image generation
// ─────────────────────────────────────────────

export async function fetchPollinationsImage(prompt: string, destPath: string): Promise<boolean> {
  try {
    const encoded = encodeURIComponent(
      `News photography style, photojournalism, 16:9, ${prompt}. No text overlays.`
    );
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=1280&height=720&nologo=true`;
    // Pollinations can be slow — give it 45s
    const res = await axios({ url, method: 'GET', responseType: 'stream', timeout: 45000 });
    await streamPipeline(res.data, fs.createWriteStream(destPath));
    return fs.existsSync(destPath) && fs.statSync(destPath).size > 5000;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────
// MAIN EXPORT — get best available media for a story
// Returns array of local file paths (images + videos)
// ─────────────────────────────────────────────

export interface StoryMedia {
  images: string[];   // local .jpg paths
  videos: string[];   // local .mp4 paths
}

export async function fetchMediaForStory(
  title: string,
  storyId: string
): Promise<StoryMedia> {
  const keywords = extractKeywords(title);
  const result: StoryMedia = { images: [], videos: [] };

  console.log(`  🔍 Fetching media for: "${keywords}"`);

  // --- IMAGES ---
  // Try Pexels first, then Pollinations as fallback
  const img1 = path.join(MEDIA_TMP, `${storyId}_img1.jpg`);
  const img2 = path.join(MEDIA_TMP, `${storyId}_img2.jpg`);

  const pexelsImgOk = await fetchPexelsImage(keywords, img1);
  if (pexelsImgOk) {
    result.images.push(img1);
    console.log(`    ✅ Pexels image downloaded`);
  }

  // Always try to get an AI image (different visual style)
  const aiImgOk = await fetchPollinationsImage(title, img2);
  if (aiImgOk) {
    result.images.push(img2);
    console.log(`    ✅ AI image generated`);
  }

  // --- VIDEOS ---
  // Try Pexels video, then Pixabay, then Internet Archive
  const vid1 = path.join(MEDIA_TMP, `${storyId}_vid1.mp4`);
  const vid2 = path.join(MEDIA_TMP, `${storyId}_vid2.mp4`);

  const pexelsVidOk = await fetchPexelsVideo(keywords, vid1);
  if (pexelsVidOk) {
    result.videos.push(vid1);
    console.log(`    ✅ Pexels video downloaded`);
  }

  if (!pexelsVidOk) {
    const pixabayOk = await fetchPixabayVideo(keywords, vid1);
    if (pixabayOk) {
      result.videos.push(vid1);
      console.log(`    ✅ Pixabay video downloaded`);
    }
  }

  // Internet Archive as additional footage
  const archiveOk = await fetchArchiveVideo(keywords, vid2);
  if (archiveOk) {
    result.videos.push(vid2);
    console.log(`    ✅ Archive.org footage downloaded`);
  }

  if (result.images.length === 0 && result.videos.length === 0) {
    console.log(`    ⚠️  No media found — will use generated background`);
  }

  return result;
}

export { extractKeywords };
