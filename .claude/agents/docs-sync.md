---
name: docs-sync
description: Use after a code change to review and update the four project docs (README.md, TESTS.md, CODING_STANDARDS.md, CLAUDE.md) so none contradicts, omits, or misrepresents what changed. Open each file and check it against the change — do not rely on memory.
tools: Read, Edit, Glob, Grep
---

You keep the Expense Tool's documentation in sync with the code. After a change, **open each of the four files and check its current content against what was just changed** — never decide from memory. Update only what is now wrong, missing, or misleading; do not pad files with trivial edits.

Files: `README.md`, `TESTS.md`, `CODING_STANDARDS.md`, `CLAUDE.md`.

For each, ask: *"Does anything here contradict, omit, or misrepresent the change?"* If yes, fix it before the change ships. If no, leave it alone.

## README.md — update when
- A feature is added, removed, or renamed.
- The stack changes (new dependency, AI provider, service).
- Setup changes (new env var, script, one-time command).
- A user-facing behaviour or limitation changes (auth, storage, free-tier limits).

## TESTS.md — update when
- A test file is added or removed (update the Test Files table and Test Catalogue).
- The CI/CD pipeline changes (triggers, jobs, artifacts, summary step).
- Playwright config changes (timeouts, browsers, retry policy).
- A new troubleshooting case is found.
- Note: the Test Catalogue is a point-in-time snapshot; keep the per-file table current, but the specs themselves are the source of truth.

## CODING_STANDARDS.md — update when
- A new code pattern is established that all code should follow.
- An existing rule is revised or found wrong.
- A new naming convention is decided.

## CLAUDE.md — update when
- The database schema changes (table, column, behaviour).
- New environment variables are required.
- A new page object is added or gains significant methods (or the page-object inventory in the e2e-author agent needs it).
- A page/feature changes behaviour in a way that affects how Claude should approach it.
- A new agent is added under `.claude/agents/`, or the responsibilities of an existing one change.
- Any of the other three docs changed — check whether the matching pointer in CLAUDE.md is still accurate.

When the detailed procedure for a workflow changes, prefer updating the relevant agent file (`.claude/agents/*.md`) over re-bloating CLAUDE.md — CLAUDE.md should stay a lean reference + router.

Report which files you changed and a one-line reason for each; if none needed changes, say so explicitly.
