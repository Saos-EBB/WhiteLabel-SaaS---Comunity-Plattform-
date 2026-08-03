'use strict';
// Live view + controls over SSE, plus past-run browsing. Two independent
// modes share one page and one SSE connection (/api/events): Mode 1
// (login-capacity.sh) and Mode 2 (run-loadtest.sh) each own their own
// section, run status, and past-runs list — nothing here assumes only one
// runs at a time, but running both against the same backend at once will
// obviously contend for the same capacity.

const el = (id) => document.getElementById(id);

// ── Mode tabs ─────────────────────────────────────────────────────────────

const MODE_STORAGE_KEY = 'loadtest-dashboard-mode';
const tabButtons = document.querySelectorAll('.tab');
const modePanels = { 1: el('mode1'), 2: el('mode2') };

function setMode(mode) {
  for (const btn of tabButtons) {
    const active = btn.dataset.mode === String(mode);
    btn.classList.toggle('tab--active', active);
    btn.setAttribute('aria-selected', String(active));
  }
  modePanels[1].hidden = mode !== 1;
  modePanels[2].hidden = mode !== 2;
  localStorage.setItem(MODE_STORAGE_KEY, String(mode));
}

for (const btn of tabButtons) {
  btn.addEventListener('click', () => setMode(Number(btn.dataset.mode)));
}
setMode(Number(localStorage.getItem(MODE_STORAGE_KEY)) || 1);

// ── Shared helpers ──────────────────────────────────────────────────────────

function formatElapsed(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ═══════════════════════════════ MODE 2 ════════════════════════════════════

const statusBadge = el('run-status');
const statTotal = el('stat-total');
const statThroughput = el('stat-throughput');
const statElapsed = el('stat-elapsed');
const statusDistEl = el('status-dist');
const categoriesEl = el('categories');
const summaryCategoriesEl = el('summary-categories');
const endpointBody = document.querySelector('#endpoint-table tbody');
const errorsBody = document.querySelector('#errors-table tbody');
const summaryErrorsBody = document.querySelector('#summary-errors-table tbody');
const dockerStatsEl = el('docker-stats');
const chartThroughput = el('chart-throughput');
const chartP95 = el('chart-p95');
const numUsersInput = el('num-users');
const durationInput = el('duration-sec');
const startBtn = el('start-btn');
const stopBtn = el('stop-btn');
const controlError = el('control-error');
const runSelect = el('run-select');
const summaryText = el('summary-text');
const summaryBody = document.querySelector('#summary-table tbody');

function setRunningUI(active) {
  startBtn.disabled = active;
  stopBtn.disabled = !active;
  numUsersInput.disabled = active;
  durationInput.disabled = active;
}

function setStatus(status) {
  statusBadge.textContent = status;
  statusBadge.className = `status status--${status}`;
}

startBtn.addEventListener('click', async () => {
  controlError.textContent = '';
  const numUsers = Number(numUsersInput.value);
  const durationSec = Number(durationInput.value);
  setRunningUI(true);
  try {
    const res = await fetch('/api/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numUsers, durationSec }),
    });
    const body = await res.json();
    if (!res.ok) {
      controlError.textContent = body.error || 'failed to start';
      setRunningUI(false);
      return;
    }
    setStatus('running');
  } catch (err) {
    controlError.textContent = String(err);
    setRunningUI(false);
  }
});

stopBtn.addEventListener('click', async () => {
  controlError.textContent = '';
  stopBtn.disabled = true;
  try {
    const res = await fetch('/api/stop', { method: 'POST' });
    const body = await res.json();
    if (!res.ok) controlError.textContent = body.error || 'failed to stop';
  } catch (err) {
    controlError.textContent = String(err);
  }
});

// Sync button/badge state on load (e.g. after a page refresh mid-run).
fetch('/api/state')
  .then((res) => res.json())
  .then((state) => {
    setRunningUI(state.active);
    setStatus(state.active ? 'running' : state.status);
  })
  .catch(() => {});

function formatRunLabel(run) {
  const date = new Date(Number(run.ts) * 1000).toLocaleString();
  const suffixes = [];
  if (!run.hasSummary) suffixes.push('no summary — interrupted?');
  if (run.hasErrors) suffixes.push('had errors');
  return suffixes.length ? `${date} (${suffixes.join(', ')})` : date;
}

