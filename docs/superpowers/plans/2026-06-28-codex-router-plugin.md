# Codex Router Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a Codex plugin that packages the model router MCP server and provides durable Codex-facing instructions for routing tasks before execution.

**Architecture:** The plugin should be a thin integration layer. It should not duplicate routing logic. It should expose the existing router MCP server as a plugin MCP server, add a skill that instructs Codex when/how to call `prepare_execution`, and document the limitation that current-chat model switching requires Codex support while routed worker execution requires a future executor.

**Tech Stack:** Codex plugin structure, `.codex-plugin/plugin.json`, MCP stdio server, TypeScript router package, Markdown skill instructions.

---

## Target Structure

If implemented before monorepo migration:

```text
plugins/codex-router/
├── .codex-plugin/
│   └── plugin.json
├── skills/
│   └── routed-task/
│       └── SKILL.md
├── README.md
└── package-assets/
    └── example-mcp-config.toml
```

If implemented after monorepo migration:

```text
plugins/codex-router/
├── .codex-plugin/
│   └── plugin.json
├── skills/
│   └── routed-task/
│       └── SKILL.md
├── README.md
└── package-assets/
    └── example-mcp-config.toml
```

The plugin should call either:

```text
packages/router-mcp/dist/src/mcp-server.js
```

before migration, or:

```text
packages/router-mcp/dist/mcp-server.js
```

after migration.

## Task 1: Inspect Codex Plugin Manifest Pattern

**Files:**
- Read existing local plugin manifests under `/Users/HeeSang/.codex/plugins/cache`.
- Create no project files in this task.

- [x] **Step 1: Inspect existing manifests**

Run:

```bash
find /Users/HeeSang/.codex/plugins/cache -path '*/.codex-plugin/plugin.json' -maxdepth 8 -print | head -20
```

Expected: outputs installed plugin manifest paths.

- [x] **Step 2: Read two representative manifests**

Run:

```bash
sed -n '1,220p' /Users/HeeSang/.codex/plugins/cache/openai-curated/superpowers/*/.codex-plugin/plugin.json
sed -n '1,220p' /Users/HeeSang/.codex/plugins/cache/sisyphuslabs/omo/*/.codex-plugin/plugin.json
```

Expected: learn the exact manifest fields Codex expects in this installed version.

- [x] **Step 3: Record manifest notes**

Create `plugins/codex-router/README.md` with:

```md
# Codex Router Plugin

This plugin packages the model router MCP server and a routed-task skill for Codex.

Manifest notes:

- The manifest follows the locally installed Codex plugin format.
- The MCP server delegates to the router package; routing logic is not duplicated here.
- The plugin can recommend `model_id`; exact current-chat model switching depends on Codex host support.
```

## Task 2: Create Plugin Skeleton

**Files:**
- Create: `plugins/codex-router/.codex-plugin/plugin.json`
- Create: `plugins/codex-router/skills/routed-task/SKILL.md`
- Create: `plugins/codex-router/package-assets/example-mcp-config.toml`

- [x] **Step 1: Create manifest**

Create `plugins/codex-router/.codex-plugin/plugin.json` using the format discovered in Task 1.

The manifest intent must include:

```json
{
  "name": "codex-router",
  "version": "0.1.0",
  "description": "Route Codex tasks through the model router before execution."
}
```

If the local plugin format supports MCP server declarations, include an MCP server entry named `model_router`.

- [x] **Step 2: Create routed-task skill**

Create `plugins/codex-router/skills/routed-task/SKILL.md`:

```md
---
name: routed-task
description: Use before complex, high-risk, or potentially delegatable work to ask the model router for a route decision and execution plan.
---

# Routed Task

Use this skill when:

- the task may need a cheaper or stronger model
- the task may benefit from sub-agent decomposition
- the task is high-risk
- the task needs an independent reviewer

## Workflow

1. Classify the task into the task assessment schema.
2. Call the `prepare_execution` MCP tool from the model router.
3. Read:
   - `route.model_id`
   - `route.delegate`
   - `route.add_reviewer`
   - `execution_plan.worker_briefs`
   - `execution_plan.synthesis_strategy`
4. If Codex can select `route.model_id` for the next worker, use it.
5. If Codex cannot select the model, state the recommended model and continue only if the current model is adequate.
6. Follow the execution plan.

## Limitation

This skill does not force the already-running Codex chat to switch models. Exact model switching requires Codex host support or a future routed Codex executor.
```

- [x] **Step 3: Create example MCP config**

Create `plugins/codex-router/package-assets/example-mcp-config.toml`:

