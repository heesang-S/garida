# Leftovers Todo

This list tracks what remains after the current router prototype.

## Completed Foundation

- [x] Router core works.
- [x] Task assessment schema exists.
- [x] Model catalog exists.
- [x] OpenAI/Codex and Claude model tiers are represented.
- [x] Execution plan builder exists.
- [x] MCP server exists.
- [x] HTTP API exists.
- [x] CLI exists.
- [x] Knowledge docs exist for math, AI engineering, orchestration, model comparison, Codex integration, executor adapters, and monorepo structure.
- [x] Monorepo package boundaries exist.
- [x] Codex router plugin exists.
- [x] First executor phase exists.

## Next Priority

- [x] Execute the monorepo migration plan:
  - `docs/superpowers/plans/2026-06-28-monorepo-migration.md`

- [x] Execute the Codex router plugin plan:
  - `docs/superpowers/plans/2026-06-28-codex-router-plugin.md`

Recommended order:

```text
1. Monorepo migration
2. Codex router plugin
3. Executor packages
```

Current next priority:

```text
1. Other platform integrations
2. Eval dashboards over persisted logs
3. Additional platform plugins
```

## Router Package Leftovers

- [x] Split current single package into:
  - `packages/shared-types`
  - `packages/router-core`
  - `packages/router-mcp`
  - `packages/router-http`

- [x] Preserve current commands:
  - `pnpm run route`
  - `pnpm run mcp`
  - `pnpm run api`

- [x] Keep router deterministic:
  - no provider API calls in router core
  - no API keys in router core
  - no process spawning in router core

- [x] Add route-decision fixture snapshots after package split.

- [ ] Add project-specific eval logging later:
  - task type
  - selected route
  - verification result
  - latency
  - token usage
  - retry count
  - escalation count

## Codex Plugin Leftovers

- [x] Create `plugins/codex-router`.

- [x] Add plugin manifest using the current local Codex plugin format.

- [x] Add `routed-task` skill.

- [x] Package or reference the router MCP server.

- [x] Add install/registration docs:

```text
codex mcp add model_router -- node <path-to-mcp-server>
```

- [x] Verify Codex can list and call:
  - `route_task`
  - `prepare_execution`

- [x] Document limitation:

```text
The plugin can recommend model_id, but cannot force the already-running Codex chat model to change unless Codex exposes that capability.
```

## Executor Leftovers

Executors should be added after router package boundaries are stable.

- [x] Create `packages/executor-core`.

- [x] Define:

```ts
type AgentExecutor = {
  readonly provider: string
  executeWorker(brief, route): Promise<WorkerResult>
  executeReview?(brief, route): Promise<ReviewResult>
}
```

- [x] Create `packages/executor-mock` for deterministic tests.

- [x] Create `packages/executor-codex`.

- [x] `executor-codex` should plan separate workers with:

```text
codex exec --model <route.model_id>
```

- [x] Create `packages/executor-openai`.

- [x] Create `packages/executor-anthropic`.

- [x] Add real Codex process spawning with output capture.

- [x] Add retry, timeout, cancellation, and logging contracts.

- [x] Add in-memory structured execution log store and completed-run records.

- [x] Persist structured execution logs with a JSONL execution log store.

- [x] Add CLI reporting over persisted execution logs.

- [x] Extract provider token usage and cost from executor responses.

- [x] Add provider-specific retry classification.

- [x] Create `packages/executor-devin` as an unsupported stub until usable Devin APIs exist.

- [x] Create `packages/executor-claude-code` as an unsupported stub until usable Claude Code APIs exist.

- [x] Keep credentials out of router packages.

## Other Platform Plugin Leftovers

- [ ] Plan Claude/Claude Code plugin or integration.

- [ ] Plan Devin plugin or integration.

- [ ] Plan personal-agent plugin.

- [ ] For each platform, document:
  - whether exact model switching is supported
  - whether MCP tools are supported
  - whether external executors can be called
  - how worker results return to the main agent

## Decision Still Needed

- [x] Decide whether this repo becomes the monorepo root.

Recommended answer:

```text
Yes. Keep this repo and migrate into packages/.
```

- [x] Decide whether Codex plugin is implemented before or after monorepo migration.

Recommended answer:

```text
After monorepo migration, unless you need immediate Codex UX testing.
```

- [x] Decide whether executor packages should live in this monorepo.

Recommended answer:

```text
Yes, but keep them separate from router-core.
```

## Validation Checklist

Before considering the next phase complete:

- [ ] `pnpm run typecheck` passes.
- [ ] `pnpm test` passes.
- [ ] `pnpm build` passes.
- [ ] CLI route smoke test passes.
- [ ] MCP client smoke test lists `route_task` and `prepare_execution`.
- [ ] HTTP `/route` and `/plan` tests pass.
- [ ] README explains how to use library, MCP, HTTP, and Codex plugin path.
- [ ] Knowledge docs explain router/executor/plugin boundaries.
