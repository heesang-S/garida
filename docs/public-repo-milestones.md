# Public repository milestones

This roadmap starts from the current state: Garida is an MIT-licensed public
alpha candidate, but npm publishing is intentionally deferred. The first goal
is a healthy public GitHub repository that people can inspect, clone, build, and
evaluate.

## Milestone 1 — Make the GitHub repository public

Objective: publish the source repository and documentation without publishing
packages.

- Set `heesang-S/garida` visibility to public.
- Confirm the MIT license, README, security policy, contributing guide, code of
  conduct, support policy, and changelog are visible.
- Confirm no credentials, personal filesystem paths, generated artifacts, or
  private evaluation prompts are tracked.
- Confirm the default branch (`master`) and repository description identify Garida as an
  experimental deterministic routing library.
- Confirm GitHub Actions CI runs on the default branch and pull requests.

Acceptance: a new visitor can understand the scope, clone the repository, run
the documented checks, and see the project limitations without npm access.

Setup instructions: [`github-repository-setup.md`](./github-repository-setup.md).

## Milestone 2 — Public collaboration hygiene

Objective: make outside contribution safe and predictable.

- Protect the default branch and require CI before merging.
- Require pull requests for changes to the default branch.
- Enable dependency update pull requests through Dependabot.
- Enable secret scanning and push protection where available.
- Review issue forms, pull-request template, `CODEOWNERS`, and support channels.
- Add a first public issue describing the alpha scope and feedback requested.

Acceptance: an outside contributor can open an issue or pull request and the
repository provides a clear path for review.

## Milestone 3 — Public alpha evidence

Objective: let users evaluate the actual value proposition.

- Publish the deterministic route-only evaluation and its limitations.
- Keep the live Codex sample labeled as directional, not a universal benchmark.
- Add a small reproducible fixture showing route output and execution-plan
  output without provider credentials.
- Record feedback on routing accuracy, explainability, latency, and integration
  ergonomics.

Acceptance: users can reproduce a no-credential routing example and understand
what Garida does and does not claim.

## Milestone 4 — Decide the npm release

Objective: publish only after the public repository and namespace are stable.

- Confirm ownership of the `@garida` npm scope.
- Confirm the final package names: `@garida/types`, `@garida/core`,
  `@garida/mcp`, and experimental `@garida/http`.
- Configure npm provenance/trusted publishing or a narrowly scoped token.
- Run the `0.1.0-alpha.1` release preflight and clean consumer install again.
- Publish the packages from a reviewed tag only after the repository has public
  history and a changelog entry.

Acceptance: packages are installable from npm and their repository links,
provenance, versions, and documentation are correct.

## Milestone 5 — Post-alpha iteration

Objective: improve the product based on public evidence.

- Compare routing decisions against real user tasks.
- Measure whether routing preserves task success while reducing cost or latency.
- Stabilize the core API before expanding executor integrations.
- Decide whether MCP, HTTP, and executor packages should remain separate or be
  consolidated.

Npm publication is optional until this milestone's evidence and namespace
decisions are satisfactory.
