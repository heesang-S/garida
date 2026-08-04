import fs from "node:fs"
import path from "node:path"

const root = process.cwd()
const publicPackages = [
  "packages/shared-types",
  "packages/router-core",
  "packages/router-mcp",
  "packages/router-http",
]

const errors = []

function readPackage(relativeDir) {
  const dir = path.join(root, relativeDir)
  const packagePath = path.join(dir, "package.json")
  if (!fs.existsSync(packagePath)) {
    errors.push(`${relativeDir}: missing package.json`)
    return null
  }

  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"))
  for (const file of ["README.md", "LICENSE"]) {
    if (!fs.existsSync(path.join(dir, file))) {
      errors.push(`${relativeDir}: missing ${file}`)
    }
  }
  return pkg
}

for (const relativeDir of publicPackages) {
  const pkg = readPackage(relativeDir)
  if (!pkg) continue

  const requiredFields = [
    "name",
    "version",
    "description",
    "license",
    "exports",
    "main",
    "types",
    "files",
    "repository",
    "publishConfig",
    "engines",
  ]
  for (const field of requiredFields) {
    if (pkg[field] === undefined) errors.push(`${pkg.name}: missing ${field}`)
  }
  if (pkg.private === true) errors.push(`${pkg.name}: must be publishable (private is true)`)
  if (pkg.license !== "MIT") errors.push(`${pkg.name}: license must be MIT`)
  if (pkg.type !== "module") errors.push(`${pkg.name}: must be ESM (type=module)`)
  if (pkg.publishConfig?.access !== "public") {
    errors.push(`${pkg.name}: publishConfig.access must be public`)
  }
  if (!String(pkg.engines?.node ?? "").startsWith(">=22.13.0")) {
    errors.push(`${pkg.name}: engines.node must require >=22.13.0`)
  }
  if (!Array.isArray(pkg.files) || !pkg.files.includes("LICENSE")) {
    errors.push(`${pkg.name}: files must include LICENSE`)
  }
  if (!pkg.exports?.["."]?.import || !pkg.exports?.["."]?.types) {
    errors.push(`${pkg.name}: exports["."] must expose import and types`)
  }
  if (Object.values(pkg.dependencies ?? {}).some((value) => String(value).startsWith("workspace:"))) {
    errors.push(`${pkg.name}: dependencies must not use the workspace: protocol`)
  }
  if (!String(pkg.main ?? "").startsWith("./dist/") || !String(pkg.types ?? "").startsWith("./dist/")) {
    errors.push(`${pkg.name}: main and types must point into dist/`)
  }
}

for (const relativeDir of ["packages", "plugins"]) {
  const absoluteDir = path.join(root, relativeDir)
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const child = path.join(relativeDir, entry.name)
    if (!child.includes("executor-") && relativeDir !== "plugins") continue
    const pkgPath = path.join(root, child, "package.json")
    if (!fs.existsSync(pkgPath)) continue
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"))
    if (pkg.private !== true) errors.push(`${pkg.name}: executor/plugin packages must remain private`)
  }
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"))
  process.exit(1)
}

console.log(`Public package metadata: OK (${publicPackages.length} packages)`)
console.log("Executor and plugin packages remain private: OK")
