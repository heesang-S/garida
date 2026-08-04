import type {
  ExecutionMode,
  ExecutionPlan,
  RouteDecision,
  SuggestedSubtask,
  TaskAssessment,
  WorkerBrief
} from "@garida/types"

export function createExecutionPlan(
  assessment: TaskAssessment,
  route: RouteDecision
): ExecutionPlan {
  const executionMode: ExecutionMode = route.delegate ? "delegated" : "direct"
  const workerBriefs =
    executionMode === "delegated"
      ? createDelegatedWorkerBriefs(assessment, route)
      : [createDirectWorkerBrief(assessment, route)]
  const reviewerBrief = route.add_reviewer
    ? createReviewerBrief(assessment, route, executionMode)
    : undefined

  if (reviewerBrief === undefined) {
    return {
      execution_mode: executionMode,
      worker_briefs: workerBriefs,
      synthesis_strategy: buildSynthesisStrategy(executionMode, false)
    }
  }

  return {
    execution_mode: executionMode,
    worker_briefs: workerBriefs,
    reviewer_brief: reviewerBrief,
    synthesis_strategy: buildSynthesisStrategy(executionMode, true)
  }
}

function createDelegatedWorkerBriefs(
  assessment: TaskAssessment,
  route: RouteDecision
): readonly WorkerBrief[] {
  const subtasks = assessment.suggested_subtasks ?? []

  if (subtasks.length === 0) {
    return [createDirectWorkerBrief(assessment, route)]
  }

  return subtasks.map((subtask, index) => createSubtaskWorkerBrief(subtask, index, route))
}

function createDirectWorkerBrief(assessment: TaskAssessment, route: RouteDecision): WorkerBrief {
  return {
    id: "worker-1",
    title: `Complete ${assessment.task_type} task`,
    objective: assessment.reasoning,
    model_class: route.model_class,
    provider: route.provider,
    model_id: route.model_id,
    constraints: buildWorkerConstraints(assessment),
    expected_output: "A complete result for the original user task.",
    acceptance_criteria: buildAcceptanceCriteria(assessment)
  }
}

function createSubtaskWorkerBrief(
  subtask: SuggestedSubtask,
  index: number,
  route: RouteDecision
): WorkerBrief {
  return {
    id: `worker-${index + 1}`,
    title: subtask.title,
    objective: subtask.objective,
    model_class: route.model_class,
    provider: route.provider,
    model_id: route.model_id,
    constraints: [
      "Stay within the assigned subtask.",
      "Return assumptions, evidence, and unresolved questions.",
      "Do not change shared state unless explicitly instructed."
    ],
    expected_output: "A concise subtask result ready for synthesis.",
    acceptance_criteria: [
      "The result directly addresses the subtask objective.",
      "The result names blockers or uncertainty.",
      "The result can be merged with other worker outputs."
    ]
  }
}

function createReviewerBrief(
  assessment: TaskAssessment,
  route: RouteDecision,
  executionMode: ExecutionMode
): WorkerBrief {
  return {
    id: "reviewer-1",
    title: executionMode === "delegated" ? "Review delegated result" : "Review direct result",
    objective: "Check the worker result against the task risk, constraints, and acceptance criteria.",
    model_class: route.model_class,
    provider: route.provider,
    model_id: route.model_id,
    constraints: [
      "Focus on correctness, risk, missing tests, and unsupported claims.",
      "Report concrete issues before summarizing.",
      "Do not rewrite the result unless a fix is required."
    ],
    expected_output: "A review finding list with pass/fail judgment.",
    acceptance_criteria: [
      `Review accounts for ${assessment.risk} task risk.`,
      "Review identifies contradictions between worker outputs.",
      "Review states whether the final answer is ready."
    ]
  }
}

function buildWorkerConstraints(assessment: TaskAssessment): readonly string[] {
  return [
    `Task type: ${assessment.task_type}.`,
    `Complexity: ${assessment.complexity}.`,
    `Risk: ${assessment.risk}.`,
    "Use tools only when they materially improve confidence.",
    "Escalate if requirements conflict or verification fails."
  ]
}

function buildAcceptanceCriteria(assessment: TaskAssessment): readonly string[] {
  return [
    "The result satisfies the original user request.",
    `The result is appropriate for ${assessment.risk} risk work.`,
    "The result includes enough evidence or reasoning to verify.",
    "The result names any remaining uncertainty."
  ]
}

function buildSynthesisStrategy(executionMode: ExecutionMode, hasReviewer: boolean): string {
  if (executionMode === "direct" && !hasReviewer) {
    return "Return the direct worker result after normal verification."
  }

  if (executionMode === "direct") {
    return "Return the worker result only after addressing reviewer findings."
  }

  if (hasReviewer) {
    return "Merge worker outputs, resolve conflicts, then address reviewer findings."
  }

  return "Merge worker outputs into one coherent final result and name unresolved conflicts."
}
