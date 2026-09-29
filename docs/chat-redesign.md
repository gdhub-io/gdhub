# Chat redesign — implementation plan (GDHUB-62)

The work is split into stages. Each stage ends green (`lint`, `type-check`, `test`) and is
committed on its own, so it can stop after any stage and pick up later.

- Intent: [docs/intent/GDHUB-62-chat-redesign.md](intent/GDHUB-62-chat-redesign.md)
- Design spec: [docs/design/specs/chat-redesign.md](design/specs/chat-redesign.md). The frames
  are in `platform-design.pen`, row **Chat · redesign**.
- Branch: `feature/gdhub-62-chat-redesign-header-launcher-chat-list-conversation-view`

## Decisions on the spec's open questions (§10)

The design was approved 2026-09-29. These defaults hold until Dmitry says otherwise.

1. The tab is named **Closed**, matching the *Close chat* action.
2. **Leave** returns to the row menu, for direct chats only, so a direct chat can still be left.
3. The info popover leaves the header. `ChatPushStatus` moves into the admin-only
   `IconPlus` area, as a tooltip on the new-chat button.
4. Both participants may close an advice or vacancy chat, as today.
5. The emoji picker is `frimousse`: small, headless, and styleable with our tokens. The
   reaction strip stays at the fixed 7 emoji.
6. Timestamps use `--gd-color-text-tertiary`, as asked. An AA muted role is a DS change and is
   not part of this work.
7. On own messages, the message menu trigger sits left of the bubble.
8. Editing and deleting have no time limit.
9. "Find an expert" links to the experts catalogue.

**Simplification against spec §9.** Closed rooms are still in the client's Matrix sync, because
the user stays joined and the room is only read-only. So all three tabs filter the synced rooms
on the client, using `status` from the room metadata endpoint. There is no separate paginated
"closed" endpoint. Paging is incremental rendering, 20 rows at a time.

## Stages

### 0. Groundwork
- [x] Intent, design spec and this plan committed.
- [x] Power levels checked. Rooms use `Preset.PrivateChat` (`events_default: 0`), so members
      may send `m.reaction` and redact their own events. Redacting your own event needs only
      the send level for `m.room.redaction`. Closing a chat raises `events_default`
      (`makeRoomReadOnly`), which blocks reactions and deletes along with messages, and that
      matches the design.

### 1. Room metadata and list model
- [x] `GET /api/chat/rooms/kinds` became `GET /api/chat/rooms/meta`, which returns
      `{ kind, status, label, closedAt }` per Matrix room id (`ChatRoomMeta` in
      `src/types/chat.ts`). The project labels come from two batched queries in
      `services/chat/room-labels.ts`. The old `ChatRooms` reads `.kind` until stage 3
      replaces it.
- [x] `GET /api/chat/rooms/[id]` now returns `canClose` from the provider, and the vacancy
      context carries `appliedAt`, which is the room's `createdAt`. The other popover fields
      were already there.
- [x] Pure list model in `src/components/Chat/model/` (`rooms.ts`, `time.ts`):
  - room summary: last event, preview, "You:" prefix, unread, timestamp;
  - tab filter: all / unread / closed;
  - sort by recency;
  - list time format and separator labels.
- [x] Unit tests in `tests/chat-list-model.test.ts`, green in three timezones. What is still
      open: the summary builder from a Matrix `Room` (last event, preview, "You:") and the
      label formatting move to stage 3, next to the row that renders them.

### 2. Panel shell
- [ ] `ChatPanel`: a `Popover` on desktop and a full-screen `Drawer` below `md`. It holds two
      views, list and conversation, and replaces `ChatModal`.
- [ ] `useChat` store: `view`, `selectedRoomId`, the tab and per-tab scroll position. Drop the
      dead `chatSession` and type `reset`.
- [ ] Every way in opens the panel on its conversation:
  - the `?chat=1&roomId=` deep link;
  - `/chat#/room/{id}`;
  - the `open-chat` event;
  - the toasts;
  - the domain "Open chat" buttons.
  
  Also fix the deep-link race: a room that is not synced yet gets selected once it arrives.
- [ ] Launcher badge uses `colorPrimary`, not red, and invites count.

### 3. Room list
- [ ] `ChatRoomRow` (frame `Jtbe5`):
  - avatar with the online dot only when online;
  - kind `Tag` and label;
  - preview;
  - meta column;
  - `IconDotsVertical` menu on hover.
- [ ] Row menu: Mark as read, Close chat… (closable kinds only, while open), Leave (direct
      chats only).
- [ ] `ChatRoomList`: tabs All / Unread [n] / Closed, incremental render, and the skeleton,
      loading-more, empty (×3) and error states.
- [ ] Stories for the row and the list states. Remove `ChatRooms`, `kind-groups` and
      `@ant-design/x` `Conversations` usage.

### 4. Conversation shell
- [ ] Header: back, avatar, name, `StatusDot`, close.
- [ ] `ChatContextLine`: one line plus a popover, with the per-kind slot registry
      (`kinds.ts`, spec §4) for advice and vacancy. Replaces `ChatTopic`.
- [ ] Invite view restyle (`ZMcrW`), the read-only banner, and the permission-denied,
      loading and error states.
- [ ] Stories for the context line: advice and vacancy × collapsed and open, plus closed.

### 5. Timeline
- [ ] Pure grouping: same sender, same day, less than 5 minutes apart. Unit tests.
- [ ] `MessageGroup`:
  - bubbles;
  - date separators;
  - "edited";
  - redacted messages shown as "Message deleted" instead of `{}`;
  - no typewriter animation.
- [ ] Delivery line with a working **Retry** for failed messages.
- [ ] History paging with the scroll anchor kept, and the "Loading earlier" state.
- [ ] Jump-to-latest with a new-message count.
- [ ] Read marking only when the timeline is at the bottom and the tab is visible.
- [ ] Stories for `MessageGroup`: own and other × each delivery status.

### 6. Composer
- [ ] Rework `ChatInput`:
  - borderless auto-growing textarea;
  - Enter sends, Shift+Enter adds a newline;
  - one draft per room;
  - the bogus "Cancel sending!" toast removed.
- [ ] Emoji picker (`frimousse`) in a `Popover`.
- [ ] Mode strip for reply and edit, with cancel.

### 7. Message actions
- [ ] `MessageActions`: the block takes its bubble colour on hover and while the menu is open,
      the trigger slot is reserved, and long-press opens the menu on touch screens.
- [ ] Reactions: aggregated through relations, chips, the strip, optimistic toggle,
      a tooltip listing who reacted.
- [ ] Reply: send `m.in_reply_to`, show the quote row with the corner arrow (vertically
      centred against the quote), and jump to the original with a flash.
- [ ] Edit (`m.replace`), Delete (redaction with a confirm) and Copy.
- [ ] Closed chat: the menu offers Copy only, and chips are read-only.
- [ ] Stories: `MessageActions` states, and reactions, reply and deleted in `MessageGroup`.

### 8. Finish
- [ ] Tolgee keys (spec §8) pushed through the i18n skill. Retire `chat.groups.*`.
- [ ] `docs/chat-system.md` updated for the panel and the tabs.
- [ ] Full gate green, and the design-tokens guard passing.
- [ ] Simplify pass, then a PR to `dev`, and GDHUB-62 moved to **In Review**.

## Progress log

- 2026-09-29: design approved; plan written. Stage 1 done: meta endpoint, room context,
  and the list model with tests. Also found `node_modules` drifted to gdhub-prisma beta.58
  against the pinned beta.53, and `bun install` + `db:generate` restored it.
