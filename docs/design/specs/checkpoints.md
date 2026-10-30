# Checkpoints

Design handoff for the checkpoint feature (GDHUB-32). Frames live in
[`docs/design/platform-design.pen`](../platform-design.pen); the note `t2TjI` beside them
carries the same rules in short.

Context: [`docs/checkpoints.md`](../../checkpoints.md) is the engineering spec and
[`docs/checkpoint-standard.md`](../../checkpoint-standard.md) is the rulebook an author and a
curator follow. This file only describes what was drawn and where it departs from them.

---

## 1. Problem & user

An indie author on GDHub has a workflow stage and no reason to finish it by any particular
day. A checkpoint is the deadline: 28 days on one project, a goal fixed at the start, a
curator who is either a person or the AI curator, and a verdict at the end — and the verdict
of `StageClosed` is the only thing that lets the project leave its stage. The author buys it,
brings their team, publishes four devlogs and attaches the evidence for each outcome; the
curator reviews each sprint and writes the result card. Three people read these screens: the
**author** (what does this sprint want from me?), the **team member** (one press a sprint),
and the **curator** (which of my checkpoints needs me today, and what am I deciding on).

**A sprint is seven days counted from the day the checkpoint started, not a calendar week.**
It can run Tuesday to Monday. The UI therefore never says "week" — the word is `sprint`
everywhere, and the dates under it say which seven days are meant.

---

## 2. Frames

### The checkpoint page — one page, one path

| Frame | Node id | What it shows |
|---|---|---|
| `Checkpoint — Page · Prepare (buying it, in the page)` | **tmP5M** | The draft state. Sidebar with everything after `Prepare` still grey and undated; the panel holds the purchase — progress `Now · Goal · Curator · When · Payment`, the read-back, the price card and `Pay and start`. |
| `Checkpoint — Prepare · the When step` | **I4Zv4u** | The step added to the flow: a `Segmented` (as soon as the mentor takes it / on a day I choose), the date field, and the calendar that day produces. |
| `Checkpoint — Page · a sprint (Status)` | **JEUs7** | The running page: back button, header, sidebar, the four tabs, the goal strip, the ask panel (`MLWct`), what has happened (`zwRAX`), what the sprint proved (`KOY62`), and the tooltip under the locked `Next checkpoint`. |
| `Checkpoint — Page · Signals, Evidence, Review` | **xgLCq** | The other three tabs (`U0FlOx`, `CyHe5`, `R1nxA`) and the ask panel with nothing left open (`ug19H`), where the forward button unlocks. |
| `Checkpoint — Page · Inputs, and the Checkpoint step` | **NF0Bg** | Inputs before day 1 (`mWnZ8`, human mentor and AI variants), Inputs once the run is under way (`KAQBe`), and the Checkpoint step in its three faces: locked (`Cajz0`), in review (`P7VXRJ`), closed (`fcOsC`). |
| `Modal — Attach evidence` | **IRJ2D** | Pick an artifact the project already has or add a new one, then tick which outcomes it proves. |

### Kept from the first pass, unchanged

| Frame | Node id | Note |
|---|---|---|
| `Checkpoints — List` | **iSVBs** | The active checkpoint as the one filled card, past ones as a paginated table (`G9bfNg`). |
| `Checkpoints — List · empty / loading / error / read-only` | **THGwT** | Includes the resume row for a waiting draft (`Lk9Q0`) and the disabled-control anatomy (`O5gROp`). |
| `Checkpoint — Start · 1 What exists now` | **W76sA5** | **Still the old full-page layout.** Its content is now a question inside the Prepare panel and the frame has not been re-hosted yet. |
| `Checkpoint — Start · 2 What will exist` | **pyT9o** | Same. |
| `Checkpoint — Start · 3 Who curates` | **vE1BQ** | Same — the curator picker with its two ranks. |
| `Checkpoint — Start · the goal sentence is generated` | **M2CuZ** | The derived field: pending, generated, corrected. |
| `Checkpoint — Start · step 4 states` | **mgUfL** | Payment pending, payment failed, blocked by an active checkpoint. The states hold; their host is now the Prepare panel. |
| `Dialog — Cancel this draft?` | **H3rdHi** | The confirm behind Cancel. |
| `Modal — Devlog composer` (reuse DevLogPostModal — do not rebuild) | **IDeWH**, **X0HR8**, **pGE34** | **Not a new modal.** `src/components/modals/DevLogPostModal` already writes a devlog on the project's Devlog tab, EditorJS and all, and posts to `/api/user/project/report`; its handoff is [devlog-composer.md](devlog-composer.md). The checkpoint opens that component and passes the checkpoint it belongs to, which joins the project and stage in the line under the author's name. The three questions a devlog answers stay placeholder text in the editor rather than three new fields. |
| `Modal — Change the scope` | **n5OePF** | Cut, reword, add, and a required `Why`. |
| `Modal — Rate the assessment` | **QVA8m** | Stars and a comment. |
| `Artifacts (/user/project/[slug]/artifacts)` | **Q41zlJ** | The project's artifact store, paginated and grouped. |
| `Artifacts · empty, loading & error` | **mJ7MM** | Plus the artifact-check anatomy (`f1L6P`). |
| `Modal — Add artifact` | **ZKHiF** | antd `Modal`. |
| `Checkpoints — long content, and what gives` | **VKETd** | Truncation decisions. |
| `Advisor — Checkpoints` | **njwBu** | The checkpoints a curator runs. |
| `Advisor — Checkpoints · empty, loading & error` | **AHlwo** | — |
| `Advisor — Write the verdict` | **T2L8W** | antd `Modal` 820, body scrolls. |
| `Modal — Assign a curator (admin)` | **z20Q3F** | — |
| `Dialog — Workflow locked by an active checkpoint (admin)` | **rhKOo** | — |

### Deleted, and why

`Checkpoint — Page · under way (thread)`, `· the action card, and the human curator` and
`· closed` were replaced by the path above; `Modal — Attach evidence` (the first one) by
`IRJ2D`; `Checkpoint — Start · 4 Summary and payment` by the Prepare panel, which carries its
content; `Checkpoint — Started` and `Checkpoint — Starting (webhook not in yet)` because after
payment nothing navigates away — the same page keeps its step and the step becomes Inputs.

### Components (referenced, not copied)

