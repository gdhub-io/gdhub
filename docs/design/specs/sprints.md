# Sprints

Design handoff for the sprint feature (GDHUB-32). Frames live in
[`docs/design/platform-design.pen`](../platform-design.pen), row **Sprints** (note
`Q7aMs6`, at the bottom of the canvas).

Context: [`docs/sprints.md`](../../sprints.md) is the engineering spec and
[`docs/sprint-standard.md`](../../sprint-standard.md) is the rulebook an author and a
curator follow. This file only describes what was drawn and where it departs from them.

---

## 1. Problem & user

An indie author on GDHub has a workflow stage and no reason to finish it by any particular
day. A sprint is the deadline: 28 days on one project, a goal fixed on day 1, a curator who
is either a person or the AI curator, and a verdict at the end — and the verdict of
`StageClosed` is the only thing that lets the project leave its stage. The author buys it,
brings their team, publishes four devlogs and attaches an artifact; the curator answers
every devlog, writes the day-14 scope note and the result card. Three people read these
screens: the **author** (does the sprint own my week?), the **team member** (one press a
week, and only when the week has no work in it), and the **curator** (which of my sprints
needs me today, and what am I deciding on).

---

## 2. Frames

### Starting a sprint — four routes under `/sprints/new`

| Frame | Node id | Route |
|---|---|---|
| `Sprint — Start · 1 What exists now` | **W76sA5** | `/sprints/new/inputs` |
| `Sprint — Start · 2 What will exist` | **pyT9o** | `/sprints/new/outcomes` |
| `Sprint — Start · 3 Who curates` | **vE1BQ** | `/sprints/new/curator` — the picker owns this page |
| `Sprint — Start · 4 Summary and payment` | **B2XH9** | `/sprints/new/pay` — the read-back and the only price |
| `Sprint — Started` | **zu2KW** | `/sprints/new/started` — dates, and the way into the sprint |
| `Sprint — Starting (webhook not in yet)` | **Yw91X** | the same screen for the seconds before the webhook lands |
| `Sprint — Start · the goal sentence is generated` | **M2CuZ** | the derived field: pending, generated, corrected |
| `Sprint — Start · step 4 states (paying, failed, blocked)` | **mgUfL** | payment pending, payment failed, blocked by a running sprint |
| `Dialog — Cancel this draft?` | **H3rdHi** | the confirm behind Cancel, and behind Discard in the list |

### The project space

| Frame | Node id | What it shows |
|---|---|---|
| `Sprints — List (/user/project/[slug]/sprints)` | **iSVBs** | Running sprint as the one filled card, past sprints as a paginated table (`G9bfNg`), `Start a sprint` disabled with a lock. |
| `Sprints — List · empty / loading / error / read-only` | **THGwT** | The other states, the **resume** row for a waiting draft (`Lk9Q0`), the disabled-control anatomy (`O5gROp`) and the status slot's three faces (`tRD1y`). |
| `Sprint — Page · running (thread)` | **HyaoU** | Header (`EmngL`), one action card (`HWAbn`), collapsed goal (`oN1w6`), check-in matrix (`FNLeJ`), thread (`NrVfd`). |
| `Sprint — Page · the action card, and the human curator` | **FlHcv** | The three action cards in priority order, the no-card state, the human curator, the check-in fallback (`MtH0K`), and the devlog-feedback anatomy (`ySkh2`). |
| `Sprint — Page · closed` | **qXEDm** | Closed header, the verdict entry with the result card inside it, the rating prompt (`z1bR2`), loading and error. |
| `Modal — Write the devlog` | **YOWK1** | antd `Modal`. |
| `Modal — Decide what to drop` | **n5OePF** | antd `Modal`: the outcome list with ticks for what comes off. |
| `Modal — Rate the assessment` | **QVA8m** | antd `Modal`: stars and a comment. |
| `Artifacts (/user/project/[slug]/artifacts)` | **Q41zlJ** | The renamed Documents tab as a paginated table (`Z9yPB5`), grouped by stage → sprint → date, with the check result per row. |
| `Artifacts · empty, loading & error` | **mJ7MM** | Empty, skeleton, error, and the artifact-check anatomy (`f1L6P`). |
| `Modal — Add artifact` | **ZKHiF** | antd `Modal`. |
| `Sprints — long content, and what gives` | **VKETd** | The seven places these screens break under real strings, and the decision for each. |

