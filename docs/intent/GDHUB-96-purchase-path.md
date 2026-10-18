# GDHUB-96 — The purchase path: simpler for the author, fuller for the curator

## Want

A new author gets from the landing to paying in one straight line, answering only what a
curator actually uses; the curator, the AI and the author's own read-back all draw on one
picture of the project and the team.

1. **About you, shorter** — your name in one field (prefilled from the session: Google or
   the registration name), **year of birth** as onboarding asks it (a Checkpoint is sold
   to people 18 or over; the server refuses the step and the payment below that), **time zone** in place of country (prefilled from the browser,
   editable), work direction, speciality and level, as on the approved frame. The time
   zone is stored on the profile; call reminders to the team use it instead of UTC. Below
   speciality and level, **"Briefly about your experience"** (up to 500 characters) so the
   curator learns a little more about the author before the start; it shows in the brief. The subtitle stops
   promising that the curator sees who you are — the brief is anonymous.
2. **A straight line for a new user** — "Save and continue" goes from about you to the
   project and on to the goal. The hub stays the screen people come back to (a profile or a
   project already exists, or they left half-way). Signing up from the landing keeps
   `?project=`.
3. **The team stays as it is on the goal step** — the author states their own hours, and the
   team is the members registered on the project, each with their own hours. A team with
   people outside GDHub **invites them after payment** (a link on the paid screens), and
   they state their hours themselves. The author's side, the curator's card and the AI goal
   check count the same members (today one includes former members and the other does not).
4. **An existing project is asked only for what is missing** — an empty description or
   genre — and shows its current stage with "change".
5. **One curator brief** — `buildCuratorBrief(checkpointId)`: with whom (the author's
   role and level, team size and hours, language and timezone) and with what (pitch,
   genre, stage, what's done so far with its evidence, the goal, the last verdict). The AI
   prompts and the curator's card read it; the author sees it on the payment step as "What
   the curator will see".
6. **An AI suggestion for "what's done so far"** — two or three lines for a fresh project
   from its pitch and stage (`suggestCardLines(Input)` exists), editable, rate-limited.

## Decided (2026-10-18)

- Work direction stays a field the author picks (2026-10-19): simple to answer, and stored
  as it is today.
- Time zone over country (2026-10-19): the field replaces Country on About you, prefilled
  from the browser and editable; stored as `Profile.timezone` (IANA) — the one schema change of this
  task, in gdhub-prisma. `Profile.country` stays in the schema, no longer
  asked here.
- Year of birth, as onboarding asks it (2026-10-19): the existing `Profile.yearOfBirth`, a
  select; refused when `currentYear − year < 18`. The year cannot tell 17 from 18 near a
  birthday — the Purchase Terms tick "I am 18 or over" is the buyer's own statement that
  covers it.
- The experience text is stored in `Speciality.specialization` (2026-10-19) — the field
  the entry step leaves empty today; no schema change for it.
- The team is not two typed numbers (2026-10-19): the author keeps their own hours, and
  more people come in by invitation after payment. No schema change for it.
- Level stays the select it is today.
- **Design: the approved frames are reworked in place** (12.1 `TV9y5`, 12.2 `u7wrRw`, 12.3
  `mfAfN` stays as approved), not redrawn as new ones.

## Order of work

Design first (Pencil, frames 12.1 About you, 12.2 Your project, 12.5 Payment, the paid screens
and the curator's card), then the logic as a d2 diagram, then the schema change released from
gdhub-prisma, each approved before code. Items 1–3 first; 4–6 follow on the same frames.

## Must not move

- The brief stays anonymous: no names reach the curator before they accept.
- The server keeps every guard it has at pay: founder only, a goal, at least one line done
  so far, the legal ticks.
- The hub keeps working for people who already have a profile or a project.

## Not here

GTM events (GDHUB-95). Pricing by team size (the price table has the columns; the checkout
charges solo — a separate decision). Inviting the team in-app beyond a link after payment.
