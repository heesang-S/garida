import type { ExecutionPlan, RouteDecision } from "@model-orchestration/shared-types"
import type { ExecutionRunResult, ReviewResult, RunExecutionPlanInput, WorkerResult } from "./run-execution-plan.js"

export type ExecutionRunStatus = "completed"

export type ExecutionClock = {
  now(): number
}

export type ExecutionLogEntry = {
  readonly run_id: string
  readonly status: ExecutionRunStatus
  readonly provider: string
  readonly model_id: string
  readonly route: RouteDecision
  readonly execution_plan: ExecutionPlan
  readonly worker_results: readonly WorkerResult[]
  readonly review_result?: ReviewResult
  readonly synthesis_strategy: string
  readonly started_at_ms: number
  readonly completed_at_ms: number
  readonly duration_ms: number
}

export type ExecutionLogStore = {
  append(entry: ExecutionLogEntry): Promise<void>
  list(): Promise<readonly ExecutionLogEntry[]>
  get(runId: string): Promise<ExecutionLogEntry | undefined>
}

export function createMemoryExecutionLogStore(): ExecutionLogStore {
  const entries: ExecutionLogEntry[] = []

  return {
    async append(entry: ExecutionLogEntry): Promise<void> {
      entries.push(entry)
    },
    async list(): Promise<readonly ExecutionLogEntry[]> {
      return [...entries]
    },
    async get(runId: string): Promise<ExecutionLogEntry | undefined> {
      return entries.find((entry) => entry.run_id === runId)
    }
  }
}

export function systemExecutionClock(): ExecutionClock {
  return {
    now(): number {
      return Date.now()
    }
  }
}

export async function appendCompletedExecutionLog(
  input: RunExecutionPlanInput,
  result: ExecutionRunResult,
  startedAtMs: number,
  completedAtMs: number
): Promise<void> {
  if (input.execution_log_store === undefined) {
    return
  }

  const runId = input.run_id ?? `run-${startedAtMs}`
  const baseEntry = {
    run_id: runId,
    status: "completed",
    provider: input.executor.provider,
    model_id: input.route.model_id,
    route: input.route,
    execution_plan: input.execution_plan,
    worker_results: result.worker_results,
    synthesis_strategy: result.synthesis_strategy,
    started_at_ms: startedAtMs,
    completed_at_ms: completedAtMs,
    duration_ms: completedAtMs - startedAtMs
  } satisfies Omit<ExecutionLogEntry, "review_result">

  if (result.review_result === undefined) {
    await input.execution_log_store.append(baseEntry)
    return
  }

  await input.execution_log_store.append({
    ...baseEntry,
    review_result: result.review_result
  })
}
