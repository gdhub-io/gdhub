# GDHUB-39 — Artifacts: the stage they came from, and what they prove

[Linear](https://linear.app/gdhub/issue/GDHUB-39) · intent written 2026-10-24

## Want

A project collects many artifacts. Each one remembers the stage the project was
on when it was uploaded, and the Artifacts tab is grouped by stage in workflow
order. Some of them are picked by the author as evidence for a checkpoint task;
those carry a label — "Evidence · Checkpoint 2", with the tasks on hover — so the
team sees at a glance which uploads proved what.

## Why now

Without it the Artifacts tab is a flat pile: nothing says which uploads a
checkpoint relied on, and the schema still carries a `checkpointId` on the
artifact that nothing writes and that contradicts how evidence works.

## Constraints

- **The model** (Dmitry, 2026-10-24): an artifact remembers its stage, nothing
  else. A checkpoint uses an artifact only when the author picks it for a task;
  which checkpoint uses it is the checkpoint's to say (`CheckpointItem`), so the
  artifact's own `checkpointId` is dropped (gdhub-prisma #14).
- Artifacts stay independent of checkpoints in code: the API derives the label,
  the artifacts components never import checkpoint code.
- Only checkpoints that ran (not drafts or cancelled ones) and only outcomes
  count, numbered as the project's path numbers them.
- Several artifacts per task, and the "at least one opens" rule, are GDHUB-115.

## Done when

- [ ] An artifact uploaded on a stage lists under that stage; one uploaded before
      stages were recorded lists last, "Uploaded before stages were recorded".
- [ ] An artifact picked as evidence shows "Evidence · Checkpoint N" (and "· K
      tasks" when it proves several), the tasks on hover.
- [ ] `ProjectArtifact.checkpointId` is gone from the schema.

## Out of scope

- Several artifacts per task (GDHUB-115). Which artifact supersedes which.
