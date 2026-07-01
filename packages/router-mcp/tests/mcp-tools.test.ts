import { describe, expect, it } from "vitest"

import { prepareExecutionTool, routeTaskTool } from "../src/mcp-tools.js"

const taskAssessment = {
  task_type: "debugging",
  complexity: "medium",
  risk: "medium",
  context_size: "medium",
  tool_need: "heavy",
  parallelizable: false,
  requires_subagents: false,
  confidence: 0.88,
  reasoning: "Runtime debugging with tool use."
}

describe("MCP tool handlers", () => {
  it("routes a task assessment with a provider preference", async () => {
    const result = await routeTaskTool({
      assessment: taskAssessment,
      preferred_provider: "anthropic_claude"
    })

    expect(result.model_class).toBe("strong")
    expect(result.provider).toBe("anthropic_claude")
    expect(result.model_id).toBe("claude-opus-4-8")
  })

  it("prepares an execution plan for agent runtimes", async () => {
    const result = await prepareExecutionTool({
      assessment: taskAssessment,
      preferred_provider: "openai_codex"
    })

    expect(result.route.model_id).toBe("gpt-5.5")
    expect(result.execution_plan.worker_briefs[0]?.model_id).toBe("gpt-5.5")
  })
})
