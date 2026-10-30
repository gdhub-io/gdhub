# E2E tests

The suite runs in three stages, as Playwright project `dependencies`. A later stage does not start when an earlier one fails.

| Stage | Project | What it does |
| ----- | ------- | ------------ |
| 1. Auth | `auth` | Sign-in and sign-out (`auth-flow.spec.ts`). |
| 2. Smoke | `smoke` | Every page, as someone allowed and someone refused (`smoke/`). |
| 3. Critical flows | `anonymous`, `onboarding`, `authenticated`, `checkpoints` | The long flows. |

| Project (Playwright) | Match pattern              | State                                |
| -------------------- | -------------------------- | ------------------------------------ |
| `anonymous`          | the existing `*.spec.ts`   | no cookies, tests redirects          |
| `authenticated`      | `*.authed.spec.ts`         | uses `storage-state.json` from setup |

## Smoke

```bash
bun run test-env up        # the test database and its personas
bun run dev:test           # the stand on :3100
bun run test:e2e:smoke     # auth, then smoke; one worker, about 3 minutes
```

`smoke/routes.ts` reads the routes from `src/app/**/page.tsx`, and the expected access from the code:

- **A `createPermissionGate` or `createSpaceGate`** in the page or its nearest layouts. The allowed persona is the space's owner (`SPACE_INSIDER`), or the super admin for a permission gate. The refused personas are anonymous and a plain member.
- **Under the proxy's matcher, with no gate.** A member gets in. Anonymous is refused, and so is someone who has not finished onboarding.
- **Anything else** is public.

A new page is covered with no change here. Three cases need a line:

- A page in a new role-gated space: add the space to `SPACE_INSIDER`. The stage fails and says so until you do.
- A page with a parameter worth a real value: add it to `fixtures()` in `smoke.spec.ts`. Without one the page is opened with a made-up value, where a 404 is fine and only a crash fails.
- A new seeded record behind that value: add it to `tests/personas.ts`.

"Opens" means no 5xx, no error boundary and no uncaught exception. Console errors do not count: dev mode logs too much noise. "Refuses" means a 404 or a redirect to sign-in or registration.

The stand runs with Turbopack's disk cache off (`next.config.js`): it grew to 10 GB, slowed compiles to minutes and crashed the server with `turbo-tasks: an internal panic`, exit code 0 and nothing else in the log. Each start compiles routes afresh.

`test:e2e:checkpoints` passes `--no-deps`, so working on checkpoints does not wait for smoke.

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
bun run test-env up          # the throwaway database on 55432 (--fresh rebuilds it)
bun run dev:test             # :3100 against it, Paddle sandbox, recorded model answers
bun run test:e2e:checkpoints # one worker: the nightly cron is shared
```

- `.env.test` holds the Paddle **sandbox** keys. No tunnel is needed: while the
  ready screen waits, the app asks Paddle what became of the checkout
  (`reconcileCheckout`) and settles it. The webhook route itself is therefore not
  covered here; if the sandbox's notification destination points at a dev server
  (`bun run ngrok` → :3100, or a tunnel to :3000), that server only logs the
  events as unmatched.
- The model answers from recordings in `tests/e2e/cassettes/` (`LLM_CASSETTES`,
  `src/services/ai/cassette.ts`): `dev:test` replays them and records what is
  missing; `dev:test:live` calls the real model. Cassettes work only on the stand
  — they need `E2E_TEST_AUTH=1` and never run in production — so the app the team
  uses never gets a recorded answer. A prompt change records a new cassette; the
  diff shows it in review.
- Refreshing cassettes: run only the flows whose prompts changed — new recordings
  are added, the rest stay. After a full green run, `bun run cassettes:prune
  <time the run started>` removes recordings it never used (each answer touches its
  file).
- Time is moved by `makeToday(checkpointId, day)`, which shifts the checkpoint
  and everything written on the project together, then `runCron(page)` runs
  the night.
- Every flow writes `test-results/checkpoints/<flow>.md`: its steps, what the
  AI was shown and wrote (from the curator journal), the reviews, and the cost
  — the Paddle amount and the summed `CheckpointAiUsage`. A whole checkpoint
  costs about $0.09 of model calls when they are live.
- Users are made per run on `example.com` addresses and removed afterwards;
  rows an interrupted run left are removed by the next one after an hour.
- Not covered: the email sign-in link (the stand signs in through the test
  provider) and Novu letters (`E2E_TEST_AUTH=1` sends none — the cron's counts
  stand in for them).