### The advisor space

| Frame | Node id | What it shows |
|---|---|---|
| `Advisor — Sprints (/advisor/sprints)` | **njwBu** | The sprints they run; the one needing a verdict is the filled card. |
| `Advisor — Sprints · empty, loading & error` | **AHlwo** | No sprints yet — the normal state for a new curator — skeleton, error. |
| `Advisor — Verdict drawer (over the sprints list)` | **T2L8W** | antd `Drawer` (820) over their own list. Drawer `YjDna`, scrim `L3no4`. |

### Admin

| Frame | Node id | What it shows |
|---|---|---|
| `Modal — Assign a curator (admin)` | **z20Q3F** | Administrative band, sprint identity, kind, user picker, "no payment is taken", required reason. |
| `Dialog — Workflow locked by a running sprint (admin)` | **rhKOo** | The refusal, naming the sprint and its end date. |

### Components (referenced, not copied)

| Component | Node id | Overridable children |
|---|---|---|
| `Verdict chip` | **StXPy** | dot `v3xypZ`, label `xcwxi`. |
| `Curator badge` | **BYVEs** | AI tile `ow4Me`, avatar `KJMCW`, name `UpgrK`, level `ff5NY`. |
| `Check-in cell` | **fHx8c** | check `C59Ux`, dot `qzIrR`, dash `c1TqD` — five faces from one node, see §6. |

---

## 3. Layout

**Shell.** Project space: the existing space header bar and tab row, with **Sprints**
inserted beside Workflow and **Documents renamed Artifacts**. Frame width 1265, gutter 46,
content column 1173. Advisor space: the existing `/advisor/*` nav with a **Sprints** tab.

### Starting a sprint

One question per page, each a real route, each writing to the `Draft` sprint as it is left.
Progress across the top (four segments plus "Step N of 4" and a quiet "Saved as a draft"),
the question at 32/600, the answer under it, and a footer bar: `Cancel` and `Back` on the
left, the forward action on the right.

**The pages are mostly empty and that is correct.** One question, room to answer it, and no
summary of the previous steps repeated on any of them — everything is shown back on step 4,
each block with an `Edit` link to the step that owns it. Step 3 is the heaviest page because
the curator picker now lives there rather than in a modal.

### The sprint page

1. **Header, one line high** (64): `Stage · Sprint N · dates`, one status slot, the curator
   badge. Nothing else.
2. **The action card**, only when something is owed, never two.
3. **The thread**: one outlined panel, entries separated by `--gd-color-border-subtle`,
   newest first. An entry is a 32px tile, a day marker, a title and the body. Feedback sits
   under its devlog, indented 66 with a 2px left rule.

Between them: the goal collapsed to its sentence (`DisclosureSection`) and the check-in
matrix, open by default.

**The header shape is the same wherever a sprint is titled** — list card, table row, page,
curator's list, result card. `Stage · Sprint N · dates`, then one status slot with three
faces: the day counter while it runs, `Awaiting verdict`, the verdict chip once it lands.

### The two tables are the same table

`DS · 11 Tables`, rule 8, `ModernTable` in code:

| | Past sprints (`G9bfNg`) | Artifacts (`Z9yPB5`) |
|---|---|---|
| Card | `--gd-color-surface`, radius 12, clipped, **no outer border** | same |
| Head band | 44 on `--gd-color-surface-sunken`, labels 11/600 uppercase | same |
| Row | 56, padding 16, outer edge 24 | same |
| Divider | `--gd-color-border-subtle`, none on the last row | same |
| Columns | sprint 220 · goal fill · dates 150 · verdict 130 · decided by 180 | artifact fill · check 160 · stage · sprint 190 · added by 160 · when 100 |
| Paging | **antd pagination** under the card, total on the left. Never `Load more` as well. | same |
| Extra rows | — | group band 40 on `--gd-color-bg-muted`, sprint sub-head 32, failure strip on `--gd-danger-tint` |

**Head and body come from one column definition.** They drifted once because they were built
separately; in code that is a single `columns` array, never two lists of widths.

The running-sprint card above the past-sprints table is not a table row: it is the one live
item and takes the fill (§5).

### What gives when the content is long (frame `VKETd`)

