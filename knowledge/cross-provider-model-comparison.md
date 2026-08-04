# Cross-Provider Model Comparison

Research date: 2026-07-17

This note compares the current Codex/OpenAI routing classes with Claude model tiers. Use it as a routing prior, not as final truth. The router should still collect its own success, cost, latency, and retry data.

## Main Idea

Models should be compared by role, not only by benchmark rank.

For routing, the useful question is:

```text
What is the cheapest model that can satisfy this task's risk, quality, context, latency, and verification needs?
```

## Comparable Tiers

| Routing tier | OpenAI/Codex model | Claude model | Best use |
| --- | --- | --- | --- |
| Small / cheap | `gpt-5.6-luna` | `claude-haiku-4-5` | Classification, extraction, simple writing, simple transforms, low-risk sub-agents |
| Balanced | `gpt-5.6-terra` | `claude-sonnet-4-6` | Normal coding, testing, tool use, synthesis, medium-risk planning |
| Strong | `gpt-5.6-sol` | `claude-opus-4-8` | Hard debugging, architecture, high-risk review, long-horizon agentic work |
| Ultra / special | `gpt-5.5-pro` or `gpt-5.4-pro` | `claude-fable-5` | Most demanding reasoning when cost matters less than quality |

## Price Snapshot

Prices are standard API prices in USD per 1M tokens.

| Model | Input | Output | Notes |
| --- | ---: | ---: | --- |
| `gpt-5.4-mini` | `$0.75` | `$4.50` | Legacy compatibility reference; not an active route |
| `claude-haiku-4-5` | `$1.00` | `$5.00` | Fast Claude model with near-frontier positioning |
| `gpt-5.4` | `$2.50` | `$15.00` | Legacy compatibility fallback; Terra is active |
| `claude-sonnet-4-6` | `$3.00` | `$15.00` | Balanced Claude coding and agent model |
| `gpt-5.5` | `$5.00` | `$30.00` | Legacy compatibility reference; Sol is active |
| `gpt-5.6-luna` | `$1.00` | `$6.00` | Active low-cost OpenAI/Codex route |
| `gpt-5.6-terra` | `$2.50` | `$15.00` | Active balanced OpenAI/Codex route |
| `gpt-5.6-sol` | `$5.00` | `$30.00` | Active strong OpenAI/Codex route |
| `claude-opus-4-8` | `$5.00` | `$25.00` | Strong Claude Opus-tier route |
| `claude-fable-5` | `$10.00` | `$50.00` | Anthropic's most capable widely released model |
| `gpt-5.5-pro` | `$30.00` | `$180.00` | Reserve for exceptional cases |

## Capability Snapshot

### OpenAI / Codex

`gpt-5.4-mini` is retained as a legacy compatibility reference. For new routing decisions, use GPT-5.6 Luna when cost and speed matter more than deep reasoning.

`gpt-5.4` remains a compatibility fallback for ordinary coding and agent work when GPT-5.6 is unavailable. The active balanced route is now `gpt-5.6-terra`.

`gpt-5.6-sol` should be used when the work is complex, ambiguous, high-risk, tool-heavy, or requires stronger judgment. `gpt-5.6-terra` is the default for normal multi-step work, and `gpt-5.6-luna` is for simple low-risk tasks.

### Claude

`claude-haiku-4-5` is closest to the `small_fast` route. It is useful for cheap parallel work, simple classification, fast extraction, and low-risk helper agents.

`claude-sonnet-4-6` is closest to the `standard` route. It is a strong balanced choice for coding, testing, synthesis, and agent work when you want good quality without Opus-level cost.

`claude-opus-4-8` is closest to the `strong` route. Anthropic positions it for complex reasoning, long-horizon agentic coding, and high-autonomy work.

`claude-fable-5` is above normal routing. It is closer to an `ultra_strong` route for the most demanding long-horizon reasoning work.

## Context And Output

Claude's current top tiers are very strong for long context:

| Model | Context | Max output |
| --- | ---: | ---: |
| `claude-opus-4-8` | `1M` tokens | `128k` tokens |
| `claude-sonnet-4-6` | `1M` tokens | `128k` tokens |
| `claude-haiku-4-5` | `200k` tokens | `64k` tokens |
| `claude-fable-5` | `1M` tokens | Noted as a top long-horizon model |

For a router, this means Claude Sonnet or Opus can be attractive when the task has a very large input context, especially if the provider is available and the output budget is important.

## Routing Guidance

Use the OpenAI/Codex route when:

- The agent is running inside Codex and the model is directly available.
- You want tight integration with the current development workflow.
- You already have working benchmarks and policies for the Codex model classes.

Consider Claude Haiku when:

- You need many cheap helper agents.
- Tasks are low-risk and easy to verify.
- Latency and cost matter more than maximum reasoning depth.

Consider Claude Sonnet when:

- You need balanced coding, testing, review, or synthesis.
- The context is large.
- You want a strong default outside the Codex model set.

Consider Claude Opus when:

- The task is high-risk or hard to verify.
- The task involves long-horizon coding, architecture, complex reasoning, or autonomous agent work.
- Spending more for reliability is justified.

Consider Claude Fable or OpenAI Pro models only when:

- The task is unusually hard.
- Failure is expensive.
- A cheaper strong model already failed or produced uncertain results.

## Practical Router Policy

If the provider is fixed to Codex/OpenAI:

```text
small_fast = gpt-5.6-luna
standard = gpt-5.6-terra
strong = gpt-5.6-sol
ultra_strong = gpt-5.5-pro only by explicit escalation
```

If Claude is available:

```text
small_fast = claude-haiku-4-5
standard = claude-sonnet-4-6
strong = claude-opus-4-8
ultra_strong = claude-fable-5 only by explicit escalation
```

If multiple providers are available, use a provider adapter:

```text
task assessment
-> choose capability tier
-> filter providers by availability, privacy, context, and tool support
-> estimate cost
-> choose cheapest adequate model
-> record outcome for future calibration
```

## Sources

- OpenAI API pricing: `https://developers.openai.com/api/docs/pricing`
- OpenAI GPT-5.5 guide: `https://developers.openai.com/api/docs/guides/latest-model`
- OpenAI GPT-5.4 release and benchmarks: `https://openai.com/index/introducing-gpt-5-4/`
- Claude model overview: `https://platform.claude.com/docs/en/about-claude/models/overview`
- Claude pricing: `https://platform.claude.com/docs/en/about-claude/pricing`
- Claude Sonnet 4.5 announcement: `https://www.anthropic.com/news/claude-sonnet-4-5`
