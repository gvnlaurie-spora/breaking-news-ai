#!/usr/bin/env node
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

async function run() {
  console.log(`🎬 [${new Date().toISOString()}] Starting pipeline`);
  
  try {
    await execAsync('npm run build-news', { 
      cwd: process.cwd(),
      timeout: 45 * 60 * 1000,
      env: process.env 
    });
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
  
  const videosDir = path.join(process.cwd(), 'output', 'videos');
  if (!fs.existsSync(videosDir)) {
    console.error('❌ No videos directory found');
    process.exit(1);
  }
  
  const files = fs.readdirSync(videosDir).filter(f => f.endsWith('.mp4'));
  if (files.length === 0) {
    console.error('❌ No video generated');
    process.exit(1);
  }
  
  const latestVideo = files.sort().reverse()[0];
  const localPath = path.join(videosDir, latestVideo);
  const sizeMB = (fs.statSync(localPath).size / 1024 / 1024).toFixed(2);
  
  console.log(`\n✅ Pipeline complete!`);
  console.log(`📹 Video: ${latestVideo}`);
  console.log(`📊 Size: ${sizeMB} MB`);
  console.log(`📍 Path: ${localPath}`);
  console.log(`\n📥 Download from GitHub Actions → Artifacts section`);
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
