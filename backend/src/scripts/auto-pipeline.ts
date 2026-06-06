import "dotenv/config";
import { execSync } from "child_process";
import { prisma } from "../utils/prisma";
import cron from "node-cron";

const isDryRun = process.argv.includes("--dry-run");
const runOnce  = process.argv.includes("--once");

function run(cmd: string, label: string): boolean {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`▶  ${label}`);
  console.log(`${"─".repeat(60)}`);

  if (isDryRun) {
    console.log("⚠️  DRY RUN — skipped\n");
    return true;
  }

  try {
    execSync(cmd, { stdio: "inherit", shell: "/bin/bash" });
    console.log(`✅ ${label} — done`);
    return true;
  } catch {
    console.error(`❌ ${label} — FAILED`);
    return false;
  }
}

async function runPipeline() {
  const start = Date.now();
  console.log("\n" + "═".repeat(60));
  console.log("  BREAKING NEWS AI — FULL PIPELINE");
  console.log(`  ${new Date().toLocaleString()}`);
  console.log("═".repeat(60));

  if (isDryRun) console.log("\n⚠️  DRY RUN MODE — no real actions\n");

  // Step 1: Scrape
  const s1 = run("npm run scrape", "Step 1: Scrape news (Africa excluded)");
  if (!s1) { console.error("Pipeline aborted at scrape."); return; }

  // Step 2: Generate AI scripts
  const s2 = run("npm run process-articles", "Step 2: Generate AI scripts (Mistral)");
  if (!s2) { console.error("Pipeline aborted at process-articles."); return; }

  // Step 3: Compile 30-minute video
  const s3 = run("npm run generate-videos", "Step 3: Compile 30-minute video");
  if (!s3) { console.error("Pipeline aborted at generate-videos."); return; }

  // Step 4: Upload to YouTube
  const s4 = run("npm run upload-videos", "Step 4: Upload to YouTube");
  if (!s4) { console.error("Upload failed — video still saved locally."); }

  // Stats
  const mins = ((Date.now() - start) / 60000).toFixed(1);
  console.log("\n" + "═".repeat(60));
  console.log(`  ✅ PIPELINE COMPLETE — ${mins} minutes`);

  if (!isDryRun) {
    try {
      const articles = await prisma.article.count();
      const scripts  = await prisma.script.count({ where: { status: "completed" } });
      console.log(`  📊 Articles in DB: ${articles} | Videos compiled: ${scripts}`);
    } catch {}
  }

  console.log(`  📺 https://www.youtube.com/channel/UCwyDBSBUKsm3xAd_xakqdxw`);
  console.log("═".repeat(60) + "\n");
}

async function main() {
  if (runOnce || isDryRun) {
    await runPipeline();
    if (!isDryRun) await prisma.$disconnect();
    return;
  }

  // Run immediately on start, then every 4 hours
  console.log("⏰ Breaking News AI scheduler started — runs every 4 hours");
  console.log("   First run starting now...\n");

  await runPipeline();

  // Every 4 hours: 0:00, 4:00, 8:00, 12:00, 16:00, 20:00
  cron.schedule("0 */4 * * *", async () => {
    console.log(`\n⏰ Cron triggered at ${new Date().toLocaleString()}`);
    await runPipeline();
  });
}

main().catch(async (err) => {
  console.error("Fatal:", err);
  await prisma.$disconnect();
  process.exit(1);
});
