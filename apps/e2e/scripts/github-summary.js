#!/usr/bin/env node
'use strict';

// Renders a Playwright run summary as GitHub-flavored markdown and appends it to
// the workflow run summary page ($GITHUB_STEP_SUMMARY). Falls back to stdout when
// run locally. Reads the same test-results.json the JSON reporter writes.
//
//   node scripts/github-summary.js "Smoke tests"

const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../test-results.json');
const TITLE = process.argv[2] || process.env.SUMMARY_TITLE || 'E2E Tests';
const ERROR_LIMIT = 1500;

function write(markdown) {
  const target = process.env.GITHUB_STEP_SUMMARY;
  if (target) {
    fs.appendFileSync(target, markdown.endsWith('\n') ? markdown : markdown + '\n');
  } else {
    process.stdout.write(markdown);
  }
}

if (!fs.existsSync(INPUT)) {
  write(`## 🧪 ${TITLE}\n\n> ⚠️ No \`test-results.json\` was produced — the run may have crashed before any tests executed.\n`);
  process.exit(0);
}

const data = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// Flatten the nested suite tree into a flat list of specs with their outcome.
function collectSpecs(suite, file, suitePath) {
  const out = [];
  const myFile = suite.file || file || '';
  const myPath = suitePath
    ? (suite.title ? suitePath + ' › ' + suite.title : suitePath)
    : (suite.title || '');

  for (const spec of suite.specs || []) {
    const test = spec.tests && spec.tests[0];
    const result = test && test.results && test.results[0];
    const status = result && result.status === 'passed' ? 'passed'
                 : result && result.status === 'skipped' ? 'skipped'
                 : spec.ok ? 'passed' : 'failed';
    const error = ((result && result.errors) || [])
      .map((e) => e.message || e.stack || '')
      .join('\n')
      .trim();
    out.push({
      file: myFile.replace(/^.*[\\/]tests[\\/]/, ''),
      // The root suite's title is the file name; only keep describe-block names.
      suite: myPath.includes('›') ? myPath.replace(/^[^›]+›\s*/, '') : '',
      title: spec.title,
      status,
      duration: (result && result.duration) || 0,
      error,
    });
  }
  for (const child of suite.suites || []) {
    out.push(...collectSpecs(child, myFile, myPath));
  }
  return out;
}

const specs = (data.suites || []).flatMap((s) => collectSpecs(s, s.file || s.title, ''));
const stats = data.stats || {};
const passed = specs.filter((s) => s.status === 'passed').length;
const failed = specs.filter((s) => s.status === 'failed').length;
const skipped = specs.filter((s) => s.status === 'skipped').length;
const total = specs.length;

function formatDuration(ms) {
  if (ms >= 60000) return (ms / 60000).toFixed(1) + 'm';
  if (ms >= 1000) return (ms / 1000).toFixed(1) + 's';
  return ms + 'ms';
}

// Strip ANSI color codes so error blocks are readable in the markdown summary.
function stripAnsi(str) {
  return str.replace(/\[[0-9;]*m/g, '');
}

const headline = failed > 0 ? '❌ Failed' : total === 0 ? '⚠️ No tests run' : '✅ Passed';

const lines = [];
lines.push(`## 🧪 ${TITLE} — ${headline}`);
lines.push('');
lines.push('| Result | Count |');
lines.push('| --- | --- |');
lines.push(`| ✅ Passed | ${passed} |`);
lines.push(`| ❌ Failed | ${failed} |`);
lines.push(`| ⏭️ Skipped | ${skipped} |`);
lines.push(`| **Total** | **${total}** |`);
lines.push('');

const runAt = stats.startTime ? new Date(stats.startTime).toISOString().replace('T', ' ').slice(0, 19) + ' UTC' : 'unknown';
lines.push(`⏱️ Duration: **${formatDuration(stats.duration || 0)}** · Run at ${runAt}`);
lines.push('');

if (failed > 0) {
  lines.push('### Failed tests');
  lines.push('');
  for (const spec of specs.filter((s) => s.status === 'failed')) {
    const name = [spec.file, spec.suite, spec.title].filter(Boolean).join(' › ');
    lines.push(`<details><summary>❌ ${name}</summary>`);
    lines.push('');
    if (spec.error) {
      const error = stripAnsi(spec.error).slice(0, ERROR_LIMIT);
      lines.push('```');
      lines.push(error);
      lines.push('```');
    } else {
      lines.push('_No error message captured._');
    }
    lines.push('');
    lines.push('</details>');
    lines.push('');
  }
}

write(lines.join('\n'));
