'use strict';
//
// In-memory state for "the run the dashboard is currently watching".
// Process control (spawning/killing run-loadtest.sh) lives in runner.js
// (added alongside the start/stop endpoints) — this module only owns
// the tailer + aggregator lifecycle around a known log directory.
//

const { Tailer } = require('./tailer');
const { RunAggregator } = require('./aggregator');

const state = {
  status: 'idle', // idle | running | finished
  logDir: null,
  numUsers: null,
  durationSec: null,
  startedAt: null,
  finishedAt: null,
};

let tailer = null;
let aggregator = null;

function startRun(logDir, numUsers, durationSec) {
  state.status = 'running';
  state.logDir = logDir;
  state.numUsers = numUsers;
  state.durationSec = durationSec;
  state.startedAt = Date.now();
  state.finishedAt = null;
  tailer = new Tailer();
  aggregator = new RunAggregator();
}

async function finishRun() {
  // One last poll so trailing lines written just before the process
  // exited aren't lost from the live snapshot.
  if (tailer && state.logDir) {
    const rows = await tailer.pollOnce(state.logDir);
    for (const row of rows) aggregator.addRow(row);
    await tailer.close();
  }
  state.status = 'finished';
  state.finishedAt = Date.now();
  return { ...state, ...aggregator.snapshot() };
}

async function pollTick() {
  if (state.status !== 'running' || !tailer || !aggregator) return null;
  const rows = await tailer.pollOnce(state.logDir);
  for (const row of rows) aggregator.addRow(row);
  return { ...state, ...aggregator.snapshot() };
}

function getState() {
  return { ...state };
}

module.exports = { startRun, finishRun, pollTick, getState };
