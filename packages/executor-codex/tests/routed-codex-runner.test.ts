import { describe, expect, it } from "vitest"

import {
  runRoutedCodexExecution,
  type CodexExecCommand
} from "../src/index.js"
import type { ExecutorRunContext } from "@model-orchestration/executor-core"
import type { ExecutionPlan, RouteDecision, WorkerBrief } from "@model-orchestration/shared-types"

const route: RouteDecision = {
  model_class: "strong",
  provider: "openai_codex",
  model_id: "gpt-5.5",
  pricing_usd_per_1m_tokens: {
    input: 3,
    cached_input: 0.3,
    output: 15
  },
  delegate: true,
  add_reviewer: true,
  matched_rules: ["complex"],
  routing_reason: "Needs stronger Codex model.",
  fallback: "Use current model if model selection is unavailable."
}

const workerBrief: WorkerBrief = {
  id: "worker-1",
  title: "Implement routing",
  objective: "Create the next executor package.",
  model_class: "strong",
  provider: "openai_codex",
  model_id: "gpt-5.5",
  constraints: ["No provider API keys."],
  expected_output: "Working executor package.",
  acceptance_criteria: ["Command uses routed model."]
}

const reviewerBrief: WorkerBrief = {
  ...workerBrief,
  id: "reviewer-1",
  title: "Review routing"
}

const directPlan: ExecutionPlan = {
  execution_mode: "direct",
  worker_briefs: [workerBrief],
  synthesis_strategy: "Return direct result."
}

const reviewedPlan: ExecutionPlan = {
  execution_mode: "direct",
  worker_briefs: [workerBrief],
  reviewer_brief: reviewerBrief,
  synthesis_strategy: "Return only after review."
}

describe("runRoutedCodexExecution", () => {
  it("returns worker results for a worker-only plan in dry-run mode", async () => {
    const result = await runRoutedCodexExecution({
      route,
      execution_plan: directPlan
    })

    expect(result.worker_results).toHaveLength(1)
    expect(result.worker_results[0]?.status).toBe("succeeded")
    expect(result.worker_results[0]?.output).toContain("codex exec --model gpt-5.5")
    expect(result.review_result).toBeUndefined()
    expect(result.synthesis_strategy).toBe("Return direct result.")
  })

  it("returns reviewer output when the execution plan includes a reviewer", async () => {
    const result = await runRoutedCodexExecution({
      route,
      execution_plan: reviewedPlan
    })

    expect(result.worker_results).toHaveLength(1)
    expect(result.review_result?.status).toBe("passed")
    expect(result.review_result?.output).toContain("codex exec --model gpt-5.5")
  })

  it("uses the routed model in execute mode", async () => {
    const calls: string[] = []
    const result = await runRoutedCodexExecution({
      route,
      execution_plan: directPlan,
      mode: "execute",
      process_runner: async (
        command: CodexExecCommand,
        _context: ExecutorRunContext
      ) => {
        calls.push(command.display_command)
        return {
          exit_code: 0,
          stdout: "worker result",
          stderr: ""
        }
      }
    })

    expect(calls).toHaveLength(1)
    expect(calls[0]).toContain("codex exec --model gpt-5.5")
    expect(result.worker_results[0]?.output).toBe("worker result")
  })

  it("maps a non-zero process exit into a failed worker result", async () => {
    const result = await runRoutedCodexExecution({
      route,
      execution_plan: directPlan,
      mode: "execute",
      process_runner: async () => ({
        exit_code: 2,
        stdout: "",
        stderr: "codex failed"
      })
    })

    expect(result.worker_results[0]?.status).toBe("failed")
    expect(result.worker_results[0]?.error).toBe("codex failed")
  })
})
