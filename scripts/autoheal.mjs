/**
 * Reads Playwright CI failure logs, asks Claude to identify fixes,
 * then writes corrected page-object files back to disk.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=<key> node scripts/autoheal.mjs <log-file>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('[autoheal] ANTHROPIC_API_KEY is not set — aborting.');
  process.exit(1);
}

const logFile = process.argv[2];
if (!logFile || !fs.existsSync(logFile)) {
  console.error('[autoheal] Usage: node scripts/autoheal.mjs <path-to-failure-logs.txt>');
  process.exit(1);
}

const logs = fs.readFileSync(logFile, 'utf-8');
const claudeMd = fs.readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf-8');

// Collect all page objects so Claude has full context
const pagesDir = path.join(ROOT, 'apps/e2e/tests/pages');
const pageFiles = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.ts'));
const pageObjects = pageFiles
  .map((f) => `=== apps/e2e/tests/pages/${f} ===\n${fs.readFileSync(path.join(pagesDir, f), 'utf-8')}`)
  .join('\n\n');

// Also collect the web app NavBar component so Claude knows the real HTML
const navBarComponent = path.join(ROOT, 'apps/web/src/components/NavBar.tsx');
const appContext = fs.existsSync(navBarComponent)
  ? `=== apps/web/src/components/NavBar.tsx ===\n${fs.readFileSync(navBarComponent, 'utf-8')}`
  : '';

const systemPrompt = `
You are an expert Playwright test maintainer. Your only job is to fix failing tests
by updating page object locators — you never touch spec files unless test logic is wrong,
and you never run tests or servers.

When choosing a locator, always prefer Playwright's recommended priority:
1. getByRole (with accessible name) — most resilient
2. getByText / getByLabel — for non-interactive elements
3. CSS class selectors — only as a last resort, and only for classes that exist in the provided source

Never invent selectors. Only use selectors that are visible in the provided source files.

The project conventions are documented in CLAUDE.md (provided below).
`.trim();

const userPrompt = `
## CLAUDE.md (project conventions)
${claudeMd}

## Web app component source (use this to find correct selectors)
${appContext}

## Current page objects
${pageObjects}

## CI failure logs
${logs}

## Your task
1. Read every failing test error in the logs.
2. Cross-reference the web app source to find the correct selector.
3. Produce the minimal fix for each affected page object file.

Respond with ONLY a JSON array. Each element has exactly these keys:
- "file": relative path from repo root, e.g. "apps/e2e/tests/pages/RecurringPage.ts"
- "content": the COMPLETE corrected file content as a string

If no changes are needed, respond with an empty array: []

Do not include any explanation outside the JSON array.
`.trim();

console.log('[autoheal] Sending logs to Claude…');

const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt },
    ],
  }),
});

if (!response.ok) {
  const err = await response.text();
  console.error(`[autoheal] Claude API error ${response.status}: ${err}`);
  process.exit(1);
}

const data = await response.json();
const raw = data.content?.[0]?.text ?? '';

// Strip markdown code fences if Claude wraps the JSON
const jsonText = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

let fixes;
try {
  fixes = JSON.parse(jsonText);
} catch {
  console.error('[autoheal] Could not parse Claude response as JSON:\n', raw);
  process.exit(1);
}

if (!Array.isArray(fixes) || fixes.length === 0) {
  console.log('[autoheal] Claude found no fixes needed.');
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
