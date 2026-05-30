#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const INPUT  = path.resolve(__dirname, '../test-results.json');
const OUTPUT = path.resolve(__dirname, '../test-dashboard.html');

if (!fs.existsSync(INPUT)) {
  console.error('No test-results.json found. Run tests first:\n  npm run test:e2e');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
fs.writeFileSync(OUTPUT, buildHtml(data));
console.log('Dashboard generated:', OUTPUT);

// ─── HTML builder ────────────────────────────────────────────────────────────

function buildHtml(data) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Playwright Test Results</title>
<style>
:root {
  --bg: #f0f4f8;
  --panel: #ffffff;
  --panel-2: #eef1f6;
  --border: #d0d7e3;
  --text: #1a2233;
  --muted: #6b7a99;
  --accent: #3b6fd4;
  --ok: #2a9d5c;
  --warn: #c87a15;
  --bad: #c0392b;
  --ok-bg: rgba(42,157,92,.09);
  --bad-bg: rgba(192,57,43,.09);
  --warn-bg: rgba(200,122,21,.09);
  --shadow: 0 1px 3px rgba(0,0,0,.07),0 1px 2px rgba(0,0,0,.05);
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:14px;background:var(--bg);color:var(--text);line-height:1.5;min-height:100vh}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}

/* ── Header ── */
.header{background:var(--accent);color:#fff;padding:20px 28px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
.header-brand{display:flex;align-items:center;gap:10px;font-size:18px;font-weight:700}
.header-meta{font-size:13px;opacity:.85}
.header-link{color:#fff;opacity:.85;font-size:13px;border:1px solid rgba(255,255,255,.4);border-radius:6px;padding:4px 12px;transition:opacity .15s}
.header-link:hover{opacity:1;text-decoration:none}

/* ── Stats bar ── */
.stats-bar{display:flex;gap:12px;padding:20px 28px;flex-wrap:wrap}
.stat-card{flex:1;min-width:120px;background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:14px 18px;box-shadow:var(--shadow)}
.stat-card .label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:6px}
.stat-card .value{font-size:28px;font-weight:700}
.stat-card.ok  .value{color:var(--ok)}
.stat-card.bad .value{color:var(--bad)}
.stat-card.warn .value{color:var(--warn)}

/* ── Toolbar ── */
.toolbar{display:flex;align-items:center;gap:10px;padding:0 28px 16px;flex-wrap:wrap}
.filter-group{display:flex;gap:4px}
.filter-btn{background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:5px 14px;font-size:13px;cursor:pointer;color:var(--muted);transition:all .15s}
.filter-btn:hover{background:var(--panel-2)}
.filter-btn.active{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:600}
.search-box{margin-left:auto;background:var(--panel);border:1px solid var(--border);border-radius:6px;padding:5px 12px;font-size:13px;font-family:inherit;color:var(--text);width:220px}
.search-box:focus{outline:none;border-color:var(--accent)}

/* ── File sections ── */
.files{padding:0 28px 32px;display:flex;flex-direction:column;gap:10px}
.file-section{background:var(--panel);border:1px solid var(--border);border-radius:10px;overflow:hidden;box-shadow:var(--shadow)}
.file-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;cursor:pointer;user-select:none;border-bottom:1px solid var(--border);background:var(--panel-2);gap:8px}
.file-header:hover{background:var(--border)}
.file-title{font-weight:600;font-size:13px;color:var(--text)}
.file-chevron{font-size:10px;color:var(--muted);transition:transform .2s}
.file-section.open .file-chevron{transform:rotate(90deg)}
.file-body{display:none}
.file-section.open .file-body{display:block}

/* ── Suite groups ── */
.suite-name{padding:8px 16px 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}

/* ── Test rows ── */
.test-row{display:flex;align-items:flex-start;gap:10px;padding:8px 16px;border-bottom:1px solid var(--border);transition:background .1s}
.test-row:last-child{border-bottom:none}
.test-row:hover{background:var(--panel-2)}
.test-row.hidden{display:none}
.status-icon{flex-shrink:0;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;margin-top:1px}
.status-icon.passed{background:var(--ok-bg);color:var(--ok)}
.status-icon.failed{background:var(--bad-bg);color:var(--bad)}
.status-icon.skipped{background:var(--warn-bg);color:var(--warn)}
.test-body{flex:1;min-width:0}
.test-title{font-size:13px}
.test-error{margin-top:6px;background:var(--bad-bg);border:1px solid rgba(192,57,43,.2);border-radius:6px;padding:8px 10px;font-family:ui-monospace,Menlo,monospace;font-size:11px;color:var(--bad);white-space:pre-wrap;word-break:break-all;max-height:200px;overflow-y:auto}
.test-duration{flex-shrink:0;font-size:11px;color:var(--muted);margin-top:2px}

