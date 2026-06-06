import { execFile } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { promisify } from "util";
import path from "path";

const execFileAsync = promisify(execFile);

const VOICE_MAP = {
  male: "en-US-ChristopherNeural",
  female: "en-US-JennyNeural",
};

async function generateWithEdgeTts(text: string, outputPath: string, voice: string): Promise<void> {
  const dir = path.dirname(outputPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  // edge-tts outputs to mp3 directly
  await execFileAsync(
    "edge-tts",
    ["--voice", voice, "--text", text.substring(0, 3000), "--write-media", outputPath],
    { timeout: 60_000 }
  );
}

async function generateWithEspeak(text: string, outputPath: string): Promise<void> {
  const dir = path.dirname(outputPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const clean = text.replace(/[^a-zA-Z0-9 .,!?'\-]/g, " ").trim().substring(0, 2000);
  const wavPath = outputPath.replace(/\.mp3$/, ".wav");

  await execFileAsync("espeak", ["-v", "en-us", "-s", "145", "-g", "8", "-w", wavPath, clean], {
    timeout: 60_000,
  });
  await execFileAsync("ffmpeg", ["-y", "-i", wavPath, "-c:a", "libmp3lame", "-q:a", "2", outputPath], {
    timeout: 30_000,
  });
  try { require("fs").unlinkSync(wavPath); } catch { /* ignore */ }
}

export async function generateTTS(
  text: string,
  outputPath: string,
  voice: "male" | "female" = "male"
): Promise<void> {
  const voiceName = VOICE_MAP[voice];
  console.log(`  🎤 Edge TTS: generating ${path.basename(outputPath)}...`);

  try {
    await generateWithEdgeTts(text, outputPath, voiceName);
    console.log(`  ✅ TTS saved: ${path.basename(outputPath)}`);
  } catch (edgeErr) {
    console.warn(`  ⚠️  edge-tts failed, using espeak fallback:`, (edgeErr as Error).message);
    await generateWithEspeak(text, outputPath);
    console.log(`  ✅ TTS saved (espeak): ${path.basename(outputPath)}`);
  }
}
