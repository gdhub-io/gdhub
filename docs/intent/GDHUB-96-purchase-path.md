# GDHUB-96 — The purchase path: simpler for the author, fuller for the curator

## Want

A new author gets from the landing to paying in one straight line, answering only what a
curator actually uses; the curator, the AI and the author's own read-back all draw on one
picture of the project and the team.

1. **About you in three answers** — your name (prefilled from the session: Google or the
   registration name), your speciality (one free-text field; the work direction is guessed
   from it), your level (the whole `SkillLevel` scale as chips). Country goes; the
   **timezone** is taken from the browser and stored on the profile. The subtitle stops
   promising that the curator sees who you are — the brief is anonymous.
2. **A straight line for a new user** — "Save and continue" goes from about you to the
   project and on to the goal. The hub stays the screen people come back to (a profile or a
   project already exists, or they left half-way). Signing up from the landing keeps
   `?project=`.
3. **The team as two numbers on the goal step** — how many people make the game, and how
   many hours a week they have together — stored **on the checkpoint**, the next one
   prefilled from the last. They replace counting registered members and their
   `Profile.timeForWork` (a team of three with two outside GDHub read as "1 person"). The
   author, the curator and the AI goal check read the same two numbers. Inviting the team
   is offered after payment.
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

- Work direction: guessed by AI from the speciality text (the same call that already checks
  that field); `Other` when unsure. Editable later in the profile.
- Timezone: `Profile.timezone`, set from the browser — a schema change in gdhub-prisma.
- Team numbers: `ProjectCheckpoint.teamSize` and `teamHoursPerWeek` — a snapshot at
  purchase, so a closed checkpoint keeps the team it ran with. Schema change.
- Level: every `SkillLevel` as chips, not three.

## Order of work

Design first (Pencil, frames 12.1 About you, 12.2 Your project, 12.3 Goal, 12.5 Payment and
the curator's card), then the logic as a d2 diagram, then the schema change released from
gdhub-prisma, each approved before code. Items 1–3 first; 4–6 follow on the same frames.

## Must not move

- The brief stays anonymous: no names reach the curator before they accept.
- The server keeps every guard it has at pay: founder only, a goal, at least one line done
  so far, the legal ticks.
- The hub keeps working for people who already have a profile or a project.

## Not here

GTM events (GDHUB-95). Pricing by team size (the price table has the columns; the checkout
charges solo — a separate decision). Inviting the team in-app beyond a link after payment.
