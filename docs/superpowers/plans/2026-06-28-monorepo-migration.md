# Monorepo Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Convert the current single-package router project into a monorepo with clean package boundaries for router, MCP, HTTP, executor contracts, and future plugins.

**Architecture:** Move existing pure routing logic into `packages/router-core`, transport wrappers into `packages/router-mcp` and `packages/router-http`, and shared contracts into `packages/shared-types`. Keep dependency direction one-way: shared types -> router packages; plugins and executors may consume router packages, but router packages must not import plugins or executors.

**Tech Stack:** TypeScript, pnpm workspaces, Node ESM, Vitest, existing AJV/Zod/Hono/MCP SDK dependencies.

---

## Target Structure

```text
.
├── packages/
│   ├── shared-types/
│   ├── router-core/
│   ├── router-mcp/
│   └── router-http/
├── plugins/
├── apps/
├── examples/
├── knowledge/
├── routing/
├── docs/
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Boundary Rules

- `packages/shared-types` exports types only.
- `packages/router-core` owns validation, policy evaluation, model resolution, and execution-plan generation.
- `packages/router-mcp` owns MCP transport and MCP tool handlers.
- `packages/router-http` owns HTTP transport.
- Root package owns workspace scripts only.
- Current behavior must remain available through equivalent commands.

## Task 1: Create Workspace Package Skeleton

**Files:**
- Create: `tsconfig.base.json`
- Modify: `package.json`
- Modify: `pnpm-workspace.yaml`
- Create: `packages/shared-types/package.json`
- Create: `packages/router-core/package.json`
- Create: `packages/router-mcp/package.json`
- Create: `packages/router-http/package.json`

- [x] **Step 1: Add root TypeScript base config**

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "forceConsistentCasingInFileNames": true,
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "target": "ES2022",
    "lib": ["ES2022"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "types": ["node", "vitest/globals"]
  }
}
```

- [x] **Step 2: Update workspace file**

Modify `pnpm-workspace.yaml`:

```yaml
packages:
  - "packages/*"
  - "plugins/*"
  - "apps/*"

allowBuilds:
  esbuild: true
```

- [x] **Step 3: Convert root package into workspace controller**

Modify root `package.json` scripts:

```json
{
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "route": "pnpm --filter @model-orchestration/router-core route",
    "mcp": "pnpm --filter @model-orchestration/router-mcp mcp",
    "api": "pnpm --filter @model-orchestration/router-http api"
  }
}
```

- [x] **Step 4: Create package manifests**

Create `packages/shared-types/package.json`:

```json
{
  "name": "@model-orchestration/shared-types",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

Create `packages/router-core/package.json`:

```json
{
  "name": "@model-orchestration/router-core",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "bin": {
    "model-router": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "route": "pnpm build && node dist/cli.js",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@model-orchestration/shared-types": "workspace:*",
    "ajv": "^8.17.1"
  }
}
```

Create `packages/router-mcp/package.json`:

```json
{
  "name": "@model-orchestration/router-mcp",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "mcp": "pnpm build && node dist/src/mcp-server.js",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@model-orchestration/router-core": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.29.0",
    "zod": "^4.4.3"
  }
}
```

Create `packages/router-http/package.json`:

```json
{
  "name": "@model-orchestration/router-http",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "api": "pnpm build && node dist/http-server.js",
    "build": "tsc",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@hono/node-server": "^2.0.6",
    "@model-orchestration/router-core": "workspace:*",
    "hono": "^4.12.27",
    "zod": "^4.4.3"
  }
}
```

- [x] **Step 5: Verify workspace discovery**

Run:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm -r --depth -1 list
```

Expected: package list includes `shared-types`, `router-core`, `router-mcp`, and `router-http`.

## Task 2: Move Shared Types

**Files:**
- Move: `src/types.ts` -> `packages/shared-types/src/index.ts`
- Create: `packages/shared-types/tsconfig.json`
- Update imports in router files later.

- [x] **Step 1: Create shared-types tsconfig**

Create `packages/shared-types/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "tsBuildInfoFile": "dist/tsconfig.tsbuildinfo"
  },
  "include": ["src/**/*.ts"]
}
```

- [x] **Step 2: Move type definitions**

Move the contents of current `src/types.ts` into `packages/shared-types/src/index.ts`.

- [x] **Step 3: Build shared-types**

Run:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm --filter @model-orchestration/shared-types build
```

Expected: PASS and `packages/shared-types/dist/index.d.ts` exists.

## Task 3: Move Router Core

**Files:**
- Move core files from `src/` into `packages/router-core/src/`:
  - `agent-runtime.ts`
  - `cli.ts`
  - `execution-plan.ts`
  - `load-json.ts`
  - `router.ts`
  - `rule-evaluator.ts`
  - `validate-assessment.ts`
  - `index.ts`
- Move relevant tests into `packages/router-core/tests/`.
- Copy or reference `routing/` JSON files.

- [x] **Step 1: Create router-core tsconfig**

Create `packages/router-core/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": ".",
    "tsBuildInfoFile": "dist/tsconfig.tsbuildinfo"
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "../../routing/**/*.json"],
  "references": [{ "path": "../shared-types" }]
}
```

- [x] **Step 2: Move core code and tests**

Move:

```text
src/agent-runtime.ts -> packages/router-core/src/agent-runtime.ts
src/cli.ts -> packages/router-core/src/cli.ts
src/execution-plan.ts -> packages/router-core/src/execution-plan.ts
src/load-json.ts -> packages/router-core/src/load-json.ts
src/router.ts -> packages/router-core/src/router.ts
src/rule-evaluator.ts -> packages/router-core/src/rule-evaluator.ts
src/validate-assessment.ts -> packages/router-core/src/validate-assessment.ts
src/index.ts -> packages/router-core/src/index.ts
```

Move core tests:

```text
tests/agent-runtime.test.ts
tests/examples.test.ts
tests/execution-plan.test.ts
tests/load-json.test.ts
tests/public-api.test.ts
tests/router.test.ts
tests/rule-evaluator.test.ts
tests/validate-assessment.test.ts
```

into `packages/router-core/tests/`.

- [x] **Step 3: Update imports**

In router-core source and tests:

```ts
import type { TaskAssessment } from "@model-orchestration/shared-types"
```

Replace local `./types.js` imports with package imports.

- [x] **Step 4: Run router-core tests**

Run:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm --filter @model-orchestration/router-core test
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm --filter @model-orchestration/router-core typecheck
```

