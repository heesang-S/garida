# Implement Explicit Routing Base

## TL;DR
> **Summary**: Build a minimal TypeScript router that validates LLM-produced task assessments, applies the JSON routing policy deterministically, and verifies behavior with fixture-based tests.
> **Deliverables**:
> - TypeScript project setup
> - JSON schema validation for task assessments
> - Deterministic routing engine for `base-routing-policy.json`
> - Example task fixtures with expected route decisions
> - Test suite covering schema validation, rule matching, delegation, review, and fallback behavior
> - CLI entry point for local manual checks
> **Effort**: Medium
> **Parallel**: NO - current repository is small and tasks build on each other
> **Critical Path**: Project setup -> Types/schemas -> Router engine -> Fixtures/tests -> CLI/docs

## Context

### Original Request

The user asked to create a plan to implement the remaining work for the explicit routing base.

### Current Repository State

The repository is currently documentation and configuration only:

- `README.md`
- `AGENTS.md`
- `knowledge/*.md`
- `routing/task-classifier-prompt.md`
- `routing/task-assessment-schema.json`
- `routing/model-catalog.json`
- `routing/base-routing-policy.json`
- `routing/base-routing-policy.md`

There is no existing app stack, package manifest, test runner, or source directory.

### Planning Notes

Use TypeScript for the first implementation because the project is policy/schema-heavy and benefits from typed JSON structures, fixture-based tests, and a CLI/library split. Avoid real LLM calls in this milestone. The first goal is deterministic routing from already-classified task assessments.

### Metis Review

Metis subagent review was skipped because the current session policy says not to spawn sub-agents unless explicitly requested. Manual gap review found these risks and resolutions:

- **Risk**: letting implementation call an LLM too early. **Resolution**: explicitly exclude LLM API calls from this plan.
- **Risk**: policy JSON supports condition keys like `_not` and threshold checks that need clear semantics. **Resolution**: implement a small condition evaluator with exact documented operators.
- **Risk**: review rules depend on previous route state, especially `delegate`. **Resolution**: route in stages: model, delegation, review, fallback.
- **Risk**: no test infra exists. **Resolution**: include TypeScript + Vitest setup.

## Work Objectives

### Core Objective

Create an executable routing base that takes a valid `TaskAssessment` JSON object and returns a deterministic route decision using `routing/base-routing-policy.json`.

### Deliverables

- `package.json`
- `tsconfig.json`
- `vitest.config.ts`
- `src/types.ts`
- `src/load-json.ts`
- `src/validate-assessment.ts`
- `src/rule-evaluator.ts`
- `src/router.ts`
- `src/cli.ts`
- `examples/tasks/*.json`
- `tests/*.test.ts`
- README/routing documentation updates

### Definition of Done

- `npm test` passes.
- `npm run typecheck` passes.
- `npm run route -- examples/tasks/simple-writing.json` prints a valid route decision.
- Invalid task assessment fixtures fail validation with a useful error.
- Routing decisions include `model_class`, `delegate`, `add_reviewer`, `matched_rules`, `routing_reason`, and `fallback`.

### Must Have

- Code must apply `base-routing-policy.json`; do not hardcode the policy directly into router logic.
- LLM classification must remain out of scope for execution. The input is already-classified JSON.
- Task assessments must be validated before routing.
- Rule matching must be deterministic and ordered by `priority`.
- Rule evaluation must support:
  - `always`
  - enum inclusion, such as `"risk": ["high"]`
  - negative enum inclusion, such as `"context_size_not": ["large"]`
  - boolean equality, such as `"parallelizable": true`
  - threshold checks, such as `"confidence_below": 0.6`
  - route-state checks, such as `"delegate": true`
- Tests must cover `testing` as a task type.

### Must NOT Have

- No real LLM API calls.
- No sub-agent execution.
- No web UI.
- No database.
- No YAML migration.
- No dynamic policy language beyond the operators already present in `base-routing-policy.json`.

## Verification Strategy

> ZERO HUMAN INTERVENTION - all verification is agent-executed.

