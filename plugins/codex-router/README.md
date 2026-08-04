# Codex Router Plugin

This plugin packages the model router MCP server and a routed-task skill for Codex.

Manifest notes:

- The manifest follows the locally installed Codex plugin format.
- The MCP server delegates to the router package; routing logic is not duplicated here.
- The plugin can recommend `model_id`; exact current-chat model switching depends on Codex host support.

## Manual MCP Registration

Build the router:

```bash
pnpm build
```

Register the MCP server:

```bash
codex mcp add model_router -- node packages/router-mcp/dist/src/mcp-server.js
```

Run this command from the repository root, then restart Codex after registration.

The plugin also includes `.mcp.json`, which declares the same server for Codex plugin loading.

## Routed Execution

Use the `routed-task` skill before complex, high-risk, or potentially delegatable work. The skill calls `prepare_execution`, reads the route, and follows the returned execution plan.

## Separate Routed Workers

This plugin does not switch the already-running Codex chat model. Instead, a
caller can hand the full `prepare_execution` result to the plugin helper:

```ts
import { runPreparedCodexExecution } from "@model-orchestration/codex-router-plugin"

const result = await runPreparedCodexExecution({
  prepared_execution: preparedExecution,
  mode: "execute"
})
```

The helper delegates to `packages/executor-codex`, which runs separate Codex
workers with:

```bash
codex exec --model <route.model_id> <worker brief>
```

The plugin remains the routing surface. Process execution belongs in the
executor package/domain, not inside router core or the plugin manifest layer.
The returned value is the structured executor-core run result, including
`worker_results`, optional `review_result`, and `synthesis_strategy`.

The active OpenAI/Codex tier mapping is `small_fast` -> `gpt-5.6-luna`,
`standard` -> `gpt-5.6-terra`, and `strong` -> `gpt-5.6-sol`. GPT-5.4 remains
a compatibility fallback when GPT-5.6 is unavailable.

When a caller wants the current chat to act as the orchestrator, it can compare
the current model with the routed model and only launch a separate worker when
they differ:

```ts
import { orchestratePreparedCodexExecution } from "@model-orchestration/codex-router-plugin"

const decision = await orchestratePreparedCodexExecution({
  prepared_execution: preparedExecution,
  current_model_id: "gpt-5.6-sol",
  mode: "execute"
})

if (decision.kind === "inline") {
  // Continue in the current chat model.
} else {
  // A separate routed worker ran and returned structured results.
}
```

Run the routed-worker flow after `pnpm build`. It uses the `codex` command on
your `PATH` by default; set `GARIDA_CODEX_COMMAND` when it is installed
elsewhere:

```bash
node examples/codex-routed-execution.mjs
```
