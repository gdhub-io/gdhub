# GDHUB-167 — Idle projects go Dormant and get archived again

[Linear](https://linear.app/gdhub/issue/GDHUB-167) · intent written 2026-11-08

## Want

A project that was created, clicked through a few stages and left goes quiet
on its own: Dormant after 3 months with nothing happening, Archived 14 days
later. Someone opening the page does not count as the team working on it. What
counts as "working on a project" is written down in one place, and every
feature that asks the question reads the same answer.

## Why now

Production shows many abandoned projects as in progress. Two causes:

- Since 2026-08-21 the view counter bumped `viewsCount` through Prisma. That
  moved `project.updatedAt`, and the status cron read it as activity, so one
  visitor a day kept a project awake.
- The 2026-10-09 cron change (#389) woke every project that had gone Dormant
  before it. Their `updatedAt` sat a few ms after `dormantAt`.

## Constraints

- Thresholds stay: 3 months → Dormant, then 14 days → Archived. A stage move
  is activity.
- The activity feed (`repositories/project/activity.ts`) already lists a
  project's events. The definition grows from it and is not built a second time.
- Production data is repaired by a script Dmitry runs himself: a dry run first,
  then `--apply`.

## Done when

- [ ] A page view does not move the project's `updatedAt` or its activity.
- [ ] `PROJECT_ACTIVITY` names every kind of project activity. The status cron
      and the scout's "last activity" read it, and never a bare `updatedAt`.
- [ ] The repair script lists the projects the cron woke with no real event
      since, and puts them to Dormant with the usual email to the author.

## How to check it on the platform

- As any persona, open `/project/<slug>` of someone else's project. The
  project's `updatedAt` stays the same, while `viewsCount` goes up by one.
- `/scout/games` as a scout: "Last activity" shows the last devlog, stage
  move, team change or edit, not the last visit.
- `bun run project:dormancy-repair:prod` prints the projects it would put to
  sleep, and writes nothing without `--apply`.

## Out of scope

- The "most active" ordering in `@gdhub-io/gdhub-prisma`
  (`getProjectsOrderedByActivity`), the Project Trails window and the admin
  workflow table keep their own rules for now. They can move onto
  `PROJECT_ACTIVITY` later.
- User activity. `lib/activity.ts` is generic so that it can follow, but no spec
  for users is written now.

## Open questions

- Does an admin's edit of someone else's project count? Assumed no: only the
  author's own edits (`edited`) and status changes count.
