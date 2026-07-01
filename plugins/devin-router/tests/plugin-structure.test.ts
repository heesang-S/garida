import { access, readFile } from "node:fs/promises"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const pluginRoot = process.cwd().endsWith(join("plugins", "devin-router"))
  ? process.cwd()
  : join(process.cwd(), "plugins", "devin-router")
const repoRoot = process.cwd().endsWith(join("plugins", "devin-router"))
  ? join(process.cwd(), "..", "..")
  : process.cwd()

describe("devin-router plugin structure", () => {
  it("contains the integration README", async () => {
    await access(join(pluginRoot, "README.md"))
  })

  it("documents routed Devin planning", async () => {
    const readme = await readFile(join(pluginRoot, "README.md"), "utf8")

    expect(readme).toContain("prepare_execution")
    expect(readme).toContain("packages/executor-devin")
  })

  it("includes platform notes for runtime limitations", async () => {
    const notes = await readFile(
      join(repoRoot, "knowledge", "devin-integration-notes.md"),
      "utf8",
    )

    expect(notes).toContain("prepare_execution")
    expect(notes).toContain("Current blocker")
  })
})
