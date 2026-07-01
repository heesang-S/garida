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
