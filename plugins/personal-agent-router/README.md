# Personal Agent Router Integration

This integration documents the simplest platform-agnostic way to route work
through the model router before a personal agent executes it.

Expected flow:

1. Build a task assessment.
2. Call `prepare_execution`.
3. Execute worker briefs directly or through an executor package.
4. Return worker and reviewer results to the calling agent.
5. Synthesize according to `execution_plan.synthesis_strategy`.

## Return Contract

A personal agent can treat the router response plus execution output as a stable
return contract:

- `route` captures the recommended `model_id` and whether to delegate or add a
  reviewer.
- `execution_plan` carries `worker_briefs`, an optional `reviewer_brief`, and
  the `synthesis_strategy`.
- `result.worker_results` stores the worker outputs that come back from the
  chosen runtime or executor package.
- `result.review_result` stores the reviewer output when the plan includes one.

See `/Users/HeeSang/Desktop/dev/ai/garida/examples/personal-agent-execution.json`
for a concrete example payload a personal agent can emit back to its caller.
