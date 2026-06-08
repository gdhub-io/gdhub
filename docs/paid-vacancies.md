# Paid Vacancies (Open Positions)

This document describes the mechanism and user flows for **paid job vacancies**
("open positions") in GDHub: how a listing fee is collected through Paddle, how
the `Payment` record relates to a vacancy across its lifecycle, and what happens
to the payment in each situation (create, publish, archive, restore, draft
toggle, receipt download).

It is the behavioural spec. The lower-level Paddle wiring lives in
[`PADDLE_INTEGRATION.md`](../PADDLE_INTEGRATION.md).

---

## 1. Concepts & data model

### Vacancy (`TeamVacancy`)

| Field | Meaning |
|-------|---------|
| `status` | `Draft` \| `Published` \| `Closed` (archived) |
| `publishedAt` | **Set once** at the first publication. Never reset afterwards — it anchors the listing window. |
| `finishedAt` | "Valid until" date. Capped (see §7). |
| `promisePercentage` | Optional equity promise (unrelated to payment). |
| `offeredAmount` | The **offered compensation** the employer enters in the form, in **minor units (cents)**. Job metadata, not money we charge. The API/UI work in EUR (÷100). |
| `offeredRateType` | `Hourly` \| `OneTime` \| `Monthly` — period of the offered compensation. |

### Payment (`Payment`)

A centralized PSP-style ledger (`payableType = VACANCY`, `payableId = vacancyId`).
A `Payment` row represents the **listing fee** charged — not the offered salary.

| Field | Meaning |
|-------|---------|
| `amount` | The **listing fee actually charged**, in minor units (cents). Placeholder on create; the webhook writes the real total from the Paddle transaction. |
| `currency` | `EUR`. |
| `status` | `PENDING` \| `COMPLETED` \| `FAILED` \| `CANCELED` \| `REFUNDED` \| … — listing-fee state. |
| `payerId` | The user who paid (billing history / `db.user.payments`). |
| `provider` | `PADDLE` (default). |
| `providerTransactionId` | Set by the webhook once paid. Used to fetch the invoice/receipt. |
| `providerInvoiceId` / `providerCustomerId` / `providerPriceId` | Provider references captured from the transaction. |
| `completedAt` | When the fee was settled. |

`PaymentEvent` (webhook ledger, deduped by `eventId`) gives idempotency + audit.

> **Two different "amounts".** `offeredAmount` (on the vacancy) = salary offered to
> the candidate. `Payment.amount` = the listing fee charged to the employer (fixed
> Paddle price `NEXT_PUBLIC_PADDLE_VACANCY_PRICE_ID`, currently €9). They are
> separate fields on separate tables.

### Definitions

- **Paid vacancy** — a vacancy that has offered compensation
  (`offeredAmount` + `offeredRateType`); publishing it requires the listing fee.
- **Listing fee paid** (`isListingFeePaid`) — the latest `Payment` for the vacancy
  is `COMPLETED`.
- **One `Payment` per vacancy** — writes upsert the latest payment row.

---

## 2. Vacancy state machine

```
                 ┌─────────────────────────────────────────────┐
                 │                                             │
   create        ▼            Pay & Publish (fee paid)         │
  ───────►  ┌────────┐  ── needs fee ──► [Paddle checkout] ─┐  │
            │ DRAFT  │                                       │  │
            └────────┘  ── free / fee already paid ──┐      │  │
                 ▲                                    ▼      ▼  │
        Save as draft                            ┌───────────┐ │
                 │                                │ PUBLISHED │ │
                 └────────────────────────────────└───────────┘ │
                                                        │       │
                                              Archive   │ Archive
                                                        ▼       ▼
                                                   ┌──────────────┐
                                                   │    CLOSED    │  (archived)
                                                   └──────────────┘
                                                        │
                                                  Restore (reopen modal → save)
                                                        ▼
                                                   DRAFT / PUBLISHED
```

`COMPLETED` listing fees are **permanent** (kept as history). Only `PENDING` /
`FAILED` payments are ever deleted.

---

## 3. Flow: Create a vacancy

In the **Vacancy modal** the user fills title/direction/description/valid-until,
and optionally adds a **Payment** block (amount + rate) and/or an equity promise.

