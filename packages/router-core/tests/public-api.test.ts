import { describe, expect, it } from "vitest"

import {
  createExecutionPlan,
  routeTask,
  validateTaskAssessment,
  type TaskAssessment
} from "../src/index.js"

describe("public library API", () => {
  it("validates, routes, and creates an execution plan from package exports", async () => {
    const rawAssessment = {
      task_type: "testing",
      complexity: "medium",
      risk: "medium",
      context_size: "medium",
      tool_need: "light",
      parallelizable: false,
      requires_subagents: false,
      confidence: 0.89,
      reasoning: "Testing task that needs normal engineering judgment."
    } satisfies TaskAssessment

    const assessment = await validateTaskAssessment(rawAssessment)
    const route = await routeTask(assessment, { preferred_provider: "anthropic_claude" })
    const plan = createExecutionPlan(assessment, route)

    expect(route.model_id).toBe("claude-sonnet-4-6")
    expect(plan.worker_briefs[0]?.provider).toBe("anthropic_claude")
  })
})
