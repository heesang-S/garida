import {
  runExecutionPlan,
  type ExecutionClock,
  type ExecutionLogStore,
  type ExecutionRunResult,
  type ExecutorLogger,
  type ExecutorMetadata,
  type RetryPolicy,
  type TimeoutPolicy
} from "@model-orchestration/executor-core"
import type { ExecutionPlan, RouteDecision } from "@model-orchestration/shared-types"

import {
  createCodexExecutor,
  type CodexExecutorMode,
  type CodexProcessRunner
} from "./index.js"

export type RunRoutedCodexExecutionInput = {
  readonly execution_plan: ExecutionPlan
  readonly route: RouteDecision
  readonly run_id?: string
  readonly clock?: ExecutionClock
  readonly execution_log_store?: ExecutionLogStore
  readonly signal?: AbortSignal
  readonly metadata?: ExecutorMetadata
  readonly retry_policy?: RetryPolicy
  readonly timeout_policy?: TimeoutPolicy
  readonly logger?: ExecutorLogger
  readonly codex_command?: string
  readonly mode?: CodexExecutorMode
  readonly process_runner?: CodexProcessRunner
}

export async function runRoutedCodexExecution(
  input: RunRoutedCodexExecutionInput
): Promise<ExecutionRunResult> {
  const executor = createCodexExecutor({
    ...(input.codex_command === undefined
      ? {}
      : { codex_command: input.codex_command }),
    ...(input.mode === undefined ? {} : { mode: input.mode }),
    ...(input.process_runner === undefined
      ? {}
      : { process_runner: input.process_runner })
  })

  return runExecutionPlan({
    execution_plan: input.execution_plan,
    route: input.route,
    executor,
    ...(input.run_id === undefined ? {} : { run_id: input.run_id }),
    ...(input.clock === undefined ? {} : { clock: input.clock }),
    ...(input.execution_log_store === undefined
      ? {}
      : { execution_log_store: input.execution_log_store }),
    ...(input.signal === undefined ? {} : { signal: input.signal }),
    ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
    ...(input.retry_policy === undefined
      ? {}
      : { retry_policy: input.retry_policy }),
    ...(input.timeout_policy === undefined
      ? {}
      : { timeout_policy: input.timeout_policy }),
    ...(input.logger === undefined ? {} : { logger: input.logger })
  })
}
