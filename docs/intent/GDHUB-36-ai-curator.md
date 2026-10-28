# GDHUB-36 — AI curator, report and verdict

[Linear](https://linear.app/gdhub/issue/GDHUB-36/checkpoints-ai-curator-report-and-verdict) · intent written 2026-09-14

## Want

A checkpoint stops being a form the author fills in alone. On day 1 the curator
reads the goal card back and says what will not fit in 28 days. The day after
each devlog it answers: what reads as progress, which outcomes the post moves,
which are still untouched. On day 14 it lists the outcomes nothing has been
claimed against and asks the author to decide. On day 28 it writes the report and
the verdict that closes the checkpoint.

Everything it produces is checkable against the goal card. It reports; it does
not grade, and it never names the cut — that judgement is what a human curator
sells, and the copy may never blur the two.

## Why now

GDHUB-34 shipped the checkpoint object and the goal card, so there is something
to curate and a record with nowhere to write into: `midNote`, `summary`,
`verdict`, `verdictNote` and `ProjectReport.curatorFeedback` all exist in the
schema and are all still null. Until a verdict can be written, no checkpoint can
close, GDHUB-37 has no `StageClosed` to test its workflow condition against, and
the checkpoint page has nothing to show after day 1.

## Constraints

- **Shaped like `src/services/ai-validation`.** Typed input, typed result,
  prompts in their own folder, a forced tool call and `temperature: 0`, no
  free-text parsing. Nothing reads the model's prose.
- **The guardrail is code, not prompt.** An outcome that was not cut and carries
  no readable artifact cannot produce `StageClosed` or `GoalMet`, whatever the
  model returned. It runs on the way out of the service and the model has no way
  to waive it.
- **It is one-sided** (since GDHUB-122). It only refuses: every remaining
  outcome proven is the plan done, not the goal reached, so a `GoalMissed` the
  curator proposes then stands.
- **`acceptedNote` is the human curator's alone.** The AI curator can only count
  what it can open, and must have no code path that writes one.
- **The model sees nothing the platform cannot show the author** — goal card,
  devlogs, artifact links and descriptions, the pulse matrix, the stage template.
  No internal scores, no other projects, no admin notes.
- **Cost is per checkpoint and visible.** At most six calls: day 1, three devlog
  answers, day 14, day 28. The fourth devlog's answer is folded into the report
  rather than sent beside it.
- **Fail closed on the verdict, open everywhere else.** A model error on day 1 or
  a devlog answer leaves the checkpoint untouched and is logged; a model error on
  day 28 must not silently close a checkpoint or write a verdict.
- **When, not what, belongs to GDHUB-35.** This issue exposes four callable,
  idempotent operations; the daily cron in 35 decides the day they run on.

## Done when

- [ ] `src/services/checkpoint-curator` exposes the four calls with typed inputs
      and typed results, prompts in `prompts/`, and no free-text parsing.
- [ ] Running the day-28 call writes `summary`, `verdict`, `verdictNote`,
      `decidedAt`, and moves the checkpoint to `Closed`.
- [ ] Running the day-14 call writes `midNote` and names only the outcomes with
      nothing claimed against them.
- [ ] A devlog answer lands in `ProjectReport.curatorFeedback` with
      `curatorFeedbackAt`, under the post and never over it.
- [ ] The guardrail is a pure function with its own tests, both directions.
- [ ] Each operation run twice produces one result, not two.
- [ ] The checkpoint page shows `midNote` while the days run and the report and
      verdict once it is closed, from frames `HyaoU` and `qXEDm`.
- [ ] `bun run lint`, `bun run type-check`, `bun run test`.

## Out of scope

- **The cron and the notifications** — GDHUB-35. Nothing here schedules itself.
- **The `checkpoint_verdict` workflow condition and the seeded task** — GDHUB-37.
  This issue only writes the verdict; opening the stage is that one's job.
- **The human curator** — GDHUB-42. No assignment, no `acceptedNote` path, no
  curator queue.
- **The day-14 scope modal.** The note asks the author to decide; the cut,
  reword and add moves are the modal's, and it is not built here.
- **The pulse matrix, the rating and the thread** on frames `HyaoU`/`qXEDm`.
  Their data comes with GDHUB-35 and GDHUB-42.

## Open questions

- **A checkpoint whose every outcome was cut.** Vacuously "all remaining proven",
  so the guardrail would not force `GoalMissed`. Assumed for now: that is
  correct — day 14 cutting everything is a scope failure a human has to look at,
  and the model still has to justify the verdict it picks. Revisit if it happens.
- **Which model.** Assumed `OPENAI_API_MODEL` with a `CHECKPOINT_CURATOR_MODEL`
  override, the same escape hatch `ai-validation` has. The report call is the
  expensive one and may want a larger model than the devlog answers.
- **Devlog answers in the author's language.** Assumed: the locale is passed like
  `ai-validation` does, and the answer comes back in it. Not verified against a
  real Russian devlog yet.