| Where | What gives |
|---|---|
| Project title + stage + dates on one meta line | Title truncates first, stage second; dates and the status chip never move. |
| The goal sentence | Wraps to three lines where it is the subject (running card, page header); one line with an ellipsis and a `Tooltip` wherever it is a reference. |
| The stage in the past-sprints table | The cell is two parts: the stage truncates, `· Sprint N` never does. |
| Artifact name, and a raw URL as a name | One line, truncated, full value in a `Tooltip`. A URL has no break opportunity, so it is never wrapped. |
| Check-in matrix, eight members, long names | Week columns fixed at 72 and never shrink; the name column is the only elastic one, and the role truncates before the name. |
| Curator name + level in the badge | The name truncates, the level never does. |
| Verdict reasoning | The field grows to 132 then scrolls; in the thread it clamps to six lines with a `Show all`. |

Two mechanics the frames assume: a column width binds only under `table-layout: fixed`,
which antd turns on once `scroll.x` is set — and `scroll.x: "max-content"` defeats
truncation, so both tables pass a number; and truncation inside a flex row needs
`min-width: 0` on the parent.

**Breakpoints** were not drawn. Proposed: the sprint page is a single column at every width;
the artifact table drops *added by* and *when* below 1100; the step pages need nothing.

---

## 4. Components

**Reuse from `src/components/ui`** — `StatusDot` (artifact check result, check-in traffic
light), `IconTile` (32 on thread entries and action cards, 56 in empty and error states),
`EmptyState`, `SectionHeading` rank 4, `MetaStat`, `DisclosureSection` (collapsed goal,
check-ins, the result card inside the verdict entry), `AppAvatar`.

**Reuse `ModernTable`** (`src/components/ModernTable`, as the devlog page, `MyTeam`,
`MyProjectReports` and `PaymentsList` already do) for **both** tables:
`density="compact"`, antd pagination on, `scroll={{ x: <number> }}`, and `emptyState`. The
artifacts table needs group rows and a per-row expansion for the failure strip; extend the
component rather than hand-rolling a second row anatomy.

**Reuse `PaymentsList`** as it stands — see §9. Nothing about receipts is designed here.

**antd** — `Modal` (write the devlog, decide what to drop, attach the artifact, rate the
assessment, cancel the draft, assign a curator, workflow locked), `Drawer` (the curator's
verdict, `width={820}`), `Pagination`, `Segmented`, `Steps` (or the drawn rail),
`Tooltip` (every disabled reason, every truncation, the source behind a check-in dot),
`Rate`, `Input`/`Input.TextArea`/`Upload.Dragger`.

**New, proposed paths**

| Path | What it is |
|---|---|
| `src/components/sprints/SprintHeader/` | `Stage · Sprint N · dates` + the three-faced status slot + curator badge. |
| `src/components/sprints/VerdictChip/` | The three verdicts as tone + label. |
| `src/components/sprints/CuratorBadge/` | AI or person, one component, `kind` prop. |
| `src/components/sprints/CheckInMatrix/` | Members × 4 weeks, five cell faces, quiet rule, joined/left dates, legend. |
| `src/components/sprints/SprintThread/` | The thread panel and its entry types, including feedback under a devlog. |
| `src/components/sprints/ActionCard/` | The single owed-action card. |
| `src/components/sprints/SprintCard/` | The running card, the draft card, the curator's row. |
| `src/components/sprints/GoalCard/` | Inputs and outcomes side by side, cut outcomes marked, the revision beside the original. |
| `src/components/sprints/start/` | The four step pages and the shared progress rail + footer. |

**Icons — `@tabler/icons-react`** (the canvas draws the nearest Lucide names):
`IconFlag`, `IconNotebook`, `IconSparkles`, `IconScissors`, `IconUserCheck`,
`IconPaperclip`, `IconPlayerPlay`, `IconFileText`, `IconPhoto`, `IconPackage`, `IconGavel`,
`IconStar`, `IconPhone`, `IconLock`, `IconAlertTriangle`, `IconInfoCircle`, `IconBell`,
`IconTrash`, `IconRoute`, `IconShieldHalf`, `IconChevronDown`/`IconChevronRight`.

---

## 5. Tokens

No literal colour ships from these frames.

