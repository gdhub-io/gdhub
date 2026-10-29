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
open it. Never `Read`, `Edit` or `Grep` a `.pen` file. Call `get_app_state`,
then `read_skill` with its `pen-schema.md` and `execute.md` — `execute` fails
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

Write it here, in this conversation — it already holds the frame, the node IDs
and the decisions a handoff would lose. Load the **ui-component** skill for the
UI and the **api-route** skill for endpoints.

The stack, the API pattern and the conventions are in
[CLAUDE.md](../../../CLAUDE.md) — do not restate them, follow them. Three that
get broken anyway:

- **Build with antd.** `List`, `Card`, `Tag`, `Flex`, `Segmented`, `Modal`,
  `Typography` — if antd ships the thing, use it. Hand-rolled markup is for a
  bespoke anatomy the design file actually draws, and then it needs a sentence
  naming the frame. Layout itself — a grid, a stack — is CSS, not a component;
  that is not what this rule is about.
- **Icons are `@tabler/icons-react`.** One family, one stroke weight, nothing
  else.
- **Comments: one line, and only what the code cannot say.** A block is for a
  file or an exported function whose *why* is genuinely not obvious. Everything
  inline gets one line or gets deleted.

What CLAUDE.md does not say:

- **Reuse first.** Grep before writing a helper. Things that exist and get
  rewritten anyway: `formatDollar` / `formatCompactCount`
  (`src/helpers/format.ts`), `toOptions` (`src/helpers/select.ts`),
  `paginateInMemory` (`src/lib/pagination.ts`), `getProjectCardFacts`
  (`src/repositories/project/card.ts`),
  `prisma.project.getApplauseCounts`.
- A two-column grid is layout, not a component — "antd over hand-rolled markup"
  is about not rebuilding components antd ships, not about avoiding CSS.
- Comments only where they carry what the code cannot. Prefer explaining *why
  this and not the obvious alternative*.

## 5. Leave it verifiable by someone else

A screen that only its author can check is unfinished. Two artefacts, both
written in the same pass as the code, never afterwards:

**A story, for anything reusable.** A card, a modal, a row, a state machine
with more than one visible state — `Component.stories.tsx` next to it, one
story per state the design drew, including empty and loading. This is where the
four states stop being a promise: `Modal — …` and `· empty` frames exist in the
design file precisely so they can be rendered side by side without a database.
A one-off page section does not need one; a thing that will be reused or that
looks different in three situations does.

**A test, for anything that can be wrong silently.** Not coverage — the places
where a mistake would ship green:

- the filter or bucket map, where a status quietly lands in the wrong tab;
- the query's scoping — the `where` that separates one user's rows from
  everyone else's is a security boundary, and it is one word long;
- a state transition that must refuse an illegal move;
- anything derived from time, a locale or a timezone;
- the space definition and its permissions, when a space is added.

Say in the report what you chose not to test and why. "The card renders" is not
a test worth writing; "a declined request never appears under Answered" is.

**Then simplify, before anyone is asked to read it.** Re-read your own diff
looking for what can go, not for what is missing:

- State you are keeping that a library already keeps — accumulating pages by
  hand where `useInfiniteQuery` exists, a `useEffect` that only mirrors a prop.
- A helper used once. Inline it.
- A branch no caller can reach, an option nothing passes, a `useMemo` around
  something cheap.
- Two functions that are the same shape with one value different.
- Every comment that restates its code.

A diff that is smaller after this pass is the deliverable; if nothing came out,
say so. Then the gate:

```
bun run lint && bun run type-check && bun run test
```

`tests/design-tokens-guard.test.ts` is the one that catches hardcoded colours
and `--gd-*` names the theme never emits — a misspelt custom property fails
silently in the browser, so a green run here is the only proof.

**And the handoff spec.** When the work implements frames from the design file,
write or extend `docs/design/specs/<screen>.md`: what was built, which node IDs
it came from, and every place the code deliberately departs from the frame. The
next agent reads that file instead of re-deriving the screen from a picture.

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
- **In Pencil, a text node ignores `width` unless `textGrowth: "fixed-width"` is
  set.** It silently falls back to fit-content, so a table head built from bare
  text labels drifts away from a body built from real columns, and the frame
  looks right in the node tree. Build a column as a frame with an explicit width
  and put the content inside it, then assemble head and body from that same
  column — one head, not one per table.
