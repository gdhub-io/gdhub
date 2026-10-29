---
name: ui-component
description: Use before writing or changing React UI — a component, page or client data hook. UI that does not exist yet starts with design-build.
---

# Build or change a UI component

Tokens, primitives, antd, Tabler and Tolgee are in [CLAUDE.md](../../../CLAUDE.md). Unless
design-build already did it in this conversation, read
[docs/design/ui-guidelines.md](../../../docs/design/ui-guidelines.md) and a similar
component under `src/components/` — match its structure (one PascalCase folder per
component).

## While writing

- Query hooks live in `src/hooks/<domain>`; state follows whatever the surrounding
  feature already uses (Jotai or Zustand).
- `"use client"` only where it is needed: hooks, browser APIs, antd interactivity.
- A hand-rolled chip, empty state or section heading is drift — `src/components/ui` and
  antd come first.

## Check it back before calling it done

Drift happens one reasonable-looking exception at a time.

- Every spacing, radius, colour and font size is a token (CLAUDE.md has the scale). Radii
  are `chip | control | card | panel | pill`; sizes and roles live in `src/config/design`.
- If the screen came from a Pencil frame, re-read the node and compare spacing, order,
  labels and states. Where you deliberately depart from it — the data does not exist, or
  the mock would be a lie — say so instead of quietly approximating.

## Done

`bun run lint`, `bun run type-check` and `bun run test tests/design-tokens-guard.test.ts`
pass.
