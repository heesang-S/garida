# Codex Routed Worker Execution

## TL;DR
> **Summary**: Add a decision-complete integration path that takes `prepare_execution` output and runs worker/reviewer briefs as separate `codex exec --model <route.model_id>` executions without switching the already-running Codex chat.
> **Deliverables**:
> - library/CLI bridge from routed execution plans to `packages/executor-codex`
> - structured result capture through `packages/executor-core`
> - targeted tests for routed Codex worker execution
> - plugin and README docs showing the routed-worker path
> - example invocation flow for Codex users
> **Effort**: Medium
> **Parallel**: NO - the bridge, tests, and docs depend on one another
> **Critical Path**: integration API -> executor wiring -> tests -> docs -> verification

## Context

### Original Request

The user wants Codex to avoid switching the current chat model and instead run routed subagents with the recommended model.

### Current Repository State

- `plugins/codex-router` packages the MCP server and `routed-task` skill.
- `packages/executor-codex` already builds and can execute `codex exec --model <route.model_id> <worker brief>`.
- `packages/executor-core` already runs execution plans and returns structured worker/reviewer results.
- No existing bridge turns `prepare_execution` output into end-to-end routed Codex worker execution.

### Planning Notes

The cleanest design is to keep the plugin thin and add a reusable execution bridge in package space. Codex host instructions and plugin docs should call that bridge rather than embedding process logic into the plugin manifest layer.

### Metis Review

Metis subagent review was skipped because the current session policy says not to spawn sub-agents unless explicitly requested. Manual gap review found these risks and resolutions:

- **Risk**: mixing routing, process spawning, and plugin packaging in one layer. **Resolution**: keep spawning logic outside `plugins/codex-router`.
- **Risk**: losing review-path support when `route.add_reviewer` is true. **Resolution**: require the bridge to run full `execution_plan`, not only worker 0.
- **Risk**: weak observability for separate Codex executions. **Resolution**: require execution-log-store support in the bridge path.
- **Risk**: docs implying current-chat model switching. **Resolution**: update README/plugin docs with explicit “separate Codex worker execution” wording.

## Work Objectives

### Core Objective

Implement a Codex-specific routed-worker execution path that:

1. accepts routed output from `prepare_execution`
2. runs worker/reviewer briefs as separate Codex processes using `route.model_id`
3. returns structured `worker_results` and optional `review_result`
4. leaves the current Codex chat model unchanged

### Deliverables

- `packages/executor-codex/src/routed-codex-runner.ts`
- `packages/executor-codex/src/index.ts` export updates
- `packages/executor-codex/tests/routed-codex-runner.test.ts`
- `examples/codex-routed-execution.ts` or `examples/codex-routed-execution.mjs`
- `plugins/codex-router/README.md` updates
- `knowledge/codex-integration-notes.md` updates
- `README.md` updates if the routed-worker path becomes a primary usage pattern

### Definition of Done

- A caller can pass a `route` and `execution_plan` into a Codex-specific helper and receive structured execution results.
- The helper uses `packages/executor-codex` in `execute` mode for separate worker processes.
- Reviewer execution runs when `execution_plan.reviewer_brief` exists.
- Worker outputs and failures are captured through the existing executor-core result types.
- Targeted tests pass for worker-only and worker+review flows.
- Docs state clearly that routed workers run as separate Codex executions rather than mutating the current chat model.

### Must Have

- Reuse `runExecutionPlan` from `packages/executor-core`.
- Reuse `createCodexExecutor` from `packages/executor-codex`.
- Preserve `route.model_id` as the exact model passed to `codex exec`.
- Support both dry-run and execute modes for safe local testing.
- Allow optional execution log persistence through the existing log store contract.
- Provide one example command or script that a Codex user can run after calling `prepare_execution`.

### Must NOT Have

- No attempt to switch the current Codex chat model.
- No plugin-side process spawning embedded in `.codex-plugin/plugin.json`.
- No routing-rule duplication inside the bridge.
- No support for non-Codex runtimes in this plan.
- No UI or browser automation.

## Verification Strategy

> ZERO HUMAN INTERVENTION - all verification is agent-executed.

- Test decision: TDD for the new TypeScript bridge and helper functions.
- QA policy: every task includes command-based verification.
- Evidence target: targeted Vitest output, full workspace `typecheck/test/build`, and one dry-run or mocked execute example.

