import type { ExecutionPlan, RouteDecision, WorkerBrief } from "@model-orchestration/shared-types"
import type { TokenCost, TokenUsage } from "./cost.js"
import { ExecutorTimeoutError, MissingReviewExecutorError } from "./errors.js"
import { appendCompletedExecutionLog, systemExecutionClock } from "./execution-log.js"
import type { ExecutionClock, ExecutionLogStore } from "./execution-log.js"

export const WORKER_RESULT_STATUSES = ["succeeded", "failed"] as const
export const REVIEW_RESULT_STATUSES = ["passed", "failed"] as const

export type WorkerResultStatus = (typeof WORKER_RESULT_STATUSES)[number]
export type ReviewResultStatus = (typeof REVIEW_RESULT_STATUSES)[number]

export type ExecutorMetadata = Record<string, string>

export type ExecutorRunContext = {
  readonly route: RouteDecision
  readonly signal?: AbortSignal
  readonly metadata?: ExecutorMetadata
}

export type RetryPolicy = {
  readonly max_attempts: number
  readonly delay_ms: number
  readonly classify_error?: (error: unknown) => RetryClassification
}

export type RetryClassification = "retryable" | "fatal"

export type TimeoutPolicy = {
  readonly worker_timeout_ms?: number
  readonly reviewer_timeout_ms?: number
}

export type ExecutorEventType =
  | "worker_started"
  | "worker_retry"
  | "worker_succeeded"
  | "worker_failed"
  | "reviewer_started"
  | "reviewer_retry"
  | "reviewer_succeeded"
  | "reviewer_failed"

export type ExecutorEvent = {
  readonly type: ExecutorEventType
  readonly provider: string
  readonly brief_id: string
  readonly attempt: number
  readonly model_id: string
  readonly message: string
}

export type ExecutorLogger = {
  log(event: ExecutorEvent): void
}

export type WorkerResult = {
  readonly worker_id: string
  readonly status: WorkerResultStatus
  readonly output: string
  readonly evidence: readonly string[]
  readonly usage?: TokenUsage
  readonly cost?: TokenCost
  readonly error?: string
}

export type ReviewResult = {
  readonly reviewer_id: string
  readonly status: ReviewResultStatus
  readonly output: string
  readonly findings: readonly string[]
  readonly usage?: TokenUsage
  readonly cost?: TokenCost
}

export type AgentExecutor = {
  readonly provider: string
  executeWorker(brief: WorkerBrief, context: ExecutorRunContext): Promise<WorkerResult>
  executeReview?(brief: WorkerBrief, context: ExecutorRunContext): Promise<ReviewResult>
}

export type RunExecutionPlanInput = {
  readonly execution_plan: ExecutionPlan
  readonly route: RouteDecision
  readonly executor: AgentExecutor
  readonly run_id?: string
  readonly clock?: ExecutionClock
  readonly execution_log_store?: ExecutionLogStore
  readonly signal?: AbortSignal
  readonly metadata?: ExecutorMetadata
  readonly retry_policy?: RetryPolicy
  readonly timeout_policy?: TimeoutPolicy
  readonly logger?: ExecutorLogger
}

export type ExecutionRunResult = {
  readonly worker_results: readonly WorkerResult[]
  readonly review_result?: ReviewResult
  readonly synthesis_strategy: string
}

export async function runExecutionPlan(input: RunExecutionPlanInput): Promise<ExecutionRunResult> {
  const clock = input.clock ?? systemExecutionClock()
  const startedAtMs = clock.now()
  const context = buildRunContext(input)
  const workerResults = await Promise.all(
    input.execution_plan.worker_briefs.map((brief) => runWorkerBrief(brief, input, context))
  )

  const reviewerBrief = input.execution_plan.reviewer_brief
  if (reviewerBrief === undefined) {
    const result = {
      worker_results: workerResults,
      synthesis_strategy: input.execution_plan.synthesis_strategy
    }
    await appendCompletedExecutionLog(input, result, startedAtMs, clock.now())
    return result
  }

  if (input.executor.executeReview === undefined) {
    throw new MissingReviewExecutorError(input.executor.provider)
  }

  const reviewResult = await runReviewerBrief(reviewerBrief, input, context)

  const result = {
    worker_results: workerResults,
    review_result: reviewResult,
    synthesis_strategy: input.execution_plan.synthesis_strategy
  }
  await appendCompletedExecutionLog(input, result, startedAtMs, clock.now())
  return result
}

