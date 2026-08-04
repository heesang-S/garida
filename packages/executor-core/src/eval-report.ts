import type { ExecutionLogEntry } from "./execution-log.js"
import type { WorkerResult } from "./run-execution-plan.js"

export type ProviderEvalSummary = {
  readonly provider: string
  readonly runs: number
  readonly worker_failures: number
  readonly total_cost_usd: number
}

export type ExecutionEvalReport = {
  readonly total_runs: number
  readonly completed_runs: number
  readonly failed_worker_results: number
  readonly total_duration_ms: number
  readonly total_tokens: number
  readonly total_cost_usd: number
  readonly by_provider: readonly ProviderEvalSummary[]
}

type ProviderAccumulator = {
  runs: number
  worker_failures: number
  total_cost_usd: number
}

export function summarizeExecutionLogs(entries: readonly ExecutionLogEntry[]): ExecutionEvalReport {
  const providerTotals: Record<string, ProviderAccumulator> = {}
  let failedWorkerResults = 0
  let totalDurationMs = 0
  let totalTokens = 0
  let totalCostUsd = 0

  for (const entry of entries) {
    const workerFailures = countFailedWorkers(entry.worker_results)
    const entryCostUsd = sumWorkerCost(entry.worker_results)
    failedWorkerResults += workerFailures
    totalDurationMs += entry.duration_ms
    totalTokens += sumWorkerTokens(entry.worker_results)
    totalCostUsd += entryCostUsd

    const provider = providerTotals[entry.provider] ?? {
      runs: 0,
      worker_failures: 0,
      total_cost_usd: 0
    }
    providerTotals[entry.provider] = {
      runs: provider.runs + 1,
      worker_failures: provider.worker_failures + workerFailures,
      total_cost_usd: roundUsd(provider.total_cost_usd + entryCostUsd)
    }
  }

  return {
    total_runs: entries.length,
    completed_runs: entries.filter((entry) => entry.status === "completed").length,
    failed_worker_results: failedWorkerResults,
    total_duration_ms: totalDurationMs,
    total_tokens: totalTokens,
    total_cost_usd: roundUsd(totalCostUsd),
    by_provider: Object.entries(providerTotals)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([provider, summary]) => ({
        provider,
        runs: summary.runs,
        worker_failures: summary.worker_failures,
        total_cost_usd: summary.total_cost_usd
      }))
  }
}

export function formatExecutionEvalReport(report: ExecutionEvalReport): string {
  return [
    "Execution Eval Report",
    `Total runs: ${report.total_runs}`,
    `Completed runs: ${report.completed_runs}`,
    `Failed worker results: ${report.failed_worker_results}`,
    `Total duration ms: ${report.total_duration_ms}`,
    `Total tokens: ${report.total_tokens}`,
    `Total cost USD: ${report.total_cost_usd}`,
    "By provider:",
    ...report.by_provider.map(
      (summary) =>
        `${summary.provider} | runs=${summary.runs} | worker_failures=${summary.worker_failures} | cost_usd=${summary.total_cost_usd}`
    )
  ].join("\n")
}

function countFailedWorkers(workerResults: readonly WorkerResult[]): number {
  return workerResults.filter((result) => result.status !== "succeeded").length
}

function sumWorkerTokens(workerResults: readonly WorkerResult[]): number {
  return workerResults.reduce((total, result) => total + (result.usage?.total_tokens ?? 0), 0)
}

function sumWorkerCost(workerResults: readonly WorkerResult[]): number {
  return roundUsd(workerResults.reduce((total, result) => total + (result.cost?.total_usd ?? 0), 0))
}

function roundUsd(value: number): number {
  return Math.round(value * 1_000_000_000_000) / 1_000_000_000_000
}
