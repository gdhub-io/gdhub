# CLAUDE.md

Guidance for AI agents (Claude Code, Cursor) working in this repository.

## Project

GDHub — a platform for indie game developers (projects, teams, vacancies, courses,
events, devlogs, equity, paid job listings). Single Next.js app.

## Communication & language

- **Reply to the user in chat in Russian.**
- **All code, comments, identifiers and git commit messages: English only.**
- Keep commit messages short and in Conventional Commits style (`feat(scope): ...`,
  `fix(scope): ...`, `chore(scope): ...`).

## Tech stack

- **Framework:** Next.js 16 (App Router, Turbopack), React 19, TypeScript (strict).
- **UI:** Ant Design v6 (`antd`). Icons: `@react-icons/all-files` (subpath imports only,
  e.g. `@react-icons/all-files/fa/FaUser`) and `@tabler/icons-react`. Styling: SCSS modules.
- **Data fetching (client):** TanStack Query (`@tanstack/react-query`) + `axios`.
- **State:** Jotai and Zustand (atoms/stores live next to their feature).
- **Validation:** Zod. (`class-validator` / `next-api-decorators` are **removed** — do not use.)
- **Database:** Prisma via the external package `@gdhub-io/gdhub-prisma`. The schema is
  **not** in this repo — it lives at
  `node_modules/@gdhub-io/gdhub-prisma/prisma/schema.prisma`. Access the client via
  `import { prisma } from "@/services/prisma"`. Prisma types come from
  `@gdhub-io/gdhub-prisma/dist/client`.
- **Auth:** NextAuth v5 (`auth()` from `@/auth`).
- **i18n:** Tolgee. Translation files in `src/i18n/`, refreshed via `yarn refresh-translations`.
- **Queues/jobs:** BullMQ (`src/queues`), Redis (`ioredis`).
- **Search:** Typesense (`@gdhub-io/gdhub-typesense`).
- **Payments:** Paddle (`src/services/paddle`). See [PADDLE_INTEGRATION.md](PADDLE_INTEGRATION.md).
- **Lint/format:** Biome (ESLint is disabled). **Tabs** for indentation, **double quotes**.
- **Tests:** Vitest (unit), Playwright (e2e). Storybook for components.

## Commands

| Task | Command |
|------|---------|
| Dev server | `yarn dev` (Turbopack) |
| Build | `yarn build` |
| Lint (Biome) | `yarn lint` |
| Type-check | `yarn type-check` |
| Unit tests | `yarn test` |
| Single test file | `yarn test <path>` |
| E2E tests | `yarn test:e2e` |
| Refresh translations | `yarn refresh-translations` |
| Prisma generate | `yarn db:generate` |
| Storybook | `yarn storybook` |

`yarn lint` runs on **pre-commit** (husky); `yarn refresh-translations` runs on **pre-push**.
Before opening a PR, run `yarn lint && yarn type-check && yarn test`.

## Repository layout

```
src/
  app/            Next.js App Router. Route groups: (auth) (public) (protected) (user),
                  plus admin/, courses/, my/. API under app/api/**/route.ts.
  components/     React components, one folder per component (PascalCase).
  layouts/        Page layouts (Protected, Public, Admin, Landing, ...).
  services/       External integrations (prisma, paddle, openai, novu, brevo,
                  typesense, telegram, matrix, langgraph, legal).
  repositories/   DB access logic grouped by domain (*.repository.ts).
  lib/            Core utilities (api-handlers.ts, firebase, matrix-client).
  helpers/        Small pure helpers (env, format, access, file, ...).
  hooks/          Reusable React hooks.
  schemas/        Zod schemas.
  queues/         BullMQ queues & workers.
  i18n/           Tolgee translation JSON.
  contexts/       React contexts and providers.
  config/ types/ templates/ styles/
docs/             Design docs, migration notes, legal, refund/equity policies.
tests/            Vitest unit tests + tests/e2e Playwright specs.
```

Path alias: `@/*` → `src/*`.

## API routes — the canonical pattern

API endpoints are **App Router route handlers** (`src/app/api/**/route.ts`) composed from
higher-order wrappers in [src/lib/api-handlers.ts](src/lib/api-handlers.ts). There are **no
decorators**. Building blocks:

- `withAuth({ mode, roles? })` — auth gate. `mode`: `"user"` (default), `"any"`, `"api"`,
  `"public_api"`, `"vercel_cron"`, `"gumroad"`. Injects `user` into the handler's `locals`.
- `withValidation(zodSchema, "body" | "query")` — validates input, injects parsed `body`.
- `withTeamGuard()` — verifies the user belongs to the `teamId`, injects `team`.
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
[src/app/api/vacancies/route.ts](src/app/api/vacancies/route.ts)).

## Conventions

- **Frontend data calls:** TanStack Query + axios. Don't call `fetch` ad-hoc in components.
- **Backend input validation:** always Zod via `withValidation`. Never trust raw body/query.
- **Env vars:** read through the `env()` helper from `@/helpers/env` — it throws on missing
  required vars. Keep `.env.example` in sync when adding a variable.
- **Icons:** import from `@react-icons/all-files/<pack>/<Icon>` (the full barrel import is
  forbidden for bundle size).
- **i18n:** add user-facing strings as Tolgee keys, not hardcoded text; run
  `yarn refresh-translations` after adding keys.
- **Formatting:** let Biome handle it (tabs, double quotes). Don't hand-format or fight it.
- **Comments:** English, only where they add non-obvious context.
- **Design files (`*.pen`) are encrypted** — only the Pencil MCP tools can read/edit them.
  Never `Read`/`Edit`/`Grep` a `.pen` file directly.

## Testing

- Unit: Vitest, files `tests/**/*.test.ts` or co-located `src/**/*.test.{ts,tsx}`.
- E2E: Playwright in `tests/e2e`. `*.authed.spec.ts` need an authenticated session.
  Run with `yarn test:e2e` (uses `.env.test`).
- When changing API or domain logic, add/extend a test rather than only manual checks.

## Gotchas

- The Prisma schema is in `node_modules`, not the repo — don't look for a local `prisma/`
  folder for the schema; use `yarn db:generate` after the package updates.
- ESLint is intentionally disabled in the editor; Biome is the single source of truth.
- `tsconfig.tsbuildinfo` / `.next` are build artifacts — never edit.
