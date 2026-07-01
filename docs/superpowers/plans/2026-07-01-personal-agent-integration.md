# Personal Agent Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define and implement the simplest platform-agnostic personal-agent integration path for routing tasks and returning worker results.

**Architecture:** This integration should be the least opinionated of the platform adapters. It should document a generic agent loop that calls `prepare_execution`, chooses whether to use a local runtime or an executor package, and returns worker/reviewer results to the main agent in a deterministic shape. It should avoid any platform-specific plugin machinery unless a real host later requires it.

**Tech Stack:** Markdown docs, optional example JSON/TypeScript snippets, TypeScript smoke tests.

---

## File Structure

- Create `plugins/personal-agent-router/README.md`
- Create `plugins/personal-agent-router/tests/plugin-structure.test.ts`
- Create `examples/personal-agent-execution.json`
- Modify `docs/leftovers-todo.md`

## Task 1: Define The Integration Contract

**Files:**
- Create: `plugins/personal-agent-router/README.md`
- Create: `plugins/personal-agent-router/tests/plugin-structure.test.ts`

- [ ] **Step 1: Write failing structure test**

Expect:

```ts
await access(join(pluginRoot, "README.md"))
```

- [ ] **Step 2: Run test to verify red**

Expected: FAIL because the integration directory does not exist.

- [ ] **Step 3: Write README contract**

Document:

```md
# Personal Agent Router Integration

Expected flow:

1. Build task assessment
2. Call `prepare_execution`
3. Execute worker briefs directly or through an executor package
4. Return worker/reviewer results to the calling agent
5. Synthesize according to `execution_plan.synthesis_strategy`
```

- [ ] **Step 4: Run test to verify green**

Expected: PASS.

## Task 2: Add Example Result Flow

**Files:**
- Create: `examples/personal-agent-execution.json`
- Modify: `plugins/personal-agent-router/README.md`
- Modify: `plugins/personal-agent-router/tests/plugin-structure.test.ts`

- [ ] **Step 1: Add a failing content test**

Expect the README to mention:

```ts
expect(readme).toContain("worker_results")
expect(readme).toContain("review_result")
expect(readme).toContain("synthesis_strategy")
```

- [ ] **Step 2: Run test to verify red**

Expected: FAIL until the README is expanded.

- [ ] **Step 3: Add example JSON**

Create an example payload shaped like:

```json
{
  "route": { "model_id": "gpt-5.4", "delegate": false, "add_reviewer": false },
  "execution_plan": { "worker_briefs": [], "synthesis_strategy": "..." },
  "result": { "worker_results": [], "review_result": null }
}
```

- [ ] **Step 4: Update README to reference the example**

Explain how a personal agent can treat this example as the return contract.

- [ ] **Step 5: Run tests to verify green**

Expected: PASS.

## Task 3: Leftover Tracking

**Files:**
- Modify: `docs/leftovers-todo.md`

- [ ] **Step 1: Mark personal-agent integration planned**

Update the leftover list with the new plan reference.

- [ ] **Step 2: Commit**

```bash
git add plugins/personal-agent-router examples/personal-agent-execution.json docs/leftovers-todo.md
git commit -m "Plan personal agent integration"
```

## Self-Review

- Spec coverage: generic routing, executor handoff, and result return path are all covered.
- Placeholder scan: no TBD/TODO placeholders remain.
- Type consistency: terms match existing `route`, `execution_plan`, and executor result shapes.
