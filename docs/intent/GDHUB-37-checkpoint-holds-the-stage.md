# GDHUB-37 — A running checkpoint holds the stage

[Linear](https://linear.app/gdhub/issue/GDHUB-37) · intent written 2026-10-24

## Want

While a checkpoint runs on a stage, the team works through it to its verdict
before leaving the stage. The path's Next is locked and says why: "Opens after
the Checkpoint 3 verdict · by 1 Nov". Once the checkpoint is closed, whatever
its verdict, the stage works as it does today: Next opens when the stage's
required tasks are done, and the equity modal still appears for pending
promises. Nothing ever moves the stage on its own.

## Why now

The checkpoint is bought against a stage, and its verdict says whether that
stage can be left. Today the author can press Next on day 3 and the checkpoint
goes on judging a stage the project has already left.

## Constraints

- **The rule** (Dmitry, 2026-10-24): a checkpoint in Active or Review locks the
  move. After the verdict the required stage tasks still decide, even after
  "Ready for the next stage" — the verdict does not replace them.
- The gate lives in `PUT /api/project/move`, beside the required-task check;
  the path's Next mirrors it with the reason.
- No `checkpoint_verdict` task in the workflow templates: a checkpoint is
  optional, so a template never requires one.
- Moving back is locked too while a checkpoint runs: it holds the stage both ways.
- Logic: [checkpoints-stage-hold-flow.d2](../checkpoints-stage-hold-flow.d2).

## Done when

- [ ] With an Active or Review checkpoint, `move` refuses next and previous and
      names the checkpoint; the path shows Next locked with the reason and the
      verdict date.
- [ ] After any verdict the checkpoint no longer holds the stage: Next follows
      the required tasks, as without a checkpoint.
- [ ] Without a checkpoint, behaviour matches today, including the equity modal.
- [ ] The scout project card says whether a stage was closed after a checkpoint
      verdict ("Ready for the next stage", AI or the curator's name) or by its
      own tasks.

## Out of scope

- Moving the stage automatically on a verdict.
- Changing which tasks a stage requires.

## Open questions

- **Draft or AwaitingCurator:** assumed not to hold the stage — the 28 days
  have not started.
