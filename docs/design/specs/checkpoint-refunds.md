# Admin · Checkpoints · List and refunds (GDHUB-101)

Intent: [docs/intent/GDHUB-101-checkpoint-refunds.md](../../intent/GDHUB-101-checkpoint-refunds.md).
Builds on [admin-checkpoint-promo-codes.md](admin-checkpoint-promo-codes.md) (11.1–11.4) —
same shell, header, tabs, table and modal anatomy; read that spec for anything not repeated here.

## 1. Problem & user

An administrator with the checkpoints permission has to give money back on a checkpoint
(withdrawal within 14 days, curator gone with no replacement, no verdict by day 31). They
find the checkpoint in a list of every paid checkpoint, pick the reason, see the amount the
platform computed and what it is made of, and confirm. Nobody does arithmetic or opens the
Stripe dashboard.

## 2. Frames

All in `docs/design/platform-design.pen`, in the 11.x band (y 82416), to the right of 11.4.
Directly below the 11.x row there is only 200px before the 12.x row, so the new frames
continue the band sideways instead of starting a row under it.

| Frame | Node id | What it shows |
|---|---|---|
| 11.5 · Admin · Checkpoints — List (/admin/checkpoints) | `G3Dyx` | Default tab **Checkpoints** (before Promo codes), status `Segmented` + project search, table of 8 rows (one refunded, two AI at $20, one with a promo code), pagination under the card. |
| 11.5b · … — List · empty (table only) | `r9tCT7` | Head kept; one line of plain secondary text, no tile, no button. |
| 11.5c · … — List · loading (table only) | `CJvEU` | Head kept; 5 skeleton rows. |
| 11.5d · … — List · error (table only) | `Ar4Dh` | Error `EmptyState` with **Try again** (as 11.2c). |
| 11.6 · … — Modal · Refund a checkpoint | `zkz19` | Reason radio (Withdrawal selected, with its 14-day note), breakdown, consequence line, Cancel · **Refund $300**. |
| 11.6b · … — Modal · Refund · withdrawal window over | `mFHVH` | Withdrawal radio disabled with "Paid 30 Sep — the 14 days are over"; Curator gone selected. |
| 11.6c · … — Modal · Refund · already refunded | `v512S` | Info `Alert` "Refunded $300 on 20 Oct · Withdrawal" and only **Close**. |
| 11.6d · … — Modal · Refund · Stripe refused | `GVdvV` | Error `Alert` on top; reason and breakdown kept; button enabled for retry. |

## 3. Layout

- Page as 11.1: `AdminSpace` → `ProtectedPageHeader` "Checkpoints" → antd `Tabs`. Tabs become
  `[Checkpoints, Promo codes]`, **Checkpoints is the default**. **New code** in the header
  `extra` shows only while the Promo codes tab is active (11.1 is otherwise unchanged).
- Checkpoints tab: toolbar (Segmented left, search 280 right, `space-between`), 16 below it the
  table card, 16 below that the pagination row (total left, pager right) on the page ground.
- Columns at 1260: Project (flex; name 14/500 + "Checkpoint N · stage" 13 secondary) ·
  Curator 180 · Status 160 · Paid 200, right, `tnum` · Refunded 200, right, `tnum` · action 120,
  right, no label. Set `scroll.x` so widths bind.
- Modal: 560 wide (antd `Modal width={560}`), head / body (gap 20) / footer as 11.3.
  Body: Reason field → breakdown → consequence line. In 11.6d the error `Alert` is the first body item.

## 4. Components

