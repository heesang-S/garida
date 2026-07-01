import { request as httpsRequest } from "node:https"
import { z } from "zod"
import type { AgentExecutor, ExecutorRunContext, ReviewResult, WorkerResult } from "@model-orchestration/executor-core"
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

export type OpenAIExecutorOptions = {
  readonly api_key?: string
  readonly base_url?: string
  readonly transport?: ProviderTransport
}

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
    async executeWorker(brief: WorkerBrief, context: ExecutorRunContext): Promise<WorkerResult> {
      const response = await sendOpenAIRequest(brief, context, options)
      return responseToWorkerResult(brief, response)
    },
    async executeReview(brief: WorkerBrief, context: ExecutorRunContext): Promise<ReviewResult> {
      const response = await sendOpenAIRequest(brief, context, options)
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

  const transport = options.transport ?? createHttpsJsonTransport()
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

function responseToWorkerResult(brief: WorkerBrief, response: ProviderResponse): WorkerResult {
  if (response.status >= 200 && response.status < 300) {
    return {
      worker_id: brief.id,
      status: "succeeded",
      output: extractOutput(response.body),
      evidence: ["openai-executor-api"]
    }
  }

  const error = extractError(response.body)
  return {
    worker_id: brief.id,
    status: "failed",
    output: error,
    evidence: ["openai-executor-api"],
    error
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
