import { describe, expect, it } from "vitest"
import { z } from "zod"

import { createHttpApp } from "../src/http-server.js"

const assessment = {
  task_type: "writing",
  complexity: "low",
  risk: "low",
  context_size: "small",
  tool_need: "none",
  parallelizable: false,
  requires_subagents: false,
  confidence: 0.95,
  reasoning: "Simple writing task."
}

const RouteResponseSchema = z.object({
  model_id: z.string()
})

const PlanResponseSchema = z.object({
  route: z.object({
    model_id: z.string()
  })
})

describe("HTTP routing app", () => {
  it("routes a task over HTTP", async () => {
    const app = createHttpApp()
    const response = await app.request("/route", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assessment, preferred_provider: "openai_codex" })
    })

    expect(response.status).toBe(200)
    const body = RouteResponseSchema.parse(await response.json())
    expect(body.model_id).toBe("gpt-5.6-luna")
  })

  it("prepares execution over HTTP", async () => {
    const app = createHttpApp()
    const response = await app.request("/plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assessment, preferred_provider: "anthropic_claude" })
    })

    expect(response.status).toBe(200)
    const body = PlanResponseSchema.parse(await response.json())
    expect(body.route.model_id).toBe("claude-haiku-4-5")
  })
})
