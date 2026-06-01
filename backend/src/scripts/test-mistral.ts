import "dotenv/config";
import { setDefaultResultOrder } from 'dns';
import { generateSummary, generateHook, generateScript } from "../services/ai/mistral";

// Force IPv4 first - this MUST be at the very top
setDefaultResultOrder('ipv4first');

// Also set environment variable
process.env.NODE_OPTIONS = '--dns-result-order=ipv4first';

async function testMistral(): Promise<void> {
  console.log("🧪 Testing Mistral AI integration with IPv4 fix...\n");
  console.log("Node version:", process.version);
  console.log("DNS order forced to IPv4 first\n");
  
  if (!process.env.MISTRAL_API_KEY) {
    console.error("❌ MISTRAL_API_KEY not found in .env file");
    process.exit(1);
  }
  
  console.log("✅ API key found, testing connection...\n");
  
  const testArticle = {
    title: "AI Breakthrough: New Model Can Generate Videos from Text",
    description: "Researchers have developed a new AI model that can create realistic videos from text descriptions.",
    content: "The new model, called VideoGen, uses a diffusion process to generate video frames sequentially.",
    category: "technology"
  };
  
  try {
    console.log("📝 Testing summary generation...");
    const summary = await generateSummary(testArticle);
    console.log("✅ Summary:", summary);
    console.log("\n");
    
    console.log("🎉 Test passed! Mistral AI is working.");
  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
    
    // Try a simple curl test to diagnose
    console.log("\n🔍 Running diagnostic...");
    const { execSync } = require('child_process');
    try {
      const result = execSync('curl -s -o /dev/null -w "%{http_code}" https://api.mistral.ai/v1/models', {
        timeout: 10000,
        env: { ...process.env, NODE_OPTIONS: '--dns-result-order=ipv4first' }
      });
      console.log(`Curl to Mistral returned status: ${result}`);
    } catch (curlError: any) {
      console.log("Curl also failed:", curlError.message);
    }
  }
}

testMistral();