### 3a. Free vacancy (no payment block)
- **Save as draft** → `status = Draft`, no `Payment`.
- **Publish** → `status = Published`, `publishedAt = now`, no `Payment`.

### 3b. Paid vacancy (payment block filled)
- **Save as draft** → `status = Draft`. A `Payment` is created/updated as
  `PENDING` with the offered amount/rate (so the data survives). **No charge.**
- **Pay & Publish** →
  1. Vacancy is saved as `Draft` (stays a draft until the fee is paid).
  2. `Payment` upserted as `PENDING` with amount/rate.
  3. Paddle checkout opens for the listing fee (`priceId`, `customData.paymentId`).
  4. On success, Paddle fires `transaction.completed` → **webhook** marks the
     `Payment` `COMPLETED` (+ `paddleTransactionId`) **and publishes the vacancy**
     (`status = Published`, `publishedAt = now`).

> If `NEXT_PUBLIC_PADDLE_VACANCY_PRICE_ID` is missing, checkout is skipped, the
> vacancy stays a saved draft, and the user is warned ("Payment is not configured").

---

## 4. Flow: Publish from the table

Each non-published row has a primary button (mirrors the modal):

- Payment exists and **not** `COMPLETED` → **"Pay & Publish"** → opens checkout for
  the existing `Payment`; vacancy is published by the webhook after payment.
- No payment, or fee already `COMPLETED` → **"Publish"** → `status = Published`
  immediately, **no charge**.

---

## 5. Flow: Edit an existing vacancy

- **Change the offered amount/rate** → always allowed. The upsert updates the
  latest `Payment` row's `amount`/`rateType`; **status is untouched** (a paid
  listing stays `COMPLETED`, no re-charge).
- **Remove the payment block** → only allowed while the fee is **not** paid. For a
  paid vacancy the delete control is replaced by a green **"Paid"** badge. When
  removal is allowed, saving deletes the (non-`COMPLETED`) `Payment`.

---

## 6. Flow: Draft ↔ Publish (re-publish)

Once the listing fee is `COMPLETED`:

- **Save as draft** → `status = Draft`. `Payment` stays `COMPLETED`,
  `publishedAt` is **kept** (set-once).
- **Publish again** → `status = Published`, **no new charge** (the button reads
  "Publish", not "Pay & Publish"). `publishedAt` is **not** reset.

> This is intentional: one paid listing fee can be drafted/published any number of
> times for free, but the 90-day window (§7) does not move, so it can't be used to
> extend the listing forever.

---

## 7. Listing window / `finishedAt` cap

A paid listing is valid for at most **`LISTING_WINDOW_DAYS = 90`** days from its
**first** publication.

- Anchor = `publishedAt` (set-once) ?? `createdAt` (while never published).
- `finishedAt` cannot be set beyond `anchor + 90 days`.
- Enforced both in the **date picker** (UI) and in the **API** (POST + PUT).
- The server only blocks an **extension** past the window; keeping or shortening
  the date is always allowed (so legacy/edge listings stay editable).

Because `publishedAt` is set-once and re-publish doesn't reset it, a user cannot
extend a single paid listing indefinitely by editing the date or toggling
draft/publish.

---

## 8. Flow: Archive (close)

Closing a vacancy (3-dot menu → **Archive**):

1. `status = Closed`.
2. **Any non-`COMPLETED` `Payment` is deleted** (a stale `PENDING` fee must not
   linger and resurface on restore). `COMPLETED` payments are kept as history.

---

## 9. Flow: Restore from archive

**Decision:** a paid listing is bought for a single 90-day window. Restoring an
archived vacancy therefore does **not** revive the old listing — it **creates a
new `Draft` vacancy pre-filled with the same data**, which needs its **own new
payment** to be published.

- The archived (`Closed`) vacancy stays closed as history.
- The new vacancy starts in `Draft` with **no `Payment`** and a fresh
  `createdAt`/window anchor; the user re-confirms the payment block and goes
  through **Pay & Publish** again (new listing fee, new `Payment`).
- A previously `COMPLETED` fee is **not** reused — each live window is paid for.
- The original finish date is kept if still within the new window, otherwise
  reset to a sensible default (+30 days).

Implemented by `POST /api/user/project/vacancy/restore?id=<archivedId>`, which
duplicates the data and returns the new vacancy; the archive modal then opens it.

