# GDHUB-116 — e2e for the critical human-curator checkpoint flows

[Linear](https://linear.app/gdhub/issue/GDHUB-116) · intent written 2026-10-29

## Want

The checkpoint with an industry expert gets the same safety net as the AI one
(GDHUB-79). Before a checkpoint change ships, one command walks an author and
an expert through what must never break:

- the purchase, and the curator's yes, no or replacement;
- the five calls: the curator in first, the team let in, the call ended for
  everyone, notes from its transcript, and a call moved with the other side's
  approval;
- the AI's brief before calls 2–5, and its read beside the verdict window;
- the verdict the expert drafts and sends, journalled beside the AI's proposal;
- the expert's payout and earnings, and the author's rating;
- a refund when the curator is gone or the verdict is overdue.

Each flow leaves the same markdown run log as GDHUB-79.

## Why now

The expert checkpoint is built but not sold: `EXPERT_CHECKPOINT_OPEN` is off
until there is a seller for human curation (GDHUB-107). When it opens, every one
of these flows goes live at once, and today only the verdict
(`checkpoint-verdict.authed.spec.ts`) is covered end to end. It is the last open
checkpoint task under GDHUB-31.

## Constraints

- **Same stand as GDHUB-79:**
  - the database from `bun run test-env up` (55432) and `bun run dev:test` on
    :3100;
  - the specs live in `tests/e2e/checkpoints/` and run with
    `bun run test:e2e:checkpoints`;
  - model answers come from the LLM cassettes;
  - Paddle runs in its sandbox and settles without a tunnel.
- **Daily is emulated entirely, only on the stand.** Like the cassettes, the
  emulation needs `E2E_TEST_AUTH=1` and never runs in production. The stand has
  no Daily keys, no Daily webhooks and no real call.
  - **Daily's REST API:** rooms, meeting tokens, presence, meetings, the
    transcript job. A fake on the stand answers it, and the test sets who is in
    the room.
  - **The browser's call object:** a fake that raises the same joined and left
    events. The call page and our routes run unchanged.
  - **Daily's webhooks:** `meeting.ended`, `recording.ready-to-download` and
    `batch-processor.job-finished` are signed by the test with the stand's
    `DAILY_WEBHOOK_SECRET` and posted to the real `/api/daily/webhooks`.
  - **The transcript:** a fixture. The notes the AI writes from it come from
    cassettes.
- **The expert flag:** `EXPERT_CHECKPOINT_OPEN` reads from the environment
  (`NEXT_PUBLIC_EXPERT_CHECKPOINT_OPEN`). It stays off by default and in
  production; `dev:test` turns it on. It is fixed when the app is built, so the
  stand cannot also show it off: the waitlist stays covered by
  `ExpertWaitlist.stories.tsx` and the draft route's unit tests.
- **The Advisor Agreement** is unpublished in production. The stand alone gets a
  TBD version 0 (`docs/legal/advisor-agreement/v0.md`, `NEXT_PUBLIC_E2E_STAND`),
  so the advisor's "accept our terms" step is walked.
- Tests grant rather than borrow. Time is moved by shifting dates and calling
  the crons, as in GDHUB-79. Refusals, windows and money arithmetic stay in the
  unit tests.

## Done when

- [ ] `bun run test:e2e:checkpoints` passes the human-curator flows on the
      stand: the purchase and waitlist, accept / decline / replace, the five
      calls, a call moved, the brief and the AI's read, the verdict, the payout
      with earnings and rating, and both refunds.
- [ ] They run without Daily keys, ngrok or a real call, and a unit test proves
      the Daily emulation is off outside the stand.
- [ ] `tests/e2e/checkpoint-verdict.authed.spec.ts` lives in the suite.
- [ ] Every flow writes `test-results/checkpoints/<flow>.md`, as GDHUB-79's do.

## How to check it on the platform

1. Run `bun run test-env up`, then `bun run dev:test`, then
   `bun run test:e2e:checkpoints`. Every flow is green, including the new
   ones, and `test-results/checkpoints/` holds a report per flow.
2. The app the team uses is unchanged. On :3000, choosing an expert in a
   checkpoint still leads to the waitlist, and a call room still uses real
   Daily.

## Out of scope

- A real WebRTC call or a real Daily account. The emulation stands in for both.
- Opening expert sales in production (GDHUB-107).
- Running the suite in CI.
- Fixing what the suite finds. Each finding goes to GDHUB-81 unless it is small
  enough to fix here, as in GDHUB-79.

## Decided on the way (2026-10-29)

- **A curator's refusal keeps the money.** Dmitry: the author picks another
  expert at no charge, or cancels it for a refund. If nobody is picked within
  `CURATOR_REPICK_DAYS` (14), the holds cron cancels and refunds it. Paddle
  charges at once and holds nothing. Silence works the same way, an admin's pick
  takes the kept money too, and the author's letters say so.
- **Found: the expert price is not in Paddle.** Every checkout charges
  `PADDLE_AI_CHECKPOINT_PRICE_ID`, so an expert checkpoint costs the AI price
  until their seller exists (GDHUB-107). H2 sets the held sum to the expert's
  price, so changing hands is judged on the right sum. Listed in GDHUB-81.

## Open questions

- **Where the fake Daily API lives:** assumed to be in `services/daily.ts`
  behind the stand's flag, the same way as the cassettes, not as a separate
  server.
- **The transcript fixture:** assumed to be a short WebVTT of one call,
  committed beside the cassettes.
