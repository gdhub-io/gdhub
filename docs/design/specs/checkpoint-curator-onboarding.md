# Checkpoints · Curator onboarding (GDHUB-74)

Intent: [docs/intent/GDHUB-74-curator-payout-rating-onboarding.md](../../intent/GDHUB-74-curator-payout-rating-onboarding.md) ("Let in").
Rule: [docs/checkpoint-standard.md](../../checkpoint-standard.md) §2 — only someone who worked on a
game that reached release may curate; checked by hand. Builds on
[checkpoint-payouts.md](checkpoint-payouts.md) §10 (Paid work) and the admin checkpoints frames in
[checkpoint-refunds.md](checkpoint-refunds.md).

## 1. Problem & user

A **specialist** decides to offer themselves as a project curator: they turn **Project curation**
on and pick the stages they curate. The stages are their own setting and change freely, with no
review. An **administrator** approves the **person** as a curator (or declines with a note) after
a look at their profile, which already holds their experience and portfolio; later they can
revoke it. Authors are offered the specialist only when curation is on, the person is approved,
and the checkpoint's stage is among their stages.

## 2. Frames

All in `docs/design/platform-design.pen`.

| Frame | Node id | What it shows |
|---|---|---|
| Legal · Advisor settings · Paid work · set up (changed in place) | `S5YkC` | The **Project curation** block: switch, *Stages you curate* (plain multi-select), one curator status — "Waiting for review · sent 20 Oct", "You're not offered to authors until GDHub approves you." |
| Legal · Advisor settings · Paid work · not set up / error (label changed in place) | `Q8dNW0`, `SyTre` | As GDHUB-54 drew them — the block locked until Expert Services is saved — with the row titled **Project curation** (`K9gDc`, `MHdAJ`; `TO95P` in `S5YkC`). |
| 13.7c · Advisor settings · Paid work — Project curation: approved, not approved | `JPpKq` | Fragment of the block: Approved · 18 Oct; Not approved with the admin's note and **Ask again**. |
| 13.7a · Admin · Checkpoints — Curators tab | `ORPpO` | Tab **Curators** next to Promo codes; one row per person: profile link, level, their stages (read-only, for context), status; Approve / Decline when waiting, Revoke when approved. |
| 13.7b · Admin · Curators — Decline / Revoke | `FRDTR` | The `Popover` that asks for a short note. |

Row note: `eAJZv` ("Row — 13.7 · Curator onboarding (GDHUB-74)", y 90200).

## 3. Layout

### Specialist — Advisor settings → Paid work → Project curation

The curation block GDHUB-54 already put in Paid work; no new section. Locked (lock icon, tooltip)
until the Expert Services Terms are accepted and the payout details saved (`Q8dNW0`).
- Row **Project curation** with its `Switch`.
- **Stages you curate** — `Select mode="multiple"` of the platform's stage names; plain tags, no
  markers.
- Under it, **one curator status** (once curation has been turned on): `StatusDot` with the word
  (13/500) and a line (13 secondary):
  - **Waiting for review · sent {date}** (`warning`) — "You're not offered to authors until GDHub
    approves you.";
  - **Approved · {date}** (`success`) — "Authors are offered you at these stages.";
  - **Not approved** (`neutral`) — the admin's note in quotes; "You're not offered to authors
    until GDHub approves you."; link **Ask again**. A decline and a revoke both land here.
- **Save** under the card commits switch and stages, as for the rest of Paid work.

### Admin — Checkpoints → Curators

- A tab in admin Checkpoints: `[Checkpoints, Curators, Promo codes]` (`?tab=curators`), shown with
  the curators permission.
- Toolbar: `Segmented` **Waiting for review** (default, with the count) · All curators;
  `Input.Search` 280 "Search by name".
- Table card, columns at 1260: Curator (flex; `AppAvatar` 32 + name 14/500 as a link to the
  profile in a new tab, `IconArrowUpRight`) · Level 140 (`Tag`, read-only) · Stages 420 (`Tag`s,
  read-only, context only) · Status 180 (`StatusDot`: Waiting for review with "since {date}",
  Approved with its date, Not approved) · actions 200, right: **Approve** (default `Button`, 32)
  and **Decline** (danger text) when waiting; **Revoke** (danger text) when approved. Rows 56.
- **Decline / Revoke** (13.7b): `Popover` under the button — "Decline {name} as a curator?" (or
  "Revoke {name} as a curator?"), a required `Input` for the note, Cancel · **Decline** /
  **Revoke** (`danger` primary, small). **Approve** needs no confirm.
- Order: waiting first, oldest request first; then approved, newest first; then not approved.

## 4. Components

| Block | Use |
|---|---|
| Curation block | existing Paid work section (`PaidWorkSection`): `Switch`, `Select mode="multiple"`, a `StatusDot` with its line, a link `Button` Ask again |
| Curators tab | admin Checkpoints `Tabs` + new `src/components/admin/CuratorsTable/` — antd `Table` styled as `PromoCodesTable` (rule 8), `Segmented`, `Input.Search` |
| Actions | `Button` (default, 32) Approve; `Button type="text" danger` Decline / Revoke; antd `Popover` with `Input` + `Button danger type="primary" size="small"` |
| Profile link | next/link, `target="_blank"`, `IconArrowUpRight` |

Stories: the Curation block (locked, off, waiting, approved, not approved); `CuratorsTable`
(waiting, all, empty, loading, error); the Popover (decline, revoke).

## 5. Tokens

- Status: `StatusDot` tones only; label 13/500 `--gd-color-text`; line 13
  `--gd-color-text-secondary`; Ask again `--gd-color-link`.
