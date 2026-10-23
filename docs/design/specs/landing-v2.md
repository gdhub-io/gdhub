# Landing v2 — handoff (GDHUB-109)

## 1. Problem & user

The main landing (`/`) is read by four audiences at once: authors who need a team,
talents who want to work on a real game, scouts (publishers, investors, angels) who want
to watch games before backing them, and experts who can advise. The page has to show
what the ecosystem is made of — four spaces on one board — and send each audience to its
own door, with the Checkpoint shown as the engine that moves a project forward.

## 2. Frames

File: `docs/design/platform-design.pen`. Both frames were reworked in place (ids, names
and positions unchanged).

| Section | Desktop `TQutR` (1440) | Mobile `o8680` (390) |
|---|---|---|
| Header + hero (unchanged, live copy) | `pA2Vz` | `l40Jm` |
| Ecosystem — "the board" | `ToJm8` | `CCQuW` |
| Checkpoint (the one coral band) | `tTRUe` | `DcxM1` |
| For authors | `PGIqH` | `USBN9` |
| For talents | `qZEjF` | `oefqG` |
| For scouts | `z1xiD` | `Q3tVNg` |
| For experts | `X7LgqE` | `K9pTpZ` |
| Contacts (unchanged) | `jS9Hm` | `lbVQW` |
| Footer (unchanged; "About us" already in Platform) | `oJipP` | `nkB3Y` |

## 3. Layout

- Shell: dark `inverse` landing (`inverseTheme`, `density="marketing"`). Every section is
  full width, left-aligned, padding `--gd-space-16` (64) on all sides on desktop,
  `--gd-space-12` / `--gd-space-4` (48 / 16) on mobile; blocks inside a section are
  `--gd-space-12` (desktop) / `--gd-space-8` (mobile) apart.
- Body text columns are at most 560 wide; headlines are up to 720 wide.
- **Ecosystem**: heading block, then a row of four "districts" (`fill` columns, gap 32),
  each an isometric tile (240 wide on desktop, 144 on mobile) with the name and one line
  under it, then the live line (avatar stack + text). Mobile: 2 × 2.
- **Checkpoint**: coral band. Desktop is two columns (copy `fill`, art 480 square,
  gap 64, centred vertically). The copy column holds the heading, a horizontal timeline of
  four stops (dot + rail, day label bold, one line under it), the note and the button.
  Mobile: art on top (full width, 320 high), the timeline turns vertical (rail on the
  left, text on the right).
- **Audience sections (4–7)**: desktop two columns — copy `fill` and art 576 square, gap
  64 — with the art right / left / right / left. Copy column: heading (H2 + lead), three
  lines, the data strip (2 × 2 cards) and the button. Experts put the four expert cards in
  a full-width strip under the row. Mobile: art first (358 square), then the copy, the
  strip as a one-column list of three cards, and a full-width button; experts become a
  horizontal swipe carousel of 264-wide cards.

## 4. Components

- Hero, header, contacts, footer: existing `LandingHeroSection` (with `HeroGame`),
  `LandingContactsSection`, `MainFooter` — no change.
- Ecosystem tiles: **new** `src/components/landing/EcosystemBoard/` — an inline SVG of
  three faces per tile (top, left, right). Hub is lit in brand; the others are neutral.
  The tile is a drawing, not a control, so SVG is correct here (`ui-guard-ignore` with the
  frame name). Name and line: antd `Typography`.
- Avatar stack: antd `Avatar.Group` (circles, `corner-shape: round`).
- Checkpoint timeline: **new** `src/components/landing/CheckpointTimeline/` — antd
  `Steps` cannot be styled into dot-and-rail without fighting it; a small list with a
  `direction` prop (`horizontal` | `vertical`) is simpler. The band itself is an
  `InverseBand`-like coral surface; text on it is ink.
- Audience sections: **new** shared `src/components/landing/AudienceSection/` (props:
  art, artSide, title, lead, lines `{lead, rest}[]`, strip, action) replacing the
  per-audience copies in `LandingForAuthorsSection` / `LandingForSpecialistsSection`.
  The bold lead words are a `<Typography.Text strong>` inside the same paragraph — in the
  frame they are drawn as two stacked texts only because Pencil has no rich text; ship
  them inline.
- Art with glow: part of `AudienceSection` — a radial gradient behind the image.
- Strips: existing specialist / project card markup from the current landing sections,
  restyled as outlined cards; stage on the scouts' project cards is `<StatusDot>` + word
  (stage is a state, so a dot and a word, not a Tag). Expert cards: the curator card
  from v1 (`Ktt1n`), outlined on dark, text left-aligned; level is an antd `Tag`.
- Buttons: antd `Button` size `large` (marketing 56 desktop / 48 mobile).

## 5. Tokens

- Colour: base `--gd-color-bg` (inverse, neutral-950); cards outlined in
  `--gd-color-border` (inverse); text `--gd-color-text` / `--gd-color-text-secondary`
  (inverse); coral band `--gd-brand-500` with ink text `--gd-neutral-950`; glow
  `--gd-brand-900` → `--gd-color-bg`; tiles `--gd-brand-500/600/700` (Hub) and
  `--gd-neutral-600/700/800` (others); stage dot `--gd-amber-400`; level chip
  `--gd-color-fill-base` (inverse).
- Buttons: authors / experts `accent` (brand-500, ink label); talents `accentAlt`
  (amber-400, `onAccentAlt` label); scouts default outlined; checkpoint ink fill with
  white label.
- Radius: buttons `--gd-radius-control` (14), cards `--gd-radius-card` (16), covers,
  portraits and chips `--gd-radius-chip` (8), avatars pill.
