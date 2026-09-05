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

## Accounts

This machine holds more than one GitHub and more than one Linear account, and the wrong
one fails quietly rather than loudly: GitHub answers **404**, not 403, for a repository
a token cannot see, and Linear would write into the other workspace without complaint.

- GitHub: `dmitrydrynov`. `gh auth switch --hostname github.com --user dmitrydrynov`
  (the name must be passed with `--user`; a positional argument is ignored).
- Commits: `dmitry.drynov@gmail.com`.
- Linear: `dmitry.drynov`, workspace GDHub, team `GDHUB`. **Confirm with
  `get_user("me")` before the first write of a session** — every read is harmless, a
  write into the wrong workspace is not undone by retrying.

`.claude/hooks/account-guard.sh` blocks `gh` and `git push` from the wrong account and
forces a prompt on Linear writes; `.husky/pre-push` repeats the check for pushes made
outside Claude.

## Starting a piece of work

Anything larger than a one-file fix starts with an **intent** — a short file in
[docs/intent/](docs/intent/) stating what is wanted, why, and what must not move,
written before the design and before the code. The `/intent` skill writes one from a
Linear issue and opens the branch for it.

Linear issues here are titles with empty descriptions, so the intent is the only
written statement of the goal; the detailed spec (`docs/<feature>.md`) grows out of it
afterwards, and the UI handoff (`docs/design/specs/`) out of that. A typo, a copy change
or a one-file bug needs none of this — say so and do the work.

## Tech stack

- **Framework:** Next.js 16 (App Router, Turbopack), React 19, TypeScript (strict).
- **UI:** Ant Design v6 (`antd`). Icons: `@tabler/icons-react` only. Styling: SCSS modules.
- **Data fetching (client):** TanStack Query (`@tanstack/react-query`) + `axios`.
- **State:** Jotai and Zustand (atoms/stores live next to their feature).
- **Validation:** Zod. (`class-validator` / `next-api-decorators` are **removed** — do not use.)
- **Database:** Prisma via the external package `@gdhub-io/gdhub-prisma`. The schema is
  **not** in this repo — it lives at
  `node_modules/@gdhub-io/gdhub-prisma/prisma/schema.prisma`. Access the client via
  `import { prisma } from "@/services/prisma"`. Types and enums come from the package
  root — `import { ProjectStatus } from "@gdhub-io/gdhub-prisma"`, which is what every
  file here does. The package's `exports` map publishes only `.`, `./client`, `./types`
  and `./seed`; a deeper path such as `dist/client` does not resolve.
- **Auth:** NextAuth v5 (`auth()` from `@/auth`).
- **i18n:** Tolgee. Translation files in `src/i18n/`, refreshed via `bun run refresh-translations`.
- **Queues/jobs:** BullMQ (`src/queues`), Redis (`ioredis`).
- **Search:** Typesense (`@gdhub-io/gdhub-typesense`).
- **Payments:** Paddle (`src/services/paddle`). See [PADDLE_INTEGRATION.md](PADDLE_INTEGRATION.md).
- **Lint/format:** Biome (ESLint is disabled). **Tabs** for indentation, **double quotes**.
- **Tests:** Vitest (unit), Playwright (e2e). Storybook for components.

## Commands

| Task | Command |
|------|---------|
| Install deps | `bun install` |
| Dev server | `bun run dev` (Turbopack) |
| Build | `bun run build` |
| Lint (Biome) | `bun run lint` |
| Type-check | `bun run type-check` |
| Unit tests | `bun run test` |
| Single test file | `bun run test <path>` |
| E2E tests | `bun run test:e2e` |
| Refresh translations | `bun run refresh-translations` |
| Prisma generate | `bun run db:generate` |
| Storybook | `bun run storybook` |

**Package manager: Bun only** (pinned via `packageManager` in `package.json`, lockfile
`bun.lock`). Never use `yarn`/`npm`/`pnpm` — they would produce a competing lockfile.