| Role | Token |
|---|---|
| Page | `--gd-color-bg` |
| Panel, card, thread panel, action card | transparent + `1px --gd-color-border-strong`, radius 16 or 12 |
| **The one live item in a list** — running sprint, waiting draft, verdict due today | `--gd-color-surface`; everything below it stays outlined |
| Table card | `--gd-color-surface`, radius 12, clipped, no outer border |
| Table head band | `--gd-color-surface-sunken` (added to the canvas variables for this work) |
| Table row divider | `--gd-color-border-subtle` |
| Group band in the artifact table | `--gd-color-bg-muted` |
| Floating — modals, drawer, tooltips | `--gd-color-surface` + `--gd-elevation-e3`; the drawer scrim is ink at 35 % |
| Input fill, segmented track, neutral tile, skeleton | `--gd-fill-base` / `--gd-neutral-100` |
| Progress bar fill, current-week mark, selected option, edited-field border | `--gd-color-accent` as a 2px mark or a 4–8 % tint |
| Selected option / action card tint | `--gd-color-accent-subtle` |
| Committing button | `colorPrimary` (graphite) |
| **Destructive confirm — the one filled red button** | `--gd-danger-solid` with an inverse label, only in `Dialog — Cancel this draft?` |
| Confirmed check-in, delivered outcome, `StageClosed` | `--gd-success-*` |
| `GoalMet` | `--gd-info-*` |
| Day-14 note, cut outcome, `GoalMissed`, Quiet, "Saved, not readable", "Starting…" | `--gd-warning-*` |
| Artifact "Cannot be opened", failed payment, delete icon | `--gd-danger-*` |
| Missed check-in cell | `--gd-color-border-strong` fill (a hole, not a failure) |
| Craft colour | `getWorkDirection(name)` on project discs and team avatars; chrome stays neutral |
| Spacing | `--gd-space-1` 4 · `2` 8 · `3` 12 · `4` 16 · `6` 24 · `8` 32 · `16` 64 |
| Radii | chip 6 · control 10 · card 12 · panel 16 · pill 999 |
| Control heights | 40 default · 36 in cards and thread entries · 32 in dense rows and pagination · 44 on the step pages' inputs |
| Type | 32/600 the step question · 24/600 page title · 20/600 modal title · 16/600 panel head · 15/600 entry title · 14 body · 13 dense · 12 meta · 11/600 `ls .5` table head and caption |

Numbers carry `font-feature-settings: "tnum"`.

---

## 6. States

### Starting a sprint

- **Draft is the resting state.** Every step writes on leave. Closing the tab, going back or
  walking away loses nothing.
- **Resume** (`Lk9Q0`) — a waiting draft is the common case. The page head button reads
  `Continue`, and the draft sits where the running sprint would: stage, sprint number,
  `Draft` chip, the goal so far, which step it was left at, when it was saved, and
  `Continue` + `Discard`. No dates, because day 1 has not happened.
- **Cancel** is on every step and is the only thing that destroys a draft, so it confirms
  (`H3rdHi`). `Discard` on the draft row opens the same dialog. **There is no Cancel
  anywhere on a running sprint** — a paid sprint ends in a verdict, and a team that stops
  working ends at `GoalMissed`. Only an admin can close a stuck sprint.
- **The goal sentence is derived** (`M2CuZ`), not typed: a brief pending state while the
  model writes it (the author is waiting for this one and cannot move on), then the
  generated value with a `Written from your two lists` chip, then the edited face with a 2px
  accent border once corrected. Frozen at payment with the rest of the goal card.
- **Payment** — pending, failed (`nothing was charged`, the draft is kept) and blocked by a
  running sprint live in `mgUfL`. A failure never reaches the success screen.
- **Started / Starting** (`zu2KW`, `Yw91X`) — the flow ends on its own screen carrying
  dates, not congratulation: when the sprint runs to, when each devlog is due, when its
  feedback lands, the scope day, the artifact day, the verdict day. Paddle returns before
  the webhook, so `Starting…` is a real state that settles by itself and says the same
  dates.

### The sprint page

- **One action card**, priority: post this week's devlog → decide what to drop (day 14
  only) → attach the artifact (day 26). With a human curator the call takes the slot on the
  day of the call. Nothing owed, no card.
- **Every action is one press, on the spot**, in a `Modal`, from the card or from the entry.
  The verdict is the exception: a `Drawer` over the curator's list.
- **Devlog feedback** (`ySkh2`) — every devlog is answered. A devlog published today has
  **nothing under it**: no spinner, no placeholder, no "waiting". It is a finished post for
  a day. The feedback appears the next morning and a notification brought the author back.
  The fourth devlog's feedback is folded into the report, and the closed thread says so, so
  the absence does not read as a bug. One anatomy, two sources, the badge says which; the
  author's post stays whole and dominant and the feedback under it can be ignored.