```toml
[mcp_servers.model_router]
command = "/Users/HeeSang/.nvm/versions/node/v24.16.0/bin/node"
args = ["/Users/HeeSang/Desktop/dev/ai/my-things/packages/router-mcp/dist/src/mcp-server.js"]
startup_timeout_sec = 30
```

If the monorepo migration has already happened, use:

```toml
[mcp_servers.model_router]
command = "/Users/HeeSang/.nvm/versions/node/v24.16.0/bin/node"
args = ["/Users/HeeSang/Desktop/dev/ai/my-things/packages/router-mcp/dist/mcp-server.js"]
startup_timeout_sec = 30
```

## Task 3: Add Plugin Smoke Tests

**Files:**
- Create: `plugins/codex-router/tests/plugin-structure.test.ts`
- Modify: root or plugin `package.json` test configuration if needed.

- [x] **Step 1: Write structure test**

Create `plugins/codex-router/tests/plugin-structure.test.ts`:

```ts
import { access, readFile } from "node:fs/promises"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const pluginRoot = join(process.cwd(), "plugins", "codex-router")

describe("codex-router plugin structure", () => {
  it("contains manifest, skill, and example MCP config", async () => {
    await access(join(pluginRoot, ".codex-plugin", "plugin.json"))
    await access(join(pluginRoot, "skills", "routed-task", "SKILL.md"))
    await access(join(pluginRoot, "package-assets", "example-mcp-config.toml"))
  })

  it("documents routed task workflow", async () => {
    const skill = await readFile(join(pluginRoot, "skills", "routed-task", "SKILL.md"), "utf8")

    expect(skill).toContain("prepare_execution")
    expect(skill).toContain("route.model_id")
    expect(skill).toContain("does not force the already-running Codex chat to switch models")
  })
})
```

- [x] **Step 2: Run structure test**

Run:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm test -- plugins/codex-router/tests/plugin-structure.test.ts
```

Expected: PASS.

## Task 4: Verify MCP Server From Plugin Path

**Files:**
- No new files.

- [x] **Step 1: Build router**

Run:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm build
```

Expected: PASS.

- [x] **Step 2: Run MCP client smoke test**

Run:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH node --input-type=module - <<'NODE'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const client = new Client({ name: 'plugin-router-smoke-test', version: '0.1.0' })
const transport = new StdioClientTransport({
  command: '/Users/HeeSang/.nvm/versions/node/v24.16.0/bin/node',
  args: ['packages/router-mcp/dist/src/mcp-server.js'],
  cwd: process.cwd(),
  stderr: 'pipe'
})

await client.connect(transport)
const tools = await client.listTools()
console.log(tools.tools.map((tool) => tool.name).join(', '))
await client.close()
NODE
```

Expected: `route_task, prepare_execution`.

## Task 5: Document Installation Options

**Files:**
- Modify: `plugins/codex-router/README.md`
- Modify: `knowledge/codex-integration-notes.md`

- [x] **Step 1: Add manual MCP registration command**

Add to `plugins/codex-router/README.md`:

```md
## Manual MCP Registration

Build the router:

```text
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm build
```

Register the MCP server:

```text
/Applications/Codex.app/Contents/Resources/codex mcp add model_router -- /Users/HeeSang/.nvm/versions/node/v24.16.0/bin/node /Users/HeeSang/Desktop/dev/ai/my-things/packages/router-mcp/dist/src/mcp-server.js
```

Restart Codex after registration.
```

- [x] **Step 2: Add future executor note**

Add:

```md
## Future Executor

The plugin currently routes and plans. A future executor can run:

```text
codex exec --model <route.model_id> <worker brief>
```

That executor should live in the executor package/domain, not inside router core.
```

## Task 6: Final Verification

**Files:**
- No new files.

- [x] **Step 1: Run all tests**

Run:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm run typecheck
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm test
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm build
```

Expected: PASS.

- [x] **Step 2: Confirm plugin docs mention limitation**

Run:

```bash
grep -R "does not force" plugins/codex-router
grep -R "codex exec --model" plugins/codex-router
```

Expected: both commands find matches.

## Self-Review

Spec coverage:

- Plugin wraps router MCP behavior.
- Plugin includes Codex-facing instructions.
- Plugin does not duplicate routing logic.
- Future executor is documented but not implemented here.

Placeholder scan:

- Manifest must be adjusted to the local plugin manifest format discovered in Task 1; this is an intentional discovery step, not an unspecified implementation.

Type consistency:

- Skill references `prepare_execution`, `route.model_id`, and `execution_plan`, matching current router output.
