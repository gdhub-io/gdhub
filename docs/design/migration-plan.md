# Design system migration — what is left

Companion to [ui-guidelines.md](ui-guidelines.md). The guidelines say how a screen
should be built; this file tracks how much of the app actually is.

Counts were measured on the `dmitrydrynov/gdhub-16-add-design-system` branch and
are meant to be re-measured, not trusted forever.

## Where we are

The token layer is built and the antd theme is wired, which quietly fixes a lot —
control heights, radii, focus rings and text colours arrive for free anywhere a
component does not fight them. The SCSS layer is almost untouched.

| | |
|---|---|
| SCSS modules reading `--gd-*` | **8 of 292** (5 of those are the `ui` primitives themselves) |
| Hardcoded hexes in SCSS | **813** across **112 files** |
| `!important` in SCSS | **397** across the tree |
| Hardcoded hexes in TSX | **262** across **48 files** |
| `ui` primitives used outside their own stories | **1** (`EmptyState` in `ChatModal`) |

Done so far: tokens / roles / themes / CSS variables / fonts, the five `ui`
primitives, direction colours, `ProtectedShell` on `productTheme`, neutral
navigation, Plus Jakarta Sans everywhere, and the Storybook canvas running the
real theme with a browsable token reference.

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

### 2. Strip what overrides the theme

These do not merely differ from the design system — they defeat it.

- Legacy button classes `black-btn`, `gray-btn`, `tertiary-blue-btn`,
  `light-gray-text-btn`: defined in `globals.scss`, applied across **9 files**
  (VacancyCard, ExpertList, CoursesList, MyTeam, BlogClient, CourseClient, two
  event views, dev/ui-test). Remove one class at a time, checking its call sites.
- The 31 `!important` rules in `globals.scss`.

### 3. Use the primitives that already exist

They were built and then not adopted. Each one replaces a pattern that currently
gets reinvented per screen.

- `Tag` appears in **14 files**. Where it carries a *status*, it should be a
  `StatusDot`; where it is genuinely a label (skills, categories) it stays a tag.
  Judge per call site.
- antd `Empty` in **2 files** → `EmptyState`.
- Section titles and "view all" affordances → `SectionHeading` / `ViewAllLink`.
- Coloured avatar and icon squares → `IconTile`.

### 4. SCSS, by zone

Hex debt, largest first. Product surfaces come before marketing ones because they
are seen daily and are already on the token theme.

| Zone | Hexes | Files |
|---|---|---|
| `components/admin` | 92 | 4 |
| `app/(app)` | 79 | 6 |
| `components/modals` | 70 | 10 |
| `components/onboarding` | 18 | 1 |
| `components/layouts` | 15 | 6 |
| `components/event` | 9 | 3 |
| `app/(auth)` | 18 | 5 |
| `app/(public)` | 80 | 10 |
| `components/landing` | 98 | 10 |

Suggested order: `(app)` → `modals` → `layouts` → `admin` → `onboarding` →
`(auth)` → `(public)` → `landing`.

Worst single files: `admin/WorkflowEditor` (65), `modals/SpecialistPreviewModal`
(45), `hub/members` (34).

### 5. Inline hexes in TSX

48 files, 262 occurrences. Two different problems:

- Ordinary components (`ProfileClient`, `ChatMessages`, `SkillCapitalIcon`, …) —
  replace with `var(--gd-*)` or a `@/config/design` import.
- The five OG image routes (`api/og*`) hold **113 of the 262**. Satori does not
  resolve CSS variables, so these must import values from `tokens.ts` directly.
  Different fix, same goal — one source of truth.

### 6. Delete the dead

Done: Geist (nine TTFs), Montserrat, the whole of `src/config/theme.ts`
(`appThemeConfig`, `publicThemeConfig`, `landingThemeConfig`, Mulish and Lora
loaders, plus 76 lines of commented-out theme), the `--bg-direc-*` aliases, and
the Storybook `staticDirs` entry that only existed to serve Geist.

Still to check once the stages above land: `--main-font-family` is gone, but
sweep for other orphaned CSS variables the deleted loaders used to declare.

### 7. Put up a fence

Without one, the debt refills faster than it drains. Add a check that fails on a
new hardcoded hex in an SCSS module outside `src/config/design` — a Biome rule if
one fits, otherwise a Vitest test that greps the tree. Existing violations get an
allowlist that only ever shrinks.

## How to measure progress

```sh
# SCSS modules still holding hexes
grep -rl -E "#[0-9a-fA-F]{3,8}\b" src --include='*.scss' | wc -l
# modules already reading tokens
grep -rl "gd-" src --include='*.scss' | wc -l
```

The number that matters is the first one going down while the second goes up.
