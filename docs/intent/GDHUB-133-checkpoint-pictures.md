# GDHUB-133 — Checkpoint pictures, the difference between them, and the direction

[Linear](https://linear.app/gdhub/issue/GDHUB-133) · intent written 2026-11-02 ·
diagrams: [checkpoints-picture-flow.d2](../checkpoints-picture-flow.d2) ·
[checkpoints-curator-pipeline-flow.d2](../checkpoints-curator-pipeline-flow.d2)

## Want

Every sprint review and the verdict compare the project as it was before the
period with the project as it is after it, and say what changed through the four
lenses — what was done, what changed in the team, which signals came in, and
where the tasks are heading. Each review also names the **direction**, separately
for the checkpoint goal and for the stage goal: moving toward it, gone sideways,
standing still, or nothing done. The verdict reads the four directions in a row
and says how the direction changed over the 28 days.

## Why now

The curator sees a feed of events for the period plus the project as it stands
today, not a before and an after. The team, the hours and the links are read as
they are now, so a member whose hours dropped mid-run reads as having always had
fewer. Views and applause are totals for all time, presented as the period's.
Description, settings, link and hours changes leave no trace at all. The review
says "on course / at risk / behind", which is pace, not direction, and the
verdict sees only the curator's letters, never the sprint reads it would need to
tell a run that drifted from one that held its course.

## Constraints

- **One pipeline for both curators.** Each period runs the same three steps —
  the picture of changes, the read through the four lenses with the direction,
  the proposals for the next sprint — and the verdict adds whether the goal was
  reached. The AI curator writes it; the human curator says it on the call, and
  the call notes are read into the same shape. Only the voice differs.

- A **picture** is a `CheckpointJournalEntry` of a new kind `Snapshot` (one enum
  value in gdhub-prisma; no new table). `sprint` 0 is day 1, 1–4 the end of each
  sprint. Written by the platform, never by the AI, for every curator kind.
- A picture holds ids, names and counters — never the content. What an artifact
  or a devlog's media shows stays in its existing read (`Evidence`, `Artifact`,
  `DevlogMedia`) and is joined by id.
- Counters are stored as totals; a period's numbers are the difference of two
  pictures. `Project.viewsCount` already exists.
- The difference is computed in code and handed to the model as text; the model
  never compares two JSON blobs.
- Picture 0 is written when the checkpoint becomes active — after payment for
  the AI curator, after approval for a human one — or on the chosen start day if
  that is later. It holds the day-1 inputs the author listed (name + artifacts);
  with none listed, everything the project has; a new project gives a near-empty
  picture, which is valid.
- The day-1 input artifacts are read by the AI once, with the same reader and
  within the same budget as a sprint's artifacts.
- The tasks and their evidence still decide the verdict (`settleVerdict`); the
  lenses and the direction explain it.
- The human curator keeps a free choice of verdict (GDHUB-77); `settleVerdict`
  is not applied to it. The verdict modal warns, task by task, where no
  evidence proves a task, and the curator decides.
- **Direction by rule.** `idle` — the difference is empty (no artifact, devlog
  or change): decided in code, the model cannot overrule it. `toward` — new
  evidence on a task, or work that plainly moves the goal. `sideways` — work
  outside the tasks that does not move the goal. `stalled` — activity, but no
  task moved: no new evidence, the same tasks open.
- **Human call notes:** a lens or direction the curator did not speak to stays
  empty — the brief's AI text is never shown as the curator's words. After the
  call the curator confirms the two directions in one click, preset to the
  brief's. Walking every task on the call is the curator's job, not the
  platform's.
- **Order in the nightly run:** a sprint's picture is written before its review
  reads it.
- **Order at the end:** the sprint 4 review comes first, with its direction;
  the verdict follows and reads all four. Today the AI settles the verdict
  before its final letter so the letter agrees with it — that order flips, and
  what the final letter said about the goal moves into the verdict note.
