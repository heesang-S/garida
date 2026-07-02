import { runRoutedCodexExecution } from "../packages/executor-codex/dist/src/index.js"

const route = {
  model_class: "strong",
  provider: "openai_codex",
  model_id: "gpt-5.5",
  pricing_usd_per_1m_tokens: {
    input: 3,
    cached_input: 0.3,
    output: 15
  },
  delegate: true,
  add_reviewer: true,
  matched_rules: ["complex"],
  routing_reason: "Needs a stronger Codex worker and reviewer.",
  fallback: "Use the current model only if a routed worker cannot be started."
}

const executionPlan = {
  execution_mode: "direct",
  worker_briefs: [
    {
      id: "worker-1",
      title: "Implement routing bridge",
      objective: "Bridge prepare_execution output to separate Codex workers.",
      model_class: "strong",
      provider: "openai_codex",
      model_id: "gpt-5.5",
      constraints: [
        "Keep the plugin thin.",
        "Reuse executor-core orchestration."
      ],
      expected_output: "Working routed Codex execution helper.",
      acceptance_criteria: [
        "Uses codex exec with the routed model.",
        "Returns structured worker results."
      ]
    }
  ],
  reviewer_brief: {
    id: "reviewer-1",
    title: "Review routing bridge",
    objective: "Review the routed worker execution path for regressions.",
    model_class: "strong",
    provider: "openai_codex",
    model_id: "gpt-5.5",
    constraints: ["Focus on execution and result-shape correctness."],
    expected_output: "A pass/fail review result.",
    acceptance_criteria: ["Calls out any execution-path regressions."]
  },
  synthesis_strategy: "Combine worker and reviewer results into one final response."
}

const result = await runRoutedCodexExecution({
  route,
  execution_plan: executionPlan
})

console.log(JSON.stringify(result, null, 2))
