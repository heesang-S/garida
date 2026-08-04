# Garida public `0.1.0-alpha` release tracker

This is the operational companion to the [public release plan](./public-release-plan.md). The repository-first follow-up roadmap is in [`public-repo-milestones.md`](./public-repo-milestones.md), with visibility and settings steps in [`github-repository-setup.md`](./github-repository-setup.md). Update checkbox state, owner, evidence link, and blocker notes as work completes. Keep unchecked work actionable; do not mark a task complete until its listed acceptance evidence exists.

## Release metadata

| Field | Current value |
| --- | --- |
| Target | `0.1.0-alpha.1` |
| Registry tag | `next` (never `latest`) |
| Runtime | Node `>=22.13`; verify Node 22 and 24 |
| Public foundation | Core library |
| Primary universal adapter | MCP |
| HTTP status | Experimental |
| Executors/plugins | Unpublished for first alpha |
| Package names | `@garida/types`, `@garida/core`, `@garida/mcp`, `@garida/http` |
| License | MIT (selected) |

## Status guidance

- `[ ]` not started or incomplete.
- `[~]` in progress; add owner and evidence/status notes.
- `[x]` complete with verification evidence.
- Use `Blocked:` for a concrete decision or external dependency; record resolution in the blockers section.

## Milestone 1 — Product contract and OSS foundation

### PR 1 — Public contract

- [~] Confirm npm scope availability and `garida-mcp` executable name; registry names are unregistered, but scope ownership still needs the publishing account.
- [x] Set and document Node `>=22.13`, Node 22/24 support, pinned pnpm, and ESM-only alpha support.
- [ ] Document product positioning: deterministic, explainable model routing.
- [ ] Document library foundation, MCP primary adapter, HTTP experimental status, and executor/plugin exclusion.
- [ ] Document limitations and non-goals without universal-optimality claims.
- [x] Acceptance: root remains private and public contracts carry no unsupported promise; README now labels the repository as an experimental alpha.

### PR 2 — OSS essentials

- [x] Select MIT and add the standard `LICENSE` file.
- [x] Add `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SUPPORT.md`, and `CHANGELOG.md`.
- [ ] Add issue/PR templates, `CODEOWNERS`, repository metadata, and format/lint contribution instructions.
- [x] Remove personal filesystem paths, credentials, and machine-specific configuration from public material.
- [x] Add initial Node 22/24 CI and Dependabot configuration.
- [ ] Acceptance: clean-clone contributor onboarding succeeds and GitHub recognizes the chosen license.

## Milestone 2 — Stable portable routing core

### PR 3 — Core API

- [ ] Export `createRouter`, public types, validators, and documented typed errors.
- [ ] Version assessment, route, execution-plan, policy, and catalog schemas.
- [ ] Support validated custom policies/catalogs plus immutable bundled defaults.
- [ ] Preserve matched rules, route reason, fallback, model/pricing snapshot, and measured/estimated provenance.
- [ ] Add deterministic-output tests.
- [ ] Acceptance: a fixture project uses only core; invalid inputs return documented errors.

### PR 4 — Package portability

- [x] Set `private: false` only on the current intended release packages.
- [x] Add package `exports`, types, files, engines, license/repository metadata, and publish configuration.
- [x] Verify runtime policy/catalog/schema assets ship in `npm pack --dry-run` output.
- [x] Convert public-package workspace dependencies to publish-safe `^0.1.0` ranges.
- [ ] Replace hard-coded Codex binary locations with PATH lookup or `GARIDA_CODEX_COMMAND`.
- [ ] Remove unsafe bypass flags from public examples.
- [ ] Add `publint`.
- [x] Run `npm pack --dry-run` plus a blank-project install/import/typecheck smoke check.
- [ ] Acceptance: packed artifacts work in a clean project.

## Milestone 3 — Integration surfaces

### PR 5 — MCP release package

- [ ] Add a stdio `garida-mcp` binary for pinned `npx` installation.
- [ ] Define exact schemas for `route_task` and `prepare_execution`.
- [ ] Return structured validation errors without process crashes.
- [ ] Reserve stdout for MCP protocol and use stderr for diagnostics.
- [ ] Support bundled defaults and optional explicit policy/catalog file paths.
- [ ] Add real MCP-client packed-binary smoke test.
- [ ] Acceptance: both tools are discoverable and callable from a clean temporary directory.

### PR 6 — Experimental executor hardening

- [ ] Respect subtask independence and configure bounded concurrency.
- [ ] Abort subprocesses/requests on cancellation or timeout.
- [ ] Bound output size and make prompt/output logging opt-in.
- [ ] Add retry classification, exponential backoff, and jitter.
- [ ] Redact sensitive values in logs/errors.
- [ ] Return typed unsupported-executor errors.
- [ ] Ensure executor and host-plugin packages remain unpublished and unadvertised.
- [ ] Acceptance: timeout, no-retry, bounded-concurrency, and redaction tests pass.

