# GDHUB-107 — A waitlist for the checkpoint with an expert

[Linear](https://linear.app/gdhub/issue/GDHUB-107) · intent written 2026-10-22

## Want

An author who picks "Industry expert" on the curator step does not reach
payment. They see that the checkpoint with an expert is coming soon, join
the waitlist with one click, and are offered the AI Checkpoint for now. An admin
sees how many people wait and who they are, so they can decide when to open
expert sales.

## Why now

Only the AI Checkpoint launches (decided 2026-10-22). Nobody can sell human
curation or pay curators yet, but the demand for it should be counted rather
than lost.

## Constraints

- **One universal waitlist table**, because more waitlists will come. A row is
  the waitlist type, the person's email and the date, nothing else (Dmitry,
  2026-10-22). One email per type: joining twice changes nothing. The schema
  lands in `gdhub-prisma` first.
- The human-curator purchase code (curator table, first-call picker, Stripe
  hold) stays in the codebase. It is switched off on the path, not deleted, and
  comes back when expert checkpoints open.
- The email is the signed-in author's. No new consent text: joining is the
  author's own explicit request.

## Done when

- [ ] On the curator step, "Industry expert" reads "Coming soon". Choosing it
      shows the waitlist block instead of the experts table, and never leads to
      payment.
- [ ] "Join the waitlist" stores one row (type ExpertCheckpoint, the author's
      email, now). Pressing it again changes nothing, and the block says the
      author is on the list.
- [ ] The block offers the AI curator in its place, one click back to it.
- [ ] An admin page lists the waitlist (count, email, date) by type.
- [ ] The admin can tick rows, copy their emails, and write to the ticked rows
      or to everyone (title and message, sent through Novu to the bell and by
      email). The same letter never reaches the same person twice.

## Out of scope

- The curator pool: experts already offer themselves through Project curation
  (GDHUB-74).
- The landing copy (GDHUB-109) and the Paddle checkout (GDHUB-106).
- A guest form on the landing page.

## Open questions

- Success threshold (for example 30 entries in 2 months): Dmitry decides. It is
  recorded in GDHUB-107 once chosen.

## Added while building (2026-10-22)

- Writing to the waitlist and copying emails moved into scope (Dmitry).
- The purchase shell's top row: logo, "To home" and "Log out" in the content
  column. The exit is now in the foot: "Back" on the goal step, "Back to start"
  next to "Back" on the others.
- The shared table style drops the grey header, as ModernTable does.
- A draft's start day that has passed shows as today.
