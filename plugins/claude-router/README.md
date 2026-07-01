# Claude Router Integration

This integration asks the model router for a route decision and execution plan
before complex Claude / Claude Code work.

Current limitation:

- exact routed model switching depends on Claude Code runtime support
- routed worker execution currently falls back to
  `packages/executor-claude-code`, which is an unsupported stub

## Routed Execution

Use the `routed-task` skill before complex, high-risk, or delegatable Claude
Code work. The skill calls `prepare_execution`, reads the route, and follows
the returned execution plan.

## Executor Boundary

The integration layer routes and plans.

Future worker execution belongs in the executor package/domain:

- `packages/executor-claude-code` for runtime integration
- router packages remain deterministic and side-effect free
