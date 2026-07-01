import { describe, expect, it } from "vitest"

import { createExecutionPlan } from "../src/execution-plan.js"
import type { RouteDecision, TaskAssessment } from "@model-orchestration/shared-types"

const baseAssessment: TaskAssessment = {
  task_type: "planning",
  complexity: "high",
  risk: "medium",
  context_size: "large",
  tool_need: "light",
  parallelizable: true,
  requires_subagents: true,
  confidence: 0.91,
  reasoning: "Large planning task with independent parts.",
  suggested_subtasks: [
    {
      title: "Research alternatives",
      objective: "Compare possible routing architectures.",
      independent: true
    },
    {
      title: "Draft implementation plan",
      objective: "Turn the chosen architecture into implementation steps.",
      independent: true
    }
  ]
}

const baseRoute: RouteDecision = {
  model_class: "strong",
  provider: "anthropic_claude",
  model_id: "claude-opus-4-8",
  pricing_usd_per_1m_tokens: {
    input: 5,
    cached_input: 0.5,
    output: 25
  },
  delegate: true,
  add_reviewer: true,
  matched_rules: ["complex_parallel_work_delegates", "delegated_work_adds_reviewer"],
  routing_reason: "Complex parallel work benefits from sub-agents.",
  fallback: "Escalate if verification fails."
}

describe("createExecutionPlan", () => {
  it("creates worker briefs from suggested subtasks when delegation is enabled", () => {
    const plan = createExecutionPlan(baseAssessment, baseRoute)

    expect(plan.execution_mode).toBe("delegated")
    expect(plan.worker_briefs).toHaveLength(2)
    expect(plan.worker_briefs[0]?.title).toBe("Research alternatives")
    expect(plan.worker_briefs[0]?.model_id).toBe("claude-opus-4-8")
    expect(plan.reviewer_brief?.title).toBe("Review delegated result")
  })

  it("creates a direct worker plan when delegation is disabled", () => {
    const directAssessment: TaskAssessment = {
      task_type: "planning",
      complexity: "high",
      risk: "medium",
      context_size: "large",
      tool_need: "light",
      parallelizable: true,
      requires_subagents: true,
      confidence: 0.91,
      reasoning: "Large planning task without explicit subtasks."
    }

    const plan = createExecutionPlan(
      directAssessment,
      { ...baseRoute, delegate: false, add_reviewer: false }
    )

    expect(plan.execution_mode).toBe("direct")
    expect(plan.worker_briefs).toHaveLength(1)
    expect(plan.worker_briefs[0]?.title).toBe("Complete planning task")
    expect(plan.reviewer_brief).toBeUndefined()
  })
})
