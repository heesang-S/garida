import { randomUUID } from "node:crypto"
import { appendFile, mkdir, readFile } from "node:fs/promises"
import { dirname } from "node:path"
import type { ExecutionPlan, RouteDecision, WorkerBrief } from "@garida/types"
import { redactLogValue } from "./log-redaction.js"
import type {
  ExecutionLogPolicy,
  ExecutionRunResult,
  ExecutionRunStatus,
  ReviewResult,
  RunExecutionPlanInput,
  WorkerResult
} from "./run-execution-plan.js"

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

export function createJsonlExecutionLogStore(filePath: string): ExecutionLogStore {
  return {
    async append(entry: ExecutionLogEntry): Promise<void> {
      await mkdir(dirname(filePath), { recursive: true })
      await appendFile(filePath, `${JSON.stringify(entry)}\n`, "utf8")
    },
    async list(): Promise<readonly ExecutionLogEntry[]> {
      const content = await readLogFile(filePath)
      return content
        .split("\n")
        .filter((line) => line.length > 0)
        .map(parseJsonLine)
        .filter(isExecutionLogEntry)
    },
    async get(runId: string): Promise<ExecutionLogEntry | undefined> {
      const entries = await this.list()
      return entries.find((entry) => entry.run_id === runId)
    }
  }
}

export function systemExecutionClock(): ExecutionClock {
  return { now: () => Date.now() }
}

export async function appendExecutionLog(
  input: RunExecutionPlanInput,
  result: ExecutionRunResult,
  startedAtMs: number,
  completedAtMs: number
): Promise<void> {
  if (input.execution_log_store === undefined) return

  const baseEntry = {
    run_id: input.run_id ?? `run-${startedAtMs}-${randomUUID()}`,
    status: result.status,
    provider: input.executor.provider,
    model_id: input.route.model_id,
    route: input.route,
    execution_plan: sanitizeExecutionPlan(input.execution_plan, input.log_policy),
    worker_results: result.worker_results.map((worker) => sanitizeWorkerResult(worker, input.log_policy)),
    synthesis_strategy: logPrompt(input.execution_plan.synthesis_strategy, input.log_policy),
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
    review_result: sanitizeReviewResult(result.review_result, input.log_policy)
  })
}

function sanitizeExecutionPlan(plan: ExecutionPlan, policy: ExecutionLogPolicy | undefined): ExecutionPlan {
  const base = {
    execution_mode: plan.execution_mode,
    worker_briefs: plan.worker_briefs.map((brief) => sanitizeBrief(brief, policy)),
    synthesis_strategy: logPrompt(plan.synthesis_strategy, policy)
  }
  return plan.reviewer_brief === undefined
    ? base
    : { ...base, reviewer_brief: sanitizeBrief(plan.reviewer_brief, policy) }
}

function sanitizeBrief(brief: WorkerBrief, policy: ExecutionLogPolicy | undefined): WorkerBrief {
  return {
    ...brief,
    title: logPrompt(brief.title, policy),
    objective: logPrompt(brief.objective, policy),
    constraints: brief.constraints.map((value) => logPrompt(value, policy)),
    expected_output: logPrompt(brief.expected_output, policy),
    acceptance_criteria: brief.acceptance_criteria.map((value) => logPrompt(value, policy))
  }
}

function sanitizeWorkerResult(result: WorkerResult, policy: ExecutionLogPolicy | undefined): WorkerResult {
  return {
    ...result,
    output: logOutput(result.output, policy),
    evidence: result.evidence.map((value) => logOutput(value, policy)),
    ...(result.error === undefined ? {} : { error: logOutput(result.error, policy) })
  }
}

function sanitizeReviewResult(result: ReviewResult, policy: ExecutionLogPolicy | undefined): ReviewResult {
  return {
    ...result,
    output: logOutput(result.output, policy),
    findings: result.findings.map((value) => logOutput(value, policy))
  }
}

function logPrompt(value: string, policy: ExecutionLogPolicy | undefined): string {
  return policy?.include_prompts === true ? redactLogValue(value, "prompt", policy) : "[redacted]"
}

function logOutput(value: string, policy: ExecutionLogPolicy | undefined): string {
  return policy?.include_outputs === true ? redactLogValue(value, "output", policy) : "[redacted]"
}

async function readLogFile(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf8")
  } catch (error) {
    if (isNodeErrorCode(error, "ENOENT")) return ""
    throw error
  }
}

function isExecutionLogEntry(value: unknown): value is ExecutionLogEntry {
  return (
    isRecord(value) &&
    typeof value["run_id"] === "string" &&
    isExecutionRunStatus(value["status"]) &&
    typeof value["provider"] === "string" &&
    typeof value["model_id"] === "string" &&
    isRecord(value["route"]) &&
    isRecord(value["execution_plan"]) &&
    Array.isArray(value["worker_results"]) &&
    typeof value["synthesis_strategy"] === "string" &&
    typeof value["started_at_ms"] === "number" &&
    typeof value["completed_at_ms"] === "number" &&
    typeof value["duration_ms"] === "number"
  )
}

function isExecutionRunStatus(value: unknown): value is ExecutionRunStatus {
  return value === "completed" || value === "failed" || value === "cancelled" || value === "timed_out"
}

function parseJsonLine(line: string): unknown {
  return JSON.parse(line)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isNodeErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code
}
