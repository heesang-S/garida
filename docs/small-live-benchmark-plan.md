# Small live benchmark plan

## Decision question

Does Garida preserve task success while costing less than always selecting the
strong model?

This is a bounded feasibility test, not a claim of superiority over every
public router.

## Minimal experiment

Run the same 12 sanitized tasks under two strategies:

1. **Garida** — use the current policy and catalog to select the model.
2. **Fixed-strong** — send every task to the strong model used by the catalog.

Use one provider family, pinned model IDs, and the same prompt/context for both
arms. Randomize arm order per task to reduce time-of-run bias. Do not use a
judge model; use deterministic checks where possible and a short fixed rubric
otherwise.

### Task mix

Use three tasks from each category:

- coding;
- debugging;
- review;
- planning.

Tasks must be sanitized, self-contained, and versioned. Do not include private
repository content, credentials, or prompts that require undisclosed context.

## Cost and safety limits

- Maximum 24 provider calls (12 tasks × 2 arms).
- Maximum 256 output tokens per call.
- Maximum 30 seconds per task execution.
- Hard external-provider budget: USD 3, or the provider's lower configured cap.
- Stop immediately on authentication, quota, privacy, or repeated provider
  failures.
- Record only sanitized task IDs and measurements; never store secrets or full
  private prompts.

## Measurements

For every task/arm record:

- task ID and category;
- selected model and route reason;
- success (`0`/`1`) and deterministic check/rubric result;
- input/output tokens;
- estimated cost;
- wall-clock latency;
- timeout or failure reason.

Derived metrics:

- overall and per-category success rate;
- mean cost per task;
- mean cost per successful task;
- p50/p95 latency;
- Garida route distribution and fallback count.

## Directional decision gate

Call the result **promising** only if all conditions hold:

1. Garida success is no more than 10 percentage points below fixed-strong.
2. Garida cost per successful task is at least 15% lower than fixed-strong.
3. No category has a Garida failure rate above 50%.
4. At least 10 of 12 task pairs complete.

Otherwise call it **adjust routing** or **inconclusive**. Do not call the
result competitive from this sample alone. A later, larger evaluation remains
required for release claims.

## Execution steps

1. Pin the task-suite version, catalog version, model IDs, and pricing snapshot.
2. Validate provider access with one non-evaluated request, if needed.
3. Run the 24-call bounded experiment with timeouts and output caps.
4. Run deterministic checks and apply the fixed rubric to uncaught cases.
5. Write sanitized JSONL plus a Markdown summary containing commit, timestamp,
   configuration, raw counts, and limitations.
6. Update the release tracker with one of the three outcomes.
7. Only after review, decide whether to adjust the policy or proceed to the
   larger evaluation.

## What this will and will not establish

It can establish whether the current Garida policy shows an initial cost/success
trade-off against a fixed-strong baseline. It cannot establish superiority over
RouteLLM, LLMRouter, LiteLLM, Routerly, or other public projects without a
separate apples-to-apples integration study.
