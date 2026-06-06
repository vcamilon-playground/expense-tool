#!/usr/bin/env node
// Usage: node scripts/release.mjs [patch|minor|major]
// Bumps apps/web/package.json version, commits, tags, and pushes.

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const type = process.argv[2] ?? 'patch';
if (!['patch', 'minor', 'major'].includes(type)) {
  console.error('Usage: node scripts/release.mjs [patch|minor|major]');
  process.exit(1);
}

const pkgPath = 'apps/web/package.json';
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);

let next;
if (type === 'major') next = `${major + 1}.0.0`;
else if (type === 'minor') next = `${major}.${minor + 1}.0`;
else next = `${major}.${minor}.${patch + 1}`;

pkg.version = next;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

run(`git add ${pkgPath}`);
run(`git commit -m "chore(release): v${next}"`);
run(`git tag -a v${next} -m "Release v${next}"`);
run(`git push origin main --tags`);

console.log(`\n✅  Released v${next} — Vercel deployment triggered.`);
