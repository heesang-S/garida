import { fileURLToPath } from "node:url"

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { describe, expect, it } from "vitest"

const serverPath = fileURLToPath(new URL("../dist/src/mcp-server.js", import.meta.url))

const taskAssessment = {
  task_type: "debugging",
  complexity: "medium",
  risk: "medium",
  context_size: "medium",
  tool_need: "heavy",
  parallelizable: false,
  requires_subagents: false,
  confidence: 0.88,
  reasoning: "Runtime debugging with tool use."
}

describe("garida-mcp stdio executable", () => {
  it("initializes, lists both tools, executes them, and returns structured input errors", async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [serverPath],
      stderr: "pipe"
    })
    const client = new Client({ name: "garida-mcp-smoke", version: "0.1.0" })

    try {
      await client.connect(transport)

      const tools = await client.listTools()
      expect(tools.tools.map((tool) => tool.name)).toEqual(
        expect.arrayContaining(["route_task", "prepare_execution"])
      )

      const route = await client.callTool({
        name: "route_task",
        arguments: { assessment: taskAssessment, preferred_provider: "openai_codex" }
      })
      expect(route.isError).not.toBe(true)
      expect(route.structuredContent).toMatchObject({
        provider: "openai_codex",
        model_class: "strong"
      })

      const execution = await client.callTool({
        name: "prepare_execution",
        arguments: { assessment: taskAssessment }
      })
      expect(execution.isError).not.toBe(true)
      expect(execution.structuredContent).toMatchObject({
        execution_plan: { execution_mode: "direct" }
      })

      const invalid = await client.callTool({
        name: "route_task",
        arguments: { assessment: {} }
      })
      expect(invalid.isError).toBe(true)
      expect(invalid.structuredContent).toMatchObject({
        error: {
          code: "INVALID_TASK_ASSESSMENT",
          message: "assessment does not match the Garida task-assessment schema"
        }
      })
    } finally {
      await client.close()
    }
  })
})
