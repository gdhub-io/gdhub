# Sprints

Design handoff for the sprint feature (GDHUB-32). Frames live in
[`docs/design/platform-design.pen`](../platform-design.pen), row **Sprints** (note
`Q7aMs6`, at the bottom of the canvas). The first, heavier draft is kept one band below in
row **Sprints · superseded first draft** (note `x5my5`) — see §11.

Context: [`docs/sprints.md`](../../sprints.md) is the engineering spec and
[`docs/sprint-standard.md`](../../sprint-standard.md) is the rulebook an author and a
curator follow. This file only describes what was drawn and where it departs from them.

---

## 1. Problem & user

An indie author on GDHub has a workflow stage and no reason to finish it by any particular
day. A sprint is the deadline: 28 days on one project, a goal written on day 1, a curator
who is either a person or the AI curator, and a verdict at the end — and the verdict of
`StageClosed` is the only thing that lets the project leave its stage. The author buys it,
brings their team, publishes four devlogs and attaches an artifact; the curator answers the
devlogs, writes the day-14 scope note and the result card. Three people read these screens:
the **author** (does the sprint own their week?), the **team member** (one press a week, at
most), and the **curator** (which of my sprints needs me today, and what am I deciding on).

---

## 2. Frames

### Author — the project space

| Frame | Node id | What it shows |
|---|---|---|
| `Sprints — List (/user/project/[slug]/sprints)` | **iSVBs** | The tab with data: the running sprint as the one filled card, past sprints as a paginated table (`G9bfNg`), `Start a sprint` disabled with a lock. |
| `Sprints — List · empty / loading / error / read-only` | **THGwT** | The other four states, plus the disabled-control anatomy (`O5gROp`) and the header status slot with its three faces (`tRD1y`). |
| `Sprint — Start · asked in steps` | **OEhQK** | The four-step start: what exists now, what will exist, who curates, pay. Step 2 open; steps 1, 3, 4 beside it. |
| `Modal — Choose a curator` | **RSCXq** | The people picker: level, rate, sprints run, stages closed, ratings with their count. |
| `Sprint — Start · checking, paying, blocked` | **mgUfL** | Inline goal check (checking / result), payment pending, payment failed, blocked because a sprint is running. |
| `Sprint — Page · running (thread)` | **HyaoU** | The main screen: one-line header (`EmngL`), one action card (`HWAbn`), collapsed goal (`oN1w6`), check-in matrix (`FNLeJ`), thread (`NrVfd`). |
| `Sprint — Page · the action card, and the human curator` | **FlHcv** | The three action cards in priority order, the no-card state, the human-curator header with calls as thread entries, and the check-in fallback (`MtH0K`). |
| `Sprint — Page · closed · the verdict entry and the rating under it` | **qXEDm** | Closed header, verdict thread entry with the result card open inside it, the rating prompt (`z1bR2`), loading and error. |
| `Modal — Write the devlog` | **YOWK1** | antd `Modal`. Title, what got done / next / in the way, optional video. |
| `Modal — Decide what to drop` | **n5OePF** | antd `Modal`. The outcome list with ticks for what comes off, and the reason. |
| `Modal — Rate the assessment` | **QVA8m** | antd `Modal`. Stars and a comment. Nothing else. |
| `Artifacts (/user/project/[slug]/artifacts)` | **Q41zlJ** | The renamed Documents tab as a paginated table (`Z9yPB5`), grouped by stage → sprint → date, with the check result per row. |
| `Artifacts · empty, loading & error` | **mJ7MM** | Empty, skeleton, error, and the artifact-check anatomy (`f1L6P`). |
| `Modal — Add artifact` | **ZKHiF** | antd `Modal`. Kind picker, link or upload, name, description. |
| `Sprints — long content, and what gives` | **VKETd** | The six places these screens break under real strings, and the decision for each. See §3. |

### Curator — the advisor space

| Frame | Node id | What it shows |
|---|---|---|
| `Advisor — Sprints (/advisor/sprints)` | **njwBu** | The sprints they run. The one needing a verdict is the filled card. |
| `Advisor — Sprints · empty, loading & error` | **AHlwo** | No sprints yet, skeleton, error. |
| `Advisor — Verdict drawer (over the sprints list)` | **T2L8W** | antd `Drawer` (820) over their own list: goal card, devlogs, artifact, check-ins, three verdict options, written reasoning. Drawer `YjDna`, scrim `L3no4`. |

