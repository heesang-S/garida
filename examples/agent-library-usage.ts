import { prepareAgentExecution } from "@garida/core"

const result = await prepareAgentExecution(
  {
    task_type: "planning",
    complexity: "high",
    risk: "medium",
    context_size: "large",
    tool_need: "light",
    parallelizable: true,
    requires_subagents: true,
    confidence: 0.92,
    reasoning: "Plan a multi-step Codex integration.",
    suggested_subtasks: [
      {
        title: "Design adapter",
        objective: "Define how Codex calls the routing service.",
        independent: true
      },
      {
        title: "Design verification",
        objective: "Define how route decisions are tested.",
        independent: true
      }
    ]
  },
  {
    preferred_provider: "openai_codex"
  }
)

console.log(JSON.stringify(result, null, 2))
