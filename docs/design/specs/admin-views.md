# Admin — Views (`/admin/views`)

Design spec. Frames live in [`docs/design/platform-design.pen`](../platform-design.pen)
(row **Admin — Views**, note `b81jlg`, at the bottom of the admin band).

Revision history — 2: KPI sparklines removed, Top 10 titles made links, seventh subject
type (`ProjectPage`) added. 3: series colours demoted to marks (labels are ink), focus ring
corrected to graphite, hover underline drawn. 4: the token values live only in this
document — the swatch frame and the "(proposal)" section on the Design System page are
gone.

---

## 1. Problem & user

A GDHub admin wants to know what people actually open. The platform now counts its own
page views into `ContentView`, but nothing surfaces them: today the only way to answer
"is anyone reading the devlogs?" is a SQL console. This screen is the read-only answer —
seven subject types, one period, three questions: how much in total, how it moved day by
day, and which individual items carried it. It is a diagnostic surface for an operator,
not a growth dashboard for a marketer: no goals, no forecasts, no exports.

**Seven subject types are recorded and shown**: Devlogs, Blog posts, Courses, Events,
Experts, Vacancies, and Projects. Scout pages have no public page yet, so they are left
out entirely rather than shown as a permanent zero.

**The seven are disjoint, and the totals are additive.** `ProjectPage` is counted from
`ProjectPageClient` on `/project/[projectSlug]` and covers that page and nothing beneath
it; a devlog lives on its own route, `/devlog/[projectReportId]`, and is counted as
`ProjectReport`. Opening a devlog from inside a project therefore increments exactly one
counter. Nothing on this screen double-counts, which is what lets the seven lines be read
against one shared scale — and would let them be stacked, if a later revision wanted that.

---

## 2. Frames

| Frame | Node id | What it shows |
|---|---|---|
| `Admin — Views (/admin/views)` | **a0FJGy** | The loaded screen: header + range control, seven KPI cards, the day chart with crosshair and all-series tooltip, Top 10. |
| `Admin — Views · Loading` | **pogR3** | Full skeleton. Chrome that is known ahead of the response (segmented control, table head, axes, gridlines) is real, not skeletonised. |
| `Admin — Views · Empty` | **A3x1l** | Query succeeded, period has no rows: KPI totals read `0`, deltas read `—`, chart and Top 10 collapse into one `EmptyState`. |
| `Admin — Views · Error` | **F7Wvf** | Request failed: header stays usable, everything below becomes one error panel with a retry and a reference code. |
| `Views — Chart · legend isolation (Courses)` | **RyC9g** | The chart after a legend chip was clicked. The six other series drop to 14% and keep their own hue. |
| `Views — Top 10 title · link states` | **xfY2r** | The title link at rest / hover / focus-visible, plus the route each type points at. |
| `Views — Range picker · 90-day bound` | **cdYJm** | The open `RangePicker` panel with presets, dates before 22 May 2026 disabled, and the reason in the footer. |

The series palette is **not** drawn on the canvas. Its token names, hex values and measured
contrast live in §5 of this document, where they can be grepped, diffed in review and
checked against `tokens.ts`; a picture of seven squares gives none of that and goes stale
the first time a value moves. It joins the Design System page once it exists in
`tokens.ts` and `css.ts` — that page is the reference for what is *shipped*, and a
"(proposal)" section on it is exactly what makes a reference untrustworthy.

### Inner ids worth linking to (inside `a0FJGy`)

