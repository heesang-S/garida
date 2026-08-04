# `@garida/http`

Experimental local/embeddable HTTP adapter for Garida's deterministic routing
core. It is not intended for unauthenticated public internet exposure.

```ts
import { createHttpApp } from "@garida/http"

const app = createHttpApp({ router })
```

Endpoints:

- `GET /healthz`
- `POST /v1/route`
- `POST /v1/plan`

The prototype `/route` and `/plan` paths remain available during the alpha
transition. The server binds to `127.0.0.1:8787` by default; configure
`GARIDA_HTTP_HOST` and `GARIDA_HTTP_PORT` or pass server options directly.

Requests are limited to 64 KiB and 5 seconds by default. Override these limits
only for a trusted local or embedded deployment. Production exposure requires
authentication, TLS, CORS policy, rate limiting, and an appropriate network
boundary.
