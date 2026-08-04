'use strict';
// Live view + controls over SSE, plus past-run browsing via the History
// tab. Three tabs share one page and one SSE connection (/api/events):
// Mode 2 (run-loadtest.sh), Mode 1 (login-capacity.sh), and History. Each
// mode has exactly ONE view — clicking a History row loads that run's
// full detail into the SAME elements the live SSE ticks update, via the
// same render functions (see loadPastRunIntoMode2/loadPastRunIntoMode1
// further down), rather than a separate past-runs section.

const el = (id) => document.getElementById(id);

// ── Tabs ──────────────────────────────────────────────────────────────────

const MODE_STORAGE_KEY = 'loadtest-dashboard-tab';
const tabButtons = document.querySelectorAll('.tab');
const panels = { 2: el('mode2'), 1: el('mode1'), history: el('history') };

function setTab(tab) {
  for (const btn of tabButtons) {
    const active = btn.dataset.mode === String(tab);
    btn.classList.toggle('tab--active', active);
    btn.setAttribute('aria-selected', String(active));
  }
  for (const key of Object.keys(panels)) panels[key].hidden = key !== String(tab);
  localStorage.setItem(MODE_STORAGE_KEY, String(tab));
  if (tab === 'history') loadHistoryList();
}

for (const btn of tabButtons) {
  btn.addEventListener('click', () => setTab(btn.dataset.mode));
}
setTab(localStorage.getItem(MODE_STORAGE_KEY) || '2');

// ── Shared helpers ──────────────────────────────────────────────────────────

