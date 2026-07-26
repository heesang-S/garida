import { createRouter, type PreparedAgentExecution } from "./router.js"
import type { RouteOptions } from "@model-orchestration/shared-types"

export type { PreparedAgentExecution } from "./router.js"

const defaultRouter = createRouter()

export async function prepareAgentExecution(
  rawAssessment: unknown,
  options: RouteOptions = {}
): Promise<PreparedAgentExecution> {
  return defaultRouter.prepareAgentExecution(rawAssessment, options)
}