| Component | Node id | Overridable children |
|---|---|---|
| `Verdict status` | **StXPy** | dot `v3xypZ`, label `xcwxi` |
| `Curator badge` | **BYVEs** | AI tile `ow4Me`, avatar `KJMCW`, name `UpgrK`, level `ff5NY` |
| `Pulse cell` | **fHx8c** | check `C59Ux`, dot `qzIrR`, dash `c1TqD` — five faces from one node, see §6 |

---

## 3. Layout

**Shell.** The existing space header bar and tab row, with **Checkpoints** beside Workflow and
**Documents renamed Artifacts**. Frame width 1265, gutter 46, content column 1173. The chrome
is drawn once per group: the list (`iSVBs`), the page (`JEUs7`) and the artifacts table
(`Q41zlJ`) carry it, every derived frame starts at its content.

### The page is a path

The checkpoint page is a sidebar and a panel, the shape of a course: **Prepare/Inputs ·
Sprint 1 · Sprint 2 · Sprint 3 · Sprint 4 · Checkpoint** on the left, and whatever is selected
on the right. It replaced a single scrolling column whose thread grew to a thousand pixels of
history under the one thing the author had to do. A path can be looked at; a thread has to be
read.

**Sidebar** (272, `Sidebar` in the layer tree, label `PATH TO CHECKPOINT`). One row per step:
a 22 glyph, the name, and the dates under it. The glyph is the state — a check in
`--gd-success-tint` for a sprint that is done, a 2px accent ring with a dot for the one
selected, a hollow ring for one still ahead, a lock on `Checkpoint` until the verdict. A
brand dot at the right edge marks a step that wants something from you. The selected row is
the only one on `--gd-color-surface` with a border; the rest are bare.

**The dates live here and nowhere else.** The page header carries the day count
(`Day 14 of 28`) once, the tabs carry the counts, and no panel repeats either. Before the
checkpoint starts the sidebar has no dates at all, because there are none to show.

**Header** — the project-space hero: a 36 back button to the checkpoints list, **Checkpoint 2**
(24/600, `-0.3`), `1–28 Sep 2026 · Prototyping · Day 14 of 28` under it, the curator badge on
the right.

### The first step is the checkpoint being bought

**Prepare and Inputs are one step, not two.** While the checkpoint is a `Draft` the panel
holds the five questions — what exists now, what must exist, who curates, when it starts,
payment — and the step is called **Prepare**. Once it is paid the same step keeps the same
content as a summary and is called **Inputs**. Nothing is entered twice, and there is no
separate route the author leaves the page for.

Everything after it is grey and undated until payment, with one line under the sidebar
saying why: *the dates appear once it is paid and the day it starts is set*.

**The Planning step** (`I4Zv4u`) is new. The author picks one day and is shown the whole
calendar it produces — which days the sprints open on, when each devlog is due, the gathering,
the verdict — because that single date decides 28 days of obligations. With a human curator the
step says plainly that they confirm the day and everything moves with it.

Under the date sits **what the team has to spend on it**: a row per member with the hours a
week they stated in their own profile (`Profile.timeForWork`, a range), the same figure over
the four sprints, and the team's total. Only the author's own line is editable there —
correcting somebody else's availability from a purchase screen would be putting words in their
mouth. It is the one place the 28 days are weighed against the hours that exist.

**The goal sentence leads its question, and the list details it.** "The goal, in one sentence"
sits above the outcome list, not under it, and the list carries a heading and a **Suggest with
AI** button: an author who does not know what to promise gets three to six lines from the
curator, in the form, to edit or throw away. Nothing is suggested on the input question — day
one's list is what the project already has, and nobody needs help remembering that.

**The curator's read happens when the price is on screen.** Not on a button of its own, and not
on the way out of the goal question: by the time the payment question opens, everything the
read depends on has been answered — what exists, what is promised, who curates, and how many
hours the team put in on the Planning question — so that is where it is asked and where the
remark belongs. It appears under *What must exist by day 28*, beside the `Edit` link that goes
back and changes it.

**It is asked again only when the question changed.** The answer is cached against the goal, the
outcome and input lines, and the team's hours; edit any of them and the next visit costs a new
call, come back without touching anything and it does not. It never blocks either: a curator
that cannot be reached must not hold up a purchase, and the remark is advice — the author can
read it and pay anyway.

**The curator picker is a table without a head** (`ak7v2`): everyone who has turned
`Speciality.isOpenForMentoring` on, one row each — avatar, name, level, speciality, a **Talent
card** link that opens `SpecialistPreviewModal`, and the radio at the right end of the row.
Pressing anywhere on the row picks it. The frame draws an hourly rate and a record — *14
checkpoints · 9 closed a stage · 4.6 from 22 ratings* — and neither exists in the data yet:
there is no curator record, and no rate on a speciality. The row shows what is there and the
rest arrives with GDHUB-42 rather than being invented.

**The price is one number.** `Price · $300`, then what the curator does and does not do, the
standard checkbox, and `Pay and start`. The hours-by-rate line and the platform's share came
off: they belong in the contract and the receipt, not on the screen where the decision is made.

### A sprint and its four tabs

Tabs sit at the top of the panel: **Status · Signals · Evidence · Review**, with their counts
beside them (`4/5`, `2`). Under them, Status holds four blocks in this order:

1. **The goal**, one quiet row — target icon, the word `Goal`, the sentence, an info icon.
   It repeats on every sprint deliberately: it is the thing the 28 days are judged against,
   and a sprint is where you forget it. It is **not** shown on Inputs, where the outcome list
   is the subject.
2. **What this sprint asks of you** (`MLWct`) — everything still open, one row each: the
   glyph, the title, an owner tag (`You` · `Curator` · `Team`), the deadline on the right, one
   line of why, and the buttons that answer it. It is an ordinary card. It used to be a tinted
   accent panel with a brand border, which read as an error zone — the emphasis now lives in
   the accent ring on the open row and the words `due today`.
3. **What has happened** (`zwRAX`) — the same sprint's finished facts, check-glyphed, no
   status words. Open above, done below: every fact appears exactly once.
4. **What this sprint proved** (`KOY62`) — the outcomes whose evidence landed inside these
   seven days. Only those: there is no link from an outcome to a sprint, so anything else
   would be a promise the data cannot keep.

