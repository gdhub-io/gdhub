# GDHUB-80 + GDHUB-40 — An overdue verdict, a curator assigned by hand, a workflow that cannot be pulled away

[GDHUB-80](https://linear.app/gdhub/issue/GDHUB-80) · [GDHUB-40](https://linear.app/gdhub/issue/GDHUB-40) · intent written 2026-10-20

## Want

An administrator keeps every running checkpoint whole without touching the database:

- **A verdict nobody sent.** The day before it is due the curator is reminded; once day 31
  is over the administrators are told, once. In the admin checkpoints list the row menu then
  offers **Write the verdict** — the curator's verdict dialog, signed by the admin, the
  checkpoint closes with its certificate, and the calls that never happened are refunded
  without cancelling it — or the existing **Refund payment → No verdict**, which cancels it.
  The curator can still send their own until an admin acts.
- **A curator assigned by hand** (row menu → **Assign a curator**, frame `z20Q3F`): on a
  draft it gives the checkpoint for free — the author's goal and choices stand, no payment
  is taken, and it starts as a paid one would; on a running checkpoint it replaces the
  curator, keeping the calls' times. A reason is required; author and new curator are told.
- **A workflow that cannot be pulled away.** Deleting a project's stages or resetting its
  workflow from the admin area is refused while a checkpoint is Active or in Review, naming
  the checkpoint and its end date; the reset's dry run says the same.

## Why now

The Purchase Terms promise a verdict by day 31 and, failing that, that we close the
checkpoint (§5.4, §7). Today a silent curator leaves it in Review for ever and blocks the
project's next checkpoint. Replacing a curator, or giving a checkpoint to a partner, is
database work; and a workflow edit can delete the stage a running checkpoint is measured on.

## Constraints

- Everything behind `admin.checkpoints.manage`; every admin action writes an `AuditLog` row.
- The verdict an admin writes goes through the same rules and write as the curator's
  (`checkpoint-verdict.repository`), with `decidedById` the admin and a note that the curator
  did not send it. The certificate is issued as for any closed checkpoint.
- The refund for missed calls uses GDHUB-101's split and Stripe path: parts not delivered,
  the admin's verdict counted as delivered; one refund per checkpoint; the checkpoint stays
  Closed.
- "Once" for the admins' notice is the notification's own transaction id — no new column.
- A free checkpoint reuses what a payment does after it lands (book the calls, ask the
  curator; or start the AI one) — no second start path.
- No schema change.

## Done when

- [ ] A checkpoint due tomorrow reminds its human curator; one overdue since day 31 notifies
      the administrators once, and shows "Overdue" in the admin list.
- [ ] Row menu → Write the verdict on an overdue checkpoint closes it with the admin's
      verdict and a certificate, refunds the calls the curator never joined, and leaves an
      audit row; the author gets the verdict as from a curator.
- [ ] Row menu → Assign a curator on a draft with a goal starts it without a payment
      (AI at once; a person is asked and books the calls); on a running one it swaps the
      curator and both people hear of it.
- [ ] Deleting stages or resetting a workflow under an Active or Review checkpoint is refused
      with its name and end date; the dry run reports it.

## Out of scope

- Curator payouts, call cost and margin (GDHUB-74).
- Switching a running checkpoint between AI and a person.
- Detecting a curator who missed two calls (the admin sees it and acts).
- Moving calls when a replacement curator cannot make the booked times.

## Open questions

- Who are "the administrators" for the overdue notice? Assumed: everyone holding
  `admin.checkpoints.manage`.
- Drafts appear in the admin list only under a **Draft** status filter, so the default view
  stays "paid checkpoints".
