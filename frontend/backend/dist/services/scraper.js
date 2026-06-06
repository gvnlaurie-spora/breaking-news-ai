"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeNews = scrapeNews;
require("dotenv/config");
// @ts-ignore
const rss_parser_1 = __importDefault(require("rss-parser"));
const prisma_1 = require("../utils/prisma");
// --- Enhanced Parser with Custom Settings ---
const parser = new rss_parser_1.default({
    timeout: 15000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
});
// Only include working RSS feeds (removed Reuters and CNN)
const RSS_FEEDS = [
    { name: "BBC", url: "https://feeds.bbci.co.uk/news/rss.xml", region: "Europe" },
    { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", region: "Middle East" },
    { name: "DW", url: "https://rss.dw.com/rdf/rss-en-all", region: "Europe" },
    { name: "TechCrunch", url: "https://techcrunch.com/feed/", region: "USA" },
    { name: "The Guardian", url: "https://www.theguardian.com/world/rss", region: "Europe" },
    { name: "NY Times", url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", region: "USA" },
    { name: "Fox News", url: "https://moxie.foxnews.com/google-publisher/latest.xml", region: "USA" },
    { name: "NPR", url: "https://feeds.npr.org/1001/rss.xml", region: "USA" },
];
async function fetchFeedWithRetry(url, maxRetries = 2, delay = 3000) {
    let lastError;
    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await parser.parseURL(url);
        }
        catch (error) {
            lastError = error;
            if (i < maxRetries) {
                console.log(`   ⏳ Retry ${i + 1}/${maxRetries} for ${url} in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}
async function scrapeNews() {
    console.log("🔄 Starting news scraper with working feeds...");
    try {
        await prisma_1.prisma.$connect();
        console.log("✅ Database connected");
    }
    catch (error) {
        console.error("❌ Database connection failed:", error);
        return;
    }
    let totalSaved = 0;
    for (const feed of RSS_FEEDS) {
        console.log(`\n📰 Fetching from ${feed.name}...`);
        try {
            const feedData = await fetchFeedWithRetry(feed.url);
            console.log(`   ✅ Downloaded feed, found ${feedData.items.length} total items.`);
            let savedCount = 0;
            for (const item of feedData.items) {
                if (!item.title || !item.link)
                    continue;
                const titleLower = item.title.toLowerCase();
                let category = "general";
                if (titleLower.includes("war") || titleLower.includes("attack") || titleLower.includes("election")) {
                    category = "politics";
                }
                else if (titleLower.includes("economy") || titleLower.includes("market") || titleLower.includes("trade")) {
                    category = "business";
                }
                else if (titleLower.includes("tech") || titleLower.includes("ai") || titleLower.includes("software")) {
                    category = "technology";
                }
                else if (titleLower.includes("health") || titleLower.includes("covid") || titleLower.includes("medical")) {
                    category = "health";
                }
                else if (titleLower.includes("climate") || titleLower.includes("weather") || titleLower.includes("environment")) {
                    category = "environment";
                }
                try {
                    await prisma_1.prisma.article.upsert({
                        where: { url: item.link },
                        update: {
                            title: item.title,
                            description: item.contentSnippet || item.description || "",
                            publishedAt: new Date(item.pubDate || Date.now()),
                            category: category,
                        },
                        create: {
                            title: item.title,
                            description: item.contentSnippet || item.description || "",
                            url: item.link,
                            publishedAt: new Date(item.pubDate || Date.now()),
                            category: category,
                            region: feed.region,
                            source: {
                                connectOrCreate: {
                                    where: { name: feed.name },
                                    create: { name: feed.name, url: feed.url }
                                }
                            }
                        }
                    });
                    savedCount++;
                }
                catch (dbError) {
                    console.error(`   ❌ DB Error: ${dbError.message}`);
                }
            }
            console.log(`📊 ${feed.name}: Successfully saved ${savedCount} items.`);
            totalSaved += savedCount;
        }
        catch (error) {
            console.error(`❌ FAILED to process ${feed.name}:`, error.message);
        }
    }
    console.log(`\n✅ News scraping completed! Total saved: ${totalSaved} articles.`);
    await prisma_1.prisma.$disconnect();
}
