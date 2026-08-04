# `@garida/core`

Deterministic, explainable model routing and execution-plan generation for
TypeScript applications.

```ts
import { routeTask } from "@garida/core"

const route = await routeTask({
  task_type: "debugging",
  complexity: "medium",
  risk: "medium",
  context_size: "medium",
  tool_need: "heavy",
  parallelizable: false,
  requires_subagents: false,
  confidence: 0.86,
  reasoning: "The task needs runtime investigation and tool use."
})

console.log(route.model_id, route.routing_reason)
```

The package does not call providers, create subprocesses, or own credentials.
It returns a route and execution plan for the host application to execute.

This package is part of Garida's experimental public alpha. See the repository
[README](../../README.md) for scope and limitations.
