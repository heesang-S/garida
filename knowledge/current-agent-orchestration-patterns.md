# Current Agent Orchestration Patterns

Research date: 2026-06-25

This note summarizes how current agent systems orchestrate work, using local examples from `omo` and `superpowers`, plus public framework patterns from OpenAI Agents SDK, LangGraph, AutoGen, and CrewAI.

## Core Finding

Modern orchestration usually combines three ideas:

1. **Code-controlled workflow** for predictable steps.
2. **LLM-controlled routing** for open-ended decisions.
3. **Manager-worker delegation** when work can be split across specialists.

The best systems do not use sub-agents everywhere. They use them when parallelism, specialization, or independent review is worth the coordination cost.

## Local Pattern: Superpowers

Superpowers uses a plan-first, subagent-driven development flow.

Important ideas:

- A plan is created before execution.
- Each independent task can be sent to a fresh sub-agent.
- Sub-agents should receive isolated, self-contained context.
- The parent agent coordinates and reviews rather than dumping full conversation history.
- Each task gets two review passes:
  - Spec compliance review.
  - Code quality review.
- A final review checks the complete implementation.

Model selection rule from the local Superpowers skill:

- Mechanical task touching 1-2 files with a complete spec: use a cheaper/faster model.
- Multi-file integration or debugging: use a standard model.
- Architecture, design, or broad review: use the strongest model.

What to copy for this project:

- Treat sub-agents as isolated workers.
- Give each worker a precise brief.
- Use review agents after implementation work.
- Escalate model strength only when task complexity justifies it.

## Local Pattern: OMO

OMO uses a stronger orchestration discipline:

- The parent agent conducts the work.
- Worker agents execute bounded tasks.
- Independent tasks are fanned out in parallel.
- Dependent tasks are serialized only when there is a named dependency.
- Workers are sized by task complexity.
- Every worker message must include:
  - Goal.
  - Scope.
  - Verification.
  - Constraints.
  - Required evidence.
- The parent verifies worker outputs instead of trusting them blindly.

OMO also has a local model catalog:

- Default role: strongest general model.
- Worker role: standard model.
- Verifier role: strongest/highest-reasoning model.
- Model metadata includes context window and reasoning effort.

What to copy for this project:

- Maintain a model catalog.
- Define role-based defaults.
- Require every delegation to have a verification contract.
- Store evidence for important decisions.
- Separate planning, execution, review, and QA.

## OpenAI Agents SDK Pattern

