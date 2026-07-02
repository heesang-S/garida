# Codex Integration Notes

See `knowledge/platform-capability-matrix.md` for the cross-platform capability
summary and current support boundaries across Codex, Claude Code, Devin, and
personal agents.

The router can decide which model should be used, but Codex must expose a way for the integration layer to request that model for the next worker call.

The expected flow is:

```text
Codex agent receives task
-> classify task into task assessment JSON
-> call MCP tool `prepare_execution`
-> read `route.model_id`
-> start separate Codex worker execution with that model when supported
-> run reviewer if `route.add_reviewer` is true
-> synthesize according to `execution_plan.synthesis_strategy`
```

If Codex does not expose model switching for sub-agents, the router still helps by:

- explaining whether the current model is overkill or insufficient
- deciding whether delegation is worth it
- producing worker and reviewer briefs
- estimating cost for external API execution
- enabling a separate routed worker path through `packages/executor-codex`

## Current MCP Tools

The MCP server exposes:

```text
route_task
prepare_execution
```

Use `prepare_execution` for the normal Codex flow because it returns both the route decision and the execution plan.

## Practical Codex Instruction

Once the MCP server is configured, the project instruction can be:

```text
Before complex, risky, or delegatable work, call the `prepare_execution` tool with a task assessment. Follow the returned route and execution plan. If the returned `model_id` cannot be selected in this Codex surface, state the recommended model and continue with the available model only if it is adequate.
```

## Important Limitation

This project does not force Codex itself to switch models. It provides a deterministic recommendation:

```text
task assessment
-> route decision
-> recommended model_id
-> execution plan
```

Actual model switching depends on the Codex runtime, plugin, or API layer that consumes the recommendation.

## Separate Routed Worker Path

The current chat can stay on its existing model while routed work runs in
separate Codex processes. The execution path is:

```text
current Codex chat
-> MCP prepare_execution
-> route + execution_plan
-> packages/executor-codex
-> codex exec --model <route.model_id> <worker brief>
-> structured worker/reviewer results
```

## Codex Router Plugin

The repo includes a Codex plugin at `plugins/codex-router`. It packages:

- a `routed-task` skill for deciding when Codex should ask the router for an execution plan
- a plugin `.mcp.json` entry named `model_router`
- manual MCP registration docs for local Codex setup

The plugin is intentionally thin. It calls the router MCP server and does not duplicate routing rules.

## Codex Executor

The plugin currently routes and plans. Separate worker execution lives in
`packages/executor-codex`, which can use the selected route with a command shaped like:

```text
codex exec --model <route.model_id> <worker brief>
```

Run the dry-run example after `pnpm build`:

```text
node examples/codex-routed-execution.mjs
```
