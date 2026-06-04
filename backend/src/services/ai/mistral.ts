import { env } from "../../config/env";
import https from 'https';

// Create an Agent that forces IPv4
const agent = new https.Agent({
  family: 4, // Force IPv4
  timeout: 30000,
});

async function callMistral(prompt: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  
  const url = new URL("https://api.mistral.ai/v1/chat/completions");
  
  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: "mistral-tiny",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
      }),
      signal: controller.signal,
      // @ts-ignore - Node.js specific option
      agent: agent,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mistral API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    return (data as any).choices[0].message.content;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

export async function generateSummary(article: { title: string; description?: string; content: string }): Promise<string> {
  const prompt = `Summarize this news article in 2-3 short sentences.
  
Title: ${article.title}
Content: ${article.content.substring(0, 800)}

Summary:`;
  return callMistral(prompt);
}

export async function generateHook(article: { title: string; category: string }): Promise<string> {
  const prompt = `Write ONE short, dramatic hook (max 8 words) for a breaking news video: "${article.title.substring(0, 100)}"

Hook:`;
  return callMistral(prompt);
}

export async function generateScript(article: { title: string; description?: string; content: string; category: string }): Promise<string> {
  const prompt = `Write a quick 30-second script for a news video about: ${article.title.substring(0, 100)}
  
Structure:
HOOK: Grab attention
NEWS: Key facts (2-3 sentences)
WRAP: Call to action

Script:`;
  return callMistral(prompt);
}
