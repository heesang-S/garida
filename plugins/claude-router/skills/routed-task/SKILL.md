---
name: routed-task
description: Use before complex, risky, or delegatable Claude Code work to request a routed execution plan.
---

# Routed Task

1. Assess the task using the router schema.
2. Call `prepare_execution`.
3. Read `route.model_id`, `route.delegate`, `route.add_reviewer`, and the worker briefs.
4. If Claude Code exposes model selection, use the routed model for the next worker.
5. If model selection is unavailable, state the recommended model and continue only if the current runtime is adequate.

## Limitation

This integration does not force the already-running Claude Code session to change models.
