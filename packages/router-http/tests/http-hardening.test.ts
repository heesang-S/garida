import { describe, expect, it } from "vitest"

import { createRouter, type Router } from "@garida/core"

import { createHttpApp } from "../src/http-server.js"

const assessment = {
  task_type: "writing" as const,
  complexity: "low" as const,
  risk: "low" as const,
  context_size: "small" as const,
  tool_need: "none" as const,
  parallelizable: false,
  requires_subagents: false,
  confidence: 0.95,
  reasoning: "Simple writing task."
}

describe("experimental HTTP adapter", () => {
  it("exposes versioned route, plan, and health endpoints through the core router", async () => {
    const app = createHttpApp()

    const routeResponse = await app.request("/v1/route", jsonRequest({ assessment }))
    expect(routeResponse.status).toBe(200)
    expect((await routeResponse.json() as { model_id: string }).model_id).toBe("gpt-5.6-luna")

    const planResponse = await app.request("/v1/plan", jsonRequest({
      assessment,
      preferred_provider: "anthropic_claude"
    }))
    expect(planResponse.status).toBe(200)
    expect((await planResponse.json() as { route: { model_id: string } }).route.model_id).toBe("claude-haiku-4-5")

    const healthResponse = await app.request("/healthz")
    expect(healthResponse.status).toBe(200)
    expect(await healthResponse.json()).toEqual({ status: "ok" })
  })

  it("accepts an injected core router without importing MCP handlers", async () => {
    const defaultRouter = createRouter()
    const prepared = await defaultRouter.prepareAgentExecution(assessment)
    const calls: string[] = []
    const router: Router = {
      async routeTask() {
        calls.push("route")
        return prepared.route
      },
      async prepareAgentExecution() {
        calls.push("plan")
        return prepared
      }
    }

    const app = createHttpApp({ router })
    await app.request("/v1/route", jsonRequest({ assessment }))
    await app.request("/v1/plan", jsonRequest({ assessment }))

    expect(calls).toEqual(["route", "plan"])
  })

  it("returns redacted structured errors for malformed input", async () => {
    const app = createHttpApp()
    const response = await app.request("/v1/route", jsonRequest({ assessment: { task_type: "invalid" } }))

    expect(response.status).toBe(422)
    const body = await response.json() as { error: { code: string; message: string } }
    expect(body.error.code).toBe("INVALID_TASK_ASSESSMENT")
    expect(body.error.message).toBe("Assessment failed the published task-assessment schema.")
    expect(JSON.stringify(body)).not.toContain("Simple writing task")
  })

  it("rejects oversized bodies before routing", async () => {
    const app = createHttpApp({ max_body_bytes: 128 })
    const response = await app.request("/v1/route", jsonRequest({
      assessment: { ...assessment, reasoning: "x".repeat(1_000) }
    }))

    expect(response.status).toBe(413)
    expect((await response.json() as { error: { code: string } }).error.code).toBe("REQUEST_BODY_TOO_LARGE")
  })

  it("returns a timeout when an injected router exceeds the request limit", async () => {
    const defaultRouter = createRouter()
    const prepared = await defaultRouter.prepareAgentExecution(assessment)
    const slowRouter: Router = {
      async routeTask() {
        await new Promise((resolve) => setTimeout(resolve, 25))
        return prepared.route
      },
      async prepareAgentExecution() {
        return prepared
      }
    }

    const app = createHttpApp({ router: slowRouter, request_timeout_ms: 5 })
    const response = await app.request("/v1/route", jsonRequest({ assessment }))

    expect(response.status).toBe(408)
    expect((await response.json() as { error: { code: string } }).error.code).toBe("REQUEST_TIMEOUT")
  })
})

function jsonRequest(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  }
}
