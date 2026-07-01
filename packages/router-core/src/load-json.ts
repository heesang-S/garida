import { readFile } from "node:fs/promises"

export class JsonLoadError extends Error {
  readonly filePath: string

  constructor(filePath: string, message: string, cause: unknown) {
    super(message, { cause })
    this.name = "JsonLoadError"
    this.filePath = filePath
  }
}

export async function loadJsonFile(filePath: string): Promise<unknown> {
  try {
    const content = await readFile(filePath, "utf8")
    return JSON.parse(content)
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new JsonLoadError(filePath, `Invalid JSON in ${filePath}: ${error.message}`, error)
    }

    if (error instanceof Error) {
      throw new JsonLoadError(filePath, `Unable to load JSON from ${filePath}: ${error.message}`, error)
    }

    throw new JsonLoadError(filePath, `Unable to load JSON from ${filePath}`, error)
  }
}
