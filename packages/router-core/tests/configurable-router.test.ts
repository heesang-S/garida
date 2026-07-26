import { describe, expect, it } from "vitest"

import {
  createRouter,
  DEFAULT_MODEL_CATALOG,
  DEFAULT_ROUTING_POLICY,
  ModelCatalogValidationError,
  RoutingPolicyValidationError,
  type ModelCatalog,
  type RoutingPolicy,
  type TaskAssessment
} from "../src/index.js"

const assessment = {
  task_type: "writing",
  complexity: "low",
  risk: "low",
  context_size: "small",
  tool_need: "none",
  parallelizable: false,
  requires_subagents: false,
  confidence: 0.96,
  reasoning: "Simple writing task."
} satisfies TaskAssessment

const customPolicy = {
  version: "test-1",
  description: "A predictable policy for public API tests.",
  routing_order: ["always_use_strong"],
  model_rules: [
    {
      id: "always_use_strong",
      priority: 1,
      when: { always: true },
      route: { model_class: "strong" },
      reason: "Use the custom strong route."
    }
  ],
  delegation_rules: [
    {
      id: "always_direct",
      priority: 1,
      when: { always: true },
      route: { delegate: false },
      reason: "Keep this test direct."
    }
  ],
  review_rules: [
    {
      id: "always_review",
      priority: 1,
      when: { always: true },
      route: { add_reviewer: true },
      reason: "Always review this test route."
    }
  ],
  fallback_rules: [],
  route_decision_schema: {}
} satisfies RoutingPolicy

const customCatalog = {
  default_provider: "openai_codex",
  provider_routes: {
    openai_codex: {
      models: {
        small_fast: {
          model_id: "custom-small",
          pricing_usd_per_1m_tokens: { input: 1, cached_input: null, output: 2 }
        },
        standard: {
          model_id: "custom-standard",
          pricing_usd_per_1m_tokens: { input: 3, cached_input: 0.3, output: 4 }
        },
        strong: {
          model_id: "custom-strong",
          pricing_usd_per_1m_tokens: { input: 5, cached_input: 0.5, output: 6 }
        }
      }
    }
  }
} satisfies ModelCatalog

describe("createRouter", () => {
  it("uses validated custom policy and catalog inputs without losing route provenance", async () => {
    const router = createRouter({ policy: customPolicy, catalog: customCatalog })
    const decision = await router.routeTask(assessment)

    expect(decision).toMatchObject({
      model_class: "strong",
      provider: "openai_codex",
      model_id: "custom-strong",
      pricing_usd_per_1m_tokens: { input: 5, cached_input: 0.5, output: 6 },
      delegate: false,
      add_reviewer: true,
      matched_rules: ["always_use_strong", "always_direct", "always_review"]
    })
    expect(decision.routing_reason).toContain("Use the custom strong route.")
    expect(decision.fallback).toContain("Escalate to strong")
  })

  it("rejects malformed custom policy and catalog inputs with stable typed errors", () => {
    const invalidPolicy = {
      ...customPolicy,
      model_rules: [{ ...customPolicy.model_rules[0], route: { model_class: "unknown" } }]
    }
    const invalidCatalog = {
      ...customCatalog,
      default_provider: "unknown"
    }

    expect(() => createRouter({ policy: invalidPolicy as unknown as RoutingPolicy })).toThrow(
      RoutingPolicyValidationError
    )
    try {
      createRouter({ policy: invalidPolicy as unknown as RoutingPolicy })
    } catch (error) {
      expect(error).toMatchObject({
        code: "INVALID_ROUTING_POLICY",
        errors: expect.arrayContaining([
          expect.objectContaining({ path: "/model_rules/0/route/model_class" })
        ])
      })
    }

    expect(() => createRouter({ catalog: invalidCatalog as unknown as ModelCatalog })).toThrow(
      ModelCatalogValidationError
    )
  })

  it("keeps the bundled defaults immutable and deterministic", async () => {
    expect(Object.isFrozen(DEFAULT_ROUTING_POLICY)).toBe(true)
    expect(Object.isFrozen(DEFAULT_MODEL_CATALOG)).toBe(true)

    const router = createRouter()
    const decisions = await Promise.all(Array.from({ length: 3 }, () => router.routeTask(assessment)))

    expect(decisions).toEqual([decisions[0], decisions[0], decisions[0]])
  })

  it("prepares execution through the same configured router", async () => {
    const router = createRouter({ policy: customPolicy, catalog: customCatalog })
    const prepared = await router.prepareAgentExecution(assessment)

    expect(prepared.route.model_id).toBe("custom-strong")
    expect(prepared.execution_plan.reviewer_brief?.model_id).toBe("custom-strong")
  })
})
