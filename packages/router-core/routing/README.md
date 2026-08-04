# Routing Policy Base

This folder contains the first explicit routing policy base for the model-orchestrating agent.

The core idea:

```text
task
-> structured assessment
-> model route
-> provider/model resolution
-> delegation route
-> explanation
```

The router should not make hidden decisions. Every routing result should explain:

- What the task is.
- How hard and risky it is.
- Which model class should handle it.
- Which concrete provider model should handle it.
- What the estimated input/output token prices are.
- Whether sub-agents are useful.
- Why the decision was made.
- What fallback should happen if the route fails.

## Files

- `task-assessment-schema.json`: shape of the task assessment object.
- `task-classifier-prompt.md`: LLM-facing instructions for producing task assessments.
- `model-catalog.json`: starter model classes and their intended uses.
- `base-routing-policy.json`: machine-readable routing, delegation, review, and fallback rules.
- `base-routing-policy.md`: human-readable routing and delegation rules.

## First Milestone

Build the non-agentic version first:

```text
input task
-> classify task into `task-assessment-schema.json`
-> choose model from `model-catalog.json`
-> apply `base-routing-policy.json`
-> return route decision with explanation
```

Only after this works should the project add real sub-agent execution.

## Current Implementation

The executable base is implemented as a TypeScript CLI/library.

Install dependencies:

```bash
pnpm install --frozen-lockfile
```

Run verification:

```bash
pnpm typecheck
pnpm test
```

Run the router:

```bash
pnpm run route -- examples/tasks/simple-writing.json
```

Run the router with a Claude provider preference:

```bash
pnpm run route -- --provider anthropic_claude examples/tasks/simple-writing.json
```

Pipeline:

```text
LLM output JSON
-> validate with `task-assessment-schema.json`
-> apply `base-routing-policy.json`
-> resolve `model_class` through `model-catalog.json`
-> print route decision JSON
```

The LLM still does not choose the exact model. It only classifies the task. The deterministic router chooses the capability tier, then resolves that tier to a concrete provider model such as `gpt-5.6-luna`, `gpt-5.6-terra`, `gpt-5.6-sol`, `claude-sonnet-4-6`, or `claude-opus-4-8`.
