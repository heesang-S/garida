import { describe, expect, it } from "vitest"

import { buildCodexExecCommand, createCodexExecutor } from "../src/index.js"
import type { ExecutorRunContext } from "@model-orchestration/executor-core"
import type { RouteDecision, WorkerBrief } from "@model-orchestration/shared-types"

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
  add_reviewer: false,
  matched_rules: ["complex"],
  routing_reason: "Needs stronger Codex model.",
  fallback: "Use current model if model selection is unavailable."
}

const brief: WorkerBrief = {
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

const context: ExecutorRunContext = {
  route
}

describe("buildCodexExecCommand", () => {
  it("builds a codex exec command with the routed model and brief prompt", () => {
    const command = buildCodexExecCommand(brief, route)

    expect(command.command).toBe("codex")
    expect(command.args[0]).toBe("exec")
    expect(command.args[1]).toBe("--model")
    expect(command.args[2]).toBe("gpt-5.5")
    expect(command.args[3]).toContain("Implement routing")
    expect(command.display_command).toContain("codex exec --model gpt-5.5")
  })
})

describe("createCodexExecutor", () => {
  it("returns dry-run worker output with the planned command", async () => {
    const executor = createCodexExecutor()

    const result = await executor.executeWorker(brief, context)

    expect(result.status).toBe("succeeded")
    expect(result.output).toContain("codex exec --model gpt-5.5")
    expect(result.evidence).toContain("codex-executor-dry-run")
  })

  it("executes a supplied process runner when execution mode is enabled", async () => {
    const calls: string[] = []
    const executor = createCodexExecutor({
      mode: "execute",
      process_runner: async (command) => {
        calls.push(command.display_command)
        return {
          exit_code: 0,
          stdout: "worker result",
          stderr: ""
        }
      }
    })

    const result = await executor.executeWorker(brief, context)

    expect(calls).toHaveLength(1)
    expect(calls[0]).toContain("codex exec --model gpt-5.5")
    expect(result.status).toBe("succeeded")
    expect(result.output).toBe("worker result")
    expect(result.evidence).toContain("codex-executor-process")
  })

  it("maps a non-zero Codex exit into a failed worker result", async () => {
    const executor = createCodexExecutor({
      mode: "execute",
      process_runner: async () => ({
        exit_code: 2,
        stdout: "",
        stderr: "codex failed"
      })
    })

    const result = await executor.executeWorker(brief, context)

    expect(result.status).toBe("failed")
    expect(result.error).toBe("codex failed")
  })
})
