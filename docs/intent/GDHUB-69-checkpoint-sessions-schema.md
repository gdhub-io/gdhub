# GDHUB-69 — Schema for checkpoint sessions: calls and AI reviews

[Linear](https://linear.app/gdhub/issue/GDHUB-69/checkpoints-schema-for-sessions-calls-and-ai-reviews) ·
intent written 2026-10-07

## Want

A checkpoint has five sessions:

1. Plan, on day 1.
2. Sessions 2–4, one opening each of sprints 2, 3 and 4 (days 8, 15, 22).
3. Final, on day 29, followed by the verdict.

With a human curator each session is a video call. Everyone joins only after the curator, and the notes arrive within 24 hours. With the AI curator the same session is a written review the author opens from the path. Either way, the team sees on the workflow page when the next session is, whether it happened, and whether its notes or review are ready. The author can move one call once per checkpoint.

The author states each member's hours a sprint when buying, and the checkpoint keeps that answer. Today the hours are read live from the profile.

## Why now

The new workflow path (GDHUB-68), the call room (GDHUB-70), the AI review pages (GDHUB-71) and the cron (GDHUB-72) all read and write sessions. None of them exist in the schema, and the hours on the purchase step have nowhere to be saved.

## Constraints

- **The schema lives in `gdhub-prisma`** (`../prisma`). The change is released there and pinned here before any app code uses it (two-repo loop, CLAUDE.md).
- **One model for both curator kinds.** `CheckpointSession` has a `kind` of `Call` or `Review`, and `index` 1..5. Calls and reviews are not modelled separately.
- **Reuse what exists:**
  - `goalAgreedAt` marks the goal fixed after session 1.
  - `revisedAt` and the item fields (`cut`, `addedAt`, `originalText`) record the session-3 task change.
  - Tasks are `CheckpointItem` rows of kind `Outcome`.
- **Sprints stay derived from `startedAt`.** No sprint table is added.
- **Nothing destructive.** Existing checkpoints get sessions only when they start. No backfill rewrites a running checkpoint.

## Done when

- [ ] `CheckpointSession` exists with these fields:
  - `checkpointId`, `index`, `kind`
  - `scheduledAt` and `rescheduledFrom`
  - `curatorJoinedAt`, `startedAt`, `endedAt`
  - `roomName`
  - `contentStatus` (`Pending` | `Ready`), `content` (Json) and `readyAt`
  - unique on `(checkpointId, index)`
- [ ] A checkpoint can tell whether its one reschedule has been used, without scanning every session by hand.
- [ ] A member's hours a sprint (min–max) are stored per checkpoint, and the purchase step can save and read them back.
- [ ] `ProjectCheckpoint.previousVerdictReadAt` exists, so "Read the Checkpoint N verdict" can be ticked from data.
- [ ] A new `@gdhub-io/gdhub-prisma` version is published and pinned in this repo. `bun run db:generate`, type-check and the existing checkpoint tests pass, with no app behaviour changed.

## Out of scope

Everything that reads or writes the new fields:

- the path (GDHUB-68)
- the call room and Daily (GDHUB-70)
- the review pages (GDHUB-71)
- transcription, notes, reviews and emails (GDHUB-72)
- the stage gate (GDHUB-37)
- curator payout (GDHUB-74)

## Open questions

- **Where the reschedule rule lives.** Assumed: a `callRescheduledAt` on the checkpoint, set once, plus `rescheduledFrom` on the session that moved.
- **The hours table.** Assumed: a small `CheckpointMemberHours` table (`checkpointId`, `teamMemberId`, `minHours`, `maxHours`) rather than Json, so the matrix and the AI check can query it.
- **Where the `cp3` route number comes from.** `order` counts within the stage, but the route uses the project-wide number. Assumed: the number is derived (non-Draft, non-Cancelled checkpoints of the project by creation order), not stored.
- **When sessions are created.** Assumed: all five at once, when the checkpoint becomes Active, with `scheduledAt` taken from the calendar.
