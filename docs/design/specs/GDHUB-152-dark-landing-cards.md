# GDHUB-152 — Dark landing cards (open positions, store projects)

## 1. Problem & user

Visitors to the dark main landing (gdhub.io, `inverseTheme`, `[data-gd-landing]`) read
two card strips built for the light product and rendered unchanged on the inverse band:

- **"Who teams are looking for right now"** — `VacancyCard`. Its top panel keeps the
  light direction tint (`bg-direc-<slug>`, L≈93), while the inverse antd theme turns the
  title and project name white. White on the tint is ≈1.2–1.3:1.
- **"Games already on Steam"** — `ProjectStoreCard`. The stage chip and store badges are
  `rgba(255,255,255,0.8)` plates with `color: var(--gd-color-text)`, which in inverse mode
  is **white**: white on a white plate, unreadable on every cover, and on a light cover the
  plate itself disappears.

"Top experts" (`LandingExpertCard`) is fine and is not touched.

The fix keeps both components' structure, parts and content. Only colours change, and
only on the landing.

## 2. Frames

| Frame | Node id | What |
|---|---|---|
| 01.01.4 · GDHUB-152 · Landing cards — live vs dark | `zmXDm` | Review frame: rows "live today" and "restyled", 3 directions, light and dark cover |
| └ VacancyCard · live (code today) — component | `TpClu` | The card as the code renders it on the landing today |
| └ VacancyCard · dark landing — component | `SkmY5` | Restyled card |
| └ ProjectStoreCard · live (code today) — component | `W5YQCT` | As rendered today |
| └ ProjectStoreCard · dark landing — component | `lxkad` | Restyled card |
| 01.01 · Landing — v2 · Desktop | `TQutR` | Bands now use the restyled cards: |
| └ Strip — Open positions right now | `hd4Xx` | development, 2D art |
| └ Strip — Games already on Steam | `vcYpO` | 4 cards, light / dark / light / dark covers |
| 01.01.1 · Landing — v2 · Mobile | `o8680` | Same, swipe carousels: |
| └ Strip — Open positions right now | `nEYKq` | development, 2D art, music & sound, game design |
| └ Strip — Games already on Steam | `J2XKih` | Covers 180 high (code's ≤576px height) |

The live cards were reproduced from the SCSS modules, `antd.ts` (inverse + marketing
density) and `globals.scss`, not from the older v2 frames. Their old instances in the four
bands were replaced. Covers are gradient stand-ins for artwork: light (#FBF7EE → #E4D3B2)
and dark (#2B2E4A → #101119).

PNG exports for review: `docs/design/specs/GDHUB-152/` (`zmXDm.png` is the comparison;
`hd4Xx.png`, `vcYpO.png`, `nEYKq.png`, `J2XKih.png` are the bands).

## 3. Layout

No layout change. Same grid, card sizes, paddings, radii, type and the same parts in the
same order. The changes are colour only.

## 4. Components and what changes

### 4.1 `VacancyCard` (`src/components/VacancyCard/`)

**Direction choice:** the direction lives in the **icon tile**. The tile takes the
direction tint (`--gd-direction-<slug>-tint`) and keeps the direction ink icon, which is
the light product's `IconTile` look. The large panel goes neutral dark. No new direction
tokens are needed, and colour and icon both still encode the direction (ui-guidelines
"craft colour is the palette").

Add a prop `surface?: "default" | "inverse"` (default `"default"`). Only
`LandingTalentsSection` (`src/components/landing/LandingAudienceSections/index.tsx:160`)
passes `"inverse"`. A prop rather than a `[data-gd-landing]` selector, so ProjectVacancies,
ProjectPositions and VacanciesList (light product) cannot pick it up.

With `surface="inverse"`:

| Element (code) | Today on the landing | Inverse | Contrast after |
|---|---|---|---|
| `.jobCard` border | `1px solid var(--gd-color-border-strong)` (#FFFFFF29) | `var(--gd-color-border)` (#FFFFFF14), like the store card and other landing panels | — |
| `.jobCard` background | `var(--gd-color-surface)` (#1A1917) | unchanged | — |
| `.jobCardContent` background | `bg-direc-<slug>` → `--gd-direction-<slug>-tint` | **drop the class**; `var(--gd-color-surface-sunken)` (inverse = neutral-800 #272624) | — |
| `.dirChip` background | `rgba(255,255,255,0.8)` | `var(--gd-direction-<slug>-tint)` (inline style or a `bg-direc-<slug>` class on the chip) | tile vs panel ≈12:1 |
| `.dirChip` icon | `color={ink}` | unchanged (`getWorkDirection(name).ink`) | ink on tint ≈9.1:1 (development) |
| `.jobCardDate` text | `var(--gd-neutral-600)` (#5A5955), **≈2.5:1** | `var(--gd-color-text-secondary)` (#9C9B97) | ≈6.3:1 on #1A1917 |
| `.jobCardDate` background | `var(--gd-color-surface)` | unchanged | — |
| Project name `<Text>` | antd default colour = white, **≈1.2:1 on the tint** | `type="secondary"` → `--gd-color-text-secondary` | ≈5.4:1 on #272624 |
| Title `<Title level={2}>` | white on the tint, **≈1.2–1.3:1** | unchanged colour (white) | ≈15:1 on #272624 |
| Compensation, "terms of cooperation" | white / secondary on #1A1917 | unchanged | 17:1 / 6.3:1 |
| Details `<Button type="primary">` | landing CTA: `--gd-brand-500`, white label | unchanged (see open question 2) | 3.4:1 |

### 4.2 `ProjectStoreCard` + `StageChip` (`src/components/project/cards/`)

The new chip reads on light and on dark artwork, so it can replace the white plate
everywhere (hub catalogue and `/projects` too). The text colour must stop following the
mode, because the plate is dark in both modes.

| Element (code) | Today | New | Contrast after |
|---|---|---|---|
| `.stageChip` background (`parts.module.scss`) | `rgba(255,255,255,0.8)` | `var(--gd-scrim-chip)` (**new token**, neutral-950 @ 70%) | — |
| `.stageChip` colour | `var(--gd-color-text)` (white in inverse → **≈1.1:1**) | `var(--gd-neutral-0)` | ≥7.2:1 on any cover |
| `.storeBadge` background (`ProjectStoreCard.module.scss`) | `rgba(255,255,255,0.8)` | `var(--gd-scrim-chip)` | — |
| `.storeBadge` colour, `:hover` colour | `var(--gd-color-text)` | `var(--gd-neutral-0)` | ≥7.2:1 |
| `.storeBadge:hover` background | `rgba(255,255,255,0.95)` | `var(--gd-scrim-chip-hover)` (**new**, neutral-950 @ 85%) | — |
| `backdrop-filter: blur(4px)` | on both | unchanged | — |
| Dots (`.stageDot`, `.platformDot.dot*`) | as is | unchanged | — |
| Card, body, foot, Details, ApplauseButton | inverse tokens already | unchanged | — |

Why 70%: the label's contrast depends on what is under the plate. The worst case is a
pure-white cover, where 70% ink composites to ≈#575756 and white on it is **≈7.2:1**. On
the light test cover it is ≈7.2:1 and on the dark one ≈17:1. A dark plate keeps its edge
on light art, and on dark art the blur and the white label carry it.

### 4.3 New tokens (the only ones)

`src/config/design/tokens.ts`:
`export const scrim = { chip: "rgba(15, 15, 14, 0.7)", chipHover: "rgba(15, 15, 14, 0.85)" } as const;`
`src/config/design/css.ts`: emit `--gd-scrim-chip` and `--gd-scrim-chip-hover`. They are
mode-independent because they sit on artwork, not on a surface. The `.pen` file holds
`scrim-chip` as a variable. Add both rows to `DS · Tokens — as shipped` (`pl8Mo`) when
they ship.

## 5. Tokens used (summary)

`--gd-color-surface`, `--gd-color-surface-sunken`, `--gd-color-border`,
`--gd-color-text`, `--gd-color-text-secondary`, `--gd-direction-<slug>-tint`,
`--gd-direction-<slug>-ink` (via `getWorkDirection`), `--gd-neutral-0`,
`--gd-scrim-chip` (new), `--gd-scrim-chip-hover` (new), `--gd-brand-500` (landing CTA,
unchanged). Radii unchanged: card 16, control 14, chip 8, pill.

## 6. States

The strips' own states are unchanged:

- No vacancies → `LandingTalentCard` fallback.
- No store projects → strip hidden.

States the inverse cards must render (all drawn in `zmXDm`):

- **Vacancy card:**
  - compensation: paid (`€1,500 / month`), equity (`Equity offered: 5.0%`) and `For experience` (regular weight);
  - with and without `finishedAt` (date chip hidden);
  - with and without `projectName`.
- **Store card:**
  - with and without `stage` (an empty `<span />` keeps the layout);
  - one or two store badges;
  - light and dark artwork;
  - `DefaultCover` when there is no image.

## 7. Copy

No new strings. `VacancyCard` still hardcodes `Equity offered:`, `terms of cooperation`,
`For experience` and the rate suffixes. Suggested Tolgee keys when touched:

- `vacancyCard.equityOffered`
- `vacancyCard.termsOfCooperation`
- `vacancyCard.forExperience`
- `vacancyCard.rate.hourly`, `vacancyCard.rate.oneTime`, `vacancyCard.rate.monthly`

## 8. Data needs

None.

## 9. What must not change

- `VacancyCard` in the light product (`surface="default"`): tinted panel, white 80% icon
  chip, antd text colours, graphite primary button.
- `directionColors`, `--gd-direction-*`, `bg-direc-*`: no dark direction set is added.
- Card geometry, the strips' grid and carousels, the "Top experts" cards.
- Store platform dot colours, the stage dot, `backdrop-filter`.

## 10. Open questions

1. **Direction on the dark card** is carried by the 32px tile only. If that is too quiet,
   the alternative is a dark shade of each direction for the whole panel. That means 18
   new tokens, which this spec avoids.
2. **Details button contrast.** The landing CTA (`[data-gd-landing] .ant-btn-primary`,
   `--gd-brand-500` with white) is ≈3.4:1, below 4.5:1 for its 13–16px label. This is a
   landing-wide rule, not this card's. It was kept as is and needs its own decision
   (brand-700 gives 6.2:1).
3. Should the dark chip ship to the light catalogues too (§4.2)? Recommended yes; it
   needs no prop.
4. The `ApplauseButton` in the frames is drawn approximately (outlined pill, icon and
   count). It is not part of this change.
