import modelCatalogJson from "../routing/model-catalog.json" with { type: "json" }
import policyJson from "../routing/base-routing-policy.json" with { type: "json" }

import { createExecutionPlan } from "./execution-plan.js"
import { matchesConditions } from "./rule-evaluator.js"
import { validateTaskAssessment } from "./validate-assessment.js"
import {
  MODEL_CLASSES,
  MODEL_PROVIDERS,
  type ExecutionPlan,
  type ModelClass,
  type ModelPricing,
  type ModelProvider,
  type RouteDecision,
  type RouteOptions,
  type RouteState,
  type RoutingPolicy,
  type Rule,
  type TaskAssessment
} from "@model-orchestration/shared-types"

type CatalogModel = {
  readonly model_id: string
  readonly pricing_usd_per_1m_tokens: ModelPricing
}

export type ModelCatalog = {
  readonly default_provider: ModelProvider
  readonly provider_routes: Readonly<Record<string, {
    readonly models: Readonly<Record<string, CatalogModel>>
  }>>
  readonly model_classes?: Readonly<Record<string, unknown>>
}

export type ResolvedModel = {
  readonly provider: ModelProvider
  readonly model_id: string
  readonly pricing_usd_per_1m_tokens: ModelPricing
}

export type PreparedAgentExecution = {
  readonly assessment: TaskAssessment
  readonly route: RouteDecision
  readonly execution_plan: ExecutionPlan
}

export type RouterConfig = {
  readonly policy?: RoutingPolicy
  readonly catalog?: ModelCatalog
}

export type Router = {
  readonly routeTask: (
    assessment: TaskAssessment,
    options?: RouteOptions
  ) => Promise<RouteDecision>
  readonly prepareAgentExecution: (
    rawAssessment: unknown,
    options?: RouteOptions
  ) => Promise<PreparedAgentExecution>
}

export type RouterConfigurationErrorCode =
  | "INVALID_ROUTING_POLICY"
  | "INVALID_MODEL_CATALOG"

export type RouterConfigurationValidationIssue = {
  readonly path: string
  readonly message: string
}

export class RouterConfigurationValidationError extends Error {
  readonly code: RouterConfigurationErrorCode
  readonly errors: readonly RouterConfigurationValidationIssue[]

  constructor(
    code: RouterConfigurationErrorCode,
    errors: readonly RouterConfigurationValidationIssue[]
  ) {
    super(`${code}: ${formatRouterConfigurationValidationErrors(errors)}`)
    this.name = "RouterConfigurationValidationError"
    this.code = code
    this.errors = errors
  }
}

export class RoutingPolicyValidationError extends RouterConfigurationValidationError {
  constructor(errors: readonly RouterConfigurationValidationIssue[]) {
    super("INVALID_ROUTING_POLICY", errors)
    this.name = "RoutingPolicyValidationError"
  }
}

export class ModelCatalogValidationError extends RouterConfigurationValidationError {
  constructor(errors: readonly RouterConfigurationValidationIssue[]) {
    super("INVALID_MODEL_CATALOG", errors)
    this.name = "ModelCatalogValidationError"
  }
}

export class RoutingPolicyError extends Error {
  readonly code = "ROUTING_POLICY_ERROR" as const

  constructor(message: string) {
    super(message)
    this.name = "RoutingPolicyError"
  }
}

/**
 * Immutable bundled routing inputs used by the backwards-compatible helpers.
 */
export const DEFAULT_ROUTING_POLICY = deepFreeze(validateRoutingPolicy(policyJson))
export const DEFAULT_MODEL_CATALOG = deepFreeze(validateModelCatalog(modelCatalogJson))

const defaultRouter = createRouter({
  policy: DEFAULT_ROUTING_POLICY,
  catalog: DEFAULT_MODEL_CATALOG
})

/**
 * Create a deterministic router from a validated policy and model catalog.
 * Custom configuration is copied and frozen so later caller mutation cannot
 * alter routing decisions.
 */
