# Design system migration — what is left

Companion to [ui-guidelines.md](ui-guidelines.md). The guidelines say how a screen
should be built; this file tracks how much of the app actually is.

Counts were measured on the `dmitrydrynov/gdhub-16-add-design-system` branch and
are meant to be re-measured, not trusted forever.

## Where we are

The token layer is built and the antd theme is wired, which quietly fixes a lot —
control heights, radii, focus rings and text colours arrive for free anywhere a
component does not fight them. Six of the nine SCSS zones are now on tokens too.

| | at start | now |
|---|---|---|
| SCSS modules reading `--gd-*` | 8 of 292 | **97** |
| Hardcoded hexes in SCSS | 813 in 112 files | **8 in 1** |
| `!important` in SCSS | 397 | 365 |
| Hardcoded hexes in TSX | 262 in 48 files | **35 in 11** |
| Files using a `ui` primitive | 1 | 12 |

The eight survivors are the Steam / itch / Google Play / Epic badges. Those are
other companies' brand colours and repainting them in our palette would
misidentify the store, so they are marked in place and stay.

Stages 1–2 moved the SCSS numbers barely at all, and that was expected: they
removed the *themes* and the *overrides*, which is what made the per-file work
worth doing. Stage 4 is where the count actually falls.

Done so far: tokens / roles / themes / CSS variables / fonts, the five `ui`
primitives, direction colours, `ProtectedShell` on `productTheme`, neutral
navigation, Onest everywhere (Latin and Cyrillic, in the app and in the OG
cards), and the Storybook canvas running the real theme with a browsable token
reference.

## The rule that keeps this finite

**Do not migrate every hex — migrate the ones that carry a role.** A hex that
restates something the theme already decides (body grey, card fill, hairline
border, control height) is what makes the UI look assembled by different people;
replace it. A hex inside a decorative landing gradient decides nothing and can
stay until that surface is redesigned.

Rewriting all 292 SCSS modules is not the goal and would not improve a single
screen on its own.

## Stages

Ordered so that each one makes the next cheaper. Do not jump ahead: cleaning SCSS
under a shell that still runs a legacy theme means doing it twice.

### 1. Themes — the blocker ✅ done

Every surface now runs a token theme and `src/config/theme.ts` is gone.

- `PublicShell`, `EmptyLayout`, `HomeClient` → `publicTheme`; `AuthShell` →
  `productTheme` (sign-in is the way into the product, so it takes the product
  density).
- `LandingLayout` and `PublicPageHeader` → `<InverseBand>`. The hero uses
  `transparent`, since its background is artwork.
- `data-gd-theme` moved from the shell to `<body>`: antd portals its overlays to
  the end of the document, so a flag set deeper never reached a modal.
- Mulish and Lora went with `theme.ts` — the landing speaks in the product voice
  now. Mulish stays in `src/assets/fonts/mulish` only because the certificate PDF
  service reads those files from disk.

### 2. Strip what overrides the theme ✅ done

All five legacy button classes are gone, along with their call sites. Nearly
every one turned out to be redundant: the buttons already carried the right antd
type and the class only restated it in hexes, so removing it changed nothing but
the colour source. Two buttons in the event views had no type at all and became
`type="primary"`.

`globals.scss` now holds **zero hardcoded hexes** (was 32) and 13 `!important`
(was 31) — the survivors are layout fixes, not colour overrides.

### 3. Use the primitives that already exist — partly done

`Tag` and `Empty` are sorted; the layout primitives are not.

Done:
- Every antd `<Empty>` is now an `EmptyState` — team advisors and investors,
  the game list, and the project load error (which gets the danger tint, since
  a failure is not an empty state).
- Status-carrying `Tag`s became `StatusDot`: payment status, vacancy draft
  state, equity transaction types, AI validation verdicts.
- The other ten `Tag` call sites were judged and **kept**: genre, platform,
  workflow stage, course category, free/paid, "founder", language, and the
  count badges are labels or metrics, not states. Tags are correct there.

- `HubSectionHeader` now delegates to `SectionHeading` + `ViewAllLink` instead of
  styling a 14px title and a grey link of its own. That was a second answer to a
  question the system had already answered, and routing it through the primitives
  gave ten hub screens the heading scale and the brand link in one edit — no
  per-screen rewrite. Three callers were passing `"View all →"` with a literal
  arrow, which doubled up against the chevron; the arrows are gone.

Still to do:
- Coloured avatar and icon squares → `IconTile` (1 adopted outside stories).

### 4. SCSS, by zone ✅ done

Every zone is clear. What follows is the record of what was in them.

| Zone | Hexes | Files |
|---|---|---|
| ~~`components/admin`~~ | ~~92~~ **0** ✅ | 4 |
| ~~`app/(app)`~~ | ~~79~~ **0** ✅ | 6 |
| ~~`components/modals`~~ | ~~70~~ **0** ✅ | 10 |
| ~~`components/onboarding`~~ | ~~18~~ **0** ✅ | 1 |
| ~~`components/layouts`~~ | ~~15~~ **0** ✅ | 6 |
| `components/event` | 9 | 3 |
| ~~`app/(auth)`~~ | ~~18~~ **0** ✅ | 5 |
| ~~`app/(public)`~~ | ~~80~~ **0** ✅ | 10 |
| ~~`components/landing`~~ | ~~98~~ **0** ✅ | 10 |