---

## 10. Flow: Download receipt

For a vacancy whose fee is `COMPLETED`:

- 3-dot menu → **Download receipt**.
- `GET /api/user/project/vacancy/payment/invoice?vacancyId=…` authorizes the
  owner, finds the `COMPLETED` payment + `paddleTransactionId`, and calls Paddle
  `GET /transactions/{id}/invoice` (server-side, secret key) to get a **temporary
  pre-signed PDF URL** (~1h). The URL is fetched on demand and opened in a new tab
  (never stored).

---

## 11. Key files

| Concern | File |
|---------|------|
| Vacancy CRUD + window cap + set-once publish | `src/app/api/user/project/vacancy/route.ts` |
| Payment upsert / delete | `src/app/api/user/project/vacancy/payment/route.ts` |
| Receipt (invoice) endpoint | `src/app/api/user/project/vacancy/payment/invoice/route.ts` |
| Vacancies list (+ payment, direction) | `src/app/api/user/project/vacancies/route.ts` |
| Paddle webhook (settle fee + publish) | `src/app/api/paddle/webhooks/route.ts` |
| Server Paddle API helper (invoice) | `src/services/paddle/server.ts` |
| Checkout hook | `src/services/paddle/usePaddle.ts`, `src/services/paddle/index.ts` |
| Vacancy modal (create/edit/pay) | `src/components/modals/VacancyModal/index.tsx` |
| Vacancies table (columns, menu, publish) | `src/components/MyProjectVacancies/index.tsx` |

---

## 12. Decisions & remaining work

### Decided

1. **Restore = new listing — DONE.** Restoring an archived vacancy **duplicates**
   it into a new `Draft` (same data, no payment, fresh window) that must be paid
   for again. The archived one stays `Closed`. A previously `COMPLETED` fee is not
   reused. Implemented via `POST /vacancy/restore` (§9). This also removes the
   "expired window on restore" edge case entirely.

2. **Refunds — out of scope (documented).** We do **not** implement refunds.
   `REFUNDED` exists in the enum but is unused. Behaviour is governed by the
   [refund policy](./refund-policy.md): **paid listing fees are non-refundable**
   (link it from the payment UI / notice). No `adjustment.*` webhook handling.

3. **Abandoned checkout — rely on Paddle + retry (mostly no code).** Industry
   standard, and what Paddle recommends:
   - Access is granted only on `transaction.completed` (we already do this); an
     abandoned overlay leaves the transaction in `ready` status and the vacancy a
     `Draft` with a `PENDING` `Payment`.
   - **Retry** simply re-opens checkout for the same `Payment` (already supported).
   - **Paddle Checkout Recovery**: if the buyer entered email/country/zip but
     didn't finish, Paddle automatically emails a recovery link after ~60 min
     (free; optional discount). Enable it in the dashboard (on by default for
     accounts created after 2 May 2025). No code.
   - Optional later: handle `transaction.payment_failed` → set `Payment = FAILED`
     and surface a "payment failed, try again" hint; and/or a periodic cleanup of
     stale `PENDING` drafts.

4. **Webhook signature — DONE.** The webhook verifies the `Paddle-Signature`
   header (`ts=…;h1=…`): HMAC-SHA256 over `` `${ts}:${rawBody}` `` with the
   destination secret (`PADDLE_WEBHOOK_SECRET`), timing-safe compare, on the raw
   body. If the secret is unset, verification is skipped outside production and
   rejected in production. Implemented in `src/services/paddle/server.ts`
   (`verifyPaddleWebhook`). Timestamp range is intentionally not enforced (handlers
   are idempotent; avoids dropping delayed/retried deliveries).

### Housekeeping

5. **Local webhook delivery.** Requires a tunnel + a notification destination with
   `traffic_source = platform` (or `all`), **not** `simulation` — see
   `PADDLE_INTEGRATION.md`.
6. **i18n.** New Tolgee keys (`MyProjectVacancies.downloadReceipt`,
   `…archiveVacancy`, `…receiptUnavailable`, `vacancy.payment.status.*`,
   `vacancy.rate.*`, `modal.vacancy.paymentNotConfigured`) need translations.
