# npm publishing notes

Garida is not published yet. The selected public package names are:

- `@garida/types`
- `@garida/core`
- `@garida/mcp`
- `@garida/http` (experimental)

`model-orchestration` comes from the repository's original working title,
“Model-Orchestrating Agent.” It is descriptive but does not match the Garida
brand. It has now been replaced in the public package metadata and imports by
the Garida namespace.

Unauthenticated npm registry queries on 2026-08-02 returned no public versions
for the selected names. That confirms they are not currently discoverable, but
it does not prove that the `@garida` scope is writable by this account. Confirm
scope ownership with the npm account that will publish before creating a release
tag.

The MCP package already exposes the executable name `garida-mcp`.

## Release workflow

[`release.yml`](../.github/workflows/release.yml) is currently manual-dispatch
only while npm publication is deferred. When the npm milestone is approved, it
can be enabled for version tags. It installs the frozen workspace, verifies the
four public packages, builds them, and publishes in dependency order. Configure
the GitHub `npm-release` environment with an `NPM_TOKEN` secret and npm
provenance/trusted-publishing settings before enabling publication.

The workflow skips a package version that already exists, but a release should
still use a new version and a reviewed changelog entry. No release workflow is
run by local checks.

Run the local metadata preflight before requesting a release:

```sh
pnpm run check:release
```

The GitHub workflow runs the stricter `--require-token` mode and verifies npm
authentication with `npm whoami` before publishing. The current local
environment is not npm-authenticated, so publishing cannot be performed from
this session.

For complete account, scope, provenance, and GitHub environment instructions,
see [`npm-account-setup.md`](./npm-account-setup.md).