/* ── Badges ── */
.badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;flex-shrink:0}
.badge.ok{background:var(--ok-bg);color:var(--ok)}
.badge.bad{background:var(--bad-bg);color:var(--bad)}

/* ── Empty state ── */
.empty{text-align:center;padding:40px;color:var(--muted);font-size:14px}
</style>
</head>
<body>
<script>
const DATA = ${JSON.stringify(data)};

// ── Flatten all specs from the nested suite tree ──────────────────────────
function collectSpecs(suite, file, suitePath) {
  const out = [];
  const myFile = suite.file || file || '';
  const myPath = suitePath
    ? (suite.title ? suitePath + ' › ' + suite.title : suitePath)
    : (suite.title || '');

  for (const spec of (suite.specs || [])) {
    const test = spec.tests?.[0];
    const result = test?.results?.[0];
    const status = result?.status === 'passed' ? 'passed'
                 : result?.status === 'skipped' ? 'skipped'
                 : spec.ok ? 'passed' : 'failed';
    const errMsg = (result?.errors || []).map(e => e.message || e.stack || '').join('\\n').trim();
    out.push({ file: myFile, suite: myPath, title: spec.title, status, duration: result?.duration ?? 0, error: errMsg });
  }
  for (const child of (suite.suites || [])) {
    out.push(...collectSpecs(child, myFile, myPath));
  }
  return out;
}

const specs = (DATA.suites || []).flatMap(s => collectSpecs(s, s.file || s.title, ''));
const stats = DATA.stats || {};
const passed  = specs.filter(s => s.status === 'passed').length;
const failed  = specs.filter(s => s.status === 'failed').length;
const skipped = specs.filter(s => s.status === 'skipped').length;
const total   = specs.length;
const dur     = stats.duration ?? 0;
const runTime = stats.startTime ? new Date(stats.startTime).toLocaleString() : 'Unknown';

function fmt(ms) {
  if (ms >= 60000) return (ms / 60000).toFixed(1) + 'm';
  if (ms >= 1000)  return (ms / 1000).toFixed(1) + 's';
  return ms + 'ms';
}

// ── Group specs by file ───────────────────────────────────────────────────
const byFile = {};
for (const spec of specs) {
  if (!byFile[spec.file]) byFile[spec.file] = [];
  byFile[spec.file].push(spec);
}

