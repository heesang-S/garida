import { createServer } from "node:http"
import type { Server } from "node:http"
import type { AddressInfo } from "node:net"
import { describe, expect, it } from "vitest"

import { classifyOpenAIResponseStatus, createOpenAIExecutor } from "../src/index.js"
import type { ProviderRequest, ProviderTransport } from "../src/index.js"
import { ExecutorOutputLimitError } from "@model-orchestration/executor-core"
import type { ExecutorRunContext } from "@model-orchestration/executor-core"
import type { RouteDecision, WorkerBrief } from "@garida/types"

const route: RouteDecision = {
  model_class: "strong",
  provider: "openai_codex",
  model_id: "gpt-5.6-sol",
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
  model_id: "gpt-5.6-sol",
  constraints: ["Stay concise."],
  expected_output: "Implementation summary.",
  acceptance_criteria: ["Uses routed model."]
}

const context: ExecutorRunContext = {
  route
}

describe("createOpenAIExecutor", () => {
  it("classifies OpenAI retryable and fatal response statuses", () => {
    expect(classifyOpenAIResponseStatus(429)).toBe("retryable")
    expect(classifyOpenAIResponseStatus(503)).toBe("retryable")
    expect(classifyOpenAIResponseStatus(401)).toBe("fatal")
    expect(classifyOpenAIResponseStatus(400)).toBe("fatal")
  })

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
      model: "gpt-5.6-sol"
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
    expect(result.retry_classification).toBe("retryable")
  })

  it("aborts the underlying HTTP request when its signal is cancelled", async () => {
    let requestStarted!: () => void
    let responseClosed!: () => void
    const started = new Promise<void>((resolve) => { requestStarted = resolve })
    const closed = new Promise<void>((resolve) => { responseClosed = resolve })
    const server = createServer((_request, response) => {
      requestStarted()
      response.on("close", responseClosed)
      response.writeHead(200, { "content-type": "application/json" })
      response.write('{"output_text":"waiting')
    })
    const baseUrl = await listen(server)
    const controller = new AbortController()
    const executor = createOpenAIExecutor({ api_key: "test-key", base_url: baseUrl })

    try {
      const execution = executor.executeWorker(brief, { route, signal: controller.signal })
      await started
      controller.abort()
      await expect(execution).rejects.toMatchObject({ name: "AbortError" })
      await closed
    } finally {
      await close(server)
    }
  })

  it("terminates response buffering at the configured byte limit", async () => {
    const server = createServer((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" })
      response.end(JSON.stringify({ output_text: "x".repeat(1_000) }))
    })
    const baseUrl = await listen(server)
    const executor = createOpenAIExecutor({
      api_key: "test-key",
      base_url: baseUrl,
      max_response_bytes: 64
    })

    try {
      await expect(executor.executeWorker(brief, context)).rejects.toBeInstanceOf(ExecutorOutputLimitError)
    } finally {
      await close(server)
    }
  })
})

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error): void => reject(error)
    server.once("error", onError)
    server.listen(0, "127.0.0.1", () => {
      server.off("error", onError)
      resolve()
    })
  })
  const address = server.address() as AddressInfo
  return `http://127.0.0.1:${address.port}/v1`
}

async function close(server: Server): Promise<void> {
  server.closeAllConnections()
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error === undefined ? resolve() : reject(error))
  })
}
