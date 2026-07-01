import { pathToFileURL } from "node:url"

import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { z } from "zod"

import { prepareExecutionTool, routeTaskTool } from "@model-orchestration/router-mcp"

const HttpToolInputSchema = z
  .object({
    assessment: z.unknown(),
    preferred_provider: z.enum(["openai_codex", "anthropic_claude"]).optional()
  })
  .strict()

export function createHttpApp(): Hono {
  const app = new Hono()

  app.post("/route", async (context) => {
    const body = HttpToolInputSchema.parse(await context.req.json())
    return context.json(await routeTaskTool(body))
  })

  app.post("/plan", async (context) => {
    const body = HttpToolInputSchema.parse(await context.req.json())
    return context.json(await prepareExecutionTool(body))
  })

  return app
}

export function runHttpServer(): void {
  const app = createHttpApp()

  serve({
    fetch: app.fetch,
    port: 8787
  })
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runHttpServer()
}
