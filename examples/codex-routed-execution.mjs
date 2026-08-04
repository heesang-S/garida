import { spawn } from "node:child_process"

import { runRoutedCodexExecution } from "../packages/executor-codex/dist/src/index.js"

const route = {
  model_class: "strong",
  provider: "openai_codex",
  model_id: "gpt-5.6-sol",
  pricing_usd_per_1m_tokens: {
    input: 3,
    cached_input: 0.3,
    output: 15
  },
  delegate: true,
  add_reviewer: true,
  matched_rules: ["complex"],
  routing_reason: "Needs a stronger Codex worker and reviewer.",
  fallback: "Use the current model only if a routed worker cannot be started."
}

const executionPlan = {
  execution_mode: "direct",
  worker_briefs: [
    {
      id: "worker-1",
      title: "Implement routing bridge",
      objective: "Bridge prepare_execution output to separate Codex workers.",
      model_class: "strong",
      provider: "openai_codex",
      model_id: "gpt-5.6-sol",
      constraints: [
        "Keep the plugin thin.",
        "Reuse executor-core orchestration."
      ],
      expected_output: "Working routed Codex execution helper.",
      acceptance_criteria: [
        "Uses codex exec with the routed model.",
        "Returns structured worker results."
      ]
    }
  ],
  reviewer_brief: {
    id: "reviewer-1",
    title: "Review routing bridge",
    objective: "Review the routed worker execution path for regressions.",
    model_class: "strong",
    provider: "openai_codex",
    model_id: "gpt-5.6-sol",
    constraints: ["Focus on execution and result-shape correctness."],
    expected_output: "A pass/fail review result.",
    acceptance_criteria: ["Calls out any execution-path regressions."]
  },
  synthesis_strategy: "Combine worker and reviewer results into one final response."
}

function createConsoleLogger() {
  return {
    log(event) {
      const timestamp = new Date().toISOString()
      console.log(
        `[${timestamp}] [${event.type}] brief=${event.brief_id} attempt=${event.attempt} model=${event.model_id} ${event.message}`
      )
    }
  }
}

function runLoggedCodexProcess(command, context) {
  return new Promise((resolve, reject) => {
    const startedAtMs = Date.now()
    console.log(`[codex-process] spawning: ${command.display_command}`)

    const child = spawn(command.command, command.args, {
      stdio: ["ignore", "pipe", "pipe"],
      signal: context.signal
    })

    const stdoutChunks = []
    const stderrChunks = []

    child.stdout.on("data", (chunk) => {
      stdoutChunks.push(chunk)
      process.stdout.write(`[codex stdout] ${chunk.toString("utf8")}`)
    })
    child.stderr.on("data", (chunk) => {
      stderrChunks.push(chunk)
      process.stderr.write(`[codex stderr] ${chunk.toString("utf8")}`)
    })
    child.on("error", (error) => {
      console.error(`[codex-process] spawn error: ${error.message}`)
      reject(error)
    })
    child.on("close", (code) => {
      const durationMs = Date.now() - startedAtMs
      console.log(`[codex-process] finished exit_code=${code ?? 1} duration_ms=${durationMs}`)
      resolve({
        exit_code: code ?? 1,
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8")
      })
    })
  })
}

console.log("[example] starting routed Codex execution")

const result = await runRoutedCodexExecution({
  route,
  execution_plan: executionPlan,
  mode: "execute",
  codex_command: process.env.GARIDA_CODEX_COMMAND ?? "codex",
  codex_args: [
    "--sandbox",
    "workspace-write",
    "--json"
  ],
  timeout_policy: {
    worker_timeout_ms: 600_000,
    reviewer_timeout_ms: 600_000
  },
  logger: createConsoleLogger(),
  process_runner: runLoggedCodexProcess
})

console.log("[example] routed Codex execution complete")
console.log(JSON.stringify(result, null, 2))
