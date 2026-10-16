# GDHUB-53 — Checkpoint landing at `/checkpoint`

[Linear](https://linear.app/gdhub/issue/GDHUB-53/checkpoints-public-landing-page-at-checkpoint) · intent written 2026-09-11

## Want

The Checkpoint program gets a public page that sells it: what a Checkpoint is,
what 28 days look like, who the curator is, what it costs, and who it is not for.
Today the program exists only in `docs/products/checkpoint/` and in a Pencil
frame; nobody outside the team can read about it.

## Why now

The design is finished and checked against the system — `Landing — Checkpoint ·
Revised` (`eRLN0`, 1440) and `Landing — Checkpoint · Mobile` (`d2UFaN`, 390) in
[platform-design.pen](../design/platform-design.pen). The program is the product
the next several issues build; the page is what those issues point at.

## Constraints

- **The design is the contract.** Both frames, section for section. Where the two
  frames word the same thing differently, the desktop copy wins and the mobile
  layout wins — one set of strings, two layouts, no second copy deck.
- **Copy comes from the program doc.** `checkpoint-program.md` is the source of
  truth for what the author buys; `checkpoint-standard.md` for prices, verdicts
  and guarantees. Nothing on the page may claim more than those two say.
- **Vocabulary is fixed.** *Checkpoint* is the program, *sprint* is a week inside
  it, *workflow* is the project's own path outside it. The page never says
  *stage*.
- **Tokens, not literals.** The page needs display type the product scale does
  not have; that gap is closed in `src/config/design/tokens.ts`, not in a
  stylesheet. `tests/design-tokens-guard.test.ts` is the fence.
- **Nothing invented on the page.** The curator cards carry placeholder people,
  and a placeholder must look like one rather than like a stock photo of a
  stranger presented as our curator.
- **Marketing page, not a feature.** No schema, no API, no checkout. The CTA
  points at registration until there is something to buy.

## Done when

- [ ] `/checkpoint` renders all twelve sections at 390, 768, 1200 and 1440.
- [ ] Every string is a Tolgee key under `checkpointLanding.*`.
- [ ] Prices on the page match `checkpoint-standard.md` §9.
- [ ] `bun run lint` and `bun run test` pass, the token guard included.
- [ ] The page is in the sitemap and carries its own OG tags.

## Deliberately not done

- Curator data from the database. The cards take props and are fed constants.
- A checkout. The CTA goes to `/registration`.
- Illustrations beyond the four already generated for the frames.
