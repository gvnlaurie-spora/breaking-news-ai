import { createCanvas } from "canvas";
import fs from "fs";
import path from "path";

export async function generateThumbnail(
  title: string,
  category: string,
  outputPath: string
): Promise<void> {
  const width = 1280;
  const height = 720;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  // Category-based color overlay
  const categoryColors: Record<string, string> = {
    politics: "#8B0000", // Dark Red
    business: "#006400", // Dark Green
    technology: "#800080", // Purple
    war: "#FF0000", // Red
    default: "#FF8C00", // Dark Orange
  };
  const color = categoryColors[category.toLowerCase()] || categoryColors.default;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.3;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1.0;

  // Add "BREAKING" text
  ctx.font = "bold 72px Arial";
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.fillText("BREAKING", width / 2, height / 2 - 100);

  // Add title (split into lines if too long)
  ctx.font = "bold 48px Arial";
  const maxWidth = width - 100;
  const words = title.split(" ");
  let line = "";
  let y = height / 2 - 20;

  for (const word of words) {
    const testLine = line + word + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line.length > 0) {
      ctx.fillText(line, width / 2, y);
      line = word + " ";
      y += 60;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, width / 2, y);

  // Add category tag
  ctx.font = "bold 36px Arial";
  ctx.fillStyle = "#FFD700"; // Gold
  ctx.fillText(`#${category.toUpperCase()}`, width / 2, height - 100);

  // Save thumbnail
  const out = fs.createWriteStream(outputPath);
  const stream = canvas.createPNGStream();
  stream.pipe(out);
  out.on("finish", () => console.log(`✅ Thumbnail generated at: ${outputPath}`));
}
