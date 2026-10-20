# Checkpoints · The buyer rates the assessment (GDHUB-74)

Intent: [docs/intent/GDHUB-74-curator-payout-rating-onboarding.md](../../intent/GDHUB-74-curator-payout-rating-onboarding.md) ("Rated").
Rules: [docs/checkpoints.md](../../checkpoints.md) §14 "Where a review and a rating are written"
and the actions table; [docs/checkpoint-standard.md](../../checkpoint-standard.md) ("May rate the
assessment once the verdict is out. Optional, and nothing waits on it").
Same row conventions and tokens as [checkpoint-payouts.md](checkpoint-payouts.md).

## 1. Problem & user

After the verdict the **person who paid for the checkpoint** may say whether the assessment was
any use: stars and, optionally, a comment — once, and final. Most will skip it, and nothing waits
on it. The **administrator** needs those answers to judge curators and to know whether the AI
curator can be trusted with a stage. For now only administrators see ratings — not the curator,
not the rest of the team, not other authors.

## 2. Frames

All in `docs/design/platform-design.pen`. 07.4, 11.5 and 13.2 are changed in place; the new
frames sit in the row **13.6 · Rating (GDHUB-74)** at **y 89500**, labelled by the note `Y65GAC`.

| Frame | Node id | What it shows |
|---|---|---|
| 07.4 · Modal — Checkpoint 2 results (changed in place) | `dR8Bu` | The rating block, **unanswered**, directly under the verdict (`b2YQQN`). |
| 13.6a · Results modal — Rating · stars picked, comment | `BNH67` | Two stars picked; the comment, "Once sent, it can't be changed." and Cancel / Send. |
| 13.6b · … — sending | `yBg2O` | Send loading; stars and comment read-only. |
| 13.6c · … — sent | `OjHOg` | "Your rating", the stars, the date, the comment — read-only, final. |
| 13.6e · … — send failed | `AWBjC` | Error `Alert`; values kept; Send retries. |
| 11.5 · Admin · Checkpoints — List (changed in place) | `G3Dyx` | ★ and the number under the status of a rated row (Quiet Orbit ★ 4, Driftwood ★ 2 with a comment). |
| 13.6f · Admin · Checkpoints — rating under the status, comment in a tooltip | `cEF7c` | The row and its tooltip: stars, date, comment. |
| 13.6g · Admin · Checkpoints — AI · person card tooltip with the AI rating share | `bhkcn` | The AI health line in the card's existing tooltip. |
| 13.2 · Admin · Payouts (changed in place), and its fragment 13.2b | `DM48P`, `c14iz` | Each curator's average and count under their level. |

13.6a–e are fragments of the modal's body; the rest of the modal is 07.4. (13.6d, an editing
state, was removed: a rating is final.)

## 3. Layout

### Buyer — the results modal (07.4)

- The modal is `CheckpointResult` inside `AfterVerdict`'s `Modal` (also opened by
  `?results=<id>` from the verdict notification). It is the **only** place the rating is asked —
  not the after-verdict card (07.6). The rating block is the **last item of the body, directly
  under the verdict** (after the curator's name), separated by the body's 24 gap.
- Block: outlined (1px `--gd-color-border`, radius `card`, padding 16, gap 12, transparent).
- **Unanswered**: one row — "Was this assessment any use?" 14/500 left, antd `Rate` (20) right —
  and the hint line under it: `IconEyeOff` 14 + "Only the GDHub team sees your rating. The curator
  doesn't." 13 tertiary. Nothing else until a star is picked.
- **Picking** (13.6a): the row gains the star's label left of the stars (`Rate` `tooltips`, shown as
  text: Not at all · Not much use · Somewhat · Useful · Very useful). Under it the field
  **Comment** with "(optional) · n / 500" right in the label row, `Input.TextArea` (autoSize 3–6
  rows), then the actions row: "Once sent, it can't be changed." 13 tertiary on the left, text
  `Button` **Cancel** and primary `Button` **Send** (small, 32) on the right. The hint stays last.
- **Sent** (13.6c): one row — "Your rating" 14/500, read-only `Rate` (16, `disabled`), the date
  13 tertiary; the comment under it, 14 secondary (omitted when there is none); the hint. No
  action.
