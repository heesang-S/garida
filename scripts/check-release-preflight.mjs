import fs from "node:fs"
import path from "node:path"

const expectedVersion = "0.1.0-alpha.1"
const packageNames = new Map([
  ["packages/shared-types", "@garida/types"],
  ["packages/router-core", "@garida/core"],
  ["packages/router-mcp", "@garida/mcp"],
  ["packages/router-http", "@garida/http"],
])
const packageDirs = [...packageNames.keys()]
const errors = []

for (const relativeDir of packageDirs) {
  const packagePath = path.join(process.cwd(), relativeDir, "package.json")
  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"))
  if (pkg.name !== packageNames.get(relativeDir)) {
    errors.push(`${relativeDir}: expected package name ${packageNames.get(relativeDir)}, found ${pkg.name}`)
  }
  if (pkg.version !== expectedVersion) {
    errors.push(`${pkg.name}: expected version ${expectedVersion}, found ${pkg.version}`)
  }
  if (pkg.private === true) errors.push(`${pkg.name}: release package must not be private`)
  if (pkg.publishConfig?.access !== "public") {
    errors.push(`${pkg.name}: publishConfig.access must be public`)
  }
}

const workflow = fs.readFileSync(path.join(process.cwd(), ".github/workflows/release.yml"), "utf8")
for (const requiredText of ["--provenance", "--access public", "NPM_TOKEN", "packages/shared-types packages/router-core packages/router-mcp packages/router-http"]) {
  if (!workflow.includes(requiredText)) errors.push(`release workflow: missing ${requiredText}`)
}

if (process.argv.includes("--require-token") && !process.env.NPM_TOKEN) {
  errors.push("NPM_TOKEN is required for this preflight mode")
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"))
  process.exit(1)
}

console.log(`Release preflight: OK (${packageDirs.length} packages at ${expectedVersion})`)
if (!process.env.NPM_TOKEN) {
  console.log("npm authentication: not configured locally; configure the GitHub npm-release environment before publishing")
}
