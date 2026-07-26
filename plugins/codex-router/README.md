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
caller can hand the returned `route` and `execution_plan` to
`packages/executor-codex`, which runs separate Codex workers with:

```bash
codex exec --model <route.model_id> <worker brief>
```

The plugin remains the routing surface. Process execution belongs in the
executor package/domain, not inside router core or the plugin manifest layer.

Dry-run the routed-worker flow after `pnpm build`:

```bash
node examples/codex-routed-execution.mjs
```
