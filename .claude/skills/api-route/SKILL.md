---
name: api-route
description: Create or change a Next.js App Router API route handler (src/app/api/**/route.ts) — the withAuth / withValidation / withSpaceGuard / pipe pattern, Zod input, Prisma access. Use before writing or editing any route.ts.
---

# Build an API route

Mirror an existing route nearby before writing a new one.

API endpoints are **App Router route handlers** (`src/app/api/**/route.ts`) composed from
higher-order wrappers in [src/lib/api-handlers.ts](../../../src/lib/api-handlers.ts). There are **no
decorators**. Building blocks:

- `withAuth({ mode, roles? })` — auth gate. `mode`: `"user"` (default), `"any"`, `"api"`,
  `"public_api"`, `"vercel_cron"`, `"gumroad"`. Injects `user` into the handler's `locals`.
- `withValidation(zodSchema, "body" | "query")` — validates input, injects parsed `body`.
- `withSpaceGuard({ permission, idFrom })` (`@/lib/space-guard`) — checks the caller's
  role in the project, hub or event the request names, injects `access`.
- `pipe(...wrappers)(handler)` — compose right-to-left.
- `json(data, init?)` and `apiError.{unauthorized,forbidden,badRequest,notFound,internal}`
  for responses.

Handler signature: `(req: NextRequest, ctx: RouteContext, locals) => Response`.
Note `ctx.params` is a **Promise** (Next 16) — `const { id } = await ctx.params`.

Example (validated, authed GET):

```ts
import { z } from "zod";
import { apiError, json, withAuth, withValidation } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const QuerySchema = z.object({ query: z.string() });

export const GET = withAuth({ mode: "user" })(
  withValidation(QuerySchema, "query")(async (_req, _ctx, { user, body }) => {
    if (!user) return apiError.unauthorized();
    const { query } = body;
    const rows = await prisma.speciality.findMany({ where: { name: { contains: query } } });
    return json(rows);
  }),
);
```

Prefer `pipe(...)` when composing 3+ wrappers. A trivial public read can be a plain
`export async function GET()` returning `json(...)` (see
[src/app/api/vacancies/route.ts](../../../src/app/api/vacancies/route.ts)).

## Rules that get broken anyway

- No decorators and no `src/pages/api`. `next-api-decorators` and `class-validator` are
  removed — never bring them back.
- Every body and query goes through a Zod schema in `withValidation`; raw input is never
  trusted.
- Database only through `import { prisma } from "@/services/prisma"`; Prisma types and
  enums from the package root, `@gdhub-io/gdhub-prisma`. When a field is in doubt, read
  `node_modules/@gdhub-io/gdhub-prisma/prisma/schema.prisma`.
- A route that reads one user's rows scopes its `where` to that user — and a test covers it.
- Env through `env()` from `@/helpers/env`.

## Done

`bun run lint` and `bun run type-check` pass; non-trivial logic has a test under `tests/`.