- **Check-ins** — the cell has four answers and one silence:

  | Face | Means |
  |---|---|
  | Filled success tint + check | Confirmed — by a devlog, by an artifact, or by the press |
  | Outlined + dot | Waiting, this week only |
  | Filled `--gd-color-border-strong` | Missed |
  | Faint dash | Not asked yet — a week in the future |
  | **Blank** | **Not on the team**, with `joined 8 Sep` / `left 7 Sep` on the row |

  A missed week and a week somebody was not there must never look alike: the verdict reads
  this matrix, and a member counted absent for weeks they had not joined makes a growing
  team look like a collapsing one. The date sits on the row, not in a tooltip, because it is
  what explains the blanks. The confirmation *source* is in the dot's tooltip — one dot
  shape, so the matrix keeps its glance.

  Work already done counts: anyone who published a devlog or attached an artifact that week
  is confirmed and never asked. The fallback press ("Still on it") goes out at the end of
  the week, only to whoever is left, and disappears once the week is filled.

### Everything else

| Screen | Loading | Empty | Error | Other |
|---|---|---|---|---|
| Sprints list (`THGwT`) | Skeleton of the running card + rows at the loaded height | `EmptyState` + `Start a sprint` | One panel, retry, reference code | Resume; read-only for a member without `sprints.create`; Guests see no tab |
| Sprint page (`qXEDm`) | Real header, three skeleton entries | A sprint always has its day-1 entries | Header usable, thread becomes one panel | Review, Closed, Cancelled draft |
| Artifacts (`mJ7MM`) | Head and group rows real, rows skeletonised at 56 | `EmptyState`, video-first | One panel, "nothing was deleted" | Four check results |
| Advisor list (`AHlwo`) | Card skeleton | "No sprints yet" | One panel | — |

**Artifact check** (`f1L6P`): `Ready`, `Checking…`, `Cannot be opened` (the only one with
an action — the reason and *Replace the link* in a danger strip under its row), `Saved, not
readable`. A row appears as `Checking` on add and settles in place.

**Disabled says why** (`O5gROp`): `IconLock` on the control, the reason in its tooltip,
never a sentence in a box beside it. Drawn for: start a sprint while one is running, write
the verdict before day 28, attach an artifact to a closed sprint, edit the workflow under a
running sprint — the last is too long for a tooltip, so its full refusal is the confirm step
(`rhKOo`).

**Permission denied.** `sprints.view` is every member; Guests see no tab. Without
`sprints.create` the page renders complete and the primary button is absent, not broken.

---

## 7. Copy (Tolgee keys)

Namespace `sprints`.

