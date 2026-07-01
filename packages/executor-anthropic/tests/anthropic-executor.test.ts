import { describe, expect, it } from "vitest"

import { classifyAnthropicResponseStatus, createAnthropicExecutor } from "../src/index.js"
import type { ProviderRequest, ProviderTransport } from "../src/index.js"
import type { ExecutorRunContext } from "@model-orchestration/executor-core"
import type { RouteDecision, WorkerBrief } from "@model-orchestration/shared-types"

const route: RouteDecision = {
  model_class: "strong",
  provider: "anthropic_claude",
  model_id: "claude-opus-4-8",
  pricing_usd_per_1m_tokens: {
    input: 5,
    cached_input: 0.5,
    output: 25
  },
  delegate: false,
  add_reviewer: false,
  matched_rules: ["strong"],
  routing_reason: "Needs Claude execution.",
  fallback: "Use current model."
}

const brief: WorkerBrief = {
  id: "worker-1",
  title: "Review plan",
  objective: "Return output from Claude.",
  model_class: "strong",
  provider: "anthropic_claude",
  model_id: "claude-opus-4-8",
  constraints: ["Stay precise."],
  expected_output: "Review summary.",
  acceptance_criteria: ["Uses routed model."]
}

const context: ExecutorRunContext = {
  route
}

describe("createAnthropicExecutor", () => {
  it("classifies Anthropic retryable and fatal response statuses", () => {
    expect(classifyAnthropicResponseStatus(429)).toBe("retryable")
    expect(classifyAnthropicResponseStatus(529)).toBe("retryable")
    expect(classifyAnthropicResponseStatus(401)).toBe("fatal")
    expect(classifyAnthropicResponseStatus(400)).toBe("fatal")
  })

  it("sends a Messages API request with the routed model", async () => {
    const requests: ProviderRequest[] = []
    const transport: ProviderTransport = {
      async send(request: ProviderRequest) {
        requests.push(request)
        return {
          status: 200,
          body: {
            content: [
              {
                type: "text",
                text: "anthropic worker output"
              }
            ],
            usage: {
              input_tokens: 1_000,
              cache_read_input_tokens: 2_000,
              output_tokens: 500
            }
          }
        }
      }
    }
    const executor = createAnthropicExecutor({
      api_key: "test-key",
      transport
    })

    const result = await executor.executeWorker(brief, context)

    expect(result.status).toBe("succeeded")
    expect(result.output).toBe("anthropic worker output")
    expect(result.usage).toEqual({
      input_tokens: 1_000,
      cached_input_tokens: 2_000,
      output_tokens: 500,
      total_tokens: 3_500
    })
    expect(result.cost).toEqual({
      input_usd: 0.005,
      cached_input_usd: 0.001,
      output_usd: 0.0125,
      total_usd: 0.0185
    })
    expect(requests[0]?.url).toBe("https://api.anthropic.com/v1/messages")
    expect(requests[0]?.headers["x-api-key"]).toBe("test-key")
    expect(JSON.parse(requests[0]?.body ?? "{}")).toMatchObject({
      model: "claude-opus-4-8"
    })
  })

  it("maps API errors into failed worker results", async () => {
    const executor = createAnthropicExecutor({
      api_key: "test-key",
      transport: {
        async send() {
          return {
            status: 400,
            body: {
              error: {
                message: "bad request"
              }
            }
          }
        }
      }
    })

    const result = await executor.executeWorker(brief, context)

    expect(result.status).toBe("failed")
    expect(result.error).toBe("bad request")
  })
})
