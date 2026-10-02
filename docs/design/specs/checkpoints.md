# Checkpoints

Design handoff for the checkpoint feature (GDHUB-32). Frames live in
[`docs/design/platform-design.pen`](../platform-design.pen), row **Checkpoints** (note
`Q7aMs6`, at the bottom of the canvas).

Context: [`docs/checkpoints.md`](../../checkpoints.md) is the engineering spec and
[`docs/checkpoint-standard.md`](../../checkpoint-standard.md) is the rulebook an author and a
curator follow. This file only describes what was drawn and where it departs from them.

---

## 1. Problem & user

An indie author on GDHub has a workflow stage and no reason to finish it by any particular
day. A checkpoint is the deadline: 28 days on one project, a goal fixed on day 1, a curator who
is either a person or the AI curator, and a verdict at the end — and the verdict of
`StageClosed` is the only thing that lets the project leave its stage. The author buys it,
brings their team, publishes four devlogs and attaches the evidence for each outcome; the curator answers
every devlog, writes the day-14 scope note and the result card. Three people read these
screens: the **author** (does the checkpoint own my week?), the **team member** (one press a
week, and only when the week has no work in it), and the **curator** (which of my checkpoints
needs me today, and what am I deciding on).

---

## 2. Frames

### Starting a checkpoint — four routes under `/checkpoints/new`

| Frame | Node id | Route |
|---|---|---|
| `Checkpoint — Start · 1 What exists now` | **W76sA5** | `/checkpoints/new/inputs` |
| `Checkpoint — Start · 2 What will exist` | **pyT9o** | `/checkpoints/new/outcomes` |
| `Checkpoint — Start · 3 Who curates` | **vE1BQ** | `/checkpoints/new/curator` — the picker owns this page |
| `Checkpoint — Start · 4 Summary and payment` | **B2XH9** | `/checkpoints/new/pay` — the read-back and the only price |
| `Checkpoint — Started` | **zu2KW** | `/checkpoints/new/started` — dates, and the way into the checkpoint |
| `Checkpoint — Starting (webhook not in yet)` | **Yw91X** | **Not the same screen.** For the seconds before the webhook lands there is nothing true to show — no start date, no devlog dates, no day 1 — so the page is one centred block: a spinner tile, `Waiting for the payment`, one line saying it settles by itself, and `Open the checkpoint` **disabled** beside `Back to checkpoints`. The dates arrive with the webhook, on `zu2KW`. |
| `Checkpoint — Start · the goal sentence is generated` | **M2CuZ** | the derived field: pending, generated, corrected |
| `Checkpoint — Start · step 4 states (paying, failed, blocked)` | **mgUfL** | payment pending, payment failed, blocked by an active checkpoint |
| `Dialog — Cancel this draft?` | **H3rdHi** | the confirm behind Cancel, and behind Discard in the list |

### The project space

| Frame | Node id | What it shows |
|---|---|---|
| `Checkpoints — List (/user/project/[slug]/checkpoints)` | **iSVBs** | The active checkpoint as the one filled card, past checkpoints as a paginated table (`G9bfNg`), `Start a checkpoint` disabled with a lock. |
| `Checkpoints — List · empty / loading / error / read-only` | **THGwT** | The other states, the **resume** row for a waiting draft (`Lk9Q0`), the disabled-control anatomy (`O5gROp`) and the status slot's three faces (`tRD1y`). |
| `Checkpoint — Page · under way (thread)` | **HyaoU** | Header (`EmngL`), one action card (`HWAbn`), collapsed goal (`oN1w6`), pulse matrix (`FNLeJ`), thread (`NrVfd`). |
| `Checkpoint — Page · the action card, and the human curator` | **FlHcv** | The four action cards in priority order — including `Agree the goal card` (`TqNE8`), the day-1 one — the no-card state, the human curator, the pulse fallback (`MtH0K`), and the devlog-feedback anatomy (`ySkh2`). |
| `Checkpoint — Page · closed` | **qXEDm** | Closed header, the verdict entry with the result card inside it, the rating prompt (`z1bR2`), loading and error. |
| `Modal — Devlog composer` (reuse DevLogPostModal — do not rebuild) | **IDeWH**, **X0HR8**, **pGE34** | **Not a new modal.** `src/components/modals/DevLogPostModal` already writes a devlog on the project's Devlog tab, EditorJS and all, and posts to `/api/user/project/report`; its handoff is [devlog-composer.md](devlog-composer.md). The checkpoint opens that component and passes the checkpoint it belongs to, which joins the project and stage in the line under the author's name. The three questions a devlog answers stay placeholder text in the editor rather than three new fields. |
| `Modal — Change the scope (day 14)` | **n5OePF** | antd `Modal`. Three moves on one screen: **cut** a line (warning tint, a `Comes off` status), **reword** one (the new text with `was: …` under it and a `Reworded` status) and **add** one (`success` tint, `New`), plus `Add an outcome` under the list and a required `Why`. Cutting by deleting the line is not offered — a smaller promise is recorded as a rewording so the day-1 wording survives. |
| `Modal — Rate the assessment` | **QVA8m** | antd `Modal`: stars and a comment. |
| `Modal — Attach evidence` | **QuyrC** | Opened from an evidence slot. A `Segmented` with two faces: **From this project** — search plus the project's artifacts as radio rows (icon tile, name, `kind · added · stage · checkpoint`) — and **Add a new one**, which is the existing Add-artifact form. Under it one optional line from the author about what landed. The footer says an artifact can prove more than one outcome. |
| `Artifacts (/user/project/[slug]/artifacts)` | **Q41zlJ** | The renamed Documents tab as a paginated table (`Z9yPB5`), grouped by stage → checkpoint → date, with the check result per row. |
| `Artifacts · empty, loading & error` | **mJ7MM** | Empty, skeleton, error, and the artifact-check anatomy (`f1L6P`). |
| `Modal — Add artifact` | **ZKHiF** | antd `Modal`. |
| `Checkpoints — long content, and what gives` | **VKETd** | The seven places these screens break under real strings, and the decision for each. |

