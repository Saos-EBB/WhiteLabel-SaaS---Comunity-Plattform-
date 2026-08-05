'use strict';
//
// One-shot `docker stats --no-stream` poll, parsed from --format json
// (one JSON object per line — not a JSON array), never scraped as text.
//

const { execFile } = require('child_process');

function pollDockerStats(containers) {
  return new Promise((resolve) => {
    execFile(
      'docker',
      ['stats', '--format', '{{json .}}', '--no-stream', ...containers],
      { timeout: 5000 },
      (err, stdout) => {
        if (err) {
          resolve([]);
          return;
        }
        const stats = stdout
          .trim()
          .split('\n')
          .filter(Boolean)
          .map((line) => {
            try {
              return JSON.parse(line);
            } catch {
              return null;
            }
          })
          .filter(Boolean);
        resolve(stats.map((s) => ({ name: s.Name, cpu: s.CPUPerc, mem: s.MemUsage })));
      },
    );
  });
}

module.exports = { pollDockerStats };
