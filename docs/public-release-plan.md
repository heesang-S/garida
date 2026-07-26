# Garida public `0.1.0-alpha` release plan

## Product position

Garida is a deterministic, explainable model router. It turns a structured task assessment into a model route and a portable execution plan. Its initial public value is predictable, inspectable routing rather than a claim of universally optimal model selection.

The core TypeScript library is the product foundation. MCP is the primary universal integration adapter for agent hosts and IDEs. The HTTP adapter is experimental. Provider executors and host plugins are not public release packages in the first alpha.

## Scope and non-goals

The alpha publishes the core library and MCP package, with package names subject to registry availability. The root workspace remains private. The initial supported environment is ESM on Node `>=22.13`.

In scope:

- Validated task assessments, policies, model catalogs, routes, and execution plans.
- Deterministic decisions with reasons, matched rules, fallbacks, and pricing/model metadata.
- A portable library API and stdio MCP server.
- Versioned schemas, clean-install examples, CI, release automation, and transparent evaluations.

Out of scope:

- Natural-language task classification as a supported runtime feature.
- Claims that Garida is universally optimal or autonomous remote execution is production-ready.
- Publishing Devin, Claude Code, Codex, or other executor/plugin packages.
- Public internet hosting of the HTTP adapter without production authentication, TLS, CORS, and rate limiting.

## Target package architecture

| Package | Alpha status | Responsibility |
| --- | --- | --- |
| `@garida/router-core` | Stable alpha | Validated assessment, policy evaluation, model route, and execution-plan generation. |
| `@garida/shared-types` | Stable alpha if needed | Versioned public schemas and shared contracts. |
| `@garida/router-mcp` | Stable alpha | Thin MCP adapter and `garida-mcp` executable. |
| `@garida/router-http` | Experimental | Thin local/embeddable HTTP adapter. |
| Executor packages | Unpublished | Provider/subprocess execution; retain as experimental internal work. |
| Host plugins | Unpublished | Host-specific integrations; retain as experimental internal work. |

`router-core` must not depend on MCP, HTTP, credentials, network calls, or subprocess execution. MCP and HTTP must call the same core API so equivalent inputs yield equivalent decisions.

## Public API direction

```ts
const router = createRouter({ policy, catalog })
const plan = await router.prepareExecution(assessment)
```

Convenience functions may use immutable bundled defaults. Public callers must also be able to supply validated custom policies and catalogs. Outputs should preserve explainability and provenance, including whether catalog values are measured or estimated.

## PR sequence

### 1. Define the public product contract

Objective: make the alpha promise, compatibility boundaries, and naming explicit.

- Confirm npm scope and `garida-mcp` executable availability.
- Set Node `>=22.13`, test Node 22 and 24, pin pnpm, and declare ESM-only alpha support.
- Update public README with positioning, supported integrations, limitations, and non-goals.

Acceptance criteria: package and executable names are confirmed; public documentation makes no unsupported claim; root workspace remains private.

### 2. Add public-repository essentials

Objective: make the repository safe and understandable for outside contributors.

- Add the MIT `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SUPPORT.md`, and `CHANGELOG.md`.
- Add issue/PR templates, `CODEOWNERS`, formatting/lint guidance, and repository metadata.
- Remove credentials, personal paths, and machine-specific setup from public material.

Acceptance criteria: GitHub recognizes the selected license; a clean-clone contributor path works; no public configuration requires the author's filesystem.

### 3. Stabilize the core library

Objective: establish a portable, deterministic, documented routing contract.

- Export `createRouter`, types, validators, and stable typed errors.
- Version assessment, route, execution-plan, policy, and catalog schemas.
- Support validated custom policies/catalogs alongside immutable defaults.
- Record reasons, matched rules, fallback behavior, model/pricing snapshots, and provenance.

Acceptance criteria: a separate fixture project uses only the core package; invalid inputs return documented errors; identical inputs produce identical results.

### 4. Make packages portable and publishable

Objective: make release artifacts installable outside this monorepo.

- Mark only release packages `private: false`; add `exports`, `types`, `files`, `engines`, license/repository metadata, and publish configuration.
- Ensure policy/catalog/schema assets ship in tarballs and workspace dependencies use publish-safe ranges.
- Add `publint`, `npm pack --dry-run`, and blank-project install/typecheck checks.
- Replace hard-coded Codex paths with PATH discovery or an explicit `GARIDA_CODEX_COMMAND`; remove unsafe bypass flags from examples.

Acceptance criteria: packed artifacts install, import, typecheck, and contain needed runtime assets in a clean project.

### 5. Ship MCP as the primary integration

Objective: provide the simplest broadly compatible integration path.