- Test decision: tests-after using Vitest, because no implementation exists yet and the policy documents are already established.
- QA policy: every task includes command-based verification.
- Evidence target: command stdout from `npm test`, `npm run typecheck`, and `npm run route -- <fixture>`.

## Execution Strategy

### Parallel Execution Waves

Wave 1: project setup and type definitions.

Wave 2: validation and policy loading.

Wave 3: rule evaluator and router.

Wave 4: examples, tests, CLI, and docs.

### Dependency Matrix

| Task | Depends on | Blocks | Can parallelize with |
|---|---|---|---|
| 1. TypeScript project setup | none | 2, 3, 4, 5 | none |
| 2. Shared types and JSON loading | 1 | 3, 4, 5 | none |
| 3. Assessment validation | 2 | 4, 5 | none |
| 4. Rule evaluator and router | 2, 3 | 5, 6 | none |
| 5. Fixtures and tests | 3, 4 | 6 | none |
| 6. CLI and docs | 4, 5 | final verification | none |

## TODOs

- [x] 1. Set up minimal TypeScript project

  **What to do**: Add `package.json`, `tsconfig.json`, and `vitest.config.ts`. Use ESM TypeScript. Add scripts:
  - `test`: `vitest run`
  - `typecheck`: `tsc --noEmit`
  - `route`: `tsx src/cli.ts`

  Add dev dependencies: `typescript`, `tsx`, `vitest`, `ajv`.

  **Must NOT do**: Do not add React, Next.js, a server framework, or LLM SDK dependencies.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2, 3, 4, 5, 6 | Blocked By: none

  **References**:
  - `routing/task-assessment-schema.json` - schema that validation must load.
  - `routing/base-routing-policy.json` - policy that router must load.

  **Acceptance Criteria**:
  - [ ] `npm run typecheck` executes without missing config errors.
  - [ ] `npm test` executes and reports no tests or passing placeholder test.

  **QA Scenarios**:
  ```text
  Scenario: Toolchain starts
    Tool: bash
    Steps: Run `npm run typecheck` and `npm test`.
    Expected: Both commands execute without config/runtime errors.
    Evidence: terminal stdout

  Scenario: No unwanted framework dependencies
    Tool: bash
    Steps: Run `node -e "const p=require('./package.json'); console.log(Object.keys({...p.dependencies,...p.devDependencies}).sort().join('\n'))"`.
    Expected: Output contains TypeScript/Vitest/AJV tooling only; no UI/server/LLM packages.
    Evidence: terminal stdout
  ```

  **Commit**: NO | Message: N/A | Files: `package.json`, `tsconfig.json`, `vitest.config.ts`

- [x] 2. Add shared TypeScript types and JSON loader

  **What to do**: Create `src/types.ts` with explicit types for:
  - `TaskAssessment`
  - `TaskType`
  - `Complexity`
  - `Risk`
  - `ContextSize`
  - `ToolNeed`
  - `RouteDecision`
  - `RoutingPolicy`
  - `Rule`

  Create `src/load-json.ts` with a small helper that reads JSON from disk and returns parsed data. Use Node `fs/promises`.

  **Must NOT do**: Do not duplicate full JSON schemas in TypeScript manually beyond necessary runtime-facing types.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 3, 4, 5 | Blocked By: 1

  **References**:
  - `routing/task-assessment-schema.json` - enum source.
  - `routing/base-routing-policy.json` - route decision shape.

  **Acceptance Criteria**:
  - [ ] Types include the `testing` task type.
  - [ ] JSON loader has a test covering valid JSON and invalid JSON.
  - [ ] `npm run typecheck` passes.

  **QA Scenarios**:
  ```text
  Scenario: Valid JSON loads
    Tool: bash
    Steps: Run `npm test -- tests/load-json.test.ts`.
    Expected: Valid fixture parses successfully.
    Evidence: terminal stdout

  Scenario: Invalid JSON fails
    Tool: bash
    Steps: Run `npm test -- tests/load-json.test.ts`.
    Expected: Invalid JSON test asserts a useful thrown error.
    Evidence: terminal stdout
  ```

  **Commit**: NO | Message: N/A | Files: `src/types.ts`, `src/load-json.ts`, `tests/load-json.test.ts`

