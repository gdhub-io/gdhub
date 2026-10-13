# Finance

How GDHub makes money, what it costs to run, and how much the market can hold — for the
founders' own planning and for investor conversations.

| File | What it is |
|---|---|
| [financial-model.xlsx](financial-model.xlsx) | 36-month model: volumes, GMV, revenue, unit economics, cash flow, burn, runway, three scenarios |
| [build_model.py](build_model.py) | Generates the workbook. Change an assumption here or in the blue cells, never in a formula |
| [market-sizing.md](market-sizing.md) | TAM / SAM / SOM, top-down and bottom-up, with sources |
| [loi.md](loi.md) | Letter-of-intent templates for experts, developers and partners, and the tracker |

## How GDHub earns

A marketplace in the shape of Preply: one user pays another through the platform and the
platform keeps a share. Three streams, launched in this order:

1. **Checkpoint · Pro** — a developer with a project buys 28 days with a human expert
   (five calls, a verdict). The price is the expert's rate plus 25%, so the platform keeps
   **20% of what the author pays**: $60–132 of a $300–660 Checkpoint.
2. **Checkpoint · AI** — the same 28 days with the AI curator, **$19**, all of it revenue.
   The model costs about a cent per Checkpoint ([ai-costs.md](../ai-costs.md)).
3. **Paid 1:1 consultations** — user-to-user sessions at the expert's own rate, with a
   commission. Preply takes the whole first lesson and then 33% falling to 18%; the model
   uses one blended rate, 20% in Base.

Paid vacancy listings (€9 through Paddle) already exist and stay in the model as a small
line; the research behind Checkpoint advises against pushing them.

## Unit economics, Base scenario

| Per unit | Checkpoint · AI | Checkpoint · Pro ($400 average) |
|---|---|---|
| Author pays | $19.00 | $400.00 |
| Platform revenue | $19.00 | $80.00 |
| Contribution after card, payout, video and AI costs | $17.85 | $57.84 |
| Contribution margin of platform revenue | 94% | 72% |

The platform carries the whole card fee on a Pro charge, curator's part included — that is
the largest cost of a Pro Checkpoint ($17.90 of $22.16). Charging the fee to the curator's
part, or moving to Paddle as merchant of record, is the first lever on margin.

## What the model needs from the founders

Yellow cells on the Assumptions sheet are guesses. In order of how much they move the
result:

1. **Cash at start** and the **monthly costs actually paid today** — Vercel, Postgres,
   Redis, Typesense, Sanity, Novu, Brevo, Matrix, Daily, Tolgee, OpenAI, domains. Without
   them burn and runway are illustrative.
2. **Payroll** — whether founders draw a salary, and who is hired after funding.
3. **Marketing** — a fixed community budget (0 = organic only) and what a new buyer costs
   to acquire (CAC). At the Base guess of $80, a Pro buyer earns back only ~$9 over their
   checkpoints, so CAC decides whether growth pays.
4. **Funding** — amount and month.
5. **First-month volumes** — replace with the first Season's real numbers, or with the
   counts from signed [LOIs](loi.md) until then.

## Known gaps

- Curator payouts are not built yet; the model assumes Stripe Connect fees.
- Taxes and VAT are not modelled. Stripe is not merchant of record, so VAT on Checkpoint
  sales is GDHub's to handle.
- Russian cards cannot pay through Stripe; the Russian-speaking community is a source of
  experts and early validation, not of revenue.
- The workbook is generated without cached values: Excel and Numbers calculate on open.

## Regenerating

```bash
python3 -m venv /tmp/fin && /tmp/fin/bin/pip install openpyxl
/tmp/fin/bin/python docs/finance/build_model.py
```
