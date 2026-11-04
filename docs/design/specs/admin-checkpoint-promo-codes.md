# Admin · Checkpoints · Promo codes (GDHUB-89)

## 1. Problem & user

A GDHub administrator (staff with the checkpoints permission) wants to hand out discounts
on a checkpoint purchase — a launch campaign, a game jam, a conference — without touching
the Stripe dashboard. They create a code, watch how many times it has been used, and turn
it off when the campaign ends. A free checkpoint is deliberately not a code: it is granted
by an administrator directly, so the discount is capped below 100%.

## 2. Frames

All in `docs/design/platform-design.pen`, row "11.x · Admin · Checkpoints", at y 82416,
under the checkpoint rows 01–10.

| Frame | Node id | What it shows |
|---|---|---|
| 11.1 · Admin · Checkpoints — Promo codes (/admin/checkpoints) | `xbHqO` | Admin shell, page header with **New code**, Tabs (one tab), the codes table with 6 rows in mixed states. |
| 11.2 · … — Promo codes · empty | `qO1lM` | Same page; the table card holds an `EmptyState`. |
| 11.2b · … — Promo codes · loading (table only) | `qcogq` | Table card only: head labels kept, rows as skeleton bars. |
| 11.2c · … — Promo codes · error (table only) | `nchQH` | Table card only: error `EmptyState` with **Try again**. |
| 11.3 · … — Modal · New promo code | `JI3bC` | Create form, Percent mode, valid input. |
| 11.3b · … — Modal · New promo code · Amount, code taken | `wbjxl` | Amount mode (`$` prefix) and a field error on Code. |
| 11.4 · … — Confirm · Turn off a code | `uEGrZ` | `modal.confirm` before turning a code off. |

## 3. Layout

- Shell: `AdminSpace` inside `ProtectedShell` (the admin menu in the header). Add a
  **Checkpoints** item to `MENU_ITEMS` in `src/components/spaces/AdminSpace/index.tsx`
  (key `/admin/checkpoints`, last in the list, after Views) and a matching branch in
  `resolveSelectedMenuKey`.
- Page: `<div className="layout-background">` → `ProtectedPageHeader` (title
  "Checkpoints", `extra` = **New code**) → antd `Tabs` (line type, one item "Promo codes";
  a "Checkpoints" tab is added later by another task — build the tabs with `items` so it
  slots in) → table card.
- Gaps: 16 between page header and tabs, 24 between tabs and table. Content width is the
  shell's (1260 at 1440).
- Table columns (left to right, widths are the design at 1260; set `scroll.x` so they bind):
  Code (flex) · Discount 140 · Used 120, right-aligned, `tnum` · Expires 160 · Limits 180 ·
  Status 140 · action 120, right-aligned, no header label.
- No pagination: the list is short. If it ever exceeds ~50 rows, a full-width text
  `Load more` under the card (rule 8), not both.
- Breakpoints: admin is desktop-first; under `lg` the table scrolls horizontally
  (`scroll.x`), no card layout.

## 4. Components

| Block | Use |
|---|---|
| Page shell | reuse `AdminSpace`, `ProtectedPageHeader` (as `admin/scouts/page.tsx`) |
| New code | antd `Button type="primary"` + `IconPlus` size 16 |
| Tabs | antd `Tabs` (default line; ink bar is `colorPrimary`) |
| Table | antd `Table`, `pagination={false}`, styled per rule 8 / `DS · 11 Tables` |
| Code cell | `Typography.Text` 14/600, letter-spacing ~0.04em, `tnum`; antd `Typography.Text copyable` with a Tabler `IconCopy` 16 as the copy icon (tooltip "Copy" → "Copied") — or a `Button type="text" size="small"` icon button 32 if `copyable` cannot take the size |
| Limits | antd `Tag` (theme default, neutral) — "First purchase"; `—` when none |
| Status | reuse `StatusDot` — Active `tone="success"`, Off `tone="neutral"`, Expired `tone="neutral"` |
| Row action | antd `Button type="text"` "Turn off", only on Active rows; nothing on Off/Expired |
| Empty / error | reuse `EmptyState` (icon `IconTicket`; error: `IconAlertCircle` with error tint/ink, `action` = default `Button` + `IconRefresh` "Try again") |
| Loading | antd `Table loading` replaced by skeleton rows: `Skeleton.Input active size="small"` per cell, head kept |
| New code modal | new component `src/components/admin/NewPromoCodeModal/` (next to `NewScoutModal`): antd `Modal` + `Form`; `Input` (uppercases on change), `Segmented` Percent/Amount, `InputNumber` (`suffix="%"` / `prefix="$"`), `DatePicker`, `InputNumber` for max uses, `Checkbox` |
| Turn off confirm | antd `App.useApp().modal.confirm` with `okButtonProps={{ danger: true }}`, `IconAlertTriangle` as icon |

