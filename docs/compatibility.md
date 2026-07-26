# Garida public alpha compatibility

## Supported runtime

The first public alpha supports ESM on Node.js `>=22.13`. CommonJS support is
out of scope for this release line.

Garida will verify its public core and MCP packages on Node 22 and Node 24
before each alpha release. Verification means those supported major versions
pass the release CI checks; it is not a promise that every Node version outside
that range is supported.

## Package manager

The repository uses the pinned package-manager version declared by its root
`packageManager` field: `pnpm@11.5.1`. Contributors and release automation
should use that version to ensure reproducible workspace installs.

Published consumers may use a compatible package manager, provided it installs
the published package and its declared dependencies correctly. Garida's public
packages will document their own runtime and module requirements in their
package metadata before publication.

## Integration compatibility

| Integration | First-alpha status | Notes |
| --- | --- | --- |
| TypeScript/JavaScript library | Supported | ESM consumers use the core routing library directly. |
| MCP over stdio | Supported | Primary universal adapter for compatible agent hosts and IDEs. |
| HTTP | Experimental | Intended for local or embeddable use; not ready for unauthenticated public hosting. |
| Provider executors and host plugins | Not published | Experimental work that is excluded from the first alpha promise. |

MCP host model-switching capabilities vary. Garida can return the intended
route and execution plan even when a specific host cannot switch to the chosen
model automatically.

## Naming and licensing

Planned package names (`@garida/router-core`, `@garida/router-mcp`, and related
packages) and the `garida-mcp` executable must be confirmed as available in the
target registry before publication. They are planning names, not a published
availability guarantee.

Garida is licensed under the [MIT License](../LICENSE).

For product boundaries and non-goals, see the [public alpha product scope](./product-scope.md).
