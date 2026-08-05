'use strict';
//
// Reads a run's errors.log (see loadtest.sh's log_error_if_needed):
// tab-separated `timestamp\tmethod\tpath\tstatus\tbody_snippet`, one
// line per real error (5xx / transport failure — never 4xx, those are
// expected traffic for this load approach and never written there).
//
// ErrorTailer follows the same persistent-fd + byte-offset approach as
// tailer.js, just for one file instead of discovering many — errors.log
// doesn't exist until the first real error, so open() is retried each
// poll until it appears.
//

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const CHUNK_SIZE = 64 * 1024;
const MAX_RECENT_ERRORS = 100;

function parseErrorLine(line) {
  if (!line) return null;
  const parts = line.split('\t');
  if (parts.length < 5) return null;
  const [timestamp, method, reqPath, status, ...rest] = parts;
  return { timestamp, method, path: reqPath, status, body: rest.join('\t') };
}

// Keeps only the most recent MAX_RECENT_ERRORS, newest last.
function capRecent(errors) {
  return errors.length > MAX_RECENT_ERRORS ? errors.slice(-MAX_RECENT_ERRORS) : errors;
}

class ErrorTailer {
  constructor() {
    this.fd = null;
    this.offset = 0;
    this.leftover = '';
  }

  async pollOnce(logDir) {
    if (!this.fd) {
      try {
        this.fd = await fsp.open(path.join(logDir, 'errors.log'), 'r');
      } catch {
        return []; // no errors yet
      }
    }

    const rows = [];
    const buf = Buffer.alloc(CHUNK_SIZE);
    for (;;) {
      let bytesRead;
      try {
        ({ bytesRead } = await this.fd.read(buf, 0, CHUNK_SIZE, this.offset));
      } catch {
        break;
      }
      if (bytesRead === 0) break;
      this.offset += bytesRead;
      this.leftover += buf.toString('utf8', 0, bytesRead);
      const lines = this.leftover.split('\n');
      this.leftover = lines.pop();
      for (const line of lines) {
        const row = parseErrorLine(line);
        if (row) rows.push(row);
      }
      if (bytesRead < CHUNK_SIZE) break;
    }
    return rows;
  }

  async close() {
    if (this.fd) {
      await this.fd.close().catch(() => {});
      this.fd = null;
    }
  }
}

module.exports = { ErrorTailer, parseErrorLine, capRecent, MAX_RECENT_ERRORS };
