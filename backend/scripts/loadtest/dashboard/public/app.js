'use strict';
// Live view + controls over SSE. Past-run selection is added in a
// later commit.

const el = (id) => document.getElementById(id);

const statusBadge = el('run-status');
const statTotal = el('stat-total');
const statThroughput = el('stat-throughput');
const statusDistEl = el('status-dist');
const endpointBody = document.querySelector('#endpoint-table tbody');
const dockerStatsEl = el('docker-stats');
const chartThroughput = el('chart-throughput');
const chartP95 = el('chart-p95');
const numUsersInput = el('num-users');
const durationInput = el('duration-sec');
const startBtn = el('start-btn');
const stopBtn = el('stop-btn');
const controlError = el('control-error');

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

const STATUS_COLORS = { ok: 'var(--ok)', warn: 'var(--warn)', err: 'var(--err)', other: 'var(--muted)' };

function statusClass(code) {
  if (code === 'FAIL') return 'err';
  const n = Number(code);
  if (n >= 200 && n < 300) return 'ok';
  if (n >= 400 && n < 500) return 'warn';
  if (n >= 500) return 'err';
  return 'other';
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

  renderStatusDist(tick.statusDist);
  renderEndpointTable(tick.perPath, endpointBody);
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
  applyTick({ ...JSON.parse(ev.data), throughput: 0, docker: [] });
  setRunningUI(false);
});
source.addEventListener('run-error', (ev) => {
  controlError.textContent = JSON.parse(ev.data).message;
  setRunningUI(false);
  setStatus('idle');
});
