"use strict";
/**
 * Minimal Express server for cron-job.org to trigger the pipeline.
 * - POST /api/run-pipeline/:show   ← cron-job.org hits this
 * - GET  /healthz                  ← Render health check
 * - GET  /status                   ← last run status
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const config_1 = require("./shows/config");
const PORT = parseInt(process.env.PORT ?? '3000', 10);
const CRON_SECRET = process.env.CRON_SECRET;
const LOCK_FILE = '/tmp/pipeline.lock';
if (!CRON_SECRET) {
    console.error('💥 CRON_SECRET env var is required');
    process.exit(1);
}
const stateFile = '/tmp/pipeline-state.json';
function readState() {
    try {
        return JSON.parse(fs_1.default.readFileSync(stateFile, 'utf8'));
    }
    catch {
        return null;
    }
}
function writeState(state) {
    if (state === null) {
        if (fs_1.default.existsSync(stateFile))
            fs_1.default.unlinkSync(stateFile);
    }
    else {
        fs_1.default.writeFileSync(stateFile, JSON.stringify(state, null, 2));
    }
}
function isLocked() {
    return fs_1.default.existsSync(LOCK_FILE);
}
function lock() { fs_1.default.writeFileSync(LOCK_FILE, String(process.pid)); }
function unlock() { if (fs_1.default.existsSync(LOCK_FILE))
    fs_1.default.unlinkSync(LOCK_FILE); }
// =============================================================================
// Pipeline spawn
// =============================================================================
function runPipeline(showId) {
    const runId = `${showId}-${Date.now()}`;
    const logFile = `/tmp/pipeline-${runId}.log`;
    const logStream = fs_1.default.createWriteStream(logFile, { flags: 'a' });
    console.log(`[${runId}] 🚀 Spawning pipeline for show=${showId}`);
    const child = (0, child_process_1.spawn)('npx', [
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
            ...readState(),
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
const app = (0, express_1.default)();
app.use(express_1.default.json());
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
    if (!config_1.SHOWS.find(s => s.id === show)) {
        return res.status(400).json({
            error: 'unknown show',
            available: config_1.SHOWS.map(s => s.id),
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
    }
    catch (err) {
        unlock();
        console.error('Failed to spawn pipeline:', err);
        res.status(500).json({ error: 'spawn failed', detail: String(err) });
    }
});
// Catch-all for unknown routes
app.use((req, res) => {
    res.status(404).json({ error: 'not found', path: req.path });
});
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] Cron trigger listening on :${PORT}`);
    console.log(`[server] Endpoints:`);
    for (const s of config_1.SHOWS) {
        console.log(`  POST /api/run-pipeline/${s.id}  →  ${s.label}`);
    }
});
// Graceful shutdown
process.on('SIGTERM', () => { console.log('SIGTERM, exiting'); process.exit(0); });
process.on('SIGINT', () => { console.log('SIGINT, exiting'); process.exit(0); });