## Execution Strategy

### Parallel Execution Waves

Wave 1: define the integration surface and failing tests.

Wave 2: implement the routed Codex runner and exports.

Wave 3: add example usage and documentation updates.

Wave 4: run full verification and update closeout docs if needed.

### Dependency Matrix

| Task | Depends on | Blocks | Can parallelize with |
|---|---|---|---|
| 1. Define routed Codex runner contract | none | 2, 3, 4, 5 | none |
| 2. Add failing tests for worker/reviewer execution | 1 | 3 | none |
| 3. Implement routed Codex runner + exports | 2 | 4, 5 | none |
| 4. Add example invocation path | 3 | 5 | none |
| 5. Update plugin/integration docs | 3, 4 | 6 | none |
| 6. Run verification + checklist updates | 3, 4, 5 | final | none |

## TODOs

- [ ] 1. Define the routed Codex runner surface

  **What to do**: Create a small integration helper in `packages/executor-codex/src/routed-codex-runner.ts`. Export one primary function with a shape equivalent to:
  - `runRoutedCodexExecution({ route, execution_plan, mode, codex_command, process_runner, execution_log_store, ... })`

  The function must:
  - instantiate `createCodexExecutor(...)`
  - call `runExecutionPlan(...)`
  - return `ExecutionRunResult`

  **Must NOT do**: Do not add routing logic here. Do not parse task assessments here. Do not place this helper in plugin space.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2, 3, 4, 5, 6 | Blocked By: none

  **References**:
  - `packages/executor-codex/src/index.ts`
  - `packages/executor-core/src/run-execution-plan.ts`

  **Acceptance Criteria**:
  - [ ] Function signature accepts `route` and `execution_plan`.
  - [ ] Function supports `dry_run` and `execute`.
  - [ ] Function forwards optional execution-log-store and timeout/retry options.

  **QA Scenarios**:
  ```text
  Scenario: Type surface is usable
    Tool: bash
    Steps: Run `pnpm --filter @model-orchestration/executor-codex typecheck`.
    Expected: The new helper compiles and exports cleanly.
    Evidence: terminal stdout
  ```

- [ ] 2. Add failing tests for routed worker execution

  **What to do**: Add `packages/executor-codex/tests/routed-codex-runner.test.ts` before implementation. Cover:
  - worker-only plan
  - worker + reviewer plan
  - execute mode uses routed model in the spawned command
  - non-zero process exit becomes a failed worker result

  Use injected `process_runner` rather than real Codex subprocesses.

  **Must NOT do**: Do not rely on a real installed Codex binary in tests.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 3 | Blocked By: 1

  **References**:
  - `packages/executor-codex/tests/codex-executor.test.ts`
  - `packages/executor-core/tests/run-execution-plan.test.ts`

  **Acceptance Criteria**:
  - [ ] New tests fail before implementation.
  - [ ] Tests assert `codex exec --model <route.model_id>`.
  - [ ] Tests assert reviewer execution when `reviewer_brief` exists.

  **QA Scenarios**:
  ```text
  Scenario: Red test proves missing bridge
    Tool: bash
    Steps: Run `pnpm --filter @model-orchestration/executor-codex test -- tests/routed-codex-runner.test.ts` before implementation.
    Expected: FAIL for missing export/implementation.
    Evidence: terminal stdout
  ```

- [ ] 3. Implement the routed Codex runner and export it

  **What to do**:
  - implement `routed-codex-runner.ts`
  - export the helper from `packages/executor-codex/src/index.ts`
  - wire the helper to `createCodexExecutor({ mode, codex_command, process_runner })`
  - call `runExecutionPlan(...)` with the provided route and plan

  Ensure reviewer execution is handled by `runExecutionPlan`, not by manual branching duplicated from executor-core.

  **Must NOT do**: Do not duplicate `runExecutionPlan` logic. Do not bypass `createCodexExecutor`.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 4, 5, 6 | Blocked By: 2

  **References**:
  - `packages/executor-core/src/run-execution-plan.ts`
  - `packages/executor-codex/src/index.ts`

  **Acceptance Criteria**:
  - [ ] Targeted executor-codex tests pass.
  - [ ] Worker and reviewer results return in executor-core shape.
  - [ ] Execute mode forwards spawned output/error into structured results.

  **QA Scenarios**:
  ```text
  Scenario: Worker-only plan executes through Codex executor
    Tool: bash
    Steps: Run `pnpm --filter @model-orchestration/executor-codex test -- tests/routed-codex-runner.test.ts`.
    Expected: Worker-only test passes with routed model preserved.
    Evidence: terminal stdout

  Scenario: Reviewer path executes
    Tool: bash
    Steps: Run the same targeted test file.
    Expected: Reviewer result is present when reviewer brief exists.
    Evidence: terminal stdout
  ```

