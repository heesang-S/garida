import { request as httpsRequest } from "node:https"
import { z } from "zod"
import { estimateTokenCost } from "@model-orchestration/executor-core"
import type { AgentExecutor, ExecutorRunContext, ReviewResult, TokenUsage, WorkerResult } from "@model-orchestration/executor-core"
import type { WorkerBrief } from "@model-orchestration/shared-types"

export type ProviderRequest = {
  readonly url: string
  readonly method: "POST"
  readonly headers: Record<string, string>
  readonly body: string
}

export type ProviderResponse = {
  readonly status: number
  readonly body: unknown
}

export type ProviderTransport = {
  send(request: ProviderRequest, context: ExecutorRunContext): Promise<ProviderResponse>
}

export type AnthropicExecutorOptions = {
  readonly api_key?: string
  readonly base_url?: string
  readonly anthropic_version?: string
  readonly max_tokens?: number
  readonly transport?: ProviderTransport
}

const AnthropicResponseSchema = z
  .object({
    content: z.array(
      z.object({
        type: z.string(),
        text: z.string().optional()
      })
    )
  })
  .passthrough()

const AnthropicUsageSchema = z
  .object({
    usage: z.object({
      input_tokens: z.number().int().nonnegative(),
      cache_read_input_tokens: z.number().int().nonnegative().optional(),
      output_tokens: z.number().int().nonnegative()
    })
  })
  .passthrough()

const ProviderErrorSchema = z
  .object({
    error: z
      .object({
        message: z.string()
      })
      .optional()
  })
  .passthrough()

export function createAnthropicExecutor(options: AnthropicExecutorOptions = {}): AgentExecutor {
  return {
    provider: "anthropic",
    async executeWorker(brief: WorkerBrief, context: ExecutorRunContext): Promise<WorkerResult> {
      const response = await sendAnthropicRequest(brief, context, options)
      return responseToWorkerResult(brief, response, context)
    },
    async executeReview(brief: WorkerBrief, context: ExecutorRunContext): Promise<ReviewResult> {
      const response = await sendAnthropicRequest(brief, context, options)
      const output = response.status >= 200 && response.status < 300 ? extractOutput(response.body) : extractError(response.body)

      return {
        reviewer_id: brief.id,
        status: response.status >= 200 && response.status < 300 ? "passed" : "failed",
        output,
        findings: response.status >= 200 && response.status < 300 ? [] : [output]
      }
    }
  }
}

async function sendAnthropicRequest(
  brief: WorkerBrief,
  context: ExecutorRunContext,
  options: AnthropicExecutorOptions
): Promise<ProviderResponse> {
  const apiKey = options.api_key ?? process.env["ANTHROPIC_API_KEY"]
  if (apiKey === undefined || apiKey === "") {
    return {
      status: 401,
      body: {
        error: {
          message: "Missing ANTHROPIC_API_KEY."
        }
      }
    }
  }

  const transport = options.transport ?? createHttpsJsonTransport()
  return transport.send(buildAnthropicRequest(brief, context, options, apiKey), context)
}

function buildAnthropicRequest(
  brief: WorkerBrief,
  context: ExecutorRunContext,
  options: AnthropicExecutorOptions,
  apiKey: string
): ProviderRequest {
  const baseUrl = options.base_url ?? "https://api.anthropic.com/v1"

  return {
    url: `${baseUrl}/messages`,
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": options.anthropic_version ?? "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: context.route.model_id,
      max_tokens: options.max_tokens ?? 4096,
      messages: [
        {
          role: "user",
          content: buildPrompt(brief)
        }
      ]
    })
  }
}

function responseToWorkerResult(brief: WorkerBrief, response: ProviderResponse, context: ExecutorRunContext): WorkerResult {
  if (response.status >= 200 && response.status < 300) {
    const usage = extractUsage(response.body)
    const result: WorkerResult = {
      worker_id: brief.id,
      status: "succeeded",
      output: extractOutput(response.body),
      evidence: ["anthropic-executor-api"]
    }
    if (usage === undefined) {
      return result
    }

    return {
      ...result,
      usage,
      cost: estimateTokenCost(usage, context.route.pricing_usd_per_1m_tokens)
    }
  }

  const error = extractError(response.body)
  return {
    worker_id: brief.id,
    status: "failed",
    output: error,
    evidence: ["anthropic-executor-api"],
    error
  }
}

function extractUsage(body: unknown): TokenUsage | undefined {
  const parsed = AnthropicUsageSchema.safeParse(body)
  if (!parsed.success) {
    return undefined
  }

  const cachedInputTokens = parsed.data.usage.cache_read_input_tokens ?? 0

  return {
    input_tokens: parsed.data.usage.input_tokens,
    cached_input_tokens: cachedInputTokens,
    output_tokens: parsed.data.usage.output_tokens,
    total_tokens: parsed.data.usage.input_tokens + cachedInputTokens + parsed.data.usage.output_tokens
  }
}

function extractOutput(body: unknown): string {
  const parsed = AnthropicResponseSchema.safeParse(body)
  if (!parsed.success) {
    return "Anthropic response did not match expected output shape."
  }

  return parsed.data.content.flatMap((content) => content.text ?? []).join("\n")
}

function extractError(body: unknown): string {
  const parsed = ProviderErrorSchema.safeParse(body)
  return parsed.success ? (parsed.data.error?.message ?? "Anthropic request failed.") : "Anthropic request failed."
}

function buildPrompt(brief: WorkerBrief): string {
  return [
    `Title: ${brief.title}`,
    `Objective: ${brief.objective}`,
    `Expected output: ${brief.expected_output}`,
    "Constraints:",
    ...brief.constraints.map((constraint) => `- ${constraint}`),
    "Acceptance criteria:",
    ...brief.acceptance_criteria.map((criterion) => `- ${criterion}`)
  ].join("\n")
}

function createHttpsJsonTransport(): ProviderTransport {
  return {
    async send(providerRequest: ProviderRequest): Promise<ProviderResponse> {
      return sendHttpsJson(providerRequest)
    }
  }
}

async function sendHttpsJson(providerRequest: ProviderRequest): Promise<ProviderResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(providerRequest.url)
    const req = httpsRequest(
      url,
      {
        method: providerRequest.method,
        headers: providerRequest.headers
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on("data", (chunk: Buffer) => chunks.push(chunk))
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            body: parseJsonBody(Buffer.concat(chunks).toString("utf8"))
          })
        })
      }
    )
    req.on("error", reject)
    req.write(providerRequest.body)
    req.end()
  })
}

function parseJsonBody(body: string): unknown {
  try {
    return JSON.parse(body)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return body
    }

    throw error
  }
}
