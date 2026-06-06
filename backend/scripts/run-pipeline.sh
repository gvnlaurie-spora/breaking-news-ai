#!/bin/bash
# Breaking News AI - Automated Broadcast Pipeline

echo "========================================="
echo "📺 Breaking News AI Broadcast Starting"
echo "========================================="
echo "Time: $(date)"

cd /opt/render/project/src/backend

# Run the full pipeline
echo "📰 Scraping news..."
npm run scrape

echo "🤖 Processing with AI..."
npm run process-articles

echo "🎬 Generating video..."
npm run generate-videos

echo "📤 Uploading to YouTube..."
npm run upload-videos

echo "✅ Broadcast complete at $(date)"
