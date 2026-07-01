import { readdir } from "node:fs/promises"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { loadJsonFile } from "../src/load-json.js"
import { routeTask } from "../src/router.js"
import { validateTaskAssessment } from "../src/validate-assessment.js"

const tasksDirectory = join(process.cwd(), "..", "..", "examples", "tasks")

describe("example task fixtures", () => {
  it("validates and routes every valid example", async () => {
    const files = await readdir(tasksDirectory)
    const validFiles = files.filter((fileName) => !fileName.startsWith("invalid-"))

    for (const fileName of validFiles) {
      const value = await loadJsonFile(join(tasksDirectory, fileName))
      const assessment = await validateTaskAssessment(value)
      const decision = await routeTask(assessment)

      expect(decision.model_class).toMatch(/^(small_fast|standard|strong)$/)
      expect(decision.matched_rules.length).toBeGreaterThan(0)
    }
  })

  it("rejects the invalid extra-field fixture", async () => {
    const value = await loadJsonFile(join(tasksDirectory, "invalid-extra-field.json"))

    await expect(validateTaskAssessment(value)).rejects.toThrow("additional properties")
  })
})
