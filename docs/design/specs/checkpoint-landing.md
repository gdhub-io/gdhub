# Checkpoint landing (`/checkpoint`)

The public selling page for the Checkpoint program. Design lives in
[docs/design/platform-design.pen](../platform-design.pen), frame
**`Landing — Checkpoint (/checkpoint)`** (`XjzJN`), 1440 wide, in its own row on the
canvas next to the note `Row — Landing · Checkpoint`.

Copy is drawn from [docs/products/checkpoint/checkpoint-program.md](../../products/checkpoint/checkpoint-program.md)
— the program doc is the source of truth for what the author buys. Prices, rules and
guarantees come from [docs/checkpoint-standard.md](../../checkpoint-standard.md). The
numbers in the problem section come from the September 2026 research report.

## Sections, in order

| # | Frame | What it does |
|---|---|---|
| 1 | `Landing header` | An instance of the shared header (`zv7Qs`, made reusable and now used by both landings). `Checkpoint` sits in its menu in a brand pill, so the main landing links here too. The page has no anchor nav of its own. |
| 2 | `Hero` | **What we offer.** `Checkpoint` set large, `28 days closer to release.` under it, the opening paragraph of the program doc, the CTA, and the illustration. |
| 3 | `Section — Problem` | **Why it is needed.** Tens of thousands start, almost nobody arrives — three sourced numbers falling away, and the point that what is missing is any shape to the work. |
| 4 | `Section — What a checkpoint is` | **The answer, whole, before any detail.** Three steps: the goal card (you agree what done means), the result card (someone who is not you says whether it happened), and the workflow track full-width underneath (and the project moves on). The cards are the product, so the section explains and proves at the same time. |
| 5 | `Section — The 28 days` | **Detail: the calendar.** The repeating rhythm is stated once in the lead — session opens, team works, devlog closes — and each of the four sprints then carries only the one line that differs: what its session is about. |
| 6 | `Section — Signals` | **Detail: what the platform holds.** The devlog with the curator's written answer, and the pulse board. |
| 7 | `Section — Choose your curator` | **Which kind of curator.** Four rows, every one a difference between the two kinds. |
| 8 | `Section — Curators` | **And who those people are.** Three curator cards in the shape of the experts page card. Sits directly under the previous section on purpose. |
| 9 | `Section — Pricing` | Follows the curators because the price is their level times the size of your team. |
| 10 | `Section — Guarantees` | Straight after the money, where a reader asks what happens if it goes wrong. |
| 11 | `Section — Who it is for` | The honest filter, last thing before the questions. Heading on the right, columns on the left — the only section on the page that flips, which is what makes the reader slow down exactly where we ask them to check whether this is theirs. |
| 12 | `Section — FAQ` | Four objections, two per column. |
| 13 | `Section — How to start` | The closing section and the page's last CTA: five steps. Dark, like the hero — by this point the case has been read and this is where the decision is made. The hero CTA scrolls here. |
| 14 | `Main Footer` | Instance of `HEAHr`. |

## Decisions worth knowing

- **Not a cohort.** There is no season and no seat scarcity: an author creates a project,
  picks and pays a curator, and starts. The hero and the final band carry a marketing date
  only (`the next 28 days can begin on 1 October`) — it is a rolling line to refresh
  monthly, not a real intake.
- **Answer before detail.** After the problem the reader asks "so what is it?", and the
  page must answer whole before it explains anything. That is `What a checkpoint is`, and
  it earns the slot the schedule used to occupy by mistake — a calendar is a detail, and
  it read as mush when it was made to carry the answer.
- **Checkpoints chain.** The workflow track in that section says one checkpoint feeds the
  next until release, and that the curator can change between them.
- **Goals are plural.** A checkpoint can carry one goal or five. No copy on the page says
  "one goal".
- **Vocabulary.** Three words, and they do not overlap. **Checkpoint** is the program.
  **Sprint** is a week of work inside it — four of them. **Workflow** is the project's own
  path outside the program, made of concept, prototyping and the rest. The page never uses
  the word *stage*: it says the project "moves on in the workflow".
- **Checkpoints run inside a place in the workflow, not between two of them.** One position
  usually takes several, one after another; the hero track draws the circles inside the
  Prototype box and only then arrows across to Demo.
- **Four sessions**, as in the program doc. The standard still describes five (four calls
  plus the shared gathering) and prices five — the two documents need reconciling, and the
  landing follows the program doc until they are.
- **CTA copy** is `Start moving to your checkpoint`, shortened to `Start moving` in the
  header. "Start a checkpoint" was rejected: the product is the movement through the workflow.
- **Colour.** Buttons on dark use brand-700 `#B42E25`; white on brand-500 is 3.4:1. The
  shipped landing hero still uses brand-500 — this page is the corrected one.
