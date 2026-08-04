import type { ExecutionPlan, RouteDecision, WorkerBrief } from "@garida/types"
import type { TokenCost, TokenUsage } from "./cost.js"
import {
  ExecutorCancelledError,
  ExecutorOutputLimitError,
  ExecutorTimeoutError,
  MissingReviewExecutorError,
  UnsupportedExecutorError
} from "./errors.js"
import { appendExecutionLog, systemExecutionClock } from "./execution-log.js"
import type { ExecutionClock, ExecutionLogStore } from "./execution-log.js"
import { redactLogValue } from "./log-redaction.js"

export const WORKER_RESULT_STATUSES = ["succeeded", "failed", "cancelled", "timed_out"] as const
export const REVIEW_RESULT_STATUSES = ["passed", "failed", "cancelled", "timed_out"] as const

export type WorkerResultStatus = (typeof WORKER_RESULT_STATUSES)[number]
export type ReviewResultStatus = (typeof REVIEW_RESULT_STATUSES)[number]
export type RetryClassification = "retryable" | "fatal"
export type LogValueKind = "prompt" | "output" | "error"

export type ExecutorMetadata = Record<string, string>

export type ExecutorRunContext = {
  readonly route: RouteDecision
  readonly signal?: AbortSignal
  readonly metadata?: ExecutorMetadata
}

export type RetryPolicy = {
  readonly max_attempts: number
  readonly delay_ms: number
  readonly max_delay_ms?: number
  readonly backoff_multiplier?: number
  readonly jitter_ratio?: number
  readonly random?: () => number
  readonly classify_error?: (error: unknown) => RetryClassification
}

export type TimeoutPolicy = {
  readonly worker_timeout_ms?: number
  readonly reviewer_timeout_ms?: number
}

export type ConcurrencyPolicy = {
  readonly max_concurrency?: number
  readonly independent_worker_ids?: readonly string[]
}

export type ExecutionLogPolicy = {
  readonly include_prompts?: boolean
  readonly include_outputs?: boolean
  readonly redact?: (value: string, kind: LogValueKind) => string
}

export type ExecutorEventType =
  | "worker_started"
  | "worker_retry"
  | "worker_succeeded"
  | "worker_failed"
  | "worker_cancelled"
  | "worker_timed_out"
  | "reviewer_started"
  | "reviewer_retry"
  | "reviewer_succeeded"
  | "reviewer_failed"
  | "reviewer_cancelled"
  | "reviewer_timed_out"

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
  readonly retry_classification?: RetryClassification
}

export type ReviewResult = {
  readonly reviewer_id: string
  readonly status: ReviewResultStatus
  readonly output: string
  readonly findings: readonly string[]
  readonly usage?: TokenUsage
  readonly cost?: TokenCost
  readonly retry_classification?: RetryClassification
}

export type AgentExecutor = {
  readonly provider: string
  supports_route?(route: RouteDecision): boolean
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
  readonly concurrency_policy?: ConcurrencyPolicy
  readonly log_policy?: ExecutionLogPolicy
  readonly logger?: ExecutorLogger
}

export type ExecutionRunStatus = "completed" | "failed" | "cancelled" | "timed_out"

export type ExecutionRunResult = {
  readonly status: ExecutionRunStatus
  readonly worker_results: readonly WorkerResult[]
  readonly review_result?: ReviewResult
  readonly synthesis_strategy: string
}

export function createUnsupportedExecutor(provider: string, reason: string): AgentExecutor {
  return {
    provider,
    supports_route(): boolean {
      return false
    },
    async executeWorker(): Promise<WorkerResult> {
      throw new UnsupportedExecutorError(provider, reason)
    },
    async executeReview(): Promise<ReviewResult> {
      throw new UnsupportedExecutorError(provider, reason)
    }
  }
}

