import { createExecutionPlan } from "./execution-plan.js"
import { routeTask } from "./router.js"
import type {
  ExecutionPlan,
  RouteDecision,
  RouteOptions,
  TaskAssessment
} from "@model-orchestration/shared-types"
import { validateTaskAssessment } from "./validate-assessment.js"

export type PreparedAgentExecution = {
  readonly assessment: TaskAssessment
  readonly route: RouteDecision
  readonly execution_plan: ExecutionPlan
}

export async function prepareAgentExecution(
  rawAssessment: unknown,
  options: RouteOptions = {}
): Promise<PreparedAgentExecution> {
  const assessment = await validateTaskAssessment(rawAssessment)
  const route = await routeTask(assessment, options)
  const executionPlan = createExecutionPlan(assessment, route)

  return {
    assessment,
    route,
    execution_plan: executionPlan
  }
}