- Spacing: `--gd-space-1 … --gd-space-16` only; gutter = marketing `--gd-page-gutter` (64).
- Type (Onest): desktop H2 48/700, line height 1.1, tracking -0.02em; lead 20; body 17 at
  1.55; names 20/600; small 14. Mobile H2 32, lead 18, body 16, names 18, small 13.
  Use the `--gd-font-size-marketing-*` clamps where they match (h2, lead).

## 6. States

- Live line and strips are data. **Loading**: card skeletons at the same size (avatar
  circle + two lines; cover + two lines), no layout shift. **Empty**: hide the strip
  entirely and keep the section (a landing never shows "nothing here"); the live line is
  hidden when the count is below 3. **Error**: same as empty — the marketing page does not
  surface fetch errors.
- Permission-denied: not applicable (public page). Signed-in users see the same page;
  buttons route to their space.
- Hero game: its loading and still-on-phones states are already specified in `fYnbu` and
  the GDHUB-112 work.

## 7. Copy (Tolgee keys, English defaults)

- `landing.ecosystem.title` — Four places to build a game together
- `landing.ecosystem.lead` — Every account starts in the Hub. From there you open a project, advise other teams or scout for games to back.
- `landing.ecosystem.hub.name` / `.line` — Hub / The talent pool, projects looking for people, open positions, experts and events.
- `landing.ecosystem.projects.name` / `.line` — Projects / The team, its roles and shares, devlogs, open positions and checkpoints.
- `landing.ecosystem.advisor.name` / `.line` — Advisor / Advice requests, calls in your calendar, the checkpoints you curate and what you earn.
- `landing.ecosystem.scout.name` / `.line` — Scout / The games being built on GDHub, followed from the first devlog to release.
- `landing.ecosystem.live` — {count} specialists open to collaborate this week
- `landing.checkpoint.title` — Checkpoint: 28 days to the next point of your game
- `landing.checkpoint.lead` — Set one goal, plan it with your team, post a devlog every sprint and get a verdict at the end.
- `landing.checkpoint.stop1.day` / `.line` — Day 1 / Goal card: one goal, agreed with the team
- `landing.checkpoint.stop2.day` / `.line` — Every sprint / Plan and post a devlog
- `landing.checkpoint.stop3.day` / `.line` — After each devlog / Your curator says what to fix next
- `landing.checkpoint.stop4.day` / `.line` — Day 28 / A clear verdict and your next move
- `landing.checkpoint.note` — The AI curator runs checkpoints today. Checkpoints with an industry expert open soon.
- `landing.checkpoint.cta` — Learn about Checkpoint
- `landing.authors.title` — Your game is missing people. Find them here.
- `landing.authors.lead` — Solo developers, student teams and small studios build their games on GDHub.
- `landing.authors.line1` — **Find the people** your game is missing — designers, programmers, artists, sound designers.
- `landing.authors.line2` — **Build on shares, not salaries:** agree roles and equity, and post open positions.
- `landing.authors.line3` — **Keep it moving:** devlogs show progress and a Checkpoint takes you to the next milestone.
- `landing.authors.strip` — Latest specialists from Talent Pool
- `landing.authors.cta` — Assemble a team
- `landing.talents.title` — Put your craft into a real game.
- `landing.talents.lead` — Game designers, developers, artists and sound designers join projects being built right now.
- `landing.talents.line1..3` — **Join a project** in development and ship real work for your portfolio. / **Get found:** your profile shows your speciality, level and projects to authors looking for people. / **Grow into an expert** by answering questions from other teams.
- `landing.talents.strip` — Latest projects
- `landing.talents.cta` — Join a team
- `landing.scouts.title` — Watch games grow before you back them.
- `landing.scouts.lead` — Publishers, investors and angels follow projects from the first devlog to release.
- `landing.scouts.line1..3` — **See real progress:** stage, team and checkpoint verdicts, not a pitch deck. / **Follow the games** you care about and get their devlogs. / **Talk to the team** directly when a game is ready.
- `landing.scouts.strip` — Games in development
- `landing.scouts.cta` — Request access
- `landing.experts.title` — Teams need what you already know.
- `landing.experts.lead` — Game industry professionals answer questions, hold paid calls and, soon, curate checkpoints.
- `landing.experts.line1..3` — **Answer questions** from teams that need your experience, on your schedule. / **Hold paid calls** at your own price. / **Curate checkpoints:** guide a team for 28 days and give the verdict. Coming soon.
- `landing.experts.strip` — Top experts
- `landing.experts.cta` — Register
- `landing.experts.ctaNote` — and turn on Advisor space

Bold lead words use Tolgee rich-text tags (`<b>…</b>`), not separate keys.

## 8. Data needs

- Live line: count of specialists marked open to collaborate within the last 7 days, plus
  5 of their avatars.
- Authors strip: latest 4 public Talent Pool profiles — avatar, speciality, level, one
  short line (bio excerpt).
- Talents strip: latest 4 public projects — cover, name, genre.
- Scouts strip: 4 public projects with cover, name, genre and current stage
  (`ProjectStatus` or stage enum).
- Experts strip: top 4 experts — portrait, name, speciality, level, bio excerpt.
- All public, cached (ISR or a short revalidate); no pagination.

## 9. Open questions

- Scouts art does not exist yet — placeholder frame "Art — scouts (to be generated)".
- The authors and talents images have a baked near-black background; in the frame the
  glow is laid over them with a lighten blend. Re-exporting them with transparency would
  let the glow sit behind, as with the experts art.
- Scout space access: "Request access" assumes a request flow; where does it go today?
- Stage names on scout cards ("Prototyping", "Demo", "Production") are assumed; map to
  the real enum.
- The live-line count threshold (hide under 3) is a suggestion.