- **The pulse is the platform's part of the deal.** The program doc's "Platform Support"
  is vague on purpose; the landing makes it concrete — a one-click weekly confirmation per
  member, reminders tied to the checkpoint rather than to the project, and a written note
  when half the calendar is gone with nothing attached.
- **One header for both landings.** `zv7Qs` inside `Landing — header & hero` was turned
  into a component and instanced here. A change to the menu now lands on both pages —
  which is the point, and also the thing to remember before editing it.
- **The spine is: what → why → how → who curates → who they are → what it costs → what if
  it fails → is it for me → questions → start.** Everything on the page has to earn a place
  on that line or come off it.
- **Rhythm.** Sections alternate dark and light; dark carries the credibility blocks
  (the 28 days, pricing, curators), light carries the explanations.

## Placeholders — must be real before this ships

- **The curator quotes are written, and the face under them is not hers.** The result card
  and the devlog answer are signed "Marta Ilves" over `hero-stats-member-2.png` — a real
  person's photograph already used on the platform landing, borrowed here so the block
  reads as a human wrote it. A fabricated quote must never ship under a real face: before
  this page goes out, either a named curator agrees to the words and supplies their own
  photo, or the attribution comes off.
- **Curator cards.** Names, photos and studios are placeholders (`Name Surname`, monogram
  avatars). The block only works if the people are real. Levels and the
  `N checkpoints · N moved the workflow on` line come from the standard, §9.
- **The workflow names** (`Ideation · Concept · Prototype · Demo · Production · Release`),
  in the workflow track and on the curator cards, are illustrative. Real names come from the
  project's workflow template.
- **The problem numbers are second-hand and unverified.** They come from the September
  2026 research report, which was itself assembled by agents; nobody has opened the
  primary sources. Do that before this page is published — 37,000 sign-ups (GMTK Jam
  2026), ~30% of jam sign-ups reaching the deadline (itch.io across 10,807 jams), 3.5% of
  hackathon projects alive five months on (a study of 592 hackathon projects, Nolte et al.,
  CSCW).
- **The three numbers are not one cohort**, and the descending bars imply they are. The
  source line under each column is the disclosure — that is as far as it goes. A method
  note explaining the populations was drafted onto the page and removed: a caveat for the
  author does not belong in front of a visitor. It lives here instead. The third figure is
  about *hackathons*, not game jams; if a game-jam equivalent turns up, prefer it. The
  academic surname was replaced with "a study of 592 hackathon projects" — a citation
  nobody recognises reads as noise on a landing page.
- **AI curator price** is set to $89.
- **The `Verdict chip` component (`StXPy`) still reads "Stage closed".** The landing
  instances override it to "Workflow moved on"; the component and the product string
  `checkpoints.verdict.stageClosed` were left alone. If the vocabulary decision holds, the
  product should follow and the overrides come out.

## What was cut, and why

The page was fuller than this and was trimmed on purpose — the fewer things it says, the
more of them land.

- **`Section — How it works`** (the five headings of the program doc) — every one of them
  was said again, and more concretely, by the timeline, the signals section and the curator
  section. Cutting it was half right: the content was duplication, but the *slot* was the
  page's answer to "so what is it?", and removing both left the schedule pretending to be
  the answer. `Section — What a checkpoint is` fills the slot properly, with the product
  itself rather than five restated headings.
- **The second result card.** It appeared in the hero art and again in `On the platform`.
- **`Section — On the platform`** was merged into `Section — Signals`: one heading over the
  devlog panel and the pulse board instead of two sections about the same thing.
- **Three rows of the curator comparison** that were the same in both columns. A comparison
  table earns its space only on the differences.
- **The in-the-price / not-in-the-price columns** under pricing — the exclusions already
  read better as "this is not for you if".
- **The third guarantee** ("a missed goal does not reset the 28 days") — the hero track and
  the first FAQ answer both already say it.
- **Half the FAQ.** Gone: whether the goals can change (the timeline shows it), who decides
  an outcome is done (the goal card shows it), moving a session and the 24-hour devlog rule
  (house rules, not a buying question), whether devlogs are public.
- **Hourly rates in the price table** and the curator cards' rates. The buyer needs the
  total, not the accounting behind it.
- **The final CTA band.** It repeated the button that `How to start` already carries, so
  that section moved to the end of the page instead and closes it.

## Illustrations

Briefs and ready-to-paste prompts live in
[checkpoint-landing-illustrations.md](checkpoint-landing-illustrations.md). The hero
picture replaces the card chain in `gtTBo`; that chain then moves into its own section
under the hero, so the mechanic is not lost.

## Not done

- Mobile layout. The existing landing has a mobile frame beside the desktop one; this page
  does not yet.
- Tolgee keys. Nothing on the page has been keyed.
