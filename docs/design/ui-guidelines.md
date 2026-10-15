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

   Three surfaces are white by design and are not exceptions to argue with: the
   catalogue cards (rules in `DS · 08`), the settings card (rule 7) and a table
   (rule 8). Everything else groups with a hairline, not a fill.

   **The one live item in a list of history takes the fill.** A running checkpoint
   above its finished ones, a current cycle above past ones: exactly one row is
   the present, and it gets `--gd-color-surface` while everything below it stays
   outlined and transparent. This is not a fourth exception, it is what "this
   floats" is for. It only works while it is one — the moment two things in the
   list are filled, neither reads as the live one.

   The consequence to remember: a neutral fill inside a panel is read against the
   *page*, not against white. `--gd-color-surface-sunken` disappears there — go a
   step further to `--gd-neutral-100`.

   **Making something compact removes chrome, never structure.** A panel, a
   heading, padding, a border: all fair game. The axis of a diagram is not — a
   pulse grid without its week columns, a chart without its scale, a table
   without its head are all smaller and none of them can be read. If compacting
   costs a reader the ability to tell one cell from another, it went too far.

2. **Tinted icon tile.** A list row, a quick action or an empty state gets an
   `<IconTile>` — 32/40/56px, radius 14/16/20 (it reads the scale, so it follows it). Direction rows inherit the craft
   colour; everything else falls back to neutral.

3. **Status is a dot and a word.** Use `<StatusDot>`. Statuses repeat down a
   list, and filled `<Tag>`s turn a table into confetti. Tags stay for things
   that are genuinely labels — skills, categories.

   **A chip is an antd `<Tag>` and it has exactly one look**, already set by the
   theme: `--gd-color-surface-sunken` fill, radius `chip` (6), **no border**,
   label type at `--gd-color-text`. Nothing else: no pills, no per-chip radius,
   no outlined variant, no tinted background to signal a state. Chips drifted
   across the canvas — radius 7, 8, 10, 13, 16 and 999, four different fills —
   because the rule was never written down; anything that does not match the
   theme's Tag is a bug, not a variant.

   The one exception is where the chip stands: the theme's fill is the page
   background's own colour, so a chip placed straight on the page (a page
   header, not a card) takes one step darker, `--gd-neutral-100`. Same look,
   still neutral — it only stops the chip from disappearing.

   **Which of the two you need is a question about the word, not the styling.**
   "Video", "Expert", "Programming", "Week 2" name what a thing *is* and stay
   chips. "Awaiting verdict", "Draft", "Quiet", "Cut on day 14", "Held" say what
   *state* it is in and are a dot and a word — including inside a card, a modal
   or a thread entry, not only in tables. A tinted chip carrying a state is the
   one combination to never ship: it shouts a status that repeats, which is
   precisely what the dot exists to stop.

4. **Empty states are screens.** Use `<EmptyState>`: a tile, an affirmative
   title, one sentence saying what will appear here. Not antd's default grey
   illustration.

5. **Headings are large.** `<SectionHeading>` at 24/20px semibold against 14px
   body — or rank 4 (16px) inside a card, where a 20px title crowds the rows.
   Few sizes, big contrast. Pick the rank by document structure.

6. **One "more behind this" affordance.** `<ViewAllLink>` in a card header —
   not a ghost button, not a bare arrow.

7. **A settings section is one card.** Section menu 220 wide on the left, one
   white card on the right, 24 between them. The card sits on the page ground by
   its fill alone — **no outer border**; the only hairline it owns is under its
   head, which carries the section name (16/600) and the single control that
   owns the section. The form lives in the body at 24 padding.
   **Save sits under the card, not inside it**: it commits the section.
   A field is a 14 *regular* label (with a grey suffix for a counter or
   `(optional)`), a filled 40-high input at the control radius, and help text under it at
   14 secondary. A list the user grows — questions, links, criteria — is rows of
   input plus a red trash icon, ending in an empty input that adds on Enter.
   The reference frame is `DS · 10 Forms & settings`.

8. **A table is a white card with hairlines.** `--gd-color-surface`, the card radius,
   clipped, and no outer border. The head is a 44 band on
   `--gd-color-surface-sunken` with uppercase 11/600 labels; rows are 56 and
   separated by `--gd-color-border-subtle` — the lightest hairline in the system,
   there because `--gd-color-border` repeated down a list reads as a grid. The
   last row carries none. A long list ends with a full-width text `Load more`,
   or antd pagination when there is a real page count — never both.

   **A table is either a card or nothing at all.** Inside a panel it drops the
   fill and the radius and keeps only its hairlines: a white card on a white
   panel is a box in a box, and the head's band needs a surface to sit on.

   **Paging sits outside the table**, under it on the page's own ground, aligned
   right. It is a control over the list rather than a row of it, and a pager
   boxed inside the card reads as more data. Both surfaces are drawn in
   `DS · 11 Tables`, which is the reference frame.

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

- **Radii** — 8 / 14 / 16 / 20. The product is full of rounded squares sitting
  inside one another, and a 4-step radius ladder reads as a different family.
  The ladder was 6/10/12/16 until the corners became superellipses: both that
  shape and the jitter below are proportional to the radius, and at 10 they came
  to about a pixel each — present in the numbers, invisible on the screen.
  Every corner is a superellipse rather than a quarter circle:
  [src/styles/shape.scss](../../src/styles/shape.scss) sets `corner-shape:
  squircle` on every box, and buttons and controls get a 1px per-corner jitter
  on top of their token radius so a row of them reads as drawn, not stamped.
  **A circle or a pill has to write `corner-shape: round;` under its radius** —
  a superellipse squares off a 50% corner, which turns an avatar into an app
  icon and a status dot into a square. The guard test fails on a missing one.
  A whole subtree opts out with `--gd-corner-shape: round`.
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

**A screen explains itself through its headings and labels, not through
paragraphs.** Explanatory prose is the first thing that stops being read and the
last thing anyone updates, and it is usually there because a label was named
badly. Fix the label.

The order to reach for, and only in this order:

1. **Name it properly.** If a heading, a column or a button needs a sentence
   under it, the wrong word is on it.
2. **An info icon.** Anything a user might want explained goes behind
   `IconInfoCircle` with a tooltip — available, not in the way.
3. **One line.** Something genuinely important, and unsayable in a label, gets a
   single line in place. Not a paragraph, and never a block of grey text at the
   top of a page.

A rule with real consequences: a screen that needs a paragraph to be understood
is a screen that has not been designed yet.

**A legend is not prose.** Axis labels, column heads, week markers and keys are
labels — they are how a diagram names its own parts, and stripping them is not
tidying, it is removing the thing that made the picture readable. This rule is
about paragraphs of explanation, and it stops there.

**A disabled control says why on hover, and carries a lock.** Never put the reason
in a neighbouring element: text sitting beside a button, in the same box, reads as
a second control and gets pressed. The button keeps the label it always has, takes
`IconLock`, and the reason lives in its tooltip.
