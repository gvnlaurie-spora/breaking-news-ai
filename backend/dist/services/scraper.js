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
const filter_1 = require("./filter");
const parser = new rss_parser_1.default({
    timeout: 15000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
});
const RSS_FEEDS = [
    { name: "BBC", url: "https://feeds.bbci.co.uk/news/rss.xml", region: "Europe" },
    { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", region: "Middle East" },
    { name: "DW", url: "https://rss.dw.com/rdf/rss-en-all", region: "Europe" },
    { name: "TechCrunch", url: "https://techcrunch.com/feed/", region: "USA" },
    { name: "The Guardian", url: "https://www.theguardian.com/world/rss", region: "Europe" },
    { name: "NY Times", url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", region: "USA" },
    { name: "Fox News", url: "https://moxie.foxnews.com/google-publisher/latest.xml", region: "USA" },
    { name: "NPR", url: "https://feeds.npr.org/1001/rss.xml", region: "USA" },
    { name: "Reuters", url: "https://feeds.reuters.com/reuters/topNews", region: "Global" },
    { name: "AP News", url: "https://rsshub.app/apnews/topics/apf-topnews", region: "Global" },
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
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}
async function scrapeNews() {
    console.log("🔄 Starting news scraper (Africa excluded)...");
    try {
        await prisma_1.prisma.$connect();
        console.log("✅ Database connected");
    }
    catch (error) {
        console.error("❌ Database connection failed:", error);
        return;
    }
    let totalSaved = 0;
    let totalFiltered = 0;
    for (const feed of RSS_FEEDS) {
        console.log(`\n📰 Fetching from ${feed.name}...`);
        try {
            const feedData = await fetchFeedWithRetry(feed.url);
            let savedCount = 0;
            let filteredCount = 0;
            for (const item of feedData.items) {
                if (!item.title || !item.link)
                    continue;
                // ── AFRICA FILTER ──
                if ((0, filter_1.isAfricanNews)(item.title, item.contentSnippet || item.description || '', feed.region)) {
                    filteredCount++;
                    continue;
                }
                const category = (0, filter_1.categoriseArticle)(item.title);
                try {
                    await prisma_1.prisma.article.upsert({
                        where: { url: item.link },
                        update: {
                            title: item.title,
                            description: item.contentSnippet || item.description || "",
                            publishedAt: new Date(item.pubDate || Date.now()),
                            category,
                        },
                        create: {
                            title: item.title,
                            description: item.contentSnippet || item.description || "",
                            url: item.link,
                            publishedAt: new Date(item.pubDate || Date.now()),
                            category,
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
                    // Skip duplicates silently
                }
            }
            console.log(`📊 ${feed.name}: saved ${savedCount}, filtered (Africa) ${filteredCount}`);
            totalSaved += savedCount;
            totalFiltered += filteredCount;
        }
        catch (error) {
            console.error(`❌ FAILED ${feed.name}:`, error.message);
        }
    }
    console.log(`\n✅ Scraping done. Saved: ${totalSaved} | Africa filtered: ${totalFiltered}`);
    await prisma_1.prisma.$disconnect();
}