- Table as rule 8 / `DS · 11`; buttons 32 (`controlHeightSM`); chips theme `Tag`.
- Popover: theme (surface, `e2`), padding 16, gap 12; note input filled, 32, radius `control`.
- Decline / Revoke text buttons `--gd-color-error`; the filled red button only inside the Popover.

## 6. States

**Specialist**
- **Locked** until the Expert Services Terms are accepted and payout details saved (`Q8dNW0`).
- **Off, never asked**: no status line.
- Turning curation **on** and saving sends the request → **Waiting for review**.
- **Approved**: offered at their stages while curation is on. Changing the stages needs no review.
- **Not approved** (declined or revoked): the note shows; not offered; **Ask again** sends a new
  request (→ Waiting for review).
- Turning curation **off**: not offered; the approval stays, so turning it back on needs no new
  review.
- One email to the specialist per decision (approved / declined / revoked), with the note.

**Admin**
- Approve → the row turns **Approved** (`message.success("Approved")`). Decline / Revoke → Popover,
  note required; the row turns **Not approved**.
- Empty "Waiting for review" → plain secondary text "Nothing waiting for review". Loading skeleton
  rows; error `EmptyState` with Try again (as 11.5d).
- Another admin decided first → refused, `message.info("Already decided — reloaded")`.
- Revoking does not touch running checkpoints; the admin uses **Assign a curator** there if needed.
- Without the curators permission the tab is hidden and the endpoints refuse.

## 7. Copy (Tolgee keys, English defaults)

No key is both a leaf and a parent. The row title was "Curation" under
`advisor.settings.paid-work.curation` (GDHUB-54); it is now **Project curation** under a new key.

| Key | English |
|---|---|
| `advisor.settings.paid-work.projectCuration` | Project curation |
| `advisor.settings.paid-work.curator.pending` | Waiting for review · sent {date} |
| `advisor.settings.paid-work.curator.approved` | Approved · {date} |
| `advisor.settings.paid-work.curator.notApproved` | Not approved |
| `advisor.settings.paid-work.curator.notOffered` | You're not offered to authors until GDHub approves you. |
| `advisor.settings.paid-work.curator.offered` | Authors are offered you at these stages. |
| `advisor.settings.paid-work.curator.askAgain` | Ask again |
| `admin.checkpoints.tab.curators` | Curators |
| `admin.curators.filter.pending` | Waiting for review |
| `admin.curators.filter.all` | All curators |
| `admin.curators.search` | Search by name |
| `admin.curators.column.curator` / `.level` / `.stages` / `.status` | Curator / Level / Stages / Status |
| `admin.curators.status.pending` / `.approved` / `.notApproved` | Waiting for review / Approved / Not approved |
| `admin.curators.since` | since {date} |
| `admin.curators.approve` | Approve |
| `admin.curators.decline` | Decline |
| `admin.curators.revoke` | Revoke |
| `admin.curators.declineTitle` | Decline {name} as a curator? |
| `admin.curators.revokeTitle` | Revoke {name} as a curator? |
| `admin.curators.notePlaceholder` | What is wrong — the curator sees it |
| `admin.curators.approved` | Approved |
| `admin.curators.declined` | Declined |
| `admin.curators.revoked` | Revoked |
| `admin.curators.alreadyDecided` | Already decided — reloaded |
| `admin.curators.empty` | Nothing waiting for review |
| `admin.curators.error` | Couldn't load curators |
| `common.cancel` | Cancel (reuse) |

## 8. Data needs

On `ExpertProfile` (with the existing `curation` switch):
- `curatorStages` — the specialist's own stage ids, changed freely.
- `curatorRequestedAt` — set when curation is turned on for the first time or on **Ask again**;
  shown as "sent {date}".
- `curatorApprovedAt` — set on approve, shown as "Approved · {date}"; `null` = not offered.
- `curatorReviewNote` — the note of the last decline or revoke; cleared on **Ask again** and on
  approve.

Derived status: **approved** — `curatorApprovedAt` set; **waiting** — `curatorRequestedAt` set,
not approved, no note; **not approved** — not approved, note set.

- **Specialist save** (with Paid work): the switch and `curatorStages`; turning the switch on
  without a past request sets `curatorRequestedAt`. **Ask again**: sets `curatorRequestedAt`,
  clears the note.
- **Admin list**: people with `curatorRequestedAt` set; filters (waiting / all), search by name,
  pagination. Per row: id, name, avatar, profile link, profile level, `curatorStages`, status, the
  date to show (requested or approved).
- **Approve**: person id → sets `curatorApprovedAt`, clears the note. **Decline**: person id + note.
  **Revoke**: person id + note → clears `curatorApprovedAt`. Refused when the state changed
  meanwhile. One email; audit row.
- **Matching** (wizard step 12.4, admin **Assign a curator**): curation on **and**
  `curatorApprovedAt` set **and** the checkpoint's stage in `curatorStages`.
- **Permission**: `admin.curators.view` / `admin.curators.manage` (owner by default), wired like
  `admin.payouts`.

## 9. Decided (2026-10-20)

- The admin approves the person, not stages; the stages are the curator's own setting with no
  review.
- Turning curation off and on keeps the approval.
- Declined and revoked are one state for the curator, "Not approved" + the note + Ask again; no
  decision date. The admin's Revoke stays as an action.
- The block is locked until the Expert Services Terms are accepted; one email per decision; no
  "curator since" or checkpoint count in the admin row; the row is titled "Project curation".
