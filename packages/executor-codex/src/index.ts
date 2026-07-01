import { spawn } from "node:child_process"
import type { AgentExecutor, ExecutorRunContext, ReviewResult, WorkerResult } from "@model-orchestration/executor-core"
import type { RouteDecision, WorkerBrief } from "@model-orchestration/shared-types"

export const CODEX_EXECUTOR_MODES = ["dry_run", "execute"] as const

export type CodexExecutorMode = (typeof CODEX_EXECUTOR_MODES)[number]

export type CodexExecCommand = {
  readonly command: string
  readonly args: readonly string[]
  readonly display_command: string
}

export type CodexProcessResult = {
  readonly exit_code: number
  readonly stdout: string
  readonly stderr: string
}

export type CodexProcessRunner = (
  command: CodexExecCommand,
  context: ExecutorRunContext
) => Promise<CodexProcessResult>

export type CodexExecutorOptions = {
  readonly codex_command?: string
  readonly mode?: CodexExecutorMode
  readonly process_runner?: CodexProcessRunner
}

export function createCodexExecutor(options: CodexExecutorOptions = {}): AgentExecutor {
  return {
    provider: "codex",
    async executeWorker(brief: WorkerBrief, context: ExecutorRunContext): Promise<WorkerResult> {
      const command = buildCodexExecCommand(brief, context.route, options)
      if (options.mode === "execute") {
        const result = await runCodexCommand(command, context, options)
        return codexProcessToWorkerResult(brief, command, result)
      }

      return {
        worker_id: brief.id,
        status: "succeeded",
        output: `Dry run planned: ${command.display_command}`,
        evidence: ["codex-executor-dry-run", command.display_command]
      }
    },
    async executeReview(brief: WorkerBrief, context: ExecutorRunContext): Promise<ReviewResult> {
      const command = buildCodexExecCommand(brief, context.route, options)
      if (options.mode === "execute") {
        const result = await runCodexCommand(command, context, options)
        return codexProcessToReviewResult(brief, command, result)
      }

      return {
        reviewer_id: brief.id,
        status: "passed",
        output: `Dry run planned reviewer: ${command.display_command}`,
        findings: []
      }
    }
  }
}

async function runCodexCommand(
  command: CodexExecCommand,
  context: ExecutorRunContext,
  options: CodexExecutorOptions
): Promise<CodexProcessResult> {
  const runner = options.process_runner ?? spawnCodexProcess
  return runner(command, context)
}

function codexProcessToWorkerResult(
  brief: WorkerBrief,
  command: CodexExecCommand,
  result: CodexProcessResult
): WorkerResult {
  const output = result.stdout === "" ? result.stderr : result.stdout
  if (result.exit_code === 0) {
    return {
      worker_id: brief.id,
      status: "succeeded",
      output,
      evidence: ["codex-executor-process", command.display_command]
    }
  }

  return {
    worker_id: brief.id,
    status: "failed",
    output,
    evidence: ["codex-executor-process", command.display_command],
    error: result.stderr === "" ? `Codex exited with code ${result.exit_code}.` : result.stderr
  }
}

function codexProcessToReviewResult(
  brief: WorkerBrief,
  command: CodexExecCommand,
  result: CodexProcessResult
): ReviewResult {
  return {
    reviewer_id: brief.id,
    status: result.exit_code === 0 ? "passed" : "failed",
    output: result.stdout === "" ? result.stderr : result.stdout,
    findings: result.exit_code === 0 ? [] : [command.display_command, result.stderr]
  }
}

async function spawnCodexProcess(
  command: CodexExecCommand,
  context: ExecutorRunContext
): Promise<CodexProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command.command, command.args, {
      stdio: ["ignore", "pipe", "pipe"],
      signal: context.signal
    })
    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []

    child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk))
    child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk))
    child.on("error", reject)
    child.on("close", (code) => {
      resolve({
        exit_code: code ?? 1,
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8")
      })
    })
  })
}

export function buildCodexExecCommand(
  brief: WorkerBrief,
  route: RouteDecision,
  options: CodexExecutorOptions = {}
): CodexExecCommand {
  const command = options.codex_command ?? "codex"
  const prompt = buildWorkerPrompt(brief)
  const args = ["exec", "--model", route.model_id, prompt]

  return {
    command,
    args,
    display_command: [command, ...args].map(shellQuote).join(" ")
  }
}

function buildWorkerPrompt(brief: WorkerBrief): string {
  return [
    `Title: ${brief.title}`,
    `Objective: ${brief.objective}`,
    `Expected output: ${brief.expected_output}`,
    "Constraints:",
    ...brief.constraints.map((constraint) => `- ${constraint}`),
    "Acceptance criteria:",
    ...brief.acceptance_criteria.map((criterion) => `- ${criterion}`)
  ].join("\n")
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:=@-]+$/.test(value)) {
    return value
  }

  return `'${value.replaceAll("'", "'\"'\"'")}'`
}