| Block | Node id |
|---|---|
| AdminSpace header (copy of the audit-log shell), with the new `Views` menu item | `spqvJ` / item `DsVGK` |
| `Content` column | `t67tny` |
| Page header | `qn5EK`; title block `vaxom`; range control `hj0hY`; presets `OHncC`; picker `t8NGb`; retention hint `orCVX` |
| KPI row (seven cards, one row) | **U97GF** — `HktVt` Devlogs, `FPUPy` Blog posts, `QLWZJ` Courses, `EiqdV` Events, `vlkTC` Experts, `geqdU` Vacancies, `T9vMd` Projects |
| Chart panel | **KbBWR** — legend `yH6E6`, body `R58lwM`, y-axis `l3ASOe`, plot `x0o57e`, crosshair `j6DEpV`, tooltip `gWuqG`, end labels `U00aC4`, x-axis `Y3w7t` |
| Top 10 panel | `vjO7d` — segmented `sOUvl` (7th segment `MGTLa`), table `Q88sq3`, footnote `ThdHV` |
| Empty state panel | `uisIS` (in `A3x1l`) |
| Error state panel | `bmpvQ` (in `F7Wvf`) |
| Range picker popover | `wPxaM` (in `cdYJm`) |

---

## 3. Layout

Shell is `AdminSpace` — same header and admin menu as `/admin/audit-logs`, with a new
`Views` entry. Content column is the standard admin gutter: `1440` frame, `90px` side
gutter, `1260` content width, blocks stacked vertically with `--gd-space-6` (24) between
them.

Top to bottom:

1. **Page header** — one row, `space-between`, `align: center`.
   Left: `<Title level={2}>Views</Title>` plus a 13px secondary line. Right: a vertical
   stack, right-aligned — a row with the preset `Segmented` (7 / 30 / 90 days) and the
   `RangePicker`, and under it a 12px tertiary hint with an info icon.

2. **KPI row — seven cards in a single row.** Card width is `fill_container`, gap
   `--gd-space-3` (12), so each card is ~170px at the 1260 content width.

   *Why one row and not 4 + 3.* Dropping the sparkline halved the card: what is left is a
   32px tile, a type name, one number and one delta. Four-plus-three leaves a visible hole
   in the second row, and a stretched last card makes one type look more important than the
   other six — the exact thing the "colour follows the type, not the rank" rule exists to
   prevent. Seven equal cards read as one instrument with seven identical channels, which
   is what they are. The card is a vertical stack of two blocks: `head` (tile + name) and
   `figures` (24px total, 12px delta underneath). The delta moved onto its own line because
   at 170px it no longer fits beside the number, and that is also what fills the space the
   sparkline left.

   Breakpoints: 7 across ≥1440 · 4 across 1200–1439 (three on the second row, left-aligned,
   fixed card width so no card stretches) · 2 across 768–1199 · 1 below 768.

3. **Chart panel** — one outlined panel, padding 24. Header (heading + one-line
   explanation) → legend row (seven chips) → chart body → x-axis row. The chart body is
   three columns with an 8px gap: y-axis labels `40`, plot `1036 × 280`, direct end labels
   `120`. Under 1200px the end-label column drops and the plot takes its width; the tooltip
   and the legend then carry identity alone (see §6).

4. **Top 10 panel** — one outlined panel, padding 24. Header row carries the heading on
   the left and the seven-way `Segmented` on the right.

   *Does the segmented fit?* Measured in the frame: heading block 380px, segmented 543px
   inside a 1212px header — 289px of slack, so seven segments fit on one line at desktop
   width with no wrap, no scroll and no dropdown. Below ~1100px the segmented moves to its
   own full-width row under the heading and scrolls horizontally
   (antd `Segmented` handles this); it does **not** become a `Select`, because a
   seven-item picker that hides six of its options turns a one-click comparison into a
   three-click one.

   Table columns: rank `56`, content `fill`, views `140` right-aligned.

No panel contains another panel. Separation inside a panel is a hairline row border or
space, never a nested card.

---

## 4. Components

**Reuse as-is**

- `IconTile` from `src/components/ui` — the 32px neutral tile in each KPI card, and the
  56px tile in the empty/error panels. Neutral variant only; this screen has no work
  directions in it.
- `SectionHeading` rank 4 from `src/components/ui` — "Views by day", "Top 10 by views".
- `EmptyState` from `src/components/ui` — the empty panel, with the "Switch to 90 days"
  action passed as its action slot.