- [x] 3. Implement task assessment validation

  **What to do**: Create `src/validate-assessment.ts`. Load `routing/task-assessment-schema.json` with AJV. Export:
  - `validateTaskAssessment(value: unknown): TaskAssessment`
  - `formatValidationErrors(...)`

  Validation must reject unknown fields because the schema has `additionalProperties: false`.

  **Must NOT do**: Do not route invalid assessments. Do not silently coerce invalid fields.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 4, 5 | Blocked By: 2

  **References**:
  - `routing/task-assessment-schema.json` - must be loaded at runtime.

  **Acceptance Criteria**:
  - [ ] Valid assessment passes.
  - [ ] Missing required field fails.
  - [ ] Unknown task type fails.
  - [ ] `testing` task type passes.
  - [ ] Extra property fails.

  **QA Scenarios**:
  ```text
  Scenario: Testing task validates
    Tool: bash
    Steps: Run `npm test -- tests/validate-assessment.test.ts`.
    Expected: Fixture with `"task_type": "testing"` is accepted.
    Evidence: terminal stdout

  Scenario: Extra field rejected
    Tool: bash
    Steps: Run `npm test -- tests/validate-assessment.test.ts`.
    Expected: Fixture with an unrecognized field fails validation.
    Evidence: terminal stdout
  ```

  **Commit**: NO | Message: N/A | Files: `src/validate-assessment.ts`, `tests/validate-assessment.test.ts`

- [x] 4. Implement deterministic rule evaluator and router

  **What to do**: Create `src/rule-evaluator.ts` and `src/router.ts`.

  `rule-evaluator.ts` must implement condition matching for:
  - `always: true`
  - `field: [allowed values]`
  - `field_not: [disallowed values]`
  - `field: true/false`
  - `confidence_below: number`
  - route-state fields such as `delegate: true`

  `router.ts` must:
  - Load `routing/base-routing-policy.json`.
  - Sort each rule group by `priority`.
  - Apply the first matching model rule.
  - Apply the first matching delegation rule.
  - Apply the first matching review rule after delegation is known.
  - Build `matched_rules` in application order.
  - Build `routing_reason` from matched rule reasons.
  - Build fallback text from relevant fallback rules, at minimum low-confidence fallback.

  **Must NOT do**: Do not let an LLM choose the route. Do not use random scoring.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 5, 6 | Blocked By: 3

  **References**:
  - `routing/base-routing-policy.json` - executable policy.
  - `routing/model-catalog.json` - model classes returned by the router must exist here.

  **Acceptance Criteria**:
  - [ ] Low-risk simple task routes to `small_fast`.
  - [ ] Medium debugging task routes to `strong`.
  - [ ] High-risk review routes to `strong` and `add_reviewer: true`.
  - [ ] High-complexity parallel task sets `delegate: true` and `add_reviewer: true`.
  - [ ] Low-confidence assessment includes escalation fallback.

  **QA Scenarios**:
  ```text
  Scenario: Simple task route
    Tool: bash
    Steps: Run `npm test -- tests/router.test.ts`.
    Expected: Simple low-risk task returns `model_class: "small_fast"` and `delegate: false`.
    Evidence: terminal stdout

  Scenario: Delegation route
    Tool: bash
    Steps: Run `npm test -- tests/router.test.ts`.
    Expected: High-complexity parallel task returns `delegate: true` and includes matched delegation/review rules.
    Evidence: terminal stdout
  ```

  **Commit**: NO | Message: N/A | Files: `src/rule-evaluator.ts`, `src/router.ts`, `tests/rule-evaluator.test.ts`, `tests/router.test.ts`