| Block | Use |
|---|---|
| Tabs, header, shell | existing (`AdminSpace`, `ProtectedPageHeader`, antd `Tabs`) |
| Status filter | antd `Segmented` — All · Awaiting curator · Active · Review · Closed · Cancelled |
| Search | antd `Input.Search` (or `Input` + `IconSearch` prefix), debounced, placeholder "Search by project" |
| Table | antd `Table`, styled as `PromoCodesTable` (rule 8); server pagination via antd `Pagination` under the card |
| Status | `StatusDot` — Awaiting curator `warning`, Active `success`, Review `info`, Closed `neutral`, Cancelled `neutral` |
| Paid / Refunded | text cells; note part ("· code SPRING20", "· Withdrawal") in `Typography.Text type="secondary"` 13; `—` when nothing refunded |
| Row action | antd `Button type="text"` "Refund…", only when the row is refundable (see data); nothing otherwise |
| Empty | plain `locale.emptyText` string in secondary text — no `EmptyState`, no button (house rule) |
| Loading / error | as `PromoCodesTable` (skeleton rows; error `EmptyState` + `IconAlertCircle` + Try again `IconRefresh`) |
| Refund modal | new `src/components/admin/RefundCheckpointModal/` (next to `NewPromoCodeModal`): antd `Modal`, `Radio.Group` vertical, outlined breakdown block, `Alert type="info"` / `Alert type="error"` (`showIcon`, icons `IconInfoCircle` / `IconAlertCircle`), footer `Button` + `Button type="primary"` |
| Consequence line | `Typography.Text type="secondary"` with `IconMail` 16 |

Pencil draws lucide; Tabler names: `IconSearch`, `IconChevronLeft/Right` (antd Pagination default
is fine), `IconX`, `IconMail`, `IconInfoCircle`, `IconAlertCircle`, `IconRefresh`.
The primary button is graphite (`colorPrimary`), not danger: a refund is the purpose of the dialog,
and it is not destructive to data. Ship a story per state for `RefundCheckpointModal` and the table.

## 5. Tokens

- Table and modal: same as the promo codes spec (`--gd-color-surface`, head `--gd-color-surface-sunken`,
  row hairline `--gd-color-border-subtle`, card radius, modal radius from the theme).
- Toolbar on the page: Segmented and search fill `--gd-neutral-100`, controls 40.
- Breakdown: transparent, 1px `--gd-color-border`, radius `card`, padding 16 (`--gd-space-4`),
  row gap 12 (`--gd-space-3`), divider `--gd-color-border-subtle`. Labels `--gd-color-text-secondary`,
  sub-lines 13 `--gd-color-text-tertiary`, values 14 `tnum`; total row label 16/600, value 24/600.
- Radio: theme default (checked = `colorPrimary`); disabled label `--gd-color-text-disabled`;
  notes under an option 13 `--gd-color-text-secondary`, indented to the label (24).
- Alerts: theme `Alert` (`--gd-info-tint` / `--gd-info-on-tint`, `--gd-error-tint` / `--gd-error-on-tint`).
- Status dots: via `StatusDot` tones only.

## 6. States

- **List data** (11.5): newest payment first. The refunded row keeps its status (Cancelled/Closed)
  and loses "Refund…". Refetch keeps the current rows.
- **Empty** (11.5b): "No paid checkpoints yet"; with a filter or search active: "No checkpoints match".
- **Loading** (11.5c), **error** (11.5d): as 11.2b / 11.2c.
- **Modal opened**: no reason preselected — breakdown shows the paid amount and `—` for refund, primary
  disabled with tooltip "Pick a reason" (not drawn). Picking a reason recomputes the breakdown (server).
- **Withdrawal outside 14 days** (11.6b): option disabled, reason as the note under it.
- **Confirming**: primary shows `loading`, Cancel and close disabled until the answer.
- **Success**: modal closes, `message.success("Refunded $300")`, row updates (Refunded filled, no action).
- **Already refunded** (11.6c): also what a second confirm (another tab, double click) lands on.
- **Stripe refused** (11.6d): nothing recorded; values kept; primary retries.
- **Permission denied**: route refused server-side; without the manage permission the "Refund…"
  action is hidden.
- With a promo code: Paid row "$360" with sub-line "code SPRING20", one part "$60", Refund "$240".
  AI checkpoint: "of 4" parts, sub-line "Reviews written N · verdict not sent", one part "$5".