- `ModernTable` from `src/components/ModernTable` — the Top 10 table. Pass
  `density="compact"`, `pagination={false}`, `scroll={{ x: … }}` so the fixed column
  widths bind, and `emptyState` for the per-type empty case.
- antd `DatePicker.RangePicker` (`variant="filled"`) with `presets` and `disabledDate`.
- antd `Segmented` — both the range presets and the seven-way type selector.
- antd `Tooltip` — truncated Top 10 titles, the disabled-preset explanation.
- `next/link` — the Top 10 title anchor.
- antd `Skeleton` (or the existing skeleton style used in `Talent Pool — Skeleton`).

**New components** (all under `src/components/admin/Views/`)

| Path | What it is |
|---|---|
| `src/components/admin/Views/ViewsKpiCard.tsx` | Outlined KPI card: icon tile, type label, period total, delta. Props: `type`, `total`, `deltaPct \| null`. **No sparkline** — see §3. |
| `src/components/admin/Views/ViewsDailyChart.tsx` | The multi-line chart: gridlines, seven lines, crosshair, all-series tooltip, direct end labels, legend with isolation. |
| `src/components/admin/Views/ViewsTopTable.tsx` | Segmented + `ModernTable`, keeping a fixed ten-row height across type switches, and rendering each title as a link. |
| `src/components/admin/Views/ViewsRangePicker.tsx` | Preset `Segmented` + `RangePicker` + the retention hint, with the 90-day `disabledDate` in one place. |
| `src/components/admin/Views/viewSubjects.ts` | The single source for the seven types: `ContentView` subject, label key, icon, series token, and the `href(row)` builder. Everything else on the screen maps over this array. |

*Deleted from revision 1:* `ViewsSparkline.tsx` is no longer needed.

**Charting:** build the chart with `d3` and hand-written SVG, the way
[`src/components/MyTeam/EquityPlot.tsx`](../../../src/components/MyTeam/EquityPlot.tsx)
already does. `d3` is already a dependency; do not add a chart library for this screen.

**Icons** — `@tabler/icons-react` only, one per subject type:
`IconNotebook` (Devlogs), `IconArticle` (Blog posts), `IconSchool` (Courses),
`IconCalendarEvent` (Events), `IconUserStar` (Experts), `IconBriefcase` (Vacancies),
`IconRocket` (Projects). Plus `IconArrowUpRight` (link hover), `IconChartLine` (empty),
`IconAlertTriangle` (error), `IconRefresh` (retry), `IconInfoCircle` (hints). The Pencil
frames use the nearest Lucide names because that is the only icon set the canvas ships —
the tabler names above are binding, the drawn ones are not.

### Top 10 title link — states (frame `xfY2r`)

| State | Appearance |
|---|---|
| rest | `--gd-color-text`, 14px/500, no underline. **Not** the accent. |
| hover | `--gd-color-link` **and an underline** — both, never colour alone — with a 13px `IconArrowUpRight` after the label. The row also takes a neutral `--gd-fill-subtle` tint. |
| focus-visible | ink label, graphite ring in `--gd-color-border-focus` at `focusRingWidth` (3px), radius `--gd-radius-chip` (6). Not the brand — `borderFocus` is `neutral-900` in `light` mode; `brand-500` is the **inverse**-mode value and this page runs on `productTheme`. |
| visited | no special treatment — an admin re-reads the same rows every day. |

The title is the anchor, not the row: ten links per screen times seven types would make the
table an orange palisade and drain the accent of the meaning it carries elsewhere
(selected row, focus ring, progress). The underline is not decoration — a hover expressed
only as a hue change is invisible to a colour-blind reader, and the same rule that governs
the chart governs this. Truncation is unchanged — one line, ellipsis, full value in an
antd `Tooltip`, `min-width: 0` on the flex parent.

Routes:

| Type | `ContentView` subject | `href` |
|---|---|---|
| Devlogs | `ProjectReport` | `/devlog/:projectReportId` |
| Blog posts | `Post` | `/blog/:slug` |
| Courses | `Course` | `/course/:slug` |
| Events | `Event` | `/event/:slug` |
| Experts | `Expert` | `/expert/:specialityId` |
| Vacancies | `Vacancy` | `/job/:vacancyId` |
| Projects | `ProjectPage` | `/project/:projectSlug` |

