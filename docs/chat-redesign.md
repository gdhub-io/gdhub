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
- [x] Pure `buildTimeline` (`model/timeline.ts`) groups by same sender, same day and less
      than 5 minutes apart, and adds day separators. A notice breaks a group. Tested in
      `tests/chat-timeline-model.test.ts`, green in three timezones.
- [x] `MessageGroup` (hand-rolled, frames `YGPUq` / `X7HUy`):
  - the avatar, name and time appear once per group;
  - "edited";
  - "Message deleted" instead of `{}`;
  - no typewriter animation;
  - delivery line: Sending / Sent / Read / Not sent · **Retry** (`resendEvent`).
- [x] `ChatTimeline`:
  - day separators;
  - membership notices (joined / left / invited) — renames, topics and power levels are
    dropped;
  - older history on scroll with the scroll anchor kept;
  - a room with no messages in the first window fetches further back before showing the
    empty state;
  - jump-to-latest once more than a viewport up, with a count of new messages;
  - a `ResizeObserver` keeps it pinned to the bottom through late layout.
- [x] Read marking: only at the bottom, with the panel open and the tab visible.
  `markRoomRead` is a no-op once the latest event is read. **Without that it looped**: a
  receipt emits a local `Room.receipt`, which re-ran the effect and froze the app (fixed on
  2026-09-30 before commit).
- [x] "Read" is computed once per rebuild (the furthest event any other member has read),
      not with `getUsersReadUpTo` per message.
- [x] `ChatMessages` is deleted (with its guard allowlist entry and the old styles).
- [x] Stories:
  - `Chat/MessageGroup`: other, own × each status, edited and deleted;
  - `Chat/ChatTimeline`: conversation, long history, loading earlier, empty;
  - `Chat/ChatConversation/Chat`: a populated chat.
  - Not opened in the Storybook UI this session: only type-checked and linted.
- [x] Checked live: grouping, delivery lines, the bottom pin on open, history to the room's
      start, and no loop.

### 6. Composer
- [x] `ChatComposer` (presentational):
  - bordered box; the textarea draws no focus ring of its own;
  - auto-grows to 6 rows;
  - Enter sends; Shift+Enter or an IME composition inserts a newline; Esc leaves reply or
    edit mode;
  - Send is disabled while the text is empty;
  - Save replaces Send while editing.
- [x] Emoji picker: `frimousse` in an antd `Popover`, styled with our tokens. It inserts
      at the cursor and gives focus back.
  - Its emoji data loads from the Emojibase CDN (jsDelivr) on first open.
- [x] Mode strip for reply (`IconCornerDownRight`) and edit (`IconPencil`), with cancel.
      Drafts and modes are kept per room in `useChat`, so going back to the list keeps them.
- [x] `ConnectedComposer` sends without awaiting: the local echo shows "Sending…", and a
      failure stays in the timeline with Retry.
  - Reply sends `m.in_reply_to`; edit sends `m.replace`.
  - Saving an unchanged edit is a no-op.
  - The bogus "Cancel sending!" toast is gone together with `ChatInput`.
- [x] `@ant-design/x` removed from the dependencies and `transpilePackages` (nothing
      imports it any more).
- [x] Stories: `Chat/ChatComposer` — empty, with text, replying, editing.
- [x] Checked live: Shift+Enter, Enter, the local echo turning into "Sent", emoji insert.
- [x] The jump-to-latest button is centred and opaque (Dmitry's request).

### 7. Message actions
- [x] Menu per message: a 24px `IconDotsVertical` appears beside the bubble on hover or
      focus, on the chat background (spec revision 4). Its slot is always reserved, so
      nothing moves.
  - Click or right-click (a long press on Android) opens it.
  - The trigger stays visible on touch screens.
- [x] The menu is antd `Dropdown` with `popupRender`: a strip of 7 quick reactions above
      Reply / Copy / Edit / Delete. Edit and Delete appear on own messages only.
  - Delete asks to confirm (danger button), then redacts.
  - A closed chat shows **Copy only**, with no strip, and the chips are not togglable.
  - Esc closes only the topmost layer, so the panel survives closing a menu.
- [x] Reactions:
  - aggregated through `room.relations` annotations;
  - a toggle chip marks the viewer's own reaction;
  - a tooltip lists who reacted;
  - taking a reaction back redacts it;
  - a key with no live events is hidden (no "0" chips).
- [x] Reply:
  - the composer strip, then `m.in_reply_to`;
  - a quote row with a corner arrow above the text; other clients' fallback quote lines
    are stripped (`stripReplyFallback`, tested);
  - clicking the quote scrolls to the original and outlines it, paging back until it is
    loaded.
- [x] Edit fills the composer, saves with `m.replace` and shows "edited". Copy writes the
      clipboard and shows a toast.
- [x] Stories: `Chat/MessageGroup/ReplyAndReactions` and `ReadOnly`; the conversation
      fixture carries a reply and reactions.
- [x] Checked live:
  - react and un-react;
  - reply with its quote;
  - edit to "edited";
  - delete to "Message deleted";
  - the closed chat's Copy-only menu;
  - Esc with a menu open.
- Dmitry's review fixes on the way:
  - no hover fill;
  - a smaller trigger with no extra space;
  - the list row's hover swap no longer overlaps (antd's `transition: all` delayed
    `visibility`).
- A broken SCSS edit took every route down with a 500 for a few minutes.
  - **Compile changed `.scss` with `bunx sass` before reloading.** Neither `lint` nor
    `type-check` catches it.

### 8. Finish
- [ ] **Tolgee keys, pending.** tolgee.gdhub.io answered 502 on 2026-09-30, so `tolgee
      compare` / `sync` could not run. Every string renders from its inline English
      default meanwhile.
  - When the server is back, run
    `tolgee sync` **without** `--remove-unused`, then `bun run refresh-translations`.
  - After that, delete `chat.groups.*` and `chat.topic.openPositionPage` from the
    server; nothing reads them any more.
- [x] `docs/chat-system.md` describes the panel, the tabs and the connected/presentational
      split. The old stage 5 is marked superseded.
- [x] Simplify pass, 27 lines in and 59 out:
  - the conversation reads its `room` from the client instead of mirroring it in state
    next to a re-render counter;
  - the unreachable `error` state and `onRetry` are dropped from `ChatConversation`,
    because nothing ever passed them;
  - `stamp.ts` is folded into `time.ts`;
  - `GROUP_GAP_MS` is no longer exported;
  - a stale doc comment on `MessageGroup` (hover fill) is fixed.
- [x] Full gate green: lint, type-check, 674 tests.
- [ ] Push, PR to `dev`, GDHUB-62 → **In Review**.

## Progress log

- 2026-09-29: design approved; plan written. Stage 1 done: meta endpoint, room context,
  and the list model with tests. Also found `node_modules` drifted to gdhub-prisma beta.58
  against the pinned beta.53, and `bun install` + `db:generate` restored it.
- 2026-09-30: stage 2 done and checked live. Stage 3 done and checked live: the list, the
  tabs, and the panel edge aligned with the avatar. Stage 4 done and checked live.
  Stage 5 done and checked live. Stage 6 done and checked live.
  Stage 7 done and checked live.
