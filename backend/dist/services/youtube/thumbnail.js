"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateThumbnail = generateThumbnail;
const canvas_1 = require("canvas");
const fs_1 = __importDefault(require("fs"));
async function generateThumbnail(title, category, outputPath) {
    const width = 1280;
    const height = 720;
    const canvas = (0, canvas_1.createCanvas)(width, height);
    const ctx = canvas.getContext("2d");
    // Background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);
    // Category-based color overlay
    const categoryColors = {
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
        }
        else {
            line = testLine;
        }
    }
    ctx.fillText(line, width / 2, y);
    // Add category tag
    ctx.font = "bold 36px Arial";
    ctx.fillStyle = "#FFD700"; // Gold
    ctx.fillText(`#${category.toUpperCase()}`, width / 2, height - 100);
    // Save thumbnail
    const out = fs_1.default.createWriteStream(outputPath);
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    out.on("finish", () => console.log(`✅ Thumbnail generated at: ${outputPath}`));
}
