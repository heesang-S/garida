# Quick competitive evaluation gate

This is a directional pre-phase check for the public alpha. It is intentionally
small and inexpensive; it must not be presented as a statistically powered
launch benchmark.

## Question

Does Garida's routing achieve approximately fixed-standard quality while using
less cost than always selecting the fixed-strong model?

## Protocol

- Use 12 sanitized tasks: three each for coding, debugging, review, and
  planning.
- Run four strategies on the same tasks: Garida-routed, fixed-small,
  fixed-standard, and fixed-strong.
- Keep one provider family and one model snapshot for the first pass so the
  result measures routing rather than provider differences.
- Cap each response at 256 output tokens, each task at 30 seconds, and the
  complete run at 48 model calls.
- Stop at a hard budget of USD 5 (or the provider's lower configured limit).
- Record task ID, selected tier/model, success (0/1), latency, input/output
  tokens, estimated cost, and failure reason in sanitized JSONL.
- Score success with a deterministic task-specific check where possible
  (tests or required fields); otherwise use a short rubric with two reviewers.

## Directional gate

Proceed to the next release phase if all three are true:

1. Garida success is no worse than fixed-standard by more than 10 percentage
   points.
2. Garida mean cost per successful task is at least 15% below fixed-strong.
3. No category has a failure rate above 50%.

If fewer than 12 tasks complete, the result is **inconclusive**. Do not claim
competitive advantage. The full release gates remain the larger evaluation in
PR 8: parity with fixed-standard, within five points of fixed-strong, and 20%
lower mean cost.

## Reproducibility and safety

- Pin the model IDs, catalog version, task-suite version, and pricing snapshot.
- Do not include secrets, private repository content, or full prompts in the
  published report.
- If credentials or a provider are unavailable, run only the route-distribution
  smoke check and label it **not a quality evaluation**.
- Preserve raw sanitized JSONL and a short Markdown summary with the commit and
  timestamp.

## Decision

This gate informs whether HTTP work should continue immediately. A failure
means adjust the routing policy or catalog first; it does not justify claiming
that Garida is uncompetitive from this small sample alone.