export async function runExecutionPlan(input: RunExecutionPlanInput): Promise<ExecutionRunResult> {
  if (input.executor.supports_route?.(input.route) === false) {
    throw new UnsupportedExecutorError(input.executor.provider, `route '${input.route.provider}/${input.route.model_id}'`)
  }

  const reviewerBrief = input.execution_plan.reviewer_brief
  if (reviewerBrief !== undefined && input.executor.executeReview === undefined) {
    throw new MissingReviewExecutorError(input.executor.provider)
  }

  const clock = input.clock ?? systemExecutionClock()
  const startedAtMs = clock.now()
  const context = buildRunContext(input)
  const workerResults = await runWorkerBriefs(input, context)
  const reviewResult = reviewerBrief === undefined ? undefined : await runReviewerBrief(reviewerBrief, input, context)
  const result = buildExecutionResult(input, workerResults, reviewResult)
  await appendExecutionLog(input, result, startedAtMs, clock.now())
  return result
}

async function runWorkerBriefs(
  input: RunExecutionPlanInput,
  context: ExecutorRunContext
): Promise<readonly WorkerResult[]> {
  const briefs = input.execution_plan.worker_briefs
  const independentIds = new Set(input.concurrency_policy?.independent_worker_ids ?? [])
  const maxConcurrency = Math.max(1, Math.floor(input.concurrency_policy?.max_concurrency ?? 4))
  const results: WorkerResult[] = []

  for (let index = 0; index < briefs.length;) {
    const brief = briefs[index]
    if (brief === undefined) {
      break
    }

    if (!independentIds.has(brief.id)) {
      results.push(await runWorkerBrief(brief, input, context))
      index += 1
      continue
    }

    const group: WorkerBrief[] = []
    while (index < briefs.length) {
      const candidate = briefs[index]
      if (candidate === undefined || !independentIds.has(candidate.id)) {
        break
      }
      group.push(candidate)
      index += 1
    }
    results.push(...await mapWithConcurrency(group, maxConcurrency, (candidate) => runWorkerBrief(candidate, input, context)))
  }

  return results
}

async function mapWithConcurrency<T, R>(
  values: readonly T[],
  maxConcurrency: number,
  operation: (value: T) => Promise<R>
): Promise<readonly R[]> {
  const results = new Array<R>(values.length)
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (nextIndex < values.length) {
      const index = nextIndex
      nextIndex += 1
      const value = values[index]
      if (value !== undefined) {
        results[index] = await operation(value)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(maxConcurrency, values.length) }, () => worker()))
  return results
}

async function runWorkerBrief(
  brief: WorkerBrief,
  input: RunExecutionPlanInput,
  context: ExecutorRunContext
): Promise<WorkerResult> {
  return runWithPolicies({
    brief,
    input,
    role: "worker",
    timeout_ms: input.timeout_policy?.worker_timeout_ms,
    operation: (attemptContext) => input.executor.executeWorker(brief, attemptContext),
    failure_result: (error) => workerFailureResult(brief, error)
  })
}

async function runReviewerBrief(
  brief: WorkerBrief,
  input: RunExecutionPlanInput,
  context: ExecutorRunContext
): Promise<ReviewResult> {
  const executeReview = input.executor.executeReview
  if (executeReview === undefined) {
    throw new MissingReviewExecutorError(input.executor.provider)
  }

  return runWithPolicies({
    brief,
    input,
    role: "reviewer",
    timeout_ms: input.timeout_policy?.reviewer_timeout_ms,
    operation: (attemptContext) => executeReview.call(input.executor, brief, attemptContext),
    failure_result: (error) => reviewFailureResult(brief, error)
  })
}

type PolicyResult = WorkerResult | ReviewResult

type PolicyRunInput<T extends PolicyResult> = {
  readonly brief: WorkerBrief
  readonly input: RunExecutionPlanInput
  readonly role: "worker" | "reviewer"
  readonly timeout_ms: number | undefined
  readonly operation: (context: ExecutorRunContext) => Promise<T>
  readonly failure_result: (error: unknown) => T
}

