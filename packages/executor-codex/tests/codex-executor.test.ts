import { mkdtemp, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { buildCodexExecCommand, createCodexExecutor, spawnCodexProcess } from "../src/index.js"
import { ExecutorOutputLimitError } from "@model-orchestration/executor-core"
import type { ExecutorRunContext } from "@model-orchestration/executor-core"
import type { RouteDecision, WorkerBrief } from "@garida/types"

const route: RouteDecision = {
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
  model_id: "gpt-5.6-sol",
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
    expect(command.args[2]).toBe("gpt-5.6-sol")
    expect(command.args[3]).toContain("Implement routing")
    expect(command.display_command).toContain("codex exec --model gpt-5.6-sol")
    expect(command.display_command).not.toContain("Implement routing")
    expect(command.display_command).toContain("<prompt>")
  })

  it("includes extra non-interactive exec flags before the prompt", () => {
    const command = buildCodexExecCommand(brief, route, {
      codex_args: [
        "--sandbox",
        "workspace-write",
        "--dangerously-bypass-approvals-and-sandbox"
      ]
    })

    expect(command.args).toEqual([
      "exec",
      "--model",
      "gpt-5.6-sol",
      "--sandbox",
      "workspace-write",
      "--dangerously-bypass-approvals-and-sandbox",
      expect.stringContaining("Implement routing")
    ])
  })
})

describe("createCodexExecutor", () => {
  it("returns dry-run worker output with the planned command", async () => {
    const executor = createCodexExecutor()

    const result = await executor.executeWorker(brief, context)

    expect(result.status).toBe("succeeded")
    expect(result.output).toContain("codex exec --model gpt-5.6-sol")
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
    expect(calls[0]).toContain("codex exec --model gpt-5.6-sol")
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

describe("spawnCodexProcess", () => {
  it("terminates a real child process when its signal is aborted", async () => {
    const directory = await mkdtemp(join(tmpdir(), "codex-abort-"))
    const readyPath = join(directory, "ready")
    const terminatedPath = join(directory, "terminated")
    const script = [
      'const fs = require("node:fs")',
      'fs.writeFileSync(process.argv[1], "ready")',
      'process.on("SIGTERM", () => { fs.writeFileSync(process.argv[2], "terminated"); process.exit(0) })',
      "setInterval(() => {}, 1000)"
    ].join(";")
    const controller = new AbortController()
    const execution = spawnCodexProcess({
      command: process.execPath,
      args: ["-e", script, readyPath, terminatedPath],
      display_command: `${process.execPath} -e <script>`
    }, { route, signal: controller.signal })

    await waitForFile(readyPath, "ready")
    controller.abort()
    await expect(execution).rejects.toMatchObject({ name: "AbortError" })
    await waitForFile(terminatedPath, "terminated")
  })

  it("terminates a real child process when combined output exceeds the byte limit", async () => {
    const directory = await mkdtemp(join(tmpdir(), "codex-output-limit-"))
    const terminatedPath = join(directory, "terminated")
    const script = [
      'const fs = require("node:fs")',
      'process.on("SIGTERM", () => { fs.writeFileSync(process.argv[1], "terminated"); process.exit(0) })',
      'process.stdout.write("x".repeat(10_000))',
      "setInterval(() => {}, 1000)"
    ].join(";")

    await expect(spawnCodexProcess({
      command: process.execPath,
      args: ["-e", script, terminatedPath],
      display_command: `${process.execPath} -e <script>`
    }, { route }, 64)).rejects.toBeInstanceOf(ExecutorOutputLimitError)
    await waitForFile(terminatedPath, "terminated")
  })
})

async function waitForFile(path: string, expected: string): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      if (await readFile(path, "utf8") === expected) return
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error
    }
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error(`Timed out waiting for child-process marker '${path}'.`)
}