| Key | English |
|---|---|
| `sprints.tab` | Sprints |
| `sprints.title` | Sprints |
| `sprints.subtitle` | 28 days on one project with a stated goal and a verdict at the end. |
| `sprints.start` | Start a sprint |
| `sprints.start.disabled` | One sprint at a time. This one ends {date}. |
| `sprints.continue` | Continue |
| `sprints.draft.chip` | Draft |
| `sprints.draft.leftAt` | Left at step {step} of 4 — {question} |
| `sprints.draft.saved` | Saved {ago} |
| `sprints.draft.nothingCharged` | Nothing has been charged and no days are counting. |
| `sprints.draft.discard` | Discard |
| `sprints.cancel.title` | Cancel this draft? |
| `sprints.cancel.body` | Everything written on the three steps goes with it, and nothing on this page can bring it back. |
| `sprints.cancel.leaving` | Closing the tab or walking away does not cancel anything — the draft waits in the sprint list. |
| `sprints.cancel.keep` | Keep the draft |
| `sprints.cancel.confirm` | Cancel the draft |
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
| `sprints.start.step4` | Summary and payment |
| `sprints.start.stepOf` | Step {n} of 4 |
| `sprints.start.savedDraft` | Saved as a draft |
| `sprints.start.q1` | What exists today? |
| `sprints.start.q1.hint` | Carried over from your last result card — correct it rather than retype it. |
| `sprints.start.q2` | What must exist on {date} that does not today? |
| `sprints.start.q3` | Who runs the 28 days? |
| `sprints.start.q4` | Ready to start? |
| `sprints.start.outcome.add` | Add an outcome, then press Enter |
| `sprints.start.input.add` | Add a line, then press Enter |
| `sprints.start.goal.label` | The goal, in one sentence |
| `sprints.start.goal.generated` | Written from your two lists |
| `sprints.start.goal.writing` | Writing it… |
| `sprints.start.goal.edited` | Edited by you |
| `sprints.start.check.note` | Checked by the AI curator · advice, not a gate |
| `sprints.start.next1` | Next — what will exist |
| `sprints.start.next2` | Next — who curates |
| `sprints.start.next3` | Next — summary |
| `sprints.start.pay` | Pay and start |
| `sprints.start.pay.note` | Day 1 is the moment the payment lands. |
| `sprints.start.receipts` | Receipts live in Settings → Payments |
| `sprints.start.pending.title` | Waiting for the payment |
| `sprints.start.failed.title` | Nothing was charged |
| `sprints.start.blocked.title` | One sprint at a time |
| `sprints.started.title` | The sprint is running |
| `sprints.starting.title` | The payment is through |
| `sprints.starting.chip` | Starting… |
| `sprints.starting.note` | It becomes active the moment the payment confirms — a few seconds, and it settles by itself. |
| `sprints.started.open` | Open the sprint |
| `sprints.started.date.runs` | The sprint runs. Day 28 is {date}. |
| `sprints.started.date.devlog` | Devlog due. The curator answers it on {date}. |
| `sprints.started.date.scope` | The scope note — the only day the outcome list can change. |
| `sprints.started.date.artifact` | The artifact is asked for. |
| `sprints.started.date.stop` | Collection stops. |
| `sprints.started.date.verdict` | The verdict. |
| `sprints.action.devlog.title` | Post this week's devlog |
| `sprints.action.devlog.cta` | Write the devlog |
| `sprints.action.devlog.note` | The curator reads it and answers the next morning. |
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
| `sprints.checkins.legend.notAsked` | Not asked yet |
| `sprints.checkins.legend.notOnTeam` | Not on the team |
| `sprints.checkins.joined` | joined {date} |
| `sprints.checkins.left` | left {date} |
| `sprints.checkins.confirm` | Still on it |
| `sprints.checkins.source.devlog` | Week {week} · from the devlog of {date} |
| `sprints.checkins.source.artifact` | Week {week} · from the artifact of {date} |
| `sprints.checkins.source.pressed` | Week {week} · confirmed on {date} |
| `sprints.thread.title` | The sprint so far |
| `sprints.thread.feedback` | feedback · {date} |
| `sprints.thread.feedback.folded` | Answered inside the result card — one message on day 28, not two. |
| `sprints.thread.showAll` | Show all |
| `sprints.midnote.title` | Day 14 · half the calendar is gone |
| `sprints.midnote.from` | From the AI curator |
| `sprints.revision.cut` | Cut on day 14 |
| `sprints.result.title` | Result card |
| `sprints.result.sources` | What this verdict was written from |
| `sprints.result.limit` | Frames and a transcript show that a thing exists. They do not show how it plays. |
| `sprints.rating.title` | Was this assessment any use? |
| `sprints.rating.note` | Optional — the sprint is closed either way. |
| `sprints.rating.cta` | Rate it |
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
| `advisor.verdict.guard` | Stage closed needs an artifact or a claimed outcome. |
| `admin.sprints.assign.title` | Assign a curator |
| `admin.sprints.assign.free` | No payment is taken |
| `admin.sprints.locked.title` | This project has a sprint running |

**Notification** — new Novu workflow `sprint-devlog-feedback`, sent the morning after a
devlog: *"The curator has read your devlog"* plus the sprint and week. It must not pretend
to be a person; the badge in the thread says which kind wrote it.

---

## 8. Data needs

1. **Sprint list for a project** — the running or review sprint in full; **any waiting
   draft**, with which step it was left at and when it was saved, so the list can offer
   `Continue`; and the closed ones as a paginated page with a `total`. Plus whether the
   caller may create a sprint and, if not, the blocking sprint's end date for the disabled
   tooltip.
2. **The start flow** — each step is a partial write to the same `Draft` sprint, so the
   endpoint must accept a partial goal card and return the draft's current step. Cancel
   deletes it. The goal sentence is a derived field: a call that takes the two lists and
   returns a sentence, plus a flag for whether the author has since edited it, so the UI can
   tell the generated face from the corrected one.
