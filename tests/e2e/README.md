# E2E tests

Two kinds of specs live in this folder:

| Project (Playwright) | Match pattern              | State                                |
| -------------------- | -------------------------- | ------------------------------------ |
| `anonymous`          | the existing `*.spec.ts`   | no cookies, smoke-tests redirects    |
| `authenticated`      | `*.authed.spec.ts`         | uses `storage-state.json` from setup |

## How auth works

There is **no real sign-in flow** during tests. Instead `src/auth.ts` registers a
hidden `e2e-credentials` provider that is only loaded when **both**:

- `process.env.NODE_ENV !== "production"`, and
- `process.env.E2E_TEST_AUTH === "1"`.

`tests/e2e/setup/global-setup.ts` runs once before the suite and:

1. Upserts the test user in the DB (`tests/e2e/setup/test-user.ts`).
2. Cleans up any orphan projects the test user might still own.
3. POSTs to `/api/auth/callback/e2e-credentials` with a CSRF token.
4. Saves the resulting cookies to `tests/e2e/setup/storage-state.json`.

Every spec matching `*.authed.spec.ts` is then run with that storage state.

## Running locally

```bash
# 1. Spin up a test database somewhere isolated from your dev DB.
# 2. Copy env. `gdhub-prisma` understands `--env-file` and loads it with
#    override=true, so it wins over the project's own .env.
cp .env.test.example .env.test

# 3. Apply migrations + base seed against the test DB.
bun run db:deploy --env-file .env.test
bun run db:seed   --env-file .env.test

# 4. Run dev server with the e2e env so the credentials provider is active.
#    Next.js honours existing process.env, so dotenv-cli is enough here.
bunx dotenv -e .env.test -- bun run dev
# 5. In another terminal:
bun run test:e2e
```

Playwright will reuse an already-running dev server on port 3000 (see
`playwright.config.ts > webServer.reuseExistingServer`).

## Writing a new authenticated spec

Name it `something.authed.spec.ts`. The `authenticated` project will pick it
up and apply the saved storage state automatically. Inside the spec you
already have a logged-in browser context — just `page.goto(...)`.

## The checkpoint suite (GDHUB-79)

`tests/e2e/checkpoints/` walks the AI checkpoint end to end: a project's path,
the purchase through Paddle's sandbox, the whole 28 days with the real model, the
verdict, refunds and who sees what. It never touches the dev server on :3000.

```bash
bun run test-env up          # the throwaway database on 55432
bun run dev:test             # :3100 against it, with .env.test (Paddle sandbox)
bun run ngrok                # Paddle's webhook → :3100
bun run test:e2e:checkpoints # one worker: the nightly cron is shared
```

- `.env.test` holds the Paddle **sandbox** keys and its webhook secret; the
  sandbox's notification destination is the ngrok URL + `/api/paddle/webhooks`.
- Time is moved by `makeToday(checkpointId, day)`, which shifts the checkpoint
  and everything written on the project together, then `runCron(page)` runs
  the night.
- Every flow writes `test-results/checkpoints/<flow>.md`: its steps, what the
  AI was shown and wrote (from the curator journal), the reviews, and the cost
  — the Paddle amount and the summed `CheckpointAiUsage`. A whole checkpoint
  costs about $0.09 of model calls.
- Users are made per run on `example.com` addresses and removed afterwards;
  rows an interrupted run left are removed by the next one after an hour.
- Not covered: the email sign-in link (the stand signs in through the test
  provider) and Novu letters (`E2E_TEST_AUTH=1` sends none — the cron's counts
  stand in for them).
