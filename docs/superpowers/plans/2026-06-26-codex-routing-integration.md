# Codex Routing Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the existing routing library so Codex or any agent runtime can ask for model/provider/sub-agent decisions before executing work.

**Architecture:** Keep the router core pure and deterministic. Add thin adapters around it: first a stable runtime interface, then MCP tools, then an optional HTTP API. Codex integration should call the MCP/API adapter, receive a route plus execution plan, and use that response to choose the next worker model when the runtime supports model selection.

**Tech Stack:** TypeScript, Node ESM, Vitest, existing JSON routing policy/catalog, future MCP SDK/server adapter, optional HTTP server.

---

## File Structure

- Create `src/agent-runtime.ts`: public high-level function that validates an assessment, routes it, and creates an execution plan in one call.
- Create `tests/agent-runtime.test.ts`: verifies the single-call runtime contract used by agent integrations.
- Create `src/mcp-tools.ts`: pure MCP tool handlers that accept JSON-like input and return JSON-like output without depending on transport.
- Create `tests/mcp-tools.test.ts`: verifies tool handler behavior and validation errors.
- Create `src/mcp-server.ts`: transport wrapper for MCP once the MCP SDK is added.
- Create `src/http-server.ts`: optional HTTP wrapper with `/route` and `/plan` endpoints.
- Create `examples/agent-library-usage.ts`: local example of an agent runtime calling the library before choosing a model.
- Modify `package.json`: add scripts for MCP/API entrypoints after the files exist.
- Modify `README.md`: document library, MCP, API, and Codex plugin integration paths.

## Task 1: Add A Single Agent Runtime Entry Point

**Files:**
- Create: `src/agent-runtime.ts`
- Create: `tests/agent-runtime.test.ts`
- Modify: `src/index.ts`

- [x] **Step 1: Write the failing test**

Create `tests/agent-runtime.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { prepareAgentExecution } from "../src/agent-runtime.js"

describe("prepareAgentExecution", () => {
  it("validates, routes, and creates a plan for an agent runtime", async () => {
    const result = await prepareAgentExecution({
      task_type: "testing",
      complexity: "medium",
      risk: "medium",
      context_size: "medium",
      tool_need: "light",
      parallelizable: false,
      requires_subagents: false,
      confidence: 0.9,
      reasoning: "Testing task that needs normal engineering judgment."
    }, {
      preferred_provider: "anthropic_claude"
    })

    expect(result.assessment.task_type).toBe("testing")
    expect(result.route.model_id).toBe("claude-sonnet-4-6")
    expect(result.execution_plan.execution_mode).toBe("direct")
    expect(result.execution_plan.worker_briefs[0]?.model_id).toBe("claude-sonnet-4-6")
  })
})
```

- [x] **Step 2: Run the test to verify it fails**

Run:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm test -- tests/agent-runtime.test.ts
```

Expected: FAIL because `src/agent-runtime.ts` does not exist.

- [x] **Step 3: Add the minimal implementation**

Create `src/agent-runtime.ts`:

```ts
import { createExecutionPlan } from "./execution-plan.js"
import { routeTask } from "./router.js"
import type { ExecutionPlan, RouteDecision, RouteOptions, TaskAssessment } from "./types.js"
import { validateTaskAssessment } from "./validate-assessment.js"

export type PreparedAgentExecution = {
  readonly assessment: TaskAssessment
  readonly route: RouteDecision
  readonly execution_plan: ExecutionPlan
}

export async function prepareAgentExecution(
  rawAssessment: unknown,
  options: RouteOptions = {}
): Promise<PreparedAgentExecution> {
  const assessment = await validateTaskAssessment(rawAssessment)
  const route = await routeTask(assessment, options)
  const executionPlan = createExecutionPlan(assessment, route)

  return {
    assessment,
    route,
    execution_plan: executionPlan
  }
}
```

- [x] **Step 4: Export the runtime API**

Modify `src/index.ts`:

```ts
export { prepareAgentExecution } from "./agent-runtime.js"
export type { PreparedAgentExecution } from "./agent-runtime.js"
```

Keep the existing exports.

- [x] **Step 5: Run tests**

Run:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm test -- tests/agent-runtime.test.ts
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm run typecheck
```