- **Error** (13.6e): `Alert type="error" showIcon` between the comment and the actions.
- The buyer can reopen the modal from the checkpoint's row on the workflow path (View results)
  at any time, so an old checkpoint can still be rated if it never was.
- **Anyone else on the project** opens the same results without the block — no text in its place.

### Admin — the checkpoints list (11.5)

- The table is at its width limit, so the rating takes **no column**: it is a second line in the
  Status cell, indented to the status word — `★` 13 `--gd-color-warning` + the number 13 secondary
  `tnum`, and `IconMessage` 14 tertiary when there is a comment. Not rated: no line at all.
- Hover (13.6f): antd `Tooltip` with the five stars, "2 of 5 · 13 Oct", the comment in quotes
  and "— the author, {project}".

### Admin — the curator's average (13.2 Payouts)

- In the Payouts curator cell, after the level: "Expert · ★ 4.6 · 12 ratings". Below five
  answers no average: "Experienced · 3 ratings". None: the level alone. It is **all time**, not the
  month on screen.

### Admin — the AI curator's health (11.5 AI · person card)

- The card's existing tooltip ("{ai} with the AI curator · {human} with a person") gains a
  second line, 500 weight: "AI verdicts rated 1–2: 18% of 11 rated". Below five rated AI verdicts:
  "3 AI verdicts rated — too few to say"; none: the line is left out. Same filters as the card.

## 4. Components

| Block | Use |
|---|---|
| Rating block | new `src/components/checkpoints/CheckpointRating/` rendered at the end of `CheckpointResult`, only when the viewer is the checkpoint's payer (not mounted for anyone else) |
| Stars | antd `Rate` (`count={5}`, `tooltips` for the five labels, `disabled` while sending and in the sent view) |
| Comment | antd `Form` + `Input.TextArea showCount maxLength={500} autoSize={{ minRows: 3, maxRows: 6 }}` |
| Actions | `Typography.Text type="secondary"` final note, `Button type="text"` Cancel, `Button type="primary" size="small"` Send |
| Error | `Alert type="error" showIcon` (`IconAlertCircle`) |
| Hint | `Typography.Text type="secondary"` 13 with `IconEyeOff` |
| Admin rating line | in `CheckpointsTable`'s status render: `Flex vertical` + `Tooltip`; `IconMessage` when commented |
| Curator average | text in the `PayoutsTable` curator cell |
| AI health | an extra line in `CheckpointKpis`' existing `Tooltip` |

Tabler: `IconEyeOff`, `IconMessage`, `IconAlertCircle`; the stars are antd `Rate`'s own. Stories:
`CheckpointRating` (unanswered, picking, sending, sent with and without a comment, error);
`CheckpointsTable` rated rows; `CheckpointKpis` with the AI line (enough / too few / none).

## 5. Tokens

- Block: transparent, 1px `--gd-color-border`, radius `card`, padding 16 (`--gd-space-4`), gap 12.
- `Rate`: filled `--gd-warning-solid` (theme `Rate.starColor`), empty `--gd-neutral-300`
  (theme `Rate.starBg`; `--gd-neutral-500` on the dark admin tooltip). The admin list and tooltip use the same two.
- Question and "Your rating" 14/500 `--gd-color-text`; star label 13 `--gd-color-text-secondary`;
  date, final note and hint 13 `--gd-color-text-tertiary`; comment (sent) 14
  `--gd-color-text-secondary`.
- Textarea: the theme's input fill, radius `control`. Buttons 32 (`controlHeightSM`).
- Alert: `--gd-error-tint` / `--gd-error-on-tint`. Tooltip: theme (inverse surface).

## 6. States

**Buyer**
- **No verdict yet**: no block (the results modal is only reachable after the verdict).
- **Unanswered** (07.4): the question, empty stars, the hint. It stays like this forever if the
  buyer never answers — no reminder, no badge, nothing blocks.
- **Picking** (13.6a): a star picked opens the comment and the actions; changing the star
  changes the label. **Cancel** clears the stars and closes the form back to unanswered.
- **Sending** (13.6b): Send `loading`, `Rate` and textarea disabled, Cancel disabled.
- **Sent** (13.6c): `message.success("Thanks — your rating is saved")`; the read-only view, for
  good. No edit, no delete.