function formatElapsed(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// "03.08. 13:54:35" — short German date, used by History rows.
function formatHistDate(ts) {
  const d = new Date(Number(ts) * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}. ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ═══════════════════════════════ MODE 2 ════════════════════════════════════

const numUsersInput = el('num-users');
const durationInput = el('duration-sec');
const startBtn = el('start-btn');
const stopBtn = el('stop-btn');
const controlError = el('control-error');

const statusbarEl = el('statusbar');
const stateDot = el('state-dot');
const stateText = el('state-text');
const statThroughput = el('stat-throughput');
const statSuccessRate = el('stat-success-rate');
const statRealErrors = el('stat-real-errors');

const healthOk = el('health-ok');
const healthWarn = el('health-warn');
const healthErr = el('health-err');
const healthOkLabel = el('health-ok-label');
const healthWarnLabel = el('health-warn-label');
const healthErrLabel = el('health-err-label');

const chartHistoricalNote = el('chart-historical-note');
const chartThroughput = el('chart-throughput');
const chartP95 = el('chart-p95');
const endpointBody = document.querySelector('#endpoint-table tbody');

const errorsBlock = el('errors-block');
const errorsAnchorTop = el('errors-anchor-top');
const errorsAnchorBottom = el('errors-anchor-bottom');
const errorsClean = el('errors-clean');
const errorsTable = el('errors-table');
const errorsBody = document.querySelector('#errors-table tbody');
const dockerStatsEl = el('docker-stats');

function setRunningUI(active) {
  startBtn.disabled = active;
  stopBtn.disabled = !active;
  numUsersInput.disabled = active;
  durationInput.disabled = active;
}

// status: 'idle' | 'running' | 'finished'. hasError drives the red left
// border + dot tint independently of run status — a finished run with a
// real error still reads red, not grey.
function setState2(status, elapsedMs, hasError) {
  stateDot.className = 'dot' + (status === 'running' ? ' running' : status === 'finished' ? ' finished' : '') + (hasError ? ' errored' : '');
  stateText.textContent = status === 'running' ? `LÄUFT · ${formatElapsed(elapsedMs)}` : status === 'finished' ? 'FERTIG' : 'IDLE';
  statusbarEl.classList.toggle('errored', !!hasError);
  statusbarEl.classList.toggle('idle', status === 'idle');
}

// Big glance numbers + the stacked health bar. throughput is the live
// rolling req/s from the aggregator; for a loaded past run there is no
// rolling window, so pass null and a durationSec to fall back to
// total/durationSec (or null durationSec to show "–").
function updateHealthAndNumbers(categories, total, throughput, durationSecFallback) {
  const c = categories || { success: 0, expectedReject: 0, error: 0 };
  const hasError = (c.error || 0) > 0;
  const successPct = total > 0 ? (c.success / total) * 100 : 0;

  statThroughput.textContent = throughput != null
    ? throughput.toFixed(1)
    : (durationSecFallback ? (total / durationSecFallback).toFixed(1) : '–');
  statThroughput.className = 'num';

  statSuccessRate.textContent = total > 0 ? `${successPct.toFixed(1)}%` : '–';
  statSuccessRate.className = 'num ' + (hasError ? 'err' : 'ok');

  statRealErrors.textContent = String(c.error || 0);
  statRealErrors.className = 'num ' + (hasError ? 'err' : 'ok');

  healthOk.style.flex = String(c.success || 0);
  healthWarn.style.flex = String(c.expectedReject || 0);
  healthErr.style.flex = String(c.error || 0);
  healthOkLabel.textContent = `Success 2xx · ${c.success || 0}`;
  healthWarnLabel.textContent = `Expected reject 4xx · ${c.expectedReject || 0}`;
  healthErrLabel.textContent = `Error 5xx / transport · ${c.error || 0}`;

  return hasError;
}

function renderEndpointTable2(perPath) {
  endpointBody.innerHTML = '';
  const paths = Object.entries(perPath || {}).sort((a, b) => b[1].p95 - a[1].p95);
  const maxP95 = paths.length ? paths[0][1].p95 : 0;
  for (const [p, s] of paths) {
    const c = s.categories || { success: 0, expectedReject: 0, error: 0 };
    const width = maxP95 > 0 ? (s.p95 / maxP95) * 100 : 0;
    const cell = (value, cls, label) => `<td class="${value === 0 ? 'zero' : cls}" data-label="${label}">${value}</td>`;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="path" data-label="Path">${p}</td>`
      + `<td data-label="n">${s.n}</td>`
      + `<td data-label="p95">${s.p95}</td>`
      + `<td class="bar-cell" data-label="Latenz"><div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div></td>`
      + cell(c.success, 'cell-ok', 'ok')
      + cell(c.expectedReject, 'cell-warn', '4xx')
      + cell(c.error, 'cell-err', 'err');
    endpointBody.appendChild(tr);
  }
}

// Built with textContent (not innerHTML) — unlike the other cells here,
// the error body snippet is real backend response text, not one of our
// own hardcoded strings, so it isn't safe to interpolate as markup.
function renderErrorRows(errors, tbody) {
  tbody.innerHTML = '';
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

// Clean runs show a quiet dashed placeholder; the moment a real error
// shows up the panel turns into a red-bordered table AND physically
// moves up to just under the health bar (errors-anchor-top) instead of
// sitting below the endpoint table (errors-anchor-bottom) — re-parenting
// every render is cheap at the 1s tick rate and keeps this idempotent.
function renderErrorsPanel(errors) {
  const hasErrors = errors && errors.length > 0;
  errorsClean.classList.toggle('hidden', hasErrors);
  errorsTable.classList.toggle('hidden', !hasErrors);
  if (hasErrors) renderErrorRows(errors, errorsBody);
  (hasErrors ? errorsAnchorTop : errorsAnchorBottom).insertAdjacentElement('afterend', errorsBlock);
}

function renderDockerStats(docker) {
  dockerStatsEl.innerHTML = '';
  for (const d of docker || []) {
    const div = document.createElement('div');
    div.className = 'stat';
    div.innerHTML = `<span class="stat__label">${d.name}</span><span class="stat__value">${d.cpu} / ${d.mem}</span>`;
    dockerStatsEl.appendChild(div);
  }
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
    setState2('running', 0, false);
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
    setState2(state.active ? 'running' : (state.status || 'idle'), state.startedAt ? Date.now() - state.startedAt : 0, false);
  })
  .catch(() => {});

// ── Charts — small-multiple line charts (throughput, p95) with a hover
// crosshair + tooltip. Kept as two single-axis charts rather than one
// dual-axis chart since the two metrics have unrelated scales. A loaded
// past run has no time series (see loadPastRunIntoMode2), so the charts
// clear and a note explains why. ─────────────────────────────────────────

const MAX_POINTS = 120;
const series = { throughput: [], p95: [] };
const chartTooltip = el('chart-tooltip');

function pushPoint(name, value) {
  const arr = series[name];
  arr.push({ t: Date.now(), v: value });
  if (arr.length > MAX_POINTS) arr.shift();
}

function resetSeries() {
  series.throughput = [];
  series.p95 = [];
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

  ctx.strokeStyle = cssVar('--outline');
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
    ctx.strokeStyle = cssVar('--on-variant');
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

function applyTick2(tick) {
  chartHistoricalNote.classList.add('hidden');
  const elapsedMs = tick.startedAt ? (tick.finishedAt || Date.now()) - tick.startedAt : 0;
  const hasError = updateHealthAndNumbers(tick.categories, tick.total, tick.throughput, tick.durationSec);
  setState2(tick.status, elapsedMs, hasError);

  renderEndpointTable2(tick.perPath);
  renderErrorsPanel(tick.errors);
  renderDockerStats(tick.docker || []);

  pushPoint('throughput', tick.throughput);
  pushPoint('p95', tick.overall ? tick.overall.p95 : 0);
  drawLineChart(chartThroughput, series.throughput, cssVar('--pink-bright'));
  drawLineChart(chartP95, series.p95, cssVar('--on-variant'));
}

const source = new EventSource('/api/events');
source.addEventListener('tick', (ev) => applyTick2(JSON.parse(ev.data)));
source.addEventListener('started', (ev) => {
  setRunningUI(true);
  resetSeries();
  chartHistoricalNote.classList.add('hidden');
  setState2(JSON.parse(ev.data).status, 0, false);
});
source.addEventListener('finished', (ev) => {
  const final = JSON.parse(ev.data);
  applyTick2({ ...final, docker: [] });
  setRunningUI(false);
  if (!panels.history.hidden) loadHistoryList();
});
source.addEventListener('run-error', (ev) => {
  controlError.textContent = JSON.parse(ev.data).message;
  setRunningUI(false);
  setState2('idle', 0, false);
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

const capStatusbarEl = el('cap-statusbar');
const capStateDot = el('cap-state-dot');
const capStateText = el('cap-state-text');
const capStatLimit = el('cap-stat-limit');
const capStatBcrypt = el('cap-stat-bcrypt');
const capStatKnee = el('cap-stat-knee');

const capTableBody = el('cap-table-body');
const capConsole = el('cap-console');

function setCapRunningUI(active) {
  capStartBtn.disabled = active;
  capStopBtn.disabled = !active;
  for (const input of [capStartRate, capRateStep, capStepSec, capMaxRate, capAutoStop, capThreshold, capBaseUrl]) {
    input.disabled = active;
  }
}

function setCapState(status, hasError) {
  capStateDot.className = 'dot' + (status === 'running' ? ' running' : status === 'finished' ? ' finished' : '') + (hasError ? ' errored' : '');
  capStateText.textContent = status === 'running' ? 'LÄUFT' : status === 'finished' ? 'FERTIG' : 'IDLE';
  capStatusbarEl.classList.toggle('errored', !!hasError);
  capStatusbarEl.classList.toggle('idle', status === 'idle');
}

// successPct here is a per-step number, not a traffic-light bucket like
// Mode 2's 2xx/4xx/5xx — amber only applies right at the threshold edge,
// otherwise it's a clean ok/err split (cleared the bar or didn't).
function successClass(successPct, threshold) {
  if (successPct >= threshold) return 'cell-ok';
  if (successPct >= threshold - 10) return 'cell-warn';
  return 'cell-err';
}

function renderCapRow(row, threshold, maxRate) {
  const tr = document.createElement('tr');
  tr.dataset.step = row.step;
  const width = maxRate > 0 ? (row.targetRate / maxRate) * 100 : 0;
  tr.innerHTML = `<td data-label="Target/s">${row.targetRate}/s</td>`
    + `<td data-label="Attempts">${row.attempts}</td>`
    + `<td data-label="Success">${row.successes}</td>`
    + `<td class="${successClass(row.successPct, threshold)}" data-label="Success %">${row.successPct.toFixed(1)}%</td>`
    + `<td class="bar-cell" data-label="Rate"><div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div></td>`
    + `<td data-label="p95 ms">${row.p95Ms}</td>`;
  return tr;
}

function renderCapTable(rows, tbody) {
  tbody.innerHTML = '';
  const threshold = Number(capThreshold.value || 95);
  const maxRate = rows.reduce((m, r) => Math.max(m, r.targetRate), 0);
  for (const row of rows) tbody.appendChild(renderCapRow(row, threshold, maxRate));
}

// The practical answer to "how many logins/sec can this backend take":
// the highest rate that still cleared the success threshold (limit), and
// the first rate — in ramp order — that fell below it (the knee where
// capacity runs out). A run that never clears the threshold, even at its
// first step, reads as a real error (red statusbar/dot), same as Mode 2.
function computeCapVerdict(rows, threshold) {
  const ordered = [...rows].sort((a, b) => a.step - b.step);
  let best = null;
  let knee = null;
  for (const row of ordered) {
    if (row.successPct >= threshold) best = row;
    else if (knee === null) knee = row;
  }
  return { best, knee };
}

function renderCapSummary(rows) {
  const threshold = Number(capThreshold.value || 95);
  const { best, knee } = computeCapVerdict(rows, threshold);
  const hasError = rows.length > 0 && best === null;

  capStatLimit.textContent = best ? `${best.targetRate}/s` : '–';
  capStatLimit.className = 'num ' + (rows.length ? (best ? 'ok' : 'err') : '');

  capStatBcrypt.textContent = best ? String(best.avgMs) : '–';
  capStatBcrypt.className = 'num';

  capStatKnee.textContent = knee ? `${knee.targetRate}/s` : '–';
  capStatKnee.className = 'num ' + (knee ? 'err' : '');

  return hasError;
}

function appendCapConsoleLine(line) {
  capConsole.textContent += (capConsole.textContent ? '\n' : '') + line;
  capConsole.scrollTop = capConsole.scrollHeight;
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
    capStatLimit.textContent = '–';
    capStatBcrypt.textContent = '–';
    capStatKnee.textContent = '–';
    setCapState('running', false);
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
    const rows = state.rows || [];
    const hasError = renderCapSummary(rows);
    setCapState(state.active ? 'running' : (state.status || 'idle'), hasError);
    renderCapTable(rows, capTableBody);
    capConsole.textContent = (state.lines || []).join('\n');
    capConsole.scrollTop = capConsole.scrollHeight;
  })
  .catch(() => {});

source.addEventListener('capacity-started', () => {
  capRowsByStep = new Map();
  setCapRunningUI(true);
  setCapState('running', false);
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
    const hasError = renderCapSummary(rows);
    setCapState('running', hasError);
  }
});
source.addEventListener('capacity-finished', (ev) => {
  const state = JSON.parse(ev.data);
  const rows = state.rows || [];
  capRowsByStep = new Map(rows.map((r) => [r.step, r]));
  setCapRunningUI(false);
  const hasError = renderCapSummary(rows);
  setCapState('finished', hasError);
  renderCapTable(rows, capTableBody);
  if (!panels.history.hidden) loadHistoryList();
});

// ═══════════════════════════════ HISTORY ═══════════════════════════════════

const historyList = el('history-list');

// Loads a past Mode 2 run's full detail into the SAME elements the live
// SSE ticks drive (status bar, health bar, endpoint table, errors panel)
// — this is the "past-run rendering that already exists" the History tab
// reuses, not a separate view. Does not touch start/stop button state:
// if a live run is actually active, its own next tick simply overwrites
// this static snapshot, which is the expected/harmless behavior.
async function loadPastRunIntoMode2(ts) {
  const res = await fetch(`/api/runs/${ts}`);
  if (!res.ok) return;
  const run = await res.json();

  if (run.params) {
    numUsersInput.value = run.params.numUsers;
    durationInput.value = run.params.durationSec;
  }

  resetSeries();
  drawLineChart(chartThroughput, [], cssVar('--pink-bright'));
  drawLineChart(chartP95, [], cssVar('--on-variant'));
  chartHistoricalNote.classList.remove('hidden');

  const total = run.stats ? run.stats.total : 0;
  const categories = run.stats ? run.stats.categories : null;
  const durationSec = run.params ? run.params.durationSec : null;
  const hasError = updateHealthAndNumbers(categories, total, null, durationSec);
  setState2('finished', 0, hasError);

  renderEndpointTable2(run.stats ? run.stats.perPath : {});
  renderErrorsPanel(run.errors || []);
  renderDockerStats([]);
}

// Same idea for Mode 1 — feeds the same stepped-ramp table + status bar
// the live capacity-line SSE events drive.
async function loadPastRunIntoMode1(ts) {
  const res = await fetch(`/api/capacity/runs/${ts}`);
  if (!res.ok) return;
  const run = await res.json();
  const rows = run.rows || [];

  if (run.params) {
    capStartRate.value = run.params.startRate;
    capRateStep.value = run.params.rateStep;
    capStepSec.value = run.params.stepSec;
    capMaxRate.value = run.params.maxRate;
    capAutoStop.checked = !!run.params.autoStop;
    if (run.params.successThreshold !== undefined) capThreshold.value = run.params.successThreshold;
    if (run.params.baseUrl) capBaseUrl.value = run.params.baseUrl;
  }

  capRowsByStep = new Map(rows.map((r) => [r.step, r]));
  renderCapTable(rows, capTableBody);
  const hasError = renderCapSummary(rows);
  setCapState('finished', hasError);
  capConsole.textContent = (run.lines || []).join('\n');
  capConsole.scrollTop = capConsole.scrollHeight;
}

// The best rate that still cleared the threshold, and the first rate (in
// ramp order) that fell below it — same logic renderCapSummary() uses
// live, reused here so a History row's numbers agree with what its own
// detail view (loadPastRunIntoMode1) will show for the same run.
function historyCapVerdict(rows, threshold) {
  return computeCapVerdict(rows, threshold ?? 95);
}

function renderHistRow(run) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'hist-row';

  let healthy;
  let metaText;
  let stats3;
  let miniBarHtml;

  if (run.mode === 2) {
    const stats = run.stats;
    const total = stats ? stats.total : 0;
    const cats = stats ? stats.categories : { success: 0, expectedReject: 0, error: 0 };
    healthy = !!stats && cats.error === 0;
    metaText = run.params ? `Mode 2 · ${run.params.numUsers} Users · ${run.params.durationSec}s` : 'Mode 2 · Lauf';
    const reqS = stats && run.params ? (total / run.params.durationSec).toFixed(1) : '–';
    const successPct = stats && total > 0 ? `${((cats.success / total) * 100).toFixed(1)}%` : '–';
    stats3 = [
      ['req/s', reqS],
      ['Erfolg', successPct],
      ['Fehler', stats ? String(cats.error) : '–'],
    ];
    miniBarHtml = `<div style="background:var(--ok);flex:${cats.success}"></div>`
      + `<div style="background:var(--warn);flex:${cats.expectedReject}"></div>`
      + `<div style="background:var(--err);flex:${cats.error}"></div>`;
  } else {
    const rows = run.rows || [];
    const { best, knee } = historyCapVerdict(rows, run.params && run.params.successThreshold);
    healthy = rows.length > 0 && !!best;
    metaText = run.params
      ? `Mode 1 · Login Capacity · ${run.params.startRate}→${run.params.maxRate}/s`
      : 'Mode 1 · Login Capacity';
    stats3 = [
      ['Grenze', best ? `${best.targetRate}/s` : '–'],
      ['bcrypt', best ? `${best.avgMs}ms` : '–'],
      ['Knick', knee ? `${knee.targetRate}/s` : '–'],
    ];
    const totalSuccesses = rows.reduce((s, r) => s + r.successes, 0);
    const totalAttempts = rows.reduce((s, r) => s + r.attempts, 0);
    miniBarHtml = `<div style="background:var(--ok);flex:${totalSuccesses}"></div>`
      + `<div style="background:var(--err);flex:${Math.max(0, totalAttempts - totalSuccesses)}"></div>`;
  }

  const statsHtml = stats3.map(([k, v]) => `<div class="hist-stat"><span class="k">${k}</span>${v}</div>`).join('');
  btn.innerHTML = `<span class="hist-badge ${healthy ? 'ok' : 'err'}"></span>`
    + `<div><div class="hist-when">${formatHistDate(run.ts)}</div><div class="hist-meta">${metaText}</div></div>`
    + statsHtml
    + `<div class="hist-mini">${miniBarHtml}</div>`;

  btn.addEventListener('click', () => {
    if (run.mode === 2) { setTab('2'); loadPastRunIntoMode2(run.ts); }
    else { setTab('1'); loadPastRunIntoMode1(run.ts); }
  });
  return btn;
}

async function loadHistoryList() {
  const [runs2, runs1] = await Promise.all([
    fetch('/api/runs').then((r) => r.json()).catch(() => []),
    fetch('/api/capacity/runs').then((r) => r.json()).catch(() => []),
  ]);
  const combined = [
    ...runs2.map((r) => ({ mode: 2, ...r })),
    ...runs1.map((r) => ({ mode: 1, ...r })),
  ].sort((a, b) => Number(b.ts) - Number(a.ts));

  historyList.innerHTML = '';
  if (!combined.length) {
    historyList.innerHTML = '<div class="hist-empty">Noch keine Läufe.</div>';
    return;
  }
  for (const run of combined) historyList.appendChild(renderHistRow(run));
}
