# Scout project modal — Checkpoints tab (GDHUB-44)

Frames: **09.07.7** `YU95z` (history), **09.07.8** `tMdco` (none yet); the direction block is `l6SPry`.
Intent: [docs/intent/GDHUB-44-checkpoint-history-scout.md](../../intent/GDHUB-44-checkpoint-history-scout.md) · logic: [docs/checkpoints-scout-history-flow.d2](../../checkpoints-scout-history-flow.d2).

## What was built

- A **Checkpoints** tab between Workflow and Reviews in `ProjectCardModal`
  (`tabs/CheckpointsTab.tsx`), fed by `GET /api/scout/games/[id]/checkpoints`
  (`getProjectCardCheckpoints` in `repositories/scout/project-card.ts`).
- antd `Collapse`, outlined, newest first. The row leads with the **goal**, then
  `Checkpoint N · stage · dates`; on the right the verdict (`VerdictChip`) and the curator.
- A running checkpoint (Active, Review) shows "In progress" and `from <date> · day N of 28`,
  and does not expand.
- Opened: the curator's verdict text and **Direction by sprint** — one tinted cell per
  sprint and goal (→ toward, ↑ sideways, ⟳ standing still, ○ idle); the tooltip carries the
  word and the curator's reason. Checkpoints closed before GDHUB-133 have no directions and
  show the verdict text only.
- Curator: a person shows avatar, name (a link that opens `SpecialistPreviewModal`
  without the hiring offer) and `speciality · level`; the AI curator shows the robot
  (`AI_CURATOR_AVATAR`) and "Public game-dev knowledge", never the character it plays for the author.
- Nothing listed → plain "No checkpoints yet."

## Departures from the frame

- **Verdict is a dot and a word, not a tinted pill.** The design system keeps pills out of
  repeated lists (`StatusDot`); the frame was corrected to match.
- **Verdict words are the product's own** (`useVerdictCopy`): "Ready for the next stage",
  "Goal met", "Goal missed" in warning, not red; idle reads "Nothing done".