Expected: PASS.

## Task 2: Add Pure MCP Tool Handlers

**Files:**
- Create: `src/mcp-tools.ts`
- Create: `tests/mcp-tools.test.ts`
- Modify: `src/index.ts`

- [x] **Step 1: Write the failing MCP handler test**

Create `tests/mcp-tools.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { routeTaskTool, prepareExecutionTool } from "../src/mcp-tools.js"

const taskAssessment = {
  task_type: "debugging",
  complexity: "medium",
  risk: "medium",
  context_size: "medium",
  tool_need: "heavy",
  parallelizable: false,
  requires_subagents: false,
  confidence: 0.88,
  reasoning: "Runtime debugging with tool use."
}

describe("MCP tool handlers", () => {
  it("routes a task assessment with a provider preference", async () => {
    const result = await routeTaskTool({
      assessment: taskAssessment,
      preferred_provider: "anthropic_claude"
    })

    expect(result.model_class).toBe("strong")
    expect(result.provider).toBe("anthropic_claude")
    expect(result.model_id).toBe("claude-opus-4-8")
  })

  it("prepares an execution plan for agent runtimes", async () => {
    const result = await prepareExecutionTool({
      assessment: taskAssessment,
      preferred_provider: "openai_codex"
    })

    expect(result.route.model_id).toBe("gpt-5.5")
    expect(result.execution_plan.worker_briefs[0]?.model_id).toBe("gpt-5.5")
  })
})
```

- [x] **Step 2: Run the test to verify it fails**

Run:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm test -- tests/mcp-tools.test.ts
```

Expected: FAIL because `src/mcp-tools.ts` does not exist.

- [x] **Step 3: Add pure tool handlers**

Create `src/mcp-tools.ts`:

```ts
import { prepareAgentExecution } from "./agent-runtime.js"
import { routeTask } from "./router.js"
import type { ModelProvider, RouteDecision, RouteOptions } from "./types.js"
import { validateTaskAssessment } from "./validate-assessment.js"

type RouteTaskToolInput = {
  readonly assessment: unknown
  readonly preferred_provider?: ModelProvider
}

type PrepareExecutionToolInput = {
  readonly assessment: unknown
  readonly preferred_provider?: ModelProvider
}

export async function routeTaskTool(input: RouteTaskToolInput): Promise<RouteDecision> {
  const assessment = await validateTaskAssessment(input.assessment)
  return routeTask(assessment, toolOptions(input.preferred_provider))
}

export async function prepareExecutionTool(input: PrepareExecutionToolInput) {
  return prepareAgentExecution(input.assessment, toolOptions(input.preferred_provider))
}

function toolOptions(preferredProvider: ModelProvider | undefined): RouteOptions {
  if (preferredProvider === undefined) {
    return {}
  }

  return { preferred_provider: preferredProvider }
}
```

- [x] **Step 4: Export the handlers**

Modify `src/index.ts`:

```ts
export { prepareExecutionTool, routeTaskTool } from "./mcp-tools.js"
```

Keep the existing exports.

- [x] **Step 5: Run tests**

Run:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm test -- tests/mcp-tools.test.ts
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm run typecheck
```

Expected: PASS.

## Task 3: Add An Agent Library Example

**Files:**
- Create: `examples/agent-library-usage.ts`
- Modify: `README.md`

- [x] **Step 1: Create the example file**

Create `examples/agent-library-usage.ts`:

