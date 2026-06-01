"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = require("./app");
const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;
const start = async () => {
    try {
        await app_1.app.listen({ port, host: "0.0.0.0" });
        console.log(`✅ Server running on http://localhost:${port}`);
        console.log(`📝 Health check: http://localhost:${port}/health`);
        console.log(`📰 Articles API: http://localhost:${port}/api/articles`);
    }
    catch (err) {
        console.error("❌ Server failed to start:", err);
        process.exit(1);
    }
};
start();
