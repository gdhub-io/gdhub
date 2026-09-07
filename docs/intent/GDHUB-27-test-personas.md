# GDHUB-27 — Test personas and a throwaway database

[Linear](https://linear.app/gdhub/issue/GDHUB-27) · intent written 2026-09-05

## Want

Anyone checking a screen can be the kind of person that screen was built for —
an admin, an advisor with questions waiting, a scout with a cabinet — by picking
them from a list, against a database that can be thrown away and rebuilt in a
minute.

## Why now

The advisor space was verified by switching Dmitry's own mentorship on in the
development database, because there was no other way to be an advisor. That is
the cheapest possible way to corrupt the data you develop against, and it does
not scale past one role: nobody can check what a screen does for a scout, a
half-onboarded registrant, or someone who owns a course.

Half the machinery already existed and was invisible: an `e2e-credentials`
provider Playwright signs in through, a throwaway-Postgres recipe inside an
integration test, and a full set of fixtures in `@gdhub-io/gdhub-prisma` that the
package did not publish.

## Constraints

- **The gate does not change.** The sign-in screen is behind exactly the
  `isE2EAuth` the credentials provider already uses — imported, not restated.
  Nothing new becomes reachable in production.
- **Reuse the fixtures, do not fork them.** They live in `../prisma`; a second
  set here would drift within a month.
- **Never on port 5432.** Every other project's Postgres lands there, and a
  screen silently reading the wrong database has already cost this project an
  afternoon.
- **The ordinary dev server keeps working** while the test one runs.

## Done when

- [ ] `gdhub-prisma mock [users|projects|advisors|courses]` runs from this repo.
- [ ] `bun run test-env up` builds a database with migrations, reference data,
      the permission matrix, fixtures and personas; `down` removes it.
- [ ] Nine personas exist with the access their names claim, defined once and
      usable both by the harness and by a test granting them to its own user.
- [ ] A person can sign in as any of them at `/dev-signin`, and that page 404s
      without `E2E_TEST_AUTH=1`.

## Out of scope

- **Changing real authentication.** The provider and its gate are untouched.
- **Running the harness in CI.** This is for checking a screen by hand; CI has
  Playwright.
- **Fixing the fixtures' own content.** Groups are applied one at a time so a
  stale one cannot cost the whole database, and a failure is reported rather
  than repaired here.

## Open questions

- **Many fixed personas, or few users re-permissioned per test?** Assumed: both,
  for different jobs. The catalogue is declarative, `test-env` seeds all of it
  for checking by hand, and `becomePersona` grants one to a user a test owns —
  because a shared fixture that tests mutate is a test that fails in the wrong
  order.
- **Where do "educator" and "organiser" come from?** They are not platform
  roles: `hub.courses.create` and `hub.events.create` belong to every member, so
  those personas are simply people who own a course or an event. Assumed to stay
  that way until something says otherwise.
