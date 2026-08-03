'use strict';
//
// Process control + live state for Mode 1 (login-capacity.sh). Simpler than
// runner.js/liveState.js's split: login-capacity.sh has no log directory to
// discover and nothing to tail from disk — its only output is stdout, one
// step-table row per line, so this module owns the spawn, the stdout parse,
// and the run's in-memory state together. Raw stdout is also persisted to
// capacity-logs/<ts>.log so past capacity runs survive a dashboard restart.
//

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

const LOADTEST_DIR = path.join(__dirname, '..', '..');
const LOGS_DIR = path.join(LOADTEST_DIR, 'capacity-logs');
const STOP_GRACE_MS = 3000;

// login-capacity.sh prints e.g. "1      10/s         80         80         100.0%     2136     3034     3077    "
const ROW_RE = /^(\d+)\s+(\d+)\/s\s+(\d+)\s+(\d+)\s+([\d.]+)%\s+(\d+)\s+(\d+)\s+(\d+)\s*$/;

function parseRow(line) {
  const m = ROW_RE.exec(line.trim());
  if (!m) return null;
  const [, step, targetRate, attempts, successes, successPct, avgMs, p95Ms, maxMs] = m;
  return {
    step: Number(step),
    targetRate: Number(targetRate),
    attempts: Number(attempts),
    successes: Number(successes),
    successPct: Number(successPct),
    avgMs: Number(avgMs),
    p95Ms: Number(p95Ms),
    maxMs: Number(maxMs),
  };
}

class CapacityRunner extends EventEmitter {
  constructor() {
    super();
    this.child = null;
    this.ts = null;
    this.params = null;
    this.lines = [];
    this.rowsByStep = new Map();
    this.logStream = null;
    this.leftover = '';
    this.status = 'idle'; // idle | running | finished
    this.startedAt = null;
    this.finishedAt = null;
  }

  isActive() {
    return this.child !== null;
  }

  start(params) {
    if (this.isActive()) throw new Error('A capacity run is already active');
    const { startRate, rateStep, stepSec, maxRate } = params;
    for (const [key, value] of Object.entries({ startRate, rateStep, stepSec, maxRate })) {
      if (!Number.isInteger(value) || value < 1) throw new Error(`${key} must be a positive integer`);
    }

    fs.mkdirSync(LOGS_DIR, { recursive: true });
    this.ts = Math.floor(Date.now() / 1000);
    this.params = params;
    this.lines = [];
    this.rowsByStep = new Map();
    this.leftover = '';
    this.status = 'running';
    this.startedAt = Date.now();
    this.finishedAt = null;
    this.logStream = fs.createWriteStream(path.join(LOGS_DIR, `${this.ts}.log`));

    const env = {
      ...process.env,
      START_RATE: String(startRate),
      RATE_STEP: String(rateStep),
      STEP_SEC: String(stepSec),
      MAX_RATE: String(maxRate),
      AUTO_STOP: params.autoStop ? 'true' : 'false',
      SUCCESS_THRESHOLD: String(params.successThreshold ?? 95),
    };
    if (params.baseUrl) env.BASE_URL = params.baseUrl;
    if (params.usersFile) env.USERS_FILE = params.usersFile;

    const child = spawn('./login-capacity.sh', [], {
      cwd: LOADTEST_DIR,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
    });
    this.child = child;

    child.stdout.on('data', (chunk) => this._onData(chunk));
    child.stderr.on('data', (chunk) => this._onData(chunk));

    child.on('exit', (code) => {
      this.child = null;
      this.status = 'finished';
      this.finishedAt = Date.now();
      if (this.logStream) {
        this.logStream.end();
        this.logStream = null;
      }
      this.emit('exit', { code, ts: this.ts });
    });

    this.emit('started', this.getState());
    return { pid: child.pid, ts: this.ts };
  }

  _onData(chunk) {
    const text = chunk.toString('utf8');
    if (this.logStream) this.logStream.write(text);
    this.leftover += text;
    const parts = this.leftover.split('\n');
    this.leftover = parts.pop();
    for (const line of parts) {
      this.lines.push(line);
      const row = parseRow(line);
      // login-capacity.sh reprints the whole table in its own
      // "Zusammenfassung" — same values, keyed by the same step number, so
      // overwriting by step de-dupes instead of doubling every row.
      if (row) this.rowsByStep.set(row.step, row);
      this.emit('line', { line, row });
    }
  }

  // SIGTERM the whole process group first, SIGKILL after a grace period —
  // same reasoning as runner.js (curl can be slow to notice a signal).
  stop() {
    if (!this.isActive()) return false;
    const pid = this.child.pid;
    try {
      process.kill(-pid, 'SIGTERM');
    } catch {
      return false;
    }
    setTimeout(() => {
      try {
        process.kill(-pid, 0);
        process.kill(-pid, 'SIGKILL');
      } catch {
        // group already gone — the common case
      }
    }, STOP_GRACE_MS);
    return true;
  }

  getState() {
    return {
      status: this.status,
      ts: this.ts,
      params: this.params,
      lines: this.lines,
      rows: [...this.rowsByStep.values()].sort((a, b) => a.step - b.step),
      startedAt: this.startedAt,
      finishedAt: this.finishedAt,
    };
  }
}

// Shared with capacityRuns.js so a past run's table de-dupes the same way
// the live view does (login-capacity.sh reprints its table verbatim in its
// own "Zusammenfassung", keyed by the same step number).
function dedupeRowsByStep(rows) {
  const byStep = new Map();
  for (const row of rows) byStep.set(row.step, row);
  return [...byStep.values()].sort((a, b) => a.step - b.step);
}

module.exports = new CapacityRunner();
module.exports.parseRow = parseRow;
module.exports.dedupeRowsByStep = dedupeRowsByStep;
module.exports.LOGS_DIR = LOGS_DIR;
