# GDHUB-69 — Schema for checkpoint sessions: calls and AI reviews

[Linear](https://linear.app/gdhub/issue/GDHUB-69/checkpoints-schema-for-sessions-calls-and-ai-reviews) ·
intent written 2026-10-07, schema agreed 2026-10-08

## Want

A checkpoint has five sessions:

1. Plan, on day 1.
2. Sessions 2–4, one opening each of sprints 2, 3 and 4 (days 8, 15, 22).
3. Final, on day 29, followed by the verdict.

With a human curator each session is a video call. Everyone joins only after the curator, and the notes arrive within 24 hours. With the AI curator the same session is a written review the author opens from the path. Either way, the team sees on the workflow page when the next session is, whether it happened, and whether its notes or review are ready. The author can move one call per checkpoint.

## Why now

The new workflow path (GDHUB-68), the call room (GDHUB-70), the AI review pages (GDHUB-71) and the cron (GDHUB-72) all read and write sessions. None of that exists in the schema yet.

## Constraints

- **The schema lives in `gdhub-prisma`** (`../prisma`). It is released there and pinned here before any app code uses it.
- **One model for both curator kinds.** Whether a session is a call or a review follows from `checkpoint.curatorKind`, so the session does not store it.
- **Reuse what exists:**
  - `goalAgreedAt` marks the goal fixed after session 1.
  - `revisedAt` and the item fields record the session-3 task change.
  - Tasks are `CheckpointItem` rows of kind `Outcome`.
- **Hours stay in the profile** (`timeForWork`). The purchase step writes the author's own share there; nothing is copied onto the checkpoint.
- **Sprints stay derived from `startedAt`.** No sprint table.
- **Nothing destructive.** The migration only adds. Sessions are created when a checkpoint starts.

## Done when

- [ ] `CheckpointSession` exists with these fields:
  - `checkpointId` and `index` (1..5), unique together
  - `scheduledAt` and `rescheduledAt`
  - `curatorJoinedAt` and `endedAt`
  - `contentStatus` (`Pending` | `Ready`, null before the session happens)
  - `content` (Json: notes or review, people referenced by `teamMemberId`)
  - `transcript` (Json, calls only)
- [ ] `ProjectCheckpoint.previousVerdictReadAt` exists, so "Read the Checkpoint N verdict" is ticked from data.
- [ ] A new `@gdhub-io/gdhub-prisma` version is published and pinned in this repo. `bun run db:generate`, type-check and the existing checkpoint tests pass, with no app behaviour changed.

## Out of scope

Everything that reads or writes the new fields:

- the path (GDHUB-68)
- the call room, Daily and the one-reschedule rule (GDHUB-70)
- the review pages (GDHUB-71)
- transcription, notes, reviews and emails (GDHUB-72)
- the stage gate (GDHUB-37)

## Decided

- **One reschedule per checkpoint** is enforced by the app, inside a transaction: no session of the checkpoint may already have `rescheduledAt`.
- **The transcript is kept** while the notes built from it are being tuned. It is to be cleared once they are good enough, and that needs its own issue for retention and erasure.
- **The `cp3` number in the route** is derived (the project's non-Draft, non-Cancelled checkpoints in creation order), not stored.

## Where it lands

Checkpoint work collects on `feature/gdhub-31-add-checkpoints-to-projects` and reaches `dev` only as a whole. This branch is cut from it and merges back into it.
