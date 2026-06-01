"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
require("dotenv/config");
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const articles_1 = __importDefault(require("./routes/articles"));
const ai_1 = __importDefault(require("./routes/ai"));
const scraper_1 = __importDefault(require("./routes/scraper"));
exports.app = (0, fastify_1.default)({
    logger: true,
});
// Security plugins
exports.app.register(cors_1.default, {
    origin: true,
    credentials: true,
});
exports.app.register(helmet_1.default);
exports.app.register(rate_limit_1.default, {
    max: 100,
    timeWindow: "15 minutes",
});
// Register routes
exports.app.register(articles_1.default, { prefix: "/api/articles" });
exports.app.register(ai_1.default, { prefix: "/api" });
exports.app.register(scraper_1.default, { prefix: "/api" });
// Health check route
exports.app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
});
// Register video routes
const video_1 = __importDefault(require("./routes/video"));
exports.app.register(video_1.default, { prefix: "/api" });
