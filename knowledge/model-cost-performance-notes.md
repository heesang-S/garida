# Model Cost and Performance Notes

Research date: 2026-07-17

This note explains how `packages/router-core/routing/model-catalog.json` should be interpreted.

## Main Rule

The LLM should classify the task. The router should choose the model.

```text
task
-> LLM task assessment
-> code validates JSON
-> code checks model catalog
-> code picks cheapest adequate model
```

Adequate means:

```text
estimated_quality >= required_quality_for_risk
and context_capacity covers task context_size
and allowed_risk includes task risk
```

## Current Model Mapping

The catalog retains these legacy Codex model IDs for compatibility and history:

- `gpt-5.4-mini`: small, fast, cost-efficient model.
- `gpt-5.4`: strong everyday coding model.
- `gpt-5.5`: frontier model for complex coding, research, and real-world work.
The active GPT-5.6 choices are:

- `gpt-5.6-luna`: fast, low-cost model for simple and low-risk work.
- `gpt-5.6-terra`: balanced model for everyday coding and multi-step agent work.
- `gpt-5.6-sol`: strong model for complex, high-risk, and tool-heavy work.

The catalog maps them as:

- `small_fast` -> `gpt-5.6-luna`
- `standard` -> `gpt-5.6-terra`
- `strong` -> `gpt-5.6-sol`

## Pricing Facts

OpenAI API pricing is recorded as USD per 1M tokens in `packages/router-core/routing/model-catalog.json`.

Important standard short-context prices:

- `gpt-5.4-mini`: input `$0.75`, cached input `$0.075`, output `$4.50`
- `gpt-5.4`: input `$2.50`, cached input `$0.25`, output `$15.00`
- `gpt-5.5`: input `$5.00`, cached input `$0.50`, output `$30.00`
- `gpt-5.6-luna`: input `$1.00`, cached input `$0.10`, output `$6.00`
- `gpt-5.6-terra`: input `$2.50`, cached input `$0.25`, output `$15.00`
- `gpt-5.6-sol`: input `$5.00`, cached input `$0.50`, output `$30.00`

The GPT-5.6 tiers preserve the same capability progression while making Luna, Terra, and Sol the active OpenAI/Codex routes. GPT-5.4 remains a compatibility fallback when GPT-5.6 is unavailable.

## Benchmark Facts

The clearest public benchmark numbers found in this pass were for GPT-5.4, from OpenAI's GPT-5.4 release page:

- GDPval wins/ties: `83.0%`
- SWE-Bench Pro public: `57.7%`
- OSWorld-Verified: `75.0%`
- Toolathlon: `54.6%`
- BrowseComp: `82.7%`
- Internal spreadsheet modeling: `87.3%`
- MMMU-Pro: `81.2%`

For GPT-5.5, the official guide gives qualitative guidance rather than a compact benchmark table. It says GPT-5.5 is a strong fit for complex production workflows, coding, tool-heavy agents, grounded assistants, long-context retrieval, product-spec-to-plan workflows, and customer-facing workflows where quality and polish are important.

Because of that, `estimated_quality_scores` in the catalog are bootstrap estimates. They should be replaced later with project-specific eval results.

## What This Means for Routing

Use `small_fast` when:

- Risk is low.
- The task is easy to verify.
- The task is simple writing, classification, formatting, fixture generation, or a small transformation.

Use `standard` when:

- Risk is low or medium.
- The task needs normal coding, testing, tool use, synthesis, or moderate planning.
- You want a good balance of price and capability.

Use `strong` when:

- Risk is high.
- The task is ambiguous, broad, or hard to verify.
- The task involves deep debugging, security review, architecture, long-context synthesis, or tool-heavy agent work.

Use GPT-5.6 Sol specifically when the task is high-risk, ambiguous, difficult to verify, or requires deep debugging, architecture, large-context synthesis, or tool-heavy agent work. Use GPT-5.6 Terra for normal multi-step coding and GPT-5.6 Luna for simple low-risk work.

## Important Caveat

Benchmarks are not routing truth. They are priors.

The router should eventually collect its own data:

- route decision
- selected model
- task type
- verification result
- latency
- token usage
- retry count
- escalation count

Those observations should update the catalog's quality scores over time.

## Sources

- OpenAI API pricing: `https://developers.openai.com/api/docs/pricing`
- OpenAI GPT-5.5 guide: `https://developers.openai.com/api/docs/guides/latest-model`
- OpenAI GPT-5.4 release and benchmarks: `https://openai.com/index/introducing-gpt-5-4/`
- OpenAI GPT-5.6 model catalog: `https://developers.openai.com/api/docs/models`
