---
name: ui-component
description: Write or change React UI that already has a design or needs none — a component, page, hook or client-side data call. Use before editing src/components, src/app pages or src/hooks. For UI that does not exist yet, design-build comes first and hands over here.
---

# Build or change a UI component

The conventions are in [CLAUDE.md](../../../CLAUDE.md) (antd, Tabler, tokens, Tolgee) and
[docs/design/ui-guidelines.md](../../../docs/design/ui-guidelines.md). Read the guidelines
before building a screen, and look at a similar component under `src/components/` —
match its structure (one PascalCase folder per component) and style.

## While writing

- Client data: TanStack Query (`useQuery` / `useMutation`) + axios, hooks in
  `src/hooks/<domain>`. No raw `fetch` in a component.
- State: Jotai or Zustand — whichever the surrounding feature already uses.
- `"use client"` only where it is needed: hooks, browser APIs, antd interactivity.
- Reach for a primitive in `src/components/ui` (`IconTile`, `StatusDot`, `EmptyState`,
  `SectionHeading`, `ViewAllLink`) and an antd component before writing a new one. A
  hand-rolled chip, empty state or section heading is drift.
- A reusable component ships with a story, one per drawn state, empty and loading included.

## Check it back before calling it done

Drift happens one reasonable-looking exception at a time.

- Every spacing, radius, colour and font size is a token. The spacing scale is
  `1 2 3 4 6 8 12 16` — there is no `--gd-space-5`, and a misspelt name silently voids
  the whole declaration (that is how a card once lost all its padding). Radii are
  `chip | control | card | panel | pill`; sizes and roles live in `src/config/design`.
- If the screen came from a Pencil frame, re-read the node and compare spacing, order,
  labels and states. Where you deliberately depart from it — the data does not exist, or
  the mock would be a lie — say so instead of quietly approximating.

## Done

`bun run lint`, `bun run type-check` and `bun run test tests/design-tokens-guard.test.ts`
pass.
