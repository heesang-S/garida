# Public model-router repository comparison

This is a zero-token capability comparison. It uses repository documentation
and source metadata, not live model calls, so it does not claim that one router
produces better answers on the same task set.

The expanded requirement-focused matrix is in
[`public-repo-capability-matrix.md`](./public-repo-capability-matrix.md).

## Comparison

| Project | Primary scope | Routing approach | Evaluation evidence | Integration profile | License / maturity signal |
| --- | --- | --- | --- | --- | --- |
| Garida | Policy-first agent routing | Deterministic rules over a structured task assessment and model catalog | Internal route-only smoke exists; quality benchmark not yet published | TypeScript library, MCP adapter, experimental HTTP adapter; explainable route reasons | MIT; early alpha |
| [RouteLLM](https://github.com/lm-sys/RouteLLM) | Learned strong/weak model routing | Trained MF, ranking, BERT, and LLM-based routers with calibrated cost thresholds | Ships evaluation commands for MMLU, GSM8K, and MT-Bench; repository reports up to 85% cost reduction while retaining 95% of GPT-4 performance on stated benchmarks | Python SDK and OpenAI-compatible server | Apache-2.0; research/serving framework |
| [LLMRouter](https://github.com/ulab-uiuc/LLMRouter) | Research and extensible router library | 16+ trained/inference strategies across single-round, multi-round, multimodal, agentic, and personalized routing | 11 datasets plus training, inference, and evaluation pipelines | Python CLI, datasets, training workflow, UI and server integrations | MIT; broad research framework |
| [LiteLLM](https://github.com/BerriAI/litellm) | Provider gateway and LLM operations | Provider/model selection, fallbacks, load balancing, spend tracking, and gateway policies | Operational/gateway benchmarks and production features; not a directly equivalent learned-router benchmark | Python SDK and centralized gateway for 100+ providers | Large, mature gateway project; license terms should be reviewed for the exact deployment/use case |

## What this means for Garida

- **Routing research maturity:** Garida is behind RouteLLM and LLMRouter because
  it has no trained router or published quality/cost benchmark yet.
- **Policy transparency:** Garida has a clear niche: callers can inspect the
  matched rules, reason, fallback, model metadata, delegation, and reviewer
  decisions without an opaque classifier.
- **Agent-host integration:** Garida's TypeScript/MCP surface is a useful
  differentiator for agent hosts, while RouteLLM emphasizes OpenAI-compatible
  serving and LLMRouter emphasizes research extensibility.
- **Gateway breadth:** Garida is not trying to replace LiteLLM's provider,
  spend, and gateway operations in the alpha.

## Current competitive position

Garida is not currently competitive as a proven best-in-class model-quality
router. It is potentially competitive as a small, MIT-licensed, explainable
policy/control layer for TypeScript agent workflows and MCP hosts.

The next evidence step is a live, same-task comparison only after quota resets;
this document is the inexpensive repo-level comparison requested before that
work.