---

## 5. Tokens

**New — the palette does not exist yet.** GDHub has neutrals, one brand accent, four
reserved semantics and eighteen direction tints, and none of them can carry seven crossing
lines: the direction tints all sit at L≈93 precisely so eighteen chips can coexist.

Add a `chartSeries` record to
[`src/config/design/tokens.ts`](../../../src/config/design/tokens.ts) and one emission
loop in [`css.ts`](../../../src/config/design/css.ts) next to the `directionColors` loop.
**This table is the source of truth** until that lands — the values are deliberately not
drawn anywhere. **Slot order is binding**; it is the order the seven were validated in:

| Slot | Type | TS | CSS custom property | Value |
|---|---|---|---|---|
| 1 | Devlogs | `chartSeries.devlogs` | `--gd-chart-series-devlogs` | `#2F6BD8` |
| 2 | Blog posts | `chartSeries.blog` | `--gd-chart-series-blog` | `#E4572E` |
| 3 | Courses | `chartSeries.courses` | `--gd-chart-series-courses` | `#7B4FD1` |
| 4 | Events | `chartSeries.events` | `--gd-chart-series-events` | `#1F8A5B` |
| 5 | Experts | `chartSeries.experts` | `--gd-chart-series-experts` | `#A05C00` |
| 6 | Vacancies | `chartSeries.vacancies` | `--gd-chart-series-vacancies` | `#0E8FB0` |
| 7 | Projects | `chartSeries.project` | `--gd-chart-series-project` | `#C2255C` |

When these ship, add the row to the Design System page as well — that page documents what
is in the code, so it should gain the palette at the same commit, not before.

### These are mark colours, not text colours

The palette was validated at the **3:1 non-text mark** threshold, which a 2px line clears.
It is not a text palette — measured against the page surface `#F5F4F2`:

| Series | Contrast on `#F5F4F2` | Mark 3:1 | Small text 4.5:1 |
|---|---|---|---|
| Devlogs `#2F6BD8` | 4.53:1 | PASS | PASS |
| Blog posts `#E4572E` | 3.35:1 | PASS | **FAIL** |
| Courses `#7B4FD1` | 4.92:1 | PASS | PASS |
| Events `#1F8A5B` | 3.94:1 | PASS | **FAIL** |
| Experts `#A05C00` | 4.75:1 | PASS | PASS |
| Vacancies `#0E8FB0` | 3.43:1 | PASS | **FAIL** |
| Projects `#C2255C` | 5.15:1 | PASS | PASS |

So the rule is absolute: **text wears text tokens, never the series colour; a coloured mark
beside it carries the identity.** That applies uniformly to the legend chips, the tooltip
rows and the **direct end-of-line labels** — each is an 8×8 rounded square in the series
colour followed by the type name in `--gd-color-text` and the value in
`--gd-color-text-secondary`. The hue lives on the 2px line, on the hover dot and on that
square, and nowhere else. Three of the seven would fail as captions, and picking
per-series whether a label may be coloured would make the chart's typography a lottery.

CVD separation is a **WARN at exactly the 8.0 target** — worst adjacent pair under
deuteranopia is `#A05C00` (Experts) ↔ `#1F8A5B` (Events). The margin is spent; an eighth
series must be re-validated at eight, not picked by eye.

Components read `getChartSeries(type)` (mirroring `getWorkDirection(name)`) or
`var(--gd-chart-series-*)`. **Colour follows the type, never its rank** — sorting,
filtering or isolating must never repaint a survivor.

**Existing tokens used**