// ── Build DOM ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Header
  document.getElementById('run-time').textContent = runTime;

  // Stats
  document.getElementById('stat-total').textContent   = total;
  document.getElementById('stat-passed').textContent  = passed;
  document.getElementById('stat-failed').textContent  = failed;
  document.getElementById('stat-skipped').textContent = skipped;
  document.getElementById('stat-dur').textContent     = fmt(dur);

  // Files
  const container = document.getElementById('files');
  if (Object.keys(byFile).length === 0) {
    container.innerHTML = '<div class="empty">No test results found.</div>';
    return;
  }

  // Sort: failed files first
  const fileKeys = Object.keys(byFile).sort((a, b) => {
    const af = byFile[a].some(s => s.status === 'failed');
    const bf = byFile[b].some(s => s.status === 'failed');
    return (bf ? 1 : 0) - (af ? 1 : 0);
  });

  for (const file of fileKeys) {
    const fileSpecs = byFile[file];
    const filePassed  = fileSpecs.filter(s => s.status === 'passed').length;
    const fileFailed  = fileSpecs.filter(s => s.status === 'failed').length;
    const allOk = fileFailed === 0;
    const label = file.replace(/^.*[\\\\/]tests[\\\\/]/, '');

    const section = document.createElement('div');
    section.className = 'file-section' + (fileFailed > 0 ? ' open' : '');
    section.dataset.file = file;

    const badge = allOk
      ? \`<span class="badge ok">✓ \${filePassed}/\${fileSpecs.length}</span>\`
      : \`<span class="badge bad">✗ \${fileFailed} failed</span>\`;

    section.innerHTML = \`
      <div class="file-header" onclick="toggleSection(this)">
        <span class="file-chevron">▶</span>
        <span class="file-title">\${label}</span>
        \${badge}
      </div>
      <div class="file-body"></div>
    \`;

    // Group by suite within the file
    const bySuite = {};
    for (const spec of fileSpecs) {
      const key = spec.suite || '(top level)';
      if (!bySuite[key]) bySuite[key] = [];
      bySuite[key].push(spec);
    }

    const body = section.querySelector('.file-body');
    for (const [suiteName, suiteSpecs] of Object.entries(bySuite)) {
      // Suite label — strip the file path prefix that gets prepended
      const cleanSuite = suiteName.replace(/^[^›]+› ?/, '');
      if (cleanSuite) {
        const nameEl = document.createElement('div');
        nameEl.className = 'suite-name';
        nameEl.textContent = cleanSuite;
        body.appendChild(nameEl);
      }
      for (const spec of suiteSpecs) {
        const row = document.createElement('div');
        row.className = \`test-row \${spec.status}\`;
        row.dataset.status = spec.status;
        row.dataset.title = spec.title.toLowerCase();
        const errHtml = spec.error
          ? \`<div class="test-error">\${escHtml(spec.error)}</div>\`
          : '';
        row.innerHTML = \`
          <div class="status-icon \${spec.status}">\${statusIcon(spec.status)}</div>
          <div class="test-body">
            <div class="test-title">\${escHtml(spec.title)}</div>
            \${errHtml}
          </div>
          <div class="test-duration">\${fmt(spec.duration)}</div>
        \`;
        body.appendChild(row);
      }
    }
    container.appendChild(section);
  }

  // Open all sections if there are no failures
  if (failed === 0) {
    document.querySelectorAll('.file-section').forEach(s => s.classList.add('open'));
  }
});

function toggleSection(header) {
  header.closest('.file-section').classList.toggle('open');
}

function statusIcon(s) {
  return s === 'passed' ? '✓' : s === 'failed' ? '✗' : '–';
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Filter + search ───────────────────────────────────────────────────────
function applyFilters() {
  const filter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
  const query  = document.getElementById('search').value.toLowerCase().trim();

  document.querySelectorAll('.file-section').forEach(section => {
    let sectionVisible = false;
    section.querySelectorAll('.test-row').forEach(row => {
      const matchStatus = filter === 'all' || row.dataset.status === filter;
      const matchQuery  = !query || row.dataset.title.includes(query);
      const show = matchStatus && matchQuery;
      row.classList.toggle('hidden', !show);
      if (show) sectionVisible = true;
    });
    section.style.display = sectionVisible ? '' : 'none';
    section.querySelectorAll('.suite-name').forEach(sn => {
      // Hide suite label if all its tests are hidden
      let next = sn.nextElementSibling;
      let anyVisible = false;
      while (next && !next.classList.contains('suite-name')) {
        if (!next.classList.contains('hidden')) anyVisible = true;
        next = next.nextElementSibling;
      }
      sn.style.display = anyVisible ? '' : 'none';
    });
  });
}

function setFilter(btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  applyFilters();
}
</script>

<div class="header">
  <div class="header-brand">💸 Playwright Test Results</div>
  <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
    <span class="header-meta">Run: <span id="run-time"></span></span>
    <a href="playwright-report/index.html" class="header-link" target="_blank">Full Report →</a>
  </div>
</div>

<div class="stats-bar">
  <div class="stat-card">
    <div class="label">Total</div>
    <div class="value" id="stat-total">—</div>
  </div>
  <div class="stat-card ok">
    <div class="label">Passed</div>
    <div class="value" id="stat-passed">—</div>
  </div>
  <div class="stat-card bad">
    <div class="label">Failed</div>
    <div class="value" id="stat-failed">—</div>
  </div>
  <div class="stat-card warn">
    <div class="label">Skipped</div>
    <div class="value" id="stat-skipped">—</div>
  </div>
  <div class="stat-card">
    <div class="label">Duration</div>
    <div class="value" id="stat-dur">—</div>
  </div>
</div>

<div class="toolbar">
  <div class="filter-group">
    <button class="filter-btn active" data-filter="all"     onclick="setFilter(this)">All</button>
    <button class="filter-btn"        data-filter="passed"  onclick="setFilter(this)">Passed</button>
    <button class="filter-btn"        data-filter="failed"  onclick="setFilter(this)">Failed</button>
    <button class="filter-btn"        data-filter="skipped" onclick="setFilter(this)">Skipped</button>
  </div>
  <input id="search" class="search-box" type="search" placeholder="Search tests…" oninput="applyFilters()">
</div>

<div id="files" class="files"></div>
</body>
</html>`;
}
