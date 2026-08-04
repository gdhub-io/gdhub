# UI guidelines

How a GDHub screen is put together. The visual reference is the `DS · 07 Proposal`
page of [platform-design.pen](platform-design.pen); the values live in
[`src/config/design`](../../src/config/design) and the primitives in
[`src/components/ui`](../../src/components/ui).

Read this before building a page. It is short on purpose — six layout rules and
three colour rules.

## Colour

**Graphite acts, brand orients, red destroys.** The button that commits is
graphite (`colorPrimary`, already the theme default). The brand orange never
fills a control inside the product — it appears as a 2px mark or a 4–8% tint:
selected row, focus ring, progress, links. Red is reserved for destructive and
failed; a filled red button belongs only in a confirm dialog.

Navigation is not one of those places. The current tab is a neutral fill and a
heavier weight — a coloured tab on a bar the user reads all day stops meaning
"you are here" and starts meaning "something is wrong".

A wall of brand-coloured buttons reads as errors, which is why the split exists.
Filled brand is allowed on marketing surfaces (`inverse` mode) — there it carries
an ink label, not a white one.

**Craft colour is the palette.** The eighteen work directions are double-encoded,
colour *and* icon. Colour belongs to content — tiles, card hero panels, group
headers — while the chrome stays neutral. Never hard-code a direction hex: use
`getWorkDirection(name)` or `<IconTile direction="…">`.

**Never write a hex in a component.** Use a token: `var(--gd-color-*)` in SCSS,
or an import from `@/config/design` in TS. A raw hex is a bug report waiting to
be filed — the audit found 20+ greys and five blues that got there this way.

## Layout

1. **Separate by fill, not by border.** The page sits on `--gd-color-bg`; cards
   are white with no stroke. Reach for a border only when two surfaces of the
   same fill must be told apart. Near-black outlines are what made the old UI
   read as a wireframe.

2. **Tinted icon tile.** A list row, a quick action or an empty state gets an
   `<IconTile>` — 32/40/56px, radius 10/12/16. Direction rows inherit the craft
   colour; everything else falls back to neutral.

3. **Status is a dot and a word.** Use `<StatusDot>`. Statuses repeat down a
   list, and filled `<Tag>`s turn a table into confetti. Tags stay for things
   that are genuinely labels — skills, categories.

4. **Empty states are screens.** Use `<EmptyState>`: a tile, an affirmative
   title, one sentence saying what will appear here. Not antd's default grey
   illustration.

5. **Headings are large.** `<SectionHeading>` at 24/20px semibold against 14px
   body. Few sizes, big contrast. Pick the rank by document structure; the
   display font (Manrope) is applied by the theme.

6. **One "more behind this" affordance.** `<ViewAllLink>` in a card header —
   not a ghost button, not a bare arrow.

## Spacing and shape

Spacing is a 4-grid: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64. Radii are
chip 6 / control 8 / card 12 / panel 16 / pill 999. Controls come in 32 / 40 / 48
and the theme already picks the right ladder per density, so set a height only
when you are fighting a genuine exception.

Elevation has four steps and `e0` — flat — is the default. A shadow means "this
floats above the page" (dropdown, modal), not "this is a card".

## Typography

Plus Jakarta Sans runs everything. One family carries both roles, so a heading
differs from a list row by weight and tracking, not by typeface. Weights are
400 / 500 / 600, with 700 for display only. Numeric columns get
`font-feature-settings: "tnum"` rather than a second font family.

Candidates are compared in Storybook under *Design system → Typography*, where
each pair renders the same block of product UI. Judge a font on a list row, not
on a specimen sheet.

## Themes

One token layer, two modes (`light` / `inverse`), two densities (`product` /
`marketing`). Build a theme with `buildAntdTheme({ mode, density })` — do not
write a new `ThemeConfig` by hand. A dark header or footer is an inverse *band*
applied to a subtree, not a theme of its own.

## Text

Every user-facing string is a Tolgee key. The `ui` primitives take
already-translated strings on purpose, so translation stays at the call site
where the context is.