| Role | Token |
|---|---|
| Page fill | `--gd-color-bg` |
| Panel | transparent + `1px --gd-color-border-strong`, radius `--gd-radius-card` (12) |
| Floating (tooltip, picker popover, selected segment) | `--gd-color-surface` + `--gd-elevation-e3` (tooltip/popover), `--gd-elevation-e1` (segment) |
| Skeleton bars, neutral icon tile | `--gd-neutral-100` (`--gd-color-surface-sunken` disappears against the page) |
| Row hover tint | `--gd-fill-subtle` |
| Gridlines | `--gd-color-border`; the zero baseline `--gd-color-border-strong` |
| Crosshair | `--gd-neutral-400` |
| All chart text — legend, tooltip, end labels, axes | `--gd-color-text` / `--gd-color-text-secondary` / `--gd-color-text-tertiary`, never a series colour |
| Link (Top 10 title hover, "Show all") | `--gd-color-link` |
| Focus ring | `--gd-color-border-focus` at `focusRingWidth` (3) |
| Committing button ("Try again", "Switch to 90 days") | `colorPrimary` (graphite) |
| Selected preset row in the picker, focused input underline | `--gd-color-accent-subtle` fill + a 2px `--gd-color-accent` mark |
| Error tile | `--gd-danger-tint` / `--gd-danger-solid` |
| Spacing | `--gd-space-2` 8 · `--gd-space-3` 12 (KPI row gap) · `--gd-space-4` 16 · `--gd-space-6` 24 · `--gd-space-16` 64 (state panel padding) |
| Radii | chip `6` (segment inner, calendar cell, focus ring) · control `10` (icon tile, buttons, inputs) · card `12` (panels, tooltip, segmented shell) · panel `16` (56px icon tile) · pill `999` (legend chips) |
| Control heights | 40 (picker, segmented shell, buttons) · 32 (segment, calendar cell, icon tile) |
| Type | 20/600 page title · 16/600 section heading · 24/600 KPI total · 14 body · 13 dense · 12 caption · 11 axis + table head |

**Numbers** carry `font-feature-settings: "tnum"` — KPI totals, deltas, ranks, the views
column, tooltip values, axis labels. Every numeric cell is right-aligned; the unit
("VIEWS") sits in the column header, never in the cell.

---

## 6. States

**Loading** (`pogR3`) — skeleton bars in `--gd-neutral-100` for every value, but the
chrome that is knowable before the response stays real: the seven-way segmented control,
the table head, the axes and the gridlines. Seven skeleton cards, ten skeleton rows, so
nothing reflows when data lands. On a *refetch* (range or type change) keep the previous
data on screen and dim it rather than returning to this frame.

**Empty** (`A3x1l`) — the query succeeded and the period genuinely has no rows.
KPI totals read `0`, because zero is a measured fact. Deltas read `—`, because the
previous period is outside the 90-day window and is therefore *unknown*. The chart and
the Top 10 collapse into one `EmptyState`: `IconChartLine` in a 56px neutral tile, an
affirmative title, one sentence naming the window, and a graphite button that widens the
range. The same distinction runs through the table — a Top 10 row with no project shows
`—`, never a blank and never `0`.

**Per-type empty** — a type with rows in the chart but nothing in Top 10 keeps the panel
and the segmented control and shows `ModernTable`'s `emptyState`, so the panel height
does not jump.

**Error** (`F7Wvf`) — the header and the range control stay usable, everything below
becomes one panel: a danger-tinted 56px tile, "Views could not be loaded", one sentence
that reassures nothing was lost, a graphite "Try again", and a tertiary reference line
(`VIEWS_SUMMARY_FAILED · timestamp`) for the support thread. If only the Top 10 request
fails, keep the KPIs and the chart and put the same panel inside the Top 10 panel only.
This frame carries no per-type content, so the seventh type changes nothing in it.

**Permission denied** — `/admin/*` is already gated by `AdminSpace`; a user without the
admin role never reaches the route and is redirected. There is no partially-visible
variant of this page, so no third state is drawn. If the analytics read ever gets its own
permission, the whole page becomes a single `EmptyState` with a lock tile and the reason —
hidden or explained, never rendered broken.

