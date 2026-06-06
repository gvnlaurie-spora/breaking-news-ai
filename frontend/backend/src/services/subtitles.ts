import fs from "fs";

export function generateSubtitles(text: string, outputPath: string): void {
  // Split text into sentences (roughly)
  const sentences = text.split(/(?<=[.!?])\s+/);

  let srtContent = "";
  let startTime = 0;
  const durationPerSentence = 3; // 3 seconds per sentence

  sentences.forEach((sentence, index) => {
    const endTime = startTime + durationPerSentence;
    srtContent += `${index + 1}\n`;
    srtContent += `00:00:${startTime.toString().padStart(2, "0")},000 --> 00:00:${endTime.toString().padStart(2, "0")},000\n`;
    srtContent += `${sentence.trim()}\n\n`;
    startTime = endTime;
  });

  fs.writeFileSync(outputPath, srtContent.trim());
  console.log(`✅ Subtitles generated at: ${outputPath}`);
}
