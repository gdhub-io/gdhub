# GDHUB-28 — Scope chats to spaces and support Matrix clients

[Linear](https://linear.app/gdhub/issue/GDHUB-28) · intent written 2026-09-06

## Want

A project team has a chat that every member is simply in, without anyone
inviting anyone. A course and an event get the same thing when their turn comes.
A scout writing to a project author reaches them in a conversation filed under
that author's own project — not under a cabinet the author cannot see and should
not know about. And whoever prefers a real messenger keeps talking from Element,
with GDHub still deciding who is in which room.

## Why now

Group chats were promised by the schema and never built: `ProjectGroup`,
`EventGroup` and `CourseGroup` are enum values with no provider, no creation and
no lifecycle. Meanwhile every new conversation type is grown one-off — advice
did it, vacancies did it, the advisor space (GDHUB-24) is landing now and will
do it again, and the scout deal after that. Each one re-encodes where the chat
belongs into `directKey` and a JSON blob, and the access check has to guess it
back out; GDHUB-23 closed the hole where it guessed wrong, with a stopgap that
says so in its own comments.

The Element half is not a nice-to-have either: platform accounts are provisioned
with a password nobody is ever shown, so today the answer to "can I use my own
client" is no, and there is no path to yes.

## Constraints

- **Matrix membership is written by the platform only.** Clients may leave a
  room; they may not add anyone. Enforced by power levels, not by convention.
- **Rooms are never encrypted.** E2EE breaks server-side sending and the web
  client, which runs without crypto. The lock has to be in place before the
  first person signs into Element, or every existing room needs rewriting.
- The `ChatRoom` registry stays the source of truth for what a chat *is*; Matrix
  stays the transport and the delivery ACL.
- Reuse what exists: `membership.ts` is already the single write path for space
  membership, and `withSpaceGuard` is already the permission gate. Neither gets
  a parallel implementation.
- The schema lives in `@gdhub-io/gdhub-prisma`, so the first stage is a two-repo
  loop before anything here compiles.
- Chats that exist today — advice, vacancy, direct — keep working and are
  migrated, not re-created: domain rows point at their `matrixRoomId`.

## Done when

- [ ] A project team chat exists, and every team member is in it without a
      manual invite.
- [ ] Adding or removing someone from a space changes the chat membership too,
      and a reconcile pass repairs whatever the homeserver refused.
- [ ] Whether a person may read a chat is answered by `SpaceMember` (group) or
      `ChatRoomMember` (everything else) — never by parsing `directKey`.
- [ ] The drawer groups a chat under its space for a member of that space, and
      in a `kind` bucket for the person on the outside.
- [ ] A user can sign into Element with credentials GDHub gave them and see
      their chats.
- [ ] From Element, an ordinary member cannot invite anyone, rename a room or
      turn on encryption.
- [ ] Advice, vacancy and direct chats created before this work still open and
      still resolve their context.

## Out of scope

- **Scout deal chats.** They need a `ScoutDeal` row to hang off, the way every
  other kind hangs off a domain row its provider loads and syncs on close. The
  scout space is still being built; the chat follows it, not the other way
  round.
- Course and event group chats. Same mechanism, later — the project team chat is
  what proves it.
- A DB-backed sidebar. Rooms still come from the client's own Matrix sync; the
  registry only supplies metadata.
- Federation and users from other homeservers.
- Threads, reactions, file sharing, message search, and any redesign of the chat
  UI.

## Open questions

- **Read-only participants.** Reading is membership, not a power level, so
  "reads but cannot post" means a member sitting below `events_default` — a
  personal entry in the room's power levels, the way Element's Mute works.
  Assumed for now: nobody needs it. A role that may not post is simply not in
  the room, and a project guest has no business in the team chat anyway. The
  decision that matters up front is not the mechanism but whether the
  membership sync has to write per-user power levels at all.
- **Do 1:1 chats hang under a space in Element?** Assumed: no — they get
  `m.direct` and no parent, so the outsider is never pointed at a space they
  cannot see. If a scout wants a pipeline view later, `m.space.child` can be
  added on the space side only. Verify against a real Element before relying on
  the behaviour.
- **How a Matrix client signs in.** Assumed: an app password generated in
  profile settings. OIDC is the textbook answer and a poor fit — mapping a
  Google token onto an existing cuid localpart needs a custom Synapse module,
  and magic-link users have no Google identity at all.
- **Where Direct chats live.** Assumed `hub/default`, since they belong to no
  entity.
