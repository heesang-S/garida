import { pathToFileURL } from "node:url"

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"

import { prepareExecutionTool, routeTaskTool } from "./mcp-tools.js"

export const MCP_TOOL_NAMES = ["route_task", "prepare_execution"] as const

const toolInputSchema = {
  assessment: z.unknown(),
  preferred_provider: z.enum(["openai_codex", "anthropic_claude"]).optional()
} as const

export function createRoutingMcpServer(): McpServer {
  const server = new McpServer({
    name: "model-routing-agent",
    version: "0.1.0"
  })

  server.registerTool(
    "route_task",
    {
      title: "Route Task",
      description: "Route a task assessment to a model/provider decision.",
      inputSchema: toolInputSchema
    },
    async (input) => {
      const output = await routeTaskTool(input)

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      }
    }
  )

  server.registerTool(
    "prepare_execution",
    {
      title: "Prepare Execution",
      description: "Create a route decision and execution plan for an agent runtime.",
      inputSchema: toolInputSchema
    },
    async (input) => {
      const output = await prepareExecutionTool(input)

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      }
    }
  )

  return server
}

export async function runMcpServer(): Promise<void> {
  const server = createRoutingMcpServer()
  await server.connect(new StdioServerTransport())
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runMcpServer()
}