Pencil draws icons from its lucide set; the Tabler names to use are `IconPlus`,
`IconCopy`, `IconTicket`, `IconCalendar` (DatePicker default suffix is fine),
`IconAlertTriangle`, `IconAlertCircle`, `IconRefresh`, `IconX` (Modal close, antd default).

## 5. Tokens

- Page: `--gd-color-bg`. Table card / modal: `--gd-color-surface`, radius `card` (16) for the
  table, `panel` (20) for modals (antd Modal default from the theme — do not override).
- Table head: `--gd-color-surface-sunken`, bottom hairline `--gd-color-border`, labels
  11/600 uppercase `--gd-color-text-secondary`. Rows 56, separator
  `--gd-color-border-subtle`, last row none.
- Text: `--gd-color-text`, `--gd-color-text-secondary` (dates, help), `--gd-color-text-tertiary`
  (`—`, placeholders, copy icon).
- Status dots: `--gd-success-solid`, `--gd-color-text-tertiary` (via `StatusDot`).
- Tag: theme default (`--gd-color-surface-sunken`, radius `chip`).
- Buttons: `colorPrimary` (New code, Create code); `colorError` danger primary only in the
  confirm. Controls 40 (page, modal), 32 (row action, confirm footer, copy icon button).
- Form: inputs filled (`variant="filled"` per theme), height 40, radius `control` (14);
  field gap 20 (`--gd-space-*`: label→input 8 = `--gd-space-2`, between fields 20 via
  `Form` item margin), help 14 `--gd-color-text-secondary`, error `--gd-color-error`.
- Spacing: 16 (`--gd-space-4`), 24 (`--gd-space-6`), 12 (`--gd-space-3`), 8 (`--gd-space-2`).
- Error tile: `--gd-error-tint` / `--gd-error-on-tint` (passed as `tint`/`ink` to `EmptyState`).

## 6. States

- **Data** (11.1): rows newest first. Used shows `used / max` or just `used` when
  unlimited (0 is printed as `0`, never `—`). Expires shows the date (`ll`) or `—`.
- **Empty** (11.2): `EmptyState` inside the card; **New code** stays in the header.
- **Loading** (11.2b): head labels stay, 5 skeleton rows. On refetch after create/turn
  off keep the current rows (no blanking).
- **Error** (11.2c): error `EmptyState` with **Try again** (refetch). A failed create
  shows the message inside the modal (field error on Code for a duplicate, otherwise
  `message.error` and the modal stays open with the values). A failed turn-off: the
  confirm closes, `message.error`, the row stays Active.
- **Turning off**: the confirm's OK button shows `loading`; on success the row becomes
  Off and loses its action.
- **Permission denied**: the admin layout already refuses the route server-side; the
  menu item is hidden without the permission (via `can()`), so no in-page state is drawn.
- **Validation** (11.3/11.3b): Code required, `^[A-Z0-9]+$` after uppercasing, max length
  per Stripe; Percent 1–99 integer; Amount > 0 and below the checkpoint price; Expires
  must be in the future (disable past dates in the picker); Max uses integer ≥ 1.
  **Create code** stays enabled; errors appear on submit under the field.

## 7. Copy (Tolgee keys)

