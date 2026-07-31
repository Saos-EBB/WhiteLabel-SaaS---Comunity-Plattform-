#!/usr/bin/env node
//
// Live view onto scripts/loadtest's log output. Plain Node http, no
// dependencies, no build step — see scripts/loadtest/README.md for usage.
// The bash loadtest itself (loadtest.sh / run-loadtest.sh /
// generate-users-csv.sh) is untouched; this server only reads its logs
// and, for the control endpoints, spawns run-loadtest.sh as a child.
//
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const liveState = require('./lib/liveState');
const { pollDockerStats } = require('./lib/dockerStats');
const runner = require('./lib/runner');

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

runner.on('logdir', (logDir) => {
  liveState.startRun(logDir, runner.numUsers, runner.durationSec);
  broadcast('started', liveState.getState());
});

runner.on('exit', async ({ code, hadLogDir }) => {
  if (!hadLogDir) {
    broadcast('run-error', { message: `run-loadtest.sh exited (code ${code}) before it started logging — check the dashboard server's own console output` });
    return;
  }
  await liveState.finishRun();
  broadcast('finished', liveState.getState());
});

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
  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`Loadtest dashboard: http://${HOST}:${PORT}`);
});
