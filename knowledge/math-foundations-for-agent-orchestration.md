# Math Foundations for Agent Orchestration

This document lists the mathematics worth learning for an agent that chooses the right model for a task, decides whether to create sub-agents, breaks work into subtasks, and merges the results.

The goal is not to become a mathematician first. The goal is to learn enough math to make the agent's decisions explicit, measurable, and improvable.

## 1. Probability and Statistics

Probability helps the agent reason under uncertainty. Every routing decision has uncertainty: whether a model will succeed, whether a task is hard, whether a sub-agent result is reliable, and whether extra cost is justified.

You should understand:

- Random variables: values whose outcomes are uncertain.
- Expected value: the average result you expect over many trials.
- Variance: how much outcomes can spread around the average.
- Conditional probability: how likely something is after observing evidence.
- Calibration: whether a confidence score actually matches reality.
- Precision and recall: useful for judging classifiers that route tasks.

Useful theorems and ideas:

- **Bayes' Theorem**: updates a belief after seeing evidence.
  - Use it when the agent revises its estimate of task difficulty after reading the prompt.
  - Formula: `P(A | B) = P(B | A) P(A) / P(B)`
- **Law of Total Probability**: breaks one probability into cases.
  - Use it when overall success depends on possible task categories.
- **Law of Large Numbers**: averages become more stable with more samples.
  - Use it when evaluating model-routing performance over many tasks.
- **Central Limit Theorem**: many averages look approximately normal.
  - Use it for confidence intervals around evaluation results.
- **Hoeffding's Inequality**: bounds how far sample performance may be from true performance.
  - Use it when deciding whether your benchmark results are trustworthy enough.

## 2. Decision Theory

Decision theory is the core math for model selection. The agent is choosing an action under uncertainty: use a small model, use a stronger model, ask for clarification, create sub-agents, or solve directly.

You should understand:

- Utility: a numerical score for how good an outcome is.
- Expected utility: utility weighted by probability.
- Loss functions: penalties for bad outcomes.
- Opportunity cost: what you give up by choosing one path.
- Risk sensitivity: caring not only about average outcome, but also bad-case outcomes.

Useful theorems and ideas:

- **Bayes Decision Rule**: choose the action with the lowest expected loss or highest expected utility.
  - Use it as the basic rule for model routing.
  - Example: choose a stronger model if its expected quality gain is worth its extra cost.
- **Value of Information**: information is useful when it can change the decision enough to justify its cost.
  - Use it to decide whether the agent should ask a clarifying question.
- **Expected Utility Maximization**: choose the action with the best probability-weighted outcome.
  - Use it to compare direct solving, delegation, and escalation.
- **Minimax Principle**: choose the option with the best worst-case outcome.
  - Use it for high-risk tasks where a bad answer is costly.

Simple routing shape:

```text
score(model) =
  expected_quality
  - cost_penalty
  - latency_penalty
  - risk_penalty
```

## 3. Algorithms and Complexity

Algorithms help the agent break work into parts and understand when a task is too large for a single pass. Complexity helps estimate effort, runtime, memory, and coordination overhead.

You should understand:

- Big-O notation: rough growth of runtime or memory.
- Divide and conquer: split a problem into smaller independent pieces.
- Graphs: nodes and edges, useful for task dependencies.
- Trees: useful for plans, search, and decomposition.
- Topological ordering: executing dependent tasks in a valid order.
- Scheduling: assigning tasks to workers or sub-agents.

Useful theorems and ideas:

- **Master Theorem**: estimates runtime for many divide-and-conquer algorithms.
  - Use it as a mental model for whether recursive task splitting is efficient.
- **Amdahl's Law**: parallel speedup is limited by the serial part of the work.
  - Use it before creating many sub-agents. If most work must be done sequentially, delegation will not help much.
  - Formula: `speedup <= 1 / (serial_part + parallel_part / workers)`
- **Topological Sort Correctness**: if dependencies form a directed acyclic graph, topological sort gives a valid execution order.
  - Use it when subtasks depend on one another.
- **No Free Lunch Theorem**: no algorithm is best for every possible problem.
  - Use it as a reminder that model routing should depend on task type.

Delegation rule of thumb:

```text
delegate if:
  expected_parallel_gain + specialization_gain
  >
  coordination_cost + merge_cost + error_risk
```

## 4. Optimization

Optimization helps the agent choose the best option subject to constraints. The agent may need to maximize quality while staying under limits for cost, latency, context size, or number of sub-agents.

You should understand:

- Objective functions: what the system is trying to maximize or minimize.
- Constraints: limits the system must obey.
- Multi-objective optimization: balancing quality, speed, cost, and reliability.
- Pareto optimality: when no option improves one goal without hurting another.
- Greedy methods: choosing the locally best option.
- Dynamic programming: solving problems by reusing smaller solutions.

Useful theorems and ideas:

- **Lagrange Multipliers**: optimize an objective while respecting constraints.
  - Useful conceptually for balancing quality against cost or latency.
- **Pareto Frontier**: the set of choices where improving one metric requires worsening another.
  - Use it to compare model options like cheap/fast vs expensive/accurate.
- **Bellman's Principle of Optimality**: optimal plans contain optimal subplans.
  - Use it when decomposing workflows into stages.
