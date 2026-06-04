import { generateVideo } from '../services/videoGenerator';

async function processScripts() {
  // Your script processing logic here
  const scriptIds = ['script-1', 'script-2']; // Replace with actual data
  
  for (const scriptId of scriptIds) {
    const videoUrl = await generateVideo(scriptId);
    console.log(`Video created: ${videoUrl}`);
  }
}

// Export or run based on your needs
export { processScripts };