### The advisor space

| Frame | Node id | What it shows |
|---|---|---|
| `Advisor — Checkpoints (/advisor/checkpoints)` | **njwBu** | The checkpoints they run; the one needing a verdict is the filled card. |
| `Advisor — Checkpoints · empty, loading & error` | **AHlwo** | No checkpoints yet — the normal state for a new curator — skeleton, error. |
| `Advisor — Write the verdict (over the checkpoints list)` | **T2L8W** | antd `Modal` (820, body scrolls) over their own list. Modal `YjDna`, scrim `L3no4`. Everything in this product is a modal; the verdict does not get a drawer for being important. |

### Admin

| Frame | Node id | What it shows |
|---|---|---|
| `Modal — Assign a curator (admin)` | **z20Q3F** | Administrative band, checkpoint identity, kind, user picker, "no payment is taken", required reason. |
| `Dialog — Workflow locked by an active checkpoint (admin)` | **rhKOo** | The refusal, naming the checkpoint and its end date. |

### Components (referenced, not copied)

| Component | Node id | Overridable children |
|---|---|---|
| `Verdict status` | **StXPy** | dot `v3xypZ`, label `xcwxi`. Renamed from `Verdict chip`: a verdict is a status, so it is a dot and a word, not a tinted pill. |
| `Curator badge` | **BYVEs** | AI tile `ow4Me`, avatar `KJMCW`, name `UpgrK`, level `ff5NY`. |
| `Pulse cell` | **fHx8c** | check `C59Ux`, dot `qzIrR`, dash `c1TqD` — five faces from one node, see §6. |

---

## 3. Layout

**Shell.** Project space: the existing space header bar and tab row, with **Checkpoints**
inserted beside Workflow and **Documents renamed Artifacts**. Frame width 1265, gutter 46,
content column 1173. Advisor space: the existing `/advisor/*` nav with a **Checkpoints** tab.

**The chrome is drawn once per group, not on every frame.** The header bar and tab row live on
the first frame of each group — the list (`iSVBs`), the page (`HyaoU`), the artifacts table
(`Q41zlJ`) and step 1 of starting (`W76sA5`). Every derived frame — the other steps, the
post-payment screens, the state sheets — starts at its content. Six copies of the same nav
were 192 nodes that said nothing, and a canvas is read by what differs between frames.
The same rule killed the full copy of the curator's list under the verdict modal in `T2L8W`:
a scrim over a duplicate is still a duplicate.

**The checkpoint page carries no back link and no progress bar.** The tab row is the way
back, and the day is already stated twice — `Day 14 of 28` in the header's secondary line and
the deadline on the action card. A third rendering of the same number is decoration.

### Starting a checkpoint

One question per page, each a real route, each writing to the `Draft` checkpoint as it is left.
Progress across the top (four segments plus "Step N of 4"), the question at 32/600, the
answer under it, and a footer bar: `Cancel` and `Back` on the left, the forward action on
the right.

**"Saved as a draft" sits in the footer, immediately left of the forward button.** It
reports the state of the thing the button is about to advance, so it belongs next to it,
not up in the progress meta where it reads as a caption of the step number. Quiet type,
`--gd-color-text-tertiary`, no icon; it appears after the first write and does not move
the buttons when it does.

**Step 1 arrives carrying the last checkpoint forward.** Where a previous checkpoint exists,
its outcomes are the new inputs — proven ones with their artifact already in the evidence
slot, missed or cut ones as bare lines — and every one of them is an editable field with a
delete beside it. The author corrects a list rather than facing an empty one, which is the
step people abandon.

**The pages are mostly empty and that is correct.** One question, room to answer it, and no
summary of the previous steps repeated on any of them — everything is shown back on step 4,
each block with an `Edit` link to the step that owns it. Step 3 is the heaviest page because
the curator picker now lives there rather than in a modal.

**Step 2 says out loud that the list is a draft.** Under the outcomes, an info line: the
curator goes through it on day 1 and cuts it to what 28 days hold, and it is fixed after that
call — not at checkout. Without it a first-time author types "a finished game", pays, and
finds out four weeks later. The same modal day 14 uses reopens for that call, so no second
editor is drawn.

**Every line on steps 1 and 2 carries an evidence slot** — a trailing control on the row,
between the text field and the delete button. On step 1 it is filled where the line came
from an artifact the project already has, and pressing it opens the attach modal. On step 2
every slot is empty, muted, and reads `Proof at the end` — it names the obligation rather than reporting an absence, because on day 1 there is nothing to report — that emptiness is the point of
the screen, not a defect to design away. The row is text field (fill) · slot (auto) ·
delete (36), and the slot truncates to the artifact name with a `Tooltip`, never wraps.

**Step 3 has two ranks, not one.** Choosing *what kind of curator* is the decision; picking
*which person* follows from it. They were drawn as the same object — outlined cards, same
radius, same selected treatment — so the page read as one long list of equal choices. Now:
the two kind options are cards at padding 20 with a 44 tile and a line of explanation under
the name, and the people below them are rows inside **one** panel (`--gd-color-surface`,
radius 12, one border, `--gd-color-border-subtle` dividers, no per-row outline), under a
quiet `CURATORS FOR THIS STAGE` label. The selected row takes the accent fill and the radio;
it no longer takes a 2px brand border, which now means "the decision above".