- [x] 5. Add examples and expected route fixtures

  **What to do**: Create `examples/tasks/` with JSON files:
  - `simple-writing.json`
  - `coding-medium.json`
  - `testing-medium.json`
  - `debugging-medium.json`
  - `high-risk-review.json`
  - `complex-planning-delegated.json`
  - `invalid-extra-field.json`

  Add tests that load each valid fixture, validate it, route it, and assert expected key decisions.

  **Must NOT do**: Do not store natural-language prompts only. Fixtures should be direct `TaskAssessment` JSON objects.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: 6 | Blocked By: 4

  **References**:
  - `routing/task-classifier-prompt.md` - examples should align with classifier guidance.
  - `routing/base-routing-policy.json` - expected decisions should match policy rules.

  **Acceptance Criteria**:
  - [ ] All valid fixtures validate.
  - [ ] Invalid fixture fails validation.
  - [ ] Each task type listed above has expected route assertions.

  **QA Scenarios**:
  ```text
  Scenario: All valid examples route
    Tool: bash
    Steps: Run `npm test -- tests/examples.test.ts`.
    Expected: Every valid example validates and routes to expected decisions.
    Evidence: terminal stdout

  Scenario: Invalid example fails
    Tool: bash
    Steps: Run `npm test -- tests/examples.test.ts`.
    Expected: `invalid-extra-field.json` fails validation.
    Evidence: terminal stdout
  ```

  **Commit**: NO | Message: N/A | Files: `examples/tasks/*.json`, `tests/examples.test.ts`

- [x] 6. Add CLI and documentation updates

  **What to do**: Create `src/cli.ts` that accepts a path to a task assessment JSON file:

  ```text
  npm run route -- examples/tasks/simple-writing.json
  ```

  The CLI should:
  - Load the file.
  - Validate the assessment.
  - Route it.
  - Print route decision JSON.
  - Exit nonzero with a useful error when validation fails.

  Update `routing/README.md` with:
  - Install command.
  - Test commands.
  - CLI usage.
  - The exact pipeline from classifier output to route decision.

  **Must NOT do**: Do not call an LLM from the CLI.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: final verification | Blocked By: 5

  **References**:
  - `routing/README.md` - update the existing routing base docs.
  - `routing/task-classifier-prompt.md` - clarify that CLI input is classifier output.

  **Acceptance Criteria**:
  - [ ] Valid fixture prints route decision JSON.
  - [ ] Invalid fixture exits nonzero.
  - [ ] `routing/README.md` documents the flow accurately.

  **QA Scenarios**:
  ```text
  Scenario: CLI routes valid fixture
    Tool: bash
    Steps: Run `npm run route -- examples/tasks/simple-writing.json`.
    Expected: stdout is JSON with `model_class`, `delegate`, `add_reviewer`, `matched_rules`, `routing_reason`, and `fallback`.
    Evidence: terminal stdout

  Scenario: CLI rejects invalid fixture
    Tool: bash
    Steps: Run `npm run route -- examples/tasks/invalid-extra-field.json`.
    Expected: command exits nonzero and prints validation error.
    Evidence: terminal stdout/stderr
  ```

  **Commit**: NO | Message: N/A | Files: `src/cli.ts`, `routing/README.md`

## Final Verification Wave

- [x] F1. Plan Compliance Audit
  - Verify every deliverable listed in this plan exists.
  - Verify no LLM API calls or sub-agent execution were added.

- [x] F2. Type and Test Verification
  - Run `npm run typecheck`.
  - Run `npm test`.

- [x] F3. Real CLI QA
  - Run `npm run route -- examples/tasks/simple-writing.json`.
  - Run `npm run route -- examples/tasks/testing-medium.json`.
  - Run `npm run route -- examples/tasks/high-risk-review.json`.
  - Run `npm run route -- examples/tasks/invalid-extra-field.json` and confirm nonzero failure.

- [x] F4. Scope Fidelity Check
  - Confirm the implemented system still follows:
    ```text
    LLM classifies -> code validates -> code routes -> code returns decision
    ```
  - Confirm no routing decision is made by free-form LLM output.

## Commit Strategy

No commits are required unless the user asks. If committing later, use one commit:

```text
feat(routing): implement deterministic routing base
```

## Success Criteria

The implementation is successful when a developer can run:

```text
npm install
npm run typecheck
npm test
npm run route -- examples/tasks/simple-writing.json
```

and get a deterministic route decision produced from JSON policy files, without any LLM call.
