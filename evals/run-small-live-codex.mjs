import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { spawnSync } from "node:child_process"

const root = new URL("..", import.meta.url).pathname
const outputDir = new URL("./small-live-codex-2026-08-02/", import.meta.url).pathname
mkdirSync(outputDir, { recursive: true })

const codex = "/Applications/ChatGPT.app/Contents/Resources/codex"
const codexHome = "/tmp/garida-codex-home-min"
const schema = new URL("./codex-answer-schema.json", import.meta.url).pathname
const strongModel = "gpt-5.6-sol"

const tasks = [
  {
    id: "C1",
    category: "coding",
    model: "gpt-5.6-luna",
    assessment: { task_type: "coding", complexity: "low", risk: "low", context_size: "small", tool_need: "none", parallelizable: false, requires_subagents: false, confidence: 0.96, reasoning: "A small, low-risk pure function is easy to verify." },
    prompt: "Write a compact JavaScript function sumEven(numbers) that returns the sum of even integers. Include one short example call.",
    check: (s) => /sumEven/i.test(s) && /even|%\s*2/i.test(s) && /return/i.test(s)
  },
  {
    id: "C2",
    category: "coding",
    model: "gpt-5.6-luna",
    assessment: { task_type: "coding", complexity: "low", risk: "low", context_size: "small", tool_need: "none", parallelizable: false, requires_subagents: false, confidence: 0.95, reasoning: "A short read-only SQL query has low risk and a clear acceptance check." },
    prompt: "Write SQL that returns the three highest-spending customers from customers(id,name) and orders(customer_id,total), including customer name and total spend.",
    check: (s) => /select/i.test(s) && /join/i.test(s) && /order\s+by/i.test(s) && /limit\s+3/i.test(s)
  },
  {
    id: "C3",
    category: "coding",
    model: "gpt-5.6-terra",
    assessment: { task_type: "coding", complexity: "medium", risk: "medium", context_size: "medium", tool_need: "light", parallelizable: false, requires_subagents: false, confidence: 0.86, reasoning: "Validation and error handling require normal multi-step coding judgment." },
    prompt: "Write a compact TypeScript function parseUser(json) that parses JSON and throws an Error when the result lacks a non-empty string name. Keep the function self-contained.",
    check: (s) => /parseUser/i.test(s) && /JSON\.parse|json\.parse/i.test(s) && /throw|error/i.test(s) && /name/i.test(s)
  },
  {
    id: "D1",
    category: "debugging",
    model: "gpt-5.6-sol",
    assessment: { task_type: "debugging", complexity: "medium", risk: "medium", context_size: "small", tool_need: "light", parallelizable: false, requires_subagents: false, confidence: 0.91, reasoning: "Debugging needs stronger reasoning and verification even for a small snippet." },
    prompt: "Find and fix the bug in this JavaScript: for (let i = 0; i <= items.length; i++) console.log(items[i]); Explain the fix in one sentence.",
    check: (s) => /i\s*<\s*items\.length/i.test(s) && /out.of.bounds|undefined|off.by.one|last index/i.test(s)
  },
  {
    id: "D2",
    category: "debugging",
    model: "gpt-5.6-sol",
    assessment: { task_type: "debugging", complexity: "high", risk: "medium", context_size: "medium", tool_need: "light", parallelizable: false, requires_subagents: false, confidence: 0.9, reasoning: "The bug is subtle and requires careful state reasoning." },
    prompt: "Explain and fix Python's mutable-default bug in: def add_item(item, items=[]): items.append(item); return items. Show the corrected signature and why it works.",
    check: (s) => /none/i.test(s) && /def\s+add_item/i.test(s) && /mutable|shared|default/i.test(s)
  },
  {
    id: "D3",
    category: "debugging",
    model: "gpt-5.6-sol",
    assessment: { task_type: "debugging", complexity: "high", risk: "medium", context_size: "medium", tool_need: "heavy", parallelizable: false, requires_subagents: false, confidence: 0.88, reasoning: "SQL join semantics and filtering require deep debugging and verification." },
    prompt: "A LEFT JOIN query unexpectedly drops customers without orders because a condition on orders.status is in WHERE. Explain why and give the corrected SQL pattern.",
    check: (s) => /left\s+join/i.test(s) && /where/i.test(s) && /on/i.test(s) && /null|preserve|moves? the condition|condition.*join/i.test(s)
  },
  {
    id: "R1",
    category: "review",
    model: "gpt-5.6-sol",
    assessment: { task_type: "review", complexity: "medium", risk: "high", context_size: "medium", tool_need: "light", parallelizable: false, requires_subagents: false, confidence: 0.93, reasoning: "Security-sensitive review requires the strongest model class and independent checking." },
    prompt: "Review this browser code: element.innerHTML = userProvidedComment. Identify the security risk and give the safest simple replacement.",
    check: (s) => /xss|cross.site|injection/i.test(s) && /textcontent|sanitize|escape/i.test(s)
  },
  {
    id: "R2",
    category: "review",
    model: "gpt-5.6-sol",
    assessment: { task_type: "review", complexity: "medium", risk: "high", context_size: "medium", tool_need: "light", parallelizable: false, requires_subagents: false, confidence: 0.93, reasoning: "Logging credentials is a high-risk security review." },
    prompt: "Review a service that logs every HTTP request including the Authorization header. State the risk and the concrete logging change required.",
    check: (s) => /token|credential|secret|authorization/i.test(s) && /redact|remove|mask|never log/i.test(s)
  },
  {
    id: "R3",
    category: "review",
    model: "gpt-5.6-sol",
    assessment: { task_type: "review", complexity: "high", risk: "high", context_size: "large", tool_need: "heavy", parallelizable: false, requires_subagents: false, confidence: 0.9, reasoning: "A production data deletion review is high-risk and context-heavy." },
    prompt: "Review a production endpoint that permanently deletes user data immediately after one request. List the most important safety controls before approval.",
    check: (s) => /soft.delete|backup|audit|confirm|authorization|recovery|retention/i.test(s) && /2/.test(s)
  },
  {
    id: "P1",
    category: "planning",
    model: "gpt-5.6-terra",
    assessment: { task_type: "planning", complexity: "medium", risk: "medium", context_size: "medium", tool_need: "light", parallelizable: false, requires_subagents: false, confidence: 0.86, reasoning: "A normal migration needs a structured but non-delegated plan." },
    prompt: "Give a concise plan to migrate /v1/users to /v2/users without breaking existing clients. Include compatibility, tests, rollout, and rollback.",
    check: (s) => /compat|backward|v1|v2/i.test(s) && /test/i.test(s) && /rollout|deploy/i.test(s) && /rollback/i.test(s)
  },
  {
    id: "P2",
    category: "planning",
    model: "gpt-5.6-sol",
    assessment: { task_type: "planning", complexity: "high", risk: "high", context_size: "large", tool_need: "heavy", parallelizable: true, requires_subagents: true, confidence: 0.88, reasoning: "High-risk architecture planning benefits from the strongest model and review." },
    prompt: "Plan a production retry policy for an API client. Include retry classification, exponential backoff, jitter, maximum attempts, idempotency, and observability.",
    check: (s) => /retryable|transient|classification/i.test(s) && /exponential/i.test(s) && /jitter/i.test(s) && /idempot/i.test(s) && /observ/i.test(s)
  },
  {
    id: "P3",
    category: "planning",
    model: "gpt-5.6-sol",
    assessment: { task_type: "planning", complexity: "high", risk: "high", context_size: "large", tool_need: "heavy", parallelizable: true, requires_subagents: true, confidence: 0.87, reasoning: "A high-risk data migration needs architecture-level planning and review." },
    prompt: "Plan a safe backfill of 10 million records into a new schema. Include batching, validation, idempotency, monitoring, throttling, and rollback.",
    check: (s) => /batch/i.test(s) && /valid/i.test(s) && /idempot/i.test(s) && /monitor/i.test(s) && /rollback/i.test(s)
  }
]

