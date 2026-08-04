#!/usr/bin/env node

import { pathToFileURL } from "node:url"

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  createRouter,
  loadJsonFile,
  ModelCatalogValidationError,
  RouterConfigurationValidationError,
  RoutingPolicyError,
  TaskAssessmentValidationError,
  type ModelCatalog,
  type Router,
  type RoutingPolicy
} from "@garida/core"
import { z } from "zod"

import {
  createRoutingToolHandlers,
  McpToolInputError,
  type RoutingToolHandlers
} from "./mcp-tools.js"

export const MCP_TOOL_NAMES = ["route_task", "prepare_execution"] as const

const taskAssessmentInputSchema = z.object({}).passthrough().describe(
  "A TaskAssessment object. The tool validates it against Garida's published task-assessment schema."
)

const toolInputSchema = {
  assessment: taskAssessmentInputSchema,
  preferred_provider: z.string().optional().describe(
    "Optional provider preference: openai_codex or anthropic_claude."
  )
} as const

export type RoutingMcpServerOptions = {
  readonly router?: Router
}

export type RoutingMcpConfig = {
  readonly policyPath?: string
  readonly catalogPath?: string
}

export type McpToolError = {
  readonly code:
    | "INVALID_TASK_ASSESSMENT"
    | "INVALID_PREFERRED_PROVIDER"
    | "ROUTING_ERROR"
    | "INTERNAL_ERROR"
  readonly message: string
  readonly details: readonly { readonly path: string; readonly message: string }[]
}

export function createRoutingMcpServer(options: RoutingMcpServerOptions = {}): McpServer {
  const server = new McpServer({
    name: "garida-router",
    version: "0.1.0"
  })
  const tools = createRoutingToolHandlers(options.router)

  registerRoutingTool(server, "route_task", {
    title: "Route Task",
    description: "Route a validated task assessment to a deterministic model/provider decision.",
    run: (input) => tools.routeTask(input)
  })

  registerRoutingTool(server, "prepare_execution", {
    title: "Prepare Execution",
    description: "Create a route decision and portable execution plan from a task assessment.",
    run: (input) => tools.prepareExecution(input)
  })

  return server
}

export async function runMcpServer(config: RoutingMcpConfig = {}): Promise<void> {
  const server = createRoutingMcpServer({
    router: await createRouterFromConfig(config)
  })
  await server.connect(new StdioServerTransport())
}

export async function createRouterFromConfig(config: RoutingMcpConfig = {}): Promise<Router> {
  const [policy, catalog] = await Promise.all([
    config.policyPath === undefined
      ? Promise.resolve(undefined)
      : loadJsonFile(config.policyPath) as Promise<RoutingPolicy>,
    config.catalogPath === undefined
      ? Promise.resolve(undefined)
      : loadJsonFile(config.catalogPath) as Promise<ModelCatalog>
  ])

  return createRouter({
    ...(policy === undefined ? {} : { policy }),
    ...(catalog === undefined ? {} : { catalog })
  })
}

export function toMcpToolError(error: unknown): McpToolError {
  if (error instanceof TaskAssessmentValidationError) {
    return {
      code: "INVALID_TASK_ASSESSMENT",
      message: "assessment does not match the Garida task-assessment schema",
      details: error.errors.map((issue) => ({
        path: issue.instancePath || "/",
        message: issue.message ?? "is invalid"
      }))
    }
  }

  if (error instanceof McpToolInputError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details
    }
  }

  if (error instanceof RoutingPolicyError) {
    return {
      code: "ROUTING_ERROR",
      message: "routing policy could not resolve this task",
      details: [{ path: "/", message: error.message }]
    }
  }

  return {
    code: "INTERNAL_ERROR",
    message: "Garida could not process the tool request",
    details: []
  }
}

function registerRoutingTool(
  server: McpServer,
  name: (typeof MCP_TOOL_NAMES)[number],
  tool: {
    readonly title: string
    readonly description: string
    readonly run: (input: {
      readonly assessment: Record<string, unknown>
      readonly preferred_provider?: string | undefined
    }) => Promise<unknown>
  }
): void {
  server.registerTool(
    name,
    {
      title: tool.title,
      description: tool.description,
      inputSchema: toolInputSchema
    },
    async (input) => {
      try {
        const output = await tool.run(input)
        return {
          content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
          structuredContent: asStructuredContent(output)
        }
      } catch (error) {
        const toolError = toMcpToolError(error)
        const output = { error: toolError }

        return {
          content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
          isError: true
        }
      }
    }
  )
}

function asStructuredContent(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return { result: value }
}

function parseCliArgs(args: readonly string[]): RoutingMcpConfig {
  const config: { policyPath?: string; catalogPath?: string } = {}

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    const value = args[index + 1]

    if (arg === "--policy" && value !== undefined && config.policyPath === undefined) {
      config.policyPath = value
      index += 1
      continue
    }

    if (arg === "--catalog" && value !== undefined && config.catalogPath === undefined) {
      config.catalogPath = value
      index += 1
      continue
    }

    throw new McpCliArgumentError(
      "Usage: garida-mcp [--policy <routing-policy.json>] [--catalog <model-catalog.json>]"
    )
  }

  return config
}

class McpCliArgumentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "McpCliArgumentError"
  }
}

async function main(): Promise<void> {
  try {
    await runMcpServer(parseCliArgs(process.argv.slice(2)))
  } catch (error) {
    const message = formatStartupError(error)
    process.stderr.write(`garida-mcp: ${message}\n`)
    process.exitCode = 1
  }
}

function formatStartupError(error: unknown): string {
  if (error instanceof McpCliArgumentError) {
    return error.message
  }

  if (error instanceof RouterConfigurationValidationError || error instanceof ModelCatalogValidationError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Unable to start MCP server"
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