Expected: PASS.

## Task 4: Move MCP And HTTP Adapters

**Files:**
- Move: `src/mcp-tools.ts`, `src/mcp-server.ts`, `tests/mcp-tools.test.ts`, `tests/mcp-server.test.ts`
- Move: `src/http-server.ts`, `tests/http-server.test.ts`

- [x] **Step 1: Create adapter tsconfigs**

Create `packages/router-mcp/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": ".",
    "tsBuildInfoFile": "dist/tsconfig.tsbuildinfo"
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"],
  "references": [{ "path": "../router-core" }]
}
```

Create `packages/router-http/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": ".",
    "tsBuildInfoFile": "dist/tsconfig.tsbuildinfo"
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"],
  "references": [{ "path": "../router-core" }]
}
```

- [x] **Step 2: Move MCP files**

Move:

```text
src/mcp-tools.ts -> packages/router-mcp/src/mcp-tools.ts
src/mcp-server.ts -> packages/router-mcp/src/mcp-server.ts
tests/mcp-tools.test.ts -> packages/router-mcp/tests/mcp-tools.test.ts
tests/mcp-server.test.ts -> packages/router-mcp/tests/mcp-server.test.ts
```

Update imports from router core:

```ts
import { prepareAgentExecution, routeTask } from "@model-orchestration/router-core"
```

- [x] **Step 3: Move HTTP files**

Move:

```text
src/http-server.ts -> packages/router-http/src/http-server.ts
tests/http-server.test.ts -> packages/router-http/tests/http-server.test.ts
```

Update imports:

```ts
import { prepareExecutionTool, routeTaskTool } from "@model-orchestration/router-mcp"
```

If this creates a dependency from HTTP to MCP that feels wrong, split shared tool-boundary handlers into `router-core` instead before wiring HTTP. Prefer no duplicated validation logic.

- [x] **Step 4: Build adapter packages**

Run:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm --filter @model-orchestration/router-mcp test
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm --filter @model-orchestration/router-http test
```

Expected: PASS.

## Task 5: Preserve Examples And Commands

**Files:**
- Modify: `examples/agent-library-usage.ts`
- Modify: `README.md`
- Modify: root `package.json`

- [x] **Step 1: Update example import**

Modify `examples/agent-library-usage.ts`:

```ts
import { prepareAgentExecution } from "@model-orchestration/router-core"
```

- [x] **Step 2: Ensure root commands still work**

Run:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm run route -- --provider anthropic_claude examples/tasks/complex-planning-delegated.json
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm run mcp
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm run api
```

Expected:

- `route` prints a route decision.
- `mcp` starts and waits for an MCP client.
- `api` starts HTTP server on port `8787`.

Stop long-running `mcp` and `api` after confirming startup.

- [x] **Step 3: Update README structure section**

Add a section:

```md
## Monorepo Packages

- `packages/shared-types`: shared contracts.
- `packages/router-core`: deterministic routing and execution plan creation.
- `packages/router-mcp`: MCP tools and stdio server.
- `packages/router-http`: HTTP API.
```

## Task 6: Final Verification

**Files:**
- No new files.

- [x] **Step 1: Run full workspace verification**

Run:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm install
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm run typecheck
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm test
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH CI=true pnpm build
```

Expected: all pass.

- [x] **Step 2: Run MCP smoke test**

Use the existing MCP client smoke pattern:

```bash
PATH=/Users/HeeSang/.nvm/versions/node/v24.16.0/bin:$PATH node --input-type=module - <<'NODE'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const client = new Client({ name: 'router-smoke-test', version: '0.1.0' })
const transport = new StdioClientTransport({
  command: '/Users/HeeSang/.nvm/versions/node/v24.16.0/bin/node',
  args: ['packages/router-mcp/dist/src/mcp-server.js'],
  cwd: process.cwd(),
  stderr: 'pipe'
})

await client.connect(transport)
const tools = await client.listTools()
console.log(tools.tools.map((tool) => tool.name).join(', '))
await client.close()
NODE
```

Expected: `route_task, prepare_execution`.

## Self-Review

Spec coverage:

- Router stays in this monorepo as packages.
- Executor packages were not implemented in this migration plan; this plan only reserved their package slots.
- Plugin packages were not implemented in this migration plan; that was handled by the separate Codex plugin plan.
- Current follow-up status: executor packages and the Codex router plugin have since been added by later work.

Placeholder scan:

- No placeholder steps remain.
- Long-running server checks explicitly say to stop after startup.

Type consistency:

- Shared types are centralized in `@model-orchestration/shared-types`.
- Router adapters consume `@model-orchestration/router-core`.
