'use strict';
//
// Reads past (and the current) loadtest-logs/<ts>/ runs. Numbers come
// from the same computeStats() used for the live view, applied to
// _all_rows.csv — so a past run's table matches summary.txt's own
// per-path numbers exactly (see aggregator.js's header comment for the
// one known exception: summary.txt's single "Requests gesamt" line is
// off by one, counting its own header row).
//
// listRuns() runs the same computeStats()/categorize() over every run's
// _all_rows.csv as getRun() does — deliberately, so a History row's
// health dot/mini-bar always agrees with what this run's own detail view
// shows (same 2xx=success / 4xx=expectedReject / 5xx+FAIL=error split).
// There is no second, cheaper stats path for the list — that would risk
// the two views disagreeing on what counts as "healthy".
//

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { parseRow, computeStats } = require('./aggregator');
const { parseErrorLine, capRecent } = require('./errorTailer');

const LOADTEST_DIR = path.join(__dirname, '..', '..');
const LOGS_DIR = path.join(LOADTEST_DIR, 'loadtest-logs');
const RUN_ID_RE = /^\d+$/;

// summary.txt's params line looks like:
//   NUM_USERS=100 DURATION_SEC=60 BASE_URL=http://localhost:3100/api/v1
// If summary.txt is missing, malformed, or from a version of loadtest.sh
// that wrote this line differently, this returns null rather than
// throwing — callers show the run without params instead of dropping
// the row, same graceful-fallback approach as the Mode 1 params sidecar.
function parseParamsFromSummary(summaryText) {
  if (!summaryText) return null;
  const numUsers = /NUM_USERS=(\d+)/.exec(summaryText);
  const durationSec = /DURATION_SEC=(\d+)/.exec(summaryText);
  if (!numUsers || !durationSec) return null;
  return { numUsers: Number(numUsers[1]), durationSec: Number(durationSec[1]) };
}

// Tokens are reused across workers now (token_idx = i % AVAILABLE_TOKENS
// in loadtest.sh) — NUM_USERS itself always runs in full, it's never
// downgraded. loadtest.sh writes this line only when the token POOL came
// up smaller than run-loadtest.sh's own TOKEN_POOL_TARGET (~NUM_USERS/10,
// e.g. a few individual prefetch logins failing despite retries) — fewer
// distinct accounts get reused, not fewer workers. null means no
// shortfall (or an older/malformed summary — same graceful-fallback
// shape as parseParamsFromSummary above).
function parseShortfallFromSummary(summaryText) {
  if (!summaryText) return null;
  const m = /WARNUNG: Token-Pool kleiner als geplant — nur (\d+) von (\d+) vorgesehenen Accounts/.exec(summaryText);
  if (!m) return null;
  return { actualTokens: Number(m[1]), poolTarget: Number(m[2]) };
}

async function readRunFiles(ts) {
  const dir = path.join(LOGS_DIR, ts);
  const [allRowsRaw, summaryText, errorsRaw] = await Promise.all([
    fsp.readFile(path.join(dir, '_all_rows.csv'), 'utf8').catch(() => null),
    fsp.readFile(path.join(dir, 'summary.txt'), 'utf8').catch(() => null),
    fsp.readFile(path.join(dir, 'errors.log'), 'utf8').catch(() => null),
  ]);
  return { allRowsRaw, summaryText, errorsRaw };
}

async function listRuns() {
  const entries = await fsp.readdir(LOGS_DIR, { withFileTypes: true }).catch(() => []);
  const ids = entries
    .filter((e) => e.isDirectory() && RUN_ID_RE.test(e.name))
    .map((e) => e.name)
    .sort((a, b) => Number(b) - Number(a));

  return Promise.all(
    ids.map(async (ts) => {
      const { allRowsRaw, summaryText, errorsRaw } = await readRunFiles(ts);
      const stats = allRowsRaw
        ? computeStats(allRowsRaw.split('\n').slice(1).map(parseRow).filter(Boolean))
        : null;
      const errorCount = errorsRaw ? errorsRaw.split('\n').map(parseErrorLine).filter(Boolean).length : 0;
      return {
        ts,
        hasSummary: summaryText !== null,
        hasErrors: errorCount > 0,
        params: parseParamsFromSummary(summaryText),
        shortfall: parseShortfallFromSummary(summaryText),
        // Only total + categories — everything a History row needs
        // (req/s via total/params.durationSec, success%, error count,
        // health-bar proportions). perPath/overall are still computed
        // fresh from _all_rows.csv by getRun() for the detail view.
        stats: stats ? { total: stats.total, categories: stats.categories } : null,
      };
    }),
  );
}

async function getRun(ts) {
  if (!RUN_ID_RE.test(ts)) throw new Error('invalid run id');
  const { allRowsRaw, summaryText, errorsRaw } = await readRunFiles(ts);

  if (allRowsRaw === null && summaryText === null) return null;

  const stats = allRowsRaw
    ? computeStats(allRowsRaw.split('\n').slice(1).map(parseRow).filter(Boolean))
    : null;
  const errors = errorsRaw
    ? capRecent(errorsRaw.split('\n').map(parseErrorLine).filter(Boolean))
    : [];

  return {
    ts,
    stats,
    summaryText,
    params: parseParamsFromSummary(summaryText),
    shortfall: parseShortfallFromSummary(summaryText),
    errors,
  };
}

module.exports = { listRuns, getRun };
