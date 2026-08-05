'use strict';
//
// Shared stats logic — used for BOTH the live SSE snapshot and for
// re-deriving numbers from a past run's _all_rows.csv, so all three
// (live view, past-run view, summary.txt) always agree on the numbers.
//
// computeStats() is a 1:1 port of the awk block at the end of
// ../../loadtest.sh: same grouping by path, same p95 index formula
// (floor(n*0.95), clamped to n-1), same avg = sum/n. Rows with a
// non-numeric status (the "LOGIN FAIL" lines loadtest.sh writes) are
// grouped like any other row, exactly like the awk does.
//

const HEADER_LINE = 'timestamp,method,path,status,duration_ms';

function parseRow(line) {
  if (!line || line === HEADER_LINE) return null;
  const parts = line.split(',');
  if (parts.length !== 5) return null;
  const [timestamp, method, path, status, durationStr] = parts;
  const duration_ms = Number(durationStr);
  if (!Number.isFinite(duration_ms)) return null;
  return { timestamp, method, path, status, duration_ms };
}

// This is a pure load test — 4xx that follows from the load approach
// itself (duplicate contact request, no pending request to accept,
// insufficient coins, admin-only endpoint hit by a non-owner token, ...)
// is expected traffic, not a bug. Only 5xx, transport failures ("000"
// from a dead connection), and the "FAIL" literal are real errors —
// bucketed separately so expected 4xx never inflates the error rate.
// Since Mode 2 dropped in-loop login (tokens now come from
// prefetch-tokens.sh), "FAIL" no longer means a live login failure — it
// means this user's slot in tokens.csv was empty, i.e. a prefetch gap
// (see prefetch-tokens.sh's "X of Y tokens acquired" report).
function categorizeStatus(status) {
  if (status === 'FAIL') return 'error';
  const n = Number(status);
  if (Number.isFinite(n) && n >= 200 && n < 300) return 'success';
  if (Number.isFinite(n) && n >= 400 && n < 500) return 'expectedReject';
  return 'error'; // 5xx, "000", and anything else unexpected
}

function categorize(statusDist) {
  const buckets = { success: 0, expectedReject: 0, error: 0 };
  for (const [status, count] of Object.entries(statusDist)) {
    buckets[categorizeStatus(status)] += count;
  }
  return buckets;
}

function statsForDurations(durations) {
  const sorted = [...durations].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return { n: 0, avg: 0, p95: 0, max: 0 };
  let p95idx = Math.floor(n * 0.95);
  if (p95idx >= n) p95idx = n - 1;
  const sum = durations.reduce((a, b) => a + b, 0);
  return { n, avg: Math.round(sum / n), p95: sorted[p95idx], max: sorted[n - 1] };
}

function computeStats(rows) {
  const statusDist = {};
  const byPath = new Map();
  const statusDistByPath = new Map();
  const allDurations = [];

  for (const row of rows) {
    statusDist[row.status] = (statusDist[row.status] || 0) + 1;
    let bucket = byPath.get(row.path);
    if (!bucket) { bucket = []; byPath.set(row.path, bucket); }
    bucket.push(row.duration_ms);
    allDurations.push(row.duration_ms);

    let pathStatusDist = statusDistByPath.get(row.path);
    if (!pathStatusDist) { pathStatusDist = {}; statusDistByPath.set(row.path, pathStatusDist); }
    pathStatusDist[row.status] = (pathStatusDist[row.status] || 0) + 1;
  }

  const perPath = {};
  for (const [p, durations] of byPath) {
    perPath[p] = { ...statsForDurations(durations), categories: categorize(statusDistByPath.get(p)) };
  }

  return {
    total: rows.length,
    statusDist,
    categories: categorize(statusDist),
    perPath,
    overall: statsForDurations(allDurations),
  };
}

// Accumulates rows for one active run and produces live snapshots,
// including a rolling req/s figure (a live-only metric — loadtest.sh's
// own summary has no notion of throughput, it's a point-in-time total).
class RunAggregator {
  constructor() {
    this.rows = [];
    this.recentTimestamps = [];
  }

  addRow(row) {
    this.rows.push(row);
    this.recentTimestamps.push(Date.now());
  }

  snapshot(windowMs = 10000) {
    const now = Date.now();
    while (this.recentTimestamps.length && now - this.recentTimestamps[0] > windowMs) {
      this.recentTimestamps.shift();
    }
    const throughput = this.recentTimestamps.length / (windowMs / 1000);
    return { ...computeStats(this.rows), throughput };
  }
}

module.exports = { parseRow, computeStats, RunAggregator };
