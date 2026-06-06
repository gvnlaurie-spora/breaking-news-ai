"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const scraper_1 = require("../services/scraper");
async function main() {
    console.log("🚀 Starting news scraper...");
    if (!process.env.DATABASE_URL) {
        console.error("❌ DATABASE_URL not found");
        process.exit(1);
    }
    await (0, scraper_1.scrapeNews)();
    console.log("🏁 Scraper finished.");
    process.exit(0);
}
main().catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
});
