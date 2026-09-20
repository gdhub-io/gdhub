# GDHUB-57 — The checkpoint page becomes a path of sprints

[Linear](https://linear.app/gdhub/issue/GDHUB-57/checkpoints-the-page-becomes-a-path-of-sprints) ·
intent written 2026-09-15

## Want

An author opens their checkpoint and sees the whole 28 days laid out as a path: what they
started with, four sprints, and the checkpoint itself at the end. They pick a step on the left
and the right side is that step — for a sprint, what it still asks of them and who owes the
next move, the team's signals, the evidence that landed, the curator's review. One button at
the bottom of that panel moves them on when nothing is left open. Buying the checkpoint is the
first step of the same path rather than a flow somewhere else: the five questions, the day it
starts, the payment, and then the same step turns into the record of what was bought.

The unit inside a checkpoint is a **sprint** — seven days from the day it started, which is
rarely Monday to Sunday. The word "week" leaves the interface.

## Why now

The page is one scrolling column: an action card, a collapsed goal, the pulse matrix and a
thread that grows all month. The one question an author has on any given day — *what does this
week want from me* — is answered somewhere inside a thousand pixels of history, and everything
else on the page repeats the same three facts (28 days, day 14 of 28, the sprint's dates) in
five places. The design pass that produced
[docs/design/specs/checkpoints.md](../design/specs/checkpoints.md) replaced it; this issue
builds what was drawn.

The purchase has the same problem from the other side: four routes the author leaves the
project for, plus two post-payment screens, for a thing that is one draft.

## Constraints

- **`/user/project/[slug]/checkpoints/[id]` stays the route.** `checkpoints/new/*` goes away
  and redirects to that page's Prepare step; a draft created before this change opens there
  at the question it was left at.
- **Draft-as-you-go stays.** Every question writes to the `Draft` checkpoint on leave. `useDraft`,
  `CuratorStep`, `PaymentStep` and `GoalLines` are rehosted, not rewritten.
- **Reuse before rebuild:** `GoalCard`, `EvidenceSlot`, `CuratorBadge`, `VerdictChip`,
  `CheckpointCard`, `CheckpointStatusSlot`, `DevLogPostModal`, `ModernTable`,
  `SpecialistPreviewModal`. `CheckpointThread` is deleted — the history is filed under the
  sprint it happened in.
- **Sprints are derived from `startedAt`**, not stored: sprint N is `[startedAt + 7(N-1), +7)`.
  Devlogs and artifacts fall into the sprint their date lands in.
- **The checkpoint number runs through the project**, not through the stage, everywhere it is
  written.
- **The schema is not in this repo.** The sprint review, the five calls and a mentor accepting
  a checkpoint land in `@gdhub-io/gdhub-prisma` under GDHUB-58 and are released before this
  branch uses them. Until then those parts stay unbuilt rather than faked onto the devlog row.
- **The design is the contract:** the frames in the Checkpoints row of
  `docs/design/platform-design.pen` and the spec beside them. Tokens, antd, `@tabler/icons-react`,
  Tolgee keys from §7 of the spec.

## Done when

- [ ] An author opens a running checkpoint and sees the path — Prepare/Inputs, Sprint 1–4,
      Checkpoint — with the current sprint selected; the dates appear only in the sidebar and
      the day count only in the page header.
- [ ] The Status tab lists everything still open with who it waits on — the author, the curator
      or the team — each with the button that answers it, and the panel's footer opens the next
      sprint only once nothing is open, saying what is missing while it is locked.
- [ ] The Signals tab is the pulse matrix alone; hovering a cell gives the day it was marked or
      offers a reminder for one that is not.
- [ ] The Evidence tab lists what landed in that sprint, and attaching an artifact asks which
      outcomes it proves — one artifact can prove several, and it can be picked from what the
      project already has.
- [ ] A checkpoint is bought on the same page: five questions in the panel, the day it starts
      chosen explicitly, payment last; nothing navigates away afterwards and the step becomes
      the record of what was bought.
- [ ] With a human curator the page says it is waiting for them to take it and set the day, and
      nothing counts until they do.
- [ ] The Checkpoint step shows its three faces — locked, in review, closed with the result
      card — and `Next checkpoint` opens a new checkpoint at its Prepare step.
- [ ] The past-checkpoints table names the checkpoint by its project-wide number in the first
      column and the stage in the second.
- [ ] No user-facing string says "week", and no thread component is left in the tree.

## Out of scope

- **The calls themselves** — scheduling, links, reminders. The page draws the slot and says
  when it opens; the mechanism is GDHUB-42.
- **The advisor and admin screens.** They keep working as they are; only the meta line's word
  order changes.
- **The artifacts page** (GDHUB-39) and the artifact check (GDHUB-56).
- **Taking the money** (GDHUB-38). The payment question reads back what is being bought and
  takes the tick; the checkout behind it is that issue, and it will be **Stripe** — starting in
  its sandbox — rather than the Paddle the vacancy listings use.
- **Cron, pulse emails and devlog reminders** (GDHUB-35), beyond reading what they wrote.
- **Redrawing start questions 1–3 in Pencil.** Their content is correct and is rehosted as it is.
- **The scout space history** (GDHUB-44).

## Open questions

- **Can a sprint be opened before its dates start?** Assumed: no. The footer button moves the
  selection when the current sprint is answered *and* the next one has begun; before that it
  names the date.
- **What happens to a `Draft` that was left mid-flow?** Assumed: it opens on the page at the
  question it was left at, and the old route redirects there.
- **Where does the goal strip read from before the goal is agreed?** Assumed: the same
  `goal` field, shown as a draft with its lines still editable until `goalAgreedAt`.
- **Does anything still need `/checkpoints/new`?** Answered: no. The routes are deleted
  outright — the feature has never shipped, so there are no links in the wild to keep alive.
