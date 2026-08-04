import type { ModelPricing } from "@garida/types"

export type TokenUsage = {
  readonly input_tokens: number
  readonly cached_input_tokens: number
  readonly output_tokens: number
  readonly total_tokens: number
}

export type TokenCost = {
  readonly input_usd: number
  readonly cached_input_usd: number
  readonly output_usd: number
  readonly total_usd: number
}

export function estimateTokenCost(usage: TokenUsage, pricing: ModelPricing): TokenCost {
  const inputUsd = costFromPerMillionTokens(usage.input_tokens, pricing.input)
  const cachedInputUsd = costFromPerMillionTokens(
    usage.cached_input_tokens,
    pricing.cached_input ?? pricing.input
  )
  const outputUsd = costFromPerMillionTokens(usage.output_tokens, pricing.output)

  return {
    input_usd: inputUsd,
    cached_input_usd: cachedInputUsd,
    output_usd: outputUsd,
    total_usd: roundUsd(inputUsd + cachedInputUsd + outputUsd)
  }
}

function costFromPerMillionTokens(tokens: number, priceUsdPerMillion: number): number {
  return roundUsd((tokens / 1_000_000) * priceUsdPerMillion)
}

function roundUsd(value: number): number {
  return Math.round(value * 1_000_000_000_000) / 1_000_000_000_000
}
