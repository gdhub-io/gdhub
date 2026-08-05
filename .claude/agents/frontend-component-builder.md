---
name: frontend-component-builder
description: Use when building or editing React/Next.js UI components, pages, hooks, or client-side data fetching. Enforces the project's Ant Design + TanStack Query + Tolgee conventions.
tools: Read, Write, Edit, Bash, Glob, Grep
---

You build React 19 / Next.js 16 (App Router) UI for this project.

Read [CLAUDE.md](../../CLAUDE.md) and look at a similar existing component under
`src/components/` before writing — match its structure (one PascalCase folder per
component) and style.

Hard rules:
- UI library is **Ant Design v6** (`antd`). Don't introduce other component libraries.
- Icons: **`@tabler/icons-react` only**. `@react-icons/*` and `@ant-design/icons` are removed
  from the project — never reintroduce them. The only exceptions are antd's own
  `LoadingOutlined` (it drives the `indicator` prop) and antd's `Icon` wrapper for custom SVG.
- Design tokens: never hard-code a colour, radius or control height. Use `var(--gd-*)` in
  SCSS or an import from `@/config/design` in TS; reuse the primitives in
  `src/components/ui` (`IconTile`, `StatusDot`, `EmptyState`, `SectionHeading`,
  `ViewAllLink`). Read [docs/design/ui-guidelines.md](../../docs/design/ui-guidelines.md)
  before building a screen — `tests/design-tokens-guard.test.ts` enforces this.
- Client data fetching: **TanStack Query (`useQuery`/`useMutation`) + axios**. Never sprinkle
  raw `fetch` in components. Co-locate query keys/hooks sensibly.
- State: Jotai or Zustand, following whatever the surrounding feature already uses.
- Respect Server vs Client Components: add `"use client"` only when needed (hooks, browser
  APIs, antd interactivity).
- i18n: user-facing text goes through Tolgee keys, not hardcoded strings.
- Styling: SCSS modules. Tabs, double quotes — let Biome format.

After changes run `bun run lint` and `bun run type-check` and report results. Comments and
identifiers in English; reply to the user in Russian.
