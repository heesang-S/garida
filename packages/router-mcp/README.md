# Garida MCP adapter

`@garida/mcp` exposes Garida's deterministic routing API as
an MCP stdio server. It provides the `route_task` and `prepare_execution`
tools.

Run a pinned release through `npx`:

```sh
npx -y @garida/mcp@0.1.0-alpha.1
```

The installed executable is named `garida-mcp`.

```json
{
  "command": "npx",
  "args": ["-y", "@garida/mcp@0.1.0-alpha.1"]
}
```

The server uses bundled policy and catalog inputs by default. To select local
JSON configuration files, invoke the executable with `--policy <path>` and/or
`--catalog <path>`. Diagnostics are written to stderr; stdout is reserved for
MCP stdio messages.
