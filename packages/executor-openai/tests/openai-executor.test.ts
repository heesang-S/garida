import { describe, expect, it } from "vitest"

import { createOpenAIExecutor } from "../src/index.js"
import type { ProviderRequest, ProviderTransport } from "../src/index.js"
import type { ExecutorRunContext } from "@model-orchestration/executor-core"
import type { RouteDecision, WorkerBrief } from "@model-orchestration/shared-types"

const route: RouteDecision = {
  model_class: "strong",
  provider: "openai_codex",
  model_id: "gpt-5.5",
  pricing_usd_per_1m_tokens: {
    input: 3,
    cached_input: 0.3,
    output: 15
  },
  delegate: false,
  add_reviewer: false,
  matched_rules: ["strong"],
  routing_reason: "Needs OpenAI execution.",
  fallback: "Use current model."
}

const brief: WorkerBrief = {
  id: "worker-1",
  title: "Write implementation",
  objective: "Return output from OpenAI.",
  model_class: "strong",
  provider: "openai_codex",
  model_id: "gpt-5.5",
  constraints: ["Stay concise."],
  expected_output: "Implementation summary.",
  acceptance_criteria: ["Uses routed model."]
}

const context: ExecutorRunContext = {
  route
}

describe("createOpenAIExecutor", () => {
  it("sends a Responses API request with the routed model", async () => {
    const requests: ProviderRequest[] = []
    const transport: ProviderTransport = {
      async send(request: ProviderRequest) {
        requests.push(request)
        return {
          status: 200,
          body: {
            output_text: "openai worker output",
            usage: {
              input_tokens: 1_000,
              input_tokens_details: {
                cached_tokens: 2_000
              },
              output_tokens: 500,
              total_tokens: 3_500
            }
          }
        }
      }
    }
    const executor = createOpenAIExecutor({
      api_key: "test-key",
      transport
    })

    const result = await executor.executeWorker(brief, context)

    expect(result.status).toBe("succeeded")
    expect(result.output).toBe("openai worker output")
    expect(result.usage).toEqual({
      input_tokens: 1_000,
      cached_input_tokens: 2_000,
      output_tokens: 500,
      total_tokens: 3_500
    })
    expect(result.cost).toEqual({
      input_usd: 0.003,
      cached_input_usd: 0.0006,
      output_usd: 0.0075,
      total_usd: 0.0111
    })
    expect(requests[0]?.url).toBe("https://api.openai.com/v1/responses")
    expect(requests[0]?.headers["authorization"]).toBe("Bearer test-key")
    expect(JSON.parse(requests[0]?.body ?? "{}")).toMatchObject({
      model: "gpt-5.5"
    })
  })

  it("maps API errors into failed worker results", async () => {
    const executor = createOpenAIExecutor({
      api_key: "test-key",
      transport: {
        async send() {
          return {
            status: 429,
            body: {
              error: {
                message: "rate limited"
              }
            }
          }
        }
      }
    })

    const result = await executor.executeWorker(brief, context)

    expect(result.status).toBe("failed")
    expect(result.error).toBe("rate limited")
  })
})
