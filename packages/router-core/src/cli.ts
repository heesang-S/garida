import { loadJsonFile } from "./load-json.js"
import { routeTask } from "./router.js"
import { MODEL_PROVIDERS, type ModelProvider } from "@model-orchestration/shared-types"
import { validateTaskAssessment } from "./validate-assessment.js"

async function main(): Promise<void> {
  const cliArgs = parseCliArgs(process.argv.slice(2))

  if (cliArgs === undefined) {
    console.error("Usage: pnpm route -- [--provider openai_codex|anthropic_claude] <task-assessment.json>")
    process.exitCode = 2
    return
  }

  try {
    const value = await loadJsonFile(cliArgs.filePath)
    const assessment = await validateTaskAssessment(value)
    const decision = await routeTask(assessment, providerOptions(cliArgs))
    console.log(JSON.stringify(decision, null, 2))
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message)
      process.exitCode = 1
      return
    }

    console.error("Unknown routing failure")
    process.exitCode = 1
  }
}

await main()

type CliArgs = {
  readonly filePath: string
  readonly preferredProvider?: ModelProvider
}

function parseCliArgs(args: readonly string[]): CliArgs | undefined {
  const providerFlagIndex = args.findIndex((arg) => arg === "--provider")
  const rawProvider =
    providerFlagIndex >= 0 ? args.at(providerFlagIndex + 1) : undefined
  const preferredProvider =
    rawProvider === undefined ? undefined : parseCliModelProvider(rawProvider)
  const filePath = args.find(
    (arg, index) =>
      arg !== "--" &&
      arg !== "--provider" &&
      index !== providerFlagIndex + 1
  )

  if (filePath === undefined || filePath.length === 0) {
    return undefined
  }

  if (preferredProvider === undefined) {
    return { filePath }
  }

  return { filePath, preferredProvider }
}

function providerOptions(cliArgs: CliArgs): { readonly preferred_provider?: ModelProvider } {
  if (cliArgs.preferredProvider === undefined) {
    return {}
  }

  return { preferred_provider: cliArgs.preferredProvider }
}

function parseCliModelProvider(value: string): ModelProvider {
  for (const provider of MODEL_PROVIDERS) {
    if (provider === value) {
      return provider
    }
  }

  throw new CliArgumentError(`Unknown provider: ${value}`)
}

class CliArgumentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CliArgumentError"
  }
}
