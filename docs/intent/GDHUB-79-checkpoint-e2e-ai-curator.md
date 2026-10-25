# GDHUB-79 — e2e for the critical AI-checkpoint flows

[Linear](https://linear.app/gdhub/issue/GDHUB-79) · intent written 2026-10-24

## Want

Before a checkpoint change ships, one command walks an author through what
must never break: a project moving through its stages, an AI checkpoint bought
through Paddle, its 28 days run with the real model, the verdict, a refund, and
who may see what. Each flow leaves a markdown report Dmitry can read: what the
AI was shown, what it wrote, and what the flow cost — the Paddle amount and the
model spend.

## Why now

The AI checkpoint is the one being sold. Its pieces are unit-tested one by
one, but nothing proves that the purchase, the cron, the reviews and the
verdict still meet end to end, and nobody knows what a whole run costs.

## Constraints

- The stand: the throwaway database (`bun run test-env up`, 55432) and
  `bun run dev:test` on :3100 with `.env.test` (Paddle sandbox). Paddle's
  webhook reaches it through `bun run ngrok`. Dmitry's :3000 is never used.
- `bun run test:e2e:checkpoints` runs the suite; the specs live in
  `tests/e2e/checkpoints/`.
- Tests grant rather than borrow: each builds its own users, project and
  checkpoint, and removes them afterwards.
- Time is moved by shifting the checkpoint's dates and calling
  `/api/cron/checkpoints`, as `bun run checkpoint:review` does.
- Real model calls. Models are chosen in `src/config/ai-models.ts`
  (`gpt-6.1-sol` for reviews, plan advice and evidence; `gpt-6-luna` for the
  goal check and the final report that proposes the verdict) —
  `OPENAI_API_MODEL` no longer overrides the curator.
- Refusals, time windows and money arithmetic stay in the unit tests; e2e
  catches a broken flow.

## Done when

- [x] `bun run test:e2e:checkpoints` passes on the stand, scenarios A–E of the
      Linear issue.
- [x] Every flow writes `test-results/checkpoints/<flow>.md`: the steps, each
      review, what the AI saw in every artifact and devlog medium, the verdict
      proposed vs settled, and the cost.
- [x] A whole AI checkpoint's cost is known: the Paddle amount and the summed
      `CheckpointAiUsage` — about $0.09 of model calls against $20 paid.

## Out of scope

- The human curator's flows (GDHUB-116): calls, the brief, payouts.
- Running the suite in CI: it needs Paddle sandbox, ngrok and paid model calls.
- Fixing what the suite finds — each finding is its own fix, listed in GDHUB-81.
  Three were small enough to fix here: the curator's tool calls on GPT-6
  (`reasoning_effort`), the curator journal crashing on a verdict entry, and
  the devlog composer posting before its last change was saved.

## Open questions

- **Paddle checkout in the browser:** settled — the overlay's sandbox card
  (4242…) is filled through its iframe, and the real webhook arrives via ngrok.
