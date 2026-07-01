export const TASK_TYPES = [
  "coding",
  "debugging",
  "testing",
  "research",
  "writing",
  "planning",
  "review",
  "data_analysis",
  "conversation",
  "unknown"
] as const

export const COMPLEXITIES = ["low", "medium", "high"] as const
export const RISKS = ["low", "medium", "high"] as const
export const CONTEXT_SIZES = ["small", "medium", "large"] as const
export const TOOL_NEEDS = ["none", "light", "heavy"] as const
export const MODEL_CLASSES = ["small_fast", "standard", "strong"] as const
export const MODEL_PROVIDERS = ["openai_codex", "anthropic_claude"] as const

export type TaskType = (typeof TASK_TYPES)[number]
export type Complexity = (typeof COMPLEXITIES)[number]
export type Risk = (typeof RISKS)[number]
export type ContextSize = (typeof CONTEXT_SIZES)[number]
export type ToolNeed = (typeof TOOL_NEEDS)[number]
export type ModelClass = (typeof MODEL_CLASSES)[number]
export type ModelProvider = (typeof MODEL_PROVIDERS)[number]

export type ModelPricing = {
  readonly input: number
  readonly cached_input: number | null
  readonly output: number
}

export type SuggestedSubtask = {
  readonly title: string
  readonly objective: string
  readonly independent: boolean
}

export type TaskAssessment = {
  readonly task_type: TaskType
  readonly complexity: Complexity
  readonly risk: Risk
  readonly context_size: ContextSize
  readonly tool_need: ToolNeed
  readonly parallelizable: boolean
  readonly requires_subagents: boolean
  readonly confidence: number
  readonly reasoning: string
  readonly suggested_subtasks?: readonly SuggestedSubtask[]
}

export type RouteDecision = {
  readonly model_class: ModelClass
  readonly provider: ModelProvider
  readonly model_id: string
  readonly pricing_usd_per_1m_tokens: ModelPricing
  readonly delegate: boolean
  readonly add_reviewer: boolean
  readonly matched_rules: readonly string[]
  readonly routing_reason: string
  readonly fallback: string
}

export type RouteOptions = {
  readonly preferred_provider?: ModelProvider
}

export type ExecutionMode = "direct" | "delegated"

export type WorkerBrief = {
  readonly id: string
  readonly title: string
  readonly objective: string
  readonly model_class: ModelClass
  readonly provider: ModelProvider
  readonly model_id: string
  readonly constraints: readonly string[]
  readonly expected_output: string
  readonly acceptance_criteria: readonly string[]
}

export type ExecutionPlan = {
  readonly execution_mode: ExecutionMode
  readonly worker_briefs: readonly WorkerBrief[]
  readonly reviewer_brief?: WorkerBrief
  readonly synthesis_strategy: string
}

export type RoutePatch = {
  readonly model_class?: string
  readonly delegate?: boolean
  readonly add_reviewer?: boolean
}

export type RuleCondition = Record<string, readonly string[] | boolean | number>

export type Rule = {
  readonly id: string
  readonly priority: number
  readonly when: RuleCondition
  readonly route: RoutePatch
  readonly reason: string
}

export type FallbackRule = {
  readonly id: string
  readonly when: RuleCondition
  readonly action: string
  readonly reason: string
}

export type RoutingPolicy = {
  readonly version: string
  readonly description: string
  readonly routing_order: readonly string[]
  readonly model_rules: readonly Rule[]
  readonly delegation_rules: readonly Rule[]
  readonly review_rules: readonly Rule[]
  readonly fallback_rules: readonly FallbackRule[]
  readonly route_decision_schema: unknown
}

export type RouteState = {
  readonly model_class?: ModelClass
  readonly delegate?: boolean
  readonly add_reviewer?: boolean
}
