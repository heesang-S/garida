# Codex Integration Notes

The router can decide which model should be used, but Codex must expose a way for the integration layer to request that model for the next worker call.

The expected flow is:

```text
Codex agent receives task
-> classify task into task assessment JSON
-> call MCP tool `prepare_execution`
-> read `route.model_id`
-> create worker/sub-agent with that model when supported
-> run reviewer if `route.add_reviewer` is true
-> synthesize according to `execution_plan.synthesis_strategy`
```

If Codex does not expose model switching for sub-agents, the router still helps by:

- explaining whether the current model is overkill or insufficient
- deciding whether delegation is worth it
- producing worker and reviewer briefs
- estimating cost for external API execution

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

## Codex Router Plugin

The repo includes a Codex plugin at `plugins/codex-router`. It packages:

- a `routed-task` skill for deciding when Codex should ask the router for an execution plan
- a plugin `.mcp.json` entry named `model_router`
- manual MCP registration docs for local Codex setup

The plugin is intentionally thin. It calls the router MCP server and does not duplicate routing rules.

## Future Executor

The plugin currently routes and plans. It does not execute routed workers itself.

A future executor can use the selected route with a command shaped like:

```text
codex exec --model <route.model_id> <worker brief>
```

That executor should live in the executor package/domain, not inside router core.
