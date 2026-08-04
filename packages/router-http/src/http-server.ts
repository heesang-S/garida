import { pathToFileURL } from "node:url"

import { serve } from "@hono/node-server"
import { Hono } from "hono"
import type { Context } from "hono"
import { z } from "zod"

import {
  createRouter,
  TaskAssessmentValidationError,
  validateTaskAssessment,
  type ModelProvider,
  type RouteOptions,
  type Router
} from "@garida/core"

const HttpToolInputSchema = z
  .object({
    assessment: z.unknown(),
    preferred_provider: z.enum(["openai_codex", "anthropic_claude"]).optional()
  })
  .strict()

export type HttpAppOptions = {
  readonly router?: Router
  readonly max_body_bytes?: number
  readonly request_timeout_ms?: number
}

export type HttpServerOptions = HttpAppOptions & {
  readonly host?: string
  readonly port?: number
}

type HttpStatus = 400 | 408 | 413 | 415 | 422 | 500

type HttpErrorDetail = {
  readonly path: string
  readonly message: string
}

export class HttpRequestError extends Error {
  readonly status: HttpStatus
  readonly code: string
  readonly details: readonly HttpErrorDetail[] | undefined

  constructor(
    status: HttpStatus,
    code: string,
    message: string,
    details?: readonly HttpErrorDetail[]
  ) {
    super(message)
    this.name = "HttpRequestError"
    this.status = status
    this.code = code
    this.details = details
  }
}

const DEFAULT_MAX_BODY_BYTES = 64 * 1024
const DEFAULT_REQUEST_TIMEOUT_MS = 5_000

export function createHttpApp(options: HttpAppOptions = {}): Hono {
  const router = options.router ?? createRouter()
  const maxBodyBytes = normalizePositiveInteger(options.max_body_bytes, DEFAULT_MAX_BODY_BYTES)
  const requestTimeoutMs = normalizePositiveInteger(options.request_timeout_ms, DEFAULT_REQUEST_TIMEOUT_MS)
  const app = new Hono()

  const routeHandler = async (context: Context) => {
    const input = await readInput(context.req.raw, maxBodyBytes, requestTimeoutMs)
    const assessment = await validateTaskAssessment(input.assessment)
    return context.json(await withTimeout(
      router.routeTask(assessment, routeOptions(input.preferred_provider)),
      requestTimeoutMs
    ))
  }

  const planHandler = async (context: Context) => {
    const input = await readInput(context.req.raw, maxBodyBytes, requestTimeoutMs)
    return context.json(await withTimeout(
      router.prepareAgentExecution(input.assessment, routeOptions(input.preferred_provider)),
      requestTimeoutMs
    ))
  }

  app.get("/healthz", (context) => context.json({ status: "ok" }))
  app.post("/v1/route", routeHandler)
  app.post("/v1/plan", planHandler)

  // Keep the prototype paths available during the alpha transition.
  app.post("/route", routeHandler)
  app.post("/plan", planHandler)

  app.onError((error, context) => {
    const response = toHttpErrorResponse(error)
    return context.json(response.body, response.status)
  })

  return app
}

export function runHttpServer(options: HttpServerOptions = {}): void {
  const app = createHttpApp(options)
  const host = options.host ?? process.env["GARIDA_HTTP_HOST"] ?? "127.0.0.1"
  const port = options.port ?? parsePort(process.env["GARIDA_HTTP_PORT"], 8787)

  serve({
    fetch: app.fetch,
    hostname: host,
    port
  })
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runHttpServer()
}

async function readInput(
  request: Request,
  maxBodyBytes: number,
  timeoutMs: number
): Promise<{ readonly assessment: unknown; readonly preferred_provider?: ModelProvider }> {
  const contentType = request.headers.get("content-type") ?? ""
  if (contentType !== "" && !contentType.toLowerCase().includes("application/json")) {
    throw new HttpRequestError(415, "UNSUPPORTED_MEDIA_TYPE", "Request content type must be application/json.")
  }

  const contentLength = request.headers.get("content-length")
  if (contentLength !== null && Number.isFinite(Number(contentLength)) && Number(contentLength) > maxBodyBytes) {
    throw new HttpRequestError(413, "REQUEST_BODY_TOO_LARGE", "Request body exceeds the configured limit.")
  }

  const body = await withTimeout(readBodyText(request, maxBodyBytes), timeoutMs)
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    throw new HttpRequestError(400, "INVALID_JSON", "Request body must contain valid JSON.")
  }

  const result = HttpToolInputSchema.safeParse(parsed)
  if (!result.success) {
    throw new HttpRequestError(
      400,
      "INVALID_REQUEST",
      "Request must contain an assessment and an optional supported preferred_provider.",
      result.error.issues.map((issue) => ({
        path: `/${issue.path.join("/")}`,
        message: issue.message
      }))
    )
  }
  const preferredProvider = result.data.preferred_provider
  return preferredProvider === undefined
    ? { assessment: result.data.assessment }
    : { assessment: result.data.assessment, preferred_provider: preferredProvider }
}

async function readBodyText(request: Request, maxBodyBytes: number): Promise<string> {
  if (request.body === null) {
    return ""
  }

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      totalBytes += next.value.byteLength
      if (totalBytes > maxBodyBytes) {
        await reader.cancel()
        throw new HttpRequestError(413, "REQUEST_BODY_TOO_LARGE", "Request body exceeds the configured limit.")
      }
      chunks.push(next.value)
    }
  } finally {
    reader.releaseLock()
  }

  const bytes = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}

function routeOptions(preferredProvider: ModelProvider | undefined): RouteOptions {
  return preferredProvider === undefined ? {} : { preferred_provider: preferredProvider }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new HttpRequestError(408, "REQUEST_TIMEOUT", "Request exceeded the configured timeout."))
        }, timeoutMs)
      })
    ])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

function toHttpErrorResponse(error: unknown): {
  readonly status: HttpStatus
  readonly body: { readonly error: { readonly code: string; readonly message: string; readonly details?: readonly HttpErrorDetail[] } }
} {
  if (error instanceof HttpRequestError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details === undefined ? {} : { details: error.details })
        }
      }
    }
  }

  if (error instanceof TaskAssessmentValidationError) {
    return {
      status: 422,
      body: {
        error: {
          code: "INVALID_TASK_ASSESSMENT",
          message: "Assessment failed the published task-assessment schema.",
          details: error.errors.map((issue) => ({
            path: issue.instancePath || "/",
            message: issue.message ?? "invalid value"
          }))
        }
      }
    }
  }

  return {
    status: 500,
    body: {
      error: {
        code: "INTERNAL_ROUTING_ERROR",
        message: "The routing request could not be completed."
      }
    }
  }
}

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback
}

function parsePort(value: string | undefined, fallback: number): number {
  const parsed = value === undefined ? Number.NaN : Number(value)
  return Number.isInteger(parsed) && parsed > 0 && parsed < 65_536 ? parsed : fallback
}