**Each curator row carries a `Talent card` link**, left of the radio. Choosing a curator and
reading about one are different intentions, and a row that only selects forces the author to
guess from three chips. The link opens the existing `SpecialistPreviewModal`
(`src/components/modals/SpecialistPreviewModal`, `specialistId` + `open` + `onCancel`) — the
same card the rest of the product shows for a specialist. Pressing it must not select the row.

**Step 4 says what the money does not buy, and the author ticks it.** Under the price
breakdown, inside the same card, a muted block titled *What the curator does*: one line with
a check — five consultations, an answer to every devlog, a verdict by day 30 — and two with
a dash — not the game itself, and no promise that the goal is met. Under it a checkbox: *I
have read the checkpoint standard and accept it — including what is not guaranteed*, with
`checkpoint standard` linking to the standard. **The copy is not the agreement**: a real terms document for a paid checkpoint — refunds, a curator who disappears, who owns what the team makes — is a separate issue, and the link points at the standard until it exists. **`Pay and start` is disabled until it is
ticked**, with a `Tooltip` saying why. It protects both sides: the author is told they are
buying guidance and not a finished demo, and the curator is not blamed for a verdict that
records a team which stopped working. `acceptedStandardAt` and the version are stored, see
`docs/checkpoints.md` §11.

**The dates on `Checkpoint — Started` are an antd `Timeline`.** Nine items, one per date,
`Timeline.Item` with the date as the item title and the sentence under it; the first dot is
filled in the brand colour and the rest are outlined. It was a flat list of date/text pairs,
which reads as a table of unrelated facts — the point of the screen is that these days
follow one another towards a single end date.

**The result card is three columns, not a checklist.** `PLANNED · CHANGED ON DAY 14 · WHAT
PROVES IT`, one row per outcome, so a closed checkpoint answers the three questions it exists
to answer without anyone rereading the thread: the day-1 wording, what happened to it on day
14 (nothing, `Reworded — two tide states`, `Cut on day 14`, added), and the artifact that
proves it — kind icon plus file name, or a muted `Nothing attached`, which is what "not done"
looks like. The tick tile on the left keeps the tone (success, warning for cut).

### The checkpoint page

1. **Header — the same hero every other project page has.** `ProjectSpace` renders a
   `Title` with a secondary line under it and the actions on the right, and the checkpoint
   page uses exactly that rather than a bordered 64px band of its own: **Checkpoint 2** as
   the title (24/600, `-0.3`), `1–28 Sep 2026 · Prototyping · Day 14 of 28` as the secondary
   line, the day track under it, the curator badge on the right. A page inside the project
   space that invents its own header shape reads as a different product.
2. **The action card**, always one and never two: the next task, its deadline and its button.
3. **The thread**: a collapsed timeline, newest first — a 8px dot on a rail, then `Day 14 ·
   14 Sep` and the title on one line with a chevron. It was six full entries with 32px tiles
   and their bodies open, a thousand pixels of read-only history under the one thing the
   author actually has to do. History is skimmed, not read: one line each, and the body opens
   on demand. A devlog opens to its post with the curator's answer indented under a hairline.

Between them: the goal collapsed to its sentence (`DisclosureSection`) and the pulse
matrix, open by default.

**The header shape is the same wherever a checkpoint is titled inside something else** —
list card, table row, curator's list, result card: `Stage · Checkpoint N · dates`, then one
status slot with three faces — the day counter while the 28 days run, `Awaiting verdict`,
the verdict chip once it lands. The checkpoint's own page is the exception and takes the
project-page hero above, where the same three parts are split across a title and its
secondary line.

**A checkpoint is a date, not a period, and the copy says so.** Nowhere does a checkpoint
"run": the 28 days run towards it. `Day 14 of 28` is the state; `Checkpoint 2 · 28 Sep` is
the destination. Every string in §10 follows this, and a new one that says "the checkpoint
is running" is a bug in the copy.

### The two tables are the same table

`DS · 11 Tables`, rule 8, `ModernTable` in code:

| | Past checkpoints (`G9bfNg`) | Artifacts (`Z9yPB5`) |
|---|---|---|
| Card | `--gd-color-surface`, radius 12, clipped, **no outer border** | same |
| Head band | 44 on `--gd-color-surface-sunken`, labels 11/600 uppercase | same |
| Row | 56, padding 16, outer edge 24 | same |
| Divider | `--gd-color-border-subtle`, none on the last row | same |
| Columns | checkpoint 220 · goal fill · dates 150 · verdict 130 · decided by 180 | artifact fill · check 160 · stage · checkpoint 190 · added by 160 · when 100 |
| Paging | **antd pagination** under the card, total on the left. Never `Load more` as well. | same |
| Extra rows | — | group band 40 on `--gd-color-bg-muted`, checkpoint sub-head 32, failure strip on `--gd-danger-tint` |

**Head and body come from one column definition.** They drifted once because they were built
separately; in code that is a single `columns` array, never two lists of widths.

The running-checkpoint card above the past-checkpoints table is not a table row: it is the one live
item and takes the fill (§5).

### What gives when the content is long (frame `VKETd`)

