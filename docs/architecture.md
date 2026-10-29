# Architecture

This file describes how the app is put together and where each kind of file goes.
Read it before you create a file. Keep it high-level: name directories and the rules
between them, not individual files, because file lists go out of date. Path alias:
`@/*` → `src/*`. The stack and the commands are in [CLAUDE.md](../CLAUDE.md).

## How a request travels

```
page / component ──► hook (TanStack Query + axios) ──► API route
                                                          │
                          ┌───────────────────────────────┘
                          ▼
              flow (services/<domain>/flows)  ── notify, pay, call the AI or Daily
                          │
                          ▼
              repository (repositories/<domain>) ── Prisma only
                          │
                          ▼
                     @/services/prisma
```

- **Routes stay thin.** A route validates its input with Zod, checks access, and then
  calls a repository for a plain read or write, or a flow for anything with side
  effects.
- **A repository only reads and writes the database.** It imports
  `@/services/prisma` and type-only imports, and never a notification, payment, chat
  or AI service. For checkpoints, `tests/checkpoint-layers.test.ts` enforces this.
- **A flow orchestrates.** Flows are the only place that combines repository calls
  with outside effects. In checkpoints they live in `services/checkpoints/flows/` and
  are named after the area they serve.
- **Pure logic lives in `lib/`.** It covers dates, states, predicates and formatting,
  with no database and no network, so it can be imported on the client and tested
  without mocks.
- **Every tunable number lives in `config/`.** That means limits, durations and prices.
- **Types the API returns (DTOs) live in `types/`.** A component imports its types
  from there, never from a repository.

## Directory map

```
src/
  app/                    Next.js App Router
    (landing)/            marketing pages: home, about, checkpoint landing
    (public)/             public pages: projects, jobs, events, blog, devlog, experts, legal
    (auth)/               sign-in, registration, invites
    (app)/                signed-in shell
      (spaces)/           one space per role: user, hub, admin, advisor, scout, dev
      live/ profile/
    chat/                 the chat page
    api/<domain>/…/route.ts   route handlers, grouped by domain
    providers/            client providers (query, Tolgee)
  components/
    <domain>/             components of one domain (checkpoints/, admin/, advisor/,
                          project/, scout/, hub/, events/, …) — new components go here
    ui/                   shared primitives: IconTile, StatusDot, EmptyState, AppImage, …
    layouts/              shells and headers (ProtectedShell, PublicShell, AuthShell, …)
    PascalCase folders at the root are older components; do not add new ones there
  hooks/                  TanStack Query hooks and other React hooks, one file per domain
  repositories/<domain>/  database access, plain kebab-case names (project/workflow.ts)
  services/
    <domain>/             domain orchestration; checkpoints/ has flows/, ai-curator/,
                          ai-review/, call-notes/, notifications.ts, reminders.ts
    prisma/ redis.ts      infrastructure clients
    payments/ stripe/ paddle/   money; every path goes through payments/gateway
    chat/ matrix/         chat rooms and the Matrix server
    novu/ brevo/ telegram/ discord.ts   notifications and messaging
    openai/ langgraph/ ai-validation/   AI
    typesense/ sanity.ts notion.ts      search and external content
    access/ legal/ evidence/ artifact-check/ workflow/ …   other domain services
  lib/
    <domain>/             pure domain logic (lib/checkpoints/status.ts, days.ts, …)
    api-handlers.ts       withAuth, withValidation, pipe, json, apiError
    space-guard.ts …      access guards and other cross-cutting helpers
  config/                 constants and settings (checkpoint.ts holds every checkpoint
                          number), design tokens (config/design), permissions, spaces
  types/                  DTOs and shared types (checkpoints.ts, checkpoint-call.ts, …)
  schemas/                Zod schemas for request bodies and queries
  helpers/                small framework-free helpers (env, format, file)
  contexts/               React contexts
  queues/                 BullMQ queues and workers
  i18n/                   generated Tolgee JSON — never edit by hand
  templates/ styles/ assets/   email templates, global SCSS, images and SVGs
  mocks/                  fixtures for Storybook stories
  auth.ts proxy.ts        NextAuth setup, edge proxy
tests/                    Vitest (*.test.ts) and tests/e2e Playwright specs
scripts/                  one-off maintenance and simulation scripts
docs/                     see "Docs" below
public/                   static files served as they are (favicons, fonts, robots.txt)
.claude/                  agents, skills, hooks and settings for Claude Code
```