- **Convex Optimization Guarantee**: for convex problems, a local optimum is also global.
  - Useful when designing scoring functions that are easier to optimize.

## 5. Linear Algebra

Linear algebra is most useful when the agent uses embeddings, semantic search, clustering, retrieval, or task similarity.

You should understand:

- Vectors: lists of numbers representing meaning or features.
- Dot product: measures alignment between vectors.
- Norms: vector length.
- Cosine similarity: angle-based similarity.
- Matrices: transformations or collections of vectors.
- Dimensionality reduction: compressing vectors while preserving useful structure.

Useful theorems and ideas:

- **Cauchy-Schwarz Inequality**: bounds the dot product of two vectors.
  - Foundation for cosine similarity.
  - Formula: `|a . b| <= ||a|| ||b||`
- **Triangle Inequality**: direct distance is no greater than going through another point.
  - Useful for understanding distance metrics.
- **Spectral Theorem**: certain matrices can be decomposed into eigenvectors and eigenvalues.
  - Useful background for PCA and representation learning.
- **Singular Value Decomposition**: factors a matrix into simpler parts.
  - Useful for dimensionality reduction, compression, and latent structure.

## 6. Information Theory

Information theory helps the agent decide what context matters, how much uncertainty remains, and which question would reduce confusion the most.

You should understand:

- Entropy: uncertainty in a distribution.
- Information gain: how much uncertainty is reduced by new evidence.
- Mutual information: how much one variable tells you about another.
- Compression: keeping signal while removing redundancy.
- Noise: irrelevant or misleading information.

Useful theorems and ideas:

- **Entropy Formula**: measures uncertainty.
  - Formula: `H(X) = -sum p(x) log p(x)`
- **Information Gain**: reduction in entropy after observing evidence.
  - Use it to choose clarifying questions.
- **Data Processing Inequality**: processing data cannot create new information about the original source.
  - Use it as a reminder that summaries can lose important details.
- **Source Coding Theorem**: entropy gives a lower bound on average compression length.
  - Useful as background for context compression and summarization.

## 7. Graph Theory

Graph theory is useful for representing task plans, dependencies, sub-agent communication, and result synthesis.

You should understand:

- Directed graphs: tasks pointing to dependent tasks.
- Directed acyclic graphs: dependency plans with no loops.
- Connected components: independent groups of work.
- Shortest paths: cheapest way to reach a goal.
- Cut vertices and bottlenecks: points where failure blocks the plan.

Useful theorems and ideas:

- **DAG Topological Ordering Theorem**: every finite directed acyclic graph has at least one topological ordering.
  - Use it to schedule dependent subtasks.
- **Max-Flow Min-Cut Theorem**: maximum flow equals minimum bottleneck capacity.
  - Useful as a metaphor and tool for resource allocation.
- **Dijkstra's Algorithm Correctness**: with non-negative costs, it finds shortest paths.
  - Use it conceptually for cheapest valid execution routes.

## 8. Evaluation Metrics

Evaluation metrics are not pure math, but they turn agent quality into something measurable.

You should understand:

- Accuracy: percent correct.
- Precision: of selected items, how many were good.
- Recall: of all good items, how many were selected.
- F1 score: balance between precision and recall.
- Confusion matrix: table of correct and incorrect classifications.
- Inter-rater agreement: whether judges agree on quality.
- Confidence intervals: uncertainty around measured performance.

Useful theorems and ideas:

- **Precision-Recall Tradeoff**: improving one can reduce the other.
  - Use it when deciding whether the router should be aggressive or conservative.
- **Bias-Variance Tradeoff**: simple systems may underfit; complex systems may overfit.
  - Use it when deciding how complicated the routing policy should be.
- **Goodhart's Law**: when a measure becomes a target, it can stop being a good measure.
  - Use it when designing benchmarks and automated scores.

## Suggested Learning Order

1. Probability and statistics
2. Decision theory
3. Algorithms and complexity
4. Optimization
5. Linear algebra
6. Information theory
7. Graph theory
8. Evaluation metrics

## Minimal Practical Formula Set

Start with these. They are enough to design a first version of the orchestrator.

```text
expected_value = sum(probability_of_outcome * value_of_outcome)

expected_utility(action) =
  expected_quality(action)
  - expected_cost(action)
  - expected_latency_penalty(action)
  - expected_risk_penalty(action)

choose action =
  argmax(expected_utility(action))

delegate if =
  expected_gain_from_parallelism
  + expected_gain_from_specialization
  - coordination_cost
  - merge_cost
  - added_error_risk
  > 0

ask_clarifying_question if =
  value_of_information
  >
  cost_of_delay_or_interruption
```

## How This Maps to the Agent

- Probability estimates whether a model or sub-agent will succeed.
- Decision theory chooses the best action under uncertainty.
- Algorithms split work into clean subtasks.
- Complexity theory prevents over-delegation.
- Optimization balances quality, cost, speed, and risk.
- Linear algebra powers embeddings and similarity search.
- Information theory decides what context to keep, remove, or request.
- Graph theory schedules dependencies between subtasks.
- Evaluation metrics tell whether the orchestrator is improving.
