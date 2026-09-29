# Chat — redesign (GDHUB-62)

Design spec. Frames live in [`docs/design/platform-design.pen`](../platform-design.pen),
row **Chat · redesign** (note `VBrjt`, x −420 / y 62000, below the Checkpoints band).

Revision history — 1: first handoff. 2, after user review:
- The expand/larger mode was removed; it is in **§11 Deferred**.
- The row menu trigger is now `IconDotsVertical`.
- Unread counts are true circles on the pill radius.
- Timestamps moved to the tertiary text token.
- The context bar became one line that opens a per-kind popover.
- Message actions (reactions, reply, edit, copy, delete) moved **into** scope.

3, after user review:
- A hovered message takes its **own bubble colour** instead of a separate sunken layer.
- While hovered or while its menu is open, the message is drawn as **one tinted block**, with no
  bubble box inside it.
- Reply quotes and the composer's mode strip lost the accent left bar. A reply is now marked by
  an `IconCornerDownRight`, vertically centred to the left of the quote.

---

## 1. Problem & user

Anyone signed in to GDHub: a developer who asked an expert for advice, the expert answering, a
candidate talking to a studio about an open position, or two members in a direct chat. Today the
chat is a 720px right-hand drawer with a room list next to the conversation. The list shows no
preview, no time and no per-room unread count, so the user can't tell where the new message is
without opening each room. The user wants to check messages without leaving the page: open the
panel from the header, see which conversation moved, answer, react, reply or fix a typo, and go
back. They also need the context that makes our chats different from a messenger: which request
or offer a chat belongs to, the invite they have to accept, and the moment a chat is closed.

## 2. Frames

Desktop panels are 520 × 720. Mobile frames are 390 × 844.

| Frame | Node id | What it shows |
|---|---|---|
| `Chat · components` | **jI3qP** | Source components: `Chat / Icon button` **S9qItu**, `Chat / Row` **Jtbe5** (meta column `b0Q9O`, unread count `gS5rh`, row menu trigger `fGi6f`). |
| `Chat · Launcher (header icon states)` | **lfXrv** | Header chat button: no unread, `3`, `99+`, panel open. |
| `Chat · Panel · List · All (hover + row menu)` | **Ut6hz** | Populated list. One row is hovered with its menu open (`iEEKJ`). |
| `Chat · Panel · List · Unread` | **UyyF9** | Unread tab. |
| `Chat · Panel · List · Closed · empty` | **J4zJj** | Closed tab, empty. |
| `Chat · Panel · List · Loading (skeleton)` | **b1i1k** | First load. |
| `Chat · Panel · List · Loading more (infinite scroll)` | **d1YqV** | Next page loading under the loaded rows. |
| `Chat · Panel · List · All · empty (no chats yet)` | **B3iV0** | No conversations at all. |
| `Chat · Panel · List · Error` | **n5vQ2** | Matrix client failed to start or sync. |
| `Chat · Panel · Conversation · Advice (at bottom, delivery states)` | **YGPUq** | Grouped messages, date separators, read / sent / failed + retry, collapsed context line. |
| `Chat · Panel · Conversation · Scrolled up (history loading + jump to latest)` | **S9DaOJ** | Older history loading at the top; jump-to-latest with 3 new messages. |
| `Chat · Panel · Conversation · Vacancy offer (open, sending)` | **uRZrC** | Vacancy chat, own message in "Sending…". |
| `Chat · Panel · Conversation · Vacancy invite (accept / decline)` | **ZMcrW** | Invite replaces timeline and composer. |
| `Chat · Panel · Conversation · Closed (read-only)` | **B9jTEp** | "Closed" on the context line, read-only banner instead of the composer. |
| `Chat · Panel · Conversation · Empty (new direct chat, typing)` | **u8M7E** | No messages yet, no context line, send enabled. |
| `Chat · Panel · Conversation · Reactions, reply, edited, deleted + reply composer` | **X7HUy** | Reaction chips (own highlighted), reply quote (row `nFZLf`, quote `Axdts`), "edited" label, deleted placeholder, composer in reply mode (strip `GmaVT`). |
| `Chat · Panel · Conversation · Edit mode composer` | **hycZ7** | Composer in edit mode with prefilled text and **Save** (strip `GVMWL`); reply quote row `enJPm` / quote `c1jkt` inside bubble `IXCku`. |
| `Chat · Message actions · states` | **hPrUv** | Five cases: rest (bubble, no trigger), hover (the message becomes one block in its bubble colour, with the trigger), menu open on another's message (`I1QfM`), menu open on own message (`Ej5Iw`), closed chat with Copy only (`MOUx4`). |
| `Chat · Context line + popover · states` | **kWwIn** | Collapsed line (advice, vacancy), popover open (advice, vacancy), closed chat. |
| `Chat · Dialog · Close chat (Modal.confirm)` | **zYWmd** | Confirm for Close chat / Question resolved. |
| `Chat · Dialog · Delete message (Modal.confirm, danger)` | **v1IjjU** | Confirm for Delete. |
| `Chat · Mobile · List (full screen)` | **WDnfp** | < 768px list. |
| `Chat · Mobile · Conversation (full screen)` | **G1YeC** | < 768px conversation. |

