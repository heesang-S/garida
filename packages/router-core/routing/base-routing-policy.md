# Base Routing Policy

This policy is the first explicit routing base for the project.

The router should use structured task assessment first, then deterministic policy rules. The LLM may classify the task, but code should own the routing decision.

## Summary

Use:

- `small_fast` for simple, low-risk, easy-to-check work.
- `standard` for normal coding, analysis, tool use, and synthesis.
- `strong` for high-risk, ambiguous, architecture-heavy, debugging-heavy, or large-context work.

Create sub-agents only when decomposition improves quality, speed, or independent verification enough to justify coordination cost.

## Routing Inputs

The router expects a task assessment with:

- `task_type`
- `complexity`
- `risk`
- `context_size`
- `tool_need`
- `parallelizable`
- `requires_subagents`
- `confidence`
- `reasoning`

See `task-assessment-schema.json`.

## Model Routing Rules

Apply rules from top to bottom.

### Rule 1: High Risk Uses Strong Model

```text
if risk == "high":
  model = "strong"
```

Use for:

- Security-sensitive work.
- Data loss risk.
- Legal, financial, or medical implications.
- Important code review.
- Ambiguous instructions with costly failure.

### Rule 2: Deep Debugging Uses Strong Model

```text
if task_type == "debugging" and complexity in ["medium", "high"]:
  model = "strong"
```

Use because debugging often needs long-context reasoning, hypothesis testing, and careful verification.

### Rule 3: Architecture and Planning Use Strong Model

```text
if task_type == "planning" and complexity == "high":
  model = "strong"
```

Use for:

- Multi-module planning.
- Long-term architecture.
- System design.
- Complex tradeoff decisions.

### Rule 4: Simple Low-Risk Work Uses Small Fast Model

```text
if complexity == "low"
and risk == "low"
and context_size != "large"
and tool_need != "heavy":
  model = "small_fast"
```

Use for:

- Classification.
- Reformatting.
- Simple writing.
- Short summaries.
- Easy transformations.

### Rule 5: Normal Work Uses Standard Model

```text
otherwise:
  model = "standard"
```

Use `standard` as the default for useful work that is not trivial and not high-risk.

## Delegation Rules

Model routing and delegation are separate decisions.

### Rule A: Do Not Delegate Simple Work

```text
if complexity == "low":
  delegate = false
```

Simple tasks are usually faster and safer without coordination overhead.

### Rule B: Delegate Complex Parallel Work

```text
if complexity == "high"
and parallelizable == true
and requires_subagents == true:
  delegate = true
```

Use when:

- Subtasks are independent.
- Different skills are needed.
- Parallel work saves time.
- Review by another agent improves reliability.

### Rule C: Do Not Delegate Tightly Coupled Work

```text
if parallelizable == false:
  delegate = false
```

If every step depends on the previous step, use a single agent or graph workflow.

### Rule D: Add Reviewer for High Risk

```text
if risk == "high":
  add_reviewer = true
```

High-risk tasks should have independent review even when not delegated to multiple workers.

## Route Decision Output

Every route should produce this shape:

```json
{
  "model_class": "standard",
  "delegate": false,
  "add_reviewer": false,
  "routing_reason": "Medium-complexity coding task with low risk and no strong parallelism signal.",
  "fallback": "Escalate to strong if confidence drops below 0.6, debugging is required, or verification fails."
}
```

## Fallback Rules

Escalate to `strong` when:

- Classifier confidence is below `0.6`.
- The first model fails verification.
- The task becomes more ambiguous after inspection.
- Tool results conflict.
- The output affects safety, money, credentials, data deletion, or production systems.

Ask the user for clarification when:

- Requirements conflict.
- Missing information changes the route.
- The task is high-risk and intent is unclear.
- The requested action would be unsafe.

## First Version Policy

The first implementation should be intentionally simple:

```text
classify_task(task)
-> task_assessment
-> choose_model(task_assessment)
-> choose_delegation(task_assessment)
-> return route_decision
```

No real sub-agent execution is required for the first version. The goal is to make routing visible and testable before adding orchestration.

## Example Decisions

### Example 1: Simple Formatting

Assessment:

```json
{
  "task_type": "writing",
  "complexity": "low",
  "risk": "low",
  "context_size": "small",
  "tool_need": "none",
  "parallelizable": false,
  "requires_subagents": false,
  "confidence": 0.95,
  "reasoning": "The task is a short rewrite with no tools or risk."
}
```

Decision:

```json
{
  "model_class": "small_fast",
  "delegate": false,
  "add_reviewer": false,
  "routing_reason": "Low complexity, low risk, small context, and no tool need.",
  "fallback": "Use standard if the rewrite requires deeper reasoning."
}
```

### Example 2: Complex Coding Task

Assessment:

```json
{
  "task_type": "coding",
  "complexity": "high",
  "risk": "medium",
  "context_size": "large",
  "tool_need": "heavy",
  "parallelizable": true,
  "requires_subagents": true,
  "confidence": 0.82,
  "reasoning": "The task touches multiple areas and can be split into implementation, tests, and review."
}
```

Decision:

```json
{
  "model_class": "standard",
  "delegate": true,
  "add_reviewer": true,
  "routing_reason": "High-complexity parallelizable coding task benefits from worker delegation and review.",
  "fallback": "Escalate planning or debugging subtasks to strong if blockers appear."
}
```

### Example 3: Security Review

Assessment:

```json
{
  "task_type": "review",
  "complexity": "medium",
  "risk": "high",
  "context_size": "medium",
  "tool_need": "light",
  "parallelizable": false,
  "requires_subagents": false,
  "confidence": 0.9,
  "reasoning": "Security-sensitive review has high consequence of failure."
}
```

Decision:

```json
{
  "model_class": "strong",
  "delegate": false,
  "add_reviewer": true,
  "routing_reason": "High-risk review requires strongest model and independent verification.",
  "fallback": "Ask for clarification if threat model or scope is unclear."
}
```