**The forward button is the card's footer.** `Open sprint 3` sits in the footer of the ask
panel with the reason beside it, locked while anything above is open and saying what is
missing; on Inputs the same footer says `Start sprint 1`. When the panel empties, the header
reads `nothing open` and the button turns black (`ug19H`). One button, one place, at every
step of the path.

**Signals** is the pulse matrix and nothing else. The per-person list that sat above it was
the matrix written out twice; hovering a cell now gives the name, the sprint, the day it was
marked — or, when it is empty, a `Remind` button (`DJ9fJ`).

**Evidence** is the artifacts bound to an outcome: kind tile, name, `Build · 13 Sep · Priya
Raman`, the line it proves, and the check result on the right. The frame draws a file size in
that line; `ProjectArtifact` does not store one — most artifacts are links rather than
uploads — so the built row carries the kind, the day and who added it. `Attach evidence` in the
footer opens `IRJ2D`. The project's own tab stays **Artifacts** — the store; the sprint's tab
is **Evidence** — what is bound to a line of the goal card.

**Review** is one card, because there is one review per sprint. It reviews the sprint, not the
devlog: the curator's words, dated, and the line it counts against. The day-14 scope note
shows under it, in the sprint the fourteenth day falls in.

### Calls open sprints

Call 1 — the goal — is the start of sprint 1, not a step of Inputs; calls 2, 3 and 4 open
sprints 2, 3 and 4. Until call 1 fixes the goal card, the lines on Inputs stay editable, each
row carrying a pencil and a bin and each list an `Add`. After it they are the record.

**The AI curator holds no calls at all.** With it a sprint opens on the devlog clock and the
copy never implies a conversation happened.

### The Checkpoint step

Three faces, all in `NF0Bg`:

- **Locked** while the 28 days run: a lock tile, `Written on day 28`, and the one useful fact —
  how many outcomes have evidence so far.
- **In review** once day 28 has passed: `The curator is writing it`, in warning tone, saying
  nothing is asked of the author. This is `status: Review`, which the first pass never drew.
- **Closed**: the verdict with its status chip, the result card, the rating prompt, and the
  `Checkpoint 3 starts from here` card.

**`Next checkpoint` is a different kind of button.** The footer buttons move inside one
checkpoint; this one leaves the page for a **new checkpoint at its Prepare step**, which is
bought like the first one. It only carries these outcomes across as the new inputs — the
proven lines with their artifacts, the rest as bare lines. It sits under `Checkpoint` in the
sidebar, locked until the verdict, with the reason in its tooltip.

### Said once, in one place

The first version of these screens said `28 days`, `Day 14 of 28` and `8–14 Sep` on nearly
every card. The rule now: **dates in the sidebar, the day count in the header, counts in the
tabs, and nothing restates them.** Explanations do not sit in the layout either — they are
info icons, and on the canvas each icon layer is *named with the tooltip text it carries*, so
the copy is in the file rather than in someone's memory.

### The two tables are the same table

`DS · 11 Tables`, rule 8, `ModernTable` in code:

| | Past checkpoints (`G9bfNg`) | Artifacts (`Z9yPB5`) |
|---|---|---|
| Card | `--gd-color-surface`, radius 12, clipped, **no outer border** | same |
| Head band | 44 on `--gd-color-surface-sunken`, labels 11/600 uppercase | same |
| Row | 56, padding 16, outer edge 24 | same |
| Divider | `--gd-color-border-subtle`, none on the last row | same |
| Columns | checkpoint 120 · stage 220 · goal fill · dates 150 · verdict 130 · decided by 180 | artifact fill · check 160 · stage · checkpoint 190 · added by 160 · when 100 |
| Paging | **antd pagination** under the card, total on the left. Never `Load more` as well. | same |
| Extra rows | — | group band 40 on `--gd-color-bg-muted`, checkpoint sub-head 32, failure strip on `--gd-danger-tint` |

**Head and body come from one column definition.** In code that is a single `columns` array,
never two lists of widths.

**The checkpoint number runs through the project, not through the stage.** It is the first
column of the past-checkpoints table and the first thing in every meta line —
`Checkpoint 4 · Prototyping · 1–28 Aug 2026` — with the stage as the second column and as
context in the line. Numbering that restarted inside each stage made two different runs share
the name `Checkpoint 1`, which is unusable in a table sorted by date and worse in a verdict
that refers to the checkpoint before it.

### What gives when the content is long (frame `VKETd`)

| Where | What gives |
|---|---|
| Project title + stage + dates on one meta line | Title truncates first, stage second; dates and the status chip never move. |
| The goal sentence | Wraps to three lines where it is the subject; one line with an ellipsis and a `Tooltip` in the Status goal strip, where it is a reference. |
| Sidebar step name + dates | The name never truncates; the dates drop to the second line, which they already occupy. |
| The stage in the past-checkpoints table | The cell is two parts: the stage truncates, `· Checkpoint N` never does. |
| Artifact name, and a raw URL as a name | One line, truncated, full value in a `Tooltip`. A URL has no break opportunity, so it is never wrapped. |
| Pulse matrix, eight members, long names | Sprint columns fixed at 72 and never shrink; the name column is the only elastic one, and the role truncates before the name. |
| An ask row with two buttons | The buttons wrap under the line rather than shrinking; the owner tag never truncates. |
| Verdict reasoning | The field grows to 132 then scrolls; on the Checkpoint step it clamps to six lines with a `Show all`. |

Two mechanics the frames assume: a column width binds only under `table-layout: fixed`, which
antd turns on once `scroll.x` is set — and `scroll.x: "max-content"` defeats truncation, so
both tables pass a number; and truncation inside a flex row needs `min-width: 0` on the parent.

**Breakpoints** were not drawn. Proposed: below 1100 the sidebar becomes a horizontal
`Segmented` above the panel and keeps the same six steps; the artifact table drops *added by*
and *when*.

---

## 4. Components

**Reuse from `src/components/ui`** — `StatusDot` (artifact check result, pulse traffic light),
`IconTile` (40 in ask rows and evidence rows, 44 in empty states), `EmptyState`,
`SectionHeading`, `MetaStat`, `AppAvatar`.

**Reuse `ModernTable`** for both tables: `density="compact"`, antd pagination on,
`scroll={{ x: <number> }}`, `emptyState`. The artifacts table needs group rows and a per-row
expansion for the failure strip; extend the component rather than hand-rolling a second row
anatomy.