7. **Shared config.** `LISTING_WINDOW_DAYS` and the displayed `PAID_VACANCY_FEE`
   are hardcoded in two places each — consider a single source.

---

## 13. Schema recommendations (align with how PSPs model payments)

The `Payment` model lives in the external `@gdhub-io/gdhub-prisma` package, so
these changes require editing that package's schema + a migration + a version
bump, then adapting the app. Ordered by impact:

### High impact

1. **Money as integers (minor units), not `Float`.** `amount Float` loses
   precision and is non-standard for money. Paddle (and Stripe) represent amounts
   as **integer minor units** (e.g. cents) + an ISO currency. Use `amount Int`
   (cents) or `Decimal @db.Decimal(12,2)`. Never `Float`.

2. **Separate "charge" from "offered compensation".** Today `Payment.amount`
   stores the **offered salary** and `Payment.rateType` is offered-comp metadata —
   but a payment row should represent **money actually moved** (the listing fee).
   Recommended split:
   - Offered compensation (`amount` + `rateType`) → onto the **vacancy** (or a
     `VacancyCompensation` sub-record). It's job metadata, not a payment.
   - `Payment.amount` / `Payment.currency` → the **fee actually charged**, copied
     from the Paddle transaction totals (not a hardcoded constant).

3. **Provider-agnostic columns.** `paddleTransactionId` hardcodes one PSP. Add:
   - `provider` enum (`PADDLE`, later `STRIPE`, …)
   - `providerTransactionId` (rename), `providerCustomerId`, `providerInvoiceId`,
     `providerCheckoutId`.
   Decouples the model from Paddle and supports future subscriptions/PSPs.

4. **Idempotency + audit via an event ledger.** Robust integrations persist every
   webhook event and dedupe by its id. Add a `PaymentEvent` (or `WebhookEvent`)
   table: `eventId @unique`, `type`, `payload Json`, `receivedAt`, `paymentId?`.
   On webhook: insert-by-`eventId` (skip if it exists) → guaranteed idempotency +
   a full audit trail (stronger than the current in-handler guard).

### Medium impact

5. **`updatedAt` + richer status.** Add `updatedAt @updatedAt`. Consider statuses
   beyond `PENDING/COMPLETED/FAILED/REFUNDED`: `CANCELED`, `PROCESSING`,
   `PARTIALLY_REFUNDED`, `DISPUTED`/`CHARGEBACK` — mapped from Paddle transaction
   statuses (`draft/ready/billed/paid/completed/canceled/past_due`).

6. **Refunds as their own rows.** Even though refunds are out of scope now, a
   dedicated `Refund` table (`paymentId`, `amount`, `providerRefundId`, `reason`,
   `createdAt`) beats a single `REFUNDED` flag and supports partial refunds.

7. **Customer linkage.** Store `providerCustomerId` (Paddle `ctm_…`) — needed for
   subscriptions, customer portal, multiple payments per user, reconciliation.

### Low impact / nice-to-have

8. **DB-level guard.** A partial unique (one non-`COMPLETED` payment per payable)
   complements the app-level upsert.
9. **Keep** the polymorphic `payableType`/`payableId` + compound index — it's a
   reasonable pattern (Prisma just can't enforce the FK).

### Sketch

```prisma
model Payment {
  id                    String          @id @default(cuid())
  provider              PaymentProvider @default(PADDLE)
  amount                Int             // minor units (cents) actually charged
  currency              String          @default("EUR")
  status                PaymentStatus   @default(PENDING)
  payableType           PayableType
  payableId             String
  providerTransactionId String?         @unique
  providerCustomerId    String?
  providerInvoiceId     String?
  createdAt             DateTime        @default(now())
  updatedAt             DateTime        @updatedAt
  completedAt           DateTime?
  events                PaymentEvent[]
  @@index([payableType, payableId])
}

model PaymentEvent {        // idempotency + audit
  id         String   @id @default(cuid())
  eventId    String   @unique   // Paddle event_id
  type       String
  payload    Json
  receivedAt DateTime @default(now())
  payment    Payment? @relation(fields: [paymentId], references: [id])
  paymentId  String?
}
// offered compensation moves off Payment → onto the vacancy:
// TeamVacancy.offeredAmount Int?  + TeamVacancy.rateType PaymentRateType?
```
