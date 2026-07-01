import { describe, expect, it } from "vitest"

import { routeTask } from "../src/router.js"

describe("routeTask", () => {
  it("routes simple low-risk tasks to small_fast without delegation", async () => {
    const decision = await routeTask({
      task_type: "writing",
      complexity: "low",
      risk: "low",
      context_size: "small",
      tool_need: "none",
      parallelizable: false,
      requires_subagents: false,
      confidence: 0.96,
      reasoning: "Simple writing task."
    })

    expect(decision.model_class).toBe("small_fast")
    expect(decision.provider).toBe("openai_codex")
    expect(decision.model_id).toBe("gpt-5.4-mini")
    expect(decision.delegate).toBe(false)
    expect(decision.add_reviewer).toBe(false)
  })

  it("resolves Claude models when the provider is available", async () => {
    const decision = await routeTask(
      {
        task_type: "testing",
        complexity: "medium",
        risk: "medium",
        context_size: "medium",
        tool_need: "light",
        parallelizable: false,
        requires_subagents: false,
        confidence: 0.9,
        reasoning: "Medium-risk testing task."
      },
      { preferred_provider: "anthropic_claude" }
    )

    expect(decision.model_class).toBe("standard")
    expect(decision.provider).toBe("anthropic_claude")
    expect(decision.model_id).toBe("claude-sonnet-4-6")
    expect(decision.pricing_usd_per_1m_tokens.input).toBe(3)
    expect(decision.pricing_usd_per_1m_tokens.output).toBe(15)
  })

  it("routes medium debugging tasks to strong", async () => {
    const decision = await routeTask({
      task_type: "debugging",
      complexity: "medium",
      risk: "medium",
      context_size: "medium",
      tool_need: "heavy",
      parallelizable: false,
      requires_subagents: false,
      confidence: 0.84,
      reasoning: "Debugging task."
    })

    expect(decision.model_class).toBe("strong")
    expect(decision.model_id).toBe("gpt-5.5")
  })

  it("adds reviewer for high-risk review tasks", async () => {
    const decision = await routeTask({
      task_type: "review",
      complexity: "medium",
      risk: "high",
      context_size: "medium",
      tool_need: "light",
      parallelizable: false,
      requires_subagents: false,
      confidence: 0.91,
      reasoning: "High-risk review."
    })

    expect(decision.model_class).toBe("strong")
    expect(decision.add_reviewer).toBe(true)
  })

  it("delegates high-complexity parallel work and adds reviewer", async () => {
    const decision = await routeTask({
      task_type: "planning",
      complexity: "high",
      risk: "medium",
      context_size: "large",
      tool_need: "light",
      parallelizable: true,
      requires_subagents: true,
      confidence: 0.88,
      reasoning: "Complex planning task."
    })

    expect(decision.delegate).toBe(true)
    expect(decision.add_reviewer).toBe(true)
    expect(decision.matched_rules).toContain("complex_parallel_work_delegates")
  })

  it("includes escalation fallback for low confidence", async () => {
    const decision = await routeTask({
      task_type: "conversation",
      complexity: "medium",
      risk: "low",
      context_size: "small",
      tool_need: "none",
      parallelizable: false,
      requires_subagents: false,
      confidence: 0.5,
      reasoning: "Ambiguous task."
    })

    expect(decision.fallback).toContain("Low task-assessment confidence")
  })
})
