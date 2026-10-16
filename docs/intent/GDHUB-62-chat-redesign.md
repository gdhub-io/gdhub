# GDHUB-62 — Chat redesign

[Linear](https://linear.app/gdhub/issue/GDHUB-62) · intent written 2026-09-29

## Want

Someone clicking the chat icon sees at a glance who wrote, what they wrote and
when. The unread chats are one tab away, and the closed ones are out of the way.
They open a conversation, read it as a conversation, with the day it happened
and one name per run of messages. If they scrolled up, they jump back to the
newest message in one click. Then they go back to the list without losing their
place. The chat opens as a panel under the icon, the way messengers on other
platforms do, and it looks like the rest of GDHub.

## Why now

The current drawer shows only an avatar and a name per room. There is no
preview, no time, no per-chat unread count and no ordering by recency, so
finding the chat that just pinged means opening them one by one. Inside a
conversation:

- every message repeats its avatar and name;
- there are no date separators;
- incoming text types itself out like an AI stream;
- a failed message cannot be retried.

A closed advice or vacancy chat looks exactly like an open one. And the red
unread badge breaks the design rule that red means destructive.

## Constraints

- **GDHub design system only.** Use tokens from `src/config/design`, antd v6,
  Tabler icons and the shared primitives in `src/components/ui`. The reference
  screenshots (Preply) supply behaviour, not looks.
- **Design first.** Frames live in `docs/design/platform-design.pen` and the
  spec in `docs/design/specs/chat-redesign.md`. No code until Dmitry approves
  the design.
- **Keep every way in working:** `?chat=1&roomId=`, `/chat#/room/{id}`, the
  `open-chat` event, the toasts and the domain "Open chat" buttons. Each one
  opens the panel straight on its conversation.
- **Keep what the product already does:** invite accept/decline, the
  advice/vacancy context and its close action, the read-only state of a closed
  chat, and own-message delivery status.
- Rooms still come from the client's Matrix sync. No DB-backed sidebar, same as
  in GDHUB-28.

## Done when

- [ ] On desktop, the header icon opens a panel under it, not a drawer. The
      panel shows the list or one conversation, with a back arrow between them.
- [ ] The badge on the header icon counts unread chats, and it is not red.
- [ ] The All / Unread / Archived tabs filter the list. Archived holds closed
      chats (`ChatRoom.status=Closed`) and nothing else.
- [ ] Each row shows the avatar, the name, its kind or space, a one-line
      preview, the time of the last message and its own unread count. Rows are
      sorted newest first and load in pages as the user scrolls.
- [ ] Each tab has its own empty state. A user with no chats sees an empty
      state, not skeletons that never finish.
- [ ] In a conversation:
  - [ ] consecutive messages from one person share one avatar and name;
  - [ ] each day starts with a separator;
  - [ ] once the user has scrolled up, a jump-to-latest button appears and
        counts the new messages;
  - [ ] a failed message can be retried.
  - [ ] a message can be replied to, copied and reacted to with an emoji; the
        author can edit or delete their own, and a deleted one leaves a
        placeholder.
- [ ] Messages are marked read only while the latest one is on screen and the
      tab is visible.
- [ ] On mobile, the list and the conversation each fill the screen.

## Out of scope

- **Attachments and file sending:** the folder icon, room media, the attach
  button. Nothing in the client sends or lists `m.file`/`m.image` yet.
- Voice messages, typing indicators, threads, search.
- An expanded (larger) panel mode.
- A personal "archive for me" action or Matrix room tags. Archived means closed.
- New chat kinds and space-scoped grouping. Those are GDHUB-28.

## Open questions

- **Server-side unread for paging.** The list pages over rooms the client
  already has from sync, so paging is a rendering concern. It does not need a
  new endpoint. *Assumed:* client-side paging over the synced rooms, and no
  server-side unread count.
- **Space grouping after GDHUB-28.** GDHUB-28 asks for chats grouped under their
  space. *Assumed:* the space or kind shows as a label on the row, and a space
  filter can be added later without changing the layout.
- **Emoji in the composer.** *Assumed:* an emoji picker is in scope, because it
  only inserts text. Anything more in the composer waits for attachments.
