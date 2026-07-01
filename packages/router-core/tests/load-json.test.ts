import { mkdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { loadJsonFile } from "../src/load-json.js"

describe("loadJsonFile", () => {
  it("returns parsed JSON when the file contains valid JSON", async () => {
    const directory = join(tmpdir(), "model-router-tests")
    const filePath = join(directory, "valid.json")
    await mkdir(directory, { recursive: true })
    await writeFile(filePath, "{\"ok\":true}\n", "utf8")

    const value = await loadJsonFile(filePath)

    expect(value).toEqual({ ok: true })
  })

  it("throws a JsonLoadError when the file contains invalid JSON", async () => {
    const directory = join(tmpdir(), "model-router-tests")
    const filePath = join(directory, "invalid.json")
    await mkdir(directory, { recursive: true })
    await writeFile(filePath, "{\"ok\":\n", "utf8")

    await expect(loadJsonFile(filePath)).rejects.toThrow("Invalid JSON")
  })
})
