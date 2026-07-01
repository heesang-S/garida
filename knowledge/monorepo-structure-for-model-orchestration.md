# Monorepo Structure for Model Orchestration

This project can evolve into a monorepo with three main domains:

```text
router
executor
plugins
```

The goal is to keep routing decisions separate from runtime execution, while still making it easy for plugins and agents to use both.

## Recommended Shape

```text
model-orchestration/
├── packages/
│   ├── shared-types/
│   ├── router-core/
│   ├── router-mcp/
│   ├── router-http/
│   ├── executor-core/
│   ├── executor-openai/
│   ├── executor-anthropic/
│   ├── executor-codex/
│   └── executor-mock/
├── plugins/
│   ├── codex-router/
│   ├── claude-router/
│   ├── devin-router/
│   └── personal-agent-router/
├── apps/
│   ├── router-server/
│   ├── executor-server/
│   └── playground/
├── examples/
└── docs/
```

## Domain Responsibilities

### `router`

The router decides what should happen.

It owns:

- task assessment schema
- routing policy
- model catalog
- model/provider selection
- delegation decision
- reviewer decision
- execution plan generation
- MCP and HTTP route surfaces

It should answer:

```text
Given this task assessment, which model and execution plan should be used?
```

It should not:

- call LLM APIs
- manage API keys
- spawn Codex/Claude/Devin processes
- run worker agents
- own provider credentials

### `executor`

The executor performs the routed work.

It owns:

- provider API calls
- subprocess execution
- retries
- timeouts
- streaming
- cancellation
- credential handling
- worker result collection
- reviewer execution
- execution logs

It should answer:

```text
Given this route and execution plan, how do I run it?
```

Example executors:

- `executor-openai`
- `executor-anthropic`
- `executor-codex`
- `executor-mock`

### `plugins`

Plugins connect the router/executor system to specific agent platforms.

They own:

- Codex plugin packaging
- Claude/Claude Code integration
- Devin integration
- personal agent integration
- platform-specific MCP configuration
- platform-specific instructions and skills
- platform-specific hooks, if available

They should answer:

```text
How does this agent platform call the router and executor?
```

## Dependency Direction

Keep dependencies one-way.

Recommended dependency flow:

```text
shared-types
-> router-core
-> router-mcp
-> router-http

shared-types
-> executor-core
-> executor-openai
-> executor-anthropic
-> executor-codex
-> executor-mock

router packages + executor packages
-> plugins
```

Forbidden dependency flow:

```text
router-core -> executor-codex
router-core -> plugins/codex-router
router-core -> provider SDKs
plugins -> hidden routing logic
```

The router should stay deterministic and mostly pure. Executors and plugins are allowed to be side-effectful.

## Package Boundaries

### `packages/shared-types`

Shared contracts used across the monorepo:

- `TaskAssessment`
- `RouteDecision`
- `ExecutionPlan`
- `WorkerBrief`
- `ModelProvider`
- `ModelPricing`

This package should avoid runtime dependencies where possible.

### `packages/router-core`

Pure routing logic:

- validate task assessment
- apply routing policy
- resolve provider/model
- create execution plan

This is the heart of the system.

### `packages/router-mcp`

MCP wrapper around `router-core`.

Tools:

```text
route_task
prepare_execution
```

### `packages/router-http`

HTTP wrapper around `router-core`.

Endpoints:

```text
POST /route
POST /plan
```

### `packages/executor-core`

Shared executor contracts:

```ts
type AgentExecutor = {
  readonly provider: string
  executeWorker(brief, context): Promise<WorkerResult>
  executeReview?(brief, context): Promise<ReviewResult>
}
```

It defines interfaces, result types, retry/timeout/logging policy contracts, and the deterministic `runExecutionPlan` coordinator. It does not contain provider-specific behavior.

### `packages/executor-mock`

Deterministic executor for tests and local simulations.

It returns predictable `WorkerResult` and `ReviewResult` objects without model calls, credentials, network access, or process spawning.

### `packages/executor-codex`

Plans routed Codex workers.

Current behavior:

```text
route.model_id
-> codex exec --model route.model_id
-> worker brief
-> dry-run worker result with planned command, or process result when mode is execute
```

Important limitation:

```text
This launches a separate Codex execution. It does not mutate the already-running Codex chat model unless Codex exposes that capability.
```

The process-spawning version supports output capture through a process runner. Execution-level timeout, retry, cancellation, and structured event hooks come from `executor-core`.

### `packages/executor-openai`

Calls OpenAI APIs directly.

Current behavior:

```text
route.model_id
-> OpenAI Responses API
-> worker result
```

### `packages/executor-anthropic`

Calls Anthropic APIs directly.

Current behavior:

```text
route.model_id
-> Anthropic Messages API
-> worker result
```

### `plugins/codex-router`

Packages router/executor behavior for Codex.

Likely contents:

- plugin manifest
- skill instructions
- MCP server configuration
- optional routed Codex executor tool
- usage docs

## Why Monorepo

A monorepo is useful here because the contracts are still evolving.

Benefits:

- shared types stay synchronized
- router and executor can evolve together
- plugins can depend on local packages
- end-to-end tests are easier
- package boundaries can stay clean without cross-repo friction
- refactors are simpler while the architecture is young

## What This Repo Represents Now

The repo has been migrated into the monorepo shape:

```text
shared-types
router-core
router-mcp
router-http
executor-core
executor-mock
executor-codex
executor-openai
executor-anthropic
plugins/codex-router
docs
examples
```

The key boundary still holds: router packages decide what should happen, executor packages run or plan provider-specific work, and plugins connect that behavior to agent platforms.

## Suggested Next Step

Keep stabilizing the package contracts used across router, executor, and plugin surfaces:

```text
TaskAssessment
RouteDecision
ExecutionPlan
WorkerBrief
PreparedAgentExecution
```

Good follow-up work:

- add persisted execution logs and cost/token accounting
- add provider-specific retry classification
- add a Devin executor only if Devin exposes usable runtime/model-selection APIs
- keep platform model-switching limitations documented in plugin and executor docs
