import { access, readFile } from "node:fs/promises"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const pluginRoot = process.cwd().endsWith(join("plugins", "claude-router"))
  ? process.cwd()
  : join(process.cwd(), "plugins", "claude-router")

describe("claude-router plugin structure", () => {
  it("contains the integration README and routed-task skill", async () => {
    await access(join(pluginRoot, "README.md"))
    await access(join(pluginRoot, "skills", "routed-task", "SKILL.md"))
  })

  it("documents the routed-task workflow", async () => {
    const skill = await readFile(
      join(pluginRoot, "skills", "routed-task", "SKILL.md"),
      "utf8",
    )

    expect(skill).toContain("prepare_execution")
    expect(skill).toContain("route.model_id")
    expect(skill).toContain("Claude Code")
  })
})