### Admin

| Frame | Node id | What it shows |
|---|---|---|
| `Modal — Assign a curator (admin)` | **z20Q3F** | Administrative band, sprint identity, kind, user picker, "no payment is taken", required reason. |
| `Dialog — Workflow locked by a running sprint (admin)` | **rhKOo** | The refusal, naming the sprint and its end date, plus the warning about the seeded gate task. |

### Components (referenced, not copied)

| Component | Node id | Overridable children |
|---|---|---|
| `Verdict chip` | **StXPy** | dot `v3xypZ`, label `xcwxi` — recolour + relabel per verdict. |
| `Curator badge` | **BYVEs** | AI tile `ow4Me`, avatar `KJMCW`, name `UpgrK`, level `ff5NY` — disable one branch for the other kind. |
| `Check-in cell` | **fHx8c** | check `C59Ux`, dot `qzIrR`, dash `c1TqD` — four states from one node. |

---

## 3. Layout

**Shell.** Project space: the existing space header bar (breadcrumb + project switcher) and
the tab row, with **Sprints** inserted beside Workflow and **Documents renamed Artifacts**.
Frame width 1265, content gutter 46, content column 1173. Advisor space: the existing
`/advisor/*` nav and tab bar with a **Sprints** tab beside Requests and Reviews.

**The sprint page is three things, in this order.**

1. **Header, one line high** (64): `Stage · Sprint N · dates`, one status slot, the curator
   badge on the right. Nothing else.
2. **The action card**, only when something is owed, and never two — see §6.
3. **The thread**: one outlined panel, entries separated by `--gd-color-border-subtle`,
   newest first. An entry is a 32px tile, a day marker, a title and the body. A curator's
   answer sits inside its devlog entry, indented 66 with a 2px left rule.

Between the header and the thread sit two collapsed lines: the goal (`DisclosureSection`,
closed by default: the sentence plus "1 of 4 outcomes claimed") and the check-ins (open by
default, because it is the block a curator actually reads).

**The header shape is the same wherever a sprint is titled** — list card, past-sprint table
row, sprint page, curator's list, result card. `Stage · Sprint N · dates`, then one status
slot with three faces: the day counter while it runs, `Awaiting verdict` between day 28 and
the verdict, the verdict chip once it lands.

### The two tables are the same table

`DS · 11 Tables`, rule 8 of the guidelines, `ModernTable` in code:

| | Past sprints (`G9bfNg`) | Artifacts (`Z9yPB5`) |
|---|---|---|
| Card | `--gd-color-surface`, radius 12, clipped, **no outer border** | same |
| Head band | 44 on `--gd-color-surface-sunken`, labels 11/600 uppercase | same |
| Row | 56, padding 16, outer edge 24 | same |
| Divider | `--gd-color-border-subtle`, none on the last row | same |
| Columns | sprint 220 · goal fill · dates 150 · verdict 130 · decided by 180 | artifact fill · check 160 · stage · sprint 190 · added by 160 · when 100 |
| Paging | **antd pagination** under the card, right-aligned, with the total on the left. No `Load more` — tables in this product paginate, and rule 8 allows one or the other, never both. | same |
| Extra rows | — | group band 40 on `--gd-color-bg-muted`, sprint sub-head 32, and the failure strip on `--gd-danger-tint` under its row |

The running-sprint card above the past-sprints table is **not** a table row: it is the one
live item and takes the fill (§5).

### What gives when the content is long (frame `VKETd`)

Drawn with the longest real strings, not the tidy ones.

