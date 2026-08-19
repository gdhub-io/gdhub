# UI guidelines

How a GDHub screen is put together. This file is the rules; the visual reference
is the `DS · Tokens — as shipped` frame in
[platform-design.pen](platform-design.pen), which shows every ramp, role,
direction, type step, radius, density, skill level, the logo and the direction
icons, each row carrying the `--gd-*` name you type. The values themselves live
in [`src/config/design`](../../src/config/design) and the primitives in
[`src/components/ui`](../../src/components/ui).

Read this before building a page. It is short on purpose: the rules are the
few that get broken, and each one says what breaks when it is.

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

**Marketing has a second accent.** The landing speaks to two audiences and tells
them apart by colour: authors get the brand, specialists get amber
(`--gd-color-accent-alt`, ink label). It exists only out there — inside the
product a single accent is the whole point of the rule above.

**Craft colour is the palette.** The eighteen work directions are double-encoded,
colour *and* icon. Colour belongs to content — tiles, card hero panels, group
headers — while the chrome stays neutral. Never hard-code a direction hex: use
`getWorkDirection(name)` or `<IconTile direction="…">`.

**Never write a hex in a component.** Use a token: `var(--gd-color-*)` in SCSS,
or an import from `@/config/design` in TS. A raw hex is a bug report waiting to
be filed — the audit found 20+ greys and five blues that got there this way.

`tests/design-tokens-guard.test.ts` enforces this. If a colour is genuinely
content — an illustration, a third-party brand, a scale the system has no role
for — add the file to that test's allowlist with the reason. Everything else
belongs to a token.

## Layout

1. **Panels are outlined, not filled.** The page carries the fill
   (`--gd-color-bg`); a panel is transparent and separates with a hairline in
   `--gd-color-border`. What made the old UI read as a wireframe was the *weight*
   of those lines — near-black at full opacity — not the fact that they existed.

   `--gd-color-surface` is for things that genuinely sit above the page: modals,
   dropdowns, popovers, input fills. Using it for every card flattens that
   distinction and leaves nothing to say "this floats".

   The consequence to remember: a neutral fill inside a panel is read against the
   *page*, not against white. `--gd-color-surface-sunken` disappears there — go a
   step further to `--gd-neutral-100`.

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
   body — or rank 4 (16px) inside a card, where a 20px title crowds the rows.
   Few sizes, big contrast. Pick the rank by document structure.

6. **One "more behind this" affordance.** `<ViewAllLink>` in a card header —
   not a ghost button, not a bare arrow.

## Spacing and shape

Spacing is a 4-grid: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64. Radii are
chip 6 / control 10 / card 12 / panel 16 / pill 999. Controls come in 32 / 40 / 48
and the theme already picks the right ladder per density, so set a height only
when you are fighting a genuine exception.

Elevation has four steps and `e0` — flat — is the default. A shadow means "this
floats above the page" (dropdown, modal), not "this is a card".

## Pixel perfect

Build from the values in the design file, not from what the screenshot looks
like. Open the node, read its numbers, use them. A layout that is "about right"
costs the next person the same hour of guessing it cost you.

Every number you type comes from a token. If a design asks for something the
scales do not have — 18px of padding, a 7px radius — the design is wrong: fix
the frame, do not hardcode the exception. `tests/design-tokens-guard.test.ts`
fails on hardcoded colours and on `--gd-*` names the theme never emits, and a
misspelt custom property is silent — the browser drops the declaration and the
styling simply goes missing.

**The 4-grid covers spacing and box sizes.** Padding, gaps, margins, widths,
heights, control sizes: all multiples of 4, off the scale above.

**Three things are deliberately not on it, and must not be "corrected":**

- **Radii** — 6 / 10 / 12 / 16. The product is full of rounded squares sitting
  inside one another, and a 4-step radius ladder reads as a different family.
- **Type** — 13 / 14 / 16 / 20 / 24 / 32, with line heights as ratios. Type is
  sized by reading distance, not by a grid.
- **Hairlines and icons** — a 1px border is 1px at every density, and icon sizes
  follow the set (14 / 16 / 20 / 24), not the spacing scale.

Optical beats mathematical where they disagree. An icon centred by its bounding
box next to text usually sits a fraction low; trust the eye, then write the
correction down in a comment so it is not "fixed" later.

## Typography

Onest runs everything. One family carries both roles, so a heading differs from
a list row by weight and tracking, not by typeface. Weights are 400 / 500 / 600,
with 700 for display only. Numeric columns get `font-feature-settings: "tnum"`
rather than a second font family.

**And both scripts.** Users write in Russian, and a Latin job title sits next to
a Russian description inside the same line — so a family without Cyrillic would
swap typefaces mid-sentence, not page by page. That is what retired Plus Jakarta
Sans, which ships no Cyrillic subset. Any replacement has to cover
`latin`, `latin-ext` and `cyrillic`; check the Google Fonts API before proposing
one, and remember the OG cards have no fallback at all — satori draws tofu.

Candidates are compared in Storybook under *Design system → Typography*, where
each pair renders the same block of product UI. Judge a font on a list row, not
on a specimen sheet.

## Themes

One token layer, two modes (`light` / `inverse`), two densities (`product` /
`marketing`). Build a theme with `buildAntdTheme({ mode, density })` — do not
write a new `ThemeConfig` by hand.

Three themes are already built: `productTheme` (hub, my, admin, auth),
`publicTheme` (light marketing pages) and `inverseTheme` (the landing and dark
bands). A dark header or footer is a `<InverseBand>` applied to a subtree, not a
theme of its own — it re-declares the roles *and* swaps the antd theme, which is
what stops a dark header from serving a button with dark text on a dark
background. Pass `transparent` when the band sits on artwork that supplies its
own background.

## Craft

Small rules that are cheap to follow and expensive to retrofit.

**Hit targets.** 40 is the standard control height; 32 only inside dense
surfaces like table rows, and then with padding around it. Nothing interactive
is smaller than 32 square, icon buttons included.

**Truncation.** A cell is one line: truncate with an ellipsis and put the full
value in a tooltip. Wrapping a table cell silently changes the height of every
row beside it. Truncation needs `min-width: 0` on the flex parent — a flex item
defaults to `min-width: auto` and refuses to shrink below its content, so the
ellipsis never engages. In an antd `Table`, column widths are only binding under
`table-layout: fixed`, which antd turns on once `scroll.x` is set; leave it on
auto and one long string takes the space every other column needed.

**Numbers.** Right-align them, `tnum` on, and keep the unit out of the cell and
in the header where it repeats. Centre only short enums and counts. Left-align
text, always.

**Nothing versus zero.** `—` means the platform does not know; `0` means it
measured zero and the answer is none. They are different facts and a scout reads
them differently — never print `0` for missing data.

**States.** Every list has four: loading, empty, error, and the one with data.
Keep the previous page on screen while the next loads rather than blanking it.
An empty state says what would fill it and offers the action that does.

**Disabled says why.** A control nobody can press is a dead end unless it
carries a tooltip explaining the condition. The same goes for a section behind a
permission — hide it, or show it disabled with a reason, never show it broken.

**Motion.** Short, few, and only where something moved or appeared. Nothing
animates on first paint.

**No card inside a card.** Nesting elevation flattens the hierarchy it was meant
to express — use a separator, a heading, or space.

## Text

Every user-facing string is a Tolgee key. The `ui` primitives take
already-translated strings on purpose, so translation stays at the call site
where the context is.
