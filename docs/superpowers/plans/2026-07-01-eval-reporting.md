# Eval Reporting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic reporting over persisted execution JSONL logs.

**Architecture:** Reporting lives in `packages/executor-core` because that package owns `ExecutionLogEntry`, JSONL log stores, token usage, cost, and execution run results. The implementation should expose pure summary/formatting functions and a small CLI wrapper, keeping file I/O at the CLI boundary.

**Tech Stack:** TypeScript, pnpm workspaces, Vitest, Node ESM, JSONL execution logs.

---

## File Structure

- Create `packages/executor-core/src/eval-report.ts`: pure summary and text formatting functions.
- Create `packages/executor-core/src/eval-report-cli.ts`: CLI boundary that reads a JSONL path and prints a text report.
- Create `packages/executor-core/tests/eval-report.test.ts`: unit tests for summary and formatting.
- Create `packages/executor-core/tests/eval-report-cli.test.ts`: CLI smoke test using a temp JSONL file.
- Modify `packages/executor-core/src/index.ts`: export reporting functions and types.
- Modify `packages/executor-core/package.json`: add `report` script.
- Modify root `package.json`: add `report` script.
- Modify `README.md`: document reporting usage.
- Modify `docs/leftovers-todo.md`: mark reporting implemented.

## Task 1: Pure Eval Summary

**Files:**
- Create: `packages/executor-core/src/eval-report.ts`
- Create: `packages/executor-core/tests/eval-report.test.ts`
- Modify: `packages/executor-core/src/index.ts`

- [x] **Step 1: Write failing summary test**

Create a Vitest test that builds two `ExecutionLogEntry` objects and expects:

```ts
expect(report.total_runs).toBe(2)
expect(report.completed_runs).toBe(2)
expect(report.failed_worker_results).toBe(1)
expect(report.total_duration_ms).toBe(30)
expect(report.total_tokens).toBe(300)
expect(report.total_cost_usd).toBe(0.009)
expect(report.by_provider).toEqual([
  { provider: "openai", runs: 1, worker_failures: 0, total_cost_usd: 0.006 },
  { provider: "anthropic", runs: 1, worker_failures: 1, total_cost_usd: 0.003 }
])
```

- [x] **Step 2: Run test and verify red**

Run:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm --filter @model-orchestration/executor-core test -- tests/eval-report.test.ts
```

Expected: FAIL because `summarizeExecutionLogs` does not exist.

- [x] **Step 3: Implement summary types and function**

Add:

```ts
export type ProviderEvalSummary = {
  readonly provider: string
  readonly runs: number
  readonly worker_failures: number
  readonly total_cost_usd: number
}

export type ExecutionEvalReport = {
  readonly total_runs: number
  readonly completed_runs: number
  readonly failed_worker_results: number
  readonly total_duration_ms: number
  readonly total_tokens: number
  readonly total_cost_usd: number
  readonly by_provider: readonly ProviderEvalSummary[]
}

export function summarizeExecutionLogs(entries: readonly ExecutionLogEntry[]): ExecutionEvalReport
```

- [x] **Step 4: Run test and verify green**

Run the same package test. Expected: PASS.

## Task 2: Text Report Formatting

**Files:**
- Modify: `packages/executor-core/src/eval-report.ts`
- Modify: `packages/executor-core/tests/eval-report.test.ts`

- [x] **Step 1: Write failing formatter test**

Add a test for:

```ts
expect(formatExecutionEvalReport(report)).toContain("Execution Eval Report")
expect(formatExecutionEvalReport(report)).toContain("Total runs: 2")
expect(formatExecutionEvalReport(report)).toContain("Total cost USD: 0.009")
expect(formatExecutionEvalReport(report)).toContain("openai | runs=1 | worker_failures=0 | cost_usd=0.006")
```

- [x] **Step 2: Run test and verify red**

Expected: FAIL because `formatExecutionEvalReport` does not exist.

- [x] **Step 3: Implement formatter**

Add:

```ts
export function formatExecutionEvalReport(report: ExecutionEvalReport): string
```

The format must be plain text and deterministic.

- [x] **Step 4: Run test and verify green**

Expected: PASS.

## Task 3: Report CLI

**Files:**
- Create: `packages/executor-core/src/eval-report-cli.ts`
- Create: `packages/executor-core/tests/eval-report-cli.test.ts`
- Modify: `packages/executor-core/package.json`
- Modify: root `package.json`

- [x] **Step 1: Write failing CLI smoke test**

Create a temp JSONL file with two execution entries. Run:

```ts
const result = spawnSync(process.execPath, ["dist/src/eval-report-cli.js", logPath], {
  cwd: packageRoot,
  encoding: "utf8"
})
expect(result.status).toBe(0)
expect(result.stdout).toContain("Execution Eval Report")
```

- [x] **Step 2: Run test and verify red**

Run:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm --filter @model-orchestration/executor-core build
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm --filter @model-orchestration/executor-core test -- tests/eval-report-cli.test.ts
```

Expected: FAIL because the CLI file does not exist.

- [x] **Step 3: Implement CLI**

The CLI should:

1. accept one positional JSONL log path
2. read entries with `createJsonlExecutionLogStore(path).list()`
3. print `formatExecutionEvalReport(summarizeExecutionLogs(entries))`
4. exit `1` with usage text when no path is provided

- [x] **Step 4: Add scripts**

Add:

```json
"report": "pnpm build && node dist/src/eval-report-cli.js"
```

to `packages/executor-core/package.json`, and:

```json
"report": "pnpm --filter @model-orchestration/executor-core report"
```

to root `package.json`.

- [x] **Step 5: Run test and verify green**

Expected: PASS.

## Task 4: Documentation And Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/leftovers-todo.md`

- [x] **Step 1: Document usage**

Add README usage:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH pnpm run report -- path/to/execution-log.jsonl
```

- [x] **Step 2: Update checklist**

Mark eval reporting over persisted logs complete in `docs/leftovers-todo.md`.

- [x] **Step 3: Full verification**

Run:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm run typecheck
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm test
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm build
```

Expected: all pass.

- [x] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-07-01-eval-reporting.md packages/executor-core README.md docs/leftovers-todo.md package.json
git commit -m "Add execution eval reporting"
```

## Self-Review

- Spec coverage: plan covers the requested reporting implementation and documentation.
- Placeholder scan: no TODO/TBD placeholders remain.
- Type consistency: `ExecutionLogEntry`, `ExecutionEvalReport`, and `ProviderEvalSummary` are defined before use.
