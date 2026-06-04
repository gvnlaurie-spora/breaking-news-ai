import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";

ffmpeg.setFfmpegPath("/usr/bin/ffmpeg"); // Ensure FFmpeg is in this path

// --- Create a video from audio + background ---
export async function createVideoFromAudio(
  audioPath: string,
  backgroundImage: string,
  outputPath: string,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(backgroundImage)
      .input(audioPath)
      .outputOptions([
        "-c:v libx264",
        "-preset ultrafast",
        "-tune stillimage",
        "-c:a aac",
        "-b:a 192k",
        "-shortest", // End video when audio ends
      ])
      .output(outputPath)
      .on("end", () => {
        console.log(`✅ Video created at: ${outputPath}`);
        resolve();
      })
      .on("error", (err) => {
        console.error("❌ FFmpeg error:", err);
        reject(err);
      })
      .run();
  });
}

// --- Add subtitles to a video ---
export async function addSubtitlesToVideo(
  videoPath: string,
  subtitlesPath: string,
  outputPath: string
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .input(subtitlesPath)
      .outputOptions([
        "-c:v libx264",
        "-c:a copy",
        "-vf subtitles=${subtitlesPath}:force_style='Fontsize=24,PrimaryColour=&HFFFFFF&'",
      ])
      .output(outputPath)
      .on("end", () => {
        console.log(`✅ Subtitles added to video: ${outputPath}`);
        resolve();
      })
      .on("error", (err) => {
        console.error("❌ Subtitle addition failed:", err);
        reject(err);
      })
      .run();
  });
}