### PR 6.5 — Fast competitive evaluation gate `[~]`

- [ ] Run the minimal 12-task / two-arm evaluation in
  [`small-live-benchmark-plan.md`](./small-live-benchmark-plan.md).
- [x] Run the quota-bounded six-call directional variant; see
  [`small-live-codex-2026-08-02.md`](../evals/small-live-codex-2026-08-02.md).
- [x] Add the zero-token public-repository capability matrix in
  [`public-repo-capability-matrix.md`](./public-repo-capability-matrix.md).
- [ ] Enforce the 24-call, 256-token, 30-second-per-task, and USD 3 limits.
- [ ] Record sanitized JSONL plus a Markdown summary with pinned model/pricing
  metadata.
- [ ] Mark the result promising, adjust-routing, or inconclusive using the
  directional thresholds in the benchmark plan.
- [ ] Do not treat this small sample as the final PR 8 launch gate.

### PR 7 — Experimental HTTP adapter `[~]`

- [x] Depend directly on core, not MCP helpers.
- [x] Export `createHttpApp({ router })`.
- [x] Implement `/v1/route`, `/v1/plan`, and `/healthz`.
- [x] Default bind address to `127.0.0.1`.
- [x] Add request limits, timeouts, and redacted errors.
- [x] Document production exposure requirements: auth, TLS, CORS, and rate limiting.
- [ ] Acceptance: contract tests show HTTP and core return equivalent route results.

## Milestone 4 — Evidence and automation

### PR 8 — Evaluation suite

- [x] Complete the zero-token public-repository capability comparison.
- [ ] Build a versioned, sanitized suite for coding, debugging, testing, writing, planning, review, and data analysis.
- [ ] Compare Garida routing with fixed small, standard, and strong model baselines.
- [ ] Collect success, cost/success, p50/p95 latency, token use, failure rate, route distribution, and delegation/reviewer overhead.
- [ ] Publish methodology, raw sanitized results, limitations, and confidence intervals.
- [ ] Gate: Garida matches/exceeds fixed-standard success.
- [ ] Gate: Garida is within 5 percentage points of fixed-strong success.
- [ ] Gate: Garida lowers mean cost by at least 20% versus fixed-strong.

### PR 9 — CI and release automation

- [ ] Test Node 22 and 24 on Linux, macOS, and Windows for core/MCP.
- [ ] Run frozen install, formatting/lint, typecheck, tests, build, package validation, consumer tests, MCP smoke tests, and HTTP contracts.
- [ ] Add Changesets/fixed release group and release dry-run.
- [ ] Add dependency review, CodeQL, secret scanning, and dependency updates.
- [ ] Configure npm trusted publishing/OIDC with provenance and `next` alpha publishing.
- [ ] Acceptance: fresh clone and release dry-run pass with only intended packages/files.

## Milestone 5 — Documentation and alpha launch

### PR 10 — Documentation

- [ ] Publish architecture, library quickstart, MCP quickstart, HTTP guide, custom policy/catalog guide, privacy/security model, evaluation results, and troubleshooting.
- [ ] Ensure every documented command is covered in CI or release smoke testing.
- [ ] Remove all personal paths and claims about stubs from public docs.
- [ ] Manually verify registry-installed library and MCP quickstarts.
- [ ] Acceptance: a new user routes a task with either library or MCP in under ten minutes.

## Blockers and decisions

| Item | Status | Decision / owner / evidence |
| --- | --- | --- |
| npm scope and package names | In progress | Public package metadata now uses `@garida/*`; scope ownership must be confirmed by the publishing account. See [`npm-account-setup.md`](./npm-account-setup.md). |
| `garida-mcp` executable name | Resolved | `@garida/mcp` exposes `garida-mcp`; registry uniqueness still requires publish-account confirmation. |
| License selection | Resolved | MIT selected and recorded in the repository `LICENSE`; package metadata should use SPDX identifier `MIT` before publishing. |
| Public package set | Open | First alpha: core + MCP; HTTP only if explicitly released as experimental. |
| Evaluation environment/budget | Open | Define reproducible model versions and budget before PR 8. |

## Final release sign-off

- [ ] License and public-repository essentials are complete.
- [ ] Core and MCP tarballs install and run in a blank project.
- [ ] Custom validated policies and catalogs work through core.
- [ ] Real stdio MCP smoke test passes.
- [ ] No secrets, personal paths, or unsafe public flags remain.
- [ ] Executor/plugin packages are unpublished and unsupported claims are absent.
- [ ] Node 22/24 CI and clean-clone verification pass.
- [ ] Public evaluation meets all three thresholds and includes limitations.
- [ ] Trusted publishing/provenance is configured for `next`, not `latest`.
- [ ] Registry-installed library and MCP quickstarts are manually verified.
- [x] Release notes/changelog entry are ready for `0.1.0-alpha.1`.

After each milestone, update this tracker and reconcile any scope change with the [public release plan](./public-release-plan.md).
