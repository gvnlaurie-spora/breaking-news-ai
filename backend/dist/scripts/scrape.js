"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const scraper_1 = require("../services/scraper");
async function main() {
    console.log("🚀 Starting news scraper...");
    console.log("📝 Database URL exists:", !!process.env.DATABASE_URL);
    if (!process.env.DATABASE_URL) {
        console.error("❌ DATABASE_URL not found in environment variables");
        console.log("💡 Make sure your .env file exists and has DATABASE_URL");
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
