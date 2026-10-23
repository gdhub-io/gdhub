# GDHUB-111 — The AI curator reads the whole project, not one devlog

[Linear](https://linear.app/gdhub/issue/GDHUB-111) · intent written 2026-10-24

## Want

When the AI curator checks a goal, writes the day-1 plan, reviews a sprint or
gives the verdict, it speaks from everything the project shows, the way a human
curator who opened the project page would: every devlog of the sprint (and of the
whole checkpoint for the verdict), what happened on the project (artifacts added,
people joining or leaving, open positions), who on the team actually
worked each week and in what role, and where the project stands on its path —
what this stage expects and what the next one needs. A "ready for the next stage"
verdict rests on what the stage expects, not only on the checkpoint's tasks.

## Why now

Only the AI checkpoint is sold (GDHUB-106), so its reviews and verdict are the
product. Today it reads a slice: the latest devlog of the sprint, artifacts as
names, the pulse as two numbers, and the stage by name. An author who posted three
devlogs sees a review that saw one.

## Constraints

- **One project picture, built once** and handed to every call (goal check, plan,
  three sprint reviews, mid-note, final report); each call takes the part it needs.
- **Only what the author could already see** on the project — nothing private to
  other projects, nothing from admin.
- **Cost:** older material is summarised, not sent raw; tokens per call stay
  logged (AI usage, GDHUB-74). A long project must not blow the context.
- **Reuse** the project activity feed and the workflow data that already exist.
  Stage moves are left out: the stage does not change while a checkpoint runs.
- The verdict guardrail (outcomes need a Ready artifact, GDHUB-56) does not move.

## Done when

- [ ] A sprint review mentions work from every devlog of that sprint, not just the last.
- [ ] The final review reads all devlogs of the checkpoint and names the stage's
      expectations it does or does not meet.
- [ ] Reviews and the verdict mention team changes and who worked which week when
      they matter (someone left, nobody confirmed a week).
- [ ] The goal check and the day-1 plan weigh the goal against what the current
      stage expects and what the next stage needs.
- [ ] Per-call token use stays logged; a project with many devlogs stays within
      the model's context.

## Out of scope

- Reading what is inside artifacts (GDHUB-110) — artifacts stay names, kinds and
  whether they open.
- The expert curator's flow.
- Changing the prompts' voice, the verdict guardrail or the schedule of reviews.

## Open questions

- **How much history:** assumed the current checkpoint in full, plus the previous
  checkpoint's verdict and a one-paragraph summary of anything older.
- **Activity window:** assumed the checkpoint's 28 days, plus the 14 days before it
  for the goal check and the plan.
