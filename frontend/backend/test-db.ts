import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

async function test() {
  console.log("Testing database connection...");
  console.log("DATABASE_URL:", process.env.DATABASE_URL?.replace(/password[^@]*/, 'password=***'));
  
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  });
  
  try {
    const result = await prisma.$queryRaw`SELECT NOW() as current_time, version() as pg_version`;
    console.log("✅ Database connection successful!");
    console.log("Current time:", result);
  } catch (error) {
    console.error("❌ Database connection failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
