import { describe, expect, it } from "vitest"

import modelCatalogJson from "../routing/model-catalog.json" with { type: "json" }
import { resolveModelFromCatalog, routeTask, type ModelCatalog } from "../src/index.js"

const simpleWritingAssessment = {
  task_type: "writing" as const,
  complexity: "low" as const,
  risk: "low" as const,
  context_size: "small" as const,
  tool_need: "none" as const,
  parallelizable: false,
  requires_subagents: false,
  confidence: 0.96,
  reasoning: "Simple writing task."
}

describe("GPT-5.6 model catalog", () => {
  it("routes the active small tier to GPT-5.6 Luna", async () => {
    const decision = await routeTask(simpleWritingAssessment)

    expect(decision.model_id).toBe("gpt-5.6-luna")
  })

  it.each([
    ["small_fast", "gpt-5.6-luna", 1, 0.1, 6],
    ["standard", "gpt-5.6-terra", 2.5, 0.25, 15],
    ["strong", "gpt-5.6-sol", 5, 0.5, 30]
  ] as const)("resolves %s to %s with the current short-context price", async (
    modelClass,
    modelId,
    input,
    cachedInput,
    output
  ) => {
    const decision = await routeTask({
      ...simpleWritingAssessment,
      complexity: modelClass === "small_fast" ? "low" : "medium",
      risk: modelClass === "small_fast" ? "low" : modelClass === "strong" ? "high" : "medium"
    })

    expect(decision.model_class).toBe(modelClass)
    expect(decision.model_id).toBe(modelId)
    expect(decision.pricing_usd_per_1m_tokens).toEqual({
      input,
      cached_input: cachedInput,
      output
    })
  })

  it("preserves model limits and Anthropic provider mappings", () => {
    for (const modelClass of ["small_fast", "standard", "strong"] as const) {
      expect(modelCatalogJson.model_classes[modelClass].context_window_tokens).toBe(1050000)
      expect(modelCatalogJson.model_classes[modelClass].max_output_tokens).toBe(128000)
    }

    expect(modelCatalogJson.provider_routes.anthropic_claude.models.small_fast.model_id).toBe(
      "claude-haiku-4-5"
    )
    expect(modelCatalogJson.provider_routes.anthropic_claude.models.standard.model_id).toBe(
      "claude-sonnet-4-6"
    )
    expect(modelCatalogJson.provider_routes.anthropic_claude.models.strong.model_id).toBe(
      "claude-opus-4-8"
    )
  })

  it("rejects a missing provider-tier entry with a typed routing error", () => {
    const incompleteCatalog = {
      default_provider: "openai_codex",
      provider_routes: {
        openai_codex: {
          models: {
            small_fast: modelCatalogJson.provider_routes.openai_codex.models.small_fast
          }
        }
      }
    } satisfies ModelCatalog

    expect(() => resolveModelFromCatalog(incompleteCatalog, "standard", undefined)).toThrow(
      "Missing model class in catalog: openai_codex/standard"
    )
  })
})
