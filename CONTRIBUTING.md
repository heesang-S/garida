# Contributing to Garida

Thanks for considering a contribution. Garida is an early alpha, so a brief
discussion before substantial work helps keep the public API deliberate.

## Before you start

- Search existing [issues](https://github.com/heesang-S/garida/issues) and
  [discussions](https://github.com/heesang-S/garida/discussions).
- Open an issue or discussion for a new feature, public API change, or large
  refactor before implementing it.
- Report security issues privately under the [security policy](./SECURITY.md),
  not in a public issue.

## Local development

Use Node.js 22.13 or newer and the pnpm version declared in `package.json`.

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
```

Keep changes focused. Add or update tests for behavior changes, preserve
deterministic router behavior, and update public documentation when a public
contract changes. Do not commit credentials, local paths, generated build
output, or unrelated formatting changes.

## Pull requests

Use the pull-request template and explain the problem, approach, tests, and
any compatibility impact. By submitting a contribution, you agree that it may
be distributed under the repository's [MIT License](./LICENSE).

Maintainers may request changes, split work into follow-up issues, or defer
features that do not fit the current alpha scope.