**Reuse `DevLogPostModal`** for writing the sprint's devlog, and `PaymentsList` for receipts
(§9). **Reuse `SpecialistPreviewModal`** behind the `Talent card` link in the curator question.

**antd** — `Tabs` (the panel's four), `Modal`, `Segmented` (the When step, the evidence modal),
`DatePicker`, `Checkbox`, `Tooltip` (every disabled reason, every info icon, every truncation),
`Pagination`, `Rate`, `Input`/`Input.TextArea`/`Upload.Dragger`.

**New, proposed paths**

| Path | What it is |
|---|---|
| `src/components/checkpoints/CheckpointPath/` | The sidebar: six steps, glyph states, dates, the attention dot, and the `Next checkpoint` button under it. |
| `src/components/checkpoints/CheckpointPanel/` | The right side: tabs, and which panel a step renders. |
| `src/components/checkpoints/AskPanel/` | The one panel that repeats on every step: open rows with owner tags and their buttons, the footer with the forward action and its locked reason, and the `nothing open` face. |
| `src/components/checkpoints/GoalStrip/` | The goal on one row, with its info icon. |
| `src/components/checkpoints/SprintStatus/` | What has happened + what the sprint proved. |
| `src/components/checkpoints/PulseMatrix/` | Members × 4 sprints, five cell faces, the hover card with `Remind`, joined/left dates, legend. |
| `src/components/checkpoints/EvidenceList/` | Evidence rows and the attach modal. |
| `src/components/checkpoints/EvidenceSlot/` | One line's proof: empty, attached (kind icon + name + check state), or counted by the curator with their note. |
| `src/components/checkpoints/GoalCard/` | Inputs and outcomes, each line with its evidence slot, editable until the goal is agreed, cut outcomes marked, the revision beside the original. |
| `src/components/checkpoints/ResultCard/` | The three columns of a closed checkpoint. |
| `src/components/checkpoints/CuratorBadge/` | AI or person, one component, `kind` prop. |
| `src/components/checkpoints/VerdictChip/` | The three verdicts as tone + label. |
| `src/components/checkpoints/prepare/` | The five questions, the progress bar and the panel footer. |

**Icons — `@tabler/icons-react`** (the canvas draws the nearest Lucide names): `IconFlag`,
`IconTarget`, `IconInfoCircle`, `IconLock`, `IconHourglass`, `IconArrowRight`, `IconArrowLeft`,
`IconCalendar`, `IconVideo`, `IconMessageCircle`, `IconPaperclip`, `IconPencil`, `IconTrash`,
`IconPlus`, `IconBell`, `IconCheck`, `IconStar`, `IconFileText`, `IconPhoto`, `IconPackage`,
`IconChevronDown`/`IconChevronRight`.

---

## 5. Tokens

No literal colour ships from these frames.

| Role | Token |
|---|---|
| Page | `--gd-color-bg` |
| Card, panel, sidebar's selected row | `--gd-color-surface` + `1px --gd-color-card-border`, radius 12 |
| Card head and footer band | separated by `1px --gd-color-border`, not by a fill |
| **The one live item in a list** — active checkpoint, waiting draft, verdict due today | `--gd-color-surface`; everything below it stays outlined |
| Table card | `--gd-color-surface`, radius 12, clipped, no outer border |
| Table head band | `--gd-color-surface-sunken` |
| Table row divider | `--gd-color-border-subtle` |
| Floating — modals, tooltips, the pulse hover card | `--gd-color-surface` + `--gd-elevation-e3`; the dark tooltip is ink with an inverse label; the scrim is ink at 35 % |
| Input fill, segmented track, neutral tile, skeleton | `--gd-fill-base` / `--gd-neutral-100` |
| The open ask, the selected step, the current sprint mark, the progress bar fill | `--gd-color-accent` as a 2px ring, a 4px bar or a dot — **never as a card fill** |
| Owner tag, disabled button | `--gd-color-bg-muted` with `--gd-color-text-secondary` / `--gd-color-text-disabled` |
| Committing button | `colorPrimary` (graphite) |
| **Destructive confirm — the one filled red button** | `--gd-danger-solid`, only in `Dialog — Cancel this draft?` |
| Confirmed pulse, proven outcome, `StageClosed` | `--gd-success-*` |
| `GoalMet` | `--gd-info-*` |
| Waiting for the mentor, `status: Review`, the day-14 note, cut outcome, `GoalMissed`, Quiet | `--gd-warning-*` |
| Artifact "Cannot be opened", failed payment, delete icon | `--gd-danger-*` |
| Missed pulse cell | `--gd-color-border-strong` fill (a hole, not a failure) |
| Craft colour | `getWorkDirection(name)` on project discs and team avatars; chrome stays neutral |
| Spacing | `--gd-space-1` 4 · `2` 8 · `3` 12 · `4` 16 · `6` 24 · `8` 32 · `16` 64 |
| Radii | chip 6 · control 10 · card 12 · pill 999 |
| Statuses | dot 7 + word 12/500, no fill. Tone lives in the dot |
| Control heights | 40 default and in the panel footer · 36 in cards and ask rows · 32 in dense rows, segmented and pagination |
| Fields | Every input, number, select, date picker and text area is antd's `variant="filled"`. An outlined field on a page of filled ones reads as a different form. |
| Type | 24/600 page title · 20/600 modal title · 18/600 step title · 14/600 card head · 14 body · 13 dense and meta lines · 12 tertiary meta · 11/600 `ls .5` caption and table head |

Numbers carry `font-feature-settings: "tnum"`.

---

## 6. States

### Buying it

- **Draft is the resting state.** Every question writes on leave; closing the tab loses
  nothing. The step stays `Prepare` and the sidebar stays undated.
- **Resume** (`Lk9Q0`) — a waiting draft sits in the list where the active checkpoint would,
  with `Continue` and `Discard`. Opening it lands on the page at its Prepare step.
- **Cancel** is the only thing that destroys a draft, so it confirms (`H3rdHi`). **There is no
  Cancel on a paid checkpoint** — it ends in a verdict, and a team that stops working ends at
  `GoalMissed`. Only an admin can close a stuck checkpoint.
- **The goal sentence is derived** (`M2CuZ`), not typed: pending, generated with a
  `Written from your two lists` chip, then the corrected face with a 2px accent border.
- **Payment** — pending, failed (`nothing was charged`, the draft is kept) and blocked by an
  active checkpoint (`mgUfL`). They now render inside the Prepare panel; a failure never
  advances the step.
- **Waiting for the mentor** (`CupoR`) — with a human curator, payment does not start the 28
  days. The ask panel holds one row: the mentor confirms they can run it and sets the day.
  `Start sprint 1` stays locked and says so; the chat is the only action. With the AI curator
  (`RoVRx`) there is nothing to wait for: one row with the date field, and the footer button
  is live.

### The path

- **One ask panel per step, and it empties.** Rows are ordered by who is blocked: yours first,
  then the curator's, then the team's. A row that cannot be acted on yet shows the reason, not
  a dead button. When the last row closes, the footer unlocks and the next step opens — and
  opening it moves the selection there.
- **The forward button never skips work silently.** Its disabled tooltip names what is open,
  in the same words as the row it belongs to.
- **Signals** — the cell has four answers and one silence:

  | Face | Means |
  |---|---|
  | Filled success tint + check | Confirmed — by a devlog, by an artifact, or by the press |
  | Outlined + dot | Waiting, this sprint only |
  | Filled `--gd-color-border-strong` | Missed |
  | Faint dash | Not asked yet — a sprint in the future |
  | **Blank** | **Not on the team**, with `joined 8 Sep` / `left 7 Sep` on the row |

  A missed sprint and a sprint somebody was not there for must never look alike: the verdict
  reads this matrix, and a member counted absent for sprints they had not joined makes a
  growing team look like a collapsing one. The date sits on the row, not in a tooltip. Work
  already done counts: anyone who published a devlog or attached an artifact in that sprint is
  confirmed and never asked.
- **Review** — a sprint with no review yet shows nothing under the tab but the sprint's own
  dates; no spinner and no "waiting", because the curator has a day to write it.

### Everything else

| Screen | Loading | Empty | Error | Other |
|---|---|---|---|---|
| Checkpoints list (`THGwT`) | Skeleton of the running card + rows at the loaded height | `EmptyState` + `Start a checkpoint` | One panel, retry, reference code | Resume; read-only without `checkpoints.create`; Guests see no tab |
| Checkpoint page | Header and sidebar real, the panel skeletonised | A step always has its own content | Sidebar usable, the panel becomes one panel with a retry | Draft, Active, Review, Closed, Cancelled |
| Artifacts (`mJ7MM`) | Head and group rows real, rows skeletonised at 56 | `EmptyState`, video-first | One panel, "nothing was deleted" | Four check results |
| Advisor list (`AHlwo`) | Card skeleton | "No checkpoints yet" | One panel | — |

**Artifact check** (`f1L6P`): `Ready`, `Checking…`, `Cannot be opened` (the only one with an
action — the reason and *Replace the link* in a danger strip under its row), `Saved, not
readable`.

**Disabled says why** (`O5gROp`): `IconLock` on the control, the reason in its tooltip, never a
sentence in a box beside it. Drawn for: start a checkpoint while one is running, the forward
button with work still open, `Next checkpoint` before the verdict, write the verdict before day
28, attach an artifact to a closed checkpoint, edit the workflow under an active checkpoint —
the last is too long for a tooltip, so its full refusal is the confirm step (`rhKOo`).

**Permission denied.** `checkpoints.view` is every member; Guests see no tab. Without
`checkpoints.create` the page renders complete and the primary button is absent, not broken.

---

### The goal chain (GDHUB-125)

Each check is advice, never a block.

| State | Frame | Built in |
|---|---|---|
| Goal outside its stage: a warning line with a flag icon under the goal | `12.10.1d` (`DUZmi`) | `CallRoom/CallGoal.tsx` (`GoalCard`) |
| Task that does not lead to the goal: advice of kind `offGoal`. Same look as the other advice; the note says what the task would have to become | `12.10.1b` (`EcXmU`), task `I3oRe7` | `CallRoom/PlanForm.tsx` (`AdviceLine`) |
| Day 15 before the check: "Save and send to the curator"; confirming is not offered | `12.10.5` (`GZa5e`) | `CuratorReview/PlanFooter.tsx` |
| Day 15 after the check: "Confirm the tasks" | `12.10.5a` (`E8V0vo`) | `CuratorReview/PlanFooter.tsx` |
| The human curator's brief: the goal against its stage, and the `offGoal` tasks | `12.08.10` (`nLpkT`) | `CallRoom/CallBrief.tsx` |

Where the code departs from the frames:

- Frame 12.10.1b labels the add control at the limit "Add task · 5 of 5". The code keeps the plain "Add task", disabled, with its existing tooltip "A checkpoint holds at most 5 tasks".
- The brief puts an `offGoal` task that the sprint review did not discuss in a row of its own, after the discussed tasks. Frame 12.08.10 shows only a task the review discussed.
- With a human curator, the author's draft advice before call 1 drops the stage verdict and the `offGoal` entries. Those reach the curator in the briefs for calls 2 and 4.

### Four lenses on a review (GDHUB-126)

An AI review reads the sprint through four lenses, each in an outlined card with the lens's icon in its heading:

- **Development** (`IconCode`): the tasks with their evidence, "Nothing to show yet", then "Outside the tasks".
- **Marketing** (`IconSpeakerphone`).
- **Team** (`IconUsers`).
- **Project management** (`IconListCheck`).

The cards sit between "How Sprint N went" and "Focus for Sprint N".

| State | Frame | Built in |
|---|---|---|
| Review tab with the four lens cards | `12.10.3` (`lmi8y`), cards `lyEkF` `Mqr2V` `ISAXP` `H5h8e` | `CallRoom/CallNotes.tsx` (`NotesSummary`, `Lens`) |
| Marketing at full weight, with the period's devlogs, their applause and views, and the store link | `12.10.3m` (`HROTl`) | the same `Lens`; its text comes from the model |
| The human curator's brief: Marketing, Team and Project management | — (the same cards) | `CallRoom/CallBrief.tsx` |

Where the code departs from the frames:

- Frame 12.10.3m draws the devlogs of the period as a table. The code shows the Marketing lens as the model's text, which names the devlogs with their applause and views; there is no separate table yet. The numbers reach the model through `curatorMarketing`.
- Call notes from a human call keep the old layout ("What was discussed", "Outside the plan"). Only an AI review carries `lenses`.

## 7. Copy (Tolgee keys)

Namespace `checkpoints`. Keys from the first pass that named weeks, the thread or devlog
feedback are gone; what replaces them is below.

| Key | English |
|---|---|
| `checkpoints.tab` | Checkpoints |
| `checkpoints.subtitle` | 28 days on one project with a stated goal and a verdict at the end. |
| `checkpoints.start` | Start a checkpoint |
| `checkpoints.start.disabled` | One checkpoint at a time. This one ends {date}. |
| `checkpoints.continue` | Continue |
| `checkpoints.back` | Back to checkpoints |
| `checkpoints.status.day` | Day {day} of 28 |
| `checkpoints.status.awaitingVerdict` | Awaiting verdict |
| `checkpoints.header.meta` | {from} – {to} · {stage} · Day {day} of 28 |
| `checkpoints.meta` | Checkpoint {n} · {stage} · {from} – {to} |
| `checkpoints.past.title` | Past checkpoints |
| `checkpoints.past.column.checkpoint` | CHECKPOINT |
| `checkpoints.past.column.stage` | STAGE |
| `checkpoints.past.column.goal` | GOAL |
| `checkpoints.past.column.dates` | DATES |
| `checkpoints.past.column.verdict` | VERDICT |
| `checkpoints.past.column.decidedBy` | DECIDED BY |
| `checkpoints.past.total` | {count, plural, one {# closed checkpoint} other {# closed checkpoints}} |
| `checkpoints.name` | Checkpoint {n} |
| `checkpoints.path.label` | Path to checkpoint |
| `checkpoints.path.prepare` | Prepare |
| `checkpoints.path.inputs` | Inputs |
| `checkpoints.path.sprint` | Sprint {n} |
| `checkpoints.path.checkpoint` | Checkpoint |
| `checkpoints.path.undated` | The dates appear once it is paid and the day it starts is set. |
| `checkpoints.tab.status` | Status |
| `checkpoints.tab.signals` | Signals |
| `checkpoints.tab.evidence` | Evidence |
| `checkpoints.tab.review` | Review |
| `checkpoints.goal.label` | Goal |
| `checkpoints.goal.info` | Written on day 1 and agreed with the curator. It does not change for the rest of the checkpoint. |
| `checkpoints.asks.title` | What this sprint asks of you |
| `checkpoints.asks.titleCheckpoint` | What this checkpoint asks of you |
| `checkpoints.asks.open` | {count} open |
| `checkpoints.asks.none` | nothing open |
| `checkpoints.asks.noneTitle` | Nothing is waiting on anyone |
| `checkpoints.asks.owner.you` | You |
| `checkpoints.asks.owner.curator` | Curator |
| `checkpoints.asks.owner.mentor` | Mentor |
| `checkpoints.asks.owner.team` | Team |
| `checkpoints.asks.owner.both` | Both |
| `checkpoints.asks.dueToday` | due today |
| `checkpoints.happened.title` | What has happened |
| `checkpoints.proved.title` | What this sprint proved |
| `checkpoints.proved.info` | An outcome appears here when the artifact that claims it landed inside this sprint. The full list lives under Inputs. |
| `checkpoints.forward.startSprint` | Start sprint 1 |
| `checkpoints.forward.openSprint` | Open sprint {n} |
| `checkpoints.forward.locked` | Sprint {n} runs {from} – {to}. It opens once everything above is answered. |
| `checkpoints.forward.ready` | Sprint {n} runs {from} – {to}. Opening it moves you there. |
| `checkpoints.prepare.step.now` | Now |
| `checkpoints.prepare.step.goal` | Goal |
| `checkpoints.prepare.step.curator` | Curator |
| `checkpoints.prepare.step.planning` | Planning |
| `checkpoints.prepare.step.payment` | Payment |
| `checkpoints.prepare.stepOf` | Step {n} of 5 |
| `checkpoints.prepare.savedDraft` | Saved as a draft |
| `checkpoints.prepare.q1` | What exists today? |
| `checkpoints.prepare.q2` | Where do you want the project to be in 28 days? |
| `checkpoints.prepare.q3` | Who runs the 28 days? |
| `checkpoints.prepare.q4` | When do you want to start? |
| `checkpoints.when.asap` | As soon as the mentor takes it |
| `checkpoints.when.pick` | On a day I choose |
| `checkpoints.when.asapAi` | As soon as it is paid |
| `checkpoints.when.startsOn` | Starts on |
| `checkpoints.when.runs` | Runs {from} – {to} |
| `checkpoints.when.calendar` | Sprint 1 opens with call 1 on {d1}, then {d2}, {d3} and {d4}. Devlogs fall on {v1}, {v2}, {v3} and {v4}, the shared gathering on {g}, and the verdict is written by {verdict}. |
| `checkpoints.when.mentorConfirms` | {name} confirms the day when they take the checkpoint. If they move it, every date above moves with it and you are told. |
| `checkpoints.price.label` | Price |
| `checkpoints.pay` | Pay and start |
| `checkpoints.pay.terms` | I have read the checkpoint standard and accept it — including what is not guaranteed. |
| `checkpoints.pay.receipts` | Receipts live in Settings → Payments |
| `checkpoints.waiting.title` | {name} has not taken these 28 days yet |
| `checkpoints.waiting.body` | They confirm they can run it and set the day it starts. You are told the moment they answer, and nothing is charged again. |
| `checkpoints.waiting.chat` | Open the chat |
| `checkpoints.call.title` | Call {n} — {topic} |
| `checkpoints.call.cta` | Join the call |
| `checkpoints.call.noTime` | The link appears here once the mentor sets the time. |
| `checkpoints.call.opensSprint` | Sprint {n} opens with call {n}. |
| `checkpoints.inputs.existed` | What existed on day 1 |
| `checkpoints.inputs.carried` | from checkpoint {n} |
| `checkpoints.inputs.proven` | proven |
| `checkpoints.inputs.stated` | stated |
| `checkpoints.inputs.addLine` | Add a line |
| `checkpoints.outcomes.title` | Outcomes |
| `checkpoints.outcomes.notAgreed` | {count} lines · not agreed yet |
| `checkpoints.outcomes.add` | Add an outcome |
| `checkpoints.outcomes.draftNote` | A draft until call 1, which opens sprint 1. The mentor fixes it there, and from then it is what the verdict is written against. |
| `checkpoints.devlog.published` | Devlog published |
| `checkpoints.devlog.write` | Write the devlog |
| `checkpoints.review.title` | The curator's review of the sprint |
| `checkpoints.review.in` | The review for the sprint is in |
| `checkpoints.review.counts` | Counts against: {outcome} |
| `checkpoints.midnote.title` | Day 14 — the scope note |
| `checkpoints.scope.check` | Check the scope |
| `checkpoints.scope.cta` | Change the outcomes |
| `checkpoints.scope.keep` | Leave the list as it is |
| `checkpoints.scope.chip.cut` | Comes off |
| `checkpoints.scope.chip.reworded` | Reworded |
| `checkpoints.scope.chip.added` | New |
| `checkpoints.evidence.attached` | Attached this sprint |
| `checkpoints.evidence.attach` | Attach evidence |
| `checkpoints.evidence.proves` | Proves: {outcome} |
| `checkpoints.evidence.whatItProves` | What it proves |
| `checkpoints.evidence.pick` | From this project |
| `checkpoints.evidence.add` | Add a new one |
| `checkpoints.evidence.multi` | One artifact can prove more than one outcome. |
| `checkpoints.evidence.empty` | No evidence yet |
| `checkpoints.evidence.due` | Proof at the end |
| `checkpoints.evidence.accepted` | Counted by the curator |
| `checkpoints.signals.title` | Team signals |
| `checkpoints.signals.info` | One press per person per sprint. Hover a cell for the day it was marked, or to remind whoever has not. |
| `checkpoints.signals.marked` | Marked {date} |
| `checkpoints.signals.notYet` | Not yet |
| `checkpoints.signals.remind` | Remind |
| `checkpoints.signals.closes` | Asked on {date} · the sprint closes on {day} |
| `checkpoints.signals.legend.confirmed` | Confirmed |
| `checkpoints.signals.legend.waiting` | Waiting |
| `checkpoints.signals.legend.missed` | Missed |
| `checkpoints.signals.legend.notAsked` | Not asked yet |
| `checkpoints.signals.legend.notOnTeam` | Not on the team |
| `checkpoints.signals.quiet` | Two missed in a row reads as quiet |
| `checkpoints.verdict.title` | The verdict |
| `checkpoints.verdict.locked` | Written on day 28 |
| `checkpoints.verdict.lockedNote` | {done} of {total} outcomes has evidence against it so far. |
| `checkpoints.verdict.review` | The curator is writing it |
| `checkpoints.verdict.reviewNote` | The 28 days are over and the last devlog is in. Nothing is asked of you until the verdict lands. |
| `checkpoints.verdict.stageClosed` | Stage closed |
| `checkpoints.verdict.goalMet` | Goal met |
| `checkpoints.verdict.goalMissed` | Goal missed |
| `checkpoints.result.title` | The result card |
| `checkpoints.result.column.planned` | PLANNED ON DAY 1 |
| `checkpoints.result.column.changed` | WHAT CHANGED |
| `checkpoints.result.column.came` | WHAT CAME OF IT |
| `checkpoints.rating.title` | Rate the assessment |
| `checkpoints.rating.q` | How was the curator? |
| `checkpoints.rating.cta` | Rate |
| `checkpoints.next.title` | Checkpoint {n} starts from here |
| `checkpoints.next.body` | It opens the steps of a new checkpoint with these outcomes already filled in as its inputs: the proven lines with their artifacts, the rest as bare lines you can edit or drop. |
| `checkpoints.next.info` | A new checkpoint is bought like the first one. The goal, the curator and the price are all asked again. |
| `checkpoints.next.cta` | Next checkpoint |
| `checkpoints.next.locked` | Opens when the verdict is in. |

`artifacts.*`, `advisor.*` and `admin.*` keys are unchanged from the first pass.

**Notification** — Novu workflow `checkpoint-sprint-review`, sent when a review lands: *"The
curator has reviewed sprint {n}"* plus the checkpoint. It must not pretend to be a person; the
badge says which kind wrote it.

---

## 8. Data needs, and where the schema is short

The mapping is direct except where noted. `ProjectCheckpoint` carries `goal`, `status`,
`startedAt`/`dueAt`, `curatorKind`/`curatorId`, `midNote`, `revisedAt`/`revisedNote`,
`verdict`/`verdictNote`/`decidedAt`/`decidedById`, `goalAgreedAt`/`goalAgreedById`, and hangs
`items`, `pulses`, `reports`, `artifacts` and `feedback` off itself.

1. **The path is derived from one date.** Sprint N is `[startedAt + 7(N-1), startedAt + 7N)`.
   `CheckpointPulse` already stores `week 1..4`; devlogs and artifacts do not, so they are
   bucketed by `publishedAt` / `createdAt`. **Accepted consequence:** an artifact uploaded on
   day 15 for something promised in sprint 2 shows under sprint 3. Everything uploaded inside
   the checkpoint's window and bound to an item is evidence regardless of which sprint it
   lands in.
2. **The Status tab has no storage of its own.** Each row is computed: the sprint's devlog
   (`reports` in the window), its review (below), the scope check
   (`midNote != null && revisedAt == null`), the team's marks (`pulses` for that sprint). The
   owner tag is a constant per row type, not a field.
3. **Evidence** is `ProjectArtifact` with `checkpointId` set, its `checkStatus` / `checkedAt` /
   `checkNote`, and `checkpointItems` — the reverse side of `CheckpointItem.artifactId`, which
   is what lets one artifact prove several outcomes. The attach modal writes that link.
4. **Inputs and outcomes** are `CheckpointItem` with `kind`. The result card reads
   `originalText ?? text` for *planned*, `cut` / `addedAt` / a non-null `originalText` plus
   `revisedNote` for *what changed*, and `artifact` + `note` + `acceptedNote` for *what came of
   it*. Editability is `goalAgreedAt == null`.
5. **Rating** is `CheckpointFeedback`, unique per checkpoint, `rating 1..5` — read by admins
   only, so the page writes it and never shows it back.
6. **Curator picker** — level, rate, checkpoints run, stages closed, average rating **and the
   number of ratings**, average suppressed below five.
7. **Artifacts page** — paginated and grouped, `stageName` and checkpoint number denormalised.
8. **Payments** — a checkpoint payment is a `Payment` row and appears in `PaymentsList` for
   free; see §9.

**Four things the schema cannot hold yet.** Each is a change in
[`gdhub-prisma`](https://github.com/gdhub-io/gdhub-prisma), not here:

| Missing | Why the drawing needs it |
|---|---|
| **A review per sprint** | The curator's words live on `ProjectReport.curatorFeedback` — a field on the devlog. A sprint with no devlog has nothing to hang a review on, and the curator reviews it anyway. Proposed: `CheckpointSprintReview { checkpointId, sprint 1..4, text, createdAt, authorId }`, unique on `(checkpointId, sprint)`, shaped like `CheckpointPulse`. |
| **Calls** | Five consultations are in the standard and now open sprints, but no field holds a time, a join link or the fact one was held. Proposed: `CheckpointCall { checkpointId, number 1..5, startsAt, joinUrl, heldAt }`, unique on `(checkpointId, number)`. |
| **A mentor taking it** | `status` has no state between `Draft` and `Active`, and nothing records a human curator accepting, declining, or proposing another day. Today it can only be inferred from `curatorKind = Human && startedAt == null`. |
| **A sprint being opened** | The forward button is an explicit act; the data only has dates. If a sprint may be opened early — or at all — it needs `currentSprint Int` on the checkpoint, or a row per sprint. |

---

## 9. Money, and the one change to an existing screen

**Money is shown once, before it is spent** — on the payment question, and in the curator
picker where the author is choosing between prices. After payment nothing mentions a sum: not
the list, not the header, not the result card, not the admin's assign modal.

**The price is a single number.** The hours-by-rate line and the platform's percentage came
off the card: what the split is belongs in the terms document and the receipt, not on the
screen where the author decides.

**Receipts are not designed here.** They exist at `/user/settings/payments`
(`src/components/PaymentsList`). The payment question links to it in one line.

**The checkout is Stripe**, in its sandbox first — not the Paddle that paid vacancy listings
go through. Nothing on these screens depends on which it is: the question reads back what is
being bought, takes the tick, and hands over. The provider shows up in the `Payment` row and
in the webhook that flips the checkpoint to `Active`.

**The one change that screen needs:** its Description column renders
`payableType === "VACANCY" ? "Vacancy listing" : r.payableType`, so a checkpoint payment would
read `CHECKPOINT`. Give it the same treatment — a label (`Checkpoint`) and the secondary line
carrying the stage, checkpoint number and project.

---

## 10. Where the frames depart from `docs/checkpoints.md` and the standard

| Departure | Why |
|---|---|
| **The page is a path, not a thread.** | A running checkpoint was one scrolling column with a history thread under the action card. History is now filed under the sprint it happened in, and the page opens on the step that wants something. |
| **The UI never says "week".** | A sprint is seven days from the start date and can run Tuesday to Monday. `Sprint 2 · 8–14 Sep` is exact; `week 2` is not. |
| **One review per sprint, not an answer per devlog.** | The curator reviews the sprint's work. With no devlog there is still a sprint to review — which is also why the schema needs §8. |
| **Buying the checkpoint is a step of the page.** | Four separate routes plus two post-payment screens were three places the author could be while owning one draft. Prepare is that draft, and it becomes Inputs when it is paid. |
| **A fifth question: when it starts.** | The start date decides 28 days of obligations and was previously implied by the moment the payment landed. |
| **Calls open sprints.** | Consultation 1 is day 1 — the first day of sprint 1 — so the call belongs to the sprint, not to the setup step before it. |
| **The action card is a card, not an alert.** | A tinted accent panel with a brand border read as an error. The urgency is one accent ring and the words `due today`. |
| **Explanations are info icons.** | Sentences of guidance in the layout are noise on the second reading; the tooltip is there on the first. |
| **`GoalMissed` is drawn in warning, not danger.** | Red is reserved for destructive and failed platform actions. A missed goal is the starting position of the next checkpoint. |
| **The day counter is the status, not the word "Active".** | `Day 14 of 28` is the number the author came for. |
| **`Review` is called "Awaiting verdict" in lists, and drawn as a state on the page.** | The enum stays `Review`; the word would suggest the author has something to review. |
| **Past checkpoints are a table with pagination, not cards.** | Five facts per checkpoint repeated down a list is table work. |
| **The goal sentence is generated.** | The author has already written the two lists it summarises. |
| **`Introduction` and `Project Completion` were not drawn.** | The frames use Ideation, Concepting, Prototyping and Preparing a release version. |

---

## 11. Open questions / assumptions

1. **Start questions 1–3 are still the old full-page frames** (`W76sA5`, `pyT9o`, `vE1BQ`).
   Their content is unchanged and is what the built Prepare panel renders; the frames have not
   been redrawn inside the panel.
2. **The goal card cannot be edited after payment yet.** `PUT /api/checkpoint/[id]` refuses
   anything that is not a `Draft`, so the Inputs step is a record from the moment it is bought.
   The standard fixes the card on call 1, not at checkout, so the lines should stay editable
   until `goalAgreedAt` — that needs the endpoint to allow item edits on an `Active` checkpoint
   and belongs with the calls (GDHUB-42).
3. **`Remind` on a pulse cell is drawn but not wired.** Sending the ask is the cron and
   notification work of GDHUB-35; the hover card shows the day it was marked or the absence,
   and the button arrives with the sender behind it.
4. **The four schema changes in §8** are unresolved and block parts of this: the per-sprint
   review and the calls in particular. Until the first lands, Review reads the answer written
   on the sprint's devlog.
5. **Call scheduling is not designed** — the picker, the reschedule flow and the calendar
   invitation belong to the human-curator issue. The page assumes a time and a link arrive.
6. **Team size for pricing is taken at purchase**; the roster is fixed for the checkpoint.
7. **The AI curator's price is a placeholder.**
8. **The artifact upload limit** is drawn as 200 MB / five minutes, unverified.
9. **Page sizes** assumed 10 for past checkpoints, 25 for artifacts.
10. **Timezone**: the day number and the sprint boundaries are computed server-side in one
    fixed zone and returned with the payload. A sprint that shifts by a day in the client's
    zone would move a devlog into the wrong sprint.
11. **Responsive layouts were described, not drawn**, including the sidebar's collapse to a
    `Segmented` below 1100.