Icons in the .pen are drawn with lucide glyphs (Pencil has no Tabler set). **Every icon node is
named `Tabler: Icon…`**, and that name is the component to import from `@tabler/icons-react`.
Emoji in the .pen render in the text font. In the app they are native emoji.

## 3. Layout

**Shell.** The panel replaces `ChatModal`'s right `Drawer`.
- **Desktop (≥ 768px, `Grid.useBreakpoint().md`).** A floating panel anchored under the header
  chat button: antd `Popover`, `placement="bottomRight"`, `arrow={false}`, `trigger="click"`,
  zero-padding body, 520 wide. Height is `min(720px, 100dvh − header − var(--gd-space-4))`.
- **Below 768px.** The same content in an antd `Drawer` (`placement="bottom"`, height `100dvh`,
  no drawer header).

**Two views, one panel.**
- List and conversation replace each other inside the panel.
- The back arrow (`IconArrowLeft`) returns to the list with the tab and scroll kept.
- The selected room lives in `useChat`.
- Deep link `?chat=1&roomId=<matrixRoomId>` opens the panel straight on that conversation, and
  back goes to All. A room the user can't see gives the permission-denied state.

**List view.**
1. Header, 64: "Messages" + close (`IconX`). Admins with `admin.users.manage` get an `IconPlus`
   icon button before close that opens the existing `NewChatModal` (not drawn).
2. Tabs **All · Unread [n] · Closed**:
   - All = joined or invited rooms that are not closed.
   - Unread = the subset with unread messages. The count is the number of **chats**.
   - Closed = rooms with `ChatRoom.status = Closed`.
3. Rows, newest activity first, no group headers.

**Row** (`Jtbe5`):
- Layout: avatar 40, then the body, then the meta column.
- Body line 1: name, plus for contextual rooms a kind `Tag` (`Advice` / `Offer`) and the
  space/project name as a secondary label. This is the hook for GDHUB-28's space filter.
- Body line 2: preview, one line, ellipsis, "You: " prefix for own messages.
- Meta column: time over the unread count, right-aligned, vertically centred.
- On hover or focus-within, the meta column is replaced by a centred 32px `IconDotsVertical`
  trigger. Row menu:
  - *Mark as read* (`IconMailOpened`);
  - *Close chat…* (`IconArchive`), only for closable kinds while open.
- The online dot shows on the avatar only when online. There is never a red offline dot.

**Conversation view.**
1. Header, 64: back, `AppAvatar` 32, name 16/600 over a `StatusDot` ("Online" / "Invitation"),
   close. There is no header menu.
2. **Context line**, special-room kinds only, one line 40 high.
   - Content: kind `Tag` + the start of the kind's summary, truncated with an ellipsis, + a
     chevron. Once the chat is closed, a neutral `StatusDot` "Closed" sits before the chevron.
   - The whole line is the trigger of an antd `Popover` (`placement="bottom"`, width = panel
     − 2 × `--gd-space-4`). The popover shows every field for that kind and the kind's actions.
   - **The line itself carries no action buttons.**
   - Direct chats have no context line.
   - This replaces `ChatTopic`. See §4 for the slot contract.
3. Timeline:
   - A group is consecutive messages from one sender, same day, less than 5 min apart.
   - Another person's group shows avatar 32 and a name + time head once, then its bubbles.
   - Own groups are right-aligned and have one delivery line under the last bubble.
   - Date separators sit between days.
4. Composer: bordered box with an optional mode strip (reply / edit), an auto-growing textarea
   and a tools row (emoji left, send / Save right).

**Reply quote** (`X7HUy`). Inside a replying message, above its text, sits one row
(`align-items: center`):
- a 14px `IconCornerDownRight` in `--gd-color-text-secondary`, **vertically centred** on the
  quote, which says "this message answers that one";
- then the quote: a plain compact block (quoted sender name + one-line truncated preview), with
  **no side bar**.

The composer's reply strip uses the same icon, also centred. The edit strip uses `IconPencil`,
and neither strip has a side bar.