- Publish a stdio `garida-mcp` executable, installable via `npx` at a pinned alpha version.
- Expose `route_task` and `prepare_execution` with precise schemas and structured validation errors.
- Keep protocol output on stdout and diagnostics on stderr.
- Support bundled defaults and optional explicit policy/catalog paths.

Acceptance criteria: a real MCP client launches the packed binary, discovers/calls both tools, and receives structured errors for invalid input.

### 6. Harden execution while retaining it as experimental

Objective: ensure internal execution work is safe and accurately represented.

- Respect subtask independence, bounded concurrency, output limits, cancellation, and timeout cleanup.
- Use retry classification with exponential backoff and jitter.
- Redact sensitive logging and make prompt/output logs opt-in.
- Return typed unsupported-executor errors and remove unsupported executors from public claims.

Acceptance criteria: timeout terminates subprocesses/requests; fatal failures do not retry; concurrency and redaction are tested; executor/plugin packages remain unpublished.

### 7. Decouple and label the HTTP adapter experimental

Objective: offer a local integration option without coupling it to MCP.

- Depend directly on core and export `createHttpApp({ router })`.
- Provide `/v1/route`, `/v1/plan`, and `/healthz`.
- Bind to `127.0.0.1` by default and add request limits, timeouts, and redacted errors.
- Document production exposure requirements.

Acceptance criteria: HTTP contract tests pass using the same core route output; documentation labels the package experimental.

### 8. Build competitive evaluations

Objective: substantiate routing value with reproducible evidence.

- Create a versioned, sanitized task suite for coding, debugging, testing, writing, planning, review, and data analysis.
- Compare Garida routing with fixed small, standard, and strong models.
- Measure success, cost per successful task, p50/p95 latency, token use, failure rate, route distribution, and delegation/reviewer overhead.
- Publish methodology, raw sanitized results, limitations, and confidence intervals.

Acceptance criteria: Garida matches/exceeds fixed-standard success, stays within five percentage points of fixed-strong success, and reduces mean cost by at least 20% versus fixed-strong.

### 9. Add CI and release automation

Objective: prevent regressions and make alpha publishing repeatable.

- Run frozen installs, format/lint, typecheck, tests, build, package validation, consumer smoke tests, MCP subprocess tests, and HTTP contract tests.
- Cover Node 22/24 and Linux/macOS/Windows for core/MCP.
- Add Changesets/fixed release groups, dependency review, CodeQL, secret scanning, dependency updates, and npm trusted publishing with provenance.
- Publish alpha releases under `next`, never `latest`.

Acceptance criteria: a fresh clone passes all checks; release dry-run contains only intended files/packages; packed consumer checks pass.

### 10. Complete documentation and launch

Objective: make first-use successful without repository familiarity.

- Publish architecture, library quickstart, MCP quickstart, HTTP guide, custom policy/catalog guide, privacy/security model, evaluation results, and troubleshooting.
- Keep every public command CI-tested or release-smoke-tested.
- Manually validate registry-installed library and MCP quickstarts once before release.

Acceptance criteria: new users can route a task through library and MCP in under ten minutes; documentation contains no personal paths or advertised stubs.

## Dependencies and parallel work

```text
Product contract
├── OSS essentials
├── Core API → Packaging → MCP
│                        ├── HTTP
│                        └── Evaluations
├── Executor hardening
└── CI foundations

MCP + HTTP + evaluations + CI → Documentation → alpha release
```

OSS essentials, CI foundations, and executor hardening can proceed alongside core stabilization. Packaging depends on the stable core contract. MCP, HTTP, evaluations, and public examples depend on package portability. Documentation and release follow completed integration and evidence gates.

## Final launch gate

Release `0.1.0-alpha.1` only when all are true:

- License decision and public-repository essentials are complete.
- Core and MCP tarballs install and work in a blank project.
- Core supports validated custom policies and catalogs.
- A real stdio MCP client passes smoke tests.
- No personal paths, secrets, or unsafe public flags remain.
- Executor/plugin packages are unpublished and unsupported capability claims are absent.
- Node 22/24 CI and clean-clone checks pass.
- Evaluation data, thresholds, methodology, and limitations are public.
- npm trusted publishing/provenance uses the `next` dist-tag.
- Registry-installed quickstarts have been manually verified once.

## Post-alpha backlog

- Evaluated natural-language assessment/classification.
- Versioned remotely refreshable model catalogs.
- User-defined provider plugins and stable executor packages.
- Production HTTP authentication, TLS, CORS, and rate limiting.
- Python bindings after schemas stabilize.
- Policy simulation/route visualization and opt-in privacy-preserving telemetry.
- Stable `0.1.0` after at least two alpha cycles and external-user feedback.

Use the companion [public release tracker](./public-release-tracker.md) to execute and maintain this plan.
