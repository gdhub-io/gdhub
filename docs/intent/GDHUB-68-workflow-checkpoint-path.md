# GDHUB-68 — The workflow page becomes the checkpoint path

[Linear](https://linear.app/gdhub/issue/GDHUB-68/checkpoints-the-workflow-page-becomes-the-checkpoint-path) ·
intent written 2026-10-08

## Want

An author opens the project's Workflow tab and sees the whole road on one page, top to bottom:

- the stages, with the one they are on expanded (its text, its tasks, Next);
- the checkpoints between stages;
- inside the running checkpoint, its four sprints. The current sprint is one card with the next session or review, and a short "Before the next session" checklist of things the platform can verify. Past sprints are one-line summaries; future sprints show their dates and who reviews them.

A project with no checkpoint is offered one at Ideation and later ("Head for your first checkpoint", AI curator $19 or an industry curator from $300). Buying it happens on its own focused page, Now → Curator → Payment → Ready, and comes back to the path. A previous path and past checkpoint results load on demand. The aside carries this checkpoint's goal and tasks, the stage's tasks and the project's activity.

## Why now

Today workflow and checkpoints are two tabs that repeat each other: the workflow page has a checkpoint widget, and the checkpoint page has its own path of sprints. The design merges them into one page (Pencil frames listed in the issue), and the call room and AI review pages (GDHUB-70, GDHUB-71) link from this path.

## Constraints

- **Branching.** Work happens on `feature/gdhub-31-add-checkpoints-to-projects` through task PRs. The **first slice to reach `dev`** is this page with **checkpoint purchase locked**: the offer card and the Get started button show a lock and a tooltip, and one server flag opens them later.
- **Routes:**
  - `/user/project/[slug]/workflow` is the page. The space root redirects there.
  - `/workflow/cp/new?step=…` is the purchase flow. It resolves the project's single Draft.
  - The old `/checkpoints/*` routes stay in the code but nothing links to them (removal is GDHUB-73).
- **Rehost, don't rewrite:** `StartStepPage`, `TeamResource`, `CuratorStep`, `PaymentStep`, `useDraft`, `EvidenceSlot`, `AttachEvidenceModal`, `CuratorBadge`, `VerdictChip`, and the scout `ActivityFeed` and its repository.
- **Sessions come from `CheckpointSession`** (GDHUB-69). A checkpoint started before sessions existed falls back to the calendar (days 1, 8, 15, 22, 29).
- **Hours stay in the profile.** The Now step writes the author's own share to `timeForWork`.
- **The stage text and tasks** keep coming from Notion and the workflow tables. Moving stages keeps using `/api/project/move`, which now also stamps the step's `finishedAt`.

## Done when

- [ ] A new project shows Introduction expanded with Next. At Ideation it shows the offer card. With the flag off, the card's buttons are locked with a tooltip.
- [ ] With the flag on, a checkpoint is bought on `/workflow/cp/new` and the path then shows it. Payment failure and "waiting for the curator" render as offer card states.
- [ ] A running checkpoint shows the current sprint card:
  - the next session (a call with the curator, or "Sprint N review" for the AI curator);
  - the checklist, every item ticked from data;
  - past sprints as summary rows.
- [ ] The ⋮ menu on the card replaces the curator or cancels the draft, through the existing confirm dialog.
- [ ] The activity feed lists project events with sprint separators and loads earlier events on scroll; a stage move appears in it.
- [ ] No link in the project space points at `/checkpoints/*`, and the Checkpoints tab is gone.

## Out of scope

- The call room and its notes (GDHUB-70).
- AI review pages (GDHUB-71).
- Cron, pulses being sent, and emails (GDHUB-72). The pulse chip reads whatever rows exist.
- The stage gate while a checkpoint runs (GDHUB-37). Next keeps today's rule here.
- Deleting the old pages (GDHUB-73).
- The advisor space.

## Open questions

- **The flag.** Assumed: one server-side env flag (`CHECKPOINTS_PURCHASE_OPEN`), read through `env()`, and passed to the page. Not a per-user rollout.
- **Activity for the project space.** Assumed: generalise `getProjectCardActivities` (scout) into a project-space endpoint with cursor paging. The scout card keeps calling it as today.
- **One PR or several into the checkpoints branch.** Assumed: three, in this order: the path (read-only), the offer card with the purchase flow, then the aside and activity feed.

## Decided while building PR 2

- **Payments go through Stripe** (`/api/checkpoint/[id]/pay`), not Paddle; Stripe returns to `/workflow/cp/new?step=ready` or `?step=payment`.
- **The flag is a server env read on the server only.** Off, `getCreationBlocker` answers `purchaseClosed` and the pay route refuses; the offer card still shows, its button locked.
- **"Payment failed"** is a draft whose latest `Payment` is `FAILED` or `CANCELED`. A `PENDING` one is not failure: it may still be open in another tab.
- **Now** merges the old Now, Goal and Planning questions: hours, start date and the goal. The goal check runs on Next and reads the goal against the team's hours and the last verdict; it warns only when the goal does not fit the time, and "Continue anyway" passes it.
- **The purchase page drops the project tabs**: a space may set `exit` in its header config, which replaces the header's actions.