```ts
import { prepareAgentExecution } from "../src/index.js"

const result = await prepareAgentExecution({
  task_type: "planning",
  complexity: "high",
  risk: "medium",
  context_size: "large",
  tool_need: "light",
  parallelizable: true,
  requires_subagents: true,
  confidence: 0.92,
  reasoning: "Plan a multi-step Codex integration.",
  suggested_subtasks: [
    {
      title: "Design adapter",
      objective: "Define how Codex calls the routing service.",
      independent: true
    },
    {
      title: "Design verification",
      objective: "Define how route decisions are tested.",
      independent: true
    }
  ]
}, {
  preferred_provider: "openai_codex"
})

console.log(JSON.stringify(result, null, 2))
```

- [x] **Step 2: Build and run the example**

Run:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm build
node dist/examples/agent-library-usage.js
```

Expected: output includes `route.model_id` as `gpt-5.5` and `execution_plan.execution_mode` as `delegated`.

- [x] **Step 3: Document the example in README**

Add to `README.md`:

```md
Run the library usage example:

```text
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm build
node dist/examples/agent-library-usage.js
```
```

## Task 4: Add MCP Server Transport

**Files:**
- Modify: `package.json`
- Create: `src/mcp-server.ts`
- Create: `tests/mcp-server.test.ts`

- [x] **Step 1: Add the MCP SDK dependency**

Run:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm add @modelcontextprotocol/sdk
```

Expected: `package.json` and `pnpm-lock.yaml` update.

- [x] **Step 2: Write a smoke test for exported server metadata**

Create `tests/mcp-server.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { MCP_TOOL_NAMES } from "../src/mcp-server.js"

describe("MCP server metadata", () => {
  it("exposes the routing tool names", () => {
    expect(MCP_TOOL_NAMES).toEqual(["route_task", "prepare_execution"])
  })
})
```

- [x] **Step 3: Add the MCP server wrapper**

Create `src/mcp-server.ts`:

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"

import { prepareExecutionTool, routeTaskTool } from "./mcp-tools.js"

export const MCP_TOOL_NAMES = ["route_task", "prepare_execution"] as const

const toolInputSchema = {
  assessment: z.unknown(),
  preferred_provider: z.enum(["openai_codex", "anthropic_claude"]).optional()
}

export function createRoutingMcpServer(): McpServer {
  const server = new McpServer({
    name: "model-routing-agent",
    version: "0.1.0"
  })

  server.tool("route_task", toolInputSchema, async (input) => ({
    content: [
      {
        type: "text",
        text: JSON.stringify(await routeTaskTool(input), null, 2)
      }
    ]
  }))

  server.tool("prepare_execution", toolInputSchema, async (input) => ({
    content: [
      {
        type: "text",
        text: JSON.stringify(await prepareExecutionTool(input), null, 2)
      }
    ]
  }))

  return server
}

export async function runMcpServer(): Promise<void> {
  const server = createRoutingMcpServer()
  await server.connect(new StdioServerTransport())
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runMcpServer()
}
```

- [x] **Step 4: Add package scripts**

Modify `package.json`:

```json
"mcp": "pnpm build && node dist/src/mcp-server.js"
```

Keep existing scripts.

- [x] **Step 5: Run tests and build**

Run:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm test -- tests/mcp-server.test.ts
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm run typecheck
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm build
```

Expected: PASS.

## Task 5: Add Optional HTTP API Adapter

**Files:**
- Modify: `package.json`
- Create: `src/http-server.ts`
- Create: `tests/http-server.test.ts`

- [x] **Step 1: Add Hono**

Run:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm add hono
```

Expected: `package.json` and `pnpm-lock.yaml` update.

- [x] **Step 2: Write API tests**

Create `tests/http-server.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { createHttpApp } from "../src/http-server.js"

const assessment = {
  task_type: "writing",
  complexity: "low",
  risk: "low",
  context_size: "small",
  tool_need: "none",
  parallelizable: false,
  requires_subagents: false,
  confidence: 0.95,
  reasoning: "Simple writing task."
}

