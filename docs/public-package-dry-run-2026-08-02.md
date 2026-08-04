# Public package dry run — 2026-08-02

This is a packaging-only check for the experimental public alpha. It does not
publish packages or contact a model provider.

The initial check used the legacy `@model-orchestration/*` names. The package
names below were updated to the selected `@garida/*` namespace and rechecked on
2026-08-04 after the rename.

## Packages checked

`npm pack --dry-run --json` passed for:

- `@garida/types@0.1.0-alpha.1`
- `@garida/core@0.1.0-alpha.1`
- `@garida/mcp@0.1.0-alpha.1`
- `@garida/http@0.1.0-alpha.1`

The tarball listings include the MIT license, README files where configured,
compiled JavaScript and declarations, and the router policy/catalog/schema JSON
assets.

The repository-local metadata checker is available as:

```sh
pnpm run check:public-packages
```

The checker confirms that the four release candidates are public ESM packages
with Node 22.13+ requirements, exports, declarations, repository metadata, and
public publish configuration. Executor and host-plugin packages must remain
private.

Public package dependencies now use ordinary `^0.1.0` ranges instead of the
pnpm-only `workspace:` protocol. A fresh package tarball therefore contains
registry-resolvable dependency ranges.

## Clean consumer smoke check

With registry access enabled, a temporary project installed all four local
tarballs and their external dependencies. JavaScript imports and routing passed,
and a TypeScript consumer compilation passed for the router-core, router-http,
and router-mcp public APIs.

`publint` is still not configured; add it before the first registry publish.