| Key | English |
|---|---|
| `admin.checkpoints.title` | Checkpoints |
| `admin.checkpoints.menu` | Checkpoints |
| `admin.checkpoints.tab.promoCodes` | Promo codes |
| `admin.promoCodes.new` | New code |
| `admin.promoCodes.column.code` | Code |
| `admin.promoCodes.column.discount` | Discount |
| `admin.promoCodes.column.used` | Used |
| `admin.promoCodes.column.expires` | Expires |
| `admin.promoCodes.column.limits` | Limits |
| `admin.promoCodes.column.status` | Status |
| `admin.promoCodes.discount.amount` | ${amount} off |
| `admin.promoCodes.limit.firstPurchase` | First purchase |
| `admin.promoCodes.status.active` | Active |
| `admin.promoCodes.status.off` | Off |
| `admin.promoCodes.status.expired` | Expired |
| `admin.promoCodes.turnOff` | Turn off |
| `admin.promoCodes.copy` / `admin.promoCodes.copied` | Copy / Copied |
| `admin.promoCodes.empty.title` | No promo codes yet |
| `admin.promoCodes.empty.description` | Codes made here are entered on the Stripe checkout page. |
| `admin.promoCodes.error.title` | Couldn't load promo codes |
| `admin.promoCodes.error.description` | Stripe or the server did not answer. Try again in a moment. |
| `admin.promoCodes.error.retry` | Try again |
| `admin.promoCodes.modal.title` | New promo code |
| `admin.promoCodes.field.code` | Code |
| `admin.promoCodes.field.code.help` | Letters and digits; what the buyer types |
| `admin.promoCodes.field.code.taken` | This code already exists in Stripe. Pick another. |
| `admin.promoCodes.field.code.invalid` | Letters and digits only. |
| `admin.promoCodes.field.discount` | Discount |
| `admin.promoCodes.field.discount.percent` | Percent |
| `admin.promoCodes.field.discount.amount` | Amount |
| `admin.promoCodes.field.discount.helpPercent` | Up to 99%: a free checkpoint is given by an administrator, not by a code. |
| `admin.promoCodes.field.discount.helpAmount` | Less than the checkpoint price: a free checkpoint is given by an administrator, not by a code. |
| `admin.promoCodes.field.expires` | Expires |
| `admin.promoCodes.field.expires.placeholder` | No end date |
| `admin.promoCodes.field.maxUses` | Max uses |
| `admin.promoCodes.field.maxUses.placeholder` | Unlimited |
| `admin.promoCodes.field.optional` | (optional) |
| `admin.promoCodes.field.firstPurchase` | First purchase only |
| `admin.promoCodes.modal.submit` | Create code |
| `common.cancel` | Cancel (reuse if it exists) |
| `admin.promoCodes.turnOff.title` | Turn off {code}? |
| `admin.promoCodes.turnOff.content` | Buyers can no longer use it. Stripe keeps codes; a code that's off cannot be turned back on. |
| `admin.promoCodes.turnOff.ok` | Turn off |

## 8. Data needs

- **List** promo codes for the checkpoint product: `id`, `code`, discount (`type`:
  percent | amount, `value`; amount with its currency), `timesRedeemed`, `maxRedemptions`
  (nullable = unlimited), `expiresAt` (nullable), `firstPurchaseOnly`, `active`,
  `createdAt`. Status is derived: Off when inactive, Expired when `expiresAt` is past
  (an inactive and expired code reads Off — see open questions), otherwise Active.
  Sorted newest first; no filters, no pagination for now.
- **Create**: `code`, discount type + value, optional `expiresAt`, optional
  `maxRedemptions`, `firstPurchaseOnly`. Must report a duplicate code as a field-level
  error distinct from other failures.
- **Turn off**: by id; irreversible (Stripe promotion codes can be deactivated but the
  product decision is one-way here).
- Every create/turn-off writes an audit-log entry (as other admin actions do).
- Permission: a view permission for the menu/route and a manage permission for create
  and turn off (e.g. existing `admin.checkpoints.manage`).

## 9. Open questions

- Currency: the design assumes USD (`$` prefix, "$50 off"). If checkpoints are sold in
  several currencies, the Amount field needs a currency and the column a symbol per row.
- Is "Max uses" reached a fourth status (e.g. "Used up", neutral)? Drawn without it; a
  used-up code shows `20 / 20` and stays Active as Stripe reports it.
- Should Off win over Expired when both are true? Assumed Off.
- Should the list also include codes made directly in the Stripe dashboard? Assumed yes
  (they are listed and can be turned off).
- Hide-instead-of-disable for users with view but not manage permission: assumed the
  **New code** and **Turn off** buttons are hidden for them.
