# Project Purpose

Build an agent that chooses an appropriate model for each task and creates sub-agents according to task complexity.

## Agent Behavior

When working on this project, keep the core design centered on:

- Task assessment before execution.
- Model selection based on complexity, cost, latency, context size, and required reasoning depth.
- Sub-agent creation only when decomposition improves quality or speed.
- Clear subtask briefs with objectives, constraints, inputs, outputs, and acceptance criteria.
- Result synthesis that resolves conflicts and produces one coherent final response.

Prefer simple orchestration for simple tasks. Escalate to stronger models or sub-agent decomposition only when the task justifies it.
