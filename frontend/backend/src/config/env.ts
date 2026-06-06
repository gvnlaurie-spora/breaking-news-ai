import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: process.env.PORT,
  FRONTEND_URL: process.env.FRONTEND_URL,
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
  YOUTUBE_CHANNEL_ID: process.env.YOUTUBE_CHANNEL_ID,
  OLLAMA_URL: process.env.OLLAMA_URL || "http://localhost:11434",
};
