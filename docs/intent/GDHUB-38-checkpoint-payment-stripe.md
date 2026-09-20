# GDHUB-38 — Paying for a checkpoint

[Linear](https://linear.app/gdhub/issue/GDHUB-38) · intent written 2026-09-17

## Want

An author who has answered the five questions of Prepare can pay, and the
checkpoint they paid for goes somewhere real. Today `Pay and start` is a locked
button with a sentence beside it saying checkout is not open.

Paying takes them out to Stripe and back to a screen of their own — dates, not
congratulation — which works in the seconds before the webhook lands. What
happens next depends on who is curating: the AI curator starts the 28 days at
once, a person is asked first, and the checkpoint waits for them.

## Why now

Every other part of the purchase exists. The card is written, the curator is
picked, the date is chosen, the agreement is ticked and the price is on screen —
and then nothing happens. A checkpoint cannot leave `Draft` by any route a user
can take, so the whole feature is unreachable in production.

## Why Stripe, when Paddle already works

The design settled on Stripe and this intent follows it, but the cost is real and
belongs written down: **Paddle is a merchant of record and Stripe is not.** Paddle
charges, collects and remits VAT on the vacancy listings today. With Stripe, the
registration and the returns are ours. That is why this issue ships with no tax
calculation at all and takes `+ VAT` off the screen — promising a calculation
that does not happen is worse than charging a flat price. Stripe Tax is its own
decision, made when someone has answered where we are registered.

## Constraints

- **The webhook is the only authority.** A checkpoint starts because Stripe said
  so, never because the browser arrived at a success URL. Typing that URL by hand
  must start nothing.
- **The same event twice starts one checkpoint.** `PaymentEvent.eventId` is
  unique and the Paddle handler already leans on that; the Stripe one does the
  same rather than inventing its own idempotency.
- **Reuse the payment model.** `Payment` is polymorphic and `PayableType.CHECKPOINT`
  exists. No checkpoint-shaped payment table, no second receipts screen —
  receipts stay at `/user/settings/payments`.
- **Paying a person does not start their 28 days.** The standard says the run
  begins when the curator takes it on. Hence `AwaitingCurator`, landing in the
  same schema trip as `STRIPE` so the database is visited once.
- **The chosen date is a wish.** `startedAt` is what the author asked for, not
  what payment or acceptance stamps.

## Done when

- [ ] `Pay and start` opens Stripe Checkout, and the price charged is the one the
      screen showed.
- [ ] Paying with the AI curator leaves the checkpoint `Active`; paying with a
      person leaves it `AwaitingCurator`.
- [ ] The success screen is correct while the checkpoint is still `Draft` —
      it says the checkpoint is starting, and settles on its own when the webhook
      lands.
- [ ] Opening the success URL without paying starts no checkpoint.
- [ ] The same Stripe event delivered twice leaves one payment and one started
      checkpoint.
- [ ] A curator accepting moves it to `Active`; declining releases it, and the
      author is told.
- [ ] Paying is refused when the agreement has not been ticked, whatever the
      client sends.
- [ ] A checkpoint payment reads as `Checkpoint` in the payments list, not as
      the raw `CHECKPOINT`.

## Out of scope

- **The curator's own screen.** Accepting and declining get a section of the
  advisor space, designed already but built separately; this issue ships the
  endpoints and the author's side of the wait.
- **Tax.** No Stripe Tax, no VAT line, no invoice PDF.
- **Refunds.** The standard says they are an admin action, and they stay one —
  including the refund owed when a curator declines.
- **Migrating vacancy payments off Paddle.** Two providers coexist; `Payment`
  already carries which one.
- **Subscriptions, discounts, coupons, seats.** One payment, one checkpoint.

## Open questions

- **Currency.** Prices are written in dollars and `Payment.currency` defaults to
  EUR. Assumed for now: charge USD and store `USD` on the row, because the
  number on screen carries a `$`.
- **What a declining curator costs.** Assumed for now: the checkpoint returns to
  `Draft` with the curator cleared, the author picks another, and the money is
  refunded by hand — no automatic refund is written.
- **How long a curator may sit on it.** Assumed for now: no timer. If it becomes
  a problem it is a cron and a reminder, not a schema change.