async function runWithPolicies<T extends PolicyResult>(policyInput: PolicyRunInput<T>): Promise<T> {
  const retryPolicy = policyInput.input.retry_policy ?? { max_attempts: 1, delay_ms: 0 }
  const maxAttempts = Math.max(1, Math.floor(retryPolicy.max_attempts))
  emit(policyInput, `${policyInput.role}_started`, 1, "started")

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await runAttempt(policyInput.operation, policyInput.input, policyInput.brief.id, policyInput.timeout_ms)
      if (!isUnsuccessful(result)) {
        emit(policyInput, `${policyInput.role}_succeeded`, attempt, "succeeded")
        return result
      }

      if (result.retry_classification === "retryable" && attempt < maxAttempts) {
        emit(policyInput, `${policyInput.role}_retry`, attempt, result.output)
        await retryDelay(retryPolicy, attempt, policyInput.input.signal, policyInput.brief.id)
        continue
      }

      emit(policyInput, terminalEventType(policyInput.role, result.status), attempt, result.output)
      return result
    } catch (error) {
      const classification = classifyError(error, retryPolicy)
      if (classification === "retryable" && attempt < maxAttempts) {
        emit(policyInput, `${policyInput.role}_retry`, attempt, errorMessage(error))
        try {
          await retryDelay(retryPolicy, attempt, policyInput.input.signal, policyInput.brief.id)
        } catch (delayError) {
          const result = policyInput.failure_result(delayError)
          emit(policyInput, terminalEventType(policyInput.role, result.status), attempt, errorMessage(delayError))
          return result
        }
        continue
      }

      const result = policyInput.failure_result(error)
      emit(policyInput, terminalEventType(policyInput.role, result.status), attempt, errorMessage(error))
      return result
    }
  }

  throw new Error("Unreachable retry state.")
}

async function runAttempt<T>(
  operation: (context: ExecutorRunContext) => Promise<T>,
  input: RunExecutionPlanInput,
  briefId: string,
  timeoutMs: number | undefined
): Promise<T> {
  const parentSignal = input.signal
  if (isAborted(parentSignal)) {
    throw new ExecutorCancelledError(briefId)
  }

  const timeoutController = new AbortController()
  const signals = parentSignal === undefined ? [timeoutController.signal] : [parentSignal, timeoutController.signal]
  const signal = AbortSignal.any(signals)
  const context = buildRunContext(input, signal)
  let timer: ReturnType<typeof setTimeout> | undefined
  let rejectCancellation: ((error: ExecutorCancelledError) => void) | undefined
  const cancellation = new Promise<never>((_resolve, reject) => {
    rejectCancellation = reject
  })
  const onAbort = (): void => rejectCancellation?.(new ExecutorCancelledError(briefId))
  parentSignal?.addEventListener("abort", onAbort, { once: true })

  const timeout = new Promise<never>((_resolve, reject) => {
    if (timeoutMs === undefined) {
      return
    }
    timer = setTimeout(() => {
      const error = new ExecutorTimeoutError(briefId, timeoutMs)
      timeoutController.abort(error)
      reject(error)
    }, Math.max(0, timeoutMs))
  })

  try {
    return await Promise.race([operation(context), cancellation, timeout])
  } catch (error) {
    if (isAborted(parentSignal)) {
      throw new ExecutorCancelledError(briefId)
    }
    if (timeoutController.signal.aborted) {
      throw timeoutController.signal.reason
    }
    throw error
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer)
    }
    parentSignal?.removeEventListener("abort", onAbort)
  }
}

