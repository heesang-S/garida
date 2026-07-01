import { describe, expect, it } from "vitest"

import { formatExecutionEvalReport, summarizeExecutionLogs } from "../src/index.js"
import type { ExecutionLogEntry } from "../src/index.js"
import type { ExecutionPlan, RouteDecision, WorkerBrief } from "@model-orchestration/shared-types"

const openAiRoute: RouteDecision = {
  model_class: "standard",
  provider: "openai_codex",
  model_id: "gpt-5.4",
  pricing_usd_per_1m_tokens: {
    input: 2.5,
    cached_input: 0.25,
    output: 15
  },
  delegate: false,
  add_reviewer: false,
  matched_rules: ["default"],
  routing_reason: "Test route.",
  fallback: "Fallback."
}

const anthropicRoute: RouteDecision = {
  ...openAiRoute,
  provider: "anthropic_claude",
  model_id: "claude-opus-4-8"
}

const workerBrief: WorkerBrief = {
  id: "worker-1",
  title: "Worker",
  objective: "Produce output.",
  model_class: "standard",
  provider: "openai_codex",
  model_id: "gpt-5.4",
  constraints: ["Stay scoped."],
  expected_output: "Output.",
  acceptance_criteria: ["Output exists."]
}

const executionPlan: ExecutionPlan = {
  execution_mode: "direct",
  worker_briefs: [workerBrief],
  synthesis_strategy: "Summarize."
}

const entries: readonly ExecutionLogEntry[] = [
  {
    run_id: "run-openai",
    status: "completed",
    provider: "openai",
    model_id: "gpt-5.4",
    route: openAiRoute,
    execution_plan: executionPlan,
    worker_results: [
      {
        worker_id: "worker-1",
        status: "succeeded",
        output: "ok",
        evidence: ["test"],
        usage: {
          input_tokens: 100,
          cached_input_tokens: 0,
          output_tokens: 50,
          total_tokens: 150
        },
        cost: {
          input_usd: 0.001,
          cached_input_usd: 0,
          output_usd: 0.005,
          total_usd: 0.006
        }
      }
    ],
    synthesis_strategy: "Summarize.",
    started_at_ms: 0,
    completed_at_ms: 10,
    duration_ms: 10
  },
  {
    run_id: "run-anthropic",
    status: "completed",
    provider: "anthropic",
    model_id: "claude-opus-4-8",
    route: anthropicRoute,
    execution_plan: executionPlan,
    worker_results: [
      {
        worker_id: "worker-1",
        status: "failed",
        output: "failed",
        evidence: ["test"],
        usage: {
          input_tokens: 100,
          cached_input_tokens: 0,
          output_tokens: 50,
          total_tokens: 150
        },
        cost: {
          input_usd: 0.001,
          cached_input_usd: 0,
          output_usd: 0.002,
          total_usd: 0.003
        },
        error: "failed"
      }
    ],
    synthesis_strategy: "Summarize.",
    started_at_ms: 10,
    completed_at_ms: 30,
    duration_ms: 20
  }
]

describe("eval report", () => {
  it("summarizes execution logs by totals and provider", () => {
    const report = summarizeExecutionLogs(entries)

    expect(report.total_runs).toBe(2)
    expect(report.completed_runs).toBe(2)
    expect(report.failed_worker_results).toBe(1)
    expect(report.total_duration_ms).toBe(30)
    expect(report.total_tokens).toBe(300)
    expect(report.total_cost_usd).toBe(0.009)
    expect(report.by_provider).toEqual([
      { provider: "anthropic", runs: 1, worker_failures: 1, total_cost_usd: 0.003 },
      { provider: "openai", runs: 1, worker_failures: 0, total_cost_usd: 0.006 }
    ])
  })

  it("formats execution eval reports as deterministic text", () => {
    const report = summarizeExecutionLogs(entries)
    const output = formatExecutionEvalReport(report)

    expect(output).toContain("Execution Eval Report")
    expect(output).toContain("Total runs: 2")
    expect(output).toContain("Total cost USD: 0.009")
    expect(output).toContain("openai | runs=1 | worker_failures=0 | cost_usd=0.006")
  })
})
