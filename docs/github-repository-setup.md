# GitHub repository setup

This checklist describes how to make `heesang-S/garida` public without
publishing npm packages.

## 1. Confirm the repository contents locally

Before changing visibility, run:

```sh
pnpm install --frozen-lockfile
pnpm run check:public-packages
pnpm run check:release
pnpm --filter @garida/types --filter @garida/core --filter @garida/mcp --filter @garida/http build
pnpm --filter @garida/types --filter @garida/core --filter @garida/mcp --filter @garida/http test
```

Also inspect the pending file list and confirm that no `.env` files, tokens,
private prompts, or machine-specific paths are included.

## 2. Change repository visibility

In GitHub:

1. Open `heesang-S/garida`.
2. Select **Settings** → **General**.
3. Scroll to **Danger Zone** → **Change repository visibility**.
4. Select **Make public**.
5. Review GitHub's warning about exposing commit history and confirm.

Do not enable npm publishing as part of this step. The release workflow only
runs on a version tag or manual dispatch, but leave publishing credentials
unconfigured until the npm milestone.

## 3. Set repository metadata

Open the repository main page. In the **About** box on the right, click the
gear icon (**Edit repository metadata**). GitHub places the description,
website, and topics fields there. GitHub's official topic instructions describe
this same gear-button path: <https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics>.

Recommended values:

- Description: `Deterministic, explainable model routing for TypeScript agents.`
- Topics: `ai`, `agents`, `model-routing`, `orchestration`, `typescript`, `mcp`
- Website: leave empty until a stable documentation site exists.
- Default branch: `master` (the repository's current default branch).
- Discussions: enable only if there is an owner ready to answer questions.

## 4. Protect the default branch

In **Settings** → **Branches** or **Rules**:

- Require pull requests before merging.
- Require at least one approval for non-owner changes.
- Require the CI workflow to pass.
- Require branches to be up to date before merging when practical.
- Block force pushes and branch deletion.
- Allow the repository owner to bypass rules only when recovery is necessary.

Keep the first policy lightweight enough that a solo maintainer can still make
urgent fixes.

## 5. Configure Actions safely

The repository already contains:

- `.github/workflows/ci.yml` for Node 22/24 verification.
- `.github/workflows/release.yml` for a future npm alpha release.
- `.github/dependabot.yml` for weekly dependency updates.

After making the repository public:

1. Open **Actions** and confirm CI runs on the default branch.
2. Confirm pull requests receive CI checks.
3. Confirm the release workflow is not triggered by ordinary pushes.
4. Do not add `NPM_TOKEN` until the npm release milestone.

## 6. Enable repository security features

In **Settings** → **Code security and analysis**, enable where available:

- Dependabot alerts.
- Dependabot security updates.
- Secret scanning.
- Push protection for secrets.
- Code scanning only when a maintained workflow is available.

The repository already has `SECURITY.md`; update its contact address if the
maintainer adopts a dedicated security mailbox.

## 7. Create the first public release note

Create a GitHub discussion, issue, or draft release titled:

```text
Garida public alpha — repository preview
```

State clearly:

- Garida is experimental and MIT-licensed.
- The repository is public for inspection and feedback.
- npm packages are not published yet.
- The router is deterministic and explainable, not a claim of universal cost
  or quality optimality.
- Feedback is especially useful on route quality, explainability, and API shape.

## 8. Verify the public view

Use a signed-out browser window or GitHub's public URL to confirm:

- The repository loads without authentication.
- README links work.
- The license is detected.
- Actions status is visible.
- Issue forms and contribution files are visible.
- No private branch, secret, or unpublished evaluation artifact is exposed.

After this verification, continue with
[`public-repo-milestones.md`](./public-repo-milestones.md) rather than npm
publishing immediately.
