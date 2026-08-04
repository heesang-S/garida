import type { CodexExecCommand } from "@model-orchestration/executor-codex"
import type { ExecutorRunContext } from "@model-orchestration/executor-core"
import type { PreparedAgentExecution } from "@garida/core"
import { describe, expect, it } from "vitest"

import {
  orchestratePreparedCodexExecution,
  runPreparedCodexExecution
} from "../src/index.js"

const preparedExecution: PreparedAgentExecution = {
  assessment: {
    task_type: "coding",
    complexity: "high",
    risk: "medium",
    context_size: "medium",
    tool_need: "heavy",
    parallelizable: true,
    requires_subagents: true,
    confidence: 0.91,
    reasoning: "Complex implementation benefits from routed worker execution."
  },
  route: {
    model_class: "strong",
    provider: "openai_codex",
    model_id: "gpt-5.6-sol",
    pricing_usd_per_1m_tokens: {
      input: 3,
      cached_input: 0.3,
      output: 15
    },
    delegate: true,
    add_reviewer: false,
    matched_rules: ["complex_task"],
    routing_reason: "Use a stronger Codex model for high-complexity coding.",
    fallback: "Use the current model only if a routed worker cannot start."
  },
  execution_plan: {
    execution_mode: "delegated",
    worker_briefs: [
      {
        id: "worker-1",
        title: "Implement routing bridge",
        objective: "Bridge prepare_execution output to separate Codex workers.",
        model_class: "strong",
        provider: "openai_codex",
        model_id: "gpt-5.6-sol",
        constraints: ["Keep the plugin thin.", "Reuse executor-core orchestration."],
        expected_output: "Working routed Codex execution helper.",
        acceptance_criteria: [
          "Uses codex exec with the routed model.",
          "Returns structured worker results."
        ]
      }
    ],
    synthesis_strategy: "Return structured worker results for synthesis."
  }
}

describe("runPreparedCodexExecution", () => {
  it("returns structured worker results when prepare_execution is routed to Codex exec", async () => {
    const commands: string[] = []

    const result = await runPreparedCodexExecution({
      prepared_execution: preparedExecution,
      mode: "execute",
      codex_args: ["--sandbox", "workspace-write"],
      process_runner: async (
        command: CodexExecCommand,
        _context: ExecutorRunContext
      ) => {
        commands.push(command.display_command)
        return {
          exit_code: 0,
          stdout: "worker completed",
          stderr: ""
        }
      }
    })

    expect(commands).toHaveLength(1)
    expect(commands[0]).toContain("codex exec --model gpt-5.6-sol")
    expect(commands[0]).toContain("--sandbox workspace-write")
    expect(result.worker_results).toEqual([
      {
        worker_id: "worker-1",
        status: "succeeded",
        output: "worker completed",
        evidence: ["codex-executor-process", commands[0]]
      }
    ])
    expect(result.synthesis_strategy).toBe("Return structured worker results for synthesis.")
  })
})

describe("orchestratePreparedCodexExecution", () => {
  it("returns an inline decision when the routed model matches the current chat model", async () => {
    const result = await orchestratePreparedCodexExecution({
      prepared_execution: preparedExecution,
      current_model_id: "gpt-5.6-sol"
    })

    expect(result.kind).toBe("inline")
    expect(result.route.model_id).toBe("gpt-5.6-sol")
    expect(result.distribution).toEqual({
      execution_mode: "delegated",
      worker_count: 1,
      reviewer_count: 0,
      delegate: true,
      add_reviewer: false,
      worker_model_ids: ["gpt-5.6-sol"]
    })
  })

  it("runs a separate routed worker when the routed model differs from the current chat model", async () => {
    const commands: string[] = []

    const result = await orchestratePreparedCodexExecution({
      prepared_execution: preparedExecution,
      current_model_id: "gpt-5.6-terra",
      mode: "execute",
      process_runner: async (
        command: CodexExecCommand,
        _context: ExecutorRunContext
      ) => {
        commands.push(command.display_command)
        return {
          exit_code: 0,
          stdout: "worker completed",
          stderr: ""
        }
      }
    })

    expect(result.kind).toBe("routed_worker")
    if (result.kind !== "routed_worker") {
      throw new Error("Expected routed_worker decision.")
    }
    expect(commands).toHaveLength(1)
    expect(commands[0]).toContain("codex exec --model gpt-5.6-sol")
    expect(result.distribution).toEqual({
      execution_mode: "delegated",
      worker_count: 1,
      reviewer_count: 0,
      delegate: true,
      add_reviewer: false,
      worker_model_ids: ["gpt-5.6-sol"]
    })
    expect(result.execution_result.worker_results[0]?.output).toBe("worker completed")
  })
})
