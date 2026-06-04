"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processScripts = processScripts;
const videoGenerator_1 = require("../services/videoGenerator");
async function processScripts() {
    // Your script processing logic here
    const scriptIds = ['script-1', 'script-2']; // Replace with actual data
    for (const scriptId of scriptIds) {
        const videoUrl = await (0, videoGenerator_1.generateVideo)(scriptId);
        console.log(`Video created: ${videoUrl}`);
    }
}
