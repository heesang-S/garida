# Model Cost and Performance Notes

Research date: 2026-06-26

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

The current Codex app tools expose these model choices in this session:

- `gpt-5.4-mini`: small, fast, cost-efficient model.
- `gpt-5.4`: strong everyday coding model.
- `gpt-5.5`: frontier model for complex coding, research, and real-world work.

The catalog maps them as:

- `small_fast` -> `gpt-5.4-mini`
- `standard` -> `gpt-5.4`
- `strong` -> `gpt-5.5`

## Pricing Facts

OpenAI API pricing is recorded as USD per 1M tokens in `packages/router-core/routing/model-catalog.json`.

Important standard short-context prices:

- `gpt-5.4-mini`: input `$0.75`, cached input `$0.075`, output `$4.50`
- `gpt-5.4`: input `$2.50`, cached input `$0.25`, output `$15.00`
- `gpt-5.5`: input `$5.00`, cached input `$0.50`, output `$30.00`

This means `gpt-5.5` is about 2x `gpt-5.4` on standard short-context input/output pricing, and `gpt-5.4` is substantially more expensive than `gpt-5.4-mini`.

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
