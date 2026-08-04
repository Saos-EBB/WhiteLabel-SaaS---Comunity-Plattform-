'use strict';
//
// Reads past capacity-logs/<ts>.log files — the Mode 1 equivalent of runs.js.
// Each file is raw stdout from a login-capacity.sh run; re-parsed with the
// same parseRow() capacityRunner.js uses live, so a past run's table matches
// what was shown while it was running. Params (startRate/rateStep/stepSec/
// maxRate/...) come from the <ts>.json sidecar capacityRunner.js writes at
// start — logs written before that sidecar existed simply have no params,
// which readParams() reports as null rather than throwing.
//

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { parseRow, dedupeRowsByStep, LOGS_DIR } = require('./capacityRunner');

const RUN_ID_RE = /^(\d+)\.log$/;

async function readParams(ts) {
  try {
    const raw = await fsp.readFile(path.join(LOGS_DIR, `${ts}.json`), 'utf8');
    return JSON.parse(raw).params ?? null;
  } catch {
    return null;
  }
}

async function readRows(ts) {
  const text = await fsp.readFile(path.join(LOGS_DIR, `${ts}.log`), 'utf8').catch(() => null);
  if (text === null) return null;
  const lines = text.split('\n').filter((l) => l.length > 0);
  return dedupeRowsByStep(lines.map(parseRow).filter(Boolean));
}

async function listRuns() {
  const entries = await fsp.readdir(LOGS_DIR).catch(() => []);
  const ids = entries
    .map((name) => RUN_ID_RE.exec(name))
    .filter(Boolean)
    .map((m) => m[1])
    .sort((a, b) => Number(b) - Number(a));

  return Promise.all(
    ids.map(async (ts) => {
      const [rows, params] = await Promise.all([readRows(ts), readParams(ts)]);
      return { ts, params, rows: rows || [] };
    }),
  );
}

async function getRun(ts) {
  if (!/^\d+$/.test(ts)) throw new Error('invalid run id');
  const text = await fsp.readFile(path.join(LOGS_DIR, `${ts}.log`), 'utf8').catch(() => null);
  if (text === null) return null;
  const lines = text.split('\n').filter((l) => l.length > 0);
  const rows = dedupeRowsByStep(lines.map(parseRow).filter(Boolean));
  const params = await readParams(ts);
  return { ts, lines, rows, params };
}

module.exports = { listRuns, getRun };
