# GDHUB-102 — One Advisor Agreement

## Want

An advisor accepts one document, once, when they switch the Advisor space on. The Expert
Services Terms are folded back into the **Advisor Agreement**: volunteer consultations,
paid consultations and curation are three ways of working under the same agreement, and
the paid parts apply from the moment the advisor switches paid work on.

## Why

The split (GDHUB-87) left two texts between the same two parties about the same role,
pointing at each other: the agreement's sections on paid consultations and payment were
one line each sending the reader to the other text, and no circumvention and liability
were written twice. Its one argument — a change in fees should not ask volunteers to
accept again — does not hold, because fees and the platform's share live in the price
list, not in the text. Fewer documents is the rule of the legal layer.

## Decided (2026-10-20)

- **Switching paid work on is not a new document.** It is the payout details and how the
  advisor invoices — the declaration of their lawful basis — saved in Advisor settings →
  Paid work. The agreement's paid sections say they apply from then.
- **Curation is paid work only.** The old agreement let an advisor "run Checkpoints without
  a Fee" while also calling curation paid work; volunteering now covers consultations.
- **Every server guard stays**, pointed at the Advisor Agreement: taking on a checkpoint
  and saving paid work refuse while the version in effect is not accepted. The clickwrap
  in Paid work and in the curator's modal therefore shows only after a material change.
- **Edited in place as v1**, Expert Services Terms deleted: neither text has been accepted
  in production (`main` has neither).

## Must not move

- What an advisor owes on a checkpoint, the fee rules, payout timing, no circumvention.
- The legal layer's mechanism: registry, checksums, acceptances, the gate.

## Out

- Consultation pricing and booking — not built; the agreement describes them as before.
- Questions for the Lithuanian lawyer stay in [open-points.md](../legal/open-points.md).

## GDHUB-103 — the Withdrawal Waiver folded into the Purchase Terms

Same reasoning, on the buyer's side: the Waiver was a separate text for one statement made
at checkout. Article 8(8) of Directive 2011/83/EU asks for an **express request** — a box
of its own — not a document of its own. The request and both acknowledgements are now 5.2
of the Checkpoint Purchase Terms; the second box stays at checkout and is recorded as
`params.startNow` on the terms' acceptance, so the evidence is one row with the version,
checksum, time and address. The Waiver cited Article 16(m), which is digital content; a
Checkpoint is a service, so 5.2 cites 8(8), 14(3) and 16(a), checked against the
consolidated directive (2026-09-27) through EUR-Lex.
