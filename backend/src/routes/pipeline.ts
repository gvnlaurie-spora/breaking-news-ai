import { Router, Request, Response } from "express";
import { exec } from "child_process";
import path from "path";

const router = Router();

// Determine which show to run based on UTC hour
function getShowForTime(): string {
  const hour = new Date().getUTCHours();
  
  if (hour >= 0 && hour < 4) return 'night';
  if (hour >= 4 && hour < 8) return 'morning';
  if (hour >= 8 && hour < 14) return 'noon';
  if (hour >= 14 && hour < 20) return 'evening';
  return 'night';
}

// Health check endpoint (no auth required)
router.get("/api/pipeline-health", (req: Request, res: Response) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Trigger pipeline endpoint
router.get("/api/pipeline/trigger", (req: Request, res: Response) => {
  const { secret } = req.query;
  const cronSecret = process.env.CRON_SECRET;
  
  // Validate secret
  if (!cronSecret || secret !== cronSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const show = getShowForTime();
  const scriptPath = path.join(__dirname, "..", "scripts", "build-news-show.ts");
  const backendDir = path.join(__dirname, "..", "..");
  
  // Run pipeline in background
  exec(`npx ts-node ${scriptPath} --show=${show}`, {
    cwd: backendDir,
    env: { ...process.env }
  }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Pipeline error for ${show}:`, error);
      console.error("Stderr:", stderr);
    } else {
      console.log(`Pipeline ${show} completed:`, stdout);
    }
  });
  
  // Return immediately
  res.json({ 
    status: "accepted", 
    show, 
    utcHour: new Date().getUTCHours(),
    timestamp: new Date().toISOString(),
    message: `Pipeline for ${show} show started in background`
  });
});

export default router;