async function runWorkerBrief(
  brief: WorkerBrief,
  input: RunExecutionPlanInput,
  context: ExecutorRunContext
): Promise<WorkerResult> {
  return runWithPolicies({
    brief,
    input,
    started_type: "worker_started",
    retry_type: "worker_retry",
    succeeded_type: "worker_succeeded",
    failed_type: "worker_failed",
    timeout_ms: input.timeout_policy?.worker_timeout_ms,
    operation: () => input.executor.executeWorker(brief, context)
  })
}

async function runReviewerBrief(
  brief: WorkerBrief,
  input: RunExecutionPlanInput,
  context: ExecutorRunContext
): Promise<ReviewResult> {
  if (input.executor.executeReview === undefined) {
    throw new MissingReviewExecutorError(input.executor.provider)
  }

  return runWithPolicies({
    brief,
    input,
    started_type: "reviewer_started",
    retry_type: "reviewer_retry",
    succeeded_type: "reviewer_succeeded",
    failed_type: "reviewer_failed",
    timeout_ms: input.timeout_policy?.reviewer_timeout_ms,
    operation: () => input.executor.executeReview?.(brief, context) ?? missingReviewPromise(input)
  })
}

type PolicyRunInput<T> = {
  readonly brief: WorkerBrief
  readonly input: RunExecutionPlanInput
  readonly started_type: ExecutorEventType
  readonly retry_type: ExecutorEventType
  readonly succeeded_type: ExecutorEventType
  readonly failed_type: ExecutorEventType
  readonly timeout_ms: number | undefined
  readonly operation: () => Promise<T>
}

async function runWithPolicies<T>(policyInput: PolicyRunInput<T>): Promise<T> {
  const retryPolicy = policyInput.input.retry_policy ?? { max_attempts: 1, delay_ms: 0 }
  const maxAttempts = Math.max(1, retryPolicy.max_attempts)
  emit(policyInput, policyInput.started_type, 1, "started")

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await withOptionalTimeout(
        policyInput.operation(),
        policyInput.brief.id,
        policyInput.timeout_ms
      )
      emit(policyInput, policyInput.succeeded_type, attempt, "succeeded")
      return result
    } catch (error) {
      const classification = retryPolicy.classify_error?.(error) ?? "retryable"
      if (classification === "fatal" || attempt >= maxAttempts) {
        emit(policyInput, policyInput.failed_type, attempt, errorMessage(error))
        throw error
      }

      emit(policyInput, policyInput.retry_type, attempt, errorMessage(error))
      await delay(retryPolicy.delay_ms)
    }
  }

  throw new Error("Unreachable retry state.")
}

async function withOptionalTimeout<T>(
  promise: Promise<T>,
  briefId: string,
  timeoutMs: number | undefined
): Promise<T> {
  if (timeoutMs === undefined) {
    return promise
  }

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new ExecutorTimeoutError(briefId, timeoutMs))
    }, timeoutMs)

    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

async function delay(delayMs: number): Promise<void> {
  if (delayMs <= 0) {
    return
  }

  await new Promise((resolve) => setTimeout(resolve, delayMs))
}

function emit(policyInput: PolicyRunInput<unknown>, type: ExecutorEventType, attempt: number, message: string): void {
  policyInput.input.logger?.log({
    type,
    provider: policyInput.input.executor.provider,
    brief_id: policyInput.brief.id,
    attempt,
    model_id: policyInput.input.route.model_id,
    message
  })
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return "Unknown executor error."
}

async function missingReviewPromise(input: RunExecutionPlanInput): Promise<ReviewResult> {
  throw new MissingReviewExecutorError(input.executor.provider)
}

function buildRunContext(input: RunExecutionPlanInput): ExecutorRunContext {
  const base = {
    route: input.route
  }

  if (input.signal !== undefined && input.metadata !== undefined) {
    return { ...base, signal: input.signal, metadata: input.metadata }
  }

  if (input.signal !== undefined) {
    return { ...base, signal: input.signal }
  }

  if (input.metadata !== undefined) {
    return { ...base, metadata: input.metadata }
  }

  return base
}
