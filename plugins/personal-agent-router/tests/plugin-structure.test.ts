import { access, readFile } from "node:fs/promises"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const pluginRoot = process.cwd().endsWith(join("plugins", "personal-agent-router"))
  ? process.cwd()
  : join(process.cwd(), "plugins", "personal-agent-router")
const repoRoot = process.cwd().endsWith(join("plugins", "personal-agent-router"))
  ? join(process.cwd(), "..", "..")
  : process.cwd()

describe("personal-agent-router plugin structure", () => {
  it("contains the integration README", async () => {
    await access(join(pluginRoot, "README.md"))
  })

  it("documents the routed result contract", async () => {
    const readme = await readFile(join(pluginRoot, "README.md"), "utf8")

    expect(readme).toContain("worker_results")
    expect(readme).toContain("review_result")
    expect(readme).toContain("synthesis_strategy")
  })

  it("includes an example execution payload", async () => {
    const example = await readFile(
      join(repoRoot, "examples", "personal-agent-execution.json"),
      "utf8",
    )

    expect(example).toContain("\"worker_results\"")
    expect(example).toContain("\"review_result\"")
    expect(example).toContain("\"synthesis_strategy\"")
  })
})
