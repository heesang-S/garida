import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const packageRoot = fileURLToPath(new URL("..", import.meta.url))

describe("eval report CLI", () => {
  it("prints a report for a JSONL execution log", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eval-report-cli-"))
    const logPath = join(directory, "runs.jsonl")
    await writeFile(
      logPath,
      `${JSON.stringify({
        run_id: "run-1",
        status: "completed",
        provider: "openai",
        model_id: "gpt-5.4",
        route: {
          model_class: "standard",
          provider: "openai_codex",
          model_id: "gpt-5.4",
          pricing_usd_per_1m_tokens: {
            input: 2.5,
            cached_input: 0.25,
            output: 15
          },
          delegate: false,
          add_reviewer: false,
          matched_rules: ["default"],
          routing_reason: "Test route.",
          fallback: "Fallback."
        },
        execution_plan: {
          execution_mode: "direct",
          worker_briefs: [],
          synthesis_strategy: "Summarize."
        },
        worker_results: [
          {
            worker_id: "worker-1",
            status: "succeeded",
            output: "ok",
            evidence: ["test"],
            usage: {
              input_tokens: 100,
              cached_input_tokens: 0,
              output_tokens: 50,
              total_tokens: 150
            },
            cost: {
              input_usd: 0.001,
              cached_input_usd: 0,
              output_usd: 0.005,
              total_usd: 0.006
            }
          }
        ],
        synthesis_strategy: "Summarize.",
        started_at_ms: 0,
        completed_at_ms: 10,
        duration_ms: 10
      })}\n`,
      "utf8"
    )

    const result = spawnSync(process.execPath, ["dist/src/eval-report-cli.js", "--", logPath], {
      cwd: packageRoot,
      encoding: "utf8"
    })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("Execution Eval Report")
    expect(result.stdout).toContain("Total runs: 1")
    expect(result.stdout).toContain("openai | runs=1 | worker_failures=0 | cost_usd=0.006")
  })
})