**Message block (hover target) — `hPrUv`.**
- Each message is a full-width block (padding `--gd-space-2`, radius `--gd-radius-panel`).
- **Rest:** the block has no fill and the message shows as its normal bubble. No trigger.
- **Hover:**
  - The block fills with **the same colour as that message's bubble**:
    `--gd-neutral-100` for another person's message, `--gd-color-accent-subtle` for your own.
  - The bubble drops its own fill and radius, so bubble and hover read as one background with
    no second layer.
  - Nothing moves: the bubble's padding stays, only the fill changes owner.
  - A 32px `IconDotsVertical` trigger appears at the block's **top-right** (another person's
    message).
- **Own messages mirror this.** The trigger sits immediately **left of the text**, top-aligned,
  because right-aligned own text would sit under a top-right trigger.
- The trigger slot is always reserved (hidden at rest), so nothing shifts on hover.
- **Menu open:** the trigger stays visible in its active state (filled square) and the block keeps
  its hover fill.
- Under the trigger, right-aligned to it (left-aligned for own messages), are two separate cards:
  1. a **reaction strip** (7 quick reactions 👍 👎 ❤️ 🔥 😂 😮 😢);
  2. directly under it, the **menu**: Reply, Copy, Edit *(own)*, divider, Delete *(own, danger)*.
- In a closed chat the menu is **Copy** only, with no reaction strip.

**Mobile (< 768px).**
- Full screen, radius 0, no border or shadow.
- Header 56, inline padding `--gd-space-4`, bubble max-width 80%.
- Composer bottom padding adds `env(safe-area-inset-bottom)`.
- On `(hover: none)`, a long-press opens the row menu and the message menu. The pressed message
  takes the same bubble-coloured block, and the menu opens as the same strip + menu anchored to it.

## 4. Components

| Block | Build from | New / reuse |
|---|---|---|
| Panel shell | antd `Popover` (desktop) / `Drawer` (mobile) | New `src/components/Chat/ChatPanel/`, replaces `ChatModal`. |
| Header launcher | antd `Button` text circle + `Badge` | Reuse `src/components/ChatButton`; badge colour per §5. |
| Icon buttons | antd `Button type="text"` 32 + `Tooltip` | Reuse. |
| Tabs | antd `Tabs`; tab count antd `Badge` | Reuse. |
| Room list | antd `List`, incremental render | New `src/components/Chat/ChatRoomList/`, replaces `ChatRooms` (`@ant-design/x` `Conversations` goes). |
| Row | markup per frame `Jtbe5` | New `src/components/Chat/ChatRoomRow/`. |
| Avatar | `AppAvatar` (`src/components/ui`) via `MatrixAvatar` | Reuse. |
| Kind chip | antd `Tag` | Reuse. |
| Row / message menus | antd `Dropdown`. The message menu uses `popupRender` to stack the reaction strip card above the antd menu. | Reuse antd. |
| Skeleton | antd `Skeleton.Avatar` / `Skeleton.Input` | Reuse. |
| Empty / error | `EmptyState` (`src/components/ui`) | Reuse. |
| **Context line + popover** | antd `Popover`, `Tag`, `Typography.Text ellipsis`, `StatusDot` | New `src/components/Chat/ChatContextLine/`, replaces `ChatTopic`. See the slot contract below. |
| Message group, bubbles | `@ant-design/x` `Bubble` (already in tree), own group head | New `src/components/Chat/MessageGroup/`. |
| Message block + actions | trigger `Button type="text"` 32; `Dropdown` | New `src/components/Chat/MessageActions/`. It sets `data-state="hover|open"` on the block, and the bubble's fill moves to the block in those states. |
| Reaction chips | antd `Button` (toggle) or `Tag.CheckableTag` restyled to §5 | New, inside `MessageGroup`. |
| Reply quote | antd `Flex align="center"` with `IconCornerDownRight` + markup per `X7HUy` | Inside `MessageGroup`. |
| Date separator | antd `Divider plain` | Reuse. |
| Delivery status | Tabler icons + `Typography.Text` | Move `renderMessageStatus` from `ChatMessages` into `MessageGroup`. |
| Jump to latest | antd `Button shape="circle"` + `Badge`, absolute in the timeline (not `FloatButton`, which is viewport-fixed) | Inside `ChatTimeline`. |
| Composer + mode strip | antd `Input.TextArea variant="borderless" autoSize={{minRows:1,maxRows:6}}`; send `Button type="primary"` | Rework `ChatInput`. |
| Emoji picker | antd `Popover` hosting a picker | **Decision needed** (§10). |
| Invite | `AppAvatar` 56, `Typography`, two `Button`s | Restyle `VacancyChatInvite` / `DefaultInvite`. |
| Confirms | `App.useApp().modal.confirm` (`okButtonProps={{ danger: true }}` for Delete) | Reuse. |

