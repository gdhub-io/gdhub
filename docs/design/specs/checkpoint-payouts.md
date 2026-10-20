# Checkpoints · Curator payouts (GDHUB-74, money part)

Intent: [docs/intent/GDHUB-74-curator-payout-rating-onboarding.md](../../intent/GDHUB-74-curator-payout-rating-onboarding.md).
Rules: [Expert Services Terms §2, §3 and §5](../../legal/expert-services-terms/v1.md).
Builds on [checkpoint-refunds.md](checkpoint-refunds.md) (11.5–11.9): same admin shell, KPI card,
table, row menu and modal anatomy. Read that spec for anything not repeated here. The Paid work
settings section (§10) extends [legal.md](legal.md).
The rating and curator onboarding are **not** in this pass.

## 1. Problem & user

Two people. An **administrator** has to pay curators once a month by hand: see what each one
earned in a month, check why each fee is what it is, send the bank transfer and record it as paid
with the date and the bank's reference, and add a note to a paid payout later if something about
it needs saying. They also want to see, per checkpoint, what the platform kept after the
curator's fee and the running cost (calls and AI tokens). A **curator** (advisor space) wants to
see what each of their checkpoints earned, what is waiting for the next payout and when, and what
was paid — and has to give the platform the account to pay into and how they invoice (§10).

## 2. Frames

All in `docs/design/platform-design.pen`. 11.5 and the three Paid work settings frames are changed
in place; the new frames sit in a new row at **y 87600** (below the Legal row), labelled by the
note `x90lL` "Row — 13.x · Curator payouts (GDHUB-74)", left to right:

| Frame | Node id | What it shows |
|---|---|---|
| 11.5 · Admin · Checkpoints — List (changed in place) | `G3Dyx` | Three new KPI cards (`xhn0S` Fees, `x0YAcm` Running cost with a Calls / AI legend, `csxhp` Margin); a new **Margin** column with the fee, calls and AI under it. |
| 13.1 · Admin · Checkpoints — Margin breakdown (tooltip on a row) | `Y0tHrw` | Tooltip on a Margin cell: Paid, Refunded, Curator's fee (and why), Calls (video, recording, transcript), AI (tokens), Margin. |
| 13.2 · Admin · Payouts (/admin/payouts) — September, due and paid | `DM48P` | Month switcher, 3 KPI cards, a table with one row per curator; Anna's row expanded with her 3 checkpoints and why each fee; Lea without payout details; Marcus paid, with a note under the status. |
| 13.2b · Admin · Payouts — row menus | `c14iz` | Due row: ⋮ → **Mark paid**; without payout details the item is disabled, with a lock and a tooltip; paid row: ⋮ → **Add a note**. |
| 13.2c · Admin · Payouts — empty month (table only) | `eKCNh` | Head kept, one line of plain secondary text. |
| 13.2d · Admin · Payouts — loading (table only) | `dGB1n` | Head kept, 4 skeleton rows. |
| 13.2e · Admin · Payouts — error (table only) | `PpnI5` | Error `EmptyState` + Try again (as 11.5d). |
| 13.3 · Admin · Payouts — Modal · Mark paid | `A9bzy` | Payout details with copy buttons, amount (read-only), transfer date, reference, Cancel · **Mark $682.50 paid**. |
| 13.3b · Admin · Payouts — Modal · Mark paid · already paid | `WkexH` | Info `Alert` "Already paid on 3 Oct · ref …" and only **Close**. |
| 13.3c · Admin · Payouts — Modal · Note on a paid payout | `O33p7k` | The paid line (amount, date, ref), a note textarea with a counter, Cancel · **Save**. |
| 13.4 · Advisor — Earnings (/advisor/earnings) | `v7oxX` | New tab **Earnings**; 3 cards; Checkpoints table (fee, why, Earned/Due/Paid/No fee); Payouts table. |
| 13.4b · Advisor — Earnings · no payout details | `bVuEz` | Warning `Alert` with **Add payout details** (→ Paid work, §10); a new curator with no payouts yet. |
| 13.4c · Advisor — Earnings · empty, loading & error | `MlGKy` | The three list states (table fragments only, no page chrome). |
| Legal · Advisor settings · Paid work · not set up (changed in place) | `Q8dNW0` | First time: empty fields, terms checkbox, switches below locked. |
| Legal · Advisor settings · Paid work · error (changed in place) | `SyTre` | antd Form errors: short account, terms not ticked. |
| Legal · Advisor settings · Paid work · set up (changed in place) | `S5YkC` | Saved: masked account with **Change**, terms accepted with version and date. |
| 13.5 · Advisor settings · Paid work — change the account, saving, saved, save failed | `g9B7RS` | The states between the three above. |

11.5b/c/d (`r9tCT7`, `CJvEU`, `Ar4Dh`) and 11.7/11.7b were not changed. Their heads were already
missing the Dates column; they show states, not the column set.

## 3. Layout

### 11.5 Checkpoints list (in place)

