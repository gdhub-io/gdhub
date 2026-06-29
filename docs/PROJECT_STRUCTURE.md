# Project structure

A map of the codebase so agents and contributors can orient quickly. Keep it
**high-level** — describe directories and their purpose, not individual files (those
drift). Path alias: `@/*` → `src/*`.

## Top level

| Path | Purpose |
|------|---------|
| `src/` | All application code (see below). |
| `docs/` | Design docs, migration notes, legal/policy texts, this map. |
| `tests/` | Vitest unit tests + `tests/e2e` Playwright specs. |
| `public/` | Static assets. |
| `scripts/` | One-off maintenance scripts. |
| `.claude/` | Shared AI agent config: `settings.json`, `agents/`. |
| `.cursor/rules/` | Cursor rule files (mirror the conventions in `CLAUDE.md`). |
| `.storybook/` | Storybook config. |
| `docker/`, `Dockerfile`, `docker-compose.yml` | Local Postgres/Redis + container build. |

## `src/` overview

| Directory | What lives here |
|-----------|-----------------|
| `app/` | Next.js App Router: pages, layouts, and API routes. |
| `components/` | React components — one PascalCase folder per component. |
| `layouts/` | Page-level layouts (Protected, Public, Admin, Landing, Event, Project). |
| `services/` | External-integration clients (one folder/file per provider). |
| `repositories/` | Domain DB-access logic (`*.repository.ts`). |
| `lib/` | Core infrastructure utilities (e.g. `api-handlers.ts`, firebase, matrix). |
| `helpers/` | Small pure helpers (`env`, `format`, `access`, `file`, ...). |
| `hooks/` | Reusable React hooks. |
| `schemas/` | Zod schemas. |
| `queues/` | BullMQ queues & workers (`*.queue.ts`). |
| `contexts/` | React contexts and providers. |
| `i18n/` | Tolgee translation JSON (generated/refreshed). |
| `config/`, `types/`, `templates/`, `styles/`, `decorators/`, `mock/`, `assets/` | Config, shared TS types, email/templating, global styles, misc. |
| `auth.ts` | NextAuth v5 setup (`auth()` helper). |
| `proxy.ts` | Edge/proxy entry. |

## `src/app/` route groups

| Group / dir | Audience | Examples |
|-------------|----------|----------|
| `(auth)` | Unauthenticated auth flows | `signin`, `registration` |
| `(public)` | Public pages | `project(s)`, `job(s)`, `event(s)`, `blog`, `devlog`, `expert`, legal pages |
| `(protected)` | Logged-in app shell | `hub`, `profile`, `live` |
| `(user)` | Current-user area | `my` (projects, events) |
| `admin/` | Admin/back-office | `users`, `posts`, `workflows`, `audit-logs` |
| `courses/` | Course pages | `[slug]` |
| `api/` | HTTP API route handlers | see below |

### `src/app/api/` domains

App Router route handlers (`**/route.ts`) composed from the HOFs in
[`src/lib/api-handlers.ts`](../src/lib/api-handlers.ts) — `withAuth`, `withValidation`,
`withTeamGuard`, `pipe`. **No decorators.** See the API section of [CLAUDE.md](../CLAUDE.md).

Main domains: `auth`, `user(s)`, `project(s)`, `vacancies`, `expert(s)`/`specialist(s)`,
`events`, `devlog(s)`, `blog`, `courses`, `chat`, `paddle` (payments webhooks),
`cron`/`queue` (background jobs), `og*` (Open Graph image generation), `analytics`,
`file`, `notion`, `novu`, `revalidate`, `admin`, `internal`.

## `src/services/` catalog

| Service | Responsibility |
|---------|----------------|
| `prisma/` | Database client (`import { prisma } from "@/services/prisma"`) + shared queries. |
| `paddle/` | Paddle payments (client token + server-side verification). |
| `openai/`, `langgraph/` | LLM / agent features. |
| `novu/`, `brevo`, `telegram/`, `discord.ts` | Notifications & messaging. |
| `matrix/` | Matrix chat. |
| `typesense/` | Search indexing/querying. |
| `notion.ts`, `sanity.ts`, `docs.ts` | External content sources. |
| `legal/` | Legal documents / e-signing. |
| `redis.ts` | Redis connection (shared by BullMQ). |
| `tolgee.ts` | i18n runtime config. |
| `projectLifecycleNotifications.ts` | Project lifecycle event → notifications. |

> Update this file when adding/removing a top-level directory, route group, or service —
> not for every new component or endpoint.