| Where | What gives |
|---|---|
| Project title + stage + dates on one meta line | Title truncates first, stage second; dates and the status chip never move. |
| The goal sentence | Wraps to three lines where it is the subject (running card, page header); one line with an ellipsis and a `Tooltip` wherever it is a reference. |
| The stage in the past-checkpoints table | The cell is two parts: the stage truncates, `· Checkpoint N` never does. |
| Artifact name, and a raw URL as a name | One line, truncated, full value in a `Tooltip`. A URL has no break opportunity, so it is never wrapped. |
| Pulse matrix, eight members, long names | Week columns fixed at 72 and never shrink; the name column is the only elastic one, and the role truncates before the name. |
| Curator name + level in the badge | The name truncates, the level never does. |
| Verdict reasoning | The field grows to 132 then scrolls; in the thread it clamps to six lines with a `Show all`. |

Two mechanics the frames assume: a column width binds only under `table-layout: fixed`,
which antd turns on once `scroll.x` is set — and `scroll.x: "max-content"` defeats
truncation, so both tables pass a number; and truncation inside a flex row needs
`min-width: 0` on the parent.

**Breakpoints** were not drawn. Proposed: the checkpoint page is a single column at every width;
the artifact table drops *added by* and *when* below 1100; the step pages need nothing.

---

## 4. Components

**Reuse from `src/components/ui`** — `StatusDot` (artifact check result, pulse traffic
light), `IconTile` (32 on thread entries and action cards, 56 in empty and error states),
`EmptyState`, `SectionHeading` rank 4, `MetaStat`, `DisclosureSection` (collapsed goal,
pulses, the result card inside the verdict entry), `AppAvatar`.

**Reuse `ModernTable`** (`src/components/ModernTable`, as the devlog page, `MyTeam`,
`MyProjectReports` and `PaymentsList` already do) for **both** tables:
`density="compact"`, antd pagination on, `scroll={{ x: <number> }}`, and `emptyState`. The
artifacts table needs group rows and a per-row expansion for the failure strip; extend the
component rather than hand-rolling a second row anatomy.

**Reuse `PaymentsList`** as it stands — see §9. Nothing about receipts is designed here.

**Reuse `DevLogPostModal`** (`src/components/modals/DevLogPostModal`) for writing the week's
devlog. The checkpoint does not get a devlog editor of its own; it opens the one the Devlog
tab already uses and tells it which checkpoint the post belongs to.

**antd** — `Modal` (write the devlog, change the scope, attach the evidence, rate the
assessment, cancel the draft, assign a curator, workflow locked, and the curator's verdict
at `width={820}` with a scrolling body), `Pagination`, `Segmented`, `Steps` (or the drawn rail),
`Tooltip` (every disabled reason, every truncation, the source behind a pulse dot),
`Rate`, `Input`/`Input.TextArea`/`Upload.Dragger`.

**New, proposed paths**

| Path | What it is |
|---|---|
| `src/components/checkpoints/CheckpointHeader/` | `Stage · Checkpoint N · dates` + the three-faced status slot + curator badge. |
| `src/components/checkpoints/VerdictChip/` | The three verdicts as tone + label. |
| `src/components/checkpoints/CuratorBadge/` | AI or person, one component, `kind` prop. |
| `src/components/checkpoints/PulseMatrix/` | Members × 4 weeks, five cell faces, quiet rule, joined/left dates, legend. |
| `src/components/checkpoints/CheckpointThread/` | The thread panel and its entry types, including feedback under a devlog. |
| `src/components/checkpoints/ActionCard/` | The next task: kicker, title, deadline meta, body and the action button in three faces (due today, due later, not open yet). |
| `src/components/checkpoints/CheckpointCard/` | The running card, the draft card, the curator's row. |
| `src/components/checkpoints/GoalCard/` | Inputs and outcomes side by side, each line with its evidence slot, cut outcomes marked, the revision beside the original. |
| `src/components/checkpoints/EvidenceSlot/` | One line's proof: empty, attached (kind icon + name + check state), or counted by the curator with their note. Read-only where the viewer cannot edit. |
| `src/components/checkpoints/start/` | The four step pages and the shared progress rail + footer. |

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
| **The one live item in a list** — active checkpoint, waiting draft, verdict due today | `--gd-color-surface`; everything below it stays outlined |
| Table card | `--gd-color-surface`, radius 12, clipped, no outer border |
| Table head band | `--gd-color-surface-sunken` (added to the canvas variables for this work) |
| Table row divider | `--gd-color-border-subtle` |
| Group band in the artifact table | `--gd-color-bg-muted` |
| Floating — modals, tooltips | `--gd-color-surface` + `--gd-elevation-e3`; the scrim is ink at 35 % |
| Input fill, segmented track, neutral tile, skeleton | `--gd-fill-base` / `--gd-neutral-100` |
| Progress bar fill, current-week mark, selected option, edited-field border | `--gd-color-accent` as a 2px mark or a 4–8 % tint |
| Selected option / action card tint | `--gd-color-accent-subtle` |
| Committing button | `colorPrimary` (graphite) |
| **Destructive confirm — the one filled red button** | `--gd-danger-solid` with an inverse label, only in `Dialog — Cancel this draft?` |
| Confirmed pulse, delivered outcome, `StageClosed` | `--gd-success-*` |
| `GoalMet` | `--gd-info-*` |
| Day-14 note, cut outcome, `GoalMissed`, Quiet, "Saved, not readable", "Starting…" | `--gd-warning-*` |
| Artifact "Cannot be opened", failed payment, delete icon | `--gd-danger-*` |
| Missed pulse cell | `--gd-color-border-strong` fill (a hole, not a failure) |
| Craft colour | `getWorkDirection(name)` on project discs and team avatars; chrome stays neutral |
| Spacing | `--gd-space-1` 4 · `2` 8 · `3` 12 · `4` 16 · `6` 24 · `8` 32 · `16` 64 |
| Radii | chip 6 · control 10 · card 12 · panel 16 · pill 999 |
| Chips | antd `Tag`: `--gd-color-surface-sunken`, radius 6, no border, 12/500 on `--gd-color-text`. Labels only — `Video`, `Expert`, `Week 2`. |
| Statuses | dot 7 + word 12/500, no fill: `Awaiting verdict`, `Draft`, `Quiet`, `Held`, `Comes off`, `Reworded`, `New`, every verdict. Tone lives in the dot |
| Control heights | 40 default · 36 in cards and thread entries · 32 in dense rows and pagination · 44 on the step pages' inputs |
| Type | 32/600 the step question · 24/600 page title · 20/600 modal title · 16/600 panel head · 15/600 entry title · 14 body · 13 dense · 12 meta · 11/600 `ls .5` table head and caption |

