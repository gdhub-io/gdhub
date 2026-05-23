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
yarn db:deploy --env-file .env.test
yarn db:seed   --env-file .env.test

# 4. Run dev server with the e2e env so the credentials provider is active.
#    Next.js honours existing process.env, so dotenv-cli is enough here.
yarn dotenv -e .env.test -- yarn dev
# 5. In another terminal:
yarn test:e2e
```

Playwright will reuse an already-running dev server on port 3000 (see
`playwright.config.ts > webServer.reuseExistingServer`).

## Writing a new authenticated spec

Name it `something.authed.spec.ts`. The `authenticated` project will pick it
up and apply the saved storage state automatically. Inside the spec you
already have a logged-in browser context — just `page.goto(...)`.
