require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

async function test() {
  console.log("Testing database connection...");
  console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);
  
  const prisma = new PrismaClient();
  
  try {
    const result = await prisma.$queryRaw`SELECT NOW() as current_time`;
    console.log("✅ Database connection successful!");
    console.log("Current time:", result[0].current_time);
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
