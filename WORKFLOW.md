# Development Workflow (agent-driven SDLC)

How a change moves from code to shipped in this repo, and which agent owns each stage. The QA loop (test-scenario-designer → e2e-author → qa-reviewer) runs on every app behaviour/UI change; skip it only for docs-only, test-only, or CI/config-only changes.

Detailed procedures live in each agent under [`.claude/agents/`](.claude/agents/); this file is the map that ties them together.

```mermaid
flowchart TD
    Dev([Code change]):::dev --> TSD["<b>test-scenario-designer</b><br/>consolidated scenario table<br/>(automatable Yes/No, test data,<br/>regression scripts)"]:::agent
    TSD --> EA["<b>e2e-author</b><br/>author automatable specs ·<br/>assess/update/delete existing scripts ·<br/>run NOT-automatable via Playwright MCP"]:::agent
    EA --> RUN[/"User runs the specs in the<br/>VS Code Playwright Test Explorer"/]:::user
    RUN --> VAL{"<b>e2e-author</b> validates the run<br/>(reads test-results/, freshness-checked)"}:::agent
    VAL -->|script issue| FIXS[Fix spec / page object]
    FIXS --> RUN
    VAL -->|app bug| FIXA[Fix app code]
    FIXA --> TSD
    VAL -->|fresh + green| QA{"<b>qa-reviewer</b><br/>coverage · specs · run results ·<br/>manual report · deletions"}:::agent
    QA -->|NEEDS_REWORK| TSD
    QA -->|NEEDS_REWORK| EA
    QA -->|APPROVED| DOCS["<b>docs-sync</b><br/>README · TESTS · CODING_STANDARDS ·<br/>TEST_AUTOMATION_STANDARDS · CLAUDE"]:::agent
    DOCS --> SHIP["<b>change-shipper</b><br/>review → typecheck → unit →<br/>version bump → commit/push<br/>(no local E2E)"]:::agent
    SHIP --> CI[["GitHub Actions<br/>E2E smoke + regression<br/>(authoritative gate)"]]:::ci
    HEAL["<b>e2e-healer</b><br/>(any time CI E2E fails)"]:::agent -.-> CI

    classDef dev fill:#e8eefc,stroke:#38598b,color:#1b2a4a;
    classDef agent fill:#eafbf1,stroke:#2e8b57,color:#14432a;
    classDef user fill:#fff4e0,stroke:#c88a1a,color:#5a3d00;
    classDef fix fill:#fde8e8,stroke:#c0392b,color:#611111;
    classDef ci fill:#eee9fb,stroke:#6a4fb0,color:#2e1b57;
    class FIXS,FIXA fix;
```

## Stages

1. **Code change** — the feature, bug fix, or UI change is implemented (types → `lib/db.ts` → page). See [`CLAUDE.md`](CLAUDE.md) → "Adding a New Feature".

2. **`test-scenario-designer`** — enumerates the test scenarios driven by the change's functional impact and blast radius, consolidated (one shared control → one cross-page scenario; positive+negative merged). Outputs a single **scenario table** with an Automatable **Yes/No** tag, literal test data, and a list of existing regression scripts to re-run.
   - **Automatable = No** only for the five external touchpoints the Playwright suite can't drive: Resend email, AI receipt OCR, the daily cron, PWA/service-worker, and the mobile app. Everything Supabase-reachable is automatable.

3. **`e2e-author`** — splits the table two ways:
   - **Automatable → writes/updates specs + page objects** per [`TEST_AUTOMATION_STANDARDS.md`](TEST_AUTOMATION_STANDARDS.md), and **assesses existing scripts** (update / delete / regression).
   - **Not-automatable → executes them itself via Playwright MCP** and reports Pass/Fail/Blocked (✅/❌/🛑) with evidence.
   - It does **not** run the automated specs; it hands the user a bullet list of exactly which specs to run.

4. **User runs the specs** in the VS Code Playwright Test Explorer and tells `e2e-author` when done. (Nobody auto-runs the suite — this keeps token cost down.)

5. **`e2e-author` validates the run** by reading the `test-results/` artifacts (freshness-checked), and **gates it green** before review:
   - **Script issue** → fixes the spec/page object → user re-runs **all** specs → re-validate.
   - **App bug** → app is fixed → back to `test-scenario-designer` (existing + new scenarios for the fix) → `e2e-author` → user re-runs **all** specs → re-validate.
   - **Fresh + green** → hands off to `qa-reviewer`.

6. **`qa-reviewer`** — reviews coverage, the automatable/not-automatable split, spec soundness, the automated run results, the manual-test report, and deletions. Verdict **APPROVED** or **NEEDS_REWORK** (routed back to `test-scenario-designer` / `e2e-author`, or an app fix). Loop until APPROVED.

7. **`docs-sync`** — updates the five project docs (README, TESTS, CODING_STANDARDS, TEST_AUTOMATION_STANDARDS, CLAUDE) so none contradicts the change.

8. **`change-shipper`** — the local gate: code review → `typecheck` → unit tests → version bump (`apps/web/package.json`) → commit + push. It does **not** run E2E locally.

9. **GitHub Actions** (`.github/workflows/e2e.yml`) — runs the E2E smoke + regression jobs after the push/deploy. This is the **authoritative** E2E gate. If it fails, **`e2e-healer`** diagnoses (app-code-first) and fixes it.

## Notes
- Subagents can't invoke each other — **you (the main thread) orchestrate** the loop, passing each agent's output to the next.
- The QA loop applies to app behaviour/UI changes. For docs-only / test-only / CI-config-only changes, go straight to `docs-sync` → `change-shipper`.
