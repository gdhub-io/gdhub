# Change request: `Payment` schema & extensions

Hand-off spec for the **`@gdhub-io/gdhub-prisma`** package. Goal: model payments
the way PSPs (Paddle/Stripe) do — money as integer minor units, payment rows that
represent *money moved* (not job metadata), provider-agnostic columns, and an
idempotency/audit ledger.

> ⚠️ This is a **breaking** change: the consumer app reads `Payment.amount` as the
> offered salary and `Payment.rateType` today. Those move off `Payment`. The app
> must be updated in tandem (see §8). Coordinate the version bump.

Priority tags: **[MUST]** correctness, **[SHOULD]** strongly recommended,
**[NICE]** optional.

---

## 1. Current schema (for reference)

```prisma
model Payment {
  id                  String          @id @default(cuid())
  amount              Float
  currency            String          @default("EUR")
  status              PaymentStatus   @default(PENDING)
  rateType            PaymentRateType
  payableType         PayableType
  payableId           String
  paddleTransactionId String?         @unique
  createdAt           DateTime        @default(now())
  completedAt         DateTime?

  @@index([payableType, payableId])
  @@index([paddleTransactionId])
}

enum PayableType    { VACANCY }
enum PaymentStatus  { PENDING COMPLETED FAILED REFUNDED }
enum PaymentRateType { Hourly OneTime Monthly }
```

The existing client extension (`src/extenstions/payment.ts`) adds computed
`teamVacancy.payments` and `teamVacancy.paymentStatus`.

---

## 2. Target `Payment` model

```prisma
model Payment {
  id                    String          @id @default(cuid())

  // [MUST] money the customer was actually charged, in MINOR units (e.g. cents).
  // No Float for money. (Alternative: Decimal @db.Decimal(12,2).)
  amount                Int
  currency              String          @default("EUR")

  status                PaymentStatus   @default(PENDING)

  // polymorphic target (unchanged)
  payableType           PayableType
  payableId             String

  // [SHOULD] provider-agnostic identifiers (was: paddleTransactionId)
  provider              PaymentProvider @default(PADDLE)
  providerTransactionId String?         @unique   // renamed from paddleTransactionId
  providerCustomerId    String?                   // Paddle ctm_...
  providerInvoiceId     String?                   // Paddle inv_...
  providerPriceId       String?                   // Paddle pri_... used (see §11)

  createdAt             DateTime        @default(now())
  updatedAt             DateTime        @updatedAt   // [SHOULD] new
  completedAt           DateTime?

  events                PaymentEvent[]              // [SHOULD] see §5
  refunds               Refund[]                    // [NICE] see §6

  @@index([payableType, payableId])
  @@index([providerTransactionId])
  @@index([provider, status])
}
```

**Removed from `Payment`:** `rateType` and the *offered-salary* meaning of
`amount`. The offered compensation is job metadata and moves onto the vacancy
(§4). `Payment.amount` now means **the listing fee actually charged** (copy it
from the Paddle transaction totals, not a hardcoded constant).

---

## 3. Enums

```prisma
// [SHOULD] new
enum PaymentProvider {
  PADDLE
  // STRIPE, MANUAL, ... (future)
}

// [MUST keep] still used for VACANCY listing payments
enum PayableType {
  VACANCY
  // SUBSCRIPTION, EVENT, COURSE ... (future)
}

// [SHOULD] richer lifecycle (add CANCELED now; rest optional/future)
enum PaymentStatus {
  PENDING
  PROCESSING          // [NICE]
  COMPLETED
  FAILED
  CANCELED            // [SHOULD] abandoned / voided checkout
  REFUNDED
  PARTIALLY_REFUNDED  // [NICE]
  DISPUTED            // [NICE] chargeback
}

// [MUST keep] — now lives on TeamVacancy (offered compensation), not Payment
enum PaymentRateType {
  Hourly
  OneTime
  Monthly
}
```

---

