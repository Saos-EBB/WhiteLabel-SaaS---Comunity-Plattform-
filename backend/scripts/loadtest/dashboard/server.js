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

const HOST = '127.0.0.1';
const PORT = 4300;

const PUBLIC_DIR = path.join(__dirname, 'public');

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
  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`Loadtest dashboard: http://${HOST}:${PORT}`);
});
