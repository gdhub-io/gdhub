# GDHUB-60 — The money is held, not taken

[Linear](https://linear.app/gdhub/issue/GDHUB-60) · intent written 2026-09-17

## Want

Paying for a checkpoint reserves the money on the author's card instead of
charging it. It is taken when the curator accepts and the 28 days begin. If they
decline, if the author changes their mind, or if three days pass without an
answer, the reservation is released and nothing was ever charged.

## Why now

[GDHUB-38](GDHUB-38-checkpoint-payment-stripe.md) shipped the straightforward
thing: charge, then refund when the plan falls through. A refund returns the
money but not Stripe's processing fee, so every curator who declines costs the
platform a percentage of a checkpoint nobody ran — about $13 on a $450 one. And
declining is not an edge case: it is the normal second half of "a person may say
no", which the whole standard is built around.

An authorisation that is released costs nothing at all. The money never moved,
so there is no fee to lose and no refund to explain.

## Constraints

- **Three days for the curator.** Stripe cancels an uncaptured authorisation
  after seven by itself, and an authorisation that dies of old age looks to the
  author like the platform losing their purchase. Three leaves room for a
  reminder and for the release to be ours rather than Stripe's.
- **The schema does not move.** `PaymentStatus.PROCESSING` is an authorisation
  and `CANCELED` is a released one; both already exist.
- **Capture is what starts the 28 days.** Not the webhook, not the author's
  chosen date — the same rule as today, with money attached to it.
- **The screen may not say "paid" while it is only held.** An author who reads
  "payment received" and then sees the hold drop off has been lied to.
- **Refunds stay.** Money captured and then given back still happens — a curator
  who disappears on day 3 — and `charge.refunded` keeps its handler.

## Done when

- [ ] Paying leaves the card authorised and the payment `PROCESSING`; nothing is
      charged until somebody accepts.
- [ ] A curator accepting captures the money and starts the 28 days.
- [ ] A curator declining releases the authorisation, and the payment reads
      `CANCELED` rather than refunded.
- [ ] Cancelling before capture releases; cancelling after capture refunds.
- [ ] Three days without an answer releases the authorisation and hands the
      checkpoint back to the author as an unpaid draft.
- [ ] The waiting screen says the money is held and when it will be taken, and
      never says it has been paid.

## Out of scope

- **Partial capture.** One price, one capture.
- **Reauthorising an expired hold.** If the three days lapse the author pays
  again from a draft; re-charging a card nobody is looking at is worse.
- **Other payment methods.** Manual capture is a card feature; the checkout
  stays card-only, which it already is.
- **Paddle.** Vacancy listings are untouched.

## Open questions

- **What the author sees on a released hold.** Assumed for now: the checkpoint
  returns to `Draft` with the curator cleared, the same state a decline leaves,
  and the reason is in the notification rather than on the card.
- **Reminding the curator.** Assumed for now: one reminder a day before the
  three days are up, riding the existing notification machinery — and if that
  turns out to need design, it is its own issue.
