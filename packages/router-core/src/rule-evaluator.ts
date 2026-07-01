import type { RouteState, RuleCondition, TaskAssessment } from "@model-orchestration/shared-types"

type AssessmentKey = keyof TaskAssessment
type StateKey = keyof RouteState

const ASSESSMENT_KEYS = [
  "task_type",
  "complexity",
  "risk",
  "context_size",
  "tool_need",
  "parallelizable",
  "requires_subagents",
  "confidence",
  "reasoning",
  "suggested_subtasks"
] as const satisfies readonly AssessmentKey[]

const STATE_KEYS = ["model_class", "delegate", "add_reviewer"] as const satisfies readonly StateKey[]

export function matchesConditions(
  conditions: RuleCondition,
  assessment: TaskAssessment,
  state: RouteState
): boolean {
  for (const [key, expected] of Object.entries(conditions)) {
    if (!matchesCondition(key, expected, assessment, state)) {
      return false
    }
  }

  return true
}

function matchesCondition(
  key: string,
  expected: readonly string[] | boolean | number,
  assessment: TaskAssessment,
  state: RouteState
): boolean {
  if (key === "always") {
    return expected === true
  }

  if (key === "confidence_below") {
    return typeof expected === "number" && assessment.confidence < expected
  }

  if (key.endsWith("_not")) {
    const baseKey = key.slice(0, -4)
    const actual = readValue(baseKey, assessment, state)
    return Array.isArray(expected) && typeof actual === "string" && !expected.includes(actual)
  }

  const actual = readValue(key, assessment, state)

  if (Array.isArray(expected)) {
    return typeof actual === "string" && expected.includes(actual)
  }

  if (typeof expected === "boolean") {
    return actual === expected
  }

  return actual === expected
}

function readValue(
  key: string,
  assessment: TaskAssessment,
  state: RouteState
): string | number | boolean | readonly unknown[] | undefined {
  if (isAssessmentKey(key)) {
    return assessment[key]
  }

  if (isStateKey(key)) {
    return state[key]
  }

  return undefined
}

function isAssessmentKey(key: string): key is AssessmentKey {
  return ASSESSMENT_KEYS.some((candidate) => candidate === key)
}

function isStateKey(key: string): key is StateKey {
  return STATE_KEYS.some((candidate) => candidate === key)
}