## 7. Copy (Tolgee keys, English defaults)

| Key | English |
|---|---|
| `admin.checkpoints.tab.checkpoints` | Checkpoints |
| `admin.checkpoints.list.filter.all` | All |
| `admin.checkpoints.list.status.awaitingCurator` | Awaiting curator |
| `admin.checkpoints.list.status.active` | Active |
| `admin.checkpoints.list.status.review` | Review |
| `admin.checkpoints.list.status.closed` | Closed |
| `admin.checkpoints.list.status.cancelled` | Cancelled |
| `admin.checkpoints.list.search` | Search by project |
| `admin.checkpoints.list.column.project` | Project |
| `admin.checkpoints.list.column.curator` | Curator |
| `admin.checkpoints.list.column.status` | Status |
| `admin.checkpoints.list.column.paid` | Paid |
| `admin.checkpoints.list.column.refunded` | Refunded |
| `admin.checkpoints.list.checkpoint` | Checkpoint {number} · {stage} |
| `admin.checkpoints.list.aiCurator` | AI curator |
| `admin.checkpoints.list.promo` | · code {code} |
| `admin.checkpoints.list.total` | {count} paid checkpoints |
| `admin.checkpoints.list.refund` | Refund… |
| `admin.checkpoints.list.empty` | No paid checkpoints yet |
| `admin.checkpoints.list.emptyFiltered` | No checkpoints match |
| `admin.checkpoints.list.error.title` | Couldn't load checkpoints |
| `admin.checkpoints.list.error.description` | The server did not answer. Try again in a moment. |
| `admin.checkpoints.list.error.retry` | Try again |
| `admin.checkpoints.refund.title` | Refund {project} · Checkpoint {number} |
| `admin.checkpoints.refund.reason` | Reason |
| `admin.checkpoints.refund.reason.withdrawal` | Withdrawal within 14 days |
| `admin.checkpoints.refund.reason.curatorGone` | Curator gone, no replacement |
| `admin.checkpoints.refund.reason.noVerdict` | No verdict by day 31 |
| `admin.checkpoints.refund.withdrawal.within` | Only within 14 days of payment — paid {date}, {days} days ago. |
| `admin.checkpoints.refund.withdrawal.over` | Paid {date} — the 14 days are over |
| `admin.checkpoints.refund.paid` | Paid |
| `admin.checkpoints.refund.partsProvided` | Parts provided |
| `admin.checkpoints.refund.partsValue` | {provided} of {total} |
| `admin.checkpoints.refund.partsDetail.human` | Calls held {calls} · verdict {verdictSent, select, true {sent} other {not sent}} |
| `admin.checkpoints.refund.partsDetail.ai` | Reviews written {reviews} · verdict {verdictSent, select, true {sent} other {not sent}} |
| `admin.checkpoints.refund.onePart` | One part |
| `admin.checkpoints.refund.amount` | Refund |
| `admin.checkpoints.refund.consequence` | The checkpoint closes; the author gets an email. |
| `admin.checkpoints.refund.submit` | Refund {amount} |
| `admin.checkpoints.refund.pickReason` | Pick a reason |
| `admin.checkpoints.refund.done` | Refunded {amount} on {date} · {reason} |
| `admin.checkpoints.refund.success` | Refunded {amount} |
| `admin.checkpoints.refund.stripeFailed` | Stripe did not refund — nothing was recorded. Try again. |
| `common.cancel`, `common.close` | Cancel, Close (reuse if they exist) |

## 8. Data needs

- **List** paid checkpoints (has a completed/refunded `Payment`), newest payment first, server-side
  pagination (page, page size, total). Filters: status (one of the five or all), search by project
  name (contains, case-insensitive). Per row: checkpoint id, number, stage, project name; curator
  kind and the human curator's name; checkpoint status; paid amount + currency and promo code
  (if any); refund amount + reason + date (if any); `canRefund` (paid, no refund yet, something
  still refundable — the server decides).
