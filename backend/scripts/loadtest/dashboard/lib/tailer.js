'use strict';
//
// Polls a loadtest-logs/<ts>/ directory for new rows in user_*.csv and
// admin_*.csv. Keeps a persistent {filename: open fd + byte offset} map
// across polls, so each tick only reads the bytes appended since the
// last poll — never re-reads a file from the start. At very high
// NUM_USERS (thousands of files) the per-tick readdir() itself is the
// remaining cost; if that turns out to be the bottleneck, widen
// CSV_POLL_MS in server.js rather than reworking this file.
//

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { parseRow } = require('./aggregator');

const CHUNK_SIZE = 64 * 1024;
const FILE_RE = /^(user_\d+|admin_[\w-]+)\.csv$/;

class Tailer {
  constructor() {
    this.files = new Map(); // filename -> { fd, offset, leftover }
  }

  async pollOnce(logDir) {
    const entries = await fsp.readdir(logDir).catch(() => []);

    for (const name of entries) {
      if (!FILE_RE.test(name) || this.files.has(name)) continue;
      try {
        const fd = await fsp.open(path.join(logDir, name), 'r');
        this.files.set(name, { fd, offset: 0, leftover: '' });
      } catch {
        // Created between readdir and open — pick it up next tick.
      }
    }

    const rows = [];
    for (const entry of this.files.values()) {
      rows.push(...(await this._readNew(entry)));
    }
    return rows;
  }

  async _readNew(entry) {
    const rows = [];
    const buf = Buffer.alloc(CHUNK_SIZE);
    for (;;) {
      let bytesRead;
      try {
        ({ bytesRead } = await entry.fd.read(buf, 0, CHUNK_SIZE, entry.offset));
      } catch {
        break;
      }
      if (bytesRead === 0) break;
      entry.offset += bytesRead;
      entry.leftover += buf.toString('utf8', 0, bytesRead);
      const lines = entry.leftover.split('\n');
      entry.leftover = lines.pop();
      for (const line of lines) {
        const row = parseRow(line);
        if (row) rows.push(row);
      }
      if (bytesRead < CHUNK_SIZE) break;
    }
    return rows;
  }

  async close() {
    for (const entry of this.files.values()) {
      await entry.fd.close().catch(() => {});
    }
    this.files.clear();
  }
}

module.exports = { Tailer };
