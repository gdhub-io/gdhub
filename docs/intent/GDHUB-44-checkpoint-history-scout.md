# GDHUB-44 — Checkpoint history in the scout space

[Linear](https://linear.app/gdhub/issue/GDHUB-44/checkpoints-show-the-history-in-the-scout-space) · intent written 2026-11-03

## Want

A scout opening a project sees how it actually moved: every checkpoint it went
through, newest first with the running one on top — what each one set out to do, when it ran, who
curated it, and the curator's written verdict. A
human curator's name opens their talent card, so the scout knows who judged. For each
sprint inside it, the scout sees which way the team was heading relative to the
goal (toward / sideways / stalled / idle) and the curator's one-line reason.
Unlike a devlog, this is a claim someone else checked, so it is the strongest
signal a scout gets.

## Why now

Today the scout card says only "{stage} closed after the Checkpoint N verdict ·
{curator}" on the Workflow tab (GDHUB-31). It tells the scout that a checkpoint
happened, but not what it aimed at or what came of it. The data that would
answer that already exists: goals, verdicts, and since GDHUB-133
the sprint directions.

## Constraints

- **Scout project modal only**: a new section of `ProjectCardModal`, served by
  the existing `/api/scout/games/[id]/[section]` route and its
  `visibleProjectId` scoping. The public `/project/[slug]` page does not change.
- **Read-only.** A scout acts on nothing here.
- **Never shown to scouts:**
  - the author's rating of the assessment (`CheckpointRating`). It calibrates
    the AI curator, and it would stop being honest once it became public;
  - call notes, the curator's journal and the plan's internal brief;
  - prices and payments.
- **Sprint directions come from the GDHUB-133 pictures** (`repositories/checkpoints/picture.ts`).
  The rule is not recomputed here, so scouts see what the author saw.
- The design system and existing components come first: `VerdictChip`,
  `SprintDirection`, `CuratorBadge`. The frame is drawn before any code exists.

## Done when

- [ ] The scout's project modal has a Checkpoints section listing every closed
      checkpoint with any verdict — stage closed, goal met or goal missed —
      newest first, the running one on top.
- [ ] Each entry leads with its goal and verdict, then the checkpoint number,
      stage and dates, and the curator: a person's avatar, name, speciality and level, or
      the robot avatar with "AI curator".
- [ ] A human curator's name opens their talent card (`SpecialistPreviewModal`,
      as the curator picker opens it, with no hiring offer), so the scout can
      see who judged. The AI curator has no card.
- [ ] Opening an entry shows the verdict's details: the curator's verdict text and each
      sprint's direction with the reason. The checkpoint's tasks and expected
      outcomes are not shown.
- [ ] A running checkpoint appears as "in progress" with its goal and dates
      only: no verdict and no directions.
- [ ] A cancelled or draft checkpoint, or a project with no checkpoints, shows
      no entry. The latter shows a plain empty line.
- [ ] Nothing in the response or on screen carries the author's rating, call
      notes or the journal. A test asserts this on the section's payload.
- [ ] A project outside the scout's visible statuses gives a 404 for this
      section, the same as the other sections.

## How to check it on the platform

1. `/dev-signin`, then sign in as a scout persona.
2. Open `/scout/games` and pick E2E Test Game, or any project with a closed
   checkpoint. In the modal, open the Checkpoints section.
3. Check the entry: number, goal, dates, verdict and curator. Open it: the
   goal, the verdict text and four sprint rows, each with a direction and a reason.
4. Pick a project with a checkpoint that missed its goal. It is listed too,
   with the "Goal missed" verdict.
5. Pick a project whose checkpoint is still running. It shows "in progress"
   and nothing more.
6. Endpoint: `GET /api/scout/games/<projectId>/checkpoints` as the scout
   returns the list. The same call for a hidden project returns 404. The JSON
   has no `rating`, no notes and no journal fields.

## Out of scope

- The public project page, the hub's views of a project, and the author's own
  checkpoint screens.
- The author's rating of the assessment. Showing it is a separate decision,
  made deliberately (see the issue).
- Filtering or sorting `/scout/games` by checkpoint history, and alerts for it.
- Any change to how verdicts or directions are produced.
- Letting the author hide a checkpoint from scouts.

## Open questions

- **A checkpoint that closed before GDHUB-133 has no sprint directions.**
  Assumed: the entry shows the verdict text only, with no placeholder rows.
- **A human curator with no speciality to show.** Assumed: the name is plain
  text, with no card link.
- **Can the author opt out?** Assumed: no. An author who could choose which
  checkpoints to show would empty the signal.
