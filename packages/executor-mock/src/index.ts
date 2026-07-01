import type {
  AgentExecutor,
  ExecutorRunContext,
  ReviewResult,
  ReviewResultStatus,
  WorkerResult,
  WorkerResultStatus
} from "@model-orchestration/executor-core"
import type { WorkerBrief } from "@model-orchestration/shared-types"

export type MockExecutorOptions = {
  readonly worker_status?: WorkerResultStatus
  readonly worker_error?: string
  readonly review_status?: ReviewResultStatus
  readonly review_findings?: readonly string[]
}

export function createMockExecutor(options: MockExecutorOptions = {}): AgentExecutor {
  return {
    provider: "mock",
    async executeWorker(brief: WorkerBrief, context: ExecutorRunContext): Promise<WorkerResult> {
      return createWorkerResult(brief, context, options)
    },
    async executeReview(brief: WorkerBrief, context: ExecutorRunContext): Promise<ReviewResult> {
      return createReviewResult(brief, context, options)
    }
  }
}

function createWorkerResult(
  brief: WorkerBrief,
  context: ExecutorRunContext,
  options: MockExecutorOptions
): WorkerResult {
  const status = options.worker_status ?? "succeeded"
  const output = [
    `Mock worker ${brief.id} completed '${brief.title}'.`,
    `Model: ${context.route.model_id}.`,
    `Objective: ${brief.objective}`
  ].join(" ")

  if (options.worker_error === undefined) {
    return {
      worker_id: brief.id,
      status,
      output,
      evidence: ["mock-executor"]
    }
  }

  return {
    worker_id: brief.id,
    status,
    output,
    evidence: ["mock-executor"],
    error: options.worker_error
  }
}

function createReviewResult(
  brief: WorkerBrief,
  context: ExecutorRunContext,
  options: MockExecutorOptions
): ReviewResult {
  const findings = options.review_findings ?? []

  return {
    reviewer_id: brief.id,
    status: options.review_status ?? "passed",
    output: `Mock reviewer ${brief.id} checked '${brief.title}' for ${context.route.model_id}.`,
    findings
  }
}
