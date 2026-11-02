# GDHUB-134 — The e2e stand runs from a production build

[Linear](https://linear.app/gdhub/issue/GDHUB-134) · intent written 2026-11-02

## Want

The whole e2e suite runs in one go on Dmitry's machine and leaves it usable.

## Why now

The stand was `next dev`, which keeps every compiled route in native memory,
about 200 MB a page. The smoke stage alone pushed it past 20 GB on a 16 GB
machine and hung it several times. A V8 heap cap and Turbopack's memory
eviction did not help (measured with `scripts/e2e-watchdog.sh`, GDHUB-130).

## Constraints

- **The test sign-in, recorded model answers and the emulated Daily never open
  in production or on a Vercel deployment.** They open on a production build only
  when it was built with `NEXT_PUBLIC_E2E_STAND=1`, runs with `E2E_TEST_AUTH=1`,
  and is not on Vercel. A real build never gets the flag, so the code is dead there.
- **Paddle stays in the sandbox on the stand:** `NEXT_PUBLIC_PADDLE_ENV`, which
  follows `NODE_ENV` when unset, so production does not change.
- `bun run dev:test` stays, for one spec at a time.
- e2e runs only locally, as before.

## Done when

- [ ] `bun run stand:build` + `bun run stand:start`, then the whole suite in one
      run under the watchdog: the stand stays under 2 GB, the machine responsive.
- [ ] `tests/dev-auth-gate.test.ts`: shut for a production build without the
      stand flag, without `E2E_TEST_AUTH`, and on Vercel.
- [ ] `tests/e2e/README.md` says how to run the stand.

## How to check it on the platform

1. `bun run test-env up`, `bun run stand:build`, `bun run stand:start`, then
   `scripts/e2e-watchdog.sh /tmp/w.log bun run test:e2e`.
2. `bun run test tests/dev-auth-gate.test.ts tests/paddle-environment.test.ts`.

## Out of scope

- Running e2e in CI.
- The dev server's memory itself.
