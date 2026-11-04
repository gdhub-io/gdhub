# GDHUB-126 — Four lenses on every review

[Linear](https://linear.app/gdhub/issue/GDHUB-126) · intent written 2026-10-30

## Want

Every review of a checkpoint reads the project through four lenses:

- **Development:** what was built. It is split into work within the tasks and
  work outside them.
- **Marketing:** what the audience was told and how it answered.
- **Team:** the hours and the pace against the goal.
- **Project management:** the tasks and the way to the goal chain (GDHUB-125).

Today a review reads task by task. Two things fall out of that:

- The author never hears that public devlogs drew no applause at a stage where
  the audience matters.
- The author never hears that the team's stated hours cannot carry the plan.

The lenses run on every review:

- sprint reviews;
- goal and plan advice on day 1 and day 15;
- the verdict note;
- the human curator's brief.

The author reads them as four short blocks in the Review tab. A human curator
gets the same lenses in their brief.

## Why now

The AI curator gets no marketing data at all, and each review moment gathers
its own facts:

- devlog media reach the sprint review but not the verdict;
- no moment gets applause or views.

Reviews therefore read as a task checklist, not as a curator's read of the
project. That is the opposite of what the checkpoint sells.

## Constraints

- **The verdict is still decided by the tasks and the goal** (GDHUB-122,
  GDHUB-125). The lenses explain it and never decide it.
- **Team is context, not a judgement.**
  - One open task is not a missing person.
  - Pace is read only once two sprints show it.
  - The first advice is about hours. Adding a person is a careful last option.
- **Lens weights per stage** live in `src/config/checkpoint.ts`, next to
  `CURATOR_STAGE_GOALS`. They change by a pull request (decided 2026-10-30). A
  low-weight lens gets one line and is never blamed for zeros it was not meant
  to have.
- **One collector of checkpoint facts for a period, grouped by lens.** Every
  moment reads it, and moments differ only in the period and in what they ask.
  Marketing data and weights are added there once.
- **No schema change.** Applause and views already exist (`yQGeg` applause and
  the own view counter).
- **The Review tab gets four lens blocks,** designed in Pencil before they are
  built.
- **Prompt changes go through the AI curator lab.** The e2e cassettes are
  re-recorded once at the end.

## Done when

- [ ] The AI curator's input for every moment comes from one collector and
      carries the period's public devlogs with their applause and views, plus
      the store page and links.
- [ ] Each stage has lens weights in config. A low-weight lens is one line, and
      a high-weight lens is a full block.
- [ ] A sprint review shows four lens blocks. Development lists the work within
      the tasks and the work outside them.
- [ ] Day-1 and day-15 advice flags, by lens:
  - a task that does not lead to the goal (project management);
  - no hours for the plan (team);
  - no task for the audience at a stage where marketing weighs.
- [ ] The verdict note and the human curator's brief use the lenses as the
      explanation.
- [ ] One open task with the team confirming work never brings a hiring
      suggestion.
- [ ] `docs/checkpoint-standard.md` says devlogs are public.

## How to check it on the platform

1. **The lab.** In `/dev/ai-curator`, situation *sprint-review*, the prompt
   carries the marketing data and the stage's lens weights. The answer has four
   lens blocks.
2. **Sprint review.** As `author@gdhub.local`, publish a devlog in the sprint,
   then applaud it as `member@gdhub.local`. On
   `/user/project/<slug>/workflow/cpN/review/<n>`:
   - the Marketing block names the devlog and its applause;
   - Development lists the work within and outside the tasks.
3. **Weights.** Review the same checkpoint on Ideation and on "Preparing a demo
   version". Marketing is one line on Ideation and a full block on the demo
   stage.
4. **Team as context.** A sprint with one open task and pulses confirmed gets
   no hiring advice. Two sprints with almost nothing closed get advice about
   hours and pace.
5. **Human curator.** As `advisor@gdhub.local`, the brief at
   `/advisor/checkpoints/<id>/review/<n>` shows the four lenses.

## Out of scope

- Editing lens weights in the admin, or per workflow template.
- New analytics: only applause and views already counted.
- Changing how the verdict is decided.
- Marketing data from outside GDHub, such as Steam wishlists or social
  networks.

## Open questions

- **Store page and links:** assumed to be the project's own links (the store
  URL and socials on the project page), not fetched content.
- **Weights scale:** assumed to be `low | normal | high` per lens, not numbers.
  It is enough to say "one line" or "a full block".
