'use strict';
//
// Spawns run-loadtest.sh as the leader of its own process group
// (detached: true -> Node calls setsid() before exec) so every
// descendant — loadtest.sh, each `simulate_user &` subshell, every
// curl it shells out to — inherits that same group. Stop then kills
// the whole group at once via the negative-pid form of kill(2), so no
// curl process is left behind.
//

const { spawn } = require('child_process');
const path = require('path');
const { EventEmitter } = require('events');

const LOADTEST_DIR = path.join(__dirname, '..', '..');
const STOP_GRACE_MS = 3000;

class Runner extends EventEmitter {
  constructor() {
    super();
    this.child = null;
    this.logDir = null;
    this.numUsers = null;
    this.durationSec = null;
  }

  isActive() {
    return this.child !== null;
  }

  start(numUsers, durationSec) {
    if (this.isActive()) throw new Error('A run is already active');
    if (!Number.isInteger(numUsers) || numUsers < 1) throw new Error('numUsers must be a positive integer');
    if (!Number.isInteger(durationSec) || durationSec < 1) throw new Error('durationSec must be a positive integer');

    this.logDir = null;
    this.numUsers = numUsers;
    this.durationSec = durationSec;

    const child = spawn('./run-loadtest.sh', [String(numUsers), String(durationSec)], {
      cwd: LOADTEST_DIR,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    this.child = child;

    let buf = '';
    child.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
      if (this.logDir) return;
      buf += chunk.toString('utf8');
      const m = buf.match(/Logs:\s+(\S+)/);
      if (m) {
        this.logDir = path.resolve(LOADTEST_DIR, m[1]);
        this.emit('logdir', this.logDir);
      }
    });
    child.stderr.on('data', (chunk) => process.stderr.write(chunk));

    child.on('exit', (code) => {
      const hadLogDir = !!this.logDir;
      this.child = null;
      this.emit('exit', { code, hadLogDir });
    });

    return child.pid;
  }

  // SIGTERM the whole process group first, SIGKILL after a grace
  // period if anything's still alive (curl can be slow to notice a
  // signal mid-request).
  stop() {
    if (!this.isActive()) return false;
    const pid = this.child.pid;
    try {
      process.kill(-pid, 'SIGTERM');
    } catch {
      return false;
    }
    setTimeout(() => {
      try {
        process.kill(-pid, 0);
        process.kill(-pid, 'SIGKILL');
      } catch {
        // group already gone — the common case
      }
    }, STOP_GRACE_MS);
    return true;
  }
}

module.exports = new Runner();
