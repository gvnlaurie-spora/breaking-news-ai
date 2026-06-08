#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
async function run() {
    console.log(`🎬 [${new Date().toISOString()}] Starting pipeline`);
    try {
        await execAsync('npm run build-news', {
            cwd: process.cwd(),
            timeout: 45 * 60 * 1000,
            env: process.env
        });
    }
    catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
    const videosDir = path_1.default.join(process.cwd(), 'output', 'videos');
    if (!fs_1.default.existsSync(videosDir)) {
        console.error('❌ No videos directory found');
        process.exit(1);
    }
    const files = fs_1.default.readdirSync(videosDir).filter(f => f.endsWith('.mp4'));
    if (files.length === 0) {
        console.error('❌ No video generated');
        process.exit(1);
    }
    const latestVideo = files.sort().reverse()[0];
    const localPath = path_1.default.join(videosDir, latestVideo);
    const sizeMB = (fs_1.default.statSync(localPath).size / 1024 / 1024).toFixed(2);
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
