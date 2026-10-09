# GDHUB-77 — The human curator writes the verdict

[Linear](https://linear.app/gdhub/issue/GDHUB-77) · intent written 2026-10-09

## Want

When the 28 days are over, the industry curator is told that a verdict is due,
by when, and where to write it. They open the checkpoint from their advisor
space and read the goal card, the last build, the devlogs and the team pulse
side by side. Then they pick one of three verdicts and write why. They may
draft it from sprint 4, and they send it from the start of the final call on
day 29. Sending closes the checkpoint:
- the author is told and reads the verdict on the path;
- the checkpoint's chat moves to "Closed";
- the author chooses whether to run another checkpoint or go on with the
  stage's tasks alone.

## Why now

Nothing takes a checkpoint out of `Active` today. `getCreationBlocker` refuses a
new checkpoint while one is AwaitingCurator, Active or Review, so every project
that runs its 28 days is stuck there and can never buy the next one. The AI
curator's closing (`closeCheckpoint`) exists but nothing calls it. The human
curator has no way to close at all, because GDHUB-42, which held that, was
cancelled.

## Constraints

- **Design** (`docs/design/platform-design.pen`):
  - list card `F7WRD`;
  - modal `vC7gn` (send) and `F041BL` (draft), plus the tab `VSpKU`;
  - author results `dR8Bu`;
  - path after the verdict `tQa5n`;
  - notifications `Yfr1j`.

  Logic: `docs/checkpoints-verdict-flow.d2`.
- **The curator chooses freely.** No server rule ties the verdict to the
  evidence. "Ready for the next stage" is hidden on the workflow's last stage.
- **Times, all in `src/config/checkpoint.ts`:**
  - the draft opens on the first day of sprint 4;
  - sending opens at the start of the final call;
  - the verdict is due by `dueAt` + 3 days.
  - The final call is session 5: its `curatorJoinedAt` or `scheduledAt`. With
    no session row, it is the start of day 29.
  - Overdue is still accepted.
- **Only the checkpoint's own human curator** may draft or send, and only once.
  Anyone else gets a 404.
- **The draft lives in its own columns** (`verdictDraft*`). The author's
  payloads never select it.
- **Sending:**
  1. writes the verdict and clears the draft;
  2. closes the chat through `syncChat`;
  3. notifies the author.

  Neither a Matrix nor a Novu failure undoes the verdict.
- **Active → Review** is the checkpoints cron, daily at 01:00 UTC. It moves
  every kind of checkpoint and tells human curators that a verdict is due.
- **Curators do not answer devlogs in writing.** They talk on the calls. The
  route, the form and the AI's devlog answer are gone, and so is
  `ProjectReport.curatorFeedback`.

## Done when

- [ ] After day 28 the cron moves an Active checkpoint to Review and the human
  curator gets "verdict due by …" with a link that opens the modal.
- [ ] From sprint 4 the curator can save a draft. Before the final call starts,
  sending is refused. From its start, sending closes the checkpoint with the
  verdict, the note, `decidedAt` and `decidedById`. A second send is refused.
- [ ] Refused: another curator, the author, an AI-curated checkpoint.
- [ ] The author is notified. The link opens the results. The path shows the
  verdict with its meaning, plus "How do you go on?": another checkpoint, or
  on your own. The chat sits under "Closed".

## Out of scope

- The AI curator's verdict run, reminders, pulses and call notes: GDHUB-72.
- Moving the stage on "Ready for the next stage": GDHUB-37.
- The "What you have now" purchase step: GDHUB-78.
- Payout, and the author rating the curator.