- [ ] 4. Add one concrete example invocation path

  **What to do**: Add an example script under `examples/` that shows a caller supplying:
  - a valid `route`
  - a valid `execution_plan`
  - `mode: "dry_run"`

  The example should print the returned `worker_results`, optional `review_result`, and `synthesis_strategy`.

  If a better fit exists, add a small CLI wrapper instead, but the example must remain runnable without Codex host integration.

  **Must NOT do**: Do not require a live MCP session or a real Codex subprocess for the example.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 5, 6 | Blocked By: 3

  **References**:
  - `examples/agent-library-usage.ts`
  - `examples/personal-agent-execution.json`

  **Acceptance Criteria**:
  - [ ] Example runs locally in dry-run mode.
  - [ ] Example output contains planned routed worker execution details.

  **QA Scenarios**:
  ```text
  Scenario: Example dry-run works
    Tool: bash
    Steps: Run the example command documented in README or package docs.
    Expected: Output includes `codex exec --model ...` in worker result evidence or output.
    Evidence: terminal stdout
  ```

- [ ] 5. Update plugin and integration docs for the routed-worker path

  **What to do**:
  - update `plugins/codex-router/README.md`
  - update `knowledge/codex-integration-notes.md`
  - update `README.md` only if the routed-worker flow becomes part of the primary usage narrative

  Add one explicit section stating:
  - the current chat is not switched
  - routed workers can run as separate Codex executions through `packages/executor-codex`
  - the plugin is the routing surface, not the process executor

  **Must NOT do**: Do not imply that `plugins/codex-router` alone automatically spawns workers unless that automation is actually implemented in this same change.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 6 | Blocked By: 3, 4

  **References**:
  - `plugins/codex-router/README.md`
  - `knowledge/codex-integration-notes.md`
  - `README.md`

  **Acceptance Criteria**:
  - [ ] Docs explicitly distinguish current-chat routing from separate routed-worker execution.
  - [ ] Docs name `packages/executor-codex` as the execution layer.
  - [ ] No docs claim automatic in-chat model switching.

  **QA Scenarios**:
  ```text
  Scenario: Docs are consistent
    Tool: bash
    Steps: Run `rg -n "switch|separate Codex|executor-codex|current chat" README.md plugins/codex-router knowledge/codex-integration-notes.md`.
    Expected: Output shows consistent wording about separate execution and no in-chat forced switching.
    Evidence: terminal stdout
  ```

- [ ] 6. Run verification and closeout updates

  **What to do**:
  - run targeted executor-codex tests
  - run workspace `typecheck`, `test`, and `build`
  - run one dry-run example smoke test
  - update any leftover/checklist docs only if this work changes the completion state

  **Must NOT do**: Do not claim plugin automation exists unless verification proves the integration path end-to-end.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: final | Blocked By: 3, 4, 5

  **References**:
  - `docs/leftovers-todo.md`

  **Acceptance Criteria**:
  - [ ] `pnpm --filter @model-orchestration/executor-codex test` passes.
  - [ ] `pnpm run typecheck` passes.
  - [ ] `pnpm test` passes.
  - [ ] `pnpm run build` passes.
  - [ ] Example dry-run smoke test passes.

  **QA Scenarios**:
  ```text
  Scenario: Full verification succeeds
    Tool: bash
    Steps: Run the targeted and workspace-wide verification commands.
    Expected: All commands exit 0.
    Evidence: terminal stdout
  ```

## Final Verification Wave

Run in this order:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm --filter @model-orchestration/executor-codex test
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm run typecheck
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm test
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm run build
```

Then run the documented dry-run example command for the new routed execution example.

## Defaults Applied

- Implement the first bridge in package space rather than plugin manifest space.
- Use a dry-run example instead of a real Codex subprocess example for reproducibility.
- Keep plugin automation documentation honest unless end-to-end spawning is implemented in the same change.