Numbers carry `font-feature-settings: "tnum"`.

---

## 6. States

### Starting a checkpoint

- **Draft is the resting state.** Every step writes on leave. Closing the tab, going back or
  walking away loses nothing.
- **Resume** (`Lk9Q0`) — a waiting draft is the common case. The page head button reads
  `Continue`, and the draft sits where the active checkpoint would: stage, checkpoint number,
  `Draft` chip, the goal so far, which step it was left at, when it was saved, and
  `Continue` + `Discard`. No dates, because day 1 has not happened.
- **Cancel** is on every step and is the only thing that destroys a draft, so it confirms
  (`H3rdHi`). `Discard` on the draft row opens the same dialog. **There is no Cancel
  anywhere on an active checkpoint** — a paid checkpoint ends in a verdict, and a team that stops
  working ends at `GoalMissed`. Only an admin can close a stuck checkpoint.
- **The goal sentence is derived** (`M2CuZ`), not typed: a brief pending state while the
  model writes it (the author is waiting for this one and cannot move on), then the
  generated value with a `Written from your two lists` chip, then the edited face with a 2px
  accent border once corrected. Frozen at payment with the rest of the goal card.
- **Payment** — pending, failed (`nothing was charged`, the draft is kept) and blocked by a
  active checkpoint live in `mgUfL`. A failure never reaches the success screen.
- **Started / Starting** (`zu2KW`, `Yw91X`) — the flow ends on its own screen carrying
  dates, not congratulation: when the 28 days run to, when each devlog is due, when its
  feedback lands, the scope day, the artifact day, the verdict day. Paddle returns before
  the webhook, so `Starting…` is a real state that settles by itself and says the same
  dates.

### The checkpoint page

- **One action card, always the next task, with its deadline on it.** Priority: agree the goal
  card on day 1 → this week's
  devlog → the day-14 scope change → the evidence still missing → the next call with a human
  curator. The kicker reads `NEXT UP · IN 3 DAYS` / `· DUE TODAY` / `· NOT OPEN YET` and the
  right-hand meta carries the date: `Due 20 Sep · in 3 days`, `Opens 14 Sep · in 6 days`.
  A task that can be done early keeps a live button; one that cannot — the scope change —
  shows the disabled button and the day it opens, never an empty page. The card disappears
  only when the checkpoint closes.
- **Every action is one press, on the spot**, in a `Modal`, from the card or from the entry.
  The verdict is the wide one: an 820 `Modal` over the curator's list, body scrolling.
- **Devlog feedback** (`ySkh2`) — every devlog is answered. A devlog published today has
  **nothing under it**: no spinner, no placeholder, no "waiting". It is a finished post for
  a day. The feedback appears the next morning and a notification brought the author back.
  The fourth devlog's feedback is folded into the report, and the closed thread says so, so
  the absence does not read as a bug. One anatomy, two sources, the badge says which; the
  author's post stays whole and dominant and the feedback under it can be ignored.
- **Pulses** — the cell has four answers and one silence:

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
| Checkpoints list (`THGwT`) | Skeleton of the running card + rows at the loaded height | `EmptyState` + `Start a checkpoint` | One panel, retry, reference code | Resume; read-only for a member without `checkpoints.create`; Guests see no tab |
| Checkpoint page (`qXEDm`) | Real header, three skeleton entries | A checkpoint always has its day-1 entries | Header usable, thread becomes one panel | Review, Closed, Cancelled draft |
| Artifacts (`mJ7MM`) | Head and group rows real, rows skeletonised at 56 | `EmptyState`, video-first | One panel, "nothing was deleted" | Four check results |
| Advisor list (`AHlwo`) | Card skeleton | "No checkpoints yet" | One panel | — |

**Artifact check** (`f1L6P`): `Ready`, `Checking…`, `Cannot be opened` (the only one with
an action — the reason and *Replace the link* in a danger strip under its row), `Saved, not
readable`. A row appears as `Checking` on add and settles in place.

**Disabled says why** (`O5gROp`): `IconLock` on the control, the reason in its tooltip,
never a sentence in a box beside it. Drawn for: start a checkpoint while one is running, write
the verdict before day 28, attach an artifact to a closed checkpoint, edit the workflow under a
active checkpoint — the last is too long for a tooltip, so its full refusal is the confirm step
(`rhKOo`).

**Permission denied.** `checkpoints.view` is every member; Guests see no tab. Without
`checkpoints.create` the page renders complete and the primary button is absent, not broken.

---

## 7. Copy (Tolgee keys)

Namespace `checkpoints`.

