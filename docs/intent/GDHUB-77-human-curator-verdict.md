# GDHUB-77 — The human curator writes the verdict

[Linear](https://linear.app/gdhub/issue/GDHUB-77) · intent written 2026-10-09

## Want

When the 28 days are over, the industry curator opens the checkpoint in their
advisor space, reads the goal card, the devlogs, the evidence and the pulse in
one place, picks one of three verdicts and writes why. From then on the
checkpoint is closed: the author reads the verdict on the path, the
checkpoint's chat moves to "Closed", and the project can buy its next
checkpoint.

## Why now

Nothing takes a checkpoint out of `Active` today. `getCreationBlocker` refuses a
new checkpoint while one is AwaitingCurator, Active or Review, so every project
that runs its 28 days is stuck there and can never buy the next one. The AI
curator's closing (`closeCheckpoint`) exists but nothing calls it. The human
curator has no way to close at all, because GDHUB-42, which held that, was
cancelled.

## Constraints

- Design: `T2L8W` / `YjDna` (Write the verdict).
  - Left: the goal card, the devlogs, the evidence and the pulse.
  - Right: three verdicts, a required reasoning of up to 1200 characters, and
    "Cannot be edited afterwards".
- **What counts as delivered is decided in code.** `settleVerdict` and
  `unprovenOutcomes` (`src/lib/checkpoint-verdict.ts`) already do this for the
  AI curator. The human curator goes through the same rule.
  - With an outcome still unproven, only "Goal missed" can be chosen.
  - With every outcome proven, "Goal missed" cannot be chosen.
  - The server settles the verdict again; it never trusts the form.
- Only the checkpoint's own curator may write the verdict, only from `Review`,
  and only once.
- Closing writes the verdict, then closes the chat through `syncChat` and
  `closeCheckpointRoom`. A Matrix failure must not undo the verdict.
- **Active → Review** is the first step of the checkpoints cron:
  `api/cron/checkpoints`, daily, behind `vercel_cron`. It is the route GDHUB-72
  will grow. This step runs for both kinds of curator, because it is what makes
  the checkpoint answerable.

## Done when

- [ ] After day 28 the daily cron moves an Active checkpoint to Review. A
  checkpoint still inside its 28 days is not touched.
- [ ] The curator sees the checkpoint in Review on /advisor/checkpoints with
  "Write the verdict". The modal offers only the verdicts the evidence allows.
- [ ] Submitting closes the checkpoint with the verdict, the note, `decidedAt`
  and `decidedById`. A second submit is refused.
- [ ] Refused: another curator, the author, a checkpoint that is not in Review,
  an AI-curated checkpoint.
- [ ] The author's path shows the closed checkpoint and offers "Head for the
  next checkpoint". The chat sits under "Closed".

## Out of scope

- The AI curator's verdict run, reminders, pulses and call notes: GDHUB-72.
- Counting an outcome without an artifact (`acceptedNote`). The design does not
  draw it; the rule already allows it for later.
- Moving the stage on "Stage can be closed": GDHUB-37.
- Payout, and the author rating the curator.
- The email to the team. The verdict shows on the path; a Novu template is GDHUB-72's.

## Open questions

- When does Review start: the morning after day 28, or after the final call on
  day 29? **Assumed:** the morning after day 28, because the verdict is
  written after the final call either way.
- Should the curator be able to add a note to each outcome? **Assumed:** no; the
  design has one reasoning field.
