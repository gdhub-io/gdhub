---
name: design-build
description: Design a new screen or component in Pencil against the GDHub design system, then build it. Use when asked to add UI that does not exist yet — a screen, a modal, a card, a table — or to redo one. Enforces design-before-code, tokens over literals, and reuse over reinvention.
---

# Design and build a GDHub component

One pass from a requirement to a shipped component. The order is the point: the
frame exists before the code does, and the code is checked back against it.

## 0. Scope it

Restate what is being built in one sentence and name the surface it lives on
(hub page, space page, modal, marketing). Ask only about things that change the
work — where it opens from, who sees it, what happens when it is empty. Decide
the rest yourself and say what you decided.

## 1. Read the rules before drawing anything

- [docs/design/ui-guidelines.md](../../../docs/design/ui-guidelines.md) — colour,
  layout, spacing, **Pixel perfect**, **Craft**. It is the contract.
- `src/config/design/` — `tokens.ts`, `roles.ts`, `antd.ts`, `css.ts`. Every
  number and colour you will use already has a name here.
- `src/components/ui/` — `IconTile`, `StatusDot`, `EmptyState`,
  `SectionHeading`, `ViewAllLink`. Use them or explain why not.
- The nearest existing screen. Someone has usually solved half of this.

## 2. Design in Pencil first

Never write component code before the frame exists — a design argued from a
diff is a design nobody agreed to.

`docs/design/platform-design.pen` is encrypted: only the `mcp__pencil__*` tools
open it. Never `Read`, `Edit` or `Grep` a `.pen` file. Call
`get_app_state({ include_schema: true, include_canvas_design: true,
include_scripts_and_shaders: false })` first — no other Pencil tool works
without the schema.

Delegate the drawing to the **`web-designer`** agent when the screen is large;
do it inline when it is one component. Either way:

- Reuse the components already in the file before adding a node type.
- Screenshot what you made and look at it. A frame that reads fine as JSON can
  be visibly broken.
- Report the node IDs. Every later conversation refers to them.

## 3. Check the design against the system

Before coding, walk your own frame:

- Every spacing, size and control height off the 4-grid; radii 6/10/12/16/999;
  type 13/14/16/20/24/32. An off-scale value means the frame is wrong.
- Panels are outlined and transparent — `--gd-color-surface` is only for things
  that float.
- Graphite commits, brand orients, red destroys.
- Four states drawn or accounted for: loading, empty, error, with data.

## 4. Build it

Delegate to **`frontend-component-builder`** (UI) and **`api-route-builder`**
(endpoints) for anything substantial, or write it inline when small.

The stack, the API pattern and the conventions are in
[CLAUDE.md](../../../CLAUDE.md) — do not restate them, follow them. What that
file does not say:

- **Reuse first.** Grep before writing a helper. Things that exist and get
  rewritten anyway: `formatDollar` / `formatCompactCount`
  (`src/helpers/format.ts`), `toOptions` (`src/helpers/select.ts`),
  `paginateInMemory` (`src/lib/pagination.ts`), `getProjectCardFacts`
  (`src/repositories/project-card.repository.ts`),
  `prisma.project.getApplauseCounts`.
- A two-column grid is layout, not a component — "antd over hand-rolled markup"
  is about not rebuilding components antd ships, not about avoiding CSS.
- Comments only where they carry what the code cannot. Prefer explaining *why
  this and not the obvious alternative*.

## 5. Verify, then report

```
bun run lint && bun run type-check && bun run test
```

`tests/design-tokens-guard.test.ts` is the one that catches hardcoded colours
and `--gd-*` names the theme never emits — a misspelt custom property fails
silently in the browser, so a green run here is the only proof.

Add or extend a test whenever you touched API or domain logic.

Report: the Pencil node IDs, the files, what you decided that was not asked,
and anything you deliberately did not do. If something in the request was
wrong, say so in a sentence and build the rest.

## Traps this repo has already sprung

- A conditional spread into a Prisma `findMany` makes the argument a union and
  kills `select` inference — write `skip`/`take` as plain values.
- `as const` on a Prisma `where` fragment does the same: `in` wants a mutable
  array.
- Two `NOT` fragments spread into one `where` silently keep only the last.
  Collect them under `AND`.
- antd honours column widths only under `table-layout: fixed`, which needs
  `scroll.x`. `max-content` there defeats truncation.
- Flex truncation needs `min-width: 0` on the parent.
- `globals.scss` sets `svg { display: block }` — centring an icon needs a flex
  wrapper, not `align`.
