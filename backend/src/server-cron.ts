/**
 * Minimal Express server for cron-job.org to trigger the pipeline.
 * - POST /api/run-pipeline/:show   ← cron-job.org hits this
 * - GET  /healthz                  ← Render health check
 * - GET  /status                   ← last run status
 */

import express from 'express';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { SHOWS } from './shows/config';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const CRON_SECRET = process.env.CRON_SECRET;
const LOCK_FILE = '/tmp/pipeline.lock';

if (!CRON_SECRET) {
  console.error('💥 CRON_SECRET env var is required');
  process.exit(1);
}

// =============================================================================
// Lock + status
// =============================================================================

interface RunState {
  runId: string;
  show: string;
  startedAt: string;
  finishedAt?: string;
  status: 'running' | 'success' | 'failed';
  exitCode?: number;
  logFile?: string;
}

const stateFile = '/tmp/pipeline-state.json';

function readState(): RunState | null {
  try { return JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch { return null; }
}
function writeState(state: RunState | null) {
  if (state === null) {
    if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);
  } else {
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  }
}
function isLocked(): boolean {
  return fs.existsSync(LOCK_FILE);
}
function lock() { fs.writeFileSync(LOCK_FILE, String(process.pid)); }
function unlock() { if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE); }

// =============================================================================
// Pipeline spawn
// =============================================================================

function runPipeline(showId: string): { runId: string; logFile: string } {
  const runId = `${showId}-${Date.now()}`;
  const logFile = `/tmp/pipeline-${runId}.log`;
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  console.log(`[${runId}] 🚀 Spawning pipeline for show=${showId}`);

  const child = spawn('npx', [
    'tsx',
    'src/scripts/build-news-show.ts',
    `--show=${showId}`,
  ], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  writeState({
    runId,
    show: showId,
    startedAt: new Date().toISOString(),
    status: 'running',
    logFile,
  });

  child.stdout.on('data', d => { process.stdout.write(d); logStream.write(d); });
  child.stderr.on('data', d => { process.stderr.write(d); logStream.write(d); });

  child.on('exit', (code, signal) => {
    const finishedAt = new Date().toISOString();
    const status = code === 0 ? 'success' : 'failed';
    console.log(`[${runId}] 🏁 Pipeline exited code=${code} signal=${signal} status=${status}`);
    writeState({
      ...readState()!,
      finishedAt,
      status,
      exitCode: code ?? -1,
    });
    unlock();
  });

  return { runId, logFile };
}

// =============================================================================
// HTTP server
// =============================================================================

const app = express();
app.use(express.json());

app.get('/healthz', (_req, res) => {
  res.json({
    status: 'ok',
    pipelineRunning: isLocked(),
    currentRun: readState(),
    uptimeSec: Math.floor(process.uptime()),
  });
});

app.get('/status', (_req, res) => {
  res.json({
    pipelineRunning: isLocked(),
    lastRun: readState(),
  });
});

app.post('/api/run-pipeline/:show', (req, res) => {
  // 1. Auth
  const provided = req.header('x-cron-secret');
  if (!provided || provided !== CRON_SECRET) {
    console.warn(`[auth] Rejected request from ${req.ip} — bad secret`);
    return res.status(401).json({ error: 'unauthorized' });
  }

  // 2. Validate show
  const { show } = req.params;
  if (!SHOWS.find(s => s.id === show)) {
    return res.status(400).json({
      error: 'unknown show',
      available: SHOWS.map(s => s.id),
    });
  }

  // 3. Prevent concurrent runs
  if (isLocked()) {
    const current = readState();
    return res.status(409).json({
      error: 'pipeline already running',
      current,
    });
  }

  // 4. Lock + spawn + return immediately
  lock();
  try {
    const { runId, logFile } = runPipeline(show);
    res.status(202).json({
      status: 'started',
      runId,
      show,
      logFile,
      message: `Pipeline started for show=${show}. Check /status for progress.`,
    });
  } catch (err: any) {
    unlock();
    console.error('Failed to spawn pipeline:', err);
    res.status(500).json({ error: 'spawn failed', detail: String(err) });
  }
});

// Catch-all for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'not found', path: req.path });
});

app.listen(PORT, () => {
  console.log(`[server] Cron trigger listening on :${PORT}`);
  console.log(`[server] Endpoints:`);
  for (const s of SHOWS) {
    console.log(`  POST /api/run-pipeline/${s.id}  →  ${s.label}`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => { console.log('SIGTERM, exiting'); process.exit(0); });
process.on('SIGINT',  () => { console.log('SIGINT, exiting');  process.exit(0); });
