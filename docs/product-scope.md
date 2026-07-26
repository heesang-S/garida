# Garida public alpha product scope

## Product position

Garida is a deterministic, explainable model router. It converts a structured
task assessment into a model route and portable execution plan. Its public
value is predictable, inspectable routing: it records the policy decision,
matched rules, and relevant model metadata so a host can understand and act on
the result.

Garida does not claim that a route is universally optimal. Route quality
depends on the supplied assessment, policy, model catalog, provider behavior,
and the host's execution environment.

## First-alpha package scope

The TypeScript library is the product foundation. The intended public package
set for the first alpha is:

| Surface | Planned status | Purpose |
| --- | --- | --- |
| `@garida/router-core` | Stable alpha | Validate inputs and produce deterministic routes and execution plans. |
| `@garida/shared-types` | Stable alpha if needed | Share versioned public contracts. |
| `@garida/router-mcp` | Stable alpha | Provide the primary universal MCP adapter for agent hosts and IDEs. |
| `@garida/router-http` | Experimental | Provide an optional local or embeddable HTTP adapter. |

Package names, npm scope, and the planned `garida-mcp` executable remain
subject to registry availability. The repository workspace itself remains
private.

Provider executors and host plugins are not public release packages for the
first alpha. They remain experimental internal work until their runtime
contracts, safety behavior, and support boundaries are independently ready.

## Non-goals for the first alpha

- Natural-language task classification as a supported runtime feature.
- A claim that Garida selects the best model for every task or provider.
- Production-ready remote execution or publication of provider executors.
- Public internet exposure of the HTTP adapter without authentication, TLS,
  CORS controls, and rate limiting.

## Public contract principles

- Core routing remains independent of MCP, HTTP, credentials, network calls,
  and subprocess execution.
- MCP and HTTP adapters call the same core API so equivalent inputs yield
  equivalent routing decisions.
- Structured task assessments, policies, model catalogs, routes, and execution
  plans are validated and versioned as the public contract matures.
- Outputs retain explainability and provenance rather than hiding the route
  behind a black-box recommendation.

See [compatibility](./compatibility.md) for runtime and release-environment
support, and the [public release plan](./public-release-plan.md) for the
implementation sequence.
