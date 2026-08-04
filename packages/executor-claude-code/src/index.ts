import type { AgentExecutor, ExecutorRunContext, ReviewResult, WorkerResult } from "@model-orchestration/executor-core"
import type { WorkerBrief } from "@garida/types"

const UNSUPPORTED_MESSAGE =
  "Claude Code runtime/model selection API is not configured for this executor. Use this stub for planning only."

export function createClaudeCodeExecutor(): AgentExecutor {
  return {
    provider: "claude-code",
    async executeWorker(brief: WorkerBrief, context: ExecutorRunContext): Promise<WorkerResult> {
      return unsupportedWorkerResult(brief, context)
    },
    async executeReview(brief: WorkerBrief, context: ExecutorRunContext): Promise<ReviewResult> {
      return unsupportedReviewResult(brief, context)
    }
  }
}

function unsupportedWorkerResult(brief: WorkerBrief, context: ExecutorRunContext): WorkerResult {
  return {
    worker_id: brief.id,
    status: "failed",
    output: unsupportedOutput(context),
    evidence: ["claude-code-executor-unsupported"],
    error: UNSUPPORTED_MESSAGE
  }
}

function unsupportedReviewResult(brief: WorkerBrief, context: ExecutorRunContext): ReviewResult {
  return {
    reviewer_id: brief.id,
    status: "failed",
    output: unsupportedOutput(context),
    findings: [UNSUPPORTED_MESSAGE]
  }
}

function unsupportedOutput(context: ExecutorRunContext): string {
  return `${UNSUPPORTED_MESSAGE} Requested routed model: ${context.route.model_id}.`
}
