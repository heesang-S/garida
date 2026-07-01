# Executor Adapters Todo

The router currently decides which model/provider should handle a task and produces an execution plan. It does not execute model calls by itself.

Executor adapters consume `route.model_id` and run or plan the selected runtime/provider.

## Adapter Interface

Implemented shape in `packages/executor-core`:

```ts
type AgentExecutor = {
  readonly provider: string
  executeWorker(brief, context): Promise<WorkerResult>
  executeReview?(brief, context): Promise<ReviewResult>
}
```

`runExecutionPlan` executes all worker briefs and optionally a reviewer brief with a selected `AgentExecutor`.

## Implemented Adapters

- `MockExecutor`: deterministic test executor in `packages/executor-mock`.
- `CodexExecutor`: dry-run command planner and optional process executor in `packages/executor-codex`.
- `OpenAIExecutor`: OpenAI-compatible Responses API executor in `packages/executor-openai`.
- `AnthropicExecutor`: Anthropic Messages API executor in `packages/executor-anthropic`.
- `DevinExecutor`: deterministic unsupported stub in `packages/executor-devin` until Devin exposes usable runtime/model-selection APIs.
- `ClaudeCodeExecutor`: deterministic unsupported stub in `packages/executor-claude-code` until Claude Code exposes usable worker/model-selection runtime hooks.

The current Codex executor plans:

```text
codex exec --model <route.model_id> <worker brief>
```

By default it does not spawn a process. Set `mode: "execute"` to use a process runner. This still launches a separate Codex execution and does not mutate the current chat model.

## Planned Adapters

- Claude plugin adapter, depending on available runtime hooks.

## Planned Cross-Cutting Contracts

- Rich execution logs persisted to an eval store.
- Token usage extraction from provider responses.
- Cost tracking per worker/reviewer.
- Provider-specific retry classification.

## Important Constraint

For APIs we directly control, the executor can use the routed model exactly.

For platforms like Codex, Devin, Cursor, or Claude Code, exact model switching is only possible if that platform exposes model selection to the integration layer.