## Where a new file goes

| You are adding | Put it in | Name |
|---|---|---|
| A page | `src/app/<group>/…/page.tsx` | Next convention |
| An endpoint | `src/app/api/<domain>/…/route.ts` | Next convention |
| A database read or write | `src/repositories/<domain>/<area>.ts` | kebab-case, no suffix |
| Logic that notifies, pays or calls the AI | `src/services/<domain>/flows/<area>.ts` | named after the repository it drives |
| A client for an outside service | `src/services/<provider>/` | provider name |
| Pure logic (dates, states, formatting) | `src/lib/<domain>/<topic>.ts` | kebab-case |
| A number someone may want to tune | `src/config/<domain>.ts` | UPPER_SNAKE constant |
| A type an endpoint returns | `src/types/<domain>.ts` | `…Dto` |
| A request schema | `src/schemas/<domain>.ts` | `…Schema` |
| A React component | `src/components/<domain>/<Name>/index.tsx` + `<Name>.stories.tsx` | PascalCase folder |
| A shared UI primitive | `src/components/ui/<Name>/` | PascalCase folder |
| A data hook | `src/hooks/<domain>.ts` | `use…` |
| A unit test | `tests/<domain>-<topic>.test.ts` | kebab-case |
| A feature doc or flow diagram | `docs/<feature>/` — see Docs below | kebab-case folder |

When a domain has no folder yet in a layer, create one. Do not leave a flat file
beside the folders.

## One domain across the layers

Checkpoints are the reference layout. A new domain should look the same.

| Layer | Path |
|---|---|
| Screens | `components/checkpoints/`; pages in `app/(spaces)/{admin,advisor}/checkpoints`, `app/(auth)/checkpoint/new`, `app/(landing)/checkpoint` |
| Hooks | `hooks/checkpoints.ts`, `hooks/checkpoint-call.ts`, … |
| Routes | `app/api/checkpoint/**` |
| Flows | `services/checkpoints/flows/` |
| Data | `repositories/checkpoints/` |
| Pure logic | `lib/checkpoints/` (statuses and moves in `status.ts`) |
| Numbers | `config/checkpoint.ts`, `config/checkpoint-pricing.ts` |
| Types | `types/checkpoints.ts`, `types/checkpoint-*.ts` |
| Docs | `docs/checkpoints/` (today still `docs/checkpoints.md` and `docs/checkpoints-*-flow.d2`) |

## Docs

Every feature keeps its documents in its own folder, so everything about it is in
one place:

```
docs/
  architecture.md         this file
  spaces.md               what the product is made of: spaces, features, links, access
  platform-map.md         every screen, numbered as in the design file
  intent/                 one intent per larger task, written before the code
  <feature>/              one folder per feature (checkpoints/, chat/, equity/, …)
    README.md             what the feature is, who it is for, how it works, where its
                          code lives, and links to everything below
    <topic>-flow.d2/.svg  logic diagrams
    …                     any other key material: decisions, data notes, rollout,
                          open questions
  design/                 Pencil files (*.pen), UI handoff specs, generated art
  legal/ finance/ analytics/   topic folders
```

Older docs still lie flat in `docs/` (`checkpoints.md` next to forty
`checkpoints-*-flow.d2` files, `chat-system.md`, `equity-description.md`, …). New
material goes into the feature's folder. When a feature's docs are next touched, move
them into its folder.

## What guards the structure

- `tests/checkpoint-layers.test.ts` fails if a checkpoint repository imports a service.
- `tests/checkpoint-status.test.ts` fails if a checkpoint status is written without
  passing through the table of allowed moves.
- `tests/design-tokens-guard.test.ts` fails on a hard-coded colour or an unknown
  `--gd-*` variable.
- `.claude/hooks/ui-antd-guard.sh` refuses raw HTML where antd has a component.

> Update this file when you add a top-level directory, a route group, a domain
> folder or a layer rule. Do not update it for every new component or endpoint.