const byId = new Map(tasks.map((task) => [task.id, task]))
const garidaGroups = [
  ["C1", "C2"],
  ["C3", "P1"],
  ["D1", "D2", "D3", "R1", "R2", "R3", "P2", "P3"]
]
const strongGroups = [
  ["C1", "C2", "C3", "D1"],
  ["D2", "D3", "R1", "R2"],
  ["R3", "P1", "P2", "P3"]
]

function buildPrompt(ids) {
  return [
    "Answer each numbered task independently.",
    "Return only a JSON object with an answers array. Each item must have exactly: id (string) and answer (string).",
    "Keep each answer concise (maximum 60 words). Do not use tools, inspect files, or discuss this benchmark.",
    ...ids.map((id) => {
      const task = byId.get(id)
      return `\nTASK ${task.id} (${task.category}): ${task.prompt}`
    })
  ].join("\n")
}

function runGroup(name, model, ids) {
  const outputPath = `${outputDir}${name}.json`
  const promptPath = `${outputDir}${name}.prompt.txt`
  writeFileSync(promptPath, buildPrompt(ids))
  const result = spawnSync(codex, [
    "exec", "--ephemeral", "--skip-git-repo-check", "-C", "/tmp", "-s", "read-only",
    "-m", model, "-c", 'model_reasoning_effort="low"',
    "--output-schema", schema, "-o", outputPath, buildPrompt(ids)
  ], {
    cwd: "/tmp",
    env: { ...process.env, CODEX_HOME: codexHome },
    encoding: "utf8",
    timeout: 180000
  })
  writeFileSync(`${outputDir}${name}.stderr.log`, result.stderr ?? "")
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${name} failed with exit ${result.status}: ${result.stderr}`)
  const raw = readFileSync(outputPath, "utf8")
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed.answers)) throw new Error(`${name} returned no answers array`)
  return parsed.answers
}

const runs = []
for (const [index, ids] of garidaGroups.entries()) {
  runs.push({ arm: "garida", model: ids.length === 2 && ids.includes("C1") ? "gpt-5.6-luna" : ids.includes("C3") ? "gpt-5.6-terra" : strongModel, ids, answers: runGroup(`garida-${index + 1}`, ids.includes("C1") ? "gpt-5.6-luna" : ids.includes("C3") ? "gpt-5.6-terra" : strongModel, ids) })
}
for (const [index, ids] of strongGroups.entries()) {
  runs.push({ arm: "fixed-strong", model: strongModel, ids, answers: runGroup(`fixed-strong-${index + 1}`, strongModel, ids) })
}

const records = []
for (const run of runs) {
  for (const item of run.answers) {
    const task = byId.get(item.id)
    if (task === undefined || !run.ids.includes(item.id)) continue
    records.push({
      task_id: task.id,
      category: task.category,
      arm: run.arm,
      model: run.model,
      success: task.check(item.answer) ? 1 : 0,
      answer_chars: item.answer.length,
      answer: item.answer
    })
  }
}

const byArm = (arm) => records.filter((record) => record.arm === arm)
const summary = {}
for (const arm of ["garida", "fixed-strong"]) {
  const armRecords = byArm(arm)
  const successes = armRecords.reduce((sum, record) => sum + record.success, 0)
  summary[arm] = { completed: armRecords.length, successes, success_rate: armRecords.length === 0 ? null : successes / armRecords.length }
}
const garidaModelCounts = Object.fromEntries([...new Set(records.filter((r) => r.arm === "garida").map((r) => r.model))].map((model) => [model, records.filter((r) => r.arm === "garida" && r.model === model).length]))
const report = {
  date: "2026-08-02",
  protocol: "six batched Codex calls: three Garida route groups and three fixed-strong groups",
  note: "Batched calls reduce quota overhead; this is directional and not identical to the planned 24-call per-task protocol.",
  limits: { max_codex_calls: 6, max_answer_words: 60 },
  route_distribution: garidaModelCounts,
  summary,
  success_gap_percentage_points: summary.garida.success_rate === null || summary["fixed-strong"].success_rate === null ? null : (summary.garida.success_rate - summary["fixed-strong"].success_rate) * 100,
  records
}
writeFileSync(`${outputDir}results.json`, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