- **KPI row** grows from 4 to 7 cards, in this order: **Net · Paid · Refunded · Fees · Running
  cost · Margin · AI · person**. The six money cards share the width; AI · person stays 200 wide
  so its legend fits. In code: `grid-template-columns: repeat(6, minmax(0, 1fr)) 200px`, gap 12
  (`--gd-space-3`). Under 1280 the grid wraps to 4 columns, under 992 to 2, as today.
- Captions get shorter so each one fits on one line in a ~132px card: Net "Paid less refunded",
  Paid "Captured, not holds" (was "Taken from cards; holds aside"; Net's old "…before curators'
  fees" is no longer needed now that Fees has its own card).
- **Running cost** = calls (Daily video + recording + transcript) + AI tokens (the AI curator,
  call notes, devlog reviews, task advice), on every checkpoint, AI or human. In place of a
  caption it has a legend of two dots with whole-dollar sums: **Calls $58 · AI $8**; the exact
  sums are in its tooltip. AI keeps the AI · person card's colour (`--gd-chart-series-1`), calls
  take the next series colour.
- **Table**: columns at 1260 — Project (flex, ~204) · Curator 160 · Dates 176 · Status 160 ·
  Paid 128 · Refunded 120 · **Margin 256**, right-aligned · action 56. Paid's promo note and
  Refunded's reason go **under** the sum (vertical stack, right-aligned), as Refunded already
  does in code. Code: Status stays 240 and `scroll.x` is set to the column sum.
- Margin cell: line 1 the margin, 14 `tnum`; line 2, 13 secondary, what came off it:
  `fee −$315 · calls −$3.46 · AI −$0.42`. An AI-curated row: `AI −$1.20` only. A running row: `—`
  and the costs so far (`calls −$2.33 · AI −$0.38`). Each part is left out when it does not apply
  (no fee, no calls), never written as `$0`. Hovering the cell opens the breakdown (13.1).

### 13.2 Payouts

- Admin menu gets **Payouts** after Checkpoints (route `/admin/payouts`), its own page so that
  paid consultations (§4) can pay through it later.
- `ProtectedPageHeader` "Payouts", `extra` = month switcher: previous `Button` (40, `IconChevronLeft`),
  `DatePicker picker="month"` 200 wide, next `Button` (`IconChevronRight`). Default: **last month**.
  Next is disabled on the current month; previous goes back to the first month with a fee.
- 16 below: KPI row of 3 cards (same card as 11.5): **To pay**, **Paid**, **Curators** (a two-colour
  bar Paid / Due with a legend of dots and counts, like AI · person; counts in its tooltip).
- 16 below: table card. Columns at 1260: expand 48 · Curator (flex; `AppAvatar` 32 + name 14/500
  + level 13 secondary) · Payout details 320 (holder 14; masked account + invoicing 13 secondary) ·
  Checkpoints 120, centred · Amount 160, right, `tnum` · Status 320 · action 56.
- Status of a paid row: line 1 the dot and "Paid 3 Oct · ref SEB-20261003-0418"; line 2, when
  there is a note, `IconNote` 14 + the note in 13 secondary, one line with an ellipsis and the full
  text in a tooltip.
- Sort: Due first, then Paid; inside each by amount, highest first. No pagination (one row per
  curator); if it ever passes ~50 rows, add antd pagination under the card.
- **Expanded row** (antd `expandable.expandedRowRender`): `--gd-color-surface-sunken` band with a
  sub-table indented to the curator column (padding 4/56/8/64): Checkpoint (flex; name + "Checkpoint
  N · stage") · Closed 120 · Paid 112 · Refunded 112 · Why this fee 280 (reason 14 + formula 13
  secondary) · Fee 120 (14/500, `tnum`). Sub-head 36 with the same 11/600 labels; sub-rows 52.

### 13.3 Mark paid modal and 13.3c note

- 13.3: antd `Modal width={560}`, anatomy of 11.6. Body (gap 20): outlined block (Account holder
  and IBAN with copy buttons, Invoicing, divider, **Amount** 24/600 with "N checkpoints closed in
  {month}") → fields row (Transfer date 200 + Reference flex) → consequence line (`IconMail`).
  Footer: Cancel · primary **Mark {amount} paid**.
- 13.3c: same modal, 560. Body: the paid line (success dot, "Paid {amount} on {date} · ref {ref}"),
  then the field **Note** with a `480 / 500` counter in the label row, `Input.TextArea` (autoSize 3–6
  rows, filled, radius `control`), help "Only admins see it. The payout itself stays as it was."
  Footer: Cancel · primary **Save**. The same modal opens from **Edit note** once a note exists.

### 13.4 Earnings (advisor space)

- Advisor tabs become `Requests · Checkpoints · Calendar · Earnings · Settings`: **Earnings** is
  inserted before Settings in `MENU_ITEMS` of `src/components/spaces/AdvisorSpace`, with its own
  permission. Route `/advisor/earnings`.
- Page head as Advisor — Checkpoints: title "Earnings" + one sub-line; on the right "Paid to
  DE89 •••• 3000" (13 tertiary) and a **Change** link to Settings → Paid work.
- KPI row of 3 cards: **Earned in {current month}**, **Due on {payout date}**, **Paid in total**.
- Section "Checkpoints" (`SectionHeading` 20): table card — Project (flex) · Closed 160 · Fee 220,
  right (sum + reason under it) · Status 220 (dot + word, date under it). Newest close first,
  full-width text **Load more** under the card.
- Section "Payouts": table card — Month earned (flex) · Checkpoints 160, centred · Amount 220,
  right · Paid on 220 · Reference 240 (secondary). Newest first; Load more past 12. Admin notes
  are not shown to the curator.
- 13.4b: a warning `Alert` between the page head and the cards; the "Paid to … Change" line goes.

## 4. Components

| Block | Use |
|---|---|
| KPI cards | existing `CheckpointKpis` (11.5) — add three entries to its `money` array; reuse its card for Payouts and Earnings (lift the `Card` out to `src/components/ui` since Earnings uses it outside admin) |
| Running cost legend | the `legend` / `key` markup from `CheckpointKpis` (dot, label, bold sum), in place of the caption; antd `Tooltip` with the exact sums |
| Split bar + legend | the `mix` / `split` / `legend` markup from `CheckpointKpis`; on Payouts the two series are `success` (Paid) and `warning` (Due) |
| Margin cell + tooltip | antd `Tooltip` over a `Flex vertical align="flex-end"` in `CheckpointsTable` |
| Month switcher | antd `Button` ×2 + `DatePicker picker="month"`, inline in the page (extract to `src/components/admin/MonthSwitcher/` only when a second page needs it) |
| Payouts table | new `src/components/admin/PayoutsTable/` — antd `Table` styled as `PromoCodesTable` (rule 8), `expandable` for the checkpoint list |
| Status | `StatusDot` — Due `warning` ("Due by 15 Oct"), Late `danger` ("Late · due 15 Oct", after the date), Paid `success` ("Paid {date} · ref {ref}"), note under it in `Typography.Text type="secondary" ellipsis={{ tooltip: true }}` with `IconNote` |
| No payout details | `StatusDot tone="warning"` "No payout details" + secondary line, in the Payout details cell |
| Row menu | antd `Dropdown` on the ⋮ `Button type="text"`. Due row: **Mark paid** (`IconCircleCheck`), disabled with `IconLock` and a `Tooltip` when there are no payout details. Paid row: **Add a note** / **Edit note** (`IconNote`) |
| Mark paid modal | new `src/components/admin/MarkPayoutPaidModal/` — antd `Modal`, outlined block as `RefundCheckpointModal`, `Typography.Text copyable` (icon `IconCopy`) for holder and IBAN, `DatePicker`, `Input`, `Alert type="info"` for 13.3b |
| Note modal | new `src/components/admin/PayoutNoteModal/` — antd `Modal`, `Input.TextArea showCount maxLength={500} autoSize={{ minRows: 3, maxRows: 6 }}`, footer `Button` + `Button type="primary"` |
| Earnings page | new `src/components/advisor/EarningsPage/` (or next to the advisor checkpoints page): two antd `Table`s, `SectionHeading`, text `Button` Load more |
| Missing details notice | antd `Alert type="warning" showIcon` (`IconAlertTriangle`) with `action` = `Button size="small"` linking to Settings → Paid work |
| Paid work section | see §10 |
| Empty | plain `locale.emptyText` string, secondary text — no `EmptyState`, no button (house rule) |
| Error | `EmptyState` + `IconAlertCircle` + Try again (`IconRefresh`), as 11.5d |

Pencil draws lucide; Tabler names: `IconUserDollar` (Fees), `IconServerCog` (Running cost),
`IconPigMoney` (Margin), `IconWallet`, `IconCircleCheck`, `IconUsers`, `IconCalendar`,
`IconCalendarDue`, `IconTrendingUp`, `IconChevronLeft/Right/Down`, `IconDotsVertical`, `IconLock`,
`IconNote`, `IconCopy`, `IconMail`, `IconInfoCircle`, `IconAlertTriangle`, `IconAlertCircle`,
`IconRefresh`, `IconFileCheck`, `IconExternalLink`. The primary is graphite (`colorPrimary`).
Stories: `PayoutsTable` (due, expanded, no details, paid, paid with note, empty, loading, error),
`MarkPayoutPaidModal` (default, already paid, submitting), `PayoutNoteModal` (new, edit), Earnings
(data, no details, empty, loading, error), `CheckpointKpis` with the new cards, `PaidWorkSection`
(not set up, error, set up, changing the account).

## 5. Tokens

- Cards, tables, modals, menu, tooltip: as 11.5/11.6 (`--gd-color-surface`, head
  `--gd-color-surface-sunken`, row hairline `--gd-color-border-subtle`, card radius, `e2` menu shadow).
- KPI card: 1px `--gd-color-border`, radius `card`, padding 16 (`--gd-space-4`), gap 12; icon tile
  `--gd-neutral-100` / `--gd-color-text-secondary`; value 24/600 `tnum`; caption 12/500
  `--gd-color-text-secondary`.
- Running cost legend: dots 8, AI `--gd-chart-series-1` (same as the AI · person card), Calls
  `--gd-chart-series-3`; label 12/500 `--gd-color-text-secondary`, sum 12/600 `tnum`; gap 4 inside
  a key, 12 between keys.
- Split bar on Payouts: `--gd-color-success` (Paid) and `--gd-color-warning` (Due), 8 high, radius
  `chip`, gap 2.
- Expanded row band: `--gd-color-surface-sunken`, hairlines `--gd-color-border-subtle`.
- Note on a paid row: `IconNote` 14 `--gd-color-text-tertiary`, text 13 `--gd-color-text-secondary`,
  indented 16 so it lines up with the status word.
- Money out is written with a minus: Refunded, Fees and Running cost cards, and the
  `fee −… · calls −… · AI −…` line. Margin and the curator's own fee are written without one.
- Month switcher and modal inputs: filled, 40 (`controlHeight`), radius `control`; on the page
  `--gd-neutral-100`, in the modal the theme's input fill. Textarea: same fill, 96 at 3 rows.
- Alerts: `--gd-info-tint` / `--gd-info-on-tint`, `--gd-warning-tint` / `--gd-warning-on-tint`.
- Link "Change": `--gd-color-link`.

## 6. States

**11.5 list**
- A running row (Awaiting curator, Active, Review): Margin `—`; under it the costs so far
  (`calls −$x · AI −$y`). The fee is only known when the checkpoint closes; the tooltip says
  "Fee on close". An Awaiting curator row with nothing spent yet: `—` alone.
- A closed or refunded human row: margin, `fee −$x · calls −$y · AI −$z`. A curator who stopped or
  whose verdict an admin wrote: `calls −$y · AI −$z` (no fee part). A replaced curator's
  checkpoint: the fee is the replacement's part only.
- An AI-curated row: `AI −$x` only — no fee, no calls.
- The **Margin** card counts closed checkpoints only (its caption says so); Fees and Running cost
  count what is recorded so far under the filters. All three follow the filters and search, as
  the existing cards do.

**13.2 Payouts**
- **Due**: warning dot "Due by {date}" (the 15th after the month). After that date: danger dot
  "Late · due {date}". No reminder is sent to admins.
- **Paid**: success dot "Paid {date} · ref {ref}"; ⋮ has **Add a note**; the row still expands.
- **Paid with a note**: the note under the status line; ⋮ has **Edit note**.
- **No payout details**: warning dot in the Payout details cell; Mark paid disabled with lock and
  tooltip; the curator's money still counts in To pay.
- **Empty month** (13.2c): cards $0.00 / 0, text "Nobody earned a fee in {month}".
- **Loading** (13.2d): skeleton rows; switching months keeps the previous month until the next
  arrives. **Error** (13.2e): cards show `—`, error state with Try again.
- **Current month** (via next): rows show "Not due yet" (neutral dot), no ⋮.
- **Permission denied**: the route is refused server-side; without the manage permission the
  page is read-only (no ⋮).

**13.3 Mark paid**
- Opens with today as the transfer date, reference empty; primary disabled until a reference is
  typed (tooltip "Type the bank reference"). Transfer date can't be in the future.
- Confirming: primary `loading`, Cancel disabled. Success: modal closes,
  `message.success("Marked paid — Anna gets an email")`, row → Paid.
- **Already paid** (13.3b): another admin or a double click got there first; nothing changes.
- **Payout details changed** since the page loaded: the server refuses, modal shows an error
  `Alert` "The payout details changed — check them and try again" with the new details.

**13.3c Note**
- New: textarea empty, Save disabled until something is typed. Edit: opens with the note; Save
  disabled until it changes. Clearing the text and saving removes the note.
- The note is the only thing about a paid payout that can change; amount, date and reference
  are read-only. Every save is an audit row (who, when, whether there was a note before and after — never the text, which is erased with the curator). The curator is not
  notified and does not see it.
- Saving: primary `loading`. Success: modal closes, `message.success("Note saved")`, the row shows it.

**13.4 Earnings**
- Status per checkpoint: **Earned** (`info`, "Paid by {date}") for this month's, **Due** (`warning`,
  "By {date}") for last month's until it is paid, **Paid** (`success`, the date), **No fee**
  (`neutral`) when the curator stopped or an admin wrote the verdict. A refunded checkpoint shows
  the reduced fee with "Reduced by a refund".
- **No payout details** (13.4b): warning `Alert` with the waiting amount and **Add payout details**.
- **Empty** (13.4c): cards $0.00; "No checkpoint of yours has closed yet"; Payouts "No payouts yet".
- **Loading / error** (13.4c). The tab is shown only to curators (anyone with a human checkpoint
  or accepted as a curator); others don't see it.

## 7. Copy (Tolgee keys, English defaults)

| Key | English |
|---|---|
| `admin.checkpoints.kpi.netNote` | Paid less refunded (changed) |
| `admin.checkpoints.kpi.paidNote` | Captured, not holds (changed) |
| `admin.checkpoints.kpi.fees` | Fees |
| `admin.checkpoints.kpi.feesNote` | Earned by curators |
| `admin.checkpoints.kpi.runningCost` | Running cost |
| `admin.checkpoints.kpi.runningCost.calls` | Calls |
| `admin.checkpoints.kpi.runningCost.ai` | AI |
| `admin.checkpoints.kpi.runningCostTooltip` | Calls {calls} · AI tokens {ai} |
| `admin.checkpoints.kpi.margin` | Margin |
| `admin.checkpoints.kpi.marginNote` | On closed checkpoints |
| `admin.checkpoints.list.column.margin` | Margin |
| `admin.checkpoints.list.margin.fee` | fee −{amount} |
| `admin.checkpoints.list.margin.calls` | calls −{amount} |
| `admin.checkpoints.list.margin.ai` | AI −{amount} |
| (joined with ` · ` in code, each part only when it applies) | |
| `admin.checkpoints.margin.paid` | Paid |
| `admin.checkpoints.margin.refunded` | Refunded |
| `admin.checkpoints.margin.fee` | Curator's fee · {reason} |
| `admin.checkpoints.margin.feeOnClose` | Fee on close |
| `admin.checkpoints.margin.calls` | Calls |
| `admin.checkpoints.margin.video` | Video · {personMinutes} person-min |
| `admin.checkpoints.margin.recording` | Recording · {minutes} min |
| `admin.checkpoints.margin.transcript` | Transcript · {minutes} min |
| `admin.checkpoints.margin.ai` | AI |
| `admin.checkpoints.margin.tokens` | Tokens · notes, reviews, advice |
| `admin.checkpoints.margin.total` | Margin |
| `admin.menu.payouts` | Payouts |
| `admin.payouts.title` | Payouts |
| `admin.payouts.month.previous` / `.next` | Previous month / Next month (aria-labels) |
| `admin.payouts.kpi.toPay` | To pay |
| `admin.payouts.kpi.dueBy` | Due by {date} |
| `admin.payouts.kpi.paid` | Paid |
| `admin.payouts.kpi.transfers` | {count, plural, one {# transfer} other {# transfers}} |
| `admin.payouts.kpi.curators` | Curators |
| `admin.payouts.kpi.legend.paid` / `.due` | Paid / Due |
| `admin.payouts.column.curator` | Curator |
| `admin.payouts.column.details` | Payout details |
| `admin.payouts.column.checkpoints` | Checkpoints |
| `admin.payouts.column.amount` | Amount |
| `admin.payouts.column.status` | Status |
| `admin.payouts.invoicing.selfEmployed` / `.company` / `.selfBilling` | Self-employed / Company / Self-billing |
| `admin.payouts.noDetails` | No payout details |
| `admin.payouts.noDetailsNote` | The curator has not added them |
| `admin.payouts.status.due` | Due by {date} |
| `admin.payouts.status.late` | Late · due {date} |
| `admin.payouts.status.paid` | Paid {date} · ref {reference} |
| `admin.payouts.status.notDue` | Not due yet |
| `admin.payouts.expanded.checkpoint` / `.closed` / `.paid` / `.refunded` / `.why` / `.fee` | Checkpoint / Closed / Paid / Refunded / Why this fee / Fee |
| `checkpoints.fee.reason.full` | Full fee |
| `checkpoints.fee.reason.refundReduced` | Reduced by a refund |
| `checkpoints.fee.reason.replacement` | Took over · {parts} of {total} parts |
| `checkpoints.fee.reason.stopped` | You stopped — no fee (curator) / Stopped — no fee (admin) |
| `checkpoints.fee.reason.adminVerdict` | Verdict written by an admin — no fee |
| `checkpoints.fee.formula.full` | 70% of {paid} |
| `checkpoints.fee.formula.refundReduced` | 70% of ({paid} − {refunded}) |
| `checkpoints.fee.formula.replacement` | {calls, plural, one {# call} other {# calls}} and the verdict |
| `admin.payouts.menu.markPaid` | Mark paid |
| `admin.payouts.menu.noDetails` | No payout details. {name} has to add them in Advisor settings → Paid work. |
| `admin.payouts.menu.addNote` | Add a note |
| `admin.payouts.menu.editNote` | Edit note |
| `admin.payouts.empty` | Nobody earned a fee in {month} |
| `admin.payouts.error.title` | Couldn't load payouts |
| `admin.payouts.markPaid.title` | Mark {name}'s {month} paid |
| `admin.payouts.markPaid.holder` | Account holder |
| `admin.payouts.markPaid.iban` | IBAN |
| `admin.payouts.markPaid.invoicing` | Invoicing |
| `admin.payouts.markPaid.invoicingNote.selfEmployed` / `.company` / `.selfBilling` | Invoice from the curator / Invoice from the company / We issue the self-billing document |
| `admin.payouts.markPaid.amount` | Amount |
| `admin.payouts.markPaid.amountNote` | {count, plural, one {# checkpoint} other {# checkpoints}} closed in {month} |
| `admin.payouts.markPaid.date` | Transfer date |
| `admin.payouts.markPaid.reference` | Reference |
| `admin.payouts.markPaid.referenceMissing` | Type the bank reference |
| `admin.payouts.markPaid.consequence` | {name} gets an email. A paid month can't be edited later. |
| `admin.payouts.markPaid.submit` | Mark {amount} paid |
| `admin.payouts.markPaid.success` | Marked paid — {name} gets an email |
| `admin.payouts.markPaid.alreadyPaid` | Already paid on {date} · ref {reference} |
| `admin.payouts.markPaid.alreadyPaidNote` | Marked by {admin}. Nothing was changed. |
| `admin.payouts.markPaid.detailsChanged` | The payout details changed — check them and try again |
| `admin.payouts.note.title` | Note on {name}'s {month} payout |
| `admin.payouts.note.paidLine` | Paid {amount} on {date} · ref {reference} |
| `admin.payouts.note.label` | Note |
| `admin.payouts.note.help` | Only admins see it. The payout itself stays as it was. |
| `admin.payouts.note.save` | Save |
| `admin.payouts.note.saved` | Note saved |
| `advisor.tabs.earnings` | Earnings |
| `advisor.earnings.title` | Earnings |
| `advisor.earnings.sub` | Fees for the checkpoints you curate. |
| `advisor.earnings.paidTo` | Paid to {account} |
| `advisor.earnings.change` | Change |
| `advisor.earnings.kpi.earned` | Earned in {month} |
| `advisor.earnings.kpi.paidBy` | Paid by {date} |
| `advisor.earnings.kpi.due` | Due on {date} |
| `advisor.earnings.kpi.dueNote` | Earned in {month} |
| `advisor.earnings.kpi.paidTotal` | Paid in total |
| `advisor.earnings.kpi.payoutsSince` | {count, plural, one {# payout} other {# payouts}} since {month} |
| `advisor.earnings.kpi.noPayouts` | No payouts yet |
| `advisor.earnings.checkpoints` | Checkpoints |
| `advisor.earnings.column.project` / `.closed` / `.fee` / `.status` | Project / Closed / Fee / Status |
| `advisor.earnings.status.earned` / `.due` / `.paid` / `.noFee` | Earned / Due / Paid / No fee |
| `advisor.earnings.status.by` | By {date} |
| `advisor.earnings.payouts` | Payouts |
| `advisor.earnings.column.month` / `.count` / `.amount` / `.paidOn` / `.reference` | Month earned / Checkpoints / Amount / Paid on / Reference |
| `advisor.earnings.empty` | No checkpoint of yours has closed yet |
| `advisor.earnings.noPayouts` | No payouts yet |
| `advisor.earnings.error.title` | Couldn't load your earnings |
| `advisor.earnings.noDetails.title` | Add your payout details to get paid |
| `advisor.earnings.noDetails.body` | {amount} is waiting. We pay by bank transfer once the details are in. |
| `advisor.earnings.noDetails.action` | Add payout details |
| `common.loadMore`, `common.cancel`, `common.close`, `common.tryAgain` | reuse if they exist |

Paid work keys are in §10.

## 8. Data needs

- **Running cost** per checkpoint = calls + AI.
  - Calls = participant-minutes × Daily rate + call minutes × (recording rate + transcript rate).
  - AI = input and output tokens × the model's price, summed over every AI use tied to the
    checkpoint: the AI curator's own runs, call notes, devlog reviews, task advice.
  - Every rate lives in `config/checkpoint.ts`, next to the 30% and the payout day: the Daily,
    recording and transcript per-minute rates, and a **per-model token price** (input and output,
    per million tokens). An AI cost is computed when the call to the model is recorded, from the
    tokens the provider reports, so a later price change does not rewrite it.
- **Checkpoints list** (extends 11.5): per row `fee` (frozen amount, or null while running),
  `feeReason` (full / refund-reduced / replacement with parts / stopped / admin verdict / AI),
  `callCost` with call minutes and participant-minutes (and the video / recording / transcript
  split), `aiCost` (so far), `margin` (null while running). **Totals** gain `fees`, `callCost`,
  `aiCost`, `margin` (closed only) over all matching rows.
- **Payouts for a month** (admin): month (default last), per curator: id, name, level, avatar;
  payout details (holder, masked account, invoicing kind) or none; checkpoint count; amount;
  status (due / paid / not due yet) with due date; when paid: date, reference, who marked it, and
  the note if any. Per curator, the checkpoints earned that month: project, number, stage, closed
  date, paid, refunded, fee, fee reason with its inputs (parts held / total, calls held). Totals:
  to pay, paid, number of curators paid / due. The list of months that have fees (for the
  switcher's bounds).
- **Payout details for Mark paid**: full holder name and account (IBAN) for one curator — fetched
  on opening the modal, not in the list.
- **Mark paid**: curator id, month, transfer date, reference, and the amount / details version
  the admin saw. Returns the payout, or "already paid" (→ 13.3b), or "details changed". Records an
  audit row and sends the curator an email. Idempotent.
- **Payout note**: payout id + text (up to 500, empty removes it). Only on a paid payout; audit row
  recording only that it changed, not the text. Not returned to the curator.
- **Earnings** (curator, own rows only): earned this month, due amount + date, paid total + count
  + first month; checkpoints (paged, newest close first) with fee, reason, status, dates; payouts
  (paged) with month, count, amount, paid date, reference; whether payout details exist and the
  masked account.
- **Paid work**: see §10.

## 9. Open questions

- **Decided (2026-10-20):** one Margin column with what came off it under the number and the full
  breakdown in a tooltip; the Margin card counts closed checkpoints only; masked account in the
  table, full with copy in the modal; Payouts is its own admin menu item; "Late" after the 15th
  with no reminder; a cancelled checkpoint with a partial refund earns a reduced fee in the month
  it closes (§3.3).
- **Decided (2026-10-20):** running cost = calls + AI tokens, on every checkpoint; "Add a note" on
  a paid payout.
- One note per payout, editable; the audit log records each edit but not the text (GDPR: the note is erased with the curator) — rather than an
  append-only list of notes.
- AI token cost is attributed to a checkpoint only for uses tied to it (curator runs, call notes,
  devlog reviews and task advice inside its 28 days). Uses outside a checkpoint are not in any
  margin.
- Paid work: see §10.

## 10. Advisor settings · Paid work (payout details)

Where an expert gives the account to be paid into and how they invoice. The section was already
designed in GDHUB-54 ([legal.md](legal.md) §4, "Advisor role") as the fourth item of
`/advisor/settings`, between Requests and Danger zone, so it is **changed in place** on its three
frames rather than drawn again. 13.4b's **Add payout details** and Earnings' **Change** open it
(`/advisor/settings?section=paid-work`).

### Frames

| Frame | Node id | Change in this pass |
|---|---|---|
| Legal · Advisor settings · Paid work · not set up | `Q8dNW0` | Holder help line; "Invoicing" → **How you invoice** with one line under each option; "I accept self-billing" → **Self-billing**; payout note at the end of the Expert Services block. Frame grown to 1268 so Save shows. |
| Legal · Advisor settings · Paid work · error | `SyTre` | Same changes; frame 1324. |
| Legal · Advisor settings · Paid work · set up | `S5YkC` | Same changes; the account shows **masked, read-only, with Change** inside the field. Frame 1292. |
| 13.5 · … — change the account, saving, saved, save failed | `g9B7RS` | New, in the 13.x row: the states between the three. |

**Advisor tabs.** The space's tab bar is `Requests · Checkpoints · Calendar · Earnings · Settings`
— the shipped set in `src/components/spaces/AdvisorSpace` with **Earnings** inserted before
Settings. It is drawn that way, changed in place (tab bar only), on: `Q8dNW0`, `SyTre`, `S5YkC`
(Settings active), `eywcs` Settings · General, `RnEpX` Settings · Requests, `o8A3kI` Settings ·
Availability (Settings active), `DiaZB` Requests, `iFs6f` Requests · empty (Requests active),
`v7oxX` 13.4, `bVuEz` 13.4b (Earnings active) and `KYE2g` Calendar (Calendar active). Same tab
look on every frame: radius 10, padding 8/16, gap 8, active = `--gd-color-bg` fill and 600, the
rest transparent and 500. The Reviews frames `r0gPC` / `QCFjA` (a page the product no longer has)
keep their old bar.

### Layout

Rule 7 settings shell as drawn in GDHUB-54: section menu 220, one white card, *Save* under the
card. The card's first block is the outlined **Expert Services** block (padding 20, gap 20), in
this order:

1. **Account holder** — `Input`, help under it.
2. **IBAN or account number** — `Input` before it is saved; afterwards a read-only field showing
   `LT12 •••• •••• •••• 4421` (first 4 and last 4, `--gd-color-text-secondary`) with a link button
   **Change** at its right edge. Change turns it into an empty, focused input with help "The next
   payout goes to the new account." and a **Keep LT12 •••• 4421** link that cancels the change (13.5).
3. **How you invoice** — `Radio.Group` vertical, each option a label and one line under it
   (13 secondary, indented 26 to the label).
4. **Expert Services Terms** — not yet accepted: `ClickwrapField` "I accept the Expert Services
   Terms" (link opens the current version). Accepted: `IconTile` success + "Expert Services Terms"
   / "Accepted on {date} · version {n}" + **View document** (opens that exact version).
5. **Payout note** — `IconInfoCircle` 16 tertiary + one line, 14 secondary.

Below the block, *Paid consultations* and *Curation* stay as GDHUB-54 drew them, locked until the
block is saved. No country or tax-id fields — they wait on counsel.

### Components

- antd `Form` (`layout="vertical"`, `requiredMark={false}`), `Form.Item` per field with `rules`;
  `Input`; `Radio.Group` with option labels rendered as label + `Typography.Text type="secondary"`;
  existing `ClickwrapField` (legal layer) for the terms; `Button type="link"` for Change / Keep;
  `Button type="primary"` Save under the card; `message.success` / `message.error`.
- New `src/components/advisor/PaidWorkSection/` if the settings page has no such section yet;
  the masked account is a small read-only view inside it, not a separate component.

### Validation (antd Form, on Save)

- **Account holder**: required, trimmed, 2–140 characters. "Enter the account holder's name".
- **Account**: required when there is none saved or Change was pressed; spaces ignored; an IBAN
  (starts with two letters) must pass the IBAN checksum, anything else needs at least 8 digits.
  "Enter a full IBAN or account number" (existing key).
- **How you invoice**: required. "Choose how you invoice".
- **Terms**: required while not accepted — "You need to accept the Expert Services Terms to get
  paid" (existing clickwrap error). An outdated version refused by the server unticks with the
  clickwrap's *text updated* message (legal.md §5).
- Errors show under each field (`SyTre`); Save is never disabled by the form; the first field
  with an error gets focus.

### States

- **Not set up** (`Q8dNW0`): empty fields, terms checkbox unticked, the switches below locked.
- **Error** (`SyTre`): field errors as above.
- **Saving** (13.5): Save `loading`; the form is read-only until the answer.
- **Saved** (13.5): `message.success("Payout details saved")`; the account shows masked with
  Change; terms show as accepted; the switches unlock.
- **Save failed** (13.5): `message.error("Couldn't save your payout details. Try again.")`; what
  was typed stays.
- **Set up** (`S5YkC`). **Changing the account** (13.5): only the account field changes; holder and
  invoicing stay editable inputs as before.
- Changing holder, account or invoicing after a payout is marked *due* makes the admin's Mark paid
  answer "details changed" (13.3), so a transfer never goes to details the admin did not see.

### Copy (Tolgee keys, English defaults; existing keys from legal.md marked)

| Key | English |
|---|---|
| `advisor.settings.paid-work.title` (existing) | Paid work |
| `advisor.settings.paid-work.expert-services` (existing) | Expert Services |
| `advisor.settings.paid-work.account-holder` (existing) | Account holder |
| `advisor.settings.paid-work.account-holder.help` | Your name or your company's, as on your invoices. We pay only to an account in that name. |
| `advisor.settings.paid-work.account-holder.error` | Enter the account holder's name |
| `advisor.settings.paid-work.account` (existing) | IBAN or account number |
| `advisor.settings.paid-work.account.error` (existing) | Enter a full IBAN or account number |
| `advisor.settings.paid-work.account.change` | Change |
| `advisor.settings.paid-work.account.placeholder` | New IBAN or account number |
| `advisor.settings.paid-work.account.changeHelp` | The next payout goes to the new account. |
| `advisor.settings.paid-work.account.keep` | Keep {account} |
| `advisor.settings.paid-work.invoicing` (changed) | How you invoice |
| `advisor.settings.paid-work.invoicing.selfEmployed` | Self-employed |
| `advisor.settings.paid-work.invoicing.selfEmployed.note` | You invoice us from your registered individual activity. |
| `advisor.settings.paid-work.invoicing.company` | Company |
| `advisor.settings.paid-work.invoicing.company.note` | Your company invoices us. |
| `advisor.settings.paid-work.invoicing.selfBilling` | Self-billing |
| `advisor.settings.paid-work.invoicing.selfBilling.note` | We issue the invoice on your behalf; you accept it. |
| `advisor.settings.paid-work.invoicing.error` | Choose how you invoice |
| `advisor.settings.paid-work.terms-accepted` (existing) | Accepted on {date} · version {version} |
| `advisor.settings.paid-work.view-document` | View document |
| `legal.clickwrap.expert-services.label` / `.error` (existing) | I accept the Expert Services Terms / You need to accept the Expert Services Terms to get paid |
| `advisor.settings.paid-work.payoutNote` | Paid by bank transfer in USD within 15 days after the month ends. Bank charges on your side are yours. |
| `advisor.settings.paid-work.saved` | Payout details saved |
| `advisor.settings.paid-work.saveFailed` | Couldn't save your payout details. Try again. |
| Tab names (`MENU_ITEMS`, plain strings today) | Requests / Checkpoints / Calendar / Earnings / Settings |

### Data needs

- **Read**: `ExpertProfile.payoutHolder`, the account **masked** (first 4 + last 4; the full value
  never goes back to the browser), `invoicing`; the user's Expert Services Terms acceptance
  (version, date) and the current version's code and number.
- **Save**: holder, account (only when new or changed), invoicing, and — when not accepted yet —
  the clickwrap `{ code, version }`. The acceptance is written in the same transaction (legal-layer
  "paid work save" context). Refused with field errors; refused as outdated when the version moved.
  An audit row for a change of holder or account; the curator gets an email when the account
  changes.
- Who can open it: advisors (the space requires the Advisor Agreement).

### Open questions

- **Decided (2026-10-20):** the account is shown back masked and never in full to the curator;
  the admin sees it in full only in Mark paid. An email goes to the curator when the account
  changes. Validation and the "details changed" guard as above. Advisor tabs as listed above.
- Lithuanian individual activity vs. business certificate (§2.1) are both "Self-employed" here;
  splitting them waits on counsel, with country and tax id.
