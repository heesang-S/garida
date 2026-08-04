import { describe, expect, it, vi } from "vitest"

import {
  UnsupportedExecutorError,
  createUnsupportedExecutor,
  runExecutionPlan
} from "../src/index.js"
import type {
  AgentExecutor,
  ExecutorEvent,
  ExecutorRunContext,
  ReviewResult,
  WorkerResult
} from "../src/index.js"
import type { ExecutionPlan, RouteDecision, WorkerBrief } from "@garida/types"

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

  it("records a failed worker without retrying when the retry classifier marks an error fatal", async () => {
    let calls = 0
    const executor: AgentExecutor = {
      provider: "mock",
      async executeWorker(): Promise<WorkerResult> {
        calls += 1
        throw new Error("auth failed")
      }
    }

    const result = await runExecutionPlan({
      execution_plan: directExecutionPlan,
      route,
      executor,
      retry_policy: {
        max_attempts: 3,
        delay_ms: 0,
        classify_error(): "fatal" {
          return "fatal"
        }
      }
    })

    expect(calls).toBe(1)
    expect(result.status).toBe("failed")
    expect(result.worker_results[0]).toMatchObject({ status: "failed", error: "auth failed" })
  })

  it("aborts and records worker execution when timeout expires", async () => {
    vi.useFakeTimers()
    let observedAbort = false
    const executor: AgentExecutor = {
      provider: "abort-aware",
      async executeWorker(_brief, context): Promise<WorkerResult> {
        return new Promise((_resolve, reject) => {
          context.signal?.addEventListener("abort", () => {
            observedAbort = true
            reject(context.signal?.reason)
          }, { once: true })
        })
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
      await vi.advanceTimersByTimeAsync(51)
      const result = await promise
      expect(observedAbort).toBe(true)
      expect(result.status).toBe("timed_out")
      expect(result.worker_results[0]?.status).toBe("timed_out")
    } finally {
      vi.useRealTimers()
    }
  })

  it("propagates caller cancellation to an abort-aware executor", async () => {
    const controller = new AbortController()
    let observedSignal: AbortSignal | undefined
    const executor: AgentExecutor = {
      provider: "abort-aware",
      async executeWorker(_brief, context): Promise<WorkerResult> {
        observedSignal = context.signal
        return new Promise((_resolve, reject) => {
          context.signal?.addEventListener("abort", () => reject(context.signal?.reason), { once: true })
        })
      }
    }

    const promise = runExecutionPlan({
      execution_plan: directExecutionPlan,
      route,
      executor,
      signal: controller.signal
    })
    controller.abort()

    const result = await promise
    expect(observedSignal?.aborted).toBe(true)
    expect(result.status).toBe("cancelled")
    expect(result.worker_results[0]?.status).toBe("cancelled")
  })

  it("runs only explicitly independent workers concurrently and respects the cap", async () => {
    const briefs = Array.from({ length: 5 }, (_, index) => ({
      ...workerBrief,
      id: `worker-${index + 1}`
    }))
    let active = 0
    let maximumActive = 0
    const releases: Array<() => void> = []
    const executor: AgentExecutor = {
      provider: "mock",
      async executeWorker(brief): Promise<WorkerResult> {
        active += 1
        maximumActive = Math.max(maximumActive, active)
        await new Promise<void>((resolve) => releases.push(resolve))
        active -= 1
        return { worker_id: brief.id, status: "succeeded", output: brief.id, evidence: [] }
      }
    }
    const promise = runExecutionPlan({
      execution_plan: { ...directExecutionPlan, worker_briefs: briefs },
      route,
      executor,
      concurrency_policy: {
        max_concurrency: 2,
        independent_worker_ids: briefs.map((brief) => brief.id)
      }
    })

    await vi.waitFor(() => expect(releases).toHaveLength(2))
    releases.splice(0).forEach((release) => release())
    await vi.waitFor(() => expect(releases).toHaveLength(2))
    releases.splice(0).forEach((release) => release())
    await vi.waitFor(() => expect(releases).toHaveLength(1))
    releases.splice(0).forEach((release) => release())

    const result = await promise
    expect(maximumActive).toBe(2)
    expect(result.worker_results.map((worker) => worker.worker_id)).toEqual(briefs.map((brief) => brief.id))
  })

  it("keeps dependent workers sequential even when the concurrency cap is higher", async () => {
    const secondBrief = { ...workerBrief, id: "worker-2" }
    let active = 0
    let maximumActive = 0
    const executor: AgentExecutor = {
      provider: "mock",
      async executeWorker(brief): Promise<WorkerResult> {
        active += 1
        maximumActive = Math.max(maximumActive, active)
        await Promise.resolve()
        active -= 1
        return { worker_id: brief.id, status: "succeeded", output: brief.id, evidence: [] }
      }
    }

    await runExecutionPlan({
      execution_plan: { ...directExecutionPlan, worker_briefs: [workerBrief, secondBrief] },
      route,
      executor,
      concurrency_policy: { max_concurrency: 10 }
    })
    expect(maximumActive).toBe(1)
  })

  it("retries retryable failed results and keeps fatal partial failures", async () => {
    const secondBrief = { ...workerBrief, id: "worker-2" }
    const attempts = new Map<string, number>()
    const executor: AgentExecutor = {
      provider: "mock",
      async executeWorker(brief): Promise<WorkerResult> {
        const attempt = (attempts.get(brief.id) ?? 0) + 1
        attempts.set(brief.id, attempt)
        if (brief.id === "worker-1" && attempt === 1) {
          return {
            worker_id: brief.id,
            status: "failed",
            output: "rate limited",
            evidence: [],
            retry_classification: "retryable"
          }
        }
        if (brief.id === "worker-2") {
          return {
            worker_id: brief.id,
            status: "failed",
            output: "bad request",
            evidence: [],
            retry_classification: "fatal"
          }
        }
        return { worker_id: brief.id, status: "succeeded", output: "ok", evidence: [] }
      }
    }

    const result = await runExecutionPlan({
      execution_plan: { ...directExecutionPlan, worker_briefs: [workerBrief, secondBrief] },
      route,
      executor,
      retry_policy: { max_attempts: 3, delay_ms: 0 }
    })

    expect(attempts.get("worker-1")).toBe(2)
    expect(attempts.get("worker-2")).toBe(1)
    expect(result.status).toBe("failed")
    expect(result.worker_results.map((worker) => worker.status)).toEqual(["succeeded", "failed"])
  })

  it("fails unsupported executors with a typed error", async () => {
    await expect(runExecutionPlan({
      execution_plan: directExecutionPlan,
      route,
      executor: createUnsupportedExecutor("future-provider", "runtime is not configured")
    })).rejects.toBeInstanceOf(UnsupportedExecutorError)
  })
})
