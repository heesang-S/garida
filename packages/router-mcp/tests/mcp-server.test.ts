import { describe, expect, it } from "vitest"

import { MCP_TOOL_NAMES } from "../src/mcp-server.js"

describe("MCP server metadata", () => {
  it("exposes the routing tool names", () => {
    expect(MCP_TOOL_NAMES).toEqual(["route_task", "prepare_execution"])
  })
})