Suggested order: `(app)` → `modals` → `layouts` → `admin` → `onboarding` →
`(auth)` → `(public)` → `landing`.

`admin/WorkflowEditor` was the worst file in the tree at 65 hexes, and almost all
of it was a second theme: button heights, radii, a tailwind-blue primary, input
borders, focus rings. None of it ever applied — nested `.ant-*` selectors in a
CSS module get hashed and match nothing. Nine classes are actually rendered; the
file is now those nine.

**Resolved — antd `Tabs`.** In-page tab bars now draw a graphite ink bar, same
argument as the shell nav. The bar stays (a tab strip needs an underline to read
as one) but it is not brand. `design-system.test.ts` encoded the old rule and was
updated with it.

**New role — `accentAlt`.** The landing was carrying an amber accent in 20 places
(`#FFBB55`) that the system had no name for. It is not noise: the page addresses
two audiences and separates them by colour — authors brand, specialists amber. So
it became a role rather than being flattened into the brand. It is barred from
the product, where one accent is the whole point.

Two decisions worth revisiting, both made while clearing these zones:

- **The specialist modal's violet accent** (`#7c3aed` / `#6d28d9` / `#ede9fe`)
  had no counterpart in the system. Brand took over, since the product has one
  accent. Its card *header* was already correct — it paints itself with the
  specialist's direction tint, which is exactly what "colour belongs to content"
  means.
- **The equity stacked bar** used red/amber/violet/blue for platform, mentor,
  investment and member shares — status colours on a chart that shows ownership,
  not health. It turned out those classes were dead: the real chart is drawn by
  `EquityPlot.tsx` in D3 with its own inline palette. The dead CSS is gone; the
  live palette is an open question for stage 5.

### 5. Inline hexes in TSX ✅ done

Role-bearing colours became `var(--gd-*)`. Two groups needed a different fix,
both because the value never reaches CSS:

- The five OG routes are rendered by Satori, which does not resolve custom
  properties. They now import `ogPalette` (`src/helpers/og-palette.ts`), which is
  built from the tokens — one source of truth, resolved at build time. The two
  deep reds in the share-card gradient live there too: they sit below the end of
  the brand ramp because the cards need more contrast behind white type, and they
  exist nowhere else.
- `EquityPlot` writes colours into SVG attributes via D3, where `var()` is not
  resolved either, so it imports `neutral` directly.

**What deliberately keeps its own colours** — 35 hexes in 11 files, all content
rather than chrome: avatar skin tones and placeholder fills, the Skill Capital
mark's brand gradient, the five-step skill-level scale, default cover art
gradients, and the store badges. A role would not improve any of them, and
`skillLevel.tsx` now says so in a comment so the next sweep leaves it alone.

### 6. Delete the dead

Done: Geist (nine TTFs), Montserrat, the whole of `src/config/theme.ts`
(`appThemeConfig`, `publicThemeConfig`, `landingThemeConfig`, Mulish and Lora
loaders, plus 76 lines of commented-out theme), the `--bg-direc-*` aliases, and
the Storybook `staticDirs` entry that only existed to serve Geist.

Still to check once the stages above land: `--main-font-family` is gone, but
sweep for other orphaned CSS variables the deleted loaders used to declare.

### 7. A story for anything reused

A component rendered on many screens is part of the design system whether or not
it lives in `components/ui`, and it needs a story for the same reason the
primitives do — it is the only place its states get looked at side by side.

Done: `ModernTable` (13 screens) and `HubSection` (10). Writing the first one
immediately found a bug no screen had surfaced: an empty `ModernTable` fell
through to antd's grey "No data" illustration, which the guidelines rule out.
It now renders an `EmptyState`, and callers can pass `emptyState` to say
something specific.

Next candidates by reuse: `ContentEditor` (5), `GameCard` (4),
`DevlogPostLink` (3).

### 8. Put up a fence ✅ done

`tests/design-tokens-guard.test.ts` fails on any hardcoded colour in `src/`,
outside a named allowlist. Two tests, because a fence with a gate that never
closes is not a fence:

1. **No hardcoded colours.** The failure message names the file, the colours, and
   how to fix it — `var(--gd-*)` in SCSS, a token import where CSS never runs.
2. **No stale allowlist entries.** If an allowlisted file loses its last hex, the
   test fails until the entry is removed. The list can only shrink.

Every entry carries the reason it is there — third-party brand colours, avatar
skin tones, the skill-level scale, the print certificate. Fixtures under
`src/mocks/` are out of scope: they are sample payloads, not interface.

Verified by planting a hex in `StatusDot` and watching it fail, then removing it.

## How to measure progress

```sh
# SCSS modules still holding hexes
grep -rl -E "#[0-9a-fA-F]{3,8}\b" src --include='*.scss' | wc -l
# modules already reading tokens
grep -rl "gd-" src --include='*.scss' | wc -l
```

The number that matters is the first one going down while the second goes up.
