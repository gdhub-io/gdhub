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
3. The TLS / Matrix note and, for admins, `ChatPushStatus` sit in an info popover in the
   conversation header, left of close. Dmitry asked for this on 2026-09-30.
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
- [x] `ChatPanel` (`src/components/Chat/ChatPanel/`): a `Popover` on desktop and a
      full-screen `Drawer` below `md`. It holds two views, list and conversation, and
      replaces `ChatModal`, which is deleted.
  - The panel closes on an outside click (portals opened from the panel don't count), on
    Esc and on a route change.
  - Until stages 3 to 5 land, the views host the old `ChatRooms` / `ChatTopic` /
    `ChatMessages` / `ChatInput`.
- [x] `useChat` store: the view is derived from `selectedRoomId` (null means the list). The
      list stays mounted under a conversation, so back keeps its scroll. The dead
      `chatSession` / `reset` are gone. Tab state comes with stage 3.
- [x] Every way in opens the panel on its conversation:
  - the `?chat=1&roomId=` deep link;
  - `/chat#/room/{id}`;
  - the `open-chat` event;
  - the toasts;
  - the domain "Open chat" buttons.
  
  Also fix the deep-link race: a room that is not synced yet gets selected once it arrives.
  **Done:** `useChatDrawerQuery` selects the room right away, and the conversation view
  waits on `ClientEvent.Room`. The first-room auto-select in `ChatRooms` is removed.
- [x] The launcher badge uses `colorPrimary`, not red, and invites count as one each.
      `HeaderActions` lost its `onOpenChat` prop: the one caller always passed it.
- [x] Live check, 2026-09-30:
  - the panel opens under the launcher;
  - the list shows;
  - a row opens its conversation (context, timeline, and the composer hidden for a closed
    chat);
  - back returns to the list;
  - an outside click closes the panel.

### 3. Room list
- [x] `ChatRoomRow` (frame `Jtbe5`):
  - avatar, with the online dot only when online;
  - kind `Tag` and project label;
  - preview, with "You:" for own messages, italic for a deleted one, "Invitation" for an
    invite;
  - time over the unread count;
  - `IconDotsVertical` in place of the meta column on hover.
- [x] Row menu: Mark as read (unread only), Close chat… (open advice or vacancy), Leave
      (direct only). Closing goes through a confirm and the resolve endpoint.
- [x] `ChatRoomList`: tabs All / Unread [n] / Closed, 20 rows at a time via an
      `IntersectionObserver`. Each tab pane scrolls on its own.
  - States: skeleton, empty ×3 and error.
  - The spec's "loading more" spinner is not drawn: the rows are already synced, so the
    next page renders instantly.
- [x] `ConnectedChatRoomList` builds rows through `summarizeRoom` (`Chat/matrix.ts`) and
      rebuilds once per frame on Matrix events. The error state is `useChat.syncError`: the
      first sync failed, and retry calls `retryImmediately`.
- [x] Stories: `Chat/ChatRoomList` (all, unread, closed, closed empty, empty, unread empty,
      loading, error, long list) and `Chat/ChatRoomRow` (every row variant). Fixtures are in
      `Chat/fixtures/rooms.ts`.
- [x] `ChatRooms`, `services/chat/kind-groups.ts` and the `Conversations` list are removed.
- [x] The panel hangs from the whole header actions row, so its right edge meets the
      avatar's. The outside-click check keys on `[data-chat-launcher]`.
- Conversation stories (a chat, an empty chat, a skeleton) come with stages 4 and 5,
  which Dmitry asked for.

### 4. Conversation shell
- [x] `ChatConversation` (presentational):
  - header: back, avatar, name, `StatusDot` (Online / Invitation), info popover, close;
  - states: skeleton, error, unavailable and ready;
  - slots for the body (timeline or invite) and the footer (composer or read-only banner).
- [x] `ChatContextLine`: one line plus a popover. Slots come from the per-kind registry in
      `ChatContextLine/kinds.tsx` (advice, vacancy). Actions respect `canClose`, closed
      status and a pending invite (tested in `tests/chat-context-slot.test.ts`).
      Replaces `ChatTopic`.
- [x] `ChatInvite` (frame `ZMcrW`), `ReadOnlyBanner` and `EmptyConversation` (frame
      `u8M7E`) replace `special-messages/*`.
- [x] `ConnectedConversation` wires them to Matrix and `GET /api/chat/rooms/[id]`.
  - "Unavailable" means the client is synced and the user is not in the room.
  - The close confirm is shared with the list through `useCloseChat`.
  - `useChat` lost `chatContext` / `userMembership`; the conversation owns them now.
    `ChatTitle` is deleted.
- [x] Stories:
  - `Chat/ChatContextLine`: advice and vacancy × collapsed and open, closed;
  - `Chat/ChatConversation`: loading skeleton, empty chat, invite, closed, unavailable,
    error.
  - A populated chat story comes with the stage 5 timeline.
- [x] Checked live on a vacancy chat: header, context line, popover fields and actions.

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
- 2026-09-30: stage 2 done and checked live. Stage 3 done and checked live: the list, the
  tabs, and the panel edge aligned with the avatar. Stage 4 done and checked live.
