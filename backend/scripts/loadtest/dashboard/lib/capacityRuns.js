'use strict';
//
// Reads past capacity-logs/<ts>.log files — the Mode 1 equivalent of runs.js.
// Each file is raw stdout from a login-capacity.sh run; re-parsed with the
// same parseRow() capacityRunner.js uses live, so a past run's table matches
// what was shown while it was running.
//

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { parseRow, dedupeRowsByStep, LOGS_DIR } = require('./capacityRunner');

const RUN_ID_RE = /^(\d+)\.log$/;

async function listRuns() {
  const entries = await fsp.readdir(LOGS_DIR).catch(() => []);
  return entries
    .map((name) => RUN_ID_RE.exec(name))
    .filter(Boolean)
    .map((m) => m[1])
    .sort((a, b) => Number(b) - Number(a));
}

async function getRun(ts) {
  if (!/^\d+$/.test(ts)) throw new Error('invalid run id');
  const text = await fsp.readFile(path.join(LOGS_DIR, `${ts}.log`), 'utf8').catch(() => null);
  if (text === null) return null;
  const lines = text.split('\n').filter((l) => l.length > 0);
  const rows = dedupeRowsByStep(lines.map(parseRow).filter(Boolean));
  return { ts, lines, rows };
}

module.exports = { listRuns, getRun };