describe("HTTP routing app", () => {
  it("routes a task over HTTP", async () => {
    const app = createHttpApp()
    const response = await app.request("/route", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assessment, preferred_provider: "openai_codex" })
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.model_id).toBe("gpt-5.4-mini")
  })

  it("prepares execution over HTTP", async () => {
    const app = createHttpApp()
    const response = await app.request("/plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assessment, preferred_provider: "anthropic_claude" })
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.route.model_id).toBe("claude-haiku-4-5")
  })
})
```

- [x] **Step 3: Add the HTTP app**

Create `src/http-server.ts`:

```ts
import { serve } from "@hono/node-server"
import { Hono } from "hono"

import { prepareExecutionTool, routeTaskTool } from "./mcp-tools.js"

export function createHttpApp(): Hono {
  const app = new Hono()

  app.post("/route", async (context) => {
    const body = await context.req.json()
    return context.json(await routeTaskTool(body))
  })

  app.post("/plan", async (context) => {
    const body = await context.req.json()
    return context.json(await prepareExecutionTool(body))
  })

  return app
}

export function runHttpServer(): void {
  serve({
    fetch: createHttpApp().fetch,
    port: 8787
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runHttpServer()
}
```

- [x] **Step 4: Add missing Node server dependency and scripts**

Run:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm add @hono/node-server
```

Modify `package.json`:

```json
"api": "pnpm build && node dist/src/http-server.js"
```

Keep existing scripts.

- [x] **Step 5: Run API tests**

Run:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm test -- tests/http-server.test.ts
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm run typecheck
```

Expected: PASS.

## Task 6: Document Codex Integration Behavior

**Files:**
- Modify: `README.md`
- Create: `knowledge/codex-integration-notes.md`

- [x] **Step 1: Add Codex integration notes**

Create `knowledge/codex-integration-notes.md`:

```md
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
```

- [x] **Step 2: Add README section**

Add to `README.md`:

```md
## Codex Integration

The recommended Codex path is MCP first:

```text
Codex
-> MCP `prepare_execution`
-> route decision + execution plan
-> Codex uses `model_id` for the next worker if model selection is available
```

If model switching is not available in the current Codex surface, the router still returns the intended model and cost so the agent can decide whether to continue, warn, or use an external API adapter.
```

- [x] **Step 3: Verify docs are present**

Run:

```bash
test -f knowledge/codex-integration-notes.md
grep -n "Codex Integration" README.md
```

Expected: both commands succeed.

## Task 7: Final Verification

**Files:**
- No new files.

- [x] **Step 1: Run full validation**

Run:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm run typecheck
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm test
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm build
```

Expected: all pass.

- [x] **Step 2: Run CLI smoke test**

Run:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm run route -- --provider anthropic_claude examples/tasks/complex-planning-delegated.json
```

Expected: output includes:

```json
{
  "model_class": "strong",
  "provider": "anthropic_claude",
  "model_id": "claude-opus-4-8",
  "delegate": true,
  "add_reviewer": true
}
```

- [x] **Step 3: Run library example**

Run:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm build
node dist/examples/agent-library-usage.js
```

Expected: output includes a `route` object and an `execution_plan` object.

## Self-Review

Spec coverage:

- Library integration is covered by Task 1.
- Agent-oriented execution planning is already implemented and reused in Task 1.
- MCP tool surface is covered by Task 2 and Task 4.
- Optional API server is covered by Task 5.
- Codex behavior and limitation notes are covered by Task 6.
- Verification is covered by Task 7.

Placeholder scan:

- No task uses TBD, TODO, or unspecified implementation steps.
- Code snippets include exact function names and file paths.

Type consistency:

- `preferred_provider` matches the existing `RouteOptions` shape.
- `prepareAgentExecution` returns `assessment`, `route`, and `execution_plan`.
- MCP and HTTP handlers reuse the same input shape: `{ assessment, preferred_provider }`.
