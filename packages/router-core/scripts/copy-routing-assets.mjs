import { cp, mkdir, readdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const packageDirectory = dirname(dirname(fileURLToPath(import.meta.url)))
const sourceDirectory = join(packageDirectory, "routing")
const destinationDirectory = join(packageDirectory, "dist", "routing")

await mkdir(destinationDirectory, { recursive: true })

for (const entry of await readdir(sourceDirectory, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith(".json")) {
    await cp(join(sourceDirectory, entry.name), join(destinationDirectory, entry.name))
  }
}
