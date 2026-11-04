# GDHUB-101 — Refunds computed and issued by the platform

[Linear](https://linear.app/gdhub/issue/GDHUB-101) · intent written 2026-10-20

## Want

When a checkpoint has to give money back, an administrator opens it in the admin
checkpoints list, picks why (withdrawal, the curator gone with no replacement, no
verdict by day 31), sees the amount the platform worked out and what it is made of,
and confirms. The platform sends that amount back through Stripe, records it and tells
the author. Nobody computes a refund by hand or issues one from the Stripe dashboard.

## Why now

The Purchase Terms (§5.2, §5.4), the Refund Policy (§5a) and the checkpoint standard
(§7) already promise these refunds, and the launch sells against them. Today only a
cancellation before day 1 returns money (in full); every other case is an admin doing
arithmetic and clicking in Stripe, which is how a refund comes out wrong or never comes.

## Constraints

- **One split** for the refund and the curator's fee, in `config/checkpoint.ts`: a
  checkpoint with a person is **six equal parts — five calls and the verdict** (the goal
  card is fixed on call 1 and counts with it); an AI checkpoint is **four — three
  reviews and the final review with the verdict**. The AI price moves from $19 to **$20**
  so it splits; 300 and 450 already split by six.
- **From what was paid:** parts are taken from `Payment.amount`, so a promotion code
  lowers the refund in proportion. A part that does not come out whole is rounded **in
  the author's favour**.
- **Provided** = calls the curator joined (`curatorJoinedAt`), AI reviews written, and
  the verdict if sent. Nothing else is deducted, and no payment charges.
- Stripe first, row second, as `returnCheckpointMoney` does: `refunds.create({ amount })`,
  then a `Refund` row; `charge.refunded` keeps setting `REFUNDED` / `PARTIALLY_REFUNDED`.
- **Idempotent:** one refund per checkpoint — a second confirm, or a webhook replay,
  sends nothing. Never more than was paid.
- Every refund writes an `AuditLog` row and notifies the author by email and in-app.
- Cancel before day 1 and the curator-declined release keep working as they are.

## Done when

- [ ] The admin checkpoints list shows every paid checkpoint with project, curator,
      status, paid amount, and refunded amount if any.
- [ ] Opening one and choosing a reason shows the computed refund broken down
      (paid · parts provided · refund); confirming sends exactly that through Stripe.
- [ ] Withdrawal after two held calls on a $450 checkpoint refunds $300; with a 20 %
      promo code ($360 paid) it refunds $240.
- [ ] Curator gone after one held call: price less one part; the checkpoint closes.
- [ ] No verdict by day 31 with all five calls held: one part (the verdict) back.
- [ ] A second confirm on the same checkpoint sends nothing and says it was refunded.
- [ ] The author gets the email and the notification; the audit log has the row.
- [ ] The AI price reads $20 on the landing, the checkout and the receipt.

## Out of scope

- The curator's payout (GDHUB-74) — it reads the same split later.
- Detecting a vanished curator or a missing verdict (GDHUB-80) and the other admin
  controls — replace the curator, close by hand (GDHUB-40). Here the admin starts it.
- A withdrawal button for the author: they write to us, as the Terms say.
- The platform's share percentage — a config value for GDHUB-74, not used here.
- Refunds for vacancies, events or courses.

## Open questions

- Does a closed-by-refund checkpoint issue a certificate? Assumed **no**: it closes
  without a verdict, like a cancelled one.
- The curator-replaced case refunds nothing to the author — it only matters to
  GDHUB-74, so nothing is built for it here.
