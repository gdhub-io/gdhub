# GDHub

Platform for indie game developers — projects, teams, vacancies, courses, events,
devlogs, equity and paid job listings. A single Next.js 16 application.

## Tech stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript (strict) · Ant Design 6 ·
TanStack Query + axios · Zod · Prisma (via `@gdhub-io/gdhub-prisma`) · NextAuth v5 ·
Tolgee (i18n) · BullMQ + Redis · Typesense · Paddle · Biome · Vitest + Playwright.

## Requirements

- Node.js >= 20.9
- Bun >= 1.2 (the only supported package manager — see `packageManager` in `package.json`)
- PostgreSQL and Redis (or use `docker-compose up`)

## Getting started

```bash
bun install
cp .env.example .env          # fill in the values
bun run db:generate           # generate the Prisma client
bun run dev                   # http://localhost:3000
```

## Common commands

| Task | Command |
|------|---------|
| Dev server (Turbopack) | `bun run dev` |
| Production build | `bun run build` |
| Lint (Biome) | `bun run lint` |
| Type-check | `bun run type-check` |
| Unit tests | `bun run test` |
| E2E tests (Playwright) | `bun run test:e2e` |
| Refresh translations | `bun run refresh-translations` |
| Prisma client | `bun run db:generate` |
| Storybook | `bun run storybook` |

Pre-PR checklist: `bun run lint && bun run type-check && bun run test`.

## Project structure

See [docs/architecture.md](docs/architecture.md) for a map of the codebase.

## Conventions & AI agents

Coding conventions (API route pattern, data fetching, i18n, etc.) live in
[CLAUDE.md](CLAUDE.md), which is also the shared context for AI agents (Claude Code,
Cursor). Custom subagents are in [.claude/agents/](.claude/agents/).

## Notes

- The Prisma schema is **not** in this repo — it ships with the
  `@gdhub-io/gdhub-prisma` package (`node_modules/@gdhub-io/gdhub-prisma/prisma/schema.prisma`).
- Linting/formatting is handled by **Biome** (ESLint is disabled): tabs, double quotes.
- Payments integration details: [PADDLE_INTEGRATION.md](PADDLE_INTEGRATION.md).