## 4. `TeamVacancy` additions (offered compensation moves here)

```prisma
model TeamVacancy {
  // ... existing fields ...

  // [MUST] offered compensation — was Payment.amount + Payment.rateType.
  // Minor units (cents) to match Payment money convention. Nullable = free post.
  offeredAmount   Int?
  offeredRateType PaymentRateType?
}
```

---

## 5. New model: `PaymentEvent` (idempotency + audit) — [SHOULD]

Persist every webhook event and dedupe by its provider event id. The consumer
inserts by `eventId`; a duplicate insert (unique violation) ⇒ already processed.

```prisma
model PaymentEvent {
  id         String   @id @default(cuid())
  provider   PaymentProvider @default(PADDLE)
  eventId    String   @unique          // Paddle event_id (evt_...)
  type       String                    // e.g. "transaction.completed"
  payload    Json
  receivedAt DateTime @default(now())

  payment    Payment? @relation(fields: [paymentId], references: [id], onDelete: SetNull)
  paymentId  String?

  @@index([type])
  @@index([paymentId])
}
```

---

## 6. New model: `Refund` — [NICE]

Even though refunds are out of scope now, model them as rows (supports partial
refunds) instead of a single status flag.

```prisma
model Refund {
  id               String   @id @default(cuid())
  payment          Payment  @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  paymentId        String
  amount           Int                       // minor units
  currency         String   @default("EUR")
  reason           String?
  providerRefundId String?  @unique
  createdAt        DateTime @default(now())

  @@index([paymentId])
}
```

---

## 7. Prisma client extensions

File: `src/extenstions/payment.ts` (note the existing folder spelling
`extenstions`). The package applies these in `GdhubDatabaseService.init()` via
`.$extends(...)`.

### 7.1 Update the existing `teamVacancy` extension — [MUST]

The current computed fields must reflect the new column names and the
offered-comp move:

```ts
result: {
  teamVacancy: {
    payments: {
      needs: { id: true },
      compute: (v) => (client) =>          // see note on async below
        client.payment.findMany({
          where: { payableType: "VACANCY", payableId: v.id },
          orderBy: { createdAt: "desc" },
        }),
    },
    paymentStatus: {
      needs: { id: true },
      compute: async (v) => {
        const p = await client.payment.findFirst({
          where: { payableType: "VACANCY", payableId: v.id, status: "COMPLETED" },
        });
        return p?.status ?? null;
      },
    },
    isListingFeePaid: {            // [SHOULD] new convenience flag
      needs: { id: true },
      compute: async (v) =>
        (await client.payment.count({
          where: { payableType: "VACANCY", payableId: v.id, status: "COMPLETED" },
        })) > 0,
    },
  },
},
```

> **⚠️ Async result-compute caveat.** These compute functions hit the DB and
> return Promises. Prisma exposes them as lazy getters that are **not awaited
> during JSON serialization** — so `JSON.stringify(vacancy)` yields `{}` for them
> and they don't survive an API response. The consumer app currently works around
> this by querying `payment` explicitly in its endpoints. Recommendation: **keep
> these for server-side `await` use, but document the caveat**, or drop them in
> favour of explicit queries. Do **not** rely on them in serialized payloads.

### 7.2 New synchronous `Payment` formatting extension — [SHOULD]

Because money becomes integer minor units, a **synchronous** (no-DB, so
serialization-safe) computed major-unit/formatted value is very handy:

```ts
result: {
  payment: {
    amountMajor: {                 // 900 -> 9.0  (cents -> currency units)
      needs: { amount: true },
      compute: (p) => p.amount / 100,
    },
    amountFormatted: {             // 900,"EUR" -> "€9.00"
      needs: { amount: true, currency: true },
      compute: (p) =>
        new Intl.NumberFormat("en", { style: "currency", currency: p.currency })
          .format(p.amount / 100),
    },
  },
},
```

