import { describe, expect, it } from "vitest"

import { matchesConditions } from "../src/rule-evaluator.js"
import type { TaskAssessment } from "@model-orchestration/shared-types"

const assessment: TaskAssessment = {
  task_type: "debugging",
  complexity: "medium",
  risk: "medium",
  context_size: "medium",
  tool_need: "heavy",
  parallelizable: false,
  requires_subagents: false,
  confidence: 0.55,
  reasoning: "Debugging task."
}

describe("matchesConditions", () => {
  it("matches enum inclusion conditions", () => {
    expect(matchesConditions({ task_type: ["debugging"] }, assessment, {})).toBe(true)
  })

  it("matches negative enum conditions", () => {
    expect(matchesConditions({ context_size_not: ["large"] }, assessment, {})).toBe(true)
  })

  it("matches boolean conditions", () => {
    expect(matchesConditions({ parallelizable: false }, assessment, {})).toBe(true)
  })

  it("matches confidence threshold conditions", () => {
    expect(matchesConditions({ confidence_below: 0.6 }, assessment, {})).toBe(true)
  })

  it("matches route-state conditions", () => {
    expect(matchesConditions({ delegate: true }, assessment, { delegate: true })).toBe(true)
  })
})