Stories are required for `ChatRoomRow`, `ChatRoomList` (loading / more / empty / error),
`MessageGroup` (other / own × each delivery status, reactions, reply quote, edited, deleted),
`MessageActions` (rest / hover / open own / open other / closed) and `ChatContextLine`
(advice / vacancy × collapsed / open, closed).

### Context line — the per-kind slot contract

The layout never changes per kind; a kind plugs in data and actions. Register one renderer per
`ChatRoomKind` in `src/components/Chat/ChatContextLine/kinds.ts`:

```ts
type ChatContextSlot = {
	tag: string;                                  // translated chip label, "Advice" / "Offer"
	summary: string;                              // collapsed line text, truncated by CSS
	status: "open" | "closed";                    // closed → "Closed" dot on the line
	statusLabel?: string;                         // popover title status, e.g. "Resolved 18 Sep"
	title: string;                                // popover title, "Advice request"
	fields: { label: string; value: ReactNode }[]; // rendered as label-over-value rows
	actions: ReactNode[];                         // popover footer, right-aligned; empty → no footer
};
type ChatContextKind = (ctx: RoomContext, t: TFunction) => ChatContextSlot | null;
```

- **Advice request.** Summary is `Topic: {topic} · {project}`.
  - Fields: Topic, Project, Comment (multi-line).
  - Actions: **Question resolved** (`Button type="primary" size="small"`, `IconCircleCheck`),
    only while open.
- **Vacancy offer.** Summary is `{position} · {project}`.
  - Fields: Position (link to `/job/[id]`), Project, Applied.
  - Actions: **Open position page** (default, `IconExternalLink`, new tab), always.
    **Close chat** (default, `IconArchive`), only while open.
- **Invite pending.** Only non-mutating actions appear.
- A kind returning `null` renders no line (direct chats).

## 5. Tokens

The panel, tabs and launcher:

| Element | Token |
|---|---|
| Panel | `--gd-color-surface`, 1px `--gd-color-border`, `--gd-radius-panel`, `--gd-shadow-e3` |
| Header | 64 (mobile 56); padding `0 var(--gd-space-3) 0 var(--gd-space-6)`; title `--gd-font-size-h3` 600 |
| Hairlines | 1px `--gd-color-border` |
| Icon buttons | 32, `--gd-radius-control`, icon 20 `--gd-color-text-secondary`, hover `--gd-fill-base` |
| Tabs | antd theme; inline padding `--gd-space-6`, gutter `--gd-space-8` |
| Tab count | `--gd-neutral-100` / `--gd-color-text-secondary` 12/600, radius `--gd-radius-pill` |
| Launcher badge | `color={token.colorPrimary}` (`--gd-color-action`), `size="small"`, `overflowCount={99}` |
| Launcher open state | `--gd-fill-strong` |

The list row:

| Element | Token |
|---|---|
| Row | padding `var(--gd-space-3) var(--gd-space-4)`, separator `--gd-color-border-subtle`, hover `--gd-fill-base` |
| Avatar / online dot | 40 / 12 dot `--gd-success-solid` with 2px `--gd-color-surface` ring; both `corner-shape: round` |
| Name | 14, 500 / 600 unread |
| Space label | 12 `--gd-color-text-secondary` |
| Preview | 13 `--gd-color-text-secondary`; unread `--gd-color-text` |
| **Timestamps** (row time, message group time, delivery time, "edited", date separator label) | **`--gd-color-text-tertiary`**, 12 (see note) |
| Unread row time | stays `--gd-color-text` 600: it is the signal, not metadata |
| **Unread count** | antd `Badge`, ≥ 20 × 20 (circle for one digit), **radius `--gd-radius-pill`** + `corner-shape: round`, `--gd-color-action` / `--gd-color-on-action` 12/600. **Not red.** |

The conversation:

