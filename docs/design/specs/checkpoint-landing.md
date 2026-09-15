# Checkpoint landing (`/checkpoint`)

The public selling page for the Checkpoint program.

**Design** — [platform-design.pen](../platform-design.pen): `Landing — Checkpoint ·
Revised` (`eRLN0`, 1440) and `Landing — Checkpoint · Mobile` (`d2UFaN`, 390).
**Code** — [src/app/(landing)/checkpoint/](../../../src/app/(landing)/checkpoint/) and
[src/components/checkpoint-landing/](../../../src/components/checkpoint-landing/).
**Copy** — [checkpoint-program.md](../../products/checkpoint/checkpoint-program.md) is the
source of truth for what the author buys; [checkpoint-standard.md](../../checkpoint-standard.md)
for prices, verdicts and guarantees.

## Sections, in order

| # | Component | What it does |
|---|---|---|
| 1 | `MainHeader` | The platform's own bar, as on every other public page, in a sticky `InverseBand`. |
| 2 | `CheckpointHeroSection` | **What we offer.** Name, descriptor, headline, the opening paragraph of the program doc, one call to action, price note, artwork. |
| 3 | `CheckpointProofSection` | Four facts on a light strip: sprints, reviews, next move, price. |
| 4 | `CheckpointExampleSection` | **One checkpoint, whole.** The story column and the finished result card. |
| 5 | `CheckpointHowItWorksSection` | **The mechanic.** Three steps and the 28-day rail. |
| 6 | `CheckpointCuratorChoiceSection` | **Which kind of curator.** Five rows of difference, as a three-column comparison on desktop and two cards on a phone. |
| 7 | `CheckpointCuratorsSection` | **And who those people are.** Three curator cards, from the database. Takes itself off the page when there is nobody to show. |
| 8 | `CheckpointPricingSection` | The price matrix by level and team size, the AI price, the market anchor, the CTA. |
| 9 | `CheckpointAudienceSection` | The honest filter. Heading on the right, the two columns on the left. |
| 10 | `CheckpointFaqSection` | Six questions in an accordion, the first one open. |
| 11 | `CheckpointFinalCtaSection` | The closing band, over the road artwork. |
| 12 | `MainFooter` | The platform footer, unchanged. |

## Decisions worth knowing

- **Vocabulary.** **Checkpoint** is the program, **sprint** is a week inside it,
  **workflow** is the project's own path outside it. The curator cards are the one place
  the page says *stage*, and it means a stage of the workflow.
- **Goals are plural.** A Checkpoint can carry one goal or five. No copy says "one goal"
  about the author's outcomes.
- **One set of strings, two layouts.** Where the two frames word the same thing
  differently, the desktop copy wins and the mobile layout wins. The comparison rows are
  the clearest case: the phone shows the same five rows as cards, including the two the
  AI curator does not do, rather than the shorter positives-only list the mobile frame
  drew.
- **Marketing type is a token now.** The product scale tops out at 40, which is a section
  heading and not a hero, so `marketingFontSize` in
  [tokens.ts](../../../src/config/design/tokens.ts) carries the display steps. Each is a
  `[mobile, desktop]` pair measured off the two frames and emitted as one `clamp()`, so
  the page needs no breakpoint to change a headline size. Sizes the pairs do not cover
  (22, 26, 28) were folded into the nearest step; everything at 24 and below comes from
  the product scale.
- **Filled brand carries brand-700, not brand-500.** Every CTA sits on a dark band and
  takes `--gd-color-action`, which is `#B42E25` in inverse mode. White on the frame's
  `#F15541` measures 3.4:1. The `EARLY ACCESS` badge is the other half of the same rule:
  brand-500 fill with an ink label.
- **A light card on a dark band re-declares the light roles.** The `light-island` mixin in
  [_surfaces.scss](../../../src/styles/_surfaces.scss) is the mirror of `InverseBand` and
  is what keeps the result card and the curator cards from rendering white on white.
- **Hover is part of the design.** The fact rows, the price rows and the comparison rows
  light on hover. The comparison needs React state for it: the three columns are siblings
  and no selector can light a whole row from a hover in one of them. The curator cards use
  a 2px brand ring and a small lift — a shadow is invisible against `#0F0F0E`.
- **There is no global `border-box` reset in this tree.** Both page containers set it
  themselves; without it the gutters land outside the 100% width and the page scrolls
  sideways by exactly the padding.
- **The CTA goes to `/registration`** until there is a checkout to send anyone to.
- **The bar is the platform's, not the page's.** An earlier version had its own header
  with the page's three anchors in it. Those anchors now live nowhere: the shared bar
  leads with a `Platform` dropdown holding *For Authors*, *For Specialists* and
  *Contacts* — the home page's own anchors, grouped so the bar stays about products and
  catalogues — and `Checkpoint` follows it. That change lands on every public page, not
  just this one. In the mobile drawer the group opens inline underneath its parent
  (`mode="inline"`); as a flyout it left the screen.
- **The curators are real people from the database.** There is no curator record yet, so
  `getFeaturedCurators` reads the closest true thing: a specialist at expert level who has
  opened themselves for mentoring — the same set the experts page lists. `isFeatured` puts
  a chosen few first.
- **The card carries no chips.** What belongs under a curator is the workflow stages they
  can help on — the nine of the `default` schema, chosen by the curator in
  [`/advisor/settings`](../../advisor-space.md#43-advisorsettings). Neither the field nor
  that page exists yet, so the card ends at the bio rather than showing
  `openForQuestions` under a label that would mean something else.

## Placeholders — must be real before this ships

- **A curator without a photo gets an empty frame**, not a stock photograph of a stranger.
  That is deliberate and should stay that way.
- **The five FAQ answers after the first one were written here**, from the program doc and
  the standard's §6 and §7. Only the first answer existed in the frame. Check them against
  the standard before publishing.
- **The market anchor** (Indie Game Academy $999–5,400, CG Spectrum from $9,999) is
  second-hand from the September 2026 research report; nobody has opened the primary
  sources.

## Where the code deviates from the frame, and why

- **`Section — Choose your curator` is `#FAFAF9`, not white.** On desktop the frame puts it
  under another white section with nothing between them; the mobile frame already made it
  sunken. The code follows the mobile frame so the two bands separate.
- **No badge on the Industry curator column.** The frames carry "MOST CHOSEN" on desktop
  and "EARLY ACCESS" on mobile; neither is true yet, so the column carries none.
- **`from $312` for Experienced on a phone**, where the mobile frame says `from $315`. The
  standard and the desktop matrix both say $312.
- **The curator cards carry no artwork of their own.** The concept-artifacts overlay on the
  result card and the journey art in the cycle band both came out of the frames, so the
  page ships two pictures: the hero and the closing road.
- **The 28-day rail is hidden below 992.** The mobile frame drops it, and compacting a
  six-column calendar leaves a list of week names that says nothing the steps above have
  not already said.

## Not done

- Tolgee keys exist in the source as `checkpointLanding.*` defaults but have not been
  pushed to Tolgee.
- No e2e test. The page has one piece of behaviour worth covering — the FAQ accordion.
- The stages a curator helps on are not on the card. They need `Speciality.curatorStages`
  in `@gdhub-io/gdhub-prisma` and the General section of `/advisor/settings` to fill it —
  see [advisor-space.md](../../advisor-space.md#43-advisorsettings).