export function createRouter(config: RouterConfig = {}): Router {
  const policy = copyAndFreeze(validateRoutingPolicy(config.policy ?? DEFAULT_ROUTING_POLICY))
  const catalog = copyAndFreeze(validateModelCatalog(config.catalog ?? DEFAULT_MODEL_CATALOG))

  async function routeConfiguredTask(
    assessment: TaskAssessment,
    options: RouteOptions = {}
  ): Promise<RouteDecision> {
    const matchedRules: string[] = []
    const reasons: string[] = []

    const modelRule = findFirstMatchingRule(policy.model_rules, assessment, {})
    const modelClass = parseModelClass(modelRule.route.model_class ?? "standard")
    matchedRules.push(modelRule.id)
    reasons.push(modelRule.reason)

    const afterModel: RouteState = { model_class: modelClass }
    const delegationRule = findFirstMatchingRule(policy.delegation_rules, assessment, afterModel)
    const delegate = delegationRule.route.delegate ?? false
    matchedRules.push(delegationRule.id)
    reasons.push(delegationRule.reason)

    const afterDelegation: RouteState = { model_class: modelClass, delegate }
    const reviewRule = findFirstMatchingRule(policy.review_rules, assessment, afterDelegation)
    const addReviewer = reviewRule.route.add_reviewer ?? false
    matchedRules.push(reviewRule.id)
    reasons.push(reviewRule.reason)
    const resolvedModel = resolveModelFromCatalog(catalog, modelClass, options.preferred_provider)

    return {
      model_class: modelClass,
      provider: resolvedModel.provider,
      model_id: resolvedModel.model_id,
      pricing_usd_per_1m_tokens: resolvedModel.pricing_usd_per_1m_tokens,
      delegate,
      add_reviewer: addReviewer,
      matched_rules: matchedRules,
      routing_reason: reasons.join(" "),
      fallback: buildFallbackText(policy, assessment, {
        model_class: modelClass,
        delegate,
        add_reviewer: addReviewer
      })
    }
  }

  return Object.freeze({
    routeTask: routeConfiguredTask,
    async prepareAgentExecution(
      rawAssessment: unknown,
      options: RouteOptions = {}
    ): Promise<PreparedAgentExecution> {
      const assessment = await validateTaskAssessment(rawAssessment)
      const route = await routeConfiguredTask(assessment, options)

      return {
        assessment,
        route,
        execution_plan: createExecutionPlan(assessment, route)
      }
    }
  })
}

/**
 * Backwards-compatible routing helper using immutable bundled defaults.
 */
export async function routeTask(
  assessment: TaskAssessment,
  options: RouteOptions = {}
): Promise<RouteDecision> {
  return defaultRouter.routeTask(assessment, options)
}

export async function routeTaskForProvider(
  assessment: TaskAssessment,
  preferredProvider: ModelProvider
): Promise<RouteDecision> {
  return routeTask(assessment, { preferred_provider: preferredProvider })
}

export function resolveModelFromCatalog(
  catalog: ModelCatalog,
  modelClass: ModelClass,
  preferredProvider: ModelProvider | undefined
): ResolvedModel {
  const provider = preferredProvider ?? parseModelProvider(catalog.default_provider)
  const providerRoute = catalog.provider_routes[provider]
  if (providerRoute === undefined) {
    throw new RoutingPolicyError(`Missing model provider in catalog: ${provider}`)
  }

  const modelRoute = providerRoute.models[modelClass]
  if (modelRoute === undefined) {
    throw new RoutingPolicyError(`Missing model class in catalog: ${provider}/${modelClass}`)
  }

  return {
    provider,
    model_id: modelRoute.model_id,
    pricing_usd_per_1m_tokens: modelRoute.pricing_usd_per_1m_tokens
  }
}

export function validateRoutingPolicy(value: unknown): RoutingPolicy {
  const issues: RouterConfigurationValidationIssue[] = []
  const policy = asRecord(value, "/", issues)

  validateNonEmptyString(policy?.["version"], "/version", issues)
  validateNonEmptyString(policy?.["description"], "/description", issues)
  validateStringArray(policy?.["routing_order"], "/routing_order", issues)
  validateRuleSet(policy?.["model_rules"], "/model_rules", "model_class", issues)
  validateRuleSet(policy?.["delegation_rules"], "/delegation_rules", "delegate", issues)
  validateRuleSet(policy?.["review_rules"], "/review_rules", "add_reviewer", issues)
  validateFallbackRules(policy?.["fallback_rules"], "/fallback_rules", issues)

  if (issues.length > 0) {
    throw new RoutingPolicyValidationError(issues)
  }

  return value as RoutingPolicy
}

