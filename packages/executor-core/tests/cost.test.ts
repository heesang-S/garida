import { describe, expect, it } from "vitest"

import { estimateTokenCost } from "../src/index.js"
import type { ModelPricing } from "@model-orchestration/shared-types"

const pricing: ModelPricing = {
  input: 2,
  cached_input: 0.5,
  output: 8
}

describe("estimateTokenCost", () => {
  it("computes input, cached input, output, and total cost from per-million pricing", () => {
    const cost = estimateTokenCost(
      {
        input_tokens: 1_000,
        cached_input_tokens: 2_000,
        output_tokens: 500,
        total_tokens: 3_500
      },
      pricing
    )

    expect(cost).toEqual({
      input_usd: 0.002,
      cached_input_usd: 0.001,
      output_usd: 0.004,
      total_usd: 0.007
    })
  })
})
