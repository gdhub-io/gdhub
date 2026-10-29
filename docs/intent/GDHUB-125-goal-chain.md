# GDHUB-125 — The goal chain

[Linear](https://linear.app/gdhub/issue/GDHUB-125) · intent written 2026-10-30

## Want

In a checkpoint, every level has to lead to the one above it:

**project goal** (the game is released and people play it) ← **stage goal** ←
**checkpoint goal** ← **plan** (up to 5 tasks) ← **artifact** (proves a task).

The curator's checks follow the chain:

- On day 1 the author learns whether the checkpoint goal sits inside its stage.
- Every task the author writes or changes is checked against the goal, on day 1
  and again at the day-15 revision.
- With a person as the curator, the same checks reach that curator in the
  brief the AI prepares for them. They read the project from the brief instead
  of re-checking it.

## Why now

Today the AI judges each level on its own. A goal can drift out of the stage. A
plan of up to 12 tasks can be busy without serving the goal. And a verdict can
then find every task done and the goal still missed, which is the case Dmitry
raised in GDHUB-122. The chain makes the gap visible on day 1 and day 15, while
the author can still act on it, rather than at the verdict.

## Constraints

- **No schema change:**
  - The project goal and the stage goals live in `src/config/checkpoint.ts`
    (`PROJECT_GOAL`, `CURATOR_STAGE_GOALS`), keyed by stage name, so existing
    projects get them at once.
  - "Already checked" on day 15 is kept in the day-15 session's content.
- **Flag, never block.** A goal outside the stage and a task that does not lead
  to the goal are both advice. The author keeps the choice.
- **The goal is refined on day 1 only.** After that it is fixed for all 28 days.
- **The plan holds at most 5 tasks.** Cut tasks do not count: a task cut on
  day 15 frees its place.
- **Sprint yardstick:**
  - Sprints 1–2 are read against the day-1 plan.
  - Sprints 3–4 and the verdict are read against the day-15 revision: the
    AI reads the tasks as they stand at that moment.
- **Evidence:** artifact → task stays as it is (the evidence match).
- **Verdict:** follows GDHUB-122. It is judged by the tasks, but done tasks
  that are out of step with the goal miss it. Advice that is not a task is no
  obstacle.
- The day-15 plan footer is designed in Pencil before it is built.
- Every prompt change goes through the AI curator lab (`/dev/ai-curator`).
  E2E answers come from the LLM cassettes, re-recorded where prompts change.

## Done when

- [ ] Every curator prompt (goal check, plan advice, sprint reviews, verdict)
      carries the stage goal and the project goal. The lab shows them.
- [ ] On day 1, a goal outside its stage gets one line under it saying so, with
      the reason. The plan can still be saved and approved. A goal inside the
      stage gets no line.
- [ ] A task that does not lead to the goal gets the advice "does not lead to
      the goal", with what it would take. The other tasks do not get it. This
      holds on day 1 and on day 15.
- [ ] At most 5 open tasks: Add is disabled at 5, and the API refuses a sixth
      (`tooManyTasks`). Cutting a task frees a place.
- [ ] Day 15 runs the same loop as day 1: advice → the author edits → "Save and
      send to the curator" → a check → confirm. Confirming is not offered
      before the check.
- [ ] With a person as the curator, the goal-against-stage verdict and the
      per-task goal check appear in their brief and not on the author's page.

## How to check it on the platform

Sign in at `/dev-signin` as `author@gdhub.local`, the owner of a project with an
AI checkpoint. A free checkpoint can be issued as `superadmin@gdhub.local` with
`POST /api/admin/checkpoints/free`.

1. **The AI sees the goals.** In `/dev/ai-curator`, situations *goal-check* and
   *plan-advice*: the prompt carries "Stage goal: …" and the project goal.
2. **Goal against stage.** Start a checkpoint on Ideation with the goal "release
   the game on Steam". On `/user/project/<slug>/workflow/cpN/review/1`, the line
   under the goal says it is outside the stage, and the plan still saves and
   approves. An Ideation goal gets no line.
3. **Task against goal.** Add an unrelated task, then press "Save and send to
   the curator". Only that task carries "does not lead to the goal". Through
   the API: `POST /api/checkpoint/<id>/plan/advice`, then
   `GET /api/checkpoint/<id>/review` shows the new advice kind.
4. **Limit of 5.** With 5 open tasks, Add is disabled, and
   `PATCH /api/checkpoint/<id>/plan` with `op: "add"` answers 400
   `tooManyTasks`. On day 15, cutting a task enables Add again.
5. **Day 15 loop.** Shift `startedAt`, `dueAt` and the sessions' `scheduledAt`
   back 14 days (Prisma Studio). Then: sprint-2 advice → edit → "Save and
   send" → advice on the edited tasks → confirm.
6. **Human curator.** Use the same checkpoint with a person as the curator.
   Sign in as `advisor@gdhub.local` and open
   `/advisor/checkpoints/<id>/review/<n>`: the brief shows both checks. The
   author's page shows neither.

## Out of scope

- The four lenses of a review (development, marketing, team, project
  management): GDHUB-126.
- An admin control to move a checkpoint in time.
- Editing stage goals from the admin or per workflow template. They stay in
  config until a second workflow needs its own.
- Changing the evidence check, or how artifacts are matched to tasks.
- Blocking anything on the result of a check.

## Open questions

- **Where the stage-goal verdict lives:** assumed to be in the day-1 session's
  content beside the goal check, with no new column.
- **Inputs:** `CHECKPOINT_MAX_ITEMS_PER_KIND` caps inputs at 5 too. They were
  already limited to 5 on entry, so nothing visible changes.