Source: [OpenAI Agents SDK orchestration docs](https://openai.github.io/openai-agents-python/multi_agent/) and [handoffs docs](https://openai.github.io/openai-agents-python/handoffs/)

OpenAI describes two main orchestration modes:

- **Orchestrating via LLM**: the model decides which tools, steps, and handoffs to use.
- **Orchestrating via code**: the application decides the workflow using structured outputs, chains, loops, and parallel execution.

Common OpenAI patterns:

- **Agents as tools**: a manager agent keeps control and calls specialist agents as tools.
- **Handoffs**: a triage agent transfers control to a specialist agent.
- **Structured-output routing**: the model classifies a task, then code chooses the next step.
- **Feedback loop**: a worker produces output, an evaluator checks it, and the worker improves it.
- **Parallel agents**: independent tasks run concurrently.

Useful distinction:

- Use **agents as tools** when a specialist should complete a bounded subtask but the manager should own the final answer.
- Use **handoffs** when a specialist should take over the conversation or next workflow segment.

What to copy for this project:

- Use code-controlled routing for predictable routing decisions.
- Use LLM-controlled routing when the task is open-ended.
- Prefer "agents as tools" for your first version, because your orchestrator should own synthesis.

## LangGraph Pattern

Source: [LangGraph workflows and agents docs](https://docs.langchain.com/oss/python/langgraph/workflows-agents)

LangGraph separates workflows from agents:

- **Workflows** have predetermined code paths.
- **Agents** dynamically choose their own tools and process.

LangGraph highlights these workflow patterns:

- **Prompt chaining**: output of one step feeds the next.
- **Parallelization**: independent subtasks run at the same time.
- **Routing**: classify input, then send it to the right path.
- **Orchestrator-worker**: the orchestrator breaks work into subtasks, delegates, and synthesizes.
- **Evaluator-optimizer**: a generator creates output and an evaluator loops until it passes.

LangGraph's orchestrator-worker pattern maps closely to this project:

```text
orchestrator
-> create subtask plan
-> send subtasks to workers
-> collect worker outputs
-> synthesize final result
```

What to copy for this project:

- Represent orchestration as a graph.
- Use explicit state.
- Store worker outputs in a shared state key.
- Have a dedicated synthesizer step.
- Start with deterministic routing before adding more autonomy.

## AutoGen Pattern

Source: [AutoGen AgentChat docs](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/index.html), [Selector Group Chat](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/selector-group-chat.html), [Swarm](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/swarm.html), and [GraphFlow](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/graph-flow.html)

AutoGen offers multiple orchestration styles:

- **SelectorGroupChat**: agents share a conversation, and a model selects the next speaker.
- **Swarm**: agents hand off to each other locally.
- **GraphFlow**: agents execute through a directed graph.

Interesting AutoGen ideas:

- A planning agent can break the task down.
- A selector chooses which agent speaks next based on shared context.
- Termination conditions control when collaboration stops.
- GraphFlow supports sequential, parallel, conditional, and looping flows.

What to copy for this project:

- Add explicit termination conditions.
- Make "who acts next?" a first-class routing decision.
- Use graph flow when control needs to be deterministic.
- Use selector-style routing when collaboration is open-ended.

## CrewAI Pattern

Source: [CrewAI crews docs](https://docs.crewai.com/en/concepts/crews), [processes docs](https://docs.crewai.com/en/concepts/processes), and [flows docs](https://docs.crewai.com/en/concepts/flows)

CrewAI has two main ideas:

- **Crews**: groups of role-based agents working on tasks.
- **Flows**: event-driven workflows with state, routing, and conditional logic.

CrewAI process types:

- **Sequential**: tasks run in order; earlier outputs become later context.
- **Hierarchical**: a manager agent plans, delegates, reviews outputs, and decides completion.

CrewAI Flows support:

- State.
- Start methods.
- Listeners.
- Conditional routing.
- `and` / `or` coordination.
- Streaming execution.

What to copy for this project:

- Support both sequential and hierarchical execution.
- Use a manager agent for complex dynamic work.
- Use flow/state logic for predictable pipelines.
- Add planning and validation around delegation.

## Common Orchestration Patterns

### 1. Router

```text
input
-> classify task
-> choose path/model/agent
-> run chosen path
```

Best for:

- Model selection.
- Simple task categories.
- Low-cost first version.

### 2. Prompt Chain

```text
step 1 output
-> step 2 input
-> step 3 input
```

Best for:

- Predictable multi-step work.
- Summaries, transformations, document generation.

### 3. Orchestrator-Worker

```text
orchestrator plans
-> workers execute subtasks
-> orchestrator synthesizes
```

Best for:

- Tasks with unknown number of subtasks.
- Coding, research, analysis, document updates.

### 4. Supervisor-Reviewer

```text
worker output
-> reviewer checks
-> worker fixes or supervisor accepts
```

Best for:

- Quality-sensitive work.
- Code implementation.
- Safety-critical workflows.

### 5. Graph Workflow

```text
nodes = agents or tools
edges = allowed transitions
state = shared workflow data
```

Best for:

- Deterministic control.
- Conditional branching.
- Loops with stop conditions.

### 6. Swarm / Handoff

```text
agent A
-> hands off to agent B
-> agent B owns next step
```

Best for:

- Specialist-owned conversations.
- Support flows.
- Domain-specific routing.

## Recommended Architecture for This Project

Start with a hybrid architecture:

```text
Task Intake
-> Task Classifier
-> Model Router
-> Delegation Policy
-> Planner
-> Worker Runner
-> Result Collector
-> Synthesizer
-> Reviewer
-> Final Response
```

Use code for:

- Model catalog lookup.
- Cost/latency constraints.
- Routing rules.
- Delegation threshold.
- State tracking.
- Verification requirements.
- Termination conditions.

Use LLMs for:

- Task classification.
- Complexity estimation.
- Subtask proposal.
- Specialist execution.
- Synthesis.
- Review.

## First Implementation Strategy

Build in this order:

1. **Model catalog**
   - Store model name, cost class, context window, latency class, strength, and ideal task types.

2. **Task classifier**
   - Return structured JSON:
     - task type
     - difficulty
     - risk
     - context size
     - tool needs
     - whether it can be split

3. **Model router**
   - Choose a model class from classifier output.
   - Explain the decision.

4. **Delegation policy**
   - Decide direct execution vs sub-agent decomposition.
   - Use rules before autonomy.

5. **Subtask planner**
   - Create bounded task briefs only when delegation is justified.

6. **Worker interface**
   - Each worker gets:
     - task
     - scope
     - context
     - constraints
     - expected output schema
     - verification criteria

7. **Synthesizer**
   - Merge outputs.
   - Resolve conflicts.
   - Identify missing pieces.

8. **Reviewer**
   - Check final answer against the original task and subtask outputs.

## Important Design Lessons

- Do not begin with full autonomy.
- Do not let sub-agents inherit full history by default.
- Do not create sub-agents just because you can.
- Make every delegation auditable.
- Make every route explainable.
- Keep a small set of orchestration primitives.
- Add graph workflows once simple routing is working.
- Add LLM-controlled routing only where rule-based routing is too rigid.

## Practical Rule for This Project

```text
if task is simple:
  solve directly with cheapest capable model

if task is complex but predictable:
  use code-controlled graph or chain

if task is complex and dynamic:
  use orchestrator-worker

if task is high-risk:
  add independent reviewer

if specialist should own the conversation:
  use handoff

if manager should own final answer:
  use agents-as-tools / worker calls
```

## Source Links

- [OpenAI Agents SDK: Agent orchestration](https://openai.github.io/openai-agents-python/multi_agent/)
- [OpenAI Agents SDK: Handoffs](https://openai.github.io/openai-agents-python/handoffs/)
- [LangGraph: Workflows and agents](https://docs.langchain.com/oss/python/langgraph/workflows-agents)
- [AutoGen: AgentChat](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/index.html)
- [AutoGen: Selector Group Chat](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/selector-group-chat.html)
- [AutoGen: Swarm](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/swarm.html)
- [AutoGen: GraphFlow](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/graph-flow.html)
- [CrewAI: Crews](https://docs.crewai.com/en/concepts/crews)
- [CrewAI: Processes](https://docs.crewai.com/en/concepts/processes)
- [CrewAI: Flows](https://docs.crewai.com/en/concepts/flows)

## Local References Inspected

- `/Users/HeeSang/.codex/plugins/cache/openai-curated/superpowers/202e9242/skills/subagent-driven-development/SKILL.md`
- `/Users/HeeSang/.codex/plugins/cache/openai-curated/superpowers/202e9242/skills/dispatching-parallel-agents/SKILL.md`
- `/Users/HeeSang/.codex/plugins/cache/sisyphuslabs/omo/0.1.0/skills/ulw-loop/references/full-workflow.md`
- `/Users/HeeSang/.codex/plugins/cache/sisyphuslabs/omo/0.1.0/skills/review-work/SKILL.md`
- `/Users/HeeSang/.codex/plugins/cache/sisyphuslabs/omo/0.1.0/model-catalog.json`
