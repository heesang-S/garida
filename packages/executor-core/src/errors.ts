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