- **Error** (13.6e): nothing saved; stars and comment kept; Send retries.
- **Already rated** (another tab, double click): the server refuses the second write; the block
  shows the sent view with what was saved first.
- **Anyone else viewing** (other team members, the curator, an admin opening the results): no
  block, no text.

**Admin**
- List: rated → ★ n (+ comment icon); not rated → nothing (never `0` or `—`).
- Curator average: ≥ 5 → "★ 4.6 · 12 ratings"; 1–4 → "3 ratings"; 0 → nothing. One decimal.
- AI health: ≥ 5 rated → "AI verdicts rated 1–2: {share}% of {n} rated"; 1–4 → "{n} AI verdicts
  rated — too few to say"; 0 → no line.

## 7. Copy (Tolgee keys, English defaults)

No key is both a leaf and a parent.

| Key | English |
|---|---|
| `checkpoints.rating.question` | Was this assessment any use? |
| `checkpoints.rating.stars.1` | Not at all |
| `checkpoints.rating.stars.2` | Not much use |
| `checkpoints.rating.stars.3` | Somewhat |
| `checkpoints.rating.stars.4` | Useful |
| `checkpoints.rating.stars.5` | Very useful |
| `checkpoints.rating.commentLabel` | Comment |
| `checkpoints.rating.commentOptional` | (optional) |
| `checkpoints.rating.commentPlaceholder` | What was right or wrong about it? |
| `checkpoints.rating.final` | Once sent, it can't be changed. |
| `checkpoints.rating.send` | Send |
| `checkpoints.rating.cancel` | Cancel (or reuse `common.cancel`) |
| `checkpoints.rating.yours` | Your rating |
| `checkpoints.rating.hint` | Only the GDHub team sees your rating. The curator doesn't. |
| `checkpoints.rating.saved` | Thanks — your rating is saved |
| `checkpoints.rating.failed` | Couldn't send your rating. Try again. |
| `admin.checkpoints.list.ratingOf` | {rating} of 5 · {date} |
| `admin.checkpoints.list.ratingBy` | — the author, {project} |
| `admin.checkpoints.kpi.aiRatedLow` | AI verdicts rated 1–2: {share}% of {count} rated |
| `admin.checkpoints.kpi.aiRatedFew` | {count, plural, one {# AI verdict rated} other {# AI verdicts rated}} — too few to say |
| `admin.payouts.ratingAverage` | ★ {average} · {count} ratings |
| `admin.payouts.ratingCount` | {count, plural, one {# rating} other {# ratings}} |

## 8. Data needs

- **Who rates**: the checkpoint's **payer** — the user on its `Payment`. Nobody else on the team.
  A checkpoint given for free by an admin (no payment) is rated by the project's author, the
  same way. If the project changes hands, the new owner rates only the checkpoints they buy.
- **Buyer read** (with the checkpoint's results): whether the viewer is the payer and the verdict
  is sent; the existing `CheckpointFeedback` if any — rating, comment, `createdAt` (the date
  shown).
- **Buyer write**: checkpoint id, rating 1–5, comment (≤ 500, optional). **Written once**: one
  `CheckpointFeedback` per checkpoint (`checkpointId` unique), `authorId` = the payer. A second
  write is refused ("already rated"); there is no update or delete. Refused when there is no
  verdict or the viewer is not the payer. No notification to anyone. No schema change.
- **Admin list** (extends the checkpoints list): per row `rating` (or null), `ratingComment`,
  `ratedAt` (`createdAt`).
- **Admin curator stats**: per human curator, all time: count of rated checkpoints and average
  (the server sends the average only when count ≥ 5).
- **Admin AI health** (with the list totals, same filters): number of rated AI verdicts and how
  many of them are 1 or 2 (the server sends the share only when n ≥ 5).
- Never exposed to the curator's or another user's endpoints.

## 9. Open questions

- **Decided (2026-10-20):** a rating is final — given once, never edited or deleted; only the
  payer rates; asked only in the results modal; amber stars `--gd-color-warning`; curator average
  on Payouts, all time; AI health as a tooltip line.
- **Decided (2026-10-20):** a checkpoint an admin gave for free is rated by the project's author, the same way.
