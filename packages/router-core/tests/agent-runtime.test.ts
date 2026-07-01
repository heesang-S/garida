import { describe, expect, it } from "vitest"

import { prepareAgentExecution } from "../src/agent-runtime.js"

describe("prepareAgentExecution", () => {
  it("validates, routes, and creates a plan for an agent runtime", async () => {
    const result = await prepareAgentExecution(
      {
        task_type: "testing",
        complexity: "medium",
        risk: "medium",
        context_size: "medium",
        tool_need: "light",
        parallelizable: false,
        requires_subagents: false,
        confidence: 0.9,
        reasoning: "Testing task that needs normal engineering judgment."
      },
      {
        preferred_provider: "anthropic_claude"
      }
    )

    expect(result.assessment.task_type).toBe("testing")
    expect(result.route.model_id).toBe("claude-sonnet-4-6")
    expect(result.execution_plan.execution_mode).toBe("direct")
    expect(result.execution_plan.worker_briefs[0]?.model_id).toBe("claude-sonnet-4-6")
  })
})
