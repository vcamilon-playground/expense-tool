/**
 * Reads Playwright CI failure logs, asks GitHub Models (GPT-4o mini) to identify
 * fixes, then writes corrected page-object files back to disk.
 *
 * Uses the GH_PAT already configured for the autoheal push — no extra key needed.
 *
 * Usage:
 *   GH_TOKEN=<pat> node scripts/autoheal.mjs <log-file>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const GH_TOKEN = process.env.GH_TOKEN;
if (!GH_TOKEN) {
  console.error('[autoheal] GH_TOKEN is not set — aborting.');
  process.exit(1);
}

const logFile = process.argv[2];
if (!logFile || !fs.existsSync(logFile)) {
  console.error('[autoheal] Usage: node scripts/autoheal.mjs <path-to-failure-logs.txt>');
  process.exit(1);
}

const logs = fs.readFileSync(logFile, 'utf-8');
const claudeMd = fs.readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf-8');

// Collect all page objects
const pagesDir = path.join(ROOT, 'apps/e2e/tests/pages');
const pageFiles = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.ts'));
const pageObjects = pageFiles
  .map((f) => `=== apps/e2e/tests/pages/${f} ===\n${fs.readFileSync(path.join(pagesDir, f), 'utf-8')}`)
  .join('\n\n');

// Collect web app source so the model can verify selectors actually exist
function readDir(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return readDir(full, ext);
    if (entry.isFile() && entry.name.endsWith(ext)) return [full];
    return [];
  });
}

const webSourceFiles = [
  ...readDir(path.join(ROOT, 'apps/web/src/components'), '.tsx'),
  ...readDir(path.join(ROOT, 'apps/web/src/app'), '.tsx'),
];

const webSource = webSourceFiles
  .map((f) => `=== ${path.relative(ROOT, f)} ===\n${fs.readFileSync(f, 'utf-8')}`)
  .join('\n\n');

const systemPrompt = `
You are an expert Playwright test maintainer. Your only job is to fix failing Playwright
tests by updating page object locators.

STRICT RULES — violating any of these makes the fix useless:
1. Only use selectors that are visible in the web app source files provided. Never invent
   class names, IDs, roles, or text that do not appear in those files.
2. Prefer Playwright's recommended locator priority:
   a. getByRole (with accessible name) — most resilient
   b. getByText / getByLabel
   c. CSS class / attribute selectors — only for classes that exist in the source
3. Never touch spec files unless the test logic itself is wrong.
4. Never touch files unrelated to the failing test.
5. Respond ONLY with a valid JSON array — no explanation, no markdown fences.
`.trim();

const userPrompt = `
## CLAUDE.md (project conventions)
${claudeMd}

## Web app source (ground truth — only use selectors from here)
${webSource}

## Current page objects
${pageObjects}

## CI failure logs
${logs}

## Task
1. Identify every failing test and its exact error.
2. Find the element in the web app source that the test is trying to reach.
3. Write the correct Playwright locator for that element.
4. Return the minimal fix for each affected page object.

Respond with a JSON array where each element has:
- "file": relative path from repo root (e.g. "apps/e2e/tests/pages/NavBar.ts")
- "content": the COMPLETE corrected file content as a string

If no fix is needed, return [].
`.trim();

console.log('[autoheal] Sending logs to GitHub Models (gpt-4o-mini)…');

const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${GH_TOKEN}`,
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  }),
});

if (!response.ok) {
  const err = await response.text();
  console.error(`[autoheal] GitHub Models API error ${response.status}: ${err}`);
  process.exit(1);
}

const data = await response.json();
const raw = data.choices?.[0]?.message?.content ?? '';

// GitHub Models JSON mode wraps arrays in an object — unwrap if needed
let fixes;
try {
  const parsed = JSON.parse(raw);
  fixes = Array.isArray(parsed) ? parsed : (parsed.fixes ?? parsed.changes ?? Object.values(parsed)[0] ?? []);
} catch {
  console.error('[autoheal] Could not parse response as JSON:\n', raw);
  process.exit(1);
}

if (!Array.isArray(fixes) || fixes.length === 0) {
  console.log('[autoheal] No fixes needed.');
  process.exit(0);
}

for (const { file, content } of fixes) {
  if (!file || typeof content !== 'string') {
    console.warn('[autoheal] Skipping malformed fix entry:', { file });
    continue;
  }
  const abs = path.resolve(ROOT, file);
  // Safety: only allow writes inside apps/e2e
  if (!abs.startsWith(path.join(ROOT, 'apps/e2e'))) {
    console.warn(`[autoheal] Refusing to write outside apps/e2e: ${file}`);
    continue;
  }
  fs.writeFileSync(abs, content, 'utf-8');
  console.log(`[autoheal] Fixed: ${file}`);
}

console.log('[autoheal] Done.');
