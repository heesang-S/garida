import { describe, expect, it } from "vitest"

import { createDevinExecutor } from "../src/index.js"
import type { ExecutorRunContext } from "@model-orchestration/executor-core"
import type { RouteDecision, WorkerBrief } from "@garida/types"

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
  routing_reason: "Needs external execution.",
  fallback: "Use current model."
}

const brief: WorkerBrief = {
  id: "worker-1",
  title: "Run Devin task",
  objective: "Try routed Devin execution.",
  model_class: "strong",
  provider: "anthropic_claude",
  model_id: "claude-opus-4-8",
  constraints: ["Do not claim execution without API support."],
  expected_output: "Unsupported result.",
  acceptance_criteria: ["Reports unsupported platform limitation."]
}

const context: ExecutorRunContext = {
  route
}

describe("createDevinExecutor", () => {
  it("returns a failed worker result that documents unsupported Devin execution", async () => {
    const executor = createDevinExecutor()

    const result = await executor.executeWorker(brief, context)

    expect(result.status).toBe("failed")
    expect(result.error).toContain("Devin runtime/model selection API is not configured")
    expect(result.evidence).toContain("devin-executor-unsupported")
  })
})
