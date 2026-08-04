# Garida route-only smoke evaluation

Date: 2026-07-27
Router: bundled `router-core` policy/catalog
Preferred provider: `openai_codex`
Model calls: **0**
External tokens: **0**

## Suite

Twelve prewritten, valid task assessments were routed locally: three low-risk
simple tasks, four medium tasks, one medium high-risk review, and four high
complexity/high-risk or delegated tasks. The assessments cover coding,
writing, conversation, data analysis, testing, research, debugging, review,
and planning.

## Distribution

| Result | Count | Share |
| --- | ---: | ---: |
| `small_fast` / `gpt-5.6-luna` | 3 | 25.0% |
| `standard` / `gpt-5.6-terra` | 3 | 25.0% |
| `strong` / `gpt-5.6-sol` | 6 | 50.0% |
| Delegated | 3 | 25.0% |
| Reviewer added | 5 | 41.7% |
| Fallback triggered | 0 | 0.0% |

All 12 routes selected `openai_codex`, as requested by the evaluation input.

## Execution note

The workspace dependency reinstall is incomplete, so the compiled router was
run with a validation-only `ajv` shim for these known-valid assessments. The
routing policy, model catalog, and routing engine were not replaced or
modified.

## Observations

- The policy gives the cheapest tier to simple, low-risk, low-tool work.
- Medium debugging escalates to `strong` even without high risk.
- High risk consistently selects `strong` and adds independent review.
- High-complexity parallel work delegates and adds a reviewer.
- No fallback was triggered because every assessment had high confidence and
  no verification failure or requirements conflict.

## Limitation

This is a routing-behavior check, not a competitive quality evaluation. It
measures policy coverage and distribution only; it does not measure model
success, latency, tokens, or cost per successful task.
