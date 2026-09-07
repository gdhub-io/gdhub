# GDHUB-24 — Advisor space

[Linear](https://linear.app/gdhub/issue/GDHUB-24/create-advisor-space) · intent written 2026-09-05

## Want

Someone who agrees to advise other people's games gets a place of their own to do
it from: one screen listing the questions waiting for them, one listing the
reviews they have left after pitch streams, and one holding the terms they take
work on. Today that person has no place at all — they are a profile flag, and
their work is scattered across three screens that belong to somebody else.

## Why now

The mentorship switch already exists and people already flip it on, so requests
already arrive; they land in `/user/advice-requests`, a 631-line component that
mixes what the person asked with what they were asked, incoming with outgoing,
active with archived. Reviews left after a pitch stream have nowhere to live at
all — `ProjectEstimation` rows are written by nothing and read by the scout
card, so the advisor cannot see, correct or withdraw their own words. Every
addition to mentorship currently makes that one component worse.

## Constraints

- **`/user/advice-requests` and `/hub/experts` stay.** They are the asker's side
  of the same feature. The advisor space is the advisor's side and never adds the
  asker as a member — a space with both in it would duplicate the chat.
- **`ProjectEstimation` is extended, not replaced.** It is read today by
  `getProjectCardReviews` and by `evaluateTaskCondition`; both must start
  filtering `status: Published` in the same change that adds the column, or a
  draft shows on a project card and satisfies a workflow task.
- **The schema is not in this repo.** `AdvisorAgreement`, the `ProjectEstimation`
  columns and advisor preferences land in `@gdhub-io/gdhub-prisma` and are
  released before any code here can use them.
- **One signing integration.** The agreement is generated from a template and
  signed through Documenso via `src/services/legal`, the path event certificates
  already take. No second provider, no hand-uploaded PDF.
- **The design system is the contract.** Tokens, not literals; `DS · 08 Cards`
  for the cards; the four states drawn before the screen is called done.

## Order of work

The feature is five pull requests, in this order, because each opens the next:

1. **Space and inbox** — `advisor` space, adapter, gate, `/advisor/requests`.
   Runs on `AdviceRequest`, which exists, so it needs no schema change.
2. **Schema** in `../prisma`: `AdvisorAgreement`, the `ProjectEstimation`
   columns, advisor preferences. Released as one version.
3. **Reviews** — `/advisor/reviews`, the CRUD behind it, and the two existing
   readers taught to filter `Published`.
4. **Agreement** — template, routes, webhook, and the gate tightened to require
   a signed agreement.
5. **Settings** — `/advisor/settings`, `/user/settings/mentorship` reduced to the
   switch, pause hiding the card from `/hub/experts`.

## Done when

- [ ] A user with mentorship on and a signed agreement can open `/advisor`;
      everyone else gets a 404 there.
- [ ] Every request addressed to the advisor is listed at `/advisor/requests`,
      filterable by New / In progress / Answered / All, and accepting one opens a
      1-to-1 chat with the person who asked.
- [ ] An advisor can write, edit, publish and delete a review of a project they
      heard pitched; one review per project and stage.
- [ ] A draft review appears in the advisor's own list and nowhere else — not on
      the project card, not in a workflow task's count.
- [ ] Pausing in `/advisor/settings` removes the advisor from `/hub/experts`
      entirely, and requests already accepted are unaffected.
- [ ] `/user/settings/mentorship` carries the switch and the agreement state, and
      no longer carries the mentorship form.

## Out of scope

- **The mentor fund** (`ProjectEquity.mentorFundShare`). It needs a second
  document — advisor ↔ author — that does not exist, and until it does there is
  nothing to pay out. No equity page in the space.
- **Rewriting `/user/advice-requests`.** It keeps working as the asker's side.
  Splitting it is a separate piece of work and is not required by any criterion
  above.
- **Attachments on a request**, and any change to how a question is asked.
- **Scoping a review to a pitch event.** `eventId` is carried from day one but
  stays optional; making it required is a later decision.

## Open questions

- **What role does the advisor hold in the space?** The spec says `member`, but
  `Member` is read-only by default (`CLASS_DEFAULT_ROLES`), so an advisor could
  not accept a request or delete their own review. Assumed for now: `Owner`, the
  role `createScout` grants for the same shape of space.
- **Where do advisor preferences live** — two columns on `Speciality`, or an
  `AdvisorSettings` row? Assumed: `AdvisorSettings`, keyed by user, because the
  settings page is expected to grow and `Speciality` is per-speciality while
  these are per-person.
- **Does an unsigned agreement hide the space or empty it?** Assumed: hide —
  `/advisor/*` is a 404 until the agreement is signed, matching how every other
  space treats absent access.
