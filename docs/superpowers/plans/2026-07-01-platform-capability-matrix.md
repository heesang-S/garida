# Platform Capability Matrix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared capability matrix that compares current platform integration limits and supported flows across Codex, Claude Code, Devin, and personal agents.

**Architecture:** The matrix should live in `knowledge/` as a single durable source of truth. Platform-specific plans and docs should link to it instead of re-describing the same capability boundaries in divergent ways.

**Tech Stack:** Markdown documentation, small test or doc-link verification if useful.

---

## File Structure

- Create `knowledge/platform-capability-matrix.md`
- Modify `knowledge/codex-integration-notes.md`
- Modify `knowledge/executor-adapters-todo.md`
- Modify `docs/leftovers-todo.md`

## Task 1: Create The Matrix

**Files:**
- Create: `knowledge/platform-capability-matrix.md`

- [ ] **Step 1: Write the matrix**

Include rows for:

```text
Codex
Claude Code
Devin
Personal agent
```

and columns for:

```text
Exact model switching
MCP support
External executor support
Worker result return path
Current status
```

- [ ] **Step 2: Add explicit status values**

Use deterministic status wording such as:

```text
supported
unsupported
unknown / blocked by platform API
available through custom integration
```

- [ ] **Step 3: Save the file**

Make the matrix concise and easy to scan.

## Task 2: Link Existing Docs To The Matrix

**Files:**
- Modify: `knowledge/codex-integration-notes.md`
- Modify: `knowledge/executor-adapters-todo.md`

- [ ] **Step 1: Add matrix cross-reference**

Add one sentence in each doc pointing readers to `knowledge/platform-capability-matrix.md`.

- [ ] **Step 2: Remove duplicated future-language only if it conflicts**

Keep useful context; only trim lines that would materially contradict the matrix.

## Task 3: Leftover Tracking

**Files:**
- Modify: `docs/leftovers-todo.md`

- [ ] **Step 1: Mark the capability matrix planned**

Replace the generic cross-platform docs task with a direct reference to the matrix plan.

- [ ] **Step 2: Commit**

```bash
git add knowledge/platform-capability-matrix.md knowledge/codex-integration-notes.md knowledge/executor-adapters-todo.md docs/leftovers-todo.md
git commit -m "Plan platform capability matrix"
```

## Self-Review

- Spec coverage: all required platforms and capability dimensions are covered.
- Placeholder scan: no TBD/TODO placeholders remain.
- Type consistency: matrix terms match current router/executor/plugin vocabulary.
