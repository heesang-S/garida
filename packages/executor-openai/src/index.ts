import { request as httpRequest } from "node:http"
import { request as httpsRequest } from "node:https"
import { z } from "zod"
import { ExecutorOutputLimitError, estimateTokenCost } from "@model-orchestration/executor-core"
import type { AgentExecutor, ExecutorRunContext, ReviewResult, TokenUsage, WorkerResult } from "@model-orchestration/executor-core"
import type { WorkerBrief } from "@garida/types"

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

export type OpenAIExecutorOptions = {
  readonly api_key?: string
  readonly base_url?: string
  readonly transport?: ProviderTransport
  readonly max_response_bytes?: number
}

export type ProviderRetryClassification = "retryable" | "fatal"

const OpenAIResponseSchema = z
  .object({
    output_text: z.string().optional(),
    output: z
      .array(
        z.object({
          content: z
            .array(
              z.object({
                text: z.string().optional()
              })
            )
            .optional()
        })
      )
      .optional()
  })
  .passthrough()

const OpenAIUsageSchema = z
  .object({
    usage: z.object({
      input_tokens: z.number().int().nonnegative(),
      input_tokens_details: z
        .object({
          cached_tokens: z.number().int().nonnegative().optional()
        })
        .optional(),
      output_tokens: z.number().int().nonnegative(),
      total_tokens: z.number().int().nonnegative().optional()
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

export function createOpenAIExecutor(options: OpenAIExecutorOptions = {}): AgentExecutor {
  return {
    provider: "openai",
    supports_route(route): boolean {
      return route.provider === "openai_codex"
    },
    async executeWorker(brief: WorkerBrief, context: ExecutorRunContext): Promise<WorkerResult> {
      const response = await sendOpenAIRequest(brief, context, options)
      return responseToWorkerResult(brief, response, context)
    },
    async executeReview(brief: WorkerBrief, context: ExecutorRunContext): Promise<ReviewResult> {
      const response = await sendOpenAIRequest(brief, context, options)
      const output = response.status >= 200 && response.status < 300 ? extractOutput(response.body) : extractError(response.body)

      return {
        reviewer_id: brief.id,
        status: response.status >= 200 && response.status < 300 ? "passed" : "failed",
        output,
        findings: response.status >= 200 && response.status < 300 ? [] : [output],
        ...(response.status >= 200 && response.status < 300
          ? {}
          : { retry_classification: classifyOpenAIResponseStatus(response.status) })
      }
    }
  }
}

export function classifyOpenAIResponseStatus(status: number): ProviderRetryClassification {
  if (status === 408 || status === 409 || status === 429 || status >= 500) {
    return "retryable"
  }

  return "fatal"
}

async function sendOpenAIRequest(
  brief: WorkerBrief,
  context: ExecutorRunContext,
  options: OpenAIExecutorOptions
): Promise<ProviderResponse> {
  const apiKey = options.api_key ?? process.env["OPENAI_API_KEY"]
  if (apiKey === undefined || apiKey === "") {
    return {
      status: 401,
      body: {
        error: {
          message: "Missing OPENAI_API_KEY."
        }
      }
    }
  }

  const transport = options.transport ?? createJsonTransport(normalizeByteLimit(options.max_response_bytes))
  return transport.send(buildOpenAIRequest(brief, context, options, apiKey), context)
}

function buildOpenAIRequest(
  brief: WorkerBrief,
  context: ExecutorRunContext,
  options: OpenAIExecutorOptions,
  apiKey: string
): ProviderRequest {
  const baseUrl = options.base_url ?? "https://api.openai.com/v1"

  return {
    url: `${baseUrl}/responses`,
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: context.route.model_id,
      input: buildPrompt(brief)
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
      evidence: ["openai-executor-api"]
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
    evidence: ["openai-executor-api"],
    error,
    retry_classification: classifyOpenAIResponseStatus(response.status)
  }
}

function extractUsage(body: unknown): TokenUsage | undefined {
  const parsed = OpenAIUsageSchema.safeParse(body)
  if (!parsed.success) {
    return undefined
  }

  const cachedInputTokens = parsed.data.usage.input_tokens_details?.cached_tokens ?? 0
  const totalTokens =
    parsed.data.usage.total_tokens ??
    parsed.data.usage.input_tokens + cachedInputTokens + parsed.data.usage.output_tokens

  return {
    input_tokens: parsed.data.usage.input_tokens,
    cached_input_tokens: cachedInputTokens,
    output_tokens: parsed.data.usage.output_tokens,
    total_tokens: totalTokens
  }
}

function extractOutput(body: unknown): string {
  const parsed = OpenAIResponseSchema.safeParse(body)
  if (!parsed.success) {
    return "OpenAI response did not match expected output shape."
  }

  if (parsed.data.output_text !== undefined) {
    return parsed.data.output_text
  }

  return parsed.data.output?.flatMap((item) => item.content ?? []).flatMap((content) => content.text ?? []).join("\n") ?? ""
}

function extractError(body: unknown): string {
  const parsed = ProviderErrorSchema.safeParse(body)
  return parsed.success ? (parsed.data.error?.message ?? "OpenAI request failed.") : "OpenAI request failed."
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

function createJsonTransport(maxResponseBytes: number): ProviderTransport {
  return {
    async send(providerRequest: ProviderRequest, context: ExecutorRunContext): Promise<ProviderResponse> {
      return sendJson(providerRequest, context.signal, maxResponseBytes)
    }
  }
}

async function sendJson(
  providerRequest: ProviderRequest,
  signal: AbortSignal | undefined,
  maxResponseBytes: number
): Promise<ProviderResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(providerRequest.url)
    const request = url.protocol === "http:" ? httpRequest : httpsRequest
    let settled = false
    const rejectOnce = (error: Error): void => {
      if (settled) return
      settled = true
      reject(error)
    }
    const req = request(
      url,
      {
        method: providerRequest.method,
        headers: providerRequest.headers,
        ...(signal === undefined ? {} : { signal })
      },
      (res) => {
        const chunks: Buffer[] = []
        let receivedBytes = 0
        res.on("data", (value: Buffer | string) => {
          if (settled) return
          const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value)
          receivedBytes += chunk.byteLength
          if (receivedBytes > maxResponseBytes) {
            const error = new ExecutorOutputLimitError("openai-response", maxResponseBytes)
            res.destroy(error)
            req.destroy(error)
            rejectOnce(error)
            return
          }
          chunks.push(chunk)
        })
        res.on("error", rejectOnce)
        res.on("end", () => {
          if (settled) return
          settled = true
          resolve({
            status: res.statusCode ?? 0,
            body: parseJsonBody(Buffer.concat(chunks).toString("utf8"))
          })
        })
      }
    )
    req.on("error", rejectOnce)
    req.write(providerRequest.body)
    req.end()
  })
}

function normalizeByteLimit(value: number | undefined): number {
  return value !== undefined && Number.isFinite(value) && value > 0 ? Math.floor(value) : 1_048_576
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
