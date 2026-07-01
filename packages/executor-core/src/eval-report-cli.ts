import { createJsonlExecutionLogStore } from "./execution-log.js"
import { formatExecutionEvalReport, summarizeExecutionLogs } from "./eval-report.js"

async function main(args: readonly string[]): Promise<number> {
  const logPath = args[0] === "--" ? args[1] : args[0]
  if (logPath === undefined || logPath === "") {
    console.error("Usage: node dist/src/eval-report-cli.js <execution-log.jsonl>")
    return 1
  }

  const store = createJsonlExecutionLogStore(logPath)
  const entries = await store.list()
  console.log(formatExecutionEvalReport(summarizeExecutionLogs(entries)))
  return 0
}

const exitCode = await main(process.argv.slice(2))
process.exitCode = exitCode