| Where | What gives |
|---|---|
| **Project title + stage + dates on one meta line** (curator's card) | The project title truncates first, the stage second; the dates and the status chip never move — they are what the row exists to say. |
| **The goal sentence** | It wraps where it is the subject — the running card and the page header take up to three lines and clamp. Everywhere it is a reference (collapsed line, table cell, curator's card) it is one line with an ellipsis and the whole of it in a `Tooltip`. |
| **The stage in the past-sprints table** | The `SPRINT` cell is two parts: the stage truncates, `· Sprint N` never does. |
| **Artifact name, and a raw URL as a name** | One line, truncated in the middle of the column with the full value in a `Tooltip`. A URL has no break opportunity, so it must be truncated rather than wrapped; the kind chip after it never moves. |
| **Check-in matrix, eight members, long names** | The four week columns are fixed at 72 and never shrink — they are the reading. The name column is the only elastic one: at page width eight long names fit; in the 820 drawer the name truncates and the role under it truncates first. Eight is the maximum the standard allows, so the block never scrolls. |
| **Curator name + level in the badge** | The name truncates, the level never does — the price is computed from it. Full name in a `Tooltip`; in the picker, where there is room, nothing is truncated. |
| **Verdict reasoning** | The field grows to 132 and then scrolls; it never pushes the drawer footer off screen. In the thread it is clamped to six lines with a `Show all`. |

Two mechanics the frames assume, and the implementation must not contradict:

- A column width binds only under `table-layout: fixed`, which antd turns on once `scroll.x`
  is set — and `scroll.x: "max-content"` defeats truncation entirely. **Both tables pass a
  number.**
- Truncation inside a flex row needs `min-width: 0` on the parent; a flex item defaults to
  `min-width: auto` and refuses to shrink below its content, so the ellipsis never engages.

**Grid.** The start-a-sprint step card is full width with a 4-step rail above it; the three
other steps sit as a 3-column row of previews. The verdict drawer is 820 wide over a scrim,
one column.

**Breakpoints** were not drawn. Proposed: the sprint page is a single column at every width
and needs none; the artifact table drops *added by* and *when* below 1100 and keeps
artifact, check and stage · sprint; the start-a-sprint step previews stack below 1100.

---

## 4. Components

**Reuse as-is from `src/components/ui`**

- `StatusDot` — the artifact check result (Ready / Checking / Cannot be opened / Saved, not
  readable) and the curator's check-in traffic light. Never a filled `Tag` for these.
- `IconTile` — 32px neutral tile on every thread entry, action card and signal; 56px in
  empty and error states.
- `EmptyState` — the empty Sprints tab, empty Artifacts, empty advisor list.
- `SectionHeading` rank 4 — "The sprint so far", "Past sprints", panel heads.
- `MetaStat` — the dates, call and check-in readings on the curator's sprint cards.
- `DisclosureSection` — the collapsed goal line and the check-in block on the sprint page,
  and the result card inside the verdict thread entry.
- `AppAvatar` — team members in the matrix, the curator, artifact authors.

**Reuse `ModernTable`** (`src/components/ModernTable`, as the devlog page, `MyTeam`,
`MyProjectReports` and `PaymentsList` already do) for **both** tables above:
`density="compact"`, antd pagination on, `scroll={{ x: <number> }}` so the column widths
bind, and `emptyState` for the per-group empty case. The artifacts table needs group rows
and a per-row expansion for the failure strip; if `ModernTable` cannot express those, extend
it there rather than hand-rolling a second row anatomy in this feature.

**antd**

- `Modal` — write the devlog, decide what to drop, attach the artifact, rate the
  assessment, assign a curator, the workflow-locked dialog. Do not invent a dialog anatomy.
- `Drawer` — the curator's verdict, `width={820}`, `placement="right"`.
- `Pagination` — under both tables (inside `ModernTable`).
- `Segmented` — artifact kind picker, artifact type filter, advisor list filter, curator
  level filter, admin curator kind.
- `Steps` — the four-step start (`current`, `size="small"`), or the rail drawn in `OEhQK`.
- `Tooltip` — every disabled control's reason, the source behind a check-in dot, and every
  truncated string in §3.
- `Rate` — the five stars in the rating modal.
- `Input` / `Input.TextArea` / `Upload.Dragger` — the forms.

**New, proposed paths**

| Path | What it is |
|---|---|
| `src/components/sprints/SprintHeader/` | `Stage · Sprint N · dates` + the three-faced status slot + curator badge. One component, used on five screens. |
| `src/components/sprints/VerdictChip/` | The three verdicts as tone + label. Mirrors frame `StXPy`. |
| `src/components/sprints/CuratorBadge/` | AI or person, one component, `kind` prop. Mirrors `BYVEs`. |
| `src/components/sprints/CheckInMatrix/` | Members × 4 weeks, four cell states, quiet rule, legend. Mirrors `FNLeJ`. |
| `src/components/sprints/SprintThread/` | The thread panel and its entry types (devlog, curator answer, note, check-in week, artifact, verdict, payment). |
| `src/components/sprints/ActionCard/` | The single owed-action card; takes a discriminated union of the four moments and renders the right copy and button. |
| `src/components/sprints/SprintCard/` | The running card in the list, and the curator's row. |
| `src/components/sprints/GoalCard/` | Inputs and outcomes side by side, cut outcomes marked, the revision beside the original. |

**Icons — `@tabler/icons-react`.** The canvas draws the nearest Lucide names because that is
what Pencil ships; the tabler names below are the binding ones.

`IconFlag` (sprint / goal fixed), `IconNotebook` (devlog), `IconSparkles` (AI curator),
`IconScissors` (day-14 cut), `IconUserCheck` (check-ins), `IconPaperclip` (artifact),
`IconPlayerPlay` (video), `IconFileText` (document), `IconPhoto` (image), `IconPackage`
(build or page), `IconGavel` (verdict), `IconStar` (rating), `IconPhone` (call),
`IconLock` (disabled / locked), `IconAlertTriangle` (failure), `IconInfoCircle` (tooltips),
`IconCreditCard` (payment), `IconRoute` (stage), `IconShieldHalf` (admin action),
`IconChevronDown` / `IconChevronRight` (disclosure).

---

## 5. Tokens

No literal colour ships from these frames. Every value below is a token name.

| Role | Token |
|---|---|
| Page | `--gd-color-bg` |
| Panel, card, thread panel, action card | transparent + `1px --gd-color-border-strong`, radius `--gd-radius-panel` (16) or `--gd-radius-card` (12) |
| **The one live item in a list** — running sprint, verdict due today | `--gd-color-surface`. Everything below it stays outlined and transparent. |
| Table card (past sprints, artifacts) | `--gd-color-surface`, radius 12, clipped, **no outer border** — one of the three surfaces that are white by design |
| Table head band | `--gd-color-surface-sunken`, 44 high |
| Table row divider | `--gd-color-border-subtle` |
| Group band in the artifact table | `--gd-color-bg-muted` |
| Floating — modals, the drawer, dropdowns, tooltips | `--gd-color-surface`, `--gd-elevation-e3` |
| Input fill, segmented track, neutral tile, skeleton | `--gd-fill-base` / `--gd-neutral-100` |
| Inset note blocks | `--gd-color-bg-subtle` |
| Progress bar fill, current-week mark, selected option border, selected radio | `--gd-color-accent` (2px mark or a 4–8 % tint — never a filled brand button) |
| Selected option / action card tint | `--gd-color-accent-subtle` |
| Committing button | `colorPrimary` (graphite) |
| Confirmed check-in, delivered outcome, `StageClosed` | `--gd-success-tint` / `--gd-success-on-tint` / `--gd-success-solid` |
| `GoalMet` | `--gd-info-tint` / `--gd-info-on-tint` |
| Day-14 note, cut outcome, `GoalMissed`, "Quiet", "Saved, not readable", "no payment taken" | `--gd-warning-tint` / `--gd-warning-on-tint` |
| Artifact "Cannot be opened", failed payment, delete icon | `--gd-danger-tint` / `--gd-danger-on-tint` / `--gd-danger-solid` |
| Missed check-in cell | `--gd-color-border-strong` fill (a hole, not a failure) |
| Active page in pagination | `1px colorPrimary` border, ink label; the rest are `--gd-color-text-secondary` |
| Craft colour | `getWorkDirection(name)` on the project disc in the curator's list and on team avatars. Chrome stays neutral. |
| Spacing | `--gd-space-1` 4 · `2` 8 · `3` 12 · `4` 16 · `6` 24 · `8` 32 · `16` 64 |
| Radii | chip 6 · control 10 · card 12 · panel 16 · pill 999 |
| Control heights | 40 default · 36 inside cards and thread entries · 32 in dense rows and pagination |
| Type | 24/600 page title · 20/600 action card and modal title · 16/600 panel head · 15/600 entry title · 14 body · 13 dense · 12 meta · 11/600 `ls .5` table head and caption |

Numbers (day counters, counts, prices) carry `font-feature-settings: "tnum"`.

The canvas gained one variable for this work, `surface-sunken` (`#FAFAF9`), so the table
head band carries a token name in the frame as well as in the code.

---

## 6. States

**The action card.** Exactly one, and only when something is owed. Priority, drawn in
`FlHcv`: **1** post this week's devlog (the curator's answer depends on it), **2** decide
what to drop (day 14 only), **3** attach the artifact (day 26). When nothing is owed there
is no card at all and the thread starts straight after the header. With a human curator the
next call takes the slot on the day of the call.

**Every action is one press, on the spot.** The action card and the thread entry both carry
the button and both open the same modal, so an artifact never attached can still be attached
from its entry and a verdict from last week can still be rated from its entry. Nothing is
reached by navigating somewhere else and coming back. The one exception is the curator's
verdict, which needs the goal card and the devlogs in view: a `Drawer` over their own list.

**The weekly check-in has no modal and often no button.** Anyone who authored a devlog or
attached an artifact that week is confirmed by the work itself and is never asked; the
fallback press ("Still on it") is offered at the end of the week only to the people the
week's work does not cover, and it disappears once the week is filled — a filled week never
carries a redundant control beside it. One dot shape whatever confirmed it; the source
(devlog / artifact / pressed) is in the dot's tooltip.

| Screen | Loading | Empty | Error | Other |
|---|---|---|---|---|
| Sprints list (`THGwT`) | Skeleton of the running card + row skeletons at the loaded height | `EmptyState`, affirmative title, graphite `Start a sprint`, and the stage it would run in | One panel with a danger tile, a reassurance that the sprint keeps running, retry, reference code | Read-only for a member without `sprints.create`; Guests see no tab |
| Start a sprint (`mgUfL`) | The goal check runs inline under the outcome list, never a modal | — | Payment failed: nothing charged, draft kept | Payment pending; blocked because one is running |
| Sprint page (`qXEDm`) | Real header, three skeleton entries at entry height | A sprint always has at least its day-1 entries | Header stays usable, thread becomes one panel with retry | Review (`Awaiting verdict`), Closed, Cancelled draft |
| Artifacts (`mJ7MM`) | Head band and group rows real, table rows skeletonised at 56 | `EmptyState` with the video-first invitation | One panel, "nothing was deleted", retry | Per-artifact check results, below |
| Advisor list (`AHlwo`) | Card skeleton | "No sprints yet" — the normal state for a new curator | One panel, "the sprints keep running", retry | — |

**Artifact check** (`f1L6P`), stored per artifact and shown as a `StatusDot`:
`Ready`, `Checking…`, `Cannot be opened` (the only one with an action: the reason plus
*Replace the link*, in a `--gd-danger-tint` strip under its row), `Saved, not readable`.
A row appears as `Checking` the moment it is added and settles in place without a reload.

**Disabled says why** (`O5gROp`): `IconLock` on the control and the reason in its own
tooltip. Never a sentence in a box beside the button — it reads as a second control and
gets pressed. Drawn for: start a sprint while one is running, write the verdict before day
28, attach an artifact to a closed sprint, edit the workflow under a running sprint. The
last reason is too long for a tooltip, so the full refusal is the confirm step (`rhKOo`).

**Permission denied.** `sprints.view` is every member, Guests see no tab. Without
`sprints.create` the page renders complete but the primary button is absent, not broken.
The verdict controls exist only in the advisor space, and only for that sprint's curator.

---

## 7. Copy (Tolgee keys)

Namespace `sprints`. Everything below is user-facing.

| Key | English |
|---|---|
| `sprints.tab` | Sprints |
| `sprints.title` | Sprints |
| `sprints.subtitle` | 28 days on one project with a stated goal and a verdict at the end. |
| `sprints.start` | Start a sprint |
| `sprints.start.disabled` | One sprint at a time. This one ends {date}. |
| `sprints.status.day` | Day {day} of 28 |
| `sprints.status.awaitingVerdict` | Awaiting verdict |
| `sprints.status.daysLeft` | {count, plural, one {# day left} other {# days left}} |
| `sprints.header.meta` | {stage} · Sprint {number} · {from} – {to} |
| `sprints.verdict.stageClosed` | Stage closed |
| `sprints.verdict.goalMet` | Goal met |
| `sprints.verdict.goalMissed` | Goal missed |
| `sprints.verdict.decidedBy` | Decided by |
| `sprints.curator.ai` | AI curator |
| `sprints.curator.aiKind` | AI curator, in writing |
| `sprints.curator.humanKind` | A person, on five calls |
| `sprints.curator.choose` | Choose a curator |
| `sprints.curator.record` | {sprints} sprints · {closed} closed a stage |
| `sprints.curator.rating` | {value} from {count} ratings |
| `sprints.curator.rating.tooFew` | Not enough ratings yet ({count}) |
| `sprints.empty.title` | Your first sprint starts here |
| `sprints.empty.description` | 28 days, one goal, a curator, and a verdict that opens the next stage. |
| `sprints.past.title` | Past sprints |
| `sprints.past.column.sprint` | SPRINT |
| `sprints.past.column.goal` | GOAL |
| `sprints.past.column.dates` | DATES |
| `sprints.past.column.verdict` | VERDICT |
| `sprints.past.column.decidedBy` | DECIDED BY |
| `sprints.past.total` | {count, plural, one {# closed sprint} other {# closed sprints}} |
| `sprints.start.step1` | What exists now |
| `sprints.start.step2` | What will exist in 28 days |
| `sprints.start.step3` | Who curates |
| `sprints.start.step4` | Pay |
| `sprints.start.step2.title` | What must exist on {date} that does not exist today? |
| `sprints.start.outcome.add` | Add an outcome, then press Enter |
| `sprints.start.input.add` | Add what exists now, then press Enter |
| `sprints.start.goal.label` | And the whole of it in one sentence |
| `sprints.start.stage` | {stage} · sprint {number} |
| `sprints.start.check.pending` | Checking the goal against 28 days… |
| `sprints.start.check.note` | Checked by the AI curator · advice, not a gate |
| `sprints.start.pay` | Pay and start |
| `sprints.start.pay.note` | Day 1 is the moment the payment lands. |
| `sprints.start.pending.title` | Waiting for the payment |
| `sprints.start.failed.title` | Nothing was charged |
| `sprints.start.blocked.title` | One sprint at a time |
| `sprints.action.devlog.title` | Post this week's devlog |
| `sprints.action.devlog.cta` | Write the devlog |
| `sprints.action.cut.title` | Decide what to drop |
| `sprints.action.cut.cta` | Change the outcomes |
| `sprints.action.cut.keep` | Leave the list as it is |
| `sprints.action.artifact.title` | Attach the artifact |
| `sprints.action.artifact.cta` | Add a video |
| `sprints.action.call.title` | Call {n} — {topic} |
| `sprints.action.call.cta` | Join the call |
| `sprints.goal.label` | Goal |
| `sprints.goal.claimed` | {done} of {total} outcomes claimed |
| `sprints.checkins.title` | Check-ins |
| `sprints.checkins.summary` | {done} of {total} confirmed |
| `sprints.checkins.quiet` | Quiet |
| `sprints.checkins.legend.confirmed` | Confirmed |
| `sprints.checkins.legend.waiting` | Waiting |
| `sprints.checkins.legend.missed` | Missed |
| `sprints.checkins.legend.notRequested` | Not requested yet |
| `sprints.checkins.confirm` | Still on it |
| `sprints.checkins.source.devlog` | Week {week} · from the devlog of {date} |
| `sprints.checkins.source.artifact` | Week {week} · from the artifact of {date} |
| `sprints.checkins.source.pressed` | Week {week} · confirmed on {date} |
| `sprints.thread.title` | The sprint so far |
| `sprints.thread.artifacts` | Artifacts · {count} in this sprint |
| `sprints.thread.showAll` | Show all |
| `sprints.midnote.title` | Day 14 · half the calendar is gone |
| `sprints.midnote.from` | From the AI curator |
| `sprints.revision.label` | Revised on {date} |
| `sprints.revision.cut` | Cut on day 14 |
| `sprints.result.title` | Result card |
| `sprints.result.summary` | Summary |
| `sprints.result.outcomes` | Outcome by outcome |
| `sprints.result.sources` | What this verdict was written from |
| `sprints.result.limit` | Frames and a transcript show that a thing exists. They do not show how it plays. |
| `sprints.rating.title` | Was this assessment any use? |
| `sprints.rating.note` | Optional — the sprint is closed either way. |
| `sprints.rating.cta` | Rate it |
| `sprints.rating.comment` | What it got right, and what it missed. |
| `sprints.rating.done` | You rated this assessment |
| `sprints.next.title` | {stage} can now be left |
| `sprints.next.cta` | Start the next sprint |
| `artifacts.tab` | Artifacts |
| `artifacts.add` | Add artifact |
| `artifacts.total` | {count, plural, one {# artifact} other {# artifacts}} |
| `artifacts.column.artifact` | ARTIFACT |
| `artifacts.column.check` | CHECK |
| `artifacts.column.where` | STAGE · SPRINT |
| `artifacts.column.addedBy` | ADDED BY |
| `artifacts.column.when` | WHEN |
| `artifacts.kind.video` | Video |
| `artifacts.kind.document` | Document |
| `artifacts.kind.image` | Image |
| `artifacts.kind.build` | Build or page |
| `artifacts.video.title` | Show the game in a clip |
| `artifacts.unsorted` | Unsorted |
| `artifacts.check.ready` | Ready |
| `artifacts.check.pending` | Checking… |
| `artifacts.check.unreachable` | Cannot be opened |
| `artifacts.check.unsupported` | Saved, not readable |
| `artifacts.check.unreachable.login` | This link asks for a login, so nothing on the other side was read. Make it public, or paste a link that needs no account. |
| `artifacts.check.fix` | Replace the link |
| `advisor.sprints.tab` | Sprints |
| `advisor.sprints.verdictDue` | Verdict due by {date} |
| `advisor.verdict.title` | Write the verdict |
| `advisor.verdict.reason` | Your reasoning |
| `advisor.verdict.reason.help` | The author reads this word for word. |
| `advisor.verdict.guard` | Stage closed needs an artifact or a claimed outcome. |
| `admin.sprints.assign.title` | Assign a curator |
| `admin.sprints.assign.free` | No payment is taken |
| `admin.sprints.assign.reason` | Reason |
| `admin.sprints.locked.title` | This project has a sprint running |

The em dash used for "the platform has no value" stays a shared constant, not a key.

---

## 8. Data needs

Domain level; the API agent shapes the endpoints.

1. **Sprint list for a project** — the running or review sprint in full (stage name, sprint
   number, goal, `startedAt`, `dueAt`, status, curator kind + person, devlogs published of
   4, check-ins confirmed this week of team size, whether an artifact exists), and the
   closed ones as **a paginated page** (stage, number, goal, dates, verdict, who decided)
   with `page`, `pageSize` and a `total`, because the footer prints the count. Also: whether
   the caller may create a sprint, and if not, the reason and the blocking sprint's end
   date, so the disabled tooltip is server-truth rather than a client guess.
2. **Sprint detail** — the goal card (inputs, outcomes, and which outcomes have been
   claimed in a devlog), the day-14 revision if any, the check-in matrix as
   *(member, week, state, source)* where state distinguishes confirmed / waiting / missed /
   not-requested and source is devlog / artifact / pressed, the devlogs of the sprint with
   the curator's answer, the artifacts with their check result and reason, the mid note, and
   the verdict block when it exists. One request; the page has no independent panels left.
3. **Thread ordering** — every event carries a day number and a timestamp, and the client
   sorts newest first. A member who joined mid-sprint must produce "not requested" weeks,
   never "missed".
4. **Start a sprint** — submit stage id (read from the workflow, never chosen), goal,
   inputs, outcomes, curator kind and curator id. The reachability check is a separate call
   that takes the draft goal card and returns a short verdict + notes; it never blocks.
   Price is computed server-side from curator rate and team size at that moment.
5. **Curator picker** — level, hourly rate, sprints run, stages closed, average rating **and
   the number of ratings**, with the average suppressed below five. Sorting is by stages
   closed / sprints run / rate — never by an average most curators will not have.
6. **Artifacts** — paginated, grouped by stage in workflow order, then sprint number, then
   date, with `stageName` and sprint number denormalised so a deleted stage still reads.
   Each row: kind, name, description (tooltip), link or file, author, date, check result +
   reason + checked-at, and a `total` for the pager. Adding one returns immediately with
   `pending`; the settled result arrives by refetch.
7. **Verdict** — the curator submits verdict + reasoning; the server enforces the guardrail
   (no artifact and no claimed outcome cannot be `StageClosed`) and refuses before day 28.
8. **Rating** — optional, stars 1–5 and a comment. Nothing waits on it and it can be sent or
   changed later, including on a sprint closed weeks ago.

---

## 9. Where the frames depart from `docs/sprints.md`

| Departure | Why |
|---|---|
| **`GoalMissed` is drawn in warning, not danger.** | Red is reserved for destructive and failed *platform* actions. A missed goal is the starting position of the next sprint, and a red chip on the author's own history reads as "something broke". |
| **The day counter is the status, not the word "Active".** | §3 lists five statuses; "Active" tells the author nothing they cannot see. `Day 14 of 28` is the number they came for. `Draft` and `Cancelled` keep their words. |
| **`Review` is called "Awaiting verdict" in the UI.** | The enum stays `Review`; the word "review" would suggest the author has something to review. |
| **Past sprints are a table, not cards, and it paginates.** | Five facts per sprint repeated down a list is table work — `DS · 11` and `ModernTable`, the same one the devlog page uses. Only the running sprint stays a card, because it is the live item and takes the fill. |
| **The artifact description left the row.** | A 56px row is one line. The description is a tooltip, and it is still in the modal and in the verdict input. |
| **No call strip in the header for a human curator.** | §4 lists five consultations with dates. Five dated items in a header is a second navigation bar. The next call is the action card; the rest are thread entries. |
| **The result card is not a destination.** | §13 previously listed it as a screen. It is a `DisclosureSection` inside the verdict thread entry — the same content, read where it lands. |
| **The rating is a prompt plus a modal.** | Answered where it is read, one press, and by the same mechanism as every other action. The unanswered state is the default and is drawn first. |
| **The check-in block kept its axis.** | §13 asks for "one compact row per member with four dots". Four bare dots with no week heads, no dates, no current-week mark and no legend stopped being readable; the frame keeps the labelled matrix inside a disclosure. Compaction removed the panel chrome, not the axis. |
| **The artifact block is video-first with a kind picker.** | §9 lists four equal kinds. Video is the only one the platform can read without running anything, so it gets the empty state and the primary button; the other three sit under it. |
| **A member is never asked for a check-in they have already earned.** | A devlog or artifact that week confirms its author, and the request goes at the end of the week to whoever is left. |
| **`Introduction` and `Project Completion` were not drawn.** | The frames use Ideation, Concepting, Prototyping and Preparing a release version, which is where sprints will actually be bought. |

---

## 10. Open questions / assumptions

1. **Team size for pricing is taken at purchase.** §8 of the standard prices from team size;
   the frames say the roster is fixed for the sprint and someone joining is paid for from
   the next one. Confirm that the count is stored on the sprint rather than read live.
2. **Call scheduling is not designed.** The human-curator frames show dates and one "move it"
   action; the picker, the reschedule flow and the calendar invitation belong to the
   human-curator issue.
3. **The AI curator's price ($89) is a placeholder** — one value in config per §11.
4. **The seeded gate task** reads *"Close the stage with a sprint verdict"*, matching the
   imperative tone of the existing seeded tasks.
5. **"Request expert advice" and the human curator are not competitors** and no copy in the
   frames implies it: the advice request buys one answer, the sprint buys five moments.
6. **The artifact upload limit** is drawn as 200 MB / five minutes for a clip. Not verified
   against Sanity or the ffmpeg queue.
7. **`ModernTable` group rows and the failure strip** may need the component extended; the
   frames assume it can carry a full-width row and an expanded row.
8. **Page sizes** are assumed 10 for past sprints and 25 for artifacts; the frames draw two
   pages of each.
9. **Timezone**: day numbers are assumed to be computed server-side in one fixed zone and
   returned with the payload, the way the audit log does it.
10. **Responsive layouts were described, not drawn** (§3), except the 820 drawer, which is
    where the check-in name column actually truncates.

---

## 11. The superseded row

Row **Sprints · superseded first draft** (note `x5my5`, `y = 54000`) keeps the first pass:
`wtcHn` one long start form, `oZSFw` the seven-panel sprint page, `HFXPh` its human-curator
variant, `d7tJNT` its review and error states, `O5aibU` the result card as its own page,
`voPIu` the check-in matrix as a standalone table, `ed1jY` the verdict as a full page.

It is kept because the contrast is the argument: on the panel page nothing says what to do
today, and the two actions that matter — writing a verdict, rating an assessment — had
nowhere to live. What was carried over unchanged: the goal-card two-column anatomy, the
day-14 note wording, the curator's written answer under a devlog, the four call cards and
the check-in cell states.
