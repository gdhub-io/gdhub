# GDHUB-130 — E2E smoke: every page, the people allowed and the people refused

[Linear](https://linear.app/gdhub/issue/GDHUB-130) · intent written 2026-10-30

## Want

Before any long flow runs, one quick stage opens every page of GDHub as someone
who may see it and as someone who may not. A page that crashes, or opens for the
wrong person, is found in minutes rather than by chance inside a critical flow.

The suite runs in three stages, and a later one does not start when an earlier
one fails: **auth → smoke → critical flows**.

## Why now

The e2e suite has no smoke layer. Critical flows find a broken route only if they
happen to pass through it, and they are long and call a paid model. Checkpoints
are about to go to production with about 94 pages behind them.

## Constraints

- **A new page is covered without anyone remembering it.** Routes come from
  scanning `src/app/**/page.tsx`, and the access expected comes from the gate in
  the code: `createSpaceGate` / `createPermissionGate` in the nearest layout or
  page, plus the permission registry. A page the scan cannot classify fails the
  stage and says what to add.
- **Compressed matrix on the dev stand** (decided 2026-10-30). Each page is
  opened as anonymous, as one allowed persona and as one refused persona: about
  280 loads, with no production build. The full matrix of 94 pages × 10 personas
  is about 940 loads, too slow for this stage.
- **Runs on the stand:** the database from `bun run test-env up` with its
  personas, and `bun run dev:test` on :3100. No Paddle, no model calls.
- **Allowed** means no 5xx, no error boundary and no uncaught page exception.
  **Refused** means a redirect to sign-in, or the 404 page, and the page's data
  does not show.
- Existing specs keep their behaviour. They only move into stages.

## Done when

- [ ] One smoke spec walks every route from the scan. A page added to `src/app`
      is picked up with no test change.
- [ ] A page opened for the wrong persona fails the stage, as does one that
      crashes.
- [ ] `playwright.config.ts` runs auth → smoke → critical through project
      `dependencies`.
- [ ] `tests/e2e/README.md` describes the three stages and how to add a route's
      fixture.
- [ ] Once the routes are compiled, the smoke stage takes a few minutes, not the
      length of the critical flows.

## How to check it on the platform

1. Run `bun run test-env up`, `bun run dev:test`, then `bun run test:e2e:smoke`.
   It is green, and its report lists each route × persona.
2. Temporarily remove `createSpaceGate` from `admin/layout.tsx`. The stage fails
   on `/admin/*` as `member`. Put it back.
3. Add `src/app/(public)/x/page.tsx` that throws. The stage fails on `/x` with no
   test edit. Delete it.
4. Break the auth stage, for example by changing the sign-in fixture. Smoke and
   critical do not run.

## Out of scope

- Roles inside a page: buttons and actions shown per permission. The role matrix
  and unit tests own those.
- API routes on their own: `withSpaceGuard` has its tests.
- Running the suite in CI.
- Fixing what the stage finds, unless it is small. Larger findings get listed
  in the PR.

## Open questions

- **Console errors:** assumed not to fail a page. Dev mode logs too much noise, so
  only uncaught exceptions count.
- **Dynamic routes without a fixture** (a token, a CMS slug): opened with a made-up
  value, where a 404 is fine and only a crash fails. The report marks them.
