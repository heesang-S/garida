# npm and GitHub release setup

This guide covers the account configuration required before publishing
Garida `0.1.0-alpha.1`. It does not publish anything by itself.

## 1. Confirm the package namespace

The old `@model-orchestration/*` names were inherited from the original project
working title. The selected public namespace is now `@garida/*`.

The current candidate names are:

- `@garida/types`
- `@garida/core`
- `@garida/mcp`
- `@garida/http`

Log in to the npm account that will own the release and confirm the scope:

```sh
npm login
npm whoami
npm access ls-packages
```

The account must own the `@garida` scope or belong to an npm organization with
publish permission for it. Do not publish the legacy names.

## 2. Enable provenance/trusted publishing

Preferred setup:

1. Open the npm package/organization publishing settings.
2. Add the GitHub repository `heesang-S/garida` as a trusted publisher.
3. Set the workflow file to `.github/workflows/release.yml`.
4. Use the `main` branch and the `npm-release` GitHub environment.
5. Keep provenance enabled for the release workflow.

The repository workflow requests GitHub's `id-token: write` permission and
publishes with `npm publish --provenance`.

## 3. Configure the GitHub environment

In GitHub repository settings, create an environment named `npm-release`.

Recommended protections:

- Require one maintainer approval before deployment.
- Restrict deployments to the release workflow.
- Add an environment secret named `NPM_TOKEN` if trusted publishing is not yet
  available for the npm account.

If using a token, create a narrowly scoped npm automation token that can publish
packages in the selected scope. Do not commit the token or place it in `.env`
files. The workflow consumes it only as `${{ secrets.NPM_TOKEN }}`.

## 4. Run the local checks

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm run check:release
pnpm run check:public-packages
```

The stricter workflow check requires credentials and should pass only in the
configured GitHub environment:

```sh
pnpm run check:release -- --require-token
npm whoami --registry=https://registry.npmjs.org
```

## 5. Publish only after review

The workflow is triggered by a `v*` tag or manual dispatch. Before triggering:

- Confirm the package names and scope.
- Confirm the changelog entry for `0.1.0-alpha.1`.
- Confirm the public-package and consumer smoke checks pass.
- Confirm the release environment approval is available.

The workflow publishes shared-types first, then router-core, router-mcp, and
router-http. It skips a version that already exists, but a new release should
still use a reviewed version and changelog entry.
