export class MissingReviewExecutorError extends Error {
  constructor(readonly provider: string) {
    super(`Execution plan requires executeReview, but executor '${provider}' does not provide it.`)
    this.name = "MissingReviewExecutorError"
  }
}

export class ExecutorTimeoutError extends Error {
  constructor(
    readonly brief_id: string,
    readonly timeout_ms: number
  ) {
    super(`Executor timed out for '${brief_id}' after ${timeout_ms}ms.`)
    this.name = "ExecutorTimeoutError"
  }
}

export class ExecutorCancelledError extends Error {
  constructor(readonly brief_id: string) {
    super(`Executor cancelled for '${brief_id}'.`)
    this.name = "ExecutorCancelledError"
  }
}

export class ExecutorOutputLimitError extends Error {
  constructor(
    readonly operation_id: string,
    readonly max_output_bytes: number
  ) {
    super(`Executor output for '${operation_id}' exceeded ${max_output_bytes} bytes.`)
    this.name = "ExecutorOutputLimitError"
  }
}

export class UnsupportedExecutorError extends Error {
  constructor(
    readonly provider: string,
    readonly reason: string
  ) {
    super(`Executor '${provider}' is unsupported: ${reason}`)
    this.name = "UnsupportedExecutorError"
  }
}
