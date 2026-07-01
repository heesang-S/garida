import { access, readFile } from "node:fs/promises"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const pluginRoot = process.cwd().endsWith(join("plugins", "codex-router"))
  ? process.cwd()
  : join(process.cwd(), "plugins", "codex-router")
const repoRoot = process.cwd().endsWith(join("plugins", "codex-router"))
  ? join(process.cwd(), "..", "..")
  : process.cwd()

describe("codex-router plugin structure", () => {
  it("contains manifest, skill, example MCP config, and MCP declaration", async () => {
    await access(join(pluginRoot, ".codex-plugin", "plugin.json"))
    await access(join(pluginRoot, ".mcp.json"))
    await access(join(pluginRoot, "skills", "routed-task", "SKILL.md"))
    await access(join(pluginRoot, "package-assets", "example-mcp-config.toml"))
  })

  it("documents routed task workflow", async () => {
    const skill = await readFile(
      join(pluginRoot, "skills", "routed-task", "SKILL.md"),
      "utf8",
    )

    expect(skill).toContain("prepare_execution")
    expect(skill).toContain("route.model_id")
    expect(skill).toContain(
      "does not force the already-running Codex chat to switch models",
    )
  })

  it("declares the model router MCP server", async () => {
    const mcpConfig = await readFile(join(pluginRoot, ".mcp.json"), "utf8")
    const parsed = JSON.parse(mcpConfig) as {
      mcpServers?: Record<string, { command?: string; args?: string[] }>
    }

    const modelRouter = parsed.mcpServers?.["model_router"]

    expect(modelRouter?.command).toContain("node")
    expect(modelRouter?.args).toEqual([
      join(repoRoot, "packages", "router-mcp", "dist", "src", "mcp-server.js"),
    ])
  })
})