| Element | Token |
|---|---|
| Context line | height 40, padding `0 var(--gd-space-4) 0 var(--gd-space-6)`, summary 13 `--gd-color-text-secondary`, chevron 16; open/hover fill `--gd-fill-base` |
| Context popover | antd `Popover` theme (`--gd-color-surface`, radius `--gd-radius-card`, `--gd-shadow-e2`); body padding `--gd-space-4`, gap `--gd-space-3`; field label 12 `--gd-color-text-secondary`, value 14 `--gd-color-text`; footer hairline `--gd-color-border`, padding `var(--gd-space-3) var(--gd-space-4)`, buttons 32 |
| Timeline | padding `var(--gd-space-3) var(--gd-space-6) var(--gd-space-4)`; `--gd-space-4` between groups, `--gd-space-1` between bubbles |
| Bubble | padding `var(--gd-space-2) var(--gd-space-3)`, `--gd-radius-card`, 14 / `--gd-line-height-body`; others `--gd-neutral-100`, own `--gd-color-accent-subtle`; max-width 320 / 80% |
| **Message block, rest** | no fill; padding `--gd-space-2`, radius `--gd-radius-panel` |
| **Message block, hover / menu open: another person's message** | fill **`--gd-neutral-100`** (the bubble's token); the bubble's own fill becomes transparent |
| **Message block, hover / menu open: own message** | fill **`--gd-color-accent-subtle`** (the bubble's token); the bubble's own fill becomes transparent |
| Message trigger | 32, `--gd-radius-control`, `IconDotsVertical` 20 `--gd-color-text-secondary`; active: `--gd-fill-strong` fill (a tint, so it reads a step darker on either block colour), icon `--gd-color-text` |
| Reaction strip | card `--gd-color-surface`, 1px `--gd-color-border`, `--gd-radius-card`, `--gd-shadow-e2`, padding `--gd-space-1`; 7 buttons 32, `--gd-radius-control`, hover `--gd-fill-base`, emoji 18 |
| Message menu | antd `Dropdown` theme; items 32; Delete `danger` (`--gd-danger-solid`) |
| Reaction chips | height 24, padding `0 var(--gd-space-2)`, **radius `--gd-radius-pill`** + `corner-shape: round`, 1px `--gd-color-border`, `--gd-color-surface`, count 12/600 `--gd-color-text-secondary` |
| Reaction chips: own reaction | `--gd-color-accent-subtle` fill + 1px `--gd-color-accent` border, count `--gd-color-text`. These are toggle controls, not `Tag` chips, so the no-pill chip rule doesn't apply. |
| **Reply quote row** | gap `--gd-space-1`, `align-items: center`; `IconCornerDownRight` **14**, `--gd-color-text-secondary` |
| **Reply quote block** | `--gd-color-surface` fill, radius `--gd-radius-chip`, padding `var(--gd-space-1) var(--gd-space-2)`, **no border or side bar**; name 12/600 `--gd-color-text`, preview 13 `--gd-color-text-secondary`, one line with ellipsis |
| **Composer mode strip** | `--gd-fill-base` fill, radius `--gd-radius-chip`, `align-items: center`, **no border or side bar**; icon 14 `--gd-color-text-secondary` (`IconCornerDownRight` for reply, `IconPencil` for edit); lead 13/600, preview 13 secondary; cancel `IconX` in a 32 button |
| Deleted message | transparent bubble, 1px `--gd-color-border`, italic 14 `--gd-color-text-tertiary` |
| Date separator | hairlines `--gd-color-border`, label 12/500 `--gd-color-text-tertiary`, **no chip fill** |
| Delivery line | status word `--gd-color-text-secondary`, icon 14; failed `--gd-danger-solid` + "Retry" `--gd-color-link` |
| Jump to latest | 40 circle, `--gd-color-surface`, `--gd-color-border-strong`, `--gd-shadow-e2`; badge like the unread count |
| Composer | box 1px `--gd-color-border-strong`, `--gd-radius-control`; focus-within `--gd-color-accent` + ring; placeholder `--gd-color-text-tertiary`; Save / Send `Button type="primary"` 32 |
| Read-only banner | padding `var(--gd-space-4) var(--gd-space-6)`, top hairline, `IconLock` 16 + 13 secondary |

**Note on timestamps.** The DS has no text step between `text-secondary` (neutral-500) and
`text-tertiary` (neutral-400). Tertiary measures **≈ 2.8 : 1 on white**, below the 4.5 : 1 AA
minimum, and `roles.ts` documents it as "placeholders and disabled text only". Applied as asked
because timestamps are secondary metadata. Two mitigations are already in:
- The date separator lost its grey chip, which would have put the label at ≈ 2.3 : 1.
- The unread time stays ink.

If AA for timestamps is required, the fix is a new role (e.g. `textMuted` at a neutral-450 that
clears 4.5 : 1). That is a DS change, not a per-screen value.

**No new colour tokens.** One .pen variable was added, `radius-pill` = 9999, mirroring the shipped
`--gd-radius-pill`. The document's older `radius-*` variables still hold the pre-superellipse
ladder, so chat frames use the shipped values 8/14/16/20 as numbers.

## 6. States

| State | What the user sees | Frame |
|---|---|---|
| List loading | 9 skeleton rows, tab counts hidden | `b1i1k` |
| List loading more | Rows stay; `Spin` + "Loading more…" | `d1YqV` |
| All empty | `EmptyState` "No conversations yet" + "Find an expert" | `B3iV0` |
| Unread empty | `EmptyState` (`IconChecks`) "You're all caught up" (layout as `J4zJj`) | — |
| Closed empty | `EmptyState` (`IconArchive`) "No closed chats" | `J4zJj` |
| List error | `EmptyState` (`IconPlugConnectedX`) + "Try again" | `n5vQ2` |
| Conversation loading | Header + context line real; centred `Spin` | — |
| Conversation error | `EmptyState compact` "Couldn't load messages" + "Try again" | — |
| Empty conversation | `EmptyState compact` "Say hello to {name}" | `u8M7E` |
| Invite pending | Invite block; context popover without mutating actions | `ZMcrW` |
| Closed / read-only | "Closed" on the context line; popover without close action; banner instead of composer; message menu = Copy only | `B9jTEp`, `kWwIn` case 5, `hPrUv` case 5 |
| Delivery | Sending… / Sent / Read / Not sent · Retry | `uRZrC`, `YGPUq` |
| Message hover / menu open | One block in the bubble's colour + trigger; see §3 | `hPrUv` |
| Reply mode / edit mode | Mode strip in the composer; edit shows **Save** | `X7HUy`, `hycZ7` |
| Edited / deleted message | "· edited" after the time / italic "Message deleted" | `X7HUy` |
| Reply to a deleted message | The quote preview reads "Message deleted" in italic tertiary | — |
| Action failed (react/edit/delete) | `message.error` toast; optimistic change rolled back | — |
| Permission denied | `EmptyState compact` (`IconLock`) "This chat isn't available" + "Back to messages" | — |

## 7. Interactions

**Panel and list**
- **Open / close.** The launcher toggles the panel; Esc, outside click and route change close it.
  Crisp is hidden while it is open. Composer drafts (and a pending reply/edit) are kept per room.
- **List infinite scroll.** Render 20 rows, and append 20 more when the sentinel comes within
  200px of the bottom. Closed pages the same way over the server's closed list. Loaded rows stay
  on screen while the next page loads, and each tab keeps its own scroll position.
- **Ordering.** By last event timestamp, descending.
- **Time format (list).** Today `HH:mm` · "Yesterday" · weekday within 6 days · `D MMM` ·
  `DD.MM.YYYY` for other years.
- **Separators.** Today / Yesterday / weekday / `D MMM` / `D MMM YYYY`.

**Timeline**
- **History.** When the user scrolls within 120px of the top, `scrollback` 30 events, keeping
  the first visible message anchored.
- **Auto-scroll.** Only if the user was within 48px of the bottom. Sending always scrolls.
- **Jump to latest.** Shown when more than one viewport above the bottom. The badge counts
  arrivals since the user left the bottom. Click smooth-scrolls to the bottom.
- **Read marking.** Send the read receipt / marker for the latest event only while all three
  hold:
  - the conversation is open;
  - the timeline is within 48px of the bottom;
  - `document.visibilityState === "visible"`.
  
  Re-check on scroll-end, new events and `visibilitychange`. The row menu's *Mark as read* sets
  the marker without opening the room.

**Context line**
- Click or Enter opens the popover and flips the chevron up. Esc or an outside click closes it.
- *Close chat* / *Question resolved* → confirm `zYWmd` → existing resolve endpoint. On success
  the line shows "Closed", the composer becomes the banner, the room moves to Closed, and a
  toast says "Chat closed".

**Message actions**
- **Trigger visibility.**
  - The trigger appears on pointer hover and on keyboard focus-within (Tab reaches it), and is
    hidden at rest.
  - While hovered, the block takes its bubble's colour.
  - While the menu is open, the block keeps that colour and the trigger stays in its active
    state until the menu closes.
- **Reactions.**
  - A strip emoji toggles the user's reaction and closes the menu.
  - Clicking a chip toggles the user's reaction on that emoji.
  - Chip order is first-reacted. A tooltip on a chip lists who reacted.
  - All reaction changes are optimistic.
- **Reply.** Puts the composer in reply mode (strip with `IconCornerDownRight`, "Replying to
  {name}: {preview}", X cancels) and focuses the textarea. The sent message shows the corner
  arrow + quote row above its text. Clicking the quote scrolls to the original and flashes its
  block (in its bubble colour) for about 1s. If the original isn't loaded, paginate back until
  it is.
- **Copy.** Copies the plain body; toast "Copied".
- **Edit** (own only).
  - Composer mode strip "Editing message", textarea prefilled, the send button becomes **Save**.
  - Esc or X cancels.
  - Saving an unchanged text is a no-op.
  - The message then shows "· edited" after its time.
- **Delete** (own only). Confirm `v1IjjU` → redaction → the bubble becomes "Message deleted".
  Reactions on it disappear.
- **Closed chat.** Menu = Copy only. There is no reaction strip, and chips are read-only.

**Composer and invite**
- **Composer.** Enter sends or saves, Shift+Enter inserts a newline, up to 6 rows. Send is
  disabled when the text is empty after trim.
- **Invite.** Accept joins the room. Decline rejects the invite and returns to the list.

### Matrix mapping

| Action | Matrix |
|---|---|
| React | `sendEvent(roomId, "m.reaction", { "m.relates_to": { rel_type: "m.annotation", event_id, key: "👍" } })` |
| Un-react | `redactEvent(roomId, reactionEventId)` |
| Read reactions | Aggregate via `room.relations` / `getRelationsForEvent(eventId, "m.annotation", "m.reaction")` |
| Reply | `m.room.message` with `"m.relates_to": { "m.in_reply_to": { event_id } }`; the quote block comes from the local event (fall back to `fetchRoomEvent`), not from the fallback body |
| Edit | `m.room.message` with `"m.new_content": {...}` and `"m.relates_to": { rel_type: "m.replace", event_id }`; render `event.replacingEvent()` content, "edited" when `event.replacingEventId()` is set; only the sender can edit |
| Delete | `redactEvent(roomId, eventId)`; a redacted event (`isRedacted()`) renders as "Message deleted" |
| Copy | Client clipboard. No Matrix call. |
| Read marker | `setRoomReadMarkers` / `sendReadReceipt` on the latest event |

The room's power levels must let members send `m.reaction` and redact their own events (Matrix
defaults do). Rooms created by our backend should be checked once.

## 8. Copy — Tolgee keys

`chat.groups.*` and `chat.topic.openPositionPage` are retired.

| Key | English default |
|---|---|
| `chat.panel.title` | Messages |
| `chat.panel.close` | Close |
| `chat.panel.back` | Back to messages |
| `chat.panel.newChat` | New chat |
| `chat.tabs.all` | All |
| `chat.tabs.unread` | Unread |
| `chat.tabs.closed` | Closed |
| `chat.kind.advice` | Advice |
| `chat.kind.offer` | Offer |
| `chat.row.you` | You: {text} |
| `chat.row.yesterday` | Yesterday |
| `chat.row.menu` | More actions |
| `chat.row.markRead` | Mark as read |
| `chat.row.close` | Close chat… |
| `chat.list.loadingMore` | Loading more… |
| `chat.empty.all.title` | No conversations yet |
| `chat.empty.all.description` | Chats with experts and project teams appear here once one of you writes. |
| `chat.empty.all.action` | Find an expert |
| `chat.empty.unread.title` | You're all caught up |
| `chat.empty.unread.description` | Chats with new messages show up here. |
| `chat.empty.closed.title` | No closed chats |
| `chat.empty.closed.description` | Resolved questions and closed offers land here. They stay readable. |
| `chat.error.title` | Chat is unreachable |
| `chat.error.description` | We couldn't connect to the message server. |
| `chat.error.retry` | Try again |
| `chat.presence.online` | Online |
| `chat.presence.invitation` | Invitation |
| `chat.context.closed` | Closed |
| `chat.context.open` | Open |
| `chat.context.advice.title` | Advice request |
| `chat.context.advice.summary` | Topic: {topic} · {project} |
| `chat.context.advice.topic` | Topic |
| `chat.context.advice.project` | Project |
| `chat.context.advice.comment` | Comment |
| `chat.context.advice.resolve` | Question resolved |
| `chat.context.advice.resolvedOn` | Resolved {date} |
| `chat.context.vacancy.title` | Vacancy offer |
| `chat.context.vacancy.position` | Position |
| `chat.context.vacancy.project` | Project |
| `chat.context.vacancy.applied` | Applied |
| `chat.context.vacancy.openPosition` | Open position page |
| `chat.context.vacancy.close` | Close chat |
| `chat.closeConfirm.title` | Close this chat? |
| `chat.closeConfirm.content` | You'll both still be able to read it, but nobody can send new messages. It moves to Closed. |
| `chat.closeConfirm.ok` | Close chat |
| `chat.closeConfirm.cancel` | Cancel |
| `chat.closeConfirm.success` | Chat closed |
| `chat.closeConfirm.error` | Couldn't close the chat |
| `chat.timeline.loadingEarlier` | Loading earlier messages… |
| `chat.timeline.today` | Today |
| `chat.timeline.yesterday` | Yesterday |
| `chat.timeline.jumpToLatest` | Jump to latest |
| `chat.timeline.error.title` | Couldn't load messages |
| `chat.status.sending` | Sending… |
| `chat.status.sent` | Sent |
| `chat.status.read` | Read |
| `chat.status.failed` | Not sent |
| `chat.status.retry` | Retry |
| `chat.message.menu` | Message actions |
| `chat.message.reply` | Reply |
| `chat.message.replyTo` | Reply to {name} |
| `chat.message.copy` | Copy |
| `chat.message.copied` | Copied |
| `chat.message.edit` | Edit |
| `chat.message.delete` | Delete |
| `chat.message.edited` | edited |
| `chat.message.deleted` | Message deleted |
| `chat.message.react` | React with {emoji} |
| `chat.message.reactedBy` | {names} reacted with {emoji} |
| `chat.message.actionFailed` | Couldn't update the message |
| `chat.deleteConfirm.title` | Delete this message? |
| `chat.deleteConfirm.content` | It will be removed for everyone in the chat. This can't be undone. |
| `chat.deleteConfirm.ok` | Delete |
| `chat.composer.placeholder` | Write a message… |
| `chat.composer.emoji` | Emoji |
| `chat.composer.send` | Send |
| `chat.composer.save` | Save |
| `chat.composer.replyingTo` | Replying to {name}: |
| `chat.composer.editing` | Editing message |
| `chat.composer.cancel` | Cancel |
| `chat.readOnly.banner` | This chat is closed. You can read it, but not reply. |
| `chat.invite.title` | {name} invited you to talk about the {position} offer |
| `chat.invite.titleDirect` | {name} invited you to a chat |
| `chat.invite.description` | Accept to read the message and reply. |
| `chat.invite.accept` | Accept |
| `chat.invite.decline` | Decline |
| `chat.emptyRoom.title` | Say hello to {name} |
| `chat.emptyRoom.description` | Only the two of you can see this conversation. |
| `chat.unavailable.title` | This chat isn't available |
| `chat.unavailable.description` | It may have been closed, or you're no longer a member. |

`chat.message.replyTo` is the accessible label on the quote row (the corner arrow is decorative).

## 9. Data needs (domain level — for the API agent)

- **Room list.** Most per-room data comes from the Matrix client:
  - name, avatar, presence;
  - last message: sender, plain body, timestamp, own or not;
  - notification count.
  
  From the app, per room: kind, `ChatRoom.status`, and the context label (project/space name).
  `/api/chat/rooms/kinds` returns only the kind today. It should also return status and the
  label, batched by Matrix room id.
- **Closed tab.** Closed rooms for the current user, paginated (~20, cursor or page), newest
  activity first. The server is the source of truth for "closed".
- **Unread tab count.** Rooms with notification count > 0, excluding closed. The header badge
  keeps the total message count (`unreadTotal`).
- **Context popover.** Existing `GET /api/chat/rooms/{id}` (`type` + `data`) must supply every
  field in §4, plus `status` and the date it closed:
  - advice: topic, project name, comment;
  - vacancy: vacancy id + title, project name, application date.
- **Close / resolve.** Existing `PUT /api/chat/rooms/{id}/resolve`, returning the new status
  and close date.
- **Message actions, read markers.** Matrix only (see the mapping). No app endpoints.

## 10. Open questions and assumptions

1. **Tab name "Closed" vs "Archived".** The design matches the action (*Close chat*). Confirm.
2. **"Leave" is removed** from the row menu, so direct chats can't be left. Intended?
3. **The info popover** (TLS / Matrix note, `ChatPushStatus` for admins) is dropped from the
   header. Confirm where push status goes.
4. **Who may close** an advice/vacancy chat: assumed both participants.
5. **Emoji picker** for the composer. It needs a dependency (e.g. `frimousse`) or a curated
   `Popover` grid. The quick-reaction strip is fixed to the 7 emoji and needs none.
6. **Timestamp contrast.** Tertiary is below AA (§5 note). Keep it, or add a muted role?
7. **Own-message trigger placement** mirrors to the left of the text. Confirm.
8. **Edit / delete time limit.** None assumed. Matrix allows editing and deleting at any time.
9. **"Find an expert"** links to the experts catalogue.

## 11. Deferred

| Item | What it needs |
|---|---|
| **Expanded / larger panel mode.** Drawn as the header `IconArrowsDiagonal` button (node `YWe34` in `Ut6hz`) and removed on review ("not needed for now"). Intended as a ~960-wide two-pane layout. | UI only: a size toggle on `ChatPanel`. No Matrix work. |
| Attachments folder / room media | Matrix: page `m.image`/`m.file` events per room (`/messages` with a `msgtype` filter), authenticated media download (the `MatrixAvatar` path), thumbnails. |
| File and image sending | Matrix: `uploadContent` to the media repo (limits, scanning), send `m.file`/`m.image` with `info`; progress, cancel and retry UI. |
| Voice messages | `MediaRecorder`, `m.audio` with the MSC3245 voice flag, waveform and playback UI. |
| Typing indicator | `sendTyping` with timeout and the `RoomMember.typing` listener; one caption line above the composer. |
| Space filter / grouping (GDHUB-28) | A space id per room from the app, and a filter above the list. Rows already carry the label. |
| Full emoji picker for reactions ("+" in the strip) | Same dependency decision as §10.5. |