`bun run lint` runs on **pre-commit** (husky). **Pre-push** refreshes translations and
then runs the full gate — lint, type-check and the unit tests, about 15s. The same three
run in CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) on every PR and on pushes
to `dev`/`main`; the repository is private on a free plan, so GitHub branch protection is
unavailable and the pre-push hook is what actually holds the line.

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

- **UI & design system:** read [docs/design/ui-guidelines.md](docs/design/ui-guidelines.md)
  before building a screen. Design tokens live in `src/config/design` (build themes with
  `buildAntdTheme`, never hand-write a `ThemeConfig`); shared primitives — `IconTile`,
  `StatusDot`, `EmptyState`, `SectionHeading`, `ViewAllLink` — in `src/components/ui`.
  Never hard-code a colour, radius or control height: use a token or `var(--gd-*)`.
  **Check finished screens back against the system** — `tests/design-tokens-guard.test.ts`
  fails on hardcoded colours and on `var(--gd-*)` names the theme never emits (a misspelt
  custom property is silent: the browser drops the declaration and the styling just goes
  missing). The spacing scale is `1 2 3 4 6 8 12 16` — there is no `--gd-space-5`.
- **Frontend data calls:** TanStack Query + axios. Don't call `fetch` ad-hoc in components.
- **Backend input validation:** always Zod via `withValidation`. Never trust raw body/query.
- **Env vars:** read through the `env()` helper from `@/helpers/env` — it throws on missing
  required vars. Keep `.env.example` in sync when adding a variable.
- **Icons:** `@tabler/icons-react` and nothing else — one family, one stroke weight,
  one set of names. `@react-icons` and `@ant-design/icons` are **removed**; the only
  survivors are antd's own `LoadingOutlined` (it drives the `indicator` prop) and its
  `Icon` wrapper for custom SVG.
- **i18n:** add user-facing strings as Tolgee keys, not hardcoded text. `src/i18n/*.json`
  are generated and overwritten on every push — the **i18n skill** has the procedure and
  the traps.
- **Formatting:** let Biome handle it (tabs, double quotes). Don't hand-format or fight it.
- **Comments:** English, only where they add non-obvious context.
- **Design files (`*.pen`) are encrypted** — only the Pencil MCP tools can read/edit them.
  Never `Read`/`Edit`/`Grep` a `.pen` file directly.

## Changing the database schema

The schema, seeds and Prisma extensions live in the sibling repo
[gdhub-prisma](https://github.com/gdhub-io/gdhub-prisma) (locally `../prisma`), never
here. A schema change is a two-repo loop:

1. Edit the schema / seed / extension there, commit it in Conventional Commits style,
   merge to `dev` or `main`.
2. Its `release.yml` (semantic-release) publishes a new `@gdhub-io/gdhub-prisma` to
   GitHub Packages.
3. Back here: bump the pinned version in `package.json`, `bun install`,
   `bun run db:generate`, then adapt the app code and its tests.

Never hand-edit anything under `node_modules/@gdhub-io/gdhub-prisma` — the next
install throws the change away.

## Testing

- Unit: Vitest, files `tests/**/*.test.ts` or co-located `src/**/*.test.{ts,tsx}`.
- E2E: Playwright in `tests/e2e`. `*.authed.spec.ts` need an authenticated session.
  Run with `bun run test:e2e` (uses `.env.test`).
- When changing API or domain logic, add/extend a test rather than only manual checks.

## Gotchas

- The Prisma schema is in `node_modules`, not the repo — don't look for a local `prisma/`
  folder for the schema; use `bun run db:generate` after the package updates.
- **"Column X does not exist" usually means the wrong database, not a missing migration.**
  `DATABASE_URL` points at `localhost:5432`, and any other project's Postgres container
  can be holding that port. `bun run db:status` names the database it reached and whether
  it is up to date — run it before believing the error.
- ESLint is intentionally disabled in the editor; Biome is the single source of truth.
- `tsconfig.tsbuildinfo` / `.next` are build artifacts — never edit.