async function loadRunList(selectTs) {
  const list = await fetch('/api/runs').then((res) => res.json());
  runSelect.innerHTML = '';
  for (const run of list) {
    const opt = document.createElement('option');
    opt.value = run.ts;
    opt.textContent = formatRunLabel(run);
    runSelect.appendChild(opt);
  }
  if (selectTs && list.some((r) => r.ts === selectTs)) {
    runSelect.value = selectTs;
    await loadRun(selectTs);
  } else if (list.length) {
    await loadRun(list[0].ts);
  }
}

async function loadRun(ts) {
  const res = await fetch(`/api/runs/${ts}`);
  if (!res.ok) return;
  const run = await res.json();
  summaryText.textContent = run.summaryText || '(no summary.txt for this run)';
  if (run.stats) {
    renderCategories(run.stats.categories, run.stats.total, summaryCategoriesEl);
    renderEndpointTable(run.stats.perPath, summaryBody);
  } else {
    summaryCategoriesEl.innerHTML = '';
    summaryBody.innerHTML = '';
  }
  renderErrors(run.errors, summaryErrorsBody);
}

runSelect.addEventListener('change', () => loadRun(runSelect.value));
loadRunList();

function statusClass(code) {
  if (code === 'FAIL') return 'error';
  const n = Number(code);
  if (n >= 200 && n < 300) return 'success';
  if (n >= 400 && n < 500) return 'expected';
  return 'error';
}

const CATEGORY_LABELS = [
  ['success', 'Success (2xx)'],
  ['expectedReject', 'Expected reject (4xx)'],
  ['error', 'Error (5xx / transport)'],
];

// Headline numbers: SUCCESS / EXPECTED-REJECT / ERROR, kept visually
// separate from the raw per-status-code list below so expected 4xx
// traffic (duplicate contact request, no pending request to accept,
// admin-only endpoint hit by a non-owner token, ...) never reads as a
// high error rate.
function renderCategories(categories, total, container) {
  container.innerHTML = '';
  for (const [key, label] of CATEGORY_LABELS) {
    const count = (categories && categories[key]) || 0;
    const rate = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
    const div = document.createElement('div');
    div.className = `stat stat--${key === 'expectedReject' ? 'expected' : key}`;
    div.innerHTML = `<span class="stat__label">${label}</span><span class="stat__value">${count} (${rate}%)</span>`;
    container.appendChild(div);
  }
}

// "FAIL" is written by loadtest.sh when a user's slot in tokens.csv had
// no token — a prefetch gap (see prefetch-tokens.sh), not a login that
// failed live during this run.
function statusLabel(code) {
  return code === 'FAIL' ? 'FAIL (prefetch gap)' : code;
}

function renderStatusDist(statusDist) {
  statusDistEl.innerHTML = '';
  for (const [code, count] of Object.entries(statusDist).sort((a, b) => b[1] - a[1])) {
    const span = document.createElement('span');
    span.style.color = `var(--${{ success: 'good', expected: 'warning', error: 'critical' }[statusClass(code)]})`;
    span.style.marginRight = '1rem';
    span.textContent = `${statusLabel(code)}: ${count}`;
    statusDistEl.appendChild(span);
  }
}