- `checkpoint:simulate` and `checkpoint:review` move a checkpoint's journal back
  in time; pictures move with it.
- **The lab (`/dev/ai-curator`, GDHUB-117) runs the whole pipeline**, through
  the same code as production and without a database: situations take
  pictures as input and show the difference the model received; a "whole run"
  situation walks pictures 0–4 → reviews 1–4 in order → the verdict, each step
  fed by the one before; a call-notes situation turns a human call's
  transcript into the same shape.

## Done when

- [ ] An AI checkpoint run through `checkpoint:simulate` has five `Snapshot`
      entries in its journal — day 1 and the end of each sprint — and so does a
      human-curator checkpoint.
- [ ] A team member's stated hours changed during sprint 2 appear in the sprint 2
      review's team lens as a change, from → to.
- [ ] A link added and the description edited during a sprint appear in that
      sprint's review; nothing that did not change is listed as a change.
- [ ] Views and applause in a review are the sprint's own, not all-time totals.
- [ ] Every sprint review carries a direction for the checkpoint goal and for the
      stage goal, each one of the four, with a sentence on why.
- [ ] The verdict note names how the direction went across the four sprints.
- [ ] A human curator's call notes carry the same four lens lines, the two
      directions and the proposals as an AI review, so the author's Review tab
      reads the same for either curator.
- [ ] A sprint with nothing in its difference is `idle` whatever the model
      answered.
- [ ] After a call the human curator confirms both directions, preset to the
      brief's; a lens the call did not cover shows nothing to the author.
- [ ] The sprint 4 review is written before the verdict, and the verdict note
      reads all four directions.
- [ ] In the lab, the "whole run" situation shows for each sprint the
      difference, the review with its two directions, and at the end the
      verdict reading all four; an empty difference comes out `idle`.
- [ ] In the lab, a transcript that skips marketing gives call notes with the
      marketing lens empty and the rest in the same shape as an AI review.
- [ ] The human curator's verdict modal shows the run's difference (day 1 →
      day 28) and the four directions beside the evidence, and warns on each
      task no evidence proves — without blocking any verdict.
- [ ] The day-1 input artifacts have a read in the journal, and the day-1 goal
      check refers to what they show, not only to their names.

## How to check it on the platform

0. Without a database: `/dev/ai-curator`, situation "whole run" — read each
   sprint's difference, review and directions, then the verdict; then the
   call-notes situation with a transcript that skips a lens.
1. `bun run test-env`, then `bun run checkpoint:simulate <projectSlug>` on a
   project with a team and a link.
2. Sign in at `/dev-signin` as the super admin, open the checkpoint's curator
   journal in the admin: five pictures, one per boundary, each readable.
3. Before the sprint 2 boundary, as the project author: change a member's hours
   (their profile), add a store link and edit the description in project
   settings. Run `bun run checkpoint:review <id> 2`.
4. As the author, open the checkpoint's Review tab for sprint 2: the three
   changes are named in the lenses, and the direction is stated for both goals.
5. `bun run checkpoint:review <id> 4`: the verdict note names the direction
   across the run.

## Out of scope

- Project page views counted per day (a new `ContentViewSubject`) — the
  `viewsCount` difference is enough for now.
- Steam wishlists and reviews for the marketing lens — GDHUB-132.
- Showing pictures or their difference to the author or the curator as a screen
  of its own; they reach people only through the reviews and the verdict.
- Changing how the verdict is decided, its three outcomes, or `settleVerdict`.
- Extending the audit log to project or profile fields.

## Open questions

- Should the direction ever decide the verdict — all tasks proven, the run gone
  sideways? Assumed: no; it explains, and the existing rule "the outcomes
  together do not show the goal → missed" covers that case.
- A human curator's checkpoint: does the brief before each call read the
  difference too? Assumed: yes, it already reads the same facts.
- A picture missed because the nightly run failed: assumed the next run writes
  it with the boundary's date and what stands at that moment, and says so.
