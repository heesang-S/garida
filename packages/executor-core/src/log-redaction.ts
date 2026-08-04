import type { ExecutionLogPolicy, LogValueKind } from "./run-execution-plan.js"

export function redactLogValue(value: string, kind: LogValueKind, policy: ExecutionLogPolicy | undefined): string {
  const safelyRedacted = value
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [redacted]")
    .replace(/\bsk-[A-Za-z0-9_-]+\b/g, "[redacted]")
    .replace(/((?:api[_ -]?key|token|secret)\s*[:=]\s*)[^\s,;]+/gi, "$1[redacted]")
  return policy?.redact?.(safelyRedacted, kind) ?? safelyRedacted
}