**Disabled** — the range beyond 90 days is not silently clamped: earlier calendar dates
are `disabledDate`, the left month chevron stops at the boundary month, and the panel
footer states why. A disabled control on this screen always carries its reason in view.

**Dead links** — a Top 10 row whose target was deleted or unpublished between the view
being recorded and the page being opened renders as plain ink text with a tooltip saying
the page is no longer public, not as a link into a 404.

---

## 7. Copy (Tolgee keys)

All strings below are user-facing and need keys. Suggested namespace `admin.views`.

| Key | English |
|---|---|
| `admin.views.title` | Views |
| `admin.views.subtitle` | What people opened, by content type. Deltas compare with the previous period of equal length. |
| `admin.views.range.preset.7d` | 7 days |
| `admin.views.range.preset.30d` | 30 days |
| `admin.views.range.preset.90d` | 90 days |
| `admin.views.range.preset.7d.long` | Last 7 days |
| `admin.views.range.preset.30d.long` | Last 30 days |
| `admin.views.range.preset.90d.long` | Last 90 days |
| `admin.views.range.retentionHint` | Raw views are kept for 90 days — earlier dates are disabled |
| `admin.views.range.retentionMax` | 90 days is the maximum. |
| `admin.views.range.footer` | Views older than 90 days are deleted. {date} is the earliest day still on record. |
| `admin.views.range.days` | {count, plural, one {# day} other {# days}} |
| `admin.views.type.devlogs` | Devlogs |
| `admin.views.type.blog` | Blog posts |
| `admin.views.type.courses` | Courses |
| `admin.views.type.events` | Events |
| `admin.views.type.experts` | Experts |
| `admin.views.type.vacancies` | Vacancies |
| `admin.views.type.project` | Projects |
| `admin.views.chart.title` | Views by day |
| `admin.views.chart.subtitle` | All seven types on one scale. Hover a day to compare, click a legend chip to isolate one series. |
| `admin.views.chart.subtitle.isolated` | Showing {type} only. Click the chip again, or Show all, to bring the other six back. |
| `admin.views.chart.unit` | views / day |
| `admin.views.chart.showAll` | Show all |
| `admin.views.top.title` | Top 10 by views |
| `admin.views.top.subtitle` | Most opened items of the selected type, within the selected period. |
| `admin.views.top.column.rank` | # |
| `admin.views.top.column.content` | CONTENT |
| `admin.views.top.column.views` | VIEWS |
| `admin.views.top.footnote` | Every title is a link to the item's public page. A dash means the platform has no value; a zero means it counted none. |
| `admin.views.top.linkUnavailable` | This page is no longer public |
| `admin.views.empty.title` | Views appear here as people open your content |
| `admin.views.empty.description` | Nobody opened a devlog, post, course, event, expert, vacancy or project page between {from} and {to}. Widen the range or come back tomorrow. |
| `admin.views.empty.action` | Switch to 90 days |
| `admin.views.top.empty.title` | Nothing of this type was opened yet |
| `admin.views.top.empty.description` | As soon as someone opens a {type} page, it shows up in this list. |
| `admin.views.error.title` | Views could not be loaded |
| `admin.views.error.description` | The request failed before any counts came back. Nothing was lost — the numbers are still being recorded. |
| `admin.views.error.retry` | Try again |
| `admin.views.error.reference` | Reference: {code} · {timestamp} |
| `admin.views.value.unknown` | — |
| `admin.views.menu` | Views |

Placeholder for the `—` is a literal em dash, not a translated word; keep it as a shared
constant rather than a per-screen key if one already exists.

---

## 8. Data needs

Domain-level; the API agent shapes the endpoints.

**Common filter**: `from` (date, inclusive), `to` (date, inclusive). The server must
reject or clamp anything older than the retention horizon (`now − 90 days`) and say so in
the response, so the client is not the only thing enforcing the bound. Timezone: the day
buckets must be produced server-side in one fixed zone (see open questions) and the zone
returned with the payload so the header can print it the way the audit log does.

The seven subjects partition the data — `ProjectPage` is the project page alone and
`ProjectReport` is the devlog route — so per-type totals sum to the platform total without
adjustment, and no de-duplication step is needed anywhere in the aggregation.

1. **Summary per subject type** — for each of the seven recorded types: `type`, `total`
   for the selected window, and `total` for the immediately preceding window of equal
   length (or an explicit `null` when that window falls outside retention — the client
   must be able to tell "no data" from "zero"). The per-type daily series is **no longer
   needed for the cards** (sparklines are gone) — it is only needed as the chart series
   below, so one payload can serve both.
2. **Daily series** — one row per `(day, type)` for the whole window, including days with
   zero so the line does not interpolate over a gap. Seven types × up to 91 days = 637
   points worst case; a single request is fine, no pagination.
3. **Top 10 per type** — `type` filter, ordered by view count descending, limit 10.
   Each row needs: subject id, **the identifier the public route needs** (`projectReportId`,
   `slug`, `specialityId`, `vacancyId` or `projectSlug` depending on type — see the route
   table in §4), a flag for whether that page is still public, a display title, a secondary
   line (project name + author for devlogs, author for posts, organiser for events, company
   for vacancies, owner/team for project pages), and the count. No pagination; the panel
   shows exactly ten. The secondary line must be able to be absent, and absence must be
   distinguishable from an empty string.
4. **Not needed**: unique visitors, referrers, per-user attribution, session data. The
   screen counts views, and adding identity to it turns a diagnostic into a tracking tool
   nobody asked for.

Caching: the underlying data changes by the day, not by the second — a 5-minute
`staleTime` is right, and `refetchOnWindowFocus` should stay **off** (unlike the audit
log, where returning to a stale tab is a genuine bug).

---

## 9. Open questions / assumptions made

1. **Timezone.** Assumed the server buckets days in one fixed zone (UTC) and the header
   prints it, the way the audit log prints `GMT+2`. If buckets are cut in the viewer's
   local zone instead, the KPI total and the sum of the daily series will disagree for
   anyone outside that zone.
2. **The retention horizon is 90 days, exactly.** The `90 days` preset therefore always
   has an unknown previous period, so its deltas are `—`. If the cron prunes at 91 or 92,
   the preset stays at 90 and the picker bound with it.
3. **Enum spellings.** `ProjectPage` and `ProjectReport` are confirmed; `Post`, `Course`,
   `Event`, `Expert` and `Vacancy` in the route table of §4 are the assumed names for the
   remaining five and should be checked against the schema when `viewSubjects.ts` is
   written.
4. **"Experts" as a subject type.** Assumed a view of an expert's public page, routed by
   `specialityId`, with the expert's headline as the Top 10 secondary line. Confirm.
5. **Delta colour is deliberately neutral** — a down arrow plus `−11%` in
   `--gd-color-text-secondary`, not red. Red is reserved for destructive and failed, and a
   red KPI card on an operator's dashboard reads as "something broke".
6. **The KPI cards lost their sparklines** on the reviewer's call: the movement is on the
   chart directly below, and seven repeats of it in miniature was decoration. The
   consequence is that a card no longer says *how* it moved, only *how much* — if that
   turns out to matter, the answer is a hover state on the card that highlights that
   series in the chart below, not a sparkline coming back.
7. **The focus ring is drawn as a solid 3px `--gd-color-border-focus`.** antd's own focus
   styling softens `controlOutline` with alpha; if `buildAntdTheme` already emits a softer
   ring for this theme, follow the theme rather than the literal frame — the binding part
   is that it is graphite, not brand.
8. **No CSV export, no drill-down.** A Top 10 row links to the item's public page and
   nothing more. "Views for this one devlog over time" is a second screen.
9. **Scout pages** are excluded entirely, not shown greyed. When the public Scout page
   ships it becomes an eighth series, and the palette must be re-validated at eight — the
   CVD margin is already spent at seven.
10. **Responsive frames were not drawn**, only described (§3). The KPI breakpoints and the
    segmented's behaviour below 1100px are proposals, not measured layouts.