3. **Sprint detail** — the goal card and which outcomes are claimed, the day-14 revision,
   the check-in matrix as *(member, week, state, source)* including `notOnTeam` with the
   member's join and leave dates, every devlog with its feedback and the date the feedback
   landed, the artifacts with their check result, the mid note, the verdict block. One
   request.
4. **Curator picker** — level, rate, sprints run, stages closed, average rating **and the
   number of ratings**, average suppressed below five. Sorting by stages closed / sprints
   run / rate, never by an average most curators will not have.
5. **Artifacts** — paginated and grouped, with `stageName` and sprint number denormalised,
   the check result, reason and checked-at, and a name derived from the link or file name.
6. **Verdict** — verdict + reasoning; the server enforces the guardrail and refuses before
   day 28.
7. **Rating** — optional, stars and a comment, changeable later.
8. **Payments** — nothing new. A sprint payment is a `Payment` row and appears in
   `PaymentsList` for free; see §9 for the one change it needs.

---

## 9. Money, and the one change to an existing screen

**Money is shown once, before it is spent.** The price appears on the summary step, where
the decision is made, and in the curator picker, where the author is choosing between
prices. After payment nothing mentions a sum: not the list, not the sprint header, not the
thread entry that says the sprint started, not the result card, not the admin's assign
modal.

**Receipts and history are not designed here.** They already exist at
`/user/settings/payments` (`src/components/PaymentsList`, wired in
`SettingsItemClient.tsx`). Step 4 links to it in one line and restates nothing.

**The one change that screen needs:** its Description column renders
`payableType === "VACANCY" ? "Vacancy listing" : r.payableType`, so a sprint payment would
read `SPRINT`. Give it the same treatment as a vacancy — a label (`Sprint`) and the existing
secondary line carrying `title · projectName`, which for a sprint should be the stage and
sprint number plus the project. The Receipt column's `openInvoice` is vacancy-only and can
stay that way until sprints have invoices. That is a small change to an existing screen, not
a new one.

---

## 10. Where the frames depart from `docs/sprints.md`

| Departure | Why |
|---|---|
| **`GoalMissed` is drawn in warning, not danger.** | Red is reserved for destructive and failed platform actions. A missed goal is the starting position of the next sprint. |
| **The day counter is the status, not the word "Active".** | `Day 14 of 28` is the number the author came for. |
| **`Review` is called "Awaiting verdict".** | The enum stays `Review`; the word would suggest the author has something to review. |
| **Past sprints are a table with pagination, not cards.** | Five facts per sprint repeated down a list is table work, and tables in this product paginate. |
| **The artifact description left the row.** | A 56px row is one line; the description is a tooltip. |
| **No call strip in the header for a human curator.** | Five dated items in a header is a second navigation bar. The next call is the action card; the rest are thread entries. |
| **The result card is not a destination.** | It is a `DisclosureSection` inside the verdict thread entry. |
| **The rating is a prompt plus a modal, and optional.** | Answered where it is read, by the same mechanism as every other action. |
| **The check-in block kept its axis.** | Four bare dots with no week heads, no dates, no current-week mark and no legend stopped being readable. Compaction may remove chrome, not the axis of a diagram. |
| **The goal sentence is generated.** | The author has already written the two lists it summarises. |
| **The artifact block is video-first.** | Video is the only kind the platform can read without running anything. |
| **`Introduction` and `Project Completion` were not drawn.** | The frames use Ideation, Concepting, Prototyping and Preparing a release version, where sprints will actually be bought. |

---

## 11. Open questions / assumptions

1. **Team size for pricing is taken at purchase**; the roster is fixed for the sprint.
2. **Call scheduling is not designed** — the picker, the reschedule flow and the calendar
   invitation belong to the human-curator issue.
3. **The AI curator's price ($89) is a placeholder.**
4. **The seeded gate task** reads *"Close the stage with a sprint verdict"*.
5. **The artifact upload limit** is drawn as 200 MB / five minutes. Not verified against
   Sanity or the ffmpeg queue.
6. **`ModernTable` group rows and the failure strip** may need the component extended.
7. **Page sizes** assumed 10 for past sprints, 25 for artifacts.
8. **Timezone**: day numbers computed server-side in one fixed zone and returned with the
   payload.
9. **Responsive layouts were described, not drawn**, except the 820 drawer, which is where
   the check-in name column actually truncates.
