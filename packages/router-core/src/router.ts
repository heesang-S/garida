import policyJson from "../routing/base-routing-policy.json" with { type: "json" }
import modelCatalogJson from "../routing/model-catalog.json" with { type: "json" }
import { matchesConditions } from "./rule-evaluator.js"
import {
  MODEL_CLASSES,
  MODEL_PROVIDERS,
  type ModelClass,
  type ModelProvider,
  type ModelPricing,
  type RouteDecision,
  type RouteOptions,
  type RouteState,
  type RoutingPolicy,
  type Rule,
  type TaskAssessment
} from "@model-orchestration/shared-types"

const policy: RoutingPolicy = policyJson
const modelCatalog = modelCatalogJson

export async function routeTask(
  assessment: TaskAssessment,
  options: RouteOptions = {}
): Promise<RouteDecision> {
  const matchedRules: string[] = []
  const reasons: string[] = []

  const modelRule = findFirstMatchingRule(policy.model_rules, assessment, {})
  const modelClass = parseModelClass(modelRule.route.model_class ?? "standard")
  assertKnownModelClass(modelClass)
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
  const resolvedModel = resolveModel(modelClass, options.preferred_provider)

  return {
    model_class: modelClass,
    provider: resolvedModel.provider,
    model_id: resolvedModel.model_id,
    pricing_usd_per_1m_tokens: resolvedModel.pricing_usd_per_1m_tokens,
    delegate,
    add_reviewer: addReviewer,
    matched_rules: matchedRules,
    routing_reason: reasons.join(" "),
    fallback: buildFallbackText(assessment, {
      model_class: modelClass,
      delegate,
      add_reviewer: addReviewer
    })
  }
}

export async function routeTaskForProvider(
  assessment: TaskAssessment,
  preferredProvider: ModelProvider
): Promise<RouteDecision> {
  return routeTask(assessment, { preferred_provider: preferredProvider })
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

function buildFallbackText(assessment: TaskAssessment, state: RouteState): string {
  const matchingFallbacks = policy.fallback_rules.filter((rule) =>
    matchesConditions(rule.when, assessment, state)
  )

  if (matchingFallbacks.length === 0) {
    return "Escalate to strong if verification fails, requirements conflict, or task risk increases."
  }

  return matchingFallbacks.map((rule) => rule.reason).join(" ")
}

function parseModelClass(value: string): ModelClass {
  for (const modelClass of MODEL_CLASSES) {
    if (modelClass === value) {
      return modelClass
    }
  }

  throw new RoutingPolicyError(`Unknown model class in route: ${value}`)
}

function assertKnownModelClass(modelClass: ModelClass): void {
  if (!Object.hasOwn(modelCatalog.model_classes, modelClass)) {
    throw new RoutingPolicyError(`Unknown model class in route: ${modelClass}`)
  }
}

type ResolvedModel = {
  readonly provider: ModelProvider
  readonly model_id: string
  readonly pricing_usd_per_1m_tokens: ModelPricing
}

function resolveModel(modelClass: ModelClass, preferredProvider: ModelProvider | undefined): ResolvedModel {
  const provider = preferredProvider ?? parseModelProvider(modelCatalog.default_provider)
  const providerRoute = modelCatalog.provider_routes[provider]
  const modelRoute = providerRoute.models[modelClass]

  return {
    provider,
    model_id: modelRoute.model_id,
    pricing_usd_per_1m_tokens: modelRoute.pricing_usd_per_1m_tokens
  }
}

function parseModelProvider(value: string): ModelProvider {
  for (const provider of MODEL_PROVIDERS) {
    if (provider === value) {
      return provider
    }
  }

  throw new RoutingPolicyError(`Unknown model provider in catalog: ${value}`)
}

export class RoutingPolicyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "RoutingPolicyError"
  }
}
