import { describe, expect, it } from "vitest"

import { createMockExecutor } from "../src/index.js"
import type { ExecutorRunContext } from "@model-orchestration/executor-core"
import type { RouteDecision, WorkerBrief } from "@garida/types"

const route: RouteDecision = {
  model_class: "strong",
  provider: "anthropic_claude",
  model_id: "claude-opus-4-8",
  pricing_usd_per_1m_tokens: {
    input: 15,
    cached_input: 1.5,
    output: 75
  },
  delegate: true,
  add_reviewer: true,
  matched_rules: ["high-complexity"],
  routing_reason: "Complex task.",
  fallback: "Use strong model."
}

const brief: WorkerBrief = {
  id: "worker-1",
  title: "Analyze task",
  objective: "Produce deterministic output.",
  model_class: "strong",
  provider: "anthropic_claude",
  model_id: "claude-opus-4-8",
  constraints: ["Stay deterministic."],
  expected_output: "Analysis.",
  acceptance_criteria: ["Includes model id."]
}

const context: ExecutorRunContext = {
  route
}

describe("createMockExecutor", () => {
  it("returns deterministic worker and review results from briefs", async () => {
    const executor = createMockExecutor()

    const workerResult = await executor.executeWorker(brief, context)
    const reviewResult = await executor.executeReview?.({ ...brief, id: "reviewer-1" }, context)

    expect(workerResult.status).toBe("succeeded")
    expect(workerResult.output).toContain("claude-opus-4-8")
    expect(workerResult.evidence).toContain("mock-executor")
    expect(reviewResult?.status).toBe("passed")
    expect(reviewResult?.findings).toEqual([])
  })

  it("can simulate a worker failure", async () => {
    const executor = createMockExecutor({
      worker_status: "failed",
      worker_error: "simulated failure"
    })

    const workerResult = await executor.executeWorker(brief, context)

    expect(workerResult.status).toBe("failed")
    expect(workerResult.error).toBe("simulated failure")
  })
})
