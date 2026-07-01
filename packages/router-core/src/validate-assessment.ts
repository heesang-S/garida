import { Ajv2020, type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js"

import taskAssessmentSchema from "../routing/task-assessment-schema.json" with { type: "json" }
import type { TaskAssessment } from "@model-orchestration/shared-types"

export class TaskAssessmentValidationError extends Error {
  readonly errors: readonly ErrorObject[]

  constructor(errors: readonly ErrorObject[]) {
    super(`Invalid task assessment: ${formatValidationErrors(errors)}`)
    this.name = "TaskAssessmentValidationError"
    this.errors = errors
  }
}

const ajv = new Ajv2020({ allErrors: true })
const validate: ValidateFunction<TaskAssessment> = ajv.compile<TaskAssessment>(taskAssessmentSchema)

export async function validateTaskAssessment(value: unknown): Promise<TaskAssessment> {
  if (validate(value)) {
    return value
  }

  throw new TaskAssessmentValidationError(validate.errors ?? [])
}

export function formatValidationErrors(errors: readonly ErrorObject[]): string {
  if (errors.length === 0) {
    return "unknown validation error"
  }

  return errors.map((error) => `${error.instancePath || "/"} ${error.message ?? ""}`.trim()).join("; ")
}
