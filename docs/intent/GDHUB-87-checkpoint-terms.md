# GDHUB-87 — Checkpoint terms brought in line with the product

## Want

What a buyer and a curator accept describes the Checkpoint as it is built, so the texts can
go live with the launch:

- **Checkpoint Purchase Terms** rewritten against the code (2026-10-18 audit): five
  one-to-one calls on days 1, 8, 15, 22 and 29; no written answers to devlogs, no shared
  gathering, no seasons; the AI curator's reviews on days 8, 15, 22 and a final one; the
  plan changed once, on day 15, tasks only; the verdict from day 29, due by the end of
  day 31; the money held on the card and taken when the curator accepts, released when
  they decline or stay silent for 3 days; the AI curator charged at once; USD, price by
  the curator's level; promotion codes; calls recorded and transcribed for the notes; a
  certificate to the founder, public at `/verify`.
- **Withdrawal Waiver** — the express request for immediate performance and the
  acknowledgement of what it costs, as its own text.
- **Expert Services Terms** — the paid half of the advisor role, split out of the Advisor
  Agreement: lawful basis and taxes, paid consultations, the curation fee, payouts.
- **Advisor Agreement** keeps the role: status, volunteering, a curator's duties, conduct,
  AI, confidentiality, data, what we publish.
- Refund Policy points Checkpoints at their terms; Terms of Use lose the dead ODR link;
  the Privacy Policy names the processors a Checkpoint adds (Stripe, Daily, OpenAI) and
  says that calls are recorded.

## Decided (2026-10-18)

- **Refunds: the law and nothing on top.** Before day 1 cancelling is free (the hold is
  released). Days 1–14: the statutory withdrawal, less what was already provided, on
  request by email. After that, only when we did not deliver. The "7 days for any reason"
  clause goes.
- **The AI curator stays at launch**, at $19, beside the human curator.
- **The invoice on request**: Stripe Checkout cannot create one while the price is only
  held (`capture_method: manual`), so Stripe's receipt goes out when the price is taken and
  the Platform issues the invoice when asked. The buyer's VAT number is collected at
  checkout. No VAT is charged while the VšĮ is not a VAT payer; the accountant confirms
  before the first sale. An automatic invoice after capture is a tail (GDHUB-81).
- **18+ is confirmed in the Purchase Terms tick**, not with a date of birth.
- The texts are edited in place as v1: nothing has been accepted in production yet.

## Must not move

- The legal entity comes from `src/config/legal/entities.ts`; no entity is named in a text.
- A version's checksum is pinned in the registry; the registry test proves it.
- Nothing promised that the product does not do. Where the product does something the
  text did not say (recording, the hold), the text says it.

## Not here

Curator payouts and the author's rating (GDHUB-74), moving a call (GDHUB-90), an admin
close for a verdict never sent (GDHUB-80), deleting call audio once transcribed (a tail
for GDHUB-81), the Course Agreement (courses come later).