async function retryDelay(
  policy: RetryPolicy,
  failedAttempt: number,
  signal: AbortSignal | undefined,
  briefId: string
): Promise<void> {
  const multiplier = Math.max(1, policy.backoff_multiplier ?? 2)
  const maximum = Math.max(0, policy.max_delay_ms ?? 30_000)
  const base = Math.min(maximum, Math.max(0, policy.delay_ms) * multiplier ** (failedAttempt - 1))
  const jitterRatio = Math.min(1, Math.max(0, policy.jitter_ratio ?? 0.2))
  const random = Math.min(1, Math.max(0, (policy.random ?? Math.random)()))
  const delayMs = Math.round(base * (1 + (random * 2 - 1) * jitterRatio))
  if (delayMs <= 0) {
    return
  }
  if (signal?.aborted === true) {
    throw new ExecutorCancelledError(briefId)
  }

  await new Promise<void>((resolve, reject) => {
    const onComplete = (): void => {
      signal?.removeEventListener("abort", onAbort)
      resolve()
    }
    const timer = setTimeout(onComplete, delayMs)
    const onAbort = (): void => {
      clearTimeout(timer)
      signal?.removeEventListener("abort", onAbort)
      reject(new ExecutorCancelledError(briefId))
    }
    signal?.addEventListener("abort", onAbort, { once: true })
  })
}

function classifyError(error: unknown, retryPolicy: RetryPolicy): RetryClassification {
  if (
    error instanceof ExecutorCancelledError ||
    error instanceof ExecutorOutputLimitError ||
    error instanceof UnsupportedExecutorError
  ) {
    return "fatal"
  }
  return retryPolicy.classify_error?.(error) ?? "retryable"
}

function workerFailureResult(brief: WorkerBrief, error: unknown): WorkerResult {
  const message = errorMessage(error)
  return {
    worker_id: brief.id,
    status: error instanceof ExecutorCancelledError ? "cancelled" : error instanceof ExecutorTimeoutError ? "timed_out" : "failed",
    output: message,
    evidence: [],
    error: message
  }
}

function reviewFailureResult(brief: WorkerBrief, error: unknown): ReviewResult {
  const message = errorMessage(error)
  return {
    reviewer_id: brief.id,
    status: error instanceof ExecutorCancelledError ? "cancelled" : error instanceof ExecutorTimeoutError ? "timed_out" : "failed",
    output: message,
    findings: [message]
  }
}

function buildExecutionResult(
  input: RunExecutionPlanInput,
  workerResults: readonly WorkerResult[],
  reviewResult: ReviewResult | undefined
): ExecutionRunResult {
  const status = executionStatus(workerResults, reviewResult)
  const base = {
    status,
    worker_results: workerResults,
    synthesis_strategy: input.execution_plan.synthesis_strategy
  }
  return reviewResult === undefined ? base : { ...base, review_result: reviewResult }
}

function executionStatus(
  workerResults: readonly WorkerResult[],
  reviewResult: ReviewResult | undefined
): ExecutionRunStatus {
  const statuses = [...workerResults.map((result) => result.status), ...(reviewResult === undefined ? [] : [reviewResult.status])]
  if (statuses.includes("cancelled")) return "cancelled"
  if (statuses.includes("timed_out")) return "timed_out"
  if (statuses.includes("failed")) return "failed"
  return "completed"
}

function isUnsuccessful(result: PolicyResult): boolean {
  return result.status !== "succeeded" && result.status !== "passed"
}

function terminalEventType(role: "worker" | "reviewer", status: WorkerResultStatus | ReviewResultStatus): ExecutorEventType {
  if (status === "cancelled") return `${role}_cancelled`
  if (status === "timed_out") return `${role}_timed_out`
  return `${role}_failed`
}

function emit(
  policyInput: PolicyRunInput<PolicyResult>,
  type: ExecutorEventType,
  attempt: number,
  message: string
): void {
  policyInput.input.logger?.log({
    type,
    provider: policyInput.input.executor.provider,
    brief_id: policyInput.brief.id,
    attempt,
    model_id: policyInput.input.route.model_id,
    message: redactLogValue(message, "error", policyInput.input.log_policy)
  })
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown executor error."
}

function isAborted(signal: AbortSignal | undefined): boolean {
  return signal?.aborted === true
}

function buildRunContext(input: RunExecutionPlanInput, signal = input.signal): ExecutorRunContext {
  const base = { route: input.route }
  if (signal !== undefined && input.metadata !== undefined) return { ...base, signal, metadata: input.metadata }
  if (signal !== undefined) return { ...base, signal }
  if (input.metadata !== undefined) return { ...base, metadata: input.metadata }
  return base
}
