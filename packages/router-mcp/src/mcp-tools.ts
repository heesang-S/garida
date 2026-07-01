import {
  prepareAgentExecution,
  routeTask,
  validateTaskAssessment,
  type PreparedAgentExecution
} from "@model-orchestration/router-core"
import type {
  ModelProvider,
  RouteDecision,
  RouteOptions
} from "@model-orchestration/shared-types"

type RouteTaskToolInput = {
  readonly assessment: unknown
  readonly preferred_provider?: ModelProvider | undefined
}

type PrepareExecutionToolInput = {
  readonly assessment: unknown
  readonly preferred_provider?: ModelProvider | undefined
}

export async function routeTaskTool(input: RouteTaskToolInput): Promise<RouteDecision> {
  const assessment = await validateTaskAssessment(input.assessment)
  return routeTask(assessment, toolOptions(input.preferred_provider))
}

export async function prepareExecutionTool(
  input: PrepareExecutionToolInput
): Promise<PreparedAgentExecution> {
  return prepareAgentExecution(input.assessment, toolOptions(input.preferred_provider))
}

function toolOptions(preferredProvider: ModelProvider | undefined): RouteOptions {
  if (preferredProvider === undefined) {
    return {}
  }

  return { preferred_provider: preferredProvider }
}