function renderEndpointTable(perPath, tbody) {
  tbody.innerHTML = '';
  const paths = Object.entries(perPath).sort((a, b) => b[1].n - a[1].n);
  for (const [p, s] of paths) {
    const c = s.categories || { success: 0, expectedReject: 0, error: 0 };
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${p}</td><td>${s.n}</td><td>${s.avg}</td><td>${s.p95}</td><td>${s.max}</td>`
      + `<td class="count--success">${c.success}</td>`
      + `<td class="count--expected">${c.expectedReject}</td>`
      + `<td class="count--error">${c.error}</td>`;
    tbody.appendChild(tr);
  }
}

// Built with textContent (not innerHTML) — unlike the other cells here,
// the error body snippet is real backend response text, not one of our
// own hardcoded strings, so it isn't safe to interpolate as markup.
function renderErrors(errors, tbody) {
  tbody.innerHTML = '';
  if (!errors || errors.length === 0) {
    const tr = document.createElement('tr');
    tr.className = 'empty-row';
    const td = document.createElement('td');
    td.colSpan = 5;
    td.textContent = 'No errors — clean run so far.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  for (const e of [...errors].reverse()) { // newest first
    const tr = document.createElement('tr');
    const cells = [e.timestamp, e.method, e.path, e.status, e.body];
    cells.forEach((value, i) => {
      const td = document.createElement('td');
      if (i === 3) td.className = 'status-cell';
      if (i === 4) td.className = 'body-cell';
      td.textContent = value;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }
}

function renderDockerStats(docker) {
  dockerStatsEl.innerHTML = '';
  for (const d of docker) {
    const div = document.createElement('div');
    div.className = 'stat';
    div.innerHTML = `<span class="stat__label">${d.name}</span><span class="stat__value">${d.cpu} / ${d.mem}</span>`;
    dockerStatsEl.appendChild(div);
  }
}

// ── Charts — small-multiple line charts (throughput, p95) with a hover
// crosshair + tooltip, since a static canvas render with no hover layer
// is the one thing this skill treats as a straight-up miss. Kept as two
// single-axis charts rather than one dual-axis chart since the two
// metrics have unrelated scales. ──────────────────────────────────────────

const MAX_POINTS = 120;
const series = { throughput: [], p95: [] };
const chartTooltip = el('chart-tooltip');

function pushPoint(name, value) {
  const arr = series[name];
  arr.push({ t: Date.now(), v: value });
  if (arr.length > MAX_POINTS) arr.shift();
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function drawLineChart(canvas, points, color) {
  canvas._points = points;
  canvas._color = color;
  canvas._geom = null;

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (points.length < 2) return;

  const values = points.map((p) => p.v);
  const max = Math.max(...values, 1);
  const stepX = w / (MAX_POINTS - 1);
  const startIdx = MAX_POINTS - points.length;

  ctx.strokeStyle = cssVar('--baseline');
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h - 0.5);
  ctx.lineTo(w, h - 0.5);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const coords = points.map((p, i) => {
    const x = (startIdx + i) * stepX;
    const y = h - (p.v / max) * (h - 10) - 2;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    return { x, y, t: p.t, v: p.v };
  });
  ctx.stroke();

  const lastPoint = coords[coords.length - 1];
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(lastPoint.x, lastPoint.y, 3, 0, Math.PI * 2);
  ctx.fill();

  canvas._geom = { coords };
}

function attachCrosshair(canvas) {
  canvas.addEventListener('mousemove', (ev) => {
    const geom = canvas._geom;
    if (!geom || !geom.coords.length) return;
    const rect = canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (canvas.width / rect.width);
    let nearest = geom.coords[0];
    let nearestDist = Infinity;
    for (const c of geom.coords) {
      const d = Math.abs(c.x - x);
      if (d < nearestDist) { nearestDist = d; nearest = c; }
    }

    drawLineChart(canvas, canvas._points, canvas._color);
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = cssVar('--text-muted');
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(nearest.x, 0);
    ctx.lineTo(nearest.x, canvas.height);
    ctx.stroke();
    ctx.fillStyle = canvas._color;
    ctx.beginPath();
    ctx.arc(nearest.x, nearest.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = cssVar('--surface');
    ctx.stroke();

    const secondsAgo = Math.max(0, Math.round((Date.now() - nearest.t) / 1000));
    chartTooltip.innerHTML = '';
    const strong = document.createElement('strong');
    strong.textContent = String(Math.round(nearest.v * 100) / 100);
    chartTooltip.appendChild(strong);
    chartTooltip.appendChild(document.createTextNode(secondsAgo === 0 ? ' · now' : ` · ${secondsAgo}s ago`));
    chartTooltip.style.display = 'block';
    chartTooltip.style.left = `${ev.clientX + 14}px`;
    chartTooltip.style.top = `${ev.clientY - 12}px`;
  });

  canvas.addEventListener('mouseleave', () => {
    chartTooltip.style.display = 'none';
    if (canvas._points) drawLineChart(canvas, canvas._points, canvas._color);
  });
}

attachCrosshair(chartThroughput);
attachCrosshair(chartP95);

function applyTick(tick) {
  setStatus(tick.status);

  statTotal.textContent = tick.total;
  statThroughput.textContent = tick.throughput.toFixed(1);
  statElapsed.textContent = tick.startedAt ? formatElapsed((tick.finishedAt || Date.now()) - tick.startedAt) : '–';

  renderCategories(tick.categories, tick.total, categoriesEl);
  renderStatusDist(tick.statusDist);
  renderEndpointTable(tick.perPath, endpointBody);
  renderErrors(tick.errors, errorsBody);
  renderDockerStats(tick.docker || []);

  pushPoint('throughput', tick.throughput);
  pushPoint('p95', tick.overall ? tick.overall.p95 : 0);
  drawLineChart(chartThroughput, series.throughput, cssVar('--series-1'));
  drawLineChart(chartP95, series.p95, cssVar('--series-2'));
}

const source = new EventSource('/api/events');
source.addEventListener('tick', (ev) => applyTick(JSON.parse(ev.data)));
source.addEventListener('started', (ev) => {
  setRunningUI(true);
  setStatus(JSON.parse(ev.data).status);
});
source.addEventListener('finished', (ev) => {
  const final = JSON.parse(ev.data);
  applyTick({ ...final, docker: [] });
  setRunningUI(false);
  const ts = (final.logDir || '').split('/').filter(Boolean).pop();
  loadRunList(ts);
});
source.addEventListener('run-error', (ev) => {
  controlError.textContent = JSON.parse(ev.data).message;
  setRunningUI(false);
  setStatus('idle');
});

// ═══════════════════════════════ MODE 1 ════════════════════════════════════

const capStartRate = el('cap-start-rate');
const capRateStep = el('cap-rate-step');
const capStepSec = el('cap-step-sec');
const capMaxRate = el('cap-max-rate');
const capAutoStop = el('cap-auto-stop');
const capThreshold = el('cap-threshold');
const capBaseUrl = el('cap-base-url');
const capStartBtn = el('cap-start-btn');
const capStopBtn = el('cap-stop-btn');
const capControlError = el('cap-control-error');
const capStatusBadge = el('cap-status');
const capLiveMeta = el('cap-live-meta');
const capTableBody = el('cap-table-body');
const capVerdict = el('cap-verdict');
const capConsole = el('cap-console');
const capRunSelect = el('cap-run-select');
const capSummaryBody = el('cap-summary-body');

function setCapStatus(status) {
  capStatusBadge.textContent = status;
  capStatusBadge.className = `status status--${status}`;
}

function setCapRunningUI(active) {
  capStartBtn.disabled = active;
  capStopBtn.disabled = !active;
  for (const input of [capStartRate, capRateStep, capStepSec, capMaxRate, capAutoStop, capThreshold, capBaseUrl]) {
    input.disabled = active;
  }
}

function renderCapRow(row) {
  const tr = document.createElement('tr');
  tr.dataset.step = row.step;
  const belowThreshold = row.successPct < Number(capThreshold.value || 95);
  tr.innerHTML = `<td>${row.step}</td><td>${row.targetRate}/s</td><td>${row.attempts}</td><td>${row.successes}</td>`
    + `<td class="${belowThreshold ? 'count--error' : 'count--success'}">${row.successPct.toFixed(1)}%</td>`
    + `<td>${row.avgMs}</td><td>${row.p95Ms}</td><td>${row.maxMs}</td>`;
  return tr;
}

function renderCapTable(rows, tbody) {
  tbody.innerHTML = '';
  for (const row of rows) tbody.appendChild(renderCapRow(row));
}

// Best rate seen so far that still cleared the success threshold — the
// practical answer to "how many logins/sec can this backend take".
function renderCapVerdict(rows) {
  const threshold = Number(capThreshold.value || 95);
  const safe = rows.filter((r) => r.successPct >= threshold);
  capVerdict.classList.remove('verdict--empty');
  if (safe.length === 0) {
    capVerdict.textContent = rows.length
      ? `No step cleared ${threshold}% success yet — even the first step (${rows[0].targetRate}/s) is already over the line.`
      : '';
    if (!rows.length) capVerdict.classList.add('verdict--empty');
    return;
  }
  const best = safe[safe.length - 1];
  capVerdict.textContent = `Highest rate at ≥${threshold}% success so far: ${best.targetRate}/s (p95 ${best.p95Ms}ms).`;
}

function appendCapConsoleLine(line) {
  capConsole.textContent += (capConsole.textContent ? '\n' : '') + line;
  capConsole.scrollTop = capConsole.scrollHeight;
}

function renderCapMeta(state) {
  capLiveMeta.innerHTML = '';
  if (!state.params) return;
  const p = state.params;
  const parts = [
    `${p.startRate}→${p.maxRate}/s in steps of ${p.rateStep}`,
    `${p.stepSec}s/step`,
    p.autoStop ? `auto-stop < ${p.successThreshold ?? 95}%` : 'no auto-stop',
  ];
  if (p.baseUrl) parts.push(p.baseUrl); // user-typed — always inserted via textContent below
  parts.forEach((part, i) => {
    if (i > 0) capLiveMeta.appendChild(document.createTextNode(' · '));
    const strong = document.createElement('strong');
    strong.textContent = part;
    capLiveMeta.appendChild(strong);
  });
}

capStartBtn.addEventListener('click', async () => {
  capControlError.textContent = '';
  const params = {
    startRate: Number(capStartRate.value),
    rateStep: Number(capRateStep.value),
    stepSec: Number(capStepSec.value),
    maxRate: Number(capMaxRate.value),
    autoStop: capAutoStop.checked,
    successThreshold: Number(capThreshold.value),
    baseUrl: capBaseUrl.value.trim() || undefined,
  };
  setCapRunningUI(true);
  try {
    const res = await fetch('/api/capacity/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const body = await res.json();
    if (!res.ok) {
      capControlError.textContent = body.error || 'failed to start';
      setCapRunningUI(false);
      return;
    }
    capTableBody.innerHTML = '';
    capConsole.textContent = '';
    capVerdict.className = 'verdict verdict--empty';
    setCapStatus('running');
  } catch (err) {
    capControlError.textContent = String(err);
    setCapRunningUI(false);
  }
});

capStopBtn.addEventListener('click', async () => {
  capControlError.textContent = '';
  capStopBtn.disabled = true;
  try {
    const res = await fetch('/api/capacity/stop', { method: 'POST' });
    const body = await res.json();
    if (!res.ok) capControlError.textContent = body.error || 'failed to stop';
  } catch (err) {
    capControlError.textContent = String(err);
  }
});

let capRowsByStep = new Map();

fetch('/api/capacity/state')
  .then((res) => res.json())
  .then((state) => {
    capRowsByStep = new Map((state.rows || []).map((r) => [r.step, r]));
    setCapRunningUI(state.active);
    setCapStatus(state.active ? 'running' : state.status);
    renderCapMeta(state);
    renderCapTable(state.rows || [], capTableBody);
    renderCapVerdict(state.rows || []);
    capConsole.textContent = (state.lines || []).join('\n');
    capConsole.scrollTop = capConsole.scrollHeight;
  })
  .catch(() => {});

function formatCapRunLabel(ts) {
  return new Date(Number(ts) * 1000).toLocaleString();
}

async function loadCapRunList(selectTs) {
  const list = await fetch('/api/capacity/runs').then((res) => res.json());
  capRunSelect.innerHTML = '';
  for (const ts of list) {
    const opt = document.createElement('option');
    opt.value = ts;
    opt.textContent = formatCapRunLabel(ts);
    capRunSelect.appendChild(opt);
  }
  if (selectTs && list.includes(selectTs)) {
    capRunSelect.value = selectTs;
    await loadCapRun(selectTs);
  } else if (list.length) {
    await loadCapRun(list[0]);
  }
}

async function loadCapRun(ts) {
  const res = await fetch(`/api/capacity/runs/${ts}`);
  if (!res.ok) return;
  const run = await res.json();
  renderCapTable(run.rows || [], capSummaryBody);
}

capRunSelect.addEventListener('change', () => loadCapRun(capRunSelect.value));
loadCapRunList();

source.addEventListener('capacity-started', (ev) => {
  const state = JSON.parse(ev.data);
  capRowsByStep = new Map();
  setCapRunningUI(true);
  setCapStatus('running');
  renderCapMeta(state);
});
source.addEventListener('capacity-line', (ev) => {
  const { line, row } = JSON.parse(ev.data);
  appendCapConsoleLine(line);
  if (row) {
    // login-capacity.sh reprints its whole table in its own summary —
    // keyed by step, so this both appends new steps and de-dupes the
    // reprint instead of doubling every row.
    capRowsByStep.set(row.step, row);
    const rows = [...capRowsByStep.values()].sort((a, b) => a.step - b.step);
    renderCapTable(rows, capTableBody);
    renderCapVerdict(rows);
  }
});
source.addEventListener('capacity-finished', (ev) => {
  const state = JSON.parse(ev.data);
  capRowsByStep = new Map((state.rows || []).map((r) => [r.step, r]));
  setCapRunningUI(false);
  setCapStatus('finished');
  renderCapTable(state.rows || [], capTableBody);
  renderCapVerdict(state.rows || []);
  loadCapRunList(String(state.ts));
});
