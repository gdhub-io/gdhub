---
name: intent
description: Start a piece of work by writing its intent — what is wanted, why, and what must not move — from a Linear issue, then open the branch for it. Use when picking up a GDHUB issue, when asked to plan a feature before building, or when an existing intent needs checking against what the work has become.
---

# Write the intent before the work

The Linear issues in this workspace are titles with empty descriptions. Every
piece of context therefore lives in Dmitry's head until a session starts, and it
leaves again when the session ends. This skill is where it gets written down
once, in the repository, in a form the next agent can act on.

Argument: a Linear id (`GDHUB-24`), or nothing — then ask which issue.

## 1. Read the issue, do not trust it to be filled in

`mcp__claude_ai_Linear__get_issue` with the id. Take the title, the status, the
`gitBranchName` and the url. Expect `description` to be empty; that is normal
here, not a reason to stop.

Then look for what already exists, because half of these have been discussed
before: grep `docs/` for the feature name, check `docs/intent/` for an earlier
intent, and check whether `docs/design/platform-design.pen` already has frames
(the design row usually carries the feature's name).

## 2. Interview, briefly

You need what the issue does not say. Ask at most three questions, and only ones
whose answers change the work — use `AskUserQuestion` so they are cheap to
answer. The ones that usually matter:

- **Who is it for and what do they do today instead?** This is the whole "why".
- **What must not move?** Existing routes, data that cannot be migrated, a
  deadline.
- **Where does it stop?** The neighbouring thing it deliberately does not touch.

Decide everything else yourself and write down what you decided. A question you
can answer by reading the repository is a question you do not ask.

## 3. Write `docs/intent/<ID>-<slug>.md`

The shape is in [docs/intent/README.md](../../../docs/intent/README.md) — follow
it exactly, and keep it to a screen. Rules that matter more than the shape:

- **Want** is written in terms of the person using GDHub, never in components.
- **Done when** is checkable by looking at the product. "Advisors can decline a
  request with a reason" is checkable; "the inbox is improved" is not. These
  become the tests, so write them as though someone has to prove each one.
- **Out of scope** is not optional. It is the section that stops an agent from
  rebuilding the neighbouring feature because it was nearby.
- **Open questions** each carry the answer assumed for now. Work is never
  blocked waiting on one.

Do not restate the stack, the conventions or the API pattern — they are in
[CLAUDE.md](../../../CLAUDE.md).

## 4. Offer to push it back to Linear

The issue description is empty; the intent is exactly what belongs there.
Confirm first that `get_user("me")` is `dmitry.drynov` — there is more than one
Linear account here and a write lands wherever the connector points. Then ask the
user, because it writes outside the repository, and
`mcp__claude_ai_Linear__save_issue` with the intent body. Now the ticket is
readable by someone who does not have the repo open.

## 5. Linear is where a decision is asked for

Statuses on the GDHub team are `Backlog`, `Todo`, `In Progress`, **`In Review`**,
`Done`, `Canceled`. Use them as the signal, not a chat message that scrolls away:

- Work starting → **In Progress**.
- A pull request open and waiting on Dmitry → **In Review**, with the pull request
  attached as a link. This is the one that matters: it is how he sees, on his own
  board, that something needs him.
- Merged → **Done**.

Every task gets an issue, even the small ones that skip the intent file — the issue
is cheap and it is the only place the request survives. Put in its description what
was decided, and what was deliberately **not** done: an unwritten test, a version
declined, a check that was not possible. A checklist ticked without comment tells
him nothing.

## 6. Open the branch

Use Linear's own `gitBranchName` verbatim (`feature/gdhub-24-…`) so Linear links
the branch to the issue, and cut it from `dev`:

```
git switch dev && git pull && git switch -c <gitBranchName>
```

Commit the intent on that branch as `docs(intent): …` before any code exists.
The intent landing first is the point: it is what the diff will be judged
against.

## 7. Hand off

Say which skill or agent takes it from here and why:

- UI that does not exist yet → the **design-build** skill (design in Pencil
  first, then build).
- Endpoints → the **api-route-builder** agent.
- Anything crossing the database schema → the two-repo loop in CLAUDE.md; the
  schema change lands in `../prisma` and is released before this branch can use
  it.

## When the intent already exists

Read it against what the work has become and report the drift in a sentence or
two — what was built that the intent does not mention, what the intent promised
that has not appeared. Then edit the file. A stale intent is worse than none,
because the next agent will believe it.

## Do not

- Do not write an intent for a typo, a copy change or a one-file bug. Say it does
  not need one and do the work.
- Do not invent acceptance criteria to fill the section. Three real ones beat ten
  written to look thorough.
- Do not let the intent grow into the spec. When it passes a screen, the extra
  belongs in `docs/<feature>.md`.
