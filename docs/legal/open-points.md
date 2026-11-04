# Legal open points — internal

Not a published document. What is still open in [the published texts](legal-layer.md)
after GDHUB-145, and the decisions behind them, so they are not re-opened by someone who
did not see the reason.

## The set-up these texts rest on

- **Seller and operator: the Georgian individual entrepreneur** with small-business status
  (1% turnover tax, up to 500,000 GEL a year). The Lithuanian VšĮ is shown on Legal Details
  as a representative office, and in the Privacy Policy as the EU representative under
  Article 27 GDPR — never as a seller or a party to a contract.
- **Every payment goes through Paddle**, the reseller and Merchant of Record.
- **Two paid services and nothing else:** paid vacancy listings and the AI Checkpoint.

## Decided

1. **The wording follows the activity codes.** Annex 4 of Government Resolution 415 bars
   small-business status for consulting (საკონსულტაციო) and for supplying personnel
   (პერსონალით უზრუნველყოფა). The registered codes are 62010, 62090 and 63120, so:
   - the AI Checkpoint is an **automated software service** (62090) — never advice,
     consulting, coaching, a course or training, in the terms, on the landing or in
     marketing copy;
   - a paid vacancy is the **placement of a listing on the web portal** (63120) — we do not
     select, refer or place candidates, employ or supply anyone, or take a commission.
     Stay clear of NACE 78.x.
2. **Vacancy fee refundable within 14 days.** Paddle expects a refund window of 14–90 days,
   and a listing that runs up to 90 days is not "fully performed" at publication, so a flat
   "non-refundable" fails both Paddle's review and Article 16(a) of Directive 2011/83/EU.
3. **Expert (human-curator) Checkpoints are not sold through Paddle.** Paddle's Acceptable
   Use Policy prohibits human services not related to a software offering — consulting,
   advisory, coaching, access to experts — and four live calls with a curator are exactly
   that. Live human advice would also be consulting under point 1. Expert sales need a
   different seller (GDHUB-107, parked).

## Open

1. **EU representative, Article 27 GDPR — the VšĮ, named in Privacy Policy v2.** The
   controller is outside the EU and processes EU users' data continuously, so the exemption
   for occasional processing does not fit. The only place the VšĮ appears in a document,
   and only in that role. **Still open: the written mandate** from the individual
   entrepreneur to the VšĮ has to be signed before v2 takes effect.
2. **Withdrawal function, Article 11a.** Directive (EU) 2023/2673 adds to 2011/83/EU a
   "withdraw from contract here" function for contracts concluded online, applying from
   19 June 2026. The texts ask the buyer to write an email. Confirm whether Paddle's
   receipt link, as Merchant of Record, covers it; if not, the button is product work.
3. **Age at checkout.** The Terms of Use require 18 for a paid service. The Checkpoint
   checkbox confirms it; the vacancy checkout does not ask.
4. **Currency.** The vacancy fee is shown in EUR while the entity's currency in
   `src/config/legal/entities.ts` is USD, which the Checkpoint terms quote.
5. **Reviews.** If advisor ratings become public, the Omnibus rules require saying how
   they are verified.
6. **Advisor Agreement and expert terms.** [advisor-agreement/v1.md](advisor-agreement/v1.md)
   and [expert-checkpoint-terms-draft.md](expert-checkpoint-terms-draft.md) were drafted
   for the VšĮ under Lithuanian law. Both are unpublished, and both have to be rewritten
   for whichever seller GDHUB-107/108 settles on.
7. **Accountant.** Confirm in writing that Paddle payouts under these descriptions are
   small-business turnover under codes 62090 and 63120.
