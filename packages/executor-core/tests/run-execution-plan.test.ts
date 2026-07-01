import { describe, expect, it, vi } from "vitest"

import { ExecutorTimeoutError, runExecutionPlan } from "../src/index.js"
import type {
  AgentExecutor,
  ExecutorEvent,
  ExecutorRunContext,
  ReviewResult,
  WorkerResult
} from "../src/index.js"
import type { ExecutionPlan, RouteDecision, WorkerBrief } from "@model-orchestration/shared-types"

const route: RouteDecision = {
  model_class: "standard",
  provider: "openai_codex",
  model_id: "gpt-5.4",
  pricing_usd_per_1m_tokens: {
    input: 1,
    cached_input: null,
    output: 5
  },
  delegate: false,
  add_reviewer: true,
  matched_rules: ["test-rule"],
  routing_reason: "Testing executor core.",
  fallback: "Use standard route."
}

const workerBrief: WorkerBrief = {
  id: "worker-1",
  title: "Implement feature",
  objective: "Return a deterministic worker result.",
  model_class: "standard",
  provider: "openai_codex",
  model_id: "gpt-5.4",
  constraints: ["Stay scoped."],
  expected_output: "Worker output.",
  acceptance_criteria: ["Output exists."]
}

const reviewerBrief: WorkerBrief = {
  ...workerBrief,
  id: "reviewer-1",
  title: "Review feature"
}

const executionPlan: ExecutionPlan = {
  execution_mode: "direct",
  worker_briefs: [workerBrief],
  reviewer_brief: reviewerBrief,
  synthesis_strategy: "Return only after review."
}

const directExecutionPlan: ExecutionPlan = {
  execution_mode: "direct",
  worker_briefs: [workerBrief],
  synthesis_strategy: "Return direct result."
}

describe("runExecutionPlan", () => {
  it("runs workers and reviewer with the selected route", async () => {
    const executor: AgentExecutor = {
      provider: "mock",
      async executeWorker(brief: WorkerBrief, context: ExecutorRunContext): Promise<WorkerResult> {
        return {
          worker_id: brief.id,
          status: "succeeded",
          output: `${context.route.model_id}:${brief.title}`,
          evidence: ["worker-called"]
        }
      },
      async executeReview(brief: WorkerBrief, context: ExecutorRunContext): Promise<ReviewResult> {
        return {
          reviewer_id: brief.id,
          status: "passed",
          output: `${context.route.model_id}:${brief.title}`,
          findings: []
        }
      }
    }

    const result = await runExecutionPlan({
      execution_plan: executionPlan,
      route,
      executor
    })

    expect(result.worker_results).toHaveLength(1)
    expect(result.worker_results[0]?.output).toBe("gpt-5.4:Implement feature")
    expect(result.review_result?.status).toBe("passed")
    expect(result.synthesis_strategy).toBe("Return only after review.")
  })

  it("requires a review-capable executor when the plan has a reviewer", async () => {
    const executor: AgentExecutor = {
      provider: "mock",
      async executeWorker(brief: WorkerBrief): Promise<WorkerResult> {
        return {
          worker_id: brief.id,
          status: "succeeded",
          output: brief.title,
          evidence: []
        }
      }
    }

    await expect(
      runExecutionPlan({
        execution_plan: executionPlan,
        route,
        executor
      })
    ).rejects.toThrow("requires executeReview")
  })

  it("retries worker execution and emits structured log events", async () => {
    const events: ExecutorEvent[] = []
    let calls = 0
    const executor: AgentExecutor = {
      provider: "mock",
      async executeWorker(brief: WorkerBrief): Promise<WorkerResult> {
        calls += 1
        if (calls === 1) {
          throw new Error("temporary failure")
        }

        return {
          worker_id: brief.id,
          status: "succeeded",
          output: "retried worker",
          evidence: []
        }
      }
    }

    const result = await runExecutionPlan({
      execution_plan: directExecutionPlan,
      route,
      executor,
      retry_policy: {
        max_attempts: 2,
        delay_ms: 0
      },
      logger: {
        log(event: ExecutorEvent): void {
          events.push(event)
        }
      }
    })

    expect(result.worker_results[0]?.output).toBe("retried worker")
    expect(calls).toBe(2)
    expect(events.map((event) => event.type)).toEqual([
      "worker_started",
      "worker_retry",
      "worker_succeeded"
    ])
  })

  it("fails worker execution when timeout expires", async () => {
    vi.useFakeTimers()
    const executor: AgentExecutor = {
      provider: "mock",
      async executeWorker(): Promise<WorkerResult> {
        await new Promise((resolve) => setTimeout(resolve, 10_000))
        return {
          worker_id: "worker-1",
          status: "succeeded",
          output: "too late",
          evidence: []
        }
      }
    }

    try {
      const promise = runExecutionPlan({
        execution_plan: directExecutionPlan,
        route,
        executor,
        timeout_policy: {
          worker_timeout_ms: 50
        }
      })
      const assertion = expect(promise).rejects.toBeInstanceOf(ExecutorTimeoutError)

      await vi.advanceTimersByTimeAsync(51)

      await assertion
    } finally {
      vi.useRealTimers()
    }
  })
})
