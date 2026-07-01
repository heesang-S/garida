# Codex Router Plugin

This plugin packages the model router MCP server and a routed-task skill for Codex.

Manifest notes:

- The manifest follows the locally installed Codex plugin format.
- The MCP server delegates to the router package; routing logic is not duplicated here.
- The plugin can recommend `model_id`; exact current-chat model switching depends on Codex host support.

## Manual MCP Registration

Build the router:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm build
```

Register the MCP server:

```bash
/Applications/Codex.app/Contents/Resources/codex mcp add model_router -- /Users/HeeSang/.nvm/versions/node/v24.16.0/bin/node /Users/HeeSang/Desktop/dev/ai/garida/packages/router-mcp/dist/src/mcp-server.js
```

Restart Codex after registration.

The plugin also includes `.mcp.json`, which declares the same server for Codex plugin loading.

## Routed Execution

Use the `routed-task` skill before complex, high-risk, or potentially delegatable work. The skill calls `prepare_execution`, reads the route, and follows the returned execution plan.

## Future Executor

The plugin currently routes and plans. A future executor can run:

```bash
codex exec --model <route.model_id> <worker brief>
```

That executor should live in the executor package/domain, not inside router core.
