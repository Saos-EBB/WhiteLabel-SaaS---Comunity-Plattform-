'use strict';
//
// In-memory state for "the Mode 3 (endpoint-rate) run the dashboard is
// currently watching" — the Mode 3 sibling of liveState.js. Mirrors its
// structure exactly (Tailer + RunAggregator + ErrorTailer lifecycle
// around a known log directory), just with Mode 3's own params (selected
// endpoints + rate ramp settings) instead of numUsers/durationSec.
// Process control (spawning/killing endpoint-rate.sh) lives in
// rateRunner.js.
//

const { Tailer } = require('./tailer');
const { RunAggregator } = require('./aggregator');
const { ErrorTailer, capRecent } = require('./errorTailer');

const state = {
  status: 'idle', // idle | running | finished
  logDir: null,
  params: null, // { endpoints, startRate, rateStep, stepSec, maxRate }
  startedAt: null,
  finishedAt: null,
};

let tailer = null;
let aggregator = null;
let errorTailer = null;
let recentErrors = [];

function startRun(logDir, params) {
  state.status = 'running';
  state.logDir = logDir;
  state.params = params;
  state.startedAt = Date.now();
  state.finishedAt = null;
  tailer = new Tailer();
  aggregator = new RunAggregator();
  errorTailer = new ErrorTailer();
  recentErrors = [];
}

async function pollErrors() {
  if (!errorTailer || !state.logDir) return;
  const rows = await errorTailer.pollOnce(state.logDir);
  if (rows.length) recentErrors = capRecent([...recentErrors, ...rows]);
}

async function finishRun() {
  // One last poll so trailing lines written just before the process
  // exited aren't lost from the live snapshot.
  if (tailer && state.logDir) {
    const rows = await tailer.pollOnce(state.logDir);
    for (const row of rows) aggregator.addRow(row);
    await tailer.close();
  }
  await pollErrors();
  if (errorTailer) await errorTailer.close();
  state.status = 'finished';
  state.finishedAt = Date.now();
  return { ...state, ...aggregator.snapshot(), errors: recentErrors };
}

async function pollTick() {
  if (state.status !== 'running' || !tailer || !aggregator) return null;
  const rows = await tailer.pollOnce(state.logDir);
  for (const row of rows) aggregator.addRow(row);
  await pollErrors();
  return { ...state, ...aggregator.snapshot(), errors: recentErrors };
}

function getState() {
  return { ...state };
}

module.exports = { startRun, finishRun, pollTick, getState };