- **Quote** for one checkpoint and reason: paid amount, promo code, total parts (6 or 4), parts
  provided split as calls held / AI reviews written and verdict sent, one part, refund amount,
  payment date, and whether each reason is available with a reason it is not (withdrawal window).
  If already refunded: amount, date, reason (→ 11.6c).
- **Refund**: checkpoint id + reason. Returns the recorded refund, or "already refunded" (→ 11.6c),
  or "provider refused" (→ 11.6d). Idempotent; audit log and author notification as in the intent.

## 9. Open questions

- Placement: the new frames sit to the right of 11.4 in the same band, not in a new row below —
  there is no room above the 12.x row.
- **Decided (2026-10-20):** no "Refund…" on *Awaiting curator* rows — the money is only held
  there and cancel-before-day-1 releases it; `canRefund` is false for them.
- **Decided (2026-10-20):** a refunded checkpoint becomes *Cancelled* — no verdict, no
  certificate; *Closed* stays for a checkpoint with a verdict.
- Does the confirm need a second step (`modal.confirm`)? Assumed no — the dialog already shows the
  amount on the button.
- Currency assumed USD as in the promo codes spec.

## 10. As built (2026-10-20)

- The promo code is not stored on the payment, so the list and the dialog show what was
  paid without the code's name ("$360", not "$360 · code SPRING20").
- Older refunds read by their reason: "Cancelled before day 1", "Curator declined", "In Stripe".
- The row action is a ⋮ menu with **Refund payment** (written in full, no ellipsis), as on the
  Users table.
- A **Dates** column after Curator: day 1 – day 28 ("9 Oct – 5 Nov 2026"), `—` before the
  curator accepts.
- The toolbar has two more filters beside the status: **stage** (the stages paid checkpoints
  have run on, from the server) and **curator** (a person / AI curator); search stays on the
  project name.