Add the analogous `teamVacancy.offeredAmountMajor` / `offeredAmountFormatted`
(needs `offeredAmount`, `currency` — or a fixed currency) if useful.

### 7.3 (Optional) model/query extension helpers — [NICE]

Encapsulate common operations so consumers don't repeat them:

```ts
model: {
  payment: {
    findActiveForVacancy(vacancyId: string) {
      return client.payment.findFirst({
        where: { payableType: "VACANCY", payableId: vacancyId, status: { not: "REFUNDED" } },
        orderBy: { createdAt: "desc" },
      });
    },
  },
},
```

---

## 8. App-side coordination (consumer = this repo)

After the package ships, the consumer app must change (so the package author is
aware of the blast radius):

- `Payment.amount` is now **cents** and means the **fee**, not the offered salary.
  - Reading offered comp → `TeamVacancy.offeredAmount` / `offeredRateType`.
  - Writing offered comp → on vacancy create/update, not via `/payment`.
  - Display: divide cents by 100 (or use `amountFormatted`).
- `paddleTransactionId` → `providerTransactionId` (webhook, receipt endpoint,
  payment upsert).
- Webhook should also upsert a `PaymentEvent` by `eventId` for idempotency.
- The fee charged should be persisted from the Paddle transaction totals.

(The package author doesn't need to make these edits — just flagged so the schema
change isn't merged expecting the app to keep compiling unchanged.)

---

## 9. Data migration notes

For existing rows (mostly test data):

1. **Move offered comp to the vacancy:** for each `Payment`, set the matching
   `TeamVacancy.offeredAmount = round(payment.amount * 100)` and
   `offeredRateType = payment.rateType` (match on `payableId`).
2. **Reset `Payment.amount` to the fee in cents:** backfill from the Paddle
   transaction totals via `providerTransactionId` for `COMPLETED` rows; for
   others, set the then-current listing fee (e.g. `900`) or `0` if unknown.
3. **Rename** `paddleTransactionId` → `providerTransactionId`; set
   `provider = PADDLE` for all existing rows.
4. New columns (`providerCustomerId`, `providerInvoiceId`, `updatedAt`) are
   nullable / defaulted — no backfill required.
5. `PaymentEvent` / `Refund` start empty.

---

## 10. Minimum viable subset

If scoping down, do at least the **[MUST]** items — they fix correctness and the
"two amounts" confusion:

1. `Payment.amount` `Float → Int` (cents) **and** redefine it as the fee.
2. Move offered comp (`amount` + `rateType`) onto `TeamVacancy`.
3. Update the existing extension for the renamed/moved fields.

The provider-agnostic rename, `PaymentEvent`, richer statuses and `Refund` can
follow as a second pass.
```

---

## 11. Pricing / product catalog — Variant A (Paddle is the catalog)

**Decision: no local price/product catalog.** Paddle already owns the catalog
(products + `pri_...` prices); we don't duplicate it. This is sufficient while
there is a single product (the vacancy listing fee).

Rules:

1. **`Payment.amount` is always a snapshot** of the amount actually charged
   (minor units), copied from the Paddle transaction totals at payment time. It is
   immutable history — never re-derived from a (mutable) price later. This holds
   regardless of any future catalog.
2. **`Payment.providerPriceId`** stores the `pri_...` that was charged, for
   traceability/reconciliation. [SHOULD]
3. **Source of truth for "what a listing costs"** stays in Paddle. The consumer
   app passes the configured `pri_...` (env `NEXT_PUBLIC_PADDLE_VACANCY_PRICE_ID`)
   to checkout; the charged amount comes back on the transaction.
4. No `Price` / `Product` / `ProductType` tables are added now.

> If multiple chargeable products appear later (subscriptions, events, courses —
> `PayableType` already hints at this) or prices need to be shown/managed without
> calling Paddle, revisit with a local `Price` catalog (mapping a product type →
> `providerPriceId` + display amount). Even then, `Payment.amount` stays a
> snapshot.
