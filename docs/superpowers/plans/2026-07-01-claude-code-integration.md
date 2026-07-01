# Claude Code Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a thin Claude / Claude Code integration layer that routes tasks through the model router before execution and documents current platform limitations honestly.

**Architecture:** Keep the Claude integration thin, like `plugins/codex-router`: a platform-facing plugin or integration package should call `prepare_execution`, expose instructions for when to route, and use the existing `packages/executor-claude-code` stub until Claude Code exposes stable worker/model-selection hooks. Routing logic stays in router packages, not in the plugin.

**Tech Stack:** Markdown docs, Codex-style plugin/integration packaging patterns, TypeScript tests, existing router MCP server, `packages/executor-claude-code`.

---

## File Structure

- Create `plugins/claude-router/README.md`: integration overview and local setup notes.
- Create `plugins/claude-router/skills/routed-task/SKILL.md`: Claude-facing routing workflow.
- Create `plugins/claude-router/tests/plugin-structure.test.ts`: smoke test for integration assets.
- Modify root `package.json` or plugin config only if needed for tests.
- Modify `knowledge/executor-adapters-todo.md`: mark Claude integration package plan implemented after buildout.
- Modify `docs/leftovers-todo.md`: mark Claude integration planned after this work lands.

## Task 1: Define Plugin Shape

**Files:**
- Create: `plugins/claude-router/README.md`

- [ ] **Step 1: Write the failing structure test**

Create a test expecting:

```ts
await access(join(pluginRoot, "README.md"))
await access(join(pluginRoot, "skills", "routed-task", "SKILL.md"))
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm test -- plugins/claude-router/tests/plugin-structure.test.ts
```

Expected: FAIL because the plugin files do not exist yet.

- [ ] **Step 3: Write minimal README**

Document:

```md
# Claude Router Integration

This integration asks the model router for a route decision and execution plan before complex Claude / Claude Code work.

Current limitation:

- exact routed model switching depends on Claude Code runtime support
- routed worker execution currently falls back to `packages/executor-claude-code`, which is an unsupported stub
```

- [ ] **Step 4: Run test to verify partial green progress**

Expected: structure test still fails until the skill file exists.

## Task 2: Add Routed Task Skill

**Files:**
- Create: `plugins/claude-router/skills/routed-task/SKILL.md`
- Modify: `plugins/claude-router/tests/plugin-structure.test.ts`

- [ ] **Step 1: Add failing skill-content assertions**

Add expectations:

```ts
expect(skill).toContain("prepare_execution")
expect(skill).toContain("route.model_id")
expect(skill).toContain("Claude Code")
```

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL because the skill file does not exist or lacks content.

- [ ] **Step 3: Write the skill**

Create:

```md
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
```

- [ ] **Step 4: Run test to verify it passes**

Expected: PASS.

## Task 3: Document Runtime Boundary

**Files:**
- Modify: `plugins/claude-router/README.md`
- Modify: `knowledge/executor-adapters-todo.md`

- [ ] **Step 1: Add executor boundary section**

Document in the README:

```md
## Executor Boundary

The integration layer routes and plans.

Future worker execution belongs in the executor package/domain:

- `packages/executor-claude-code` for runtime integration
- router packages remain deterministic and side-effect free
```

- [ ] **Step 2: Add explicit current-status note**

Update `knowledge/executor-adapters-todo.md` to point from the Claude Code stub to the new integration package plan.

- [ ] **Step 3: Run targeted tests**

Run the Claude integration structure test and the existing executor-core/Claude Code tests as needed.

- [ ] **Step 4: Commit**

```bash
git add plugins/claude-router knowledge/executor-adapters-todo.md docs/leftovers-todo.md
git commit -m "Plan Claude Code integration"
```

## Self-Review

- Spec coverage: plugin shape, routed-task skill, and current runtime limitation are all covered.
- Placeholder scan: no TBD/TODO placeholders remain.
- Type consistency: references use existing router and executor package names.
