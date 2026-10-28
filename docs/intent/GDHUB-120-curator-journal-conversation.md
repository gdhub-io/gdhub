# GDHUB-120 — The curator journal as a conversation

[Linear](https://linear.app/gdhub/issue/GDHUB-120/checkpoints-the-admin-curator-journal-as-a-conversation-with-plan) · intent written 2026-10-28

## Want

An admin opens one checkpoint's journal and reads its 28 days the way the team
lived them: a conversation. On the left, the curator — its letters, what it
looked at and decided — and the platform: a letter or reminder sent, a window
opened, a sprint started. On the right, the author and the team: tasks sent and
approved, artifacts added, devlogs posted, the pulse answered. The oldest at the
top, the newest at the bottom, opened at the bottom as a chat is; sprint starts
and the checkpoint's end sit in the middle as dividers, and a switcher at the top
scrolls to a sprint. Every message folds out its details and its source.

Three more tabs read the same checkpoint by subject: **Plan** (the tasks and
where each stands), **Artifacts** (what each sprint added, and what the AI found
in it), **Devlogs** (what was posted, and what the AI read in its media).

## Why now

Checked on test-gtm: the journal shows only what the AI looked at, the reviews
and the verdict. The first letter, the goal check, the tasks check and the plan
letter are missing though their cost is counted; artifacts that prove no task
are in no filter; and nothing the system or the team did is there. An admin
answering "why did the author get this letter" has to read the database.

## Constraints

- Stays a drawer on Admin → Checkpoints (wider), not a new page.
- System events are written to `CheckpointJournalEntry` from now on: a new kind,
  released through gdhub-prisma first. Nothing is backfilled — older checkpoints
  show what was already kept.
- Team actions come from what is already stored (audit log, artifacts, devlogs,
  pulses, the checkpoint's own dates); no second log of the same writes.
- antd only: Tabs, Timeline/List, Collapse, Segmented; the design system's tokens.
- Admins only (`admin.checkpoints.view`), as today.

## Done when

- [ ] Every letter the AI curator wrote on a checkpoint appears in Conversation,
      day 1 included, each with its input and answer under "Source".
- [ ] A reminder or letter the platform sends is in Conversation on the left at
      the time it was sent.
- [ ] Tasks sent, plan approved, tasks confirmed on day 15, an artifact added, a
      devlog posted and a pulse answered appear on the right, by who did it.
- [ ] The list opens scrolled to the newest; the sprint switcher scrolls to that
      sprint's divider.
- [ ] Plan, Artifacts and Devlogs tabs list per sprint what the checkpoint had,
      with the AI's read under each artifact and devlog it looked at.

## Out of scope

The human curator's call notes and chat messages (the chat lives in Matrix);
the author-facing pages; backfilling events for checkpoints that already ran.

## Open questions

- Which platform events are worth a line? Assumed: every checkpoint letter and
  reminder `notify` sends, review claimed/written, window opened/closed, status
  changes. Not the hourly no-op runs.
