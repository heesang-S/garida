# Model-Orchestrating Agent

## Purpose

This project exists to build an agent that can evaluate an incoming task, choose an appropriate model for the work, and orchestrate sub-agents when the task is complex enough to benefit from decomposition.

The agent should:

- Understand the task goal, constraints, expected output, and risk level.
- Select a model that fits the task's complexity, latency needs, cost sensitivity, and required reasoning depth.
- Break complex work into clear, bounded subtasks.
- Create sub-agents for independent or specialized subtasks.
- Pass each sub-agent the context, objective, acceptance criteria, and output contract it needs.
- Merge sub-agent results into a coherent final answer or implementation.
- Avoid unnecessary delegation for simple tasks.

## Guiding Principle

The agent should be a practical coordinator: use the smallest capable model and the fewest necessary sub-agents while preserving quality, reliability, and clear ownership of each task.

## Routing Policy Base

The first routing policy artifacts live in `packages/router-core/routing/`:

- `packages/router-core/routing/task-assessment-schema.json`: structured task assessment.
- `packages/router-core/routing/model-catalog.json`: starter model classes and role defaults.
- `packages/router-core/routing/base-routing-policy.json`: machine-readable routing rules.
- `packages/router-core/routing/base-routing-policy.md`: explicit model-routing and delegation rules.

## Monorepo Packages

- `packages/shared-types`: shared contracts.
- `packages/router-core`: deterministic routing and execution plan creation.
- `packages/router-mcp`: MCP tools and stdio server.
- `packages/router-http`: HTTP API.
- `packages/executor-core`: executor contracts and execution-plan runner.
- `packages/executor-mock`: deterministic executor for tests and local simulations.
- `packages/executor-codex`: Codex command planner and optional process executor for routed workers.
- `packages/executor-openai`: OpenAI Responses API executor.
- `packages/executor-anthropic`: Anthropic Messages API executor.
- `packages/executor-devin`: unsupported Devin executor stub for planning until usable APIs exist.
- `packages/executor-claude-code`: unsupported Claude Code executor stub for planning until usable runtime hooks exist.

## Library Usage

Agents should use the package as a decision layer before they call a model or create sub-agents.

```ts
import {
  createExecutionPlan,
  routeTask,
  validateTaskAssessment
} from "@model-orchestration/router-core"

const assessment = await validateTaskAssessment({
  task_type: "debugging",
  complexity: "medium",
  risk: "medium",
  context_size: "medium",
  tool_need: "heavy",
  parallelizable: false,
  requires_subagents: false,
  confidence: 0.86,
  reasoning: "The task requires runtime investigation and tool use."
})

const route = await routeTask(assessment, {
  preferred_provider: "anthropic_claude"
})

const plan = createExecutionPlan(assessment, route)
```

The route tells the agent which model to use:

```json
{
  "model_class": "strong",
  "provider": "anthropic_claude",
  "model_id": "claude-opus-4-8",
  "delegate": false,
  "add_reviewer": false
}
```

The execution plan tells the agent how to run the work:

```text
direct task
-> one worker brief
-> optional reviewer brief
-> synthesis strategy
```

For delegated tasks:

```text
complex task
-> subtask worker briefs
-> reviewer brief
-> conflict resolution and synthesis
```

The library does not execute LLM calls. It produces deterministic routing and execution instructions that an agent runtime, API server, MCP server, or plugin can consume.

Run the library usage example:

```text
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm build
node examples/agent-library-usage.mjs
```

## MCP And API Adapters

Run the MCP stdio server:

```text
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm run mcp
```

It exposes:

```text
route_task
prepare_execution
```

Run the optional HTTP API:

```text
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm run api
```

HTTP endpoints:

```text
POST /route
POST /plan
```

Both endpoints accept:

```json
{
  "assessment": {
    "task_type": "writing",
    "complexity": "low",
    "risk": "low",
    "context_size": "small",
    "tool_need": "none",
    "parallelizable": false,
    "requires_subagents": false,
    "confidence": 0.95,
    "reasoning": "Simple writing task."
  },
  "preferred_provider": "openai_codex"
}
```

## Codex Integration

The recommended Codex path is MCP first:

```text
Codex
-> MCP `prepare_execution`
-> route decision + execution plan
-> Codex uses `model_id` for the next worker if model selection is available
```

If model switching is not available in the current Codex surface, the router still returns the intended model and cost so the agent can decide whether to continue, warn, or use an external API adapter.

More detail lives in `knowledge/codex-integration-notes.md`.

## Executor Packages

Executors consume a route plus execution plan and produce worker/reviewer results.

Current executor packages:

- `@model-orchestration/executor-core`: defines `AgentExecutor`, `WorkerResult`, `ReviewResult`, and `runExecutionPlan`.
- `@model-orchestration/executor-mock`: deterministic executor for tests.
- `@model-orchestration/executor-codex`: dry-run command planner or process executor for `codex exec --model <route.model_id>`.
- `@model-orchestration/executor-openai`: calls OpenAI-compatible Responses API with `route.model_id`.
- `@model-orchestration/executor-anthropic`: calls Anthropic Messages API with `route.model_id`.
- `@model-orchestration/executor-devin`: deterministic unsupported stub that documents missing Devin runtime/model-selection APIs.
- `@model-orchestration/executor-claude-code`: deterministic unsupported stub that documents missing Claude Code runtime/model-selection APIs.

Example shape:

```ts
import { runExecutionPlan } from "@model-orchestration/executor-core"
import { createMockExecutor } from "@model-orchestration/executor-mock"

const result = await runExecutionPlan({
  execution_plan: plan,
  route,
  executor: createMockExecutor()
})
```

The Codex executor plans commands by default:

```text
codex exec --model <route.model_id> <worker brief>
```

Set `mode: "execute"` to run the command through a process runner. API executor credentials stay in executor packages through `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or explicit options. Router packages still do not own credentials, network calls, or subprocesses.

## Execution Reports

Execution logs can be persisted with the JSONL execution log store and summarized from the command line:

```text
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH pnpm run report -- path/to/execution-log.jsonl
```

The report includes run counts, completed runs, failed worker results, total duration, token totals, total cost, and provider-level cost/failure summaries.
