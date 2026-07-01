import { mkdtemp } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { describe, expect, it } from "vitest"

import { createJsonlExecutionLogStore, createMemoryExecutionLogStore, runExecutionPlan } from "../src/index.js"
import type { AgentExecutor, ExecutorRunContext, WorkerResult } from "../src/index.js"
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
  add_reviewer: false,
  matched_rules: ["test-rule"],
  routing_reason: "Testing execution logging.",
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

const executionPlan: ExecutionPlan = {
  execution_mode: "direct",
  worker_briefs: [workerBrief],
  synthesis_strategy: "Return direct result."
}

describe("execution log store", () => {
  it("records a completed execution run when a log store is provided", async () => {
    let nowMs = 100
    const store = createMemoryExecutionLogStore()
    const executor: AgentExecutor = {
      provider: "mock",
      async executeWorker(brief: WorkerBrief, context: ExecutorRunContext): Promise<WorkerResult> {
        nowMs = 125
        return {
          worker_id: brief.id,
          status: "succeeded",
          output: context.route.model_id,
          evidence: ["worker-called"]
        }
      }
    }

    await runExecutionPlan({
      execution_plan: executionPlan,
      route,
      executor,
      run_id: "run-1",
      clock: {
        now(): number {
          return nowMs
        }
      },
      execution_log_store: store
    })

    const entries = await store.list()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      run_id: "run-1",
      provider: "mock",
      model_id: "gpt-5.4",
      status: "completed",
      started_at_ms: 100,
      completed_at_ms: 125,
      duration_ms: 25,
      synthesis_strategy: "Return direct result."
    })
    expect(entries[0]?.worker_results[0]?.output).toBe("gpt-5.4")
  })

  it("persists completed execution records to a JSONL file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "executor-log-"))
    const logPath = join(directory, "runs.jsonl")
    const store = createJsonlExecutionLogStore(logPath)
    const executor: AgentExecutor = {
      provider: "mock",
      async executeWorker(brief: WorkerBrief, context: ExecutorRunContext): Promise<WorkerResult> {
        return {
          worker_id: brief.id,
          status: "succeeded",
          output: context.route.model_id,
          evidence: ["worker-called"]
        }
      }
    }

    await runExecutionPlan({
      execution_plan: executionPlan,
      route,
      executor,
      run_id: "run-jsonl",
      clock: {
        now(): number {
          return 200
        }
      },
      execution_log_store: store
    })

    const reopenedStore = createJsonlExecutionLogStore(logPath)
    const entries = await reopenedStore.list()
    expect(entries).toHaveLength(1)
    expect(entries[0]?.run_id).toBe("run-jsonl")
    expect(await reopenedStore.get("run-jsonl")).toMatchObject({
      provider: "mock",
      model_id: "gpt-5.4"
    })
  })
})