| Key | English |
|---|---|
| `checkpoints.tab` | Checkpoints |
| `checkpoints.title` | Checkpoints |
| `checkpoints.subtitle` | 28 days on one project with a stated goal and a verdict at the end. |
| `checkpoints.start` | Start a checkpoint |
| `checkpoints.start.disabled` | One checkpoint at a time. This one ends {date}. |
| `checkpoints.continue` | Continue |
| `checkpoints.draft.chip` | Draft |
| `checkpoints.draft.leftAt` | Left at step {step} of 4 — {question} |
| `checkpoints.draft.saved` | Saved {ago} |
| `checkpoints.draft.nothingCharged` | Nothing has been charged and no days are counting. |
| `checkpoints.draft.discard` | Discard |
| `checkpoints.cancel.title` | Cancel this draft? |
| `checkpoints.cancel.body` | Everything written on the three steps goes with it, and nothing on this page can bring it back. |
| `checkpoints.cancel.leaving` | Closing the tab or walking away does not cancel anything — the draft waits in the checkpoint list. |
| `checkpoints.cancel.keep` | Keep the draft |
| `checkpoints.cancel.confirm` | Cancel the draft |
| `checkpoints.status.day` | Day {day} of 28 |
| `checkpoints.status.awaitingVerdict` | Awaiting verdict |
| `checkpoints.status.daysLeft` | {count, plural, one {# day left} other {# days left}} |
| `checkpoints.header.meta` | {stage} · Checkpoint {number} · {from} – {to} |
| `checkpoints.verdict.stageClosed` | Stage closed |
| `checkpoints.verdict.goalMet` | Goal met |
| `checkpoints.verdict.goalMissed` | Goal missed |
| `checkpoints.verdict.decidedBy` | Decided by |
| `checkpoints.curator.ai` | AI curator |
| `checkpoints.curator.aiKind` | AI curator, in writing |
| `checkpoints.curator.humanKind` | A person, on five calls |
| `checkpoints.curator.record` | {checkpoints} checkpoints · {closed} closed a stage |
| `checkpoints.curator.rating` | {value} from {count} ratings |
| `checkpoints.curator.rating.tooFew` | Not enough ratings yet ({count}) |
| `checkpoints.empty.title` | Your first checkpoint starts here |
| `checkpoints.empty.description` | 28 days, one goal, a curator, and a verdict that opens the next stage. |
| `checkpoints.past.title` | Past checkpoints |
| `checkpoints.past.column.checkpoint` | CHECKPOINT |
| `checkpoints.past.column.goal` | GOAL |
| `checkpoints.past.column.dates` | DATES |
| `checkpoints.past.column.verdict` | VERDICT |
| `checkpoints.past.column.decidedBy` | DECIDED BY |
| `checkpoints.past.total` | {count, plural, one {# closed checkpoint} other {# closed checkpoints}} |
| `checkpoints.start.step1` | Now |
| `checkpoints.start.step2` | Goal |
| `checkpoints.start.step3` | Curator |
| `checkpoints.start.step4` | Payment |
| `checkpoints.start.stepOf` | Step {n} of 4 |
| `checkpoints.start.savedDraft` | Saved as a draft |
| `checkpoints.start.q1` | What exists today? |
| `checkpoints.start.q1.hint` | Carried over from your last result card — correct it rather than retype it. |
| `checkpoints.start.q2` | Where do you want the project to be in 28 days? |
| `checkpoints.start.q2.hint` | One line per thing that has to exist by then. Each gets its proof attached as it lands. |
| `checkpoints.start.q3` | Who runs the 28 days? |
| `checkpoints.start.q4` | Ready to start? |
| `checkpoints.start.outcome.add` | Add an outcome, then press Enter |
| `checkpoints.start.input.add` | Add a line, then press Enter |
| `checkpoints.start.goal.label` | The goal |
| `checkpoints.start.goal.generated` | Written from your two lists |
| `checkpoints.start.goal.writing` | Writing it… |
| `checkpoints.start.goal.edited` | Edited by you |
| `checkpoints.start.check.note` | Checked by the AI curator · advice, not a gate |
| `checkpoints.start.next1` | Next — what will exist |
| `checkpoints.start.next2` | Next — who curates |
| `checkpoints.start.next3` | Next — summary |
| `checkpoints.start.pay` | Pay and start |
| `checkpoints.start.pay.note` | Day 1 is the moment the payment lands. |
| `checkpoints.start.receipts` | Receipts live in Settings → Payments |
| `checkpoints.start.pending.title` | Waiting for the payment |
| `checkpoints.start.failed.title` | Nothing was charged |
| `checkpoints.start.blocked.title` | One checkpoint at a time |
| `checkpoints.started.title` | The 28 days have started |
| `checkpoints.starting.title` | Waiting for the payment |
| `checkpoints.starting.note` | The 28 days start the moment it confirms — a few seconds, and this page settles by itself. |
| `checkpoints.started.open` | Open the checkpoint |
| `checkpoints.started.date.runs` | The 28 days have started. Checkpoint {n} is on {date}. |
| `checkpoints.started.date.devlog` | Devlog due. The curator answers it on {date}. |
| `checkpoints.started.date.scope` | The scope note — the only day the outcome list can change. |
| `checkpoints.started.date.artifact` | Evidence is asked for on every outcome still empty. |
| `checkpoints.started.date.stop` | Collection stops. |
| `checkpoints.started.date.verdict` | The verdict. |
| `checkpoints.action.devlog.title` | Post this week's devlog |
| `checkpoints.action.devlog.cta` | Write the devlog |
| `checkpoints.action.devlog.note` | The curator reads it and answers the next morning. |
| `checkpoints.action.goal.title` | Agree the goal card with your curator |
| `checkpoints.action.goal.cta` | Open the goal card |
| `checkpoints.action.goal.kicker` | NEXT UP · CALL 1, TODAY |
| `checkpoints.start.q2.draft` | This is a draft. On day 1 your curator goes through it with you and cuts it to what 28 days actually hold — the card is fixed after that call, not now. |
| `checkpoints.action.scope.title` | Change the scope |
| `checkpoints.action.scope.cta` | Change the outcomes |
| `checkpoints.action.scope.keep` | Leave the list as it is |
| `checkpoints.scope.subtitle` | Today only — day 14 of 28. Cut what will not land, reword what changed shape, add what you are ahead on. |
| `checkpoints.scope.chip.cut` | Comes off |
| `checkpoints.scope.chip.reworded` | Reworded |
| `checkpoints.scope.chip.added` | New |
| `checkpoints.scope.was` | was: {text} |
| `checkpoints.scope.add` | Add an outcome |
| `checkpoints.scope.why` | Why |
| `checkpoints.scope.note` | Kept beside the original, never over it. |
| `checkpoints.action.evidence.title` | Attach the evidence |
| `checkpoints.action.evidence.cta` | Attach it |
| `checkpoints.action.call.title` | Call {n} — {topic} |
| `checkpoints.action.call.cta` | Join the call |
| `checkpoints.goal.label` | Goal |
| `checkpoints.goal.claimed` | {done} of {total} outcomes proven |
| `checkpoints.evidence.empty` | No evidence yet |
| `checkpoints.evidence.due` | Proof at the end |
| `checkpoints.evidence.attach` | Attach evidence |
| `checkpoints.evidence.pick` | Pick from this project |
| `checkpoints.evidence.add` | Add a new one |
| `checkpoints.evidence.replace` | Replace |
| `checkpoints.evidence.remove` | Detach |
| `checkpoints.evidence.reminder` | {count, plural, one {# outcome has nothing against it} other {# outcomes have nothing against them}} |
| `checkpoints.evidence.accepted` | Counted by the curator |
| `checkpoints.evidence.acceptedNote` | Why it counts without an artifact |
| `checkpoints.evidence.notDelivered` | Nothing was attached |
| `checkpoints.pulses.title` | Pulses |
| `checkpoints.pulses.summary` | {done} of {total} confirmed |
| `checkpoints.pulses.quiet` | Quiet |
| `checkpoints.pulses.legend.confirmed` | Confirmed |
| `checkpoints.pulses.legend.waiting` | Waiting |
| `checkpoints.pulses.legend.missed` | Missed |
| `checkpoints.pulses.legend.notAsked` | Not asked yet |
| `checkpoints.pulses.legend.notOnTeam` | Not on the team |
| `checkpoints.pulses.joined` | joined {date} |
| `checkpoints.pulses.left` | left {date} |
| `checkpoints.pulses.confirm` | Still on it |
| `checkpoints.pulses.source.devlog` | Week {week} · from the devlog of {date} |
| `checkpoints.pulses.source.artifact` | Week {week} · from the artifact of {date} |
| `checkpoints.pulses.source.pressed` | Week {week} · confirmed on {date} |
| `checkpoints.thread.title` | The checkpoint so far |
| `checkpoints.thread.feedback` | feedback · {date} |
| `checkpoints.thread.feedback.folded` | Answered inside the result card — one message on day 28, not two. |
| `checkpoints.thread.showAll` | Show all |
| `checkpoints.midnote.title` | Day 14 · half the calendar is gone |
| `checkpoints.midnote.from` | From the AI curator |
| `checkpoints.revision.cut` | Cut on day 14 |
| `checkpoints.result.title` | Result card |
| `checkpoints.result.sources` | What this verdict was written from |
| `checkpoints.result.limit` | Frames and a transcript show that a thing exists. They do not show how it plays. |
| `checkpoints.rating.title` | Was this assessment any use? |
| `checkpoints.rating.note` | Optional — the checkpoint is closed either way. |
| `checkpoints.rating.cta` | Rate it |
| `checkpoints.next.title` | {stage} can now be left |
| `checkpoints.next.cta` | Start the next checkpoint |
| `artifacts.tab` | Artifacts |
| `artifacts.add` | Add artifact |
| `artifacts.total` | {count, plural, one {# artifact} other {# artifacts}} |
| `artifacts.column.artifact` | ARTIFACT |
| `artifacts.column.check` | CHECK |
| `artifacts.column.where` | STAGE · CHECKPOINT |
| `artifacts.column.addedBy` | ADDED BY |
| `artifacts.column.when` | WHEN |
| `artifacts.kind.video` | Video |
| `artifacts.kind.document` | Document |
| `artifacts.kind.image` | Image |
| `artifacts.kind.build` | Build |
| `artifacts.video.title` | Show the game in a clip |
| `artifacts.unsorted` | Unsorted |
| `artifacts.check.ready` | Ready |
| `artifacts.check.pending` | Checking… |
| `artifacts.check.unreachable` | Cannot be opened |
| `artifacts.check.unsupported` | Saved, not readable |
| `artifacts.check.unreachable.login` | This link asks for a login, so nothing on the other side was read. Make it public, or paste a link that needs no account. |
| `artifacts.check.fix` | Replace the link |
| `advisor.checkpoints.tab` | Checkpoints |
| `advisor.checkpoints.verdictDue` | Verdict due by {date} |
| `advisor.verdict.title` | Write the verdict |
| `advisor.verdict.reason` | Your reasoning |
| `advisor.verdict.guard` | Stage closed needs an artifact or a claimed outcome. |
| `admin.checkpoints.assign.title` | Assign a curator |
| `admin.checkpoints.assign.free` | No payment is taken |
| `admin.checkpoints.locked.title` | This project has a checkpoint running |

**Notification** — new Novu workflow `checkpoint-devlog-feedback`, sent the morning after a
devlog: *"The curator has read your devlog"* plus the checkpoint and week. It must not pretend
to be a person; the badge in the thread says which kind wrote it.

---

## 8. Data needs

1. **Checkpoint list for a project** — the running or review checkpoint in full; **any waiting
   draft**, with which step it was left at and when it was saved, so the list can offer
   `Continue`; and the closed ones as a paginated page with a `total`. Plus whether the
   caller may create a checkpoint and, if not, the blocking checkpoint's end date for the disabled
   tooltip.
2. **The start flow** — each step is a partial write to the same `Draft` checkpoint, so the
   endpoint must accept a partial goal card and return the draft's current step. Cancel
   deletes it. The goal sentence is a derived field: a call that takes the two lists and
   returns a sentence, plus a flag for whether the author has since edited it, so the UI can
   tell the generated face from the corrected one.
3. **Checkpoint detail** — the goal card and which outcomes are claimed, the day-14 revision,
   the pulse matrix as *(member, week, state, source)* including `notOnTeam` with the
   member's join and leave dates, every devlog with its feedback and the date the feedback
   landed, the artifacts with their check result, the mid note, the verdict block. One
   request.
4. **Curator picker** — level, rate, checkpoints run, stages closed, average rating **and the
   number of ratings**, average suppressed below five. Sorting by stages closed / checkpoints
   run / rate, never by an average most curators will not have.
5. **Artifacts** — paginated and grouped, with `stageName` and checkpoint number denormalised,
   the check result, reason and checked-at, and a name derived from the link or file name.
6. **Verdict** — verdict + reasoning; the server enforces the guardrail and refuses before
   day 28.
7. **Rating** — optional, stars and a comment, changeable later.
8. **Payments** — nothing new. A checkpoint payment is a `Payment` row and appears in
   `PaymentsList` for free; see §9 for the one change it needs.

---

## 9. Money, and the one change to an existing screen

**Money is shown once, before it is spent.** The price appears on the summary step, where
the decision is made, and in the curator picker, where the author is choosing between
prices. After payment nothing mentions a sum: not the list, not the checkpoint header, not the
thread entry that says the checkpoint started, not the result card, not the admin's assign
modal.

**Receipts and history are not designed here.** They already exist at
`/user/settings/payments` (`src/components/PaymentsList`, wired in
`SettingsItemClient.tsx`). Step 4 links to it in one line and restates nothing.

**The one change that screen needs:** its Description column renders
`payableType === "VACANCY" ? "Vacancy listing" : r.payableType`, so a checkpoint payment would
read `CHECKPOINT`. Give it the same treatment as a vacancy — a label (`Checkpoint`) and the existing
secondary line carrying `title · projectName`, which for a checkpoint should be the stage and
checkpoint number plus the project. The Receipt column's `openInvoice` is vacancy-only and can
stay that way until checkpoints have invoices. That is a small change to an existing screen, not
a new one.

---

## 10. Where the frames depart from `docs/checkpoints.md`

| Departure | Why |
|---|---|
| **`GoalMissed` is drawn in warning, not danger.** | Red is reserved for destructive and failed platform actions. A missed goal is the starting position of the next checkpoint. |
| **The day counter is the status, not the word "Active".** | `Day 14 of 28` is the number the author came for. |
| **`Review` is called "Awaiting verdict".** | The enum stays `Review`; the word would suggest the author has something to review. |
| **Past checkpoints are a table with pagination, not cards.** | Five facts per checkpoint repeated down a list is table work, and tables in this product paginate. |
| **The artifact description left the row.** | A 56px row is one line; the description is a tooltip. |
| **No call strip in the header for a human curator.** | Five dated items in a header is a second navigation bar. The next call is the action card; the rest are thread entries. |
| **The result card is not a destination.** | It is a `DisclosureSection` inside the verdict thread entry. |
| **The rating is a prompt plus a modal, and optional.** | Answered where it is read, by the same mechanism as every other action. |
| **The pulse block kept its axis.** | Four bare dots with no week heads, no dates, no current-week mark and no legend stopped being readable. Compaction may remove chrome, not the axis of a diagram. |
| **The goal sentence is generated.** | The author has already written the two lists it summarises. |
| **The artifact block is video-first.** | Video is the only kind the platform can read without running anything. |
| **`Introduction` and `Project Completion` were not drawn.** | The frames use Ideation, Concepting, Prototyping and Preparing a release version, where checkpoints will actually be bought. |

---

## 11. Open questions / assumptions

1. **Team size for pricing is taken at purchase**; the roster is fixed for the checkpoint.
2. **Call scheduling is not designed** — the picker, the reschedule flow and the calendar
   invitation belong to the human-curator issue.
3. **The AI curator's price ($89) is a placeholder.**
4. **The seeded gate task** reads *"Close the stage with a checkpoint verdict"*.
5. **The artifact upload limit** is drawn as 200 MB / five minutes. Not verified against
   Sanity or the ffmpeg queue.
6. **`ModernTable` group rows and the failure strip** may need the component extended.
7. **Page sizes** assumed 10 for past checkpoints, 25 for artifacts.
8. **Timezone**: day numbers computed server-side in one fixed zone and returned with the
   payload.
9. **Responsive layouts were described, not drawn**, except the 820 modal, which is where
   the pulse name column actually truncates.
