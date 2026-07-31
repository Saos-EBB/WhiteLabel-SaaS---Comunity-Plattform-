'use strict';
// Live view + controls over SSE, plus past-run browsing.

const el = (id) => document.getElementById(id);

const statusBadge = el('run-status');
const statTotal = el('stat-total');
const statThroughput = el('stat-throughput');
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

const STATUS_COLORS = { ok: 'var(--ok)', warn: 'var(--warn)', err: 'var(--err)', other: 'var(--muted)' };

function statusClass(code) {
  if (code === 'FAIL') return 'err';
  const n = Number(code);
  if (n >= 200 && n < 300) return 'ok';
  if (n >= 400 && n < 500) return 'warn';
  if (n >= 500) return 'err';
  return 'other';
}

const CATEGORY_LABELS = [
  ['success', 'Success (2xx)'],
  ['expectedReject', 'Expected reject (4xx)'],
  ['error', 'Error (5xx / transport)'],
];

// Headline numbers: SUCCESS / EXPECTED-REJECT / ERROR, kept visually
// separate from the raw per-status-code list below so an expected-4xx
// -heavy pipeline (e.g. pipeline_connect's 409s) never reads as a high
// error rate.
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

function renderStatusDist(statusDist) {
  statusDistEl.innerHTML = '';
  for (const [code, count] of Object.entries(statusDist).sort((a, b) => b[1] - a[1])) {
    const span = document.createElement('span');
    span.style.color = STATUS_COLORS[statusClass(code)];
    span.style.marginRight = '1rem';
    span.textContent = `${code}: ${count}`;
    statusDistEl.appendChild(span);
  }
}

function renderEndpointTable(perPath, tbody) {
  tbody.innerHTML = '';
  const paths = Object.entries(perPath).sort((a, b) => b[1].n - a[1].n);
  for (const [p, s] of paths) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${p}</td><td>${s.n}</td><td>${s.avg}</td><td>${s.p95}</td><td>${s.max}</td>`;
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

// Small-multiple line charts (throughput, p95) — kept as two single-axis
// charts rather than one dual-axis chart since the two metrics have
// unrelated scales.
const MAX_POINTS = 120;
const series = { throughput: [], p95: [] };

function pushPoint(name, value) {
  const arr = series[name];
  arr.push(value);
  if (arr.length > MAX_POINTS) arr.shift();
}

function drawLineChart(canvas, values, color) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (values.length < 2) return;

  const max = Math.max(...values, 1);
  const stepX = w / (MAX_POINTS - 1);
  const startIdx = MAX_POINTS - values.length;

  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border').trim();
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h - 0.5);
  ctx.lineTo(w, h - 0.5);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = (startIdx + i) * stepX;
    const y = h - (v / max) * (h - 10) - 2;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  const lastX = (startIdx + values.length - 1) * stepX;
  const lastY = h - (values[values.length - 1] / max) * (h - 10) - 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
  ctx.fill();
}

function applyTick(tick) {
  setStatus(tick.status);

  statTotal.textContent = tick.total;
  statThroughput.textContent = tick.throughput.toFixed(1);

  renderCategories(tick.categories, tick.total, categoriesEl);
  renderStatusDist(tick.statusDist);
  renderEndpointTable(tick.perPath, endpointBody);
  renderErrors(tick.errors, errorsBody);
  renderDockerStats(tick.docker || []);

  pushPoint('throughput', tick.throughput);
  pushPoint('p95', tick.overall ? tick.overall.p95 : 0);
  drawLineChart(chartThroughput, series.throughput, getComputedStyle(document.documentElement).getPropertyValue('--series-1').trim());
  drawLineChart(chartP95, series.p95, getComputedStyle(document.documentElement).getPropertyValue('--series-2').trim());
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
