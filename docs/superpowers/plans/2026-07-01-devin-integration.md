# Devin Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a thin Devin integration package and documentation that routes work through the model router while clearly surfacing that Devin execution remains unsupported until stable APIs exist.

**Architecture:** Mirror the Claude/Codex approach: integration assets should consume `prepare_execution`, keep routing logic outside the integration layer, and point execution responsibility to `packages/executor-devin`. The initial integration is documentation- and test-driven, not a fake runtime implementation.

**Tech Stack:** Markdown integration docs, TypeScript smoke tests, router MCP server, `packages/executor-devin`.

---

## File Structure

- Create `plugins/devin-router/README.md`
- Create `plugins/devin-router/tests/plugin-structure.test.ts`
- Create `knowledge/devin-integration-notes.md`
- Modify `docs/leftovers-todo.md`

## Task 1: Integration Skeleton

**Files:**
- Create: `plugins/devin-router/README.md`
- Create: `plugins/devin-router/tests/plugin-structure.test.ts`

- [ ] **Step 1: Write failing structure test**

Expect:

```ts
await access(join(pluginRoot, "README.md"))
```

- [ ] **Step 2: Run test to verify it fails**

Run the plugin structure test. Expected: FAIL because the plugin directory is missing.

- [ ] **Step 3: Write minimal README**

Document:

```md
# Devin Router Integration

This integration routes complex Devin work through the model router before execution planning.

Current limitation:

- exact runtime/model selection depends on Devin APIs that are not currently available here
- `packages/executor-devin` is an unsupported stub
```

- [ ] **Step 4: Run test to verify green**

Expected: PASS for the README-only structure check.

## Task 2: Platform Notes

**Files:**
- Create: `knowledge/devin-integration-notes.md`
- Modify: `plugins/devin-router/README.md`

- [ ] **Step 1: Write a failing content test**

Extend the structure test to require README content such as:

```ts
expect(readme).toContain("prepare_execution")
expect(readme).toContain("packages/executor-devin")
```

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL until the README is expanded.

- [ ] **Step 3: Add runtime notes**

Document in `knowledge/devin-integration-notes.md`:

```md
Expected flow:
Devin task -> task assessment -> prepare_execution -> route + worker briefs

Current blocker:
No confirmed Devin runtime hook for exact model switching or delegated worker execution.
```

- [ ] **Step 4: Update README to point at the notes**

Add a `Further Notes` section linking to the knowledge doc.

- [ ] **Step 5: Run tests to verify green**

Expected: PASS.

## Task 3: Leftover Tracking

**Files:**
- Modify: `docs/leftovers-todo.md`

- [ ] **Step 1: Mark Devin integration planned**

Update the leftover entry from a generic future task to a concrete plan reference.

- [ ] **Step 2: Commit**

```bash
git add plugins/devin-router knowledge/devin-integration-notes.md docs/leftovers-todo.md
git commit -m "Plan Devin integration"
```

## Self-Review

- Spec coverage: plugin skeleton, runtime limitation, and cross-reference docs are covered.
- Placeholder scan: no TBD/TODO placeholders remain.
- Type consistency: package and tool names match the current repo.
