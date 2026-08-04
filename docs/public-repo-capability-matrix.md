# Public router capability matrix

Date: 2026-08-02

This is a zero-token documentation/source comparison. It does not claim that
one project produces better answers on the same prompts.

## Matrix

| Project | Primary shape | Routing unit | In-process model switching | MCP | Devin | TypeScript/Node fit | Evidence/maturity |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Garida** | Embeddable policy/control layer | Structured task assessment → route/execution plan | **Yes, in its own orchestrator** | Core adapter exists | Adapter/docs exist, but no working Devin-brain model switch | **Native** | Early alpha; route-only and tiny Codex smoke only |
| [unhardcoded](https://www.unhardcoded.com/) | Policy engine + workflow host | Policy per call; workflow per pipeline | **Yes, inside its workflow host** | Not documented on project page | No documented Devin integration found | Not scored; verify implementation language before adoption | MIT; explicit/deterministic/portable positioning |
| [Routerly](https://github.com/Inebrio/Routerly) | Self-hosted gateway | Request-level policy/scoring | No; selection occurs in the gateway | No documented MCP surface found | No documented Devin integration found | **Native TypeScript/Node.js** | AGPL-3.0; dashboard, budgets, cost tracking, multi-provider gateway |
| [llm-router](https://github.com/ypollak2/llm-router) | Local CLI + MCP router | Host hook/MCP request; pipeline templates | **Yes, in `llm_orchestrate` pipelines** | **Yes** | No dedicated Devin host listed | CLI/MCP integration rather than an embeddable TS SDK | Broad provider/host support; claims savings but methodology is project-specific |
| [agentgateway](https://github.com/agentgateway/agentgateway) | Production proxy/gateway | Proxy, virtual model, policy, or inference-pool route | No; selection is at the gateway/proxy layer | **Yes** | **Yes for Devin Desktop via proxy** | Client-agnostic; core is Rust/Go | Apache-2.0; security, governance, observability, MCP/A2A |
| [RouteLLM](https://github.com/lm-sys/RouteLLM) | Learned router + OpenAI-compatible server | Strong/weak model request | No; server routes each request | No native MCP focus | No documented Devin integration | Python-oriented | Apache-2.0; published benchmark/evaluation framework |
| [LLMRouter](https://github.com/ulab-uiuc/LLMRouter) | Research/router framework + API server | Learned, agentic, multimodal, or personalized request | Mostly router/server-level, not a JS orchestrator | No direct Devin integration found | No documented Devin integration found | Python-oriented | MIT; 16+ strategies, 11 datasets, training/evaluation pipeline |

## Requirement-specific findings

### “Change the model inside the orchestrator”

The closest matches are Garida, unhardcoded, and llm-router. Gateways such as
Routerly and agentgateway can change the upstream model, but the application
orchestrator remains unaware of the decision. That is a different integration
contract.

### “Works with Devin”

Agentgateway has the clearest documented Devin Desktop path: Devin Desktop is
configured to send requests through the gateway. This is proxy routing, not a
supported way to replace Devin Cloud’s internal brain model. Devin’s own docs
describe MCP as an external tool/data integration surface, not an underlying
model-selection API.

### “Easy to use”

Routerly is the simplest drop-in gateway: change the base URL and configure
models. llm-router is the simplest host/MCP tool for users who want hooks and
pipelines. Garida is simpler as an embedded library than as an operational
gateway, but it currently requires the caller to own the orchestration loop.

## Competitive interpretation

Garida is not the broadest or most mature router. Its defensible comparison
point is narrower:

> a small MIT-licensed TypeScript policy compiler/control layer that returns a
> deterministic, explainable execution plan for an application-owned
> orchestrator.

That position is still adjacent to unhardcoded and llm-router. The next proof
would need an identical task suite and provider set, plus integration effort,
latency, and cost measurements. Documentation claims from the public projects
are not an apples-to-apples benchmark.

## Sources

- [unhardcoded project](https://www.unhardcoded.com/)
- [Routerly repository](https://github.com/Inebrio/Routerly)
- [llm-router repository](https://github.com/ypollak2/llm-router)
- [agentgateway repository](https://github.com/agentgateway/agentgateway)
- [RouteLLM repository](https://github.com/lm-sys/RouteLLM)
- [LLMRouter repository](https://github.com/ulab-uiuc/LLMRouter)
- [Devin MCP documentation](https://docs.devin.ai/work-with-devin/mcp)
- [Devin enterprise deployment limitations](https://docs.devin.ai/enterprise/deployment/overview)
