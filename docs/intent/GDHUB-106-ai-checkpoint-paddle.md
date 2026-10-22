# GDHUB-106 — The AI Checkpoint is paid through Paddle

[Linear](https://linear.app/gdhub/issue/GDHUB-106) · intent written 2026-10-22

## Want

An author who runs to the next checkpoint with AI pays in the Paddle checkout,
the same way vacancies are paid today, and the checkpoint starts as soon as the
payment goes through. A promotion code from GDHub works in that checkout. When
an admin refunds the checkpoint from the GDHub admin, the money goes back
through Paddle and the checkpoint shows it.

## Why now

The seller is the Georgian entity (GDHUB-108), and its payment account is
Paddle. The Stripe checkout ran on the Lithuanian VšĮ's account, and that
operator is ruled out (2026-10-22). Until the AI Checkpoint can be paid through
Paddle, nothing can be sold.

## Constraints

- **Stripe stays in the code.** The checkpoint with an expert will probably be
  paid through Stripe later. The Paddle path is built next to it. The Stripe
  path (hold, capture, release, its webhook) is switched off for checkpoints,
  not removed or rewritten.
- **One payment interface, two providers** (Dmitry, 2026-10-22). The checkpoint
  code calls the same functions whichever provider takes the money:
  - start a checkout;
  - read a webhook event;
  - refund;
  - receipt link;
  - create, disable and list promotion codes.

  A Stripe adapter wraps the existing Stripe calls, and a Paddle adapter does the
  same for Paddle. The `Payment` row's `provider` picks the adapter for
  everything after the checkout; a config value picks it for new checkouts.
  Hold, capture and release stay Stripe-only and optional in the interface.
- **The AI Checkpoint is captured at once.** There is no hold, because there is
  no curator to wait for.
- **Reuse the vacancy flow:**
  - the Paddle.js overlay with `customData.paymentId`;
  - the `/api/paddle/webhooks` route with its `PaymentEvent` idempotency;
  - the `Payment` rows (`PayableType.CHECKPOINT`, `provider = PADDLE`).

  Vacancy payments must keep working unchanged.
- **The checks before payment stay as they are:**
  - purchase open;
  - age 18+;
  - purchase terms accepted, with the "start now" waiver.
- **The Paddle catalog:**
  - Product name **AI Checkpoint** at $20, one payment.
  - Description from GDHUB-106: software only, with none of the words
    "coaching", "mentoring", "consulting", "course" or "training".
  - The sandbox product and price are created through the API for this work.
    The live ones are created by Dmitry once Paddle approves the product.
- No schema change is expected: `Payment`, `Refund`, `PaymentEvent` and
  `PaymentProvider.PADDLE` already exist.

## Done when

- [ ] An author who chooses the AI curator and presses Pay sees the Paddle
      checkout for "AI Checkpoint", $20.
- [ ] After a successful payment, the checkpoint is running with the AI curator.
      Its `Payment` row is COMPLETED with the Paddle transaction id and the
      amount actually charged.
- [ ] A replayed or duplicated Paddle webhook changes nothing a second time.
- [ ] A promotion code created in GDHub's admin is a Paddle discount, and it
      lowers the price in the checkout. The existing rules hold: 1–99% or a
      fixed amount, optional expiry and use limit. Paddle has no "first purchase
      only" restriction, so that option is hidden for Paddle codes. A free
      checkpoint is still given by an admin (GDHUB-40), never by a code.
- [ ] Disabling a code in the admin stops it working in the checkout.
- [ ] The admin's Refund on an AI checkpoint sends the amount the platform
      computes (GDHUB-101: the paid sum less the parts already provided) to
      Paddle as a refund adjustment. The `Refund` row and the cancelled
      checkpoint are written at once, as with Stripe. A refund Paddle later
      rejects is written to the audit log, never silently dropped.
- [ ] An expert draft still cannot be paid (`expertClosed`). No checkpoint
      checkout reaches Stripe while the Paddle path is on.
- [ ] The author's receipt link opens the Paddle invoice.

## Out of scope

- The checkpoint with an expert and its payment (it stays a waitlist,
  GDHUB-107).
- Deleting the Stripe code, or moving Stripe's existing test data.
- Payouts to curators (GDHUB-74 / GDHUB-56).
- Changing vacancy payments, or rewriting the outdated parts of
  PADDLE_INTEGRATION.md beyond adding the checkpoint flow.
- The live Paddle product approval itself (Dmitry, in the Paddle dashboard).

## Open questions

- **Currency:** assumed USD for the AI Checkpoint ($20), as the price shows
  everywhere. The `Payment` rows store the currency Paddle actually charged.
- **A checkout left open:** assumed the same rule as Stripe today. A new
  attempt cancels the earlier PENDING row, and the webhook ignores a
  transaction whose row is no longer PENDING.
- **Refunds:** Paddle approves refunds itself, sometimes after a delay. Assumed
  for now that the admin's refund is written at once, and that Paddle's
  later approval or rejection only updates it. A refund made in the Paddle
  dashboard is recorded from the webhook.
- **A promotion code in a checkout opened by the server:** assumed the
  Paddle checkout for a transaction created by the server still lets the
  author enter a discount code. If it does not, the code is entered on
  GDHub's payment step and passed to the transaction.
