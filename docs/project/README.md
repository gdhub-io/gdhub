# Project

A project is a game a team builds on GDHub. It has a team (members with a status
and the dates they joined and left) and a workflow (an ordered list of stages, one of
them current, each with the date it started and the date it finished).

## Who is on the team

A user is on a team when one of their membership rows is `Hired` or `Founder` and
has no `finishedAt`. A user fired and taken back has more than one row; the newest
one decides. Every "is this person on the team" check asks `currentMembership`.
When membership changes, `reconcileCheckpointRooms` adds the user to the open
checkpoint chats or takes them out.

## Moving a project between stages

Every move goes through `setCurrentStep`, whoever makes it: the author's "next",
an admin edit or reset, a new project, a checkpoint draft. The rules for the dates
are in [team-and-stage-flow.svg](team-and-stage-flow.svg).

## Code

- `src/repositories/project/` — the project's data, workflow and team
- `src/services/workflow/` — workflow templates, reset plans and task conditions
- `src/services/chat/checkpoint-room.ts` — checkpoint chats following the team
