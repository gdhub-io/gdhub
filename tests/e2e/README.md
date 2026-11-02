# E2E tests

The suite runs in three stages, as Playwright project `dependencies`. A later stage does not start when an earlier one fails.

| Stage | Project | What it does |
| ----- | ------- | ------------ |
| 1. Auth | `auth` | The sign-in and registration pages (`auth-flow.spec.ts`). |
| 2. Smoke | `smoke` | Every page, as someone allowed and someone refused (`smoke/`). |
| 3. Critical flows | `anonymous`, `onboarding`, `authenticated`, `checkpoints` | The long flows. |

## The stand

The suite runs against the stand on :3100: the app's own production build with
the stand's flags, over the throwaway database on 55432. Run it under the
watchdog, which stops a run before it can hang the machine.

```bash
cp .env.test.example .env.test   # once
bun run test-env up              # the test database and its personas
bun run stand:build              # after every code change; about a minute
bun run stand:start              # serves the build on :3100
scripts/e2e-watchdog.sh /tmp/e2e-watch.log bun run test:e2e
```

`bun run dev:test` (and `dev:test:live`, with the real model) is `next dev` on the
same port: fine for one spec with `--no-deps`, never for the whole suite. It
keeps every compiled route in memory, about 200 MB a page, and the smoke stage
alone took it past 20 GB.

`scripts/e2e-watchdog.sh` runs the command at low priority, logs the busiest
processes every 10 seconds, and stops the run when the load stays above 20,
free memory drops under 15%, or the stand holds more than 6 GB.

`scripts/stand.sh` holds the stand's environment for all four commands.

## Smoke

`smoke/routes.ts` reads the routes from `src/app/**/page.tsx`, and the expected access from the code:

- **A `createPermissionGate` or `createSpaceGate`** in the page or its nearest layouts. The allowed persona is the space's owner (`SPACE_INSIDER`), or the super admin for a permission gate. The refused personas are anonymous and a plain member.
- **Under the proxy's matcher, with no gate.** A member gets in. Anonymous is refused, and so is someone who has not finished onboarding.
- **Anything else** is public.

A new page is covered with no change here. Three cases need a line:

- A page in a new role-gated space: add the space to `SPACE_INSIDER`. The stage fails and says so until you do.
- A page with a parameter worth a real value: add it to `fixtures()` in `smoke.spec.ts`. Without one the page is opened with a made-up value, where a 404 is fine and only a crash fails.
- A new seeded record behind that value: add it to `tests/personas.ts`.

"Opens" means no 5xx, no error boundary and no uncaught exception. Console errors do not count: dev mode logs too much noise. "Refuses" means a 404 or a redirect to sign-in or registration.

`test:e2e:checkpoints` passes `--no-deps`, so working on checkpoints does not wait for smoke.

## How auth works

There is **no real sign-in flow** during tests. Instead `src/auth.ts` registers a
hidden `e2e-credentials` provider that is only loaded when **both**:

- `NODE_ENV` is not `"production"`, or the build is the stand's own (built with
  `NEXT_PUBLIC_E2E_STAND=1`, and not running on Vercel), and
- `E2E_TEST_AUTH === "1"` at runtime.

A real build never gets the stand flag, so in production that code is dead
(`src/lib/stand.ts`, `tests/dev-auth-gate.test.ts`).

Each spec makes its own users with `grantUser(label, persona)` from
`setup/users.ts`, signs in with `signInPage(page, user)` or
`signInAs(browser, user)`, and calls `removeRun()` in `afterAll`. Users are made
per run on `example.com` addresses, so specs never share rows.

To run a focused spec without waiting for smoke, add `--no-deps`.

## Writing a new authenticated spec

Name it `something.authed.spec.ts` and sign in as a user it granted
(`project-crud.authed.spec.ts` is the shortest example).

## The checkpoint suite (GDHUB-79)

`tests/e2e/checkpoints/` walks the AI checkpoint end to end: a project's path,
the purchase through Paddle's sandbox, the whole 28 days with the real model, the
verdict, refunds and who sees what. It never touches the dev server on :3000.

```bash
bun run test-env up          # the throwaway database on 55432 (--fresh rebuilds it)
bun run stand:build && bun run stand:start   # Paddle sandbox, recorded model answers
bun run test:e2e:checkpoints # one worker: the nightly cron is shared
```

- `.env.test` holds the Paddle **sandbox** keys, and the stand's build pins
  `NEXT_PUBLIC_PADDLE_ENV=sandbox`. No tunnel is needed: while the
  ready screen waits, the app asks Paddle what became of the checkout
  (`reconcileCheckout`) and settles it. The webhook route itself is therefore not
  covered here; if the sandbox's notification destination points at a dev server
  (`bun run ngrok` → :3100, or a tunnel to :3000), that server only logs the
  events as unmatched.
- The model answers from recordings in `tests/e2e/cassettes/` (`LLM_CASSETTES`,
  `src/services/ai/cassette.ts`): the stand replays them and records what is
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
