# Small live Codex benchmark

Date: 2026-08-02

## Result

**Inconclusive for the cost gate.** Garida preserved task success in this tiny
sample, but the run cannot establish the required 15% cost reduction.

| Arm | Completed | Successes | Success rate | Codex quota tokens |
| --- | ---: | ---: | ---: | ---: |
| Garida-routed | 12 | 12 | 100% | 40,112 |
| Fixed strong (`gpt-5.6-sol`) | 12 | 12 | 100% | 41,522 |

The success gap was 0 percentage points. Garida routed 2 tasks to
`gpt-5.6-luna`, 2 to `gpt-5.6-terra`, and 8 to `gpt-5.6-sol`.

## Protocol deviation

To limit Codex quota overhead, the planned 24 individual calls were batched
into six calls: three Garida route groups and three fixed-strong groups. The
observed quota-token difference was only about 3.4% (40,112 versus 41,522), but
Codex subscription quota is not provider billing and batched prompts do not
provide a valid per-task dollar comparison.

The two calibration calls consumed an additional 6,231 quota tokens. Total
benchmark-call usage was 81,634 tokens, excluding the failed schema preflight.

## Interpretation

- **Task success:** preserved in this sample: 100% for both arms.
- **Cost reduction:** not demonstrated; the 15% gate remains unmet/inconclusive.
- **Statistical strength:** very low; this is directional evidence only.
- **Scope:** synthetic coding, debugging, review, and planning tasks; no live
  repository changes or judge-model calls.

Raw grouped responses and corrected measurements are in
[`small-live-codex-2026-08-02/`](./small-live-codex-2026-08-02/), with the
corrected report at
[`results-corrected.json`](./small-live-codex-2026-08-02/results-corrected.json).
