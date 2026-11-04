# GDHUB-59 — the AI's read of the plan is kept, not re-asked

## What is wanted

The goal check the author sees on the payment step is stored on the checkpoint,
so that opening that step does not spend a model call every time, and so the
checkpoint carries the advice its author actually paid against.

One read, overwritten. Not a history of every version the plan passed through.

## Why

Today `POST /api/checkpoint/[id]/goal-check` runs the model on every load. The
client's `staleTime: Infinity` holds the answer for one tab and nothing more:
a reload, or walking back to the goal and forward again, asks again. The model
is the only caller of that route, so every one of those is a real call.

The cost is not the money — [ai-costs.md](../ai-costs.md) puts the goal check at
967 input and ~300 output tokens, half a tenth of a cent on Luna. It is the wait
in front of the author each time, and the fact that the advice exists nowhere
but on that screen: nothing can be said later about whether it was any good.

## What is being built

Two columns on `ProjectCheckpoint`, in `gdhub-prisma`:

- `goalCheck Json?` — the whole `GoalCheckResult`: `reachable`, `notes`,
  `missing`, `note`. The screen needs more than the paragraph — the tone and the
  title come from `reachable` and `missing`, and a stored paragraph alone could
  not be drawn back.
- `goalCheckHash String?` — what the stored read answers: the goal, the card's
  lines in order, the team's hours. A different hash is a different question.

`runGoalCheck` hashes the same values it already reads from the database,
returns the stored read when the hash matches, and otherwise calls the model and
writes the result over the old one. The hash is computed server-side: the
client's `signature` is a React Query key and cannot be trusted as a record.

## What must not move

- **The read is advice, never a gate.** It does not block payment, does not
  change the card, and the author can pay past a warning.
- **Draft only.** The route already refuses anything but `Draft`; a stored read
  does not make it answerable once the 28 days run.
- **The plan decides freshness, not time.** No TTL. An unchanged card gets the
  same answer forever; a changed one gets a new call on the next open.
- **Nothing is kept per version.** When the card changes the previous read is
  gone, deliberately: the question this issue answers is "what did they pay
  against", not "what did we tell them along the way".

## Deliberately not done

- No `model` column. Comparing Luna against Terra needs the history this issue
  is declining to keep.
- No timestamp. Without a history, "when" answers nothing that the hash does not.
- No report or query over the stored reads. The column exists so that one can be
  written later; writing it now would be guessing at the question.
