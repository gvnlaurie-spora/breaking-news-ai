require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function test() {
  console.log("DATABASE_URL:", process.env.DATABASE_URL);
  try {
    await prisma.$connect();
    console.log("✅ Database connected!");
    const result = await prisma.$queryRaw`SELECT NOW() as time`;
    console.log("✅ Query successful:", result);
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
