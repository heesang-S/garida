import {
  createRouter,
  validateTaskAssessment,
  type PreparedAgentExecution,
  type Router
} from "@garida/core"
import type {
  ModelProvider,
  RouteDecision,
  RouteOptions
} from "@garida/types"

type RouteTaskToolInput = {
  readonly assessment: unknown
  readonly preferred_provider?: unknown
}

type PrepareExecutionToolInput = {
  readonly assessment: unknown
  readonly preferred_provider?: unknown
}

export type RoutingToolHandlers = {
  readonly routeTask: (input: RouteTaskToolInput) => Promise<RouteDecision>
  readonly prepareExecution: (input: PrepareExecutionToolInput) => Promise<PreparedAgentExecution>
}

export class McpToolInputError extends Error {
  readonly code: "INVALID_PREFERRED_PROVIDER"
  readonly details: readonly { readonly path: string; readonly message: string }[]

  constructor(
    message: string,
    details: readonly { readonly path: string; readonly message: string }[]
  ) {
    super(message)
    this.name = "McpToolInputError"
    this.code = "INVALID_PREFERRED_PROVIDER"
    this.details = details
  }
}

export function createRoutingToolHandlers(router: Router = createRouter()): RoutingToolHandlers {
  return Object.freeze({
    async routeTask(input: RouteTaskToolInput): Promise<RouteDecision> {
      const assessment = await validateTaskAssessment(input.assessment)
      return router.routeTask(assessment, toolOptions(input.preferred_provider))
    },
    async prepareExecution(input: PrepareExecutionToolInput): Promise<PreparedAgentExecution> {
      return router.prepareAgentExecution(input.assessment, toolOptions(input.preferred_provider))
    }
  })
}

const defaultToolHandlers = createRoutingToolHandlers()

export async function routeTaskTool(input: RouteTaskToolInput): Promise<RouteDecision> {
  return defaultToolHandlers.routeTask(input)
}

export async function prepareExecutionTool(
  input: PrepareExecutionToolInput
): Promise<PreparedAgentExecution> {
  return defaultToolHandlers.prepareExecution(input)
}

function toolOptions(preferredProvider: unknown): RouteOptions {
  if (preferredProvider === undefined) {
    return {}
  }

  if (preferredProvider === "openai_codex" || preferredProvider === "anthropic_claude") {
    return { preferred_provider: preferredProvider satisfies ModelProvider }
  }

  throw new McpToolInputError("preferred_provider must be a supported model provider", [
    {
      path: "/preferred_provider",
      message: "must be openai_codex or anthropic_claude"
    }
  ])
}