export function validateModelCatalog(value: unknown): ModelCatalog {
  const issues: RouterConfigurationValidationIssue[] = []
  const catalog = asRecord(value, "/", issues)
  const defaultProvider = catalog?.["default_provider"]
  const providerRoutes = asRecord(catalog?.["provider_routes"], "/provider_routes", issues)

  if (!isModelProvider(defaultProvider)) {
    issues.push({
      path: "/default_provider",
      message: "must be a supported model provider"
    })
  } else if (providerRoutes?.[defaultProvider] === undefined) {
    issues.push({
      path: "/provider_routes",
      message: `must contain the default provider: ${defaultProvider}`
    })
  }

  if (providerRoutes !== undefined) {
    for (const [provider, providerRoute] of Object.entries(providerRoutes)) {
      if (!isModelProvider(provider)) {
        issues.push({
          path: `/provider_routes/${provider}`,
          message: "uses an unsupported model provider"
        })
        continue
      }

      const route = asRecord(providerRoute, `/provider_routes/${provider}`, issues)
      const models = asRecord(route?.["models"], `/provider_routes/${provider}/models`, issues)
      if (models === undefined) {
        continue
      }

      for (const modelClass of MODEL_CLASSES) {
        validateCatalogModel(models[modelClass], `/provider_routes/${provider}/models/${modelClass}`, issues)
      }

      for (const modelClass of Object.keys(models)) {
        if (!isModelClass(modelClass)) {
          issues.push({
            path: `/provider_routes/${provider}/models/${modelClass}`,
            message: "uses an unsupported model class"
          })
        }
      }
    }
  }

  if (issues.length > 0) {
    throw new ModelCatalogValidationError(issues)
  }

  return value as ModelCatalog
}

export function formatRouterConfigurationValidationErrors(
  errors: readonly RouterConfigurationValidationIssue[]
): string {
  if (errors.length === 0) {
    return "unknown validation error"
  }

  return errors.map((error) => `${error.path} ${error.message}`).join("; ")
}

function findFirstMatchingRule(
  rules: readonly Rule[],
  assessment: TaskAssessment,
  state: RouteState
): Rule {
  const sortedRules = [...rules].sort((left, right) => left.priority - right.priority)

  for (const rule of sortedRules) {
    if (matchesConditions(rule.when, assessment, state)) {
      return rule
    }
  }

  throw new RoutingPolicyError("No matching routing rule found")
}

function buildFallbackText(
  policy: RoutingPolicy,
  assessment: TaskAssessment,
  state: RouteState
): string {
  const matchingFallbacks = policy.fallback_rules.filter((rule) =>
    matchesConditions(rule.when, assessment, state)
  )

  if (matchingFallbacks.length === 0) {
    return "Escalate to strong if verification fails, requirements conflict, or task risk increases."
  }

  return matchingFallbacks.map((rule) => rule.reason).join(" ")
}

function parseModelClass(value: string): ModelClass {
  if (isModelClass(value)) {
    return value
  }

  throw new RoutingPolicyError(`Unknown model class in route: ${value}`)
}

function parseModelProvider(value: string): ModelProvider {
  if (isModelProvider(value)) {
    return value
  }

  throw new RoutingPolicyError(`Unknown model provider in catalog: ${value}`)
}

function validateRuleSet(
  value: unknown,
  path: string,
  expectedRouteKey: "model_class" | "delegate" | "add_reviewer",
  issues: RouterConfigurationValidationIssue[]
): void {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push({ path, message: "must be a non-empty array" })
    return
  }

  const ids = new Set<string>()
  for (const [index, rawRule] of value.entries()) {
    const rulePath = `${path}/${index}`
    const rule = asRecord(rawRule, rulePath, issues)
    if (rule === undefined) {
      continue
    }

    const id = rule["id"]
    validateNonEmptyString(id, `${rulePath}/id`, issues)
    if (typeof id === "string") {
      if (ids.has(id)) {
        issues.push({ path: `${rulePath}/id`, message: "must be unique within its rule set" })
      }
      ids.add(id)
    }

    if (typeof rule["priority"] !== "number" || !Number.isFinite(rule["priority"])) {
      issues.push({ path: `${rulePath}/priority`, message: "must be a finite number" })
    }
    validateConditions(rule["when"], `${rulePath}/when`, issues)
    validateNonEmptyString(rule["reason"], `${rulePath}/reason`, issues)

    const route = asRecord(rule["route"], `${rulePath}/route`, issues)
    if (route === undefined) {
      continue
    }

    if (expectedRouteKey === "model_class" && !isModelClass(route["model_class"])) {
      issues.push({ path: `${rulePath}/route/model_class`, message: "must be a supported model class" })
    }
    if (expectedRouteKey === "delegate" && typeof route["delegate"] !== "boolean") {
      issues.push({ path: `${rulePath}/route/delegate`, message: "must be a boolean" })
    }
    if (expectedRouteKey === "add_reviewer" && typeof route["add_reviewer"] !== "boolean") {
      issues.push({ path: `${rulePath}/route/add_reviewer`, message: "must be a boolean" })
    }
  }
}

