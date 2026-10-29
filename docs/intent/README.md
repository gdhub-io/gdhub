# Intent

One short file per piece of work, written **before** anything is designed or
built, stating what is wanted, why, and what must not move. Named after the
Linear issue: `GDHUB-24-advisor-space.md`.

An intent is not a spec. The spec (`docs/<feature>.md`) answers *how* and runs to
hundreds of lines; the intent answers *what and why* and fits on a screen. The
spec grows out of the intent, and the intent is what the spec is checked against
when the two disagree.

Write one for anything that will take more than a session or touch more than one
surface. A typo fix, a copy change or a one-file bug do not need one — say so and
move on.

## The shape

```markdown
# GDHUB-24 — Advisor space

[Linear](https://linear.app/gdhub/issue/GDHUB-24) · intent written 2026-09-05

## Want

One paragraph, in terms of what changes for the person using GDHub. Not
components, not tables — the change they would describe to someone else.

## Why now

The pain this removes, concretely. If nothing hurts, the work is speculative and
should wait.

## Constraints

What must not move: existing routes, data that cannot be migrated, the design
system, a deadline, a cost. Also what must be reused rather than rebuilt.

## Done when

- [ ] Checkable statements, each true or false by looking at the product.
- [ ] These become the acceptance criteria and, where they can be, the tests.

## How to check it on the platform

Steps anyone can follow to see it working, through the UI where possible —
which persona to sign in as (`/dev-signin`), which page, what to click, what
should appear — and through an endpoint (method, path, body, expected answer)
where the UI cannot show it.

## Out of scope

The neighbouring work this deliberately does not do. This section is what stops
an agent from helpfully rebuilding half the platform.

## Open questions

Each with the answer assumed for now, so work is never blocked waiting on one.
```

## Keeping it honest

The intent is written once and edited when reality moves — a stale intent is
worse than none, because the next agent will believe it. When the work lands,
the intent stays as the record of why: it is the only place that says what was
deliberately not built.