- A checkpoint started without a payment (seeded) shows `—` under Paid and has no menu.
- Four KPI cards above the toolbar (`CheckpointKpis`, styled as the Views KPI cards), in this
  order: **Net** (paid less refunded, before curators' fees), **Paid** (captured, holds aside),
  **Refunded** (written with a minus — money out), **AI · person** (a two-colour bar with the two
  shares under it; the counts in its tooltip). They follow every filter and the search, over all
  matching checkpoints rather than the page.
- Refunded: the reason sits under the sum, not beside it.
- Selects get the brand focus ring (`activeOutlineColor`), app-wide — antd drew its own
  graphite ring around the brand border.
- The project search suggests names as the admin types (antd `AutoComplete` over
  `Input.Search`, 300 ms debounce; `GET /api/admin/checkpoints/projects?q=` returns up to ten
  projects with a paid checkpoint). Picking one filters the list and the cards; Enter searches
  by the text typed.

## 11. GDHUB-80/40 frames

Intent: [docs/intent/GDHUB-80-40-checkpoint-admin-controls.md](../../intent/GDHUB-80-40-checkpoint-admin-controls.md).
Same band (y 78297), to the right of `z20Q3F`. Pencil draws lucide; Tabler names are given below.

### Frames

| Frame | Node id | What |
|---|---|---|
| 11.7 · … — row menu (⋮ open, overdue row) | `CGp5v` | Table fragment: an overdue row with its ⋮ open — **Write the verdict** · **Assign a curator** · divider · **Refund payment**. |
| 11.7b · … — Overdue row + status filter with Draft | `Ni6mC` | Status `Segmented` gains **Draft** last; one row with status "Overdue" (danger dot) and the line "Verdict due 3 Nov — 2 days late". |
| 11.8 · … — Modal · Write the verdict (admin) | `RvmBP` | Copy of the curator's `vC7gn` (1048 wide, evidence left, verdict right) plus the admin band, a warning `Alert` under the head, the refund line above the actions, Cancel · **Send verdict and refund $150**. |
| 11.8b · … — Write the verdict (admin) · every call held | `R4SnD` | Same; refund line "Every call was held — nothing to refund", primary **Send verdict**. |
| 11.9 · … — Modal · Assign a curator · draft (free) | `oOBkh` | Copy of `z20Q3F` for a draft: status "Draft · not paid", Runs "Starts when the curator is assigned", Curator now `—`, Payment "Not paid", warning box with the free-start text, primary **Give for free**. |
| Dialog — Workflow locked by an active checkpoint (admin) | `rhKOo` | Existing, approved — used unchanged for GDHUB-40 (stage delete / workflow reset refused, and the dry-run result). |
| Modal — Assign a curator (admin) | `z20Q3F` | Existing, approved — replacing the curator of a running checkpoint. |

### Components

- **Row menu**: antd `Dropdown` `menu.items` on the existing ⋮ `Button type="text"`. Items are
  built from the row: *Write the verdict* (`IconSignature`) only when the row is overdue;
  *Assign a curator* (`IconUserPlus`) on Draft, Awaiting curator, Active and Review; divider;
  *Refund payment* (`IconReceiptRefund`) as today (`canRefund`). No menu when no item applies.
- **Status filter**: append `Draft` to the existing `Segmented` options. Drafts appear only under
  this option; "All" stays paid checkpoints.
- **Overdue status**: `StatusDot tone="danger"` "Overdue" + `Typography.Text type="secondary"` 13
  under it. Overdue is derived (status Review, past day 31, no verdict), not a stored status. The
  Status column grows 160 → 240 (Project flex absorbs it) so the due line stays on one line.
- **Admin verdict modal**: new `src/components/admin/AdminVerdictModal/` wrapping the curator's
  verdict body (reuse the existing VerdictModal content component — evidence column + verdict
  options + reasoning) with: the admin band from `z20Q3F`; antd `Alert type="warning" showIcon`
  (`IconAlertTriangle`) under the head; an outlined refund line (`IconReceiptRefund` /
  `IconCircleCheck`) above the actions; actions `Button` Cancel + `Button type="primary"`. No
  "Save draft" for the admin. Head chip uses `StatusDot tone="danger"` "Overdue · was due {date}".
- **Assign a curator (draft)**: same component as `z20Q3F` (`AssignCuratorModal`), switched by the
  checkpoint's status; the free box is the existing warning block with new copy.

### Tokens

As 11.5/11.6. New uses: danger dot `--gd-color-error` via `StatusDot`; alert `--gd-warning-tint` /
`--gd-warning-on-tint`; refund line transparent, 1px `--gd-color-border`, radius `card`, padding 12
(`--gd-space-3`), gap 12, label 13 `--gd-color-text-secondary`, value 14/500 `tnum`; Draft dot
`neutral`. Menu: theme `Dropdown` (surface, `e2` shadow, radius `control`). Primary `colorPrimary`.

### States

- **Menu**: overdue → three items; running/awaiting → Assign + Refund (if `canRefund`); draft →
  Assign only; closed/cancelled → Refund only if refundable, otherwise no ⋮.
- **Write the verdict** opens with the curator's draft reasoning if one was saved, otherwise empty;
  primary disabled until an option and reasoning are given (tooltip as the curator's modal).
  Confirming: primary `loading`, Cancel disabled. Success: modal closes,
  `message.success`, row → Closed with Refunded filled when a refund was made.
- **Curator sent it meanwhile**: the server answers "already decided" → modal closes, info message,
  list refetches.
- **Refund refused by Stripe**: verdict is still recorded (checkpoint Closed); error message
  "Verdict sent; the refund failed — use Refund payment" and the row keeps its ⋮ Refund.
- **Assign (draft)**: Reason required; primary disabled until a person (or AI) and a reason are
  set. Draft without a goal: primary disabled, tooltip "The author has not set a goal yet".
- **Permission denied**: without `admin.checkpoints.manage` no ⋮ menu; endpoints refuse.
- **Workflow locked** (GDHUB-40): `rhKOo` as drawn.

### Copy (Tolgee keys, English defaults)

| Key | English |
|---|---|
| `admin.checkpoints.menu.writeVerdict` | Write the verdict |
| `admin.checkpoints.menu.assignCurator` | Assign a curator |
| `admin.checkpoints.menu.refund` | Refund payment |
| `admin.checkpoints.list.status.overdue` | Overdue |
| `admin.checkpoints.list.status.draft` | Draft |
| `admin.checkpoints.list.overdueLine` | Verdict due {date} — {days, plural, one {# day} other {# days}} late |
| `admin.checkpoints.verdict.chip` | Overdue · was due {date} |
| `admin.checkpoints.verdict.alert` | The curator did not send the verdict. You sign it as an administrator; the author sees it as the checkpoint's verdict. |
| `admin.checkpoints.verdict.refundLine` | Calls the curator never joined are refunded |
| `admin.checkpoints.verdict.refundValue` | {parts} of {total} parts · {amount} |
| `admin.checkpoints.verdict.nothingToRefund` | Every call was held — nothing to refund |
| `admin.checkpoints.verdict.note` | Sending is final: the checkpoint closes and the author gets the verdict. |
| `admin.checkpoints.verdict.submitWithRefund` | Send verdict and refund {amount} |
| `admin.checkpoints.verdict.submit` | Send verdict |
| `admin.checkpoints.verdict.success` | Verdict sent |
| `admin.checkpoints.verdict.alreadyDecided` | The curator has just sent the verdict |
| `admin.checkpoints.verdict.refundFailed` | Stripe did not refund — nothing was recorded. Try again. |
| `admin.checkpoints.assign.draftStatus` | Draft · not paid |
| `admin.checkpoints.assign.startsOnAssign` | Starts when the curator is assigned |
| `admin.checkpoints.assign.notPaid` | Not paid |
| `admin.checkpoints.assign.free.title` | No payment is taken |
| `admin.checkpoints.assign.free.body` | The checkpoint starts as a paid one would: a person is asked and the calls are booked; the AI starts today. |
| `admin.checkpoints.assign.giveForFree` | Give for free |
| `admin.checkpoints.assign.noGoal` | The author has not set a goal yet |

### Data needs

- **List**: rows gain `overdue` (+ verdict due date, days late) and a per-row set of allowed
  actions (`canWriteVerdict`, `canAssignCurator`, `canRefund`) decided by the server. Status filter
  accepts `draft` (drafts with or without a goal; Paid `—`).
- **Admin verdict quote**: the checkpoint's evidence (as the curator's modal reads it), the
  curator's saved draft if any, and the missed-calls refund: parts not delivered, total parts, one
  part, amount (0 → 11.8b).
- **Admin verdict submit**: checkpoint id, verdict option, reasoning. Records the verdict as the
  admin, closes, issues the certificate, refunds missed calls once; returns the result or
  "already decided" / "refund failed" (nothing written).
- **Assign (draft)**: checkpoint id, curator kind, person id (when a person), reason. Refused when
  the draft has no goal or is no longer a draft.

### Open questions

- 11.9 changes three values `z20Q3F` shows for a running checkpoint (Runs, Curator now, Payment) —
  a draft has none of them; everything else is identical.
- The admin verdict modal drops "Save draft"; assumed an admin writes it in one sitting.
- Where the "Overdue" row sorts (assumed: same newest-payment order, no pinning).
- **Decided:** a curator's saved draft only pre-fills the admin's form; what the admin sends is
  the verdict.
- **Decided:** the refund goes first. If Stripe refuses, nothing is written — no verdict, no
  refund — and the admin tries again (as 11.6d). A closed checkpoint cannot take
  "Refund payment" afterwards, so the two never split.
