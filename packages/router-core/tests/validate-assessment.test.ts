import { describe, expect, it } from "vitest"

import { validateTaskAssessment } from "../src/validate-assessment.js"

const baseAssessment = {
  task_type: "testing",
  complexity: "medium",
  risk: "low",
  context_size: "medium",
  tool_need: "heavy",
  parallelizable: false,
  requires_subagents: false,
  confidence: 0.9,
  reasoning: "The task centers on test design or execution."
}

describe("validateTaskAssessment", () => {
  it("accepts testing as a task type", async () => {
    const assessment = await validateTaskAssessment(baseAssessment)

    expect(assessment.task_type).toBe("testing")
  })

  it("rejects a missing required field", async () => {
    const { confidence: _confidence, ...missingConfidence } = baseAssessment

    await expect(validateTaskAssessment(missingConfidence)).rejects.toThrow("must have required property")
  })

  it("rejects an unknown task type", async () => {
    await expect(
      validateTaskAssessment({ ...baseAssessment, task_type: "deployment" })
    ).rejects.toThrow("must be equal to one of the allowed values")
  })

  it("rejects extra properties", async () => {
    await expect(
      validateTaskAssessment({ ...baseAssessment, model_class: "small_fast" })
    ).rejects.toThrow("must NOT have additional properties")
  })
})