function validateFallbackRules(
  value: unknown,
  path: string,
  issues: RouterConfigurationValidationIssue[]
): void {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "must be an array" })
    return
  }

  for (const [index, rawRule] of value.entries()) {
    const rulePath = `${path}/${index}`
    const rule = asRecord(rawRule, rulePath, issues)
    if (rule === undefined) {
      continue
    }

    validateNonEmptyString(rule["id"], `${rulePath}/id`, issues)
    validateConditions(rule["when"], `${rulePath}/when`, issues)
    validateNonEmptyString(rule["action"], `${rulePath}/action`, issues)
    validateNonEmptyString(rule["reason"], `${rulePath}/reason`, issues)
  }
}

function validateConditions(
  value: unknown,
  path: string,
  issues: RouterConfigurationValidationIssue[]
): void {
  const conditions = asRecord(value, path, issues)
  if (conditions === undefined) {
    return
  }

  for (const [key, expected] of Object.entries(conditions)) {
    const conditionPath = `${path}/${key}`
    const isStringArray = Array.isArray(expected) && expected.every((item) => typeof item === "string")
    const isFiniteNumber = typeof expected === "number" && Number.isFinite(expected)
    if (!isStringArray && typeof expected !== "boolean" && !isFiniteNumber) {
      issues.push({
        path: conditionPath,
        message: "must be a string array, boolean, or finite number"
      })
    }
  }
}

function validateCatalogModel(
  value: unknown,
  path: string,
  issues: RouterConfigurationValidationIssue[]
): void {
  const model = asRecord(value, path, issues)
  if (model === undefined) {
    return
  }

  validateNonEmptyString(model["model_id"], `${path}/model_id`, issues)
  const pricing = asRecord(model["pricing_usd_per_1m_tokens"], `${path}/pricing_usd_per_1m_tokens`, issues)
  if (pricing === undefined) {
    return
  }

  validateNonNegativeNumber(pricing["input"], `${path}/pricing_usd_per_1m_tokens/input`, issues)
  validateNonNegativeNumber(pricing["output"], `${path}/pricing_usd_per_1m_tokens/output`, issues)
  if (pricing["cached_input"] !== null) {
    validateNonNegativeNumber(
      pricing["cached_input"],
      `${path}/pricing_usd_per_1m_tokens/cached_input`,
      issues
    )
  }
}

function asRecord(
  value: unknown,
  path: string,
  issues: RouterConfigurationValidationIssue[]
): Record<string, unknown> | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    issues.push({ path, message: "must be an object" })
    return undefined
  }

  return value as Record<string, unknown>
}

function validateNonEmptyString(
  value: unknown,
  path: string,
  issues: RouterConfigurationValidationIssue[]
): void {
  if (typeof value !== "string" || value.length === 0) {
    issues.push({ path, message: "must be a non-empty string" })
  }
}

function validateStringArray(
  value: unknown,
  path: string,
  issues: RouterConfigurationValidationIssue[]
): void {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    issues.push({ path, message: "must be an array of strings" })
  }
}

function validateNonNegativeNumber(
  value: unknown,
  path: string,
  issues: RouterConfigurationValidationIssue[]
): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    issues.push({ path, message: "must be a non-negative finite number" })
  }
}

function isModelClass(value: unknown): value is ModelClass {
  return typeof value === "string" && MODEL_CLASSES.some((modelClass) => modelClass === value)
}

function isModelProvider(value: unknown): value is ModelProvider {
  return typeof value === "string" && MODEL_PROVIDERS.some((provider) => provider === value)
}

function copyAndFreeze<T>(value: T): T {
  return deepFreeze(structuredClone(value))
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nestedValue of Object.values(value)) {
      deepFreeze(nestedValue)
    }
    Object.freeze(value)
  }

  return value
}
