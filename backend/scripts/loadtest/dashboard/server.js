#!/usr/bin/env node
//
// Live view onto scripts/loadtest's log output for both modes. Plain Node
// http, no dependencies, no build step — see scripts/loadtest/README.md for
// usage. The bash side (login-capacity.sh / loadtest.sh / run-loadtest.sh /
// prefetch-tokens.sh / generate-users-csv.sh) is untouched by this server;
// it only reads their logs and, for the control endpoints, spawns them as
// children. Mode 2 (run-loadtest.sh) tails loadtest-logs/<ts>/*.csv on disk;
// Mode 1 (login-capacity.sh) has no log directory to tail, just a stdout
// table, so its live state is parsed straight from the child's stdout (see
// lib/capacityRunner.js) and persisted to capacity-logs/<ts>.log for the
// past-runs view.
//
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const liveState = require('./lib/liveState');
const { pollDockerStats } = require('./lib/dockerStats');
const runner = require('./lib/runner');
const runs = require('./lib/runs');
const capacityRunner = require('./lib/capacityRunner');
const capacityRuns = require('./lib/capacityRuns');

const HOST = '127.0.0.1';
const PORT = 4300;

const PUBLIC_DIR = path.join(__dirname, 'public');

const CONTAINERS = ['XXX_backend_load', 'XXX_db_load'];
// Bump to 2000ms if a very high NUM_USERS makes the per-tick readdir()
// in lib/tailer.js the bottleneck (see that file's header comment).
const CSV_POLL_MS = 1000;
const DOCKER_POLL_MS = 2000;

const sseClients = new Set();
let lastDockerStats = [];

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) res.write(payload);
}

function handleEvents(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.write(':ok\n\n');
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
}

setInterval(async () => {
  lastDockerStats = await pollDockerStats(CONTAINERS);
}, DOCKER_POLL_MS);

setInterval(async () => {
  const tick = await liveState.pollTick();
  if (!tick) return;
  broadcast('tick', { ...tick, docker: lastDockerStats });
}, CSV_POLL_MS);

runner.on('prefetch', ({ loaded, total }) => {
  broadcast('prefetch', { phase: 'prefetch', loaded, total });
});

runner.on('logdir', (logDir) => {
  liveState.startRun(logDir, runner.numUsers, runner.durationSec);
  broadcast('started', { phase: 'running', ...liveState.getState() });
});

runner.on('exit', async ({ code, hadLogDir }) => {
  if (!hadLogDir) {
    broadcast('run-error', { message: `run-loadtest.sh exited (code ${code}) before it started logging — check the dashboard server's own console output` });
    return;
  }
  const final = await liveState.finishRun();
  broadcast('finished', final);
});

capacityRunner.on('started', (state) => broadcast('capacity-started', state));
capacityRunner.on('line', ({ line, row }) => broadcast('capacity-line', { line, row }));
capacityRunner.on('exit', ({ code, ts }) => broadcast('capacity-finished', { code, ts, ...capacityRunner.getState() }));

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e5) req.destroy(); // guard against a runaway body
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function handleStart(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: 'invalid JSON body' });
    return;
  }
  const numUsers = Number(body.numUsers);
  const durationSec = Number(body.durationSec);
  try {
    const pid = runner.start(numUsers, durationSec);
    sendJson(res, 202, { started: true, pid });
  } catch (err) {
    sendJson(res, 409, { error: err.message });
  }
}

function handleStop(req, res) {
  const stopped = runner.stop();
  sendJson(res, stopped ? 202 : 409, { stopped, error: stopped ? undefined : 'no active run' });
}

function handleState(req, res) {
  sendJson(res, 200, { active: runner.isActive(), ...liveState.getState() });
}

async function handleRunsList(req, res) {
  sendJson(res, 200, await runs.listRuns());
}

async function handleRunDetail(req, res, ts) {
  let run;
  try {
    run = await runs.getRun(decodeURIComponent(ts));
  } catch (err) {
    sendJson(res, 400, { error: err.message });
    return;
  }
  if (!run) {
    sendJson(res, 404, { error: 'run not found' });
    return;
  }
  sendJson(res, 200, run);
}

async function handleCapacityStart(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: 'invalid JSON body' });
    return;
  }
  const params = {
    startRate: Number(body.startRate),
    rateStep: Number(body.rateStep),
    stepSec: Number(body.stepSec),
    maxRate: Number(body.maxRate),
    autoStop: !!body.autoStop,
    successThreshold: body.successThreshold !== undefined ? Number(body.successThreshold) : undefined,
    baseUrl: body.baseUrl || undefined,
  };
  try {
    const result = capacityRunner.start(params);
    sendJson(res, 202, { started: true, ...result });
  } catch (err) {
    sendJson(res, 409, { error: err.message });
  }
}

function handleCapacityStop(req, res) {
  const stopped = capacityRunner.stop();
  sendJson(res, stopped ? 202 : 409, { stopped, error: stopped ? undefined : 'no active capacity run' });
}

function handleCapacityState(req, res) {
  sendJson(res, 200, { active: capacityRunner.isActive(), ...capacityRunner.getState() });
}

async function handleCapacityRunsList(req, res) {
  sendJson(res, 200, await capacityRuns.listRuns());
}

async function handleCapacityRunDetail(req, res, ts) {
  let run;
  try {
    run = await capacityRuns.getRun(decodeURIComponent(ts));
  } catch (err) {
    sendJson(res, 400, { error: err.message });
    return;
  }
  if (!run) {
    sendJson(res, 404, { error: 'run not found' });
    return;
  }
  sendJson(res, 200, run);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

function serveStatic(req, res) {
  const urlPath = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(PUBLIC_DIR, urlPath);

  // Guard against path traversal outside of public/.
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/api/events') {
    handleEvents(req, res);
    return;
  }
  if (req.method === 'GET' && req.url === '/api/state') {
    handleState(req, res);
    return;
  }
  if (req.method === 'POST' && req.url === '/api/start') {
    handleStart(req, res);
    return;
  }
  if (req.method === 'POST' && req.url === '/api/stop') {
    handleStop(req, res);
    return;
  }
  if (req.method === 'GET' && req.url === '/api/runs') {
    handleRunsList(req, res);
    return;
  }
  if (req.method === 'GET' && req.url.startsWith('/api/runs/')) {
    handleRunDetail(req, res, req.url.slice('/api/runs/'.length));
    return;
  }
  if (req.method === 'POST' && req.url === '/api/capacity/start') {
    handleCapacityStart(req, res);
    return;
  }
  if (req.method === 'POST' && req.url === '/api/capacity/stop') {
    handleCapacityStop(req, res);
    return;
  }
  if (req.method === 'GET' && req.url === '/api/capacity/state') {
    handleCapacityState(req, res);
    return;
  }
  if (req.method === 'GET' && req.url === '/api/capacity/runs') {
    handleCapacityRunsList(req, res);
    return;
  }
  if (req.method === 'GET' && req.url.startsWith('/api/capacity/runs/')) {
    handleCapacityRunDetail(req, res, req.url.slice('/api/capacity/runs/'.length));
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`Loadtest dashboard: http://${HOST}:${PORT}`);
});
