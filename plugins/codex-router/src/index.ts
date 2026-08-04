import {
  runRoutedCodexExecution,
  type CodexExecutorMode,
  type CodexProcessRunner
} from "@model-orchestration/executor-codex"
import type {
  ExecutionClock,
  ExecutionLogStore,
  ExecutorLogger,
  ExecutorMetadata,
  ExecutionRunResult,
  RetryPolicy,
  TimeoutPolicy
} from "@model-orchestration/executor-core"
import type { PreparedAgentExecution } from "@garida/core"

export type RunPreparedCodexExecutionInput = {
  readonly prepared_execution: PreparedAgentExecution
  readonly run_id?: string
  readonly clock?: ExecutionClock
  readonly execution_log_store?: ExecutionLogStore
  readonly signal?: AbortSignal
  readonly metadata?: ExecutorMetadata
  readonly retry_policy?: RetryPolicy
  readonly timeout_policy?: TimeoutPolicy
  readonly logger?: ExecutorLogger
  readonly codex_command?: string
  readonly codex_args?: readonly string[]
  readonly mode?: CodexExecutorMode
  readonly process_runner?: CodexProcessRunner
}

export type ExecutionDistributionSummary = {
  readonly execution_mode: PreparedAgentExecution["execution_plan"]["execution_mode"]
  readonly worker_count: number
  readonly reviewer_count: number
  readonly delegate: boolean
  readonly add_reviewer: boolean
  readonly worker_model_ids: readonly string[]
}

export type OrchestratePreparedCodexExecutionInput =
  RunPreparedCodexExecutionInput & {
    readonly current_model_id: string
  }

export type InlinePreparedCodexExecutionDecision = {
  readonly kind: "inline"
  readonly route: PreparedAgentExecution["route"]
  readonly execution_plan: PreparedAgentExecution["execution_plan"]
  readonly distribution: ExecutionDistributionSummary
}

export type RoutedPreparedCodexExecutionDecision = {
  readonly kind: "routed_worker"
  readonly route: PreparedAgentExecution["route"]
  readonly execution_plan: PreparedAgentExecution["execution_plan"]
  readonly distribution: ExecutionDistributionSummary
  readonly execution_result: ExecutionRunResult
}

export type PreparedCodexExecutionDecision =
  | InlinePreparedCodexExecutionDecision
  | RoutedPreparedCodexExecutionDecision

export type { ExecutionRunResult }

export async function runPreparedCodexExecution(
  input: RunPreparedCodexExecutionInput
): Promise<ExecutionRunResult> {
  return runRoutedCodexExecution({
    route: input.prepared_execution.route,
    execution_plan: input.prepared_execution.execution_plan,
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
    ...(input.logger === undefined ? {} : { logger: input.logger }),
    ...(input.codex_command === undefined
      ? {}
      : { codex_command: input.codex_command }),
    ...(input.codex_args === undefined ? {} : { codex_args: input.codex_args }),
    ...(input.mode === undefined ? {} : { mode: input.mode }),
    ...(input.process_runner === undefined
      ? {}
      : { process_runner: input.process_runner })
  })
}

export async function orchestratePreparedCodexExecution(
  input: OrchestratePreparedCodexExecutionInput
): Promise<PreparedCodexExecutionDecision> {
  const distribution = summarizeExecutionDistribution(input.prepared_execution)
  if (input.prepared_execution.route.model_id === input.current_model_id) {
    return {
      kind: "inline",
      route: input.prepared_execution.route,
      execution_plan: input.prepared_execution.execution_plan,
      distribution
    }
  }

  const executionResult = await runPreparedCodexExecution(input)
  return {
    kind: "routed_worker",
    route: input.prepared_execution.route,
    execution_plan: input.prepared_execution.execution_plan,
    distribution,
    execution_result: executionResult
  }
}

function summarizeExecutionDistribution(
  preparedExecution: PreparedAgentExecution
): ExecutionDistributionSummary {
  return {
    execution_mode: preparedExecution.execution_plan.execution_mode,
    worker_count: preparedExecution.execution_plan.worker_briefs.length,
    reviewer_count: preparedExecution.execution_plan.reviewer_brief === undefined ? 0 : 1,
    delegate: preparedExecution.route.delegate,
    add_reviewer: preparedExecution.route.add_reviewer,
    worker_model_ids: preparedExecution.execution_plan.worker_briefs.map(
      (brief) => brief.model_id
    )
  }
}
