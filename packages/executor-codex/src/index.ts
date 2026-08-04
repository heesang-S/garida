import { spawn } from "node:child_process"
import { ExecutorOutputLimitError } from "@model-orchestration/executor-core"
import type { AgentExecutor, ExecutorRunContext, ReviewResult, WorkerResult } from "@model-orchestration/executor-core"
import type { RouteDecision, WorkerBrief } from "@garida/types"

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
  readonly codex_args?: readonly string[]
  readonly mode?: CodexExecutorMode
  readonly process_runner?: CodexProcessRunner
  readonly max_output_bytes?: number
}

export type { RunRoutedCodexExecutionInput } from "./routed-codex-runner.js"
export { runRoutedCodexExecution } from "./routed-codex-runner.js"

export function createCodexExecutor(options: CodexExecutorOptions = {}): AgentExecutor {
  return {
    provider: "codex",
    supports_route(route): boolean {
      return route.provider === "openai_codex"
    },
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
  const maxOutputBytes = normalizeByteLimit(options.max_output_bytes)
  const result = options.process_runner === undefined
    ? await spawnCodexProcess(command, context, maxOutputBytes)
    : await options.process_runner(command, context)
  if (Buffer.byteLength(result.stdout) + Buffer.byteLength(result.stderr) > maxOutputBytes) {
    throw new ExecutorOutputLimitError("codex-process", maxOutputBytes)
  }
  return result
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

export async function spawnCodexProcess(
  command: CodexExecCommand,
  context: ExecutorRunContext,
  maxOutputBytes = 1_048_576
): Promise<CodexProcessResult> {
  const outputLimit = normalizeByteLimit(maxOutputBytes)
  return new Promise((resolve, reject) => {
    const child = spawn(command.command, command.args, {
      stdio: ["ignore", "pipe", "pipe"],
      signal: context.signal
    })
    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []
    let outputBytes = 0
    let settled = false

    const rejectOnce = (error: Error): void => {
      if (settled) return
      settled = true
      reject(error)
    }

    const appendChunk = (chunks: Buffer[], value: Buffer | string): void => {
      if (settled) return
      const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value)
      outputBytes += chunk.byteLength
      if (outputBytes > outputLimit) {
        const error = new ExecutorOutputLimitError("codex-process", outputLimit)
        child.kill("SIGTERM")
        child.stdout.destroy()
        child.stderr.destroy()
        rejectOnce(error)
        return
      }
      chunks.push(chunk)
    }

    child.stdout.on("data", (chunk: Buffer | string) => appendChunk(stdoutChunks, chunk))
    child.stderr.on("data", (chunk: Buffer | string) => appendChunk(stderrChunks, chunk))
    child.on("error", rejectOnce)
    child.on("close", (code) => {
      if (settled) return
      settled = true
      resolve({
        exit_code: code ?? 1,
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8")
      })
    })
  })
}

function normalizeByteLimit(value: number | undefined): number {
  return value !== undefined && Number.isFinite(value) && value > 0 ? Math.floor(value) : 1_048_576
}

export function buildCodexExecCommand(
  brief: WorkerBrief,
  route: RouteDecision,
  options: CodexExecutorOptions = {}
): CodexExecCommand {
  const command = options.codex_command ?? "codex"
  const prompt = buildWorkerPrompt(brief)
  const extraArgs = options.codex_args ?? []
  const args = ["exec", "--model", route.model_id, ...extraArgs, prompt]
  const displayArgs = ["exec", "--model", route.model_id, ...extraArgs, "<prompt>"]

  return {
    command,
    args,
    display_command: [command, ...displayArgs].map(shellQuote).join(" ")
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
