# GDHUB-108 — The Georgian entity becomes the seller

[Linear](https://linear.app/gdhub/issue/GDHUB-108) · intent written 2026-10-22

## Want

Everyone who reads GDHub's legal pages, signs up or buys a checkpoint sees one
operator: Individual Entrepreneur Dzmitry Drynau, Georgia. It is the party they
contract with, the data controller and the seller. The AI Checkpoint is bought
through Paddle as merchant of record, the way vacancy listings already are. The
texts no longer describe a Lithuanian non-profit, Stripe, card holds or a human
curator's sale.

## Why now

On 2026-10-22 non-profit structures were ruled out as the operator, so the VšĮ
cannot sell checkpoints. Only the AI curator launches, paid through Paddle
(GDHUB-106). Paddle reviews the site and its terms before it approves the
product, so the documents have to be right first.

## Constraints

- **Edit v1 in place, no new versions.** None of the legal layer is live yet
  (decided 2026-10-22). The registry's "never edited once merged" rule starts
  with the first production release, not before. Checksums are recomputed.
- The texts take the operator from `{{entity.*}}`. The switch is
  `HUB_LEGAL_ENTITIES.default` → `founder`, and every v1's `entity` follows it
  (the registry test refuses a mismatch).
- Stripe and the human-curator wording are not deleted from the code. Only the
  published texts change. Pro Checkpoint, with an expert, will likely come back
  on Stripe later.
- Paddle reads these pages. "Coaching", "mentoring", "consulting", "course" and
  "training" do not describe the checkpoint anywhere.

## Done when

- [ ] /legal-details stays as it is: the founder (the Georgian entity) and the
      Lithuanian VšĮ as a representative office (decided 2026-10-22). The VšĮ
      stays in the config, but no document names it.
- [ ] Terms of Use, Privacy Policy, Cookie Policy, Refund Policy and Project
      Requirements name the Georgian entity and Georgian law. They mention no
      Lithuanian body or law, no non-profit and no Stripe.
- [ ] Checkpoint Purchase Terms describe the AI Checkpoint only. They cover:
      - Paddle as merchant of record (Paddle's required wording);
      - payment taken at once;
      - no hold, no curator replacement;
      - withdrawal and refunds as Paddle and the Refund Policy run them.
- [ ] The Advisor Agreement (with the Expert Services Terms folded in) has no
      version in effect, so nobody is asked to accept it. Turning on advising
      works without it, and no checkbox asks for a document that is not
      published. Project curation is still behind payout details. A Pro
      Checkpoint cannot be bought until GDHUB-107.
- [ ] The registry test and the legal tests pass.

## Out of scope

- The Paddle checkout itself (GDHUB-106) and the expert waitlist (GDHUB-107).
- Rewriting the Advisor Agreement for a future commercial entity.
- Prices or currency: the founder entity is USD, as the VšĮ was.
- Counsel review. Points that need it go to `docs/legal/open-points.md`.

## Open questions

- Platform-services drafts (`docs/legal/platform-services-*`): they live on the
  #414 branch, not here. Assumed: they are deleted there, not in this branch.
- Course Agreement: it is issued by the hub, so it follows the switch.
  Assumed: no other change.
