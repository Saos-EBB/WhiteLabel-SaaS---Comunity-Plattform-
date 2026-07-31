'use strict';
//
// Reads past (and the current) loadtest-logs/<ts>/ runs. Numbers come
// from the same computeStats() used for the live view, applied to
// _all_rows.csv — so a past run's table matches summary.txt's own
// per-path numbers exactly (see aggregator.js's header comment for the
// one known exception: summary.txt's single "Requests gesamt" line is
// off by one, counting its own header row).
//

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { parseRow, computeStats } = require('./aggregator');

const LOADTEST_DIR = path.join(__dirname, '..', '..');
const LOGS_DIR = path.join(LOADTEST_DIR, 'loadtest-logs');
const RUN_ID_RE = /^\d+$/;

async function listRuns() {
  const entries = await fsp.readdir(LOGS_DIR, { withFileTypes: true }).catch(() => []);
  const ids = entries
    .filter((e) => e.isDirectory() && RUN_ID_RE.test(e.name))
    .map((e) => e.name)
    .sort((a, b) => Number(b) - Number(a));

  return Promise.all(
    ids.map(async (ts) => ({
      ts,
      hasSummary: fs.existsSync(path.join(LOGS_DIR, ts, 'summary.txt')),
    })),
  );
}

async function getRun(ts) {
  if (!RUN_ID_RE.test(ts)) throw new Error('invalid run id');
  const dir = path.join(LOGS_DIR, ts);

  const [allRowsRaw, summaryText] = await Promise.all([
    fsp.readFile(path.join(dir, '_all_rows.csv'), 'utf8').catch(() => null),
    fsp.readFile(path.join(dir, 'summary.txt'), 'utf8').catch(() => null),
  ]);

  if (allRowsRaw === null && summaryText === null) return null;

  const stats = allRowsRaw
    ? computeStats(allRowsRaw.split('\n').slice(1).map(parseRow).filter(Boolean))
    : null;

  return { ts, stats, summaryText };
}

module.exports = { listRuns, getRun };
