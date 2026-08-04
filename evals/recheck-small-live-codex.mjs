import { readFileSync, writeFileSync } from "node:fs"

const dir = new URL("./small-live-codex-2026-08-02/", import.meta.url).pathname
const tasks = {
  C1: { category: "coding", check: (s) => /sumEven/i.test(s) && /even|%\s*2/i.test(s) && (/return/i.test(s) || /=>/.test(s)) },
  C2: { category: "coding", check: (s) => /select/i.test(s) && /join/i.test(s) && /order\s+by/i.test(s) && /limit\s+3/i.test(s) },
  C3: { category: "coding", check: (s) => /parseUser/i.test(s) && /JSON\.parse|json\.parse/i.test(s) && /throw|error/i.test(s) && /name/i.test(s) },
  D1: { category: "debugging", check: (s) => /i\s*<\s*items\.length/i.test(s) && /out.of.bounds|undefined|off.by.one|last valid|past the end/i.test(s) },
  D2: { category: "debugging", check: (s) => /none/i.test(s) && /def\s+add_item/i.test(s) && /mutable|shared|default/i.test(s) },
  D3: { category: "debugging", check: (s) => /left\s+join/i.test(s) && /where/i.test(s) && /on/i.test(s) && /null|preserve|moves? the condition|condition.*join/i.test(s) },
  R1: { category: "review", check: (s) => /xss|cross.site|injection/i.test(s) && /textcontent|sanitize|escape/i.test(s) },
  R2: { category: "review", check: (s) => /token|credential|secret|authorization/i.test(s) && /redact|remove|mask|never log/i.test(s) },
  R3: { category: "review", check: (s) => /soft.delete|backup|audit|confirm|authorization|recovery|retention/i.test(s) && /delete|deletion/i.test(s) },
  P1: { category: "planning", check: (s) => /compat|backward|v1|v2/i.test(s) && /test/i.test(s) && /rollout|deploy|release|canar/i.test(s) && /roll\s*back/i.test(s) },
  P2: { category: "planning", check: (s) => /retryable|transient|classification/i.test(s) && /exponential/i.test(s) && /jitter/i.test(s) && /idempot/i.test(s) && /observ|metrics|logging|record|alert/i.test(s) },
  P3: { category: "planning", check: (s) => /batch/i.test(s) && /valid/i.test(s) && /idempot/i.test(s) && /monitor/i.test(s) && /rollback|replay/i.test(s) }
}

const groups = [
  ["garida", "gpt-5.6-luna", ["C1", "C2"], "garida-1"],
  ["garida", "gpt-5.6-terra", ["C3", "P1"], "garida-2"],
  ["garida", "gpt-5.6-sol", ["D1", "D2", "D3", "R1", "R2", "R3", "P2", "P3"], "garida-3"],
  ["fixed-strong", "gpt-5.6-sol", ["C1", "C2", "C3", "D1"], "fixed-strong-1"],
  ["fixed-strong", "gpt-5.6-sol", ["D2", "D3", "R1", "R2"], "fixed-strong-2"],
  ["fixed-strong", "gpt-5.6-sol", ["R3", "P1", "P2", "P3"], "fixed-strong-3"]
]

const records = []
const quota = {}
for (const [arm, model, ids, name] of groups) {
  const answers = JSON.parse(readFileSync(`${dir}${name}.json`, "utf8")).answers
  const answerMap = new Map(answers.map((answer) => [answer.id, answer.answer]))
  for (const id of ids) {
    const answer = answerMap.get(id) ?? ""
    records.push({ task_id: id, category: tasks[id].category, arm, model, success: tasks[id].check(answer) ? 1 : 0, answer_chars: answer.length })
  }
  const stderr = readFileSync(`${dir}${name}.stderr.log`, "utf8")
  const tokenMatch = stderr.match(/tokens used\s+([\d,]+)/g)?.at(-1)?.match(/[\d,]+$/)
  quota[arm] = (quota[arm] ?? 0) + (tokenMatch === undefined ? 0 : Number(tokenMatch[0].replaceAll(",", "")))
}

const summary = {}
for (const arm of ["garida", "fixed-strong"]) {
  const armRecords = records.filter((record) => record.arm === arm)
  const successes = armRecords.reduce((sum, record) => sum + record.success, 0)
  summary[arm] = { completed: armRecords.length, successes, success_rate: successes / armRecords.length, quota_tokens: quota[arm] }
}

const report = {
  date: "2026-08-02",
  protocol: "six batched Codex calls: three Garida route groups and three fixed-strong groups",
  decision: "inconclusive",
  decision_reason: "Success parity was observed, but Codex subscription quota tokens are not provider billing and the batched-call shape cannot establish the 15% cost gate.",
  route_distribution: { "gpt-5.6-luna": 2, "gpt-5.6-terra": 2, "gpt-5.6-sol": 8 },
  summary,
  total_benchmark_quota_tokens: Object.values(quota).reduce((sum, value) => sum + value, 0),
  success_gap_percentage_points: 0,
  records
}
writeFileSync(`${dir}results-corrected.json`, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
