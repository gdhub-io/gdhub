# Chat — redesign (GDHUB-62)

Design spec. Frames live in [`docs/design/platform-design.pen`](../platform-design.pen),
row **Chat · redesign** (note `VBrjt`, x −420 / y 62000, below the Checkpoints band).

## Revision history

**1.** First handoff.

**2**, after user review:
- The expand/larger mode was removed; it is in **§11 Deferred**.
- The row menu trigger is now `IconDotsVertical`.
- Unread counts are true circles on the pill radius.
- Timestamps moved to the tertiary text token.
- The context bar became one line that opens a per-kind popover.
- Message actions (reactions, reply, edit, copy, delete) moved **into** scope.

**3–4**, after user review:
- A hovered message takes its own bubble colour and is drawn as one block.
- Reply quotes lost the accent bar and gained a centred `IconCornerDownRight`.

**5.** The context line's floating popover is replaced by an **inline disclosure**:
- The line stays; its chevron flips.
- A section attached under it drops down **over** the upper part of the timeline.
- Line and section are **one surface**, with no hairline, shadow or fill change between them.
- The block has a single bottom-edge shadow against the messages.
- Only the line reacts to hover.
- Fields are plain values; actions are text-only buttons (no icons).

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
| `Chat · Panel · Conversation · Vacancy offer (context expanded, sending)` | **uRZrC** | Vacancy chat with the context disclosure **expanded in context**: line `V5s5Ug`, section `tJet8`. Own message in "Sending…". |
| `Chat · Panel · Conversation · Vacancy invite (accept / decline)` | **ZMcrW** | Invite replaces timeline and composer. |
| `Chat · Panel · Conversation · Closed (read-only)` | **B9jTEp** | "Closed" on the context line, read-only banner instead of the composer. |
| `Chat · Panel · Conversation · Empty (new direct chat, typing)` | **u8M7E** | No messages yet, no context line, send enabled. |
| `Chat · Panel · Conversation · Reactions, reply, edited, deleted + reply composer` | **X7HUy** | Reaction chips, reply quote (row `nFZLf`), "edited", deleted placeholder, reply mode (strip `GmaVT`). |
| `Chat · Panel · Conversation · Edit mode composer` | **hycZ7** | Edit mode with **Save** (strip `GVMWL`); reply quote row `enJPm`. |
| `Chat · Message actions · states` | **hPrUv** | Rest / hover / menu open on another's message (`I1QfM`) / on own (`Ej5Iw`) / closed chat, Copy only (`MOUx4`). |
| `Chat · Context line — inline disclosure · states` | **kWwIn** | Six cases, each with the timeline running under the section (see below). |
| `Chat · Dialog · Close chat (Modal.confirm)` | **zYWmd** | Confirm for Close chat / Question resolved. |
| `Chat · Dialog · Delete message (Modal.confirm, danger)` | **v1IjjU** | Confirm for Delete. |
| `Chat · Mobile · List (full screen)` | **WDnfp** | < 768px list. |
| `Chat · Mobile · Conversation (full screen, context expanded)` | **G1YeC** | < 768px conversation with the advice disclosure expanded: line `LosGA`, section `EQXeD`, comment capped and scrolling. |

The six cases on `kWwIn`:

| Case | Node id | Line / section |
|---|---|---|
| 1 · Advice — collapsed | `o98fS` | line `nKBCG` |
| 2 · Advice — expanded, capped, comment scrolls | `ZmQDw` | line `rgDYE`, section `j0nQWy` |
| 3 · Vacancy — collapsed | `U04gU4` | line `DWGpS` |
| 4 · Vacancy — expanded | `IqO9O` | line `agiP0`, section `KI5qT` |
| 5 · Closed — collapsed | `jSjOz` | line `GgJhG` |
| 6 · Closed — expanded, no close action | `o3JqB` | line `nvfUb`, section `KK9bQ` |

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
2. **Context disclosure**, special-room kinds only (§3.1).
3. Timeline:
   - A group is consecutive messages from one sender, same day, less than 5 min apart.
   - Another person's group shows avatar 32 and a name + time head once, then its bubbles.
   - Own groups are right-aligned and have one delivery line under the last bubble.
   - Date separators sit between days.
4. Composer: bordered box with an optional mode strip (reply / edit), an auto-growing textarea
   and a tools row (emoji left, send / Save right).

### 3.1 Context disclosure (`kWwIn`, `uRZrC`, `G1YeC`)

**Collapsed (the summary line).**
- One line, 40 high, full panel width, directly under the header, on `--gd-color-surface`.
- A bottom hairline separates it from the timeline.
- Content: kind `Tag` + the start of the kind's summary (ellipsis) + a `StatusDot` "Closed" when
  closed + `IconChevronDown` at the right.
- The whole line is the toggle. Direct chats have no line.

**Expanded.**
- The line stays in place as the block's header, and the chevron rotates 180°.
- Directly under it a section **drops down over the timeline**, full panel width, attached to
  the line with no gap and no radius.
- **Line and section are one surface.** Both sit on `--gd-color-surface`. While expanded, the
  line drops its bottom hairline, and nothing separates line from section: no border, no shadow,
  no fill change.
- **One shadow, at the bottom edge of the whole block** (line + section), against the messages
  underneath, plus a bottom hairline. There is no shadow on the top or the sides.
- The section is an **overlay**. The timeline keeps its size and its scroll position, and the
  messages under the section stay where they were, hidden by it. Nothing jumps when the block
  opens or closes.
- Section content:
  1. **Fields**, label over value, compact.
     - Short fields (Project, Applied, Status) share one row in 2–3 equal columns.
     - Long fields (Topic, Position, Comment) take the full width.
     - Values are **plain text**: the position name is not a link.
     - Status is a `StatusDot` inside the fields ("Open" success / "Resolved {date}" neutral).
  2. **Actions** in one row at the bottom, **text-only buttons** (no icons), small (32).
     *Open position page* opens `/job/[id]` in a new tab. The close action is absent once the
     chat is closed; with no actions, the row is omitted.
- **Height cap:** the section is at most **50% of the panel height** (360 on a 720 panel; about
  half the viewport on mobile). Past that, the **fields area scrolls internally**, usually on a
  long comment. The action row stays pinned at the bottom of the section.
- **Collapses on:** click on the line / chevron, `Esc`, or a click outside the block, including
  on the timeline. Room change and back navigation also collapse it. The open state is not
  remembered per room.

**Hover belongs to the line only.**
- Hovering the summary line, collapsed or expanded, gives the **line** the hover fill
  `--gd-fill-base`.
- The expanded section never takes a hover fill: its fields and buttons have their own control
  states, and the section surface stays `--gd-color-surface`.
- At rest while expanded, line and section share the one surface. The hover fill on the line is
  the only moment the two differ, and it signals "this row toggles".

**Reply quote** (`X7HUy`). Inside a replying message, above its text, sits one row
(`align-items: center`):
- a 14px `IconCornerDownRight` in `--gd-color-text-secondary`, centred on the quote;
- then the quote: a plain compact block (quoted name + one-line preview), with no side bar.

The composer's reply strip uses the same icon. The edit strip uses `IconPencil`.

**Message block (hover target) — `hPrUv`.**
- Each message is a full-width block (padding `--gd-space-2`, radius `--gd-radius-panel`).
- **Rest:** the block has no fill and the message shows as its normal bubble. No trigger.
- **Hover:**
  - The block fills with the bubble's own colour (`--gd-neutral-100` for others,
    `--gd-color-accent-subtle` for own), and the bubble's fill moves to the block.
  - A 32px `IconDotsVertical` trigger appears at the top-right: left of the text for own messages.
- The trigger slot is always reserved, so nothing shifts.
- **Menu open:** the trigger is active (filled square) and the block keeps its fill. Under the
  trigger are two separate cards: a **reaction strip** (👍 👎 ❤️ 🔥 😂 😮 😢) and the **menu**
  (Reply, Copy, Edit *(own)*, divider, Delete *(own, danger)*).
- In a closed chat the menu is **Copy** only, with no reaction strip.

**Mobile (< 768px).**
- Full screen, radius 0, no border or shadow.
- Header 56, inline padding `--gd-space-4`, bubble max-width 80%.
- Composer bottom padding adds `env(safe-area-inset-bottom)`.
- Long-press opens the row and message menus.
- The context disclosure behaves exactly as on desktop, with inline padding `--gd-space-4`, a
  cap of 50% of the visible panel, and no hover fill (`hover: none`), only a pressed state.

## 4. Components

| Block | Build from | New / reuse |
|---|---|---|
| Panel shell | antd `Popover` (desktop) / `Drawer` (mobile) | New `src/components/Chat/ChatPanel/`, replaces `ChatModal`. |
| Header launcher | antd `Button` text circle + `Badge` | Reuse `src/components/ChatButton`; badge colour per §5. |
| Icon buttons | antd `Button type="text"` 32 + `Tooltip` | Reuse. |
| Tabs | antd `Tabs`; tab count antd `Badge` | Reuse. |
| Room list | antd `List`, incremental render | New `src/components/Chat/ChatRoomList/`, replaces `ChatRooms`. |
| Row | markup per frame `Jtbe5` | New `src/components/Chat/ChatRoomRow/`. |
| Avatar | `AppAvatar` (`src/components/ui`) via `MatrixAvatar` | Reuse. |
| Kind chip | antd `Tag` | Reuse. |
| Row / message menus | antd `Dropdown`; the message menu uses `popupRender` to stack the reaction strip above the menu | Reuse antd. |
| Skeleton | antd `Skeleton.Avatar` / `Skeleton.Input` | Reuse. |
| Empty / error | `EmptyState` (`src/components/ui`) | Reuse. |
| **Context disclosure** | Summary: a `<button aria-expanded aria-controls>`. Section: an absolutely positioned sibling in the conversation view (`position: absolute; inset-inline: 0; top: <line bottom>`), above the timeline in z-order. Both inside one wrapper with `data-open`. antd `Tag`, `Typography.Text ellipsis`, `StatusDot`, `Button size="small"` (no `icon`). | New `src/components/Chat/ChatContextLine/`, replaces `ChatTopic`. See the DisclosureSection note and the slot contract below. |
| Message group, bubbles | `@ant-design/x` `Bubble` (already in tree), own group head | New `src/components/Chat/MessageGroup/`. |
| Message block + actions | trigger `Button type="text"` 32; `Dropdown` | New `src/components/Chat/MessageActions/`. |
| Reaction chips | antd `Button` (toggle) restyled to §5 | Inside `MessageGroup`. |
| Reply quote | antd `Flex align="center"` + `IconCornerDownRight` | Inside `MessageGroup`. |
| Date separator | antd `Divider plain` | Reuse. |
| Delivery status | Tabler icons + `Typography.Text` | Move `renderMessageStatus` from `ChatMessages` into `MessageGroup`. |
| Jump to latest | antd `Button shape="circle"` + `Badge`, absolute in the timeline | Inside `ChatTimeline`. |
| Composer + mode strip | antd `Input.TextArea variant="borderless" autoSize={{minRows:1,maxRows:6}}`; `Button type="primary"` | Rework `ChatInput`. |
| Emoji picker | antd `Popover` hosting a picker | **Decision needed** (§10). |
| Invite | `AppAvatar` 56, `Typography`, two `Button`s | Restyle `VacancyChatInvite` / `DefaultInvite`. |
| Confirms | `App.useApp().modal.confirm` (`okButtonProps={{ danger: true }}` for Delete) | Reuse. |

**DisclosureSection: anatomy and motion reused, component not.** The primitive in
`src/components/ui/DisclosureSection` does not fit as-is, for three reasons:
- **It is breakpoint-driven.** At ≥ 992px it is forced open, its chevron is hidden and its header
  is made inert. The desktop chat panel lives in exactly that viewport, so the section could
  never fold there.
- **Its `title` is a string.** The summary here is a `Tag` + truncated text + `StatusDot`.
- **Its panel pushes content.** It is an in-flow `<details>` in a bordered card, while this
  section overlays the timeline.

What is reused:
- the summary/panel anatomy, with the summary as the only toggle;
- `IconChevronDown` rotating 180° when open, with `transition: transform 0.15s ease` and no
  transition under `prefers-reduced-motion`;
- the panel's padding rhythm.

The section itself fades and slides in over the same 0.15s: `opacity` plus a `translateY(-4px)` →
0, also none under reduced motion. The .pen has no DS page for DisclosureSection. If a second
overlay disclosure appears, promote `ChatContextLine`'s shell to `src/components/ui` rather than
adding flags to DisclosureSection.

A reusable component ships with stories. `ChatContextLine` needs advice / vacancy / closed ×
collapsed / expanded, the line hover in both states, and a long-comment story that hits the cap.

### Context disclosure — the per-kind slot contract

The layout never changes per kind; a kind supplies data and actions. Register one renderer per
`ChatRoomKind` in `src/components/Chat/ChatContextLine/kinds.ts`:

```ts
type ChatContextField = {
	label: string;
	value: ReactNode;          // plain text; a StatusDot for the status field
	span?: "half" | "full";    // "half" fields pack 2–3 per row; default "full"
};
type ChatContextAction = {
	label: string;             // text only — actions carry no icon
	onClick: () => void;
	primary?: boolean;         // at most one; the committing action (e.g. Question resolved)
	href?: string;             // external navigation, opens in a new tab
};
type ChatContextSlot = {
	tag: string;               // chip label, "Advice" / "Offer"
	summary: string;           // collapsed line text, truncated by CSS
	closed: boolean;           // true → "Closed" dot on the line
	fields: ChatContextField[];
	actions: ChatContextAction[]; // empty → no action row
};
type ChatContextKind = (ctx: RoomContext, t: TFunction) => ChatContextSlot | null;
```

- **Advice request.** Summary is `Topic: {topic} · {project}`.
  - Fields: Project (half), Status (half), Topic (full), Comment (full).
  - Actions: **Question resolved** (primary), only while open.
- **Vacancy offer.** Summary is `{position} · {project}`.
  - Fields: Position (full, plain), Project (half), Applied (half), Status (half).
  - Actions: **Open position page** (`href`, new tab), always. **Close chat**, only while open.
- **Invite pending.** Only non-mutating actions.
- A kind returning `null` renders nothing (direct chats).

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
| Avatar / online dot | 40 / 12 dot `--gd-success-solid` with 2px `--gd-color-surface` ring; `corner-shape: round` |
| Name | 14, 500 / 600 unread |
| Space label | 12 `--gd-color-text-secondary` |
| Preview | 13 `--gd-color-text-secondary`; unread `--gd-color-text` |
| **Timestamps** (row, group head, delivery, "edited", date separator) | **`--gd-color-text-tertiary`**, 12 (see note) |
| Unread row time | stays `--gd-color-text` 600 |
| **Unread count** | antd `Badge`, ≥ 20 × 20, **radius `--gd-radius-pill`** + `corner-shape: round`, `--gd-color-action` / `--gd-color-on-action` 12/600. **Not red.** |

The context disclosure:

| Element | Token |
|---|---|
| Context line, collapsed at rest | fill `--gd-color-surface`, height 40, padding `0 var(--gd-space-4) 0 var(--gd-space-6)` (mobile `0 var(--gd-space-3) 0 var(--gd-space-4)`), bottom hairline `--gd-color-border`; summary 13 `--gd-color-text-secondary`; chevron 16 `--gd-color-text-secondary` |
| **Context line, expanded at rest** | fill **`--gd-color-surface`** (same as the section), **no bottom hairline, no shadow** |
| **Context line, hover** (collapsed or expanded) | fill **`--gd-fill-base`**. On the line only, never on the section. |
| Context line, focus-visible | the theme focus ring, inset (`box-shadow: inset 0 0 0 3px …`) so it doesn't spill onto the section |
| **Disclosure section (expanded)** | fill **`--gd-color-surface`**, radius 0, **no hover fill**, no top or side border |
| **Block bottom edge** (line + section, expanded) | bottom hairline `--gd-color-border` + **`--gd-shadow-e2`**, clipped to the bottom edge (`clip-path: inset(0 0 -24px 0)` on the section) so no shadow falls on the line, the top or the sides; `z-index` above the timeline, below jump-to-latest and menus |
| Section max height | `50%` of the conversation view; fields area `overflow-y: auto` |
| Fields area | padding `var(--gd-space-1) var(--gd-space-6) var(--gd-space-3)` (mobile inline `--gd-space-4`), gap `--gd-space-3`; half-field row gap `--gd-space-4` |
| Field | label 12 `--gd-color-text-secondary`, gap `--gd-space-1`, value 14 / `--gd-line-height-body` `--gd-color-text` |
| Action row | padding `var(--gd-space-3) var(--gd-space-6) var(--gd-space-4)`, gap `--gd-space-2`; `Button size="small"` (32), default, one optional `type="primary"`; no icons |

The conversation:

| Element | Token |
|---|---|
| Timeline | padding `var(--gd-space-3) var(--gd-space-6) var(--gd-space-4)`; `--gd-space-4` between groups, `--gd-space-1` between bubbles |
| Bubble | padding `var(--gd-space-2) var(--gd-space-3)`, `--gd-radius-card`, 14 / `--gd-line-height-body`; others `--gd-neutral-100`, own `--gd-color-accent-subtle`; max-width 320 / 80% |
| Message block, rest | no fill; padding `--gd-space-2`, radius `--gd-radius-panel` |
| Message block, hover / open | fill = the bubble's token (`--gd-neutral-100` / `--gd-color-accent-subtle`); the bubble's own fill becomes transparent |
| Message trigger | 32, `--gd-radius-control`, `IconDotsVertical` 20 `--gd-color-text-secondary`; active `--gd-fill-strong`, icon `--gd-color-text` |
| Reaction strip | `--gd-color-surface`, 1px `--gd-color-border`, `--gd-radius-card`, `--gd-shadow-e2`, padding `--gd-space-1`; buttons 32 `--gd-radius-control`, hover `--gd-fill-base`, emoji 18 |
| Message menu | antd `Dropdown` theme; items 32; Delete `danger` (`--gd-danger-solid`) |
| Reaction chips | 24 high, padding `0 var(--gd-space-2)`, **`--gd-radius-pill`** + `corner-shape: round`, 1px `--gd-color-border`, `--gd-color-surface`, count 12/600 secondary; own: `--gd-color-accent-subtle` + 1px `--gd-color-accent`, count `--gd-color-text` |
| Reply quote row | gap `--gd-space-1`, `align-items: center`; `IconCornerDownRight` 14 `--gd-color-text-secondary` |
| Reply quote block | `--gd-color-surface`, radius `--gd-radius-chip`, padding `var(--gd-space-1) var(--gd-space-2)`, no border; name 12/600, preview 13 secondary, one line |
| Composer mode strip | `--gd-fill-base`, radius `--gd-radius-chip`, `align-items: center`, no border; icon 14 secondary; lead 13/600, preview 13 secondary; cancel `IconX` in a 32 button |
| Deleted message | transparent bubble, 1px `--gd-color-border`, italic 14 `--gd-color-text-tertiary` |
| Date separator | hairlines `--gd-color-border`, label 12/500 `--gd-color-text-tertiary`, no chip fill |
| Delivery line | status word `--gd-color-text-secondary`, icon 14; failed `--gd-danger-solid` + "Retry" `--gd-color-link` |
| Jump to latest | 40 circle, `--gd-color-surface`, `--gd-color-border-strong`, `--gd-shadow-e2`; badge like the unread count |
| Composer | 1px `--gd-color-border-strong`, `--gd-radius-control`; focus-within `--gd-color-accent` + ring; placeholder `--gd-color-text-tertiary`; Save / Send `Button type="primary"` 32 |
| Read-only banner | padding `var(--gd-space-4) var(--gd-space-6)`, top hairline, `IconLock` 16 + 13 secondary |

**Note on timestamps.** The DS has no text step between `text-secondary` and `text-tertiary`.
Tertiary measures ≈ 2.8 : 1 on white, below AA, and `roles.ts` limits it to placeholders and
disabled text. Applied as asked, with the date separator's grey chip removed and the unread time
kept ink. AA would need a new DS role.

**No new colour tokens.** One .pen variable was added, `radius-pill` = 9999, mirroring
`--gd-radius-pill`. Pencil effects take no variables, so the .pen draws the bottom shadow with
literal values, offset downward so no blur reaches the line. In code it is `--gd-shadow-e2` with
the bottom-only clip above.

## 6. States

| State | What the user sees | Frame |
|---|---|---|
| List loading | 9 skeleton rows, tab counts hidden | `b1i1k` |
| List loading more | Rows stay; `Spin` + "Loading more…" | `d1YqV` |
| All empty | `EmptyState` "No conversations yet" + "Find an expert" | `B3iV0` |
| Unread empty | `EmptyState` (`IconChecks`) "You're all caught up" | — |
| Closed empty | `EmptyState` (`IconArchive`) "No closed chats" | `J4zJj` |
| List error | `EmptyState` (`IconPlugConnectedX`) + "Try again" | `n5vQ2` |
| Conversation loading | Header + context line real (chevron disabled until the context loads); centred `Spin` | — |
| Context failed to load | The line shows the kind tag and "Details unavailable"; chevron disabled with a tooltip | — |
| Conversation error | `EmptyState compact` "Couldn't load messages" + "Try again" | — |
| Empty conversation | `EmptyState compact` "Say hello to {name}" | `u8M7E` |
| Invite pending | Invite block; disclosure without mutating actions | `ZMcrW` |
| Context expanded | Line + section as one white block over the top of the timeline, bottom shadow, text-only actions | `kWwIn` 2/4/6, `uRZrC`, `G1YeC` |
| Context line hovered | Line only takes `--gd-fill-base`; the section stays white | (spec only) |
| Context expanded, long comment | Section capped at 50%, fields scroll, action row pinned | `kWwIn` 2, `G1YeC` |
| Closed / read-only | "Closed" on the line; section without close action; banner instead of composer; message menu = Copy only | `B9jTEp`, `kWwIn` 5–6, `hPrUv` 5 |
| Delivery | Sending… / Sent / Read / Not sent · Retry | `uRZrC`, `YGPUq` |
| Message hover / menu open | One block in the bubble's colour + trigger | `hPrUv` |
| Reply mode / edit mode | Mode strip in the composer; edit shows **Save** | `X7HUy`, `hycZ7` |
| Edited / deleted message | "· edited" after the time / italic "Message deleted" | `X7HUy` |
| Action failed | `message.error` toast; optimistic change rolled back | — |
| Permission denied | `EmptyState compact` (`IconLock`) "This chat isn't available" + "Back to messages" | — |

## 7. Interactions

**Panel and list**
- **Open / close.** The launcher toggles the panel; Esc, outside click and route change close it.
  Crisp is hidden while it is open. Drafts (and a pending reply/edit) are kept per room.
- **List infinite scroll.** 20 rows, then 20 more when the sentinel comes within 200px of the
  bottom. Loaded rows stay while the next page loads, and each tab keeps its scroll position.
- **Ordering.** By last event timestamp, descending.
- **Time format.** Today `HH:mm` · "Yesterday" · weekday within 6 days · `D MMM` · `DD.MM.YYYY`.
- **Separators.** Today / Yesterday / weekday / `D MMM` / `D MMM YYYY`.

**Timeline**
- **History.** When the user scrolls within 120px of the top, `scrollback` 30 events, keeping the
  first visible message anchored.
- **Auto-scroll.** Only if the user was within 48px of the bottom. Sending always scrolls.
- **Jump to latest.** Shown when more than one viewport above the bottom. The badge counts
  arrivals since then. Click smooth-scrolls to the bottom.
- **Read marking.** Send the read receipt / marker for the latest event only while all three
  hold:
  - the conversation is open;
  - the timeline is within 48px of the bottom;
  - `document.visibilityState === "visible"`.
  
  An expanded context section does not count as leaving the bottom. The row menu's *Mark as
  read* sets the marker without opening the room.

**Context disclosure**
- **Hover.** Pointer over the summary line → the line (only) takes `--gd-fill-base`, collapsed or
  expanded. The section below never reacts to hover. Leaving the line restores the shared
  `--gd-color-surface`.
- Click, Enter or Space on the line toggles the section, and `aria-expanded` follows. Focus stays
  on the line.
- Esc, a click outside the block (timeline, composer, header), a second click on the line, room
  change and back navigation all collapse it.
- Opening and closing **never** changes the timeline's size or `scrollTop`.
- Incoming messages still arrive and auto-scroll underneath. If new messages land while the user
  is at the bottom, they stay visible below the section.
- *Question resolved* / *Close chat* → confirm `zYWmd` → existing resolve endpoint. On success:
  - the section stays open and re-renders without the close action, with the status field on
    "Resolved {date}" / "Closed";
  - the line gains the "Closed" dot;
  - the composer becomes the banner;
  - the room moves to Closed;
  - a toast says "Chat closed".
- *Open position page* opens `/job/[id]` in a new tab. The section stays open.

**Message actions**
- **Trigger visibility.** On hover and on focus-within; hidden at rest. The block takes the
  bubble's colour. With the menu open, the block keeps its fill and the trigger stays active.
- **Reactions.** A strip emoji toggles the user's reaction and closes the menu. A chip click
  toggles. Chips are ordered by first reaction, and a tooltip lists who reacted. Changes are
  optimistic.
- **Reply.** The composer enters reply mode (strip with `IconCornerDownRight`, X cancels). The
  sent message shows the arrow + quote row. Clicking the quote scrolls to the original and
  flashes its block for about 1s, paginating back if needed.
- **Copy.** Plain body; toast "Copied".
- **Edit** (own only). Strip "Editing message", textarea prefilled, **Save**. Esc/X cancels, and
  saving unchanged text is a no-op. Afterwards "· edited" shows after the time.
- **Delete** (own only). Confirm `v1IjjU` → redaction → "Message deleted". Its reactions
  disappear.
- **Closed chat.** Menu = Copy only; no strip; chips read-only.

**Composer and invite**
- **Composer.** Enter sends or saves, Shift+Enter inserts a newline, up to 6 rows. Send is
  disabled when the text is empty after trim.
- **Invite.** Accept joins. Decline rejects and returns to the list.

### Matrix mapping

| Action | Matrix |
|---|---|
| React | `sendEvent(roomId, "m.reaction", { "m.relates_to": { rel_type: "m.annotation", event_id, key } })` |
| Un-react | `redactEvent(roomId, reactionEventId)` |
| Read reactions | `getRelationsForEvent(eventId, "m.annotation", "m.reaction")` |
| Reply | `m.room.message` with `"m.relates_to": { "m.in_reply_to": { event_id } }`; the quote comes from the local event (fallback `fetchRoomEvent`) |
| Edit | `m.room.message` with `"m.new_content"` and `"m.relates_to": { rel_type: "m.replace", event_id }`; render `replacingEvent()`; "edited" when `replacingEventId()` is set |
| Delete | `redactEvent(roomId, eventId)`; `isRedacted()` → "Message deleted" |
| Copy | Clipboard only |
| Read marker | `setRoomReadMarkers` / `sendReadReceipt` |

Power levels must let members send `m.reaction` and redact their own events (Matrix defaults
do). Rooms created by our backend should be checked once.

## 8. Copy — Tolgee keys

`chat.groups.*` and `chat.topic.openPositionPage` are retired. The popover-era keys
`chat.context.advice.title` / `chat.context.vacancy.title` are dropped, because the section has
no title (the line is its header).

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
| `chat.context.toggle` | Show details |
| `chat.context.unavailable` | Details unavailable |
| `chat.context.status` | Status |
| `chat.context.open` | Open |
| `chat.context.closed` | Closed |
| `chat.context.advice.summary` | Topic: {topic} · {project} |
| `chat.context.advice.topic` | Topic |
| `chat.context.advice.project` | Project |
| `chat.context.advice.comment` | Comment |
| `chat.context.advice.resolve` | Question resolved |
| `chat.context.advice.resolvedOn` | Resolved {date} |
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

`chat.context.toggle` is the accessible name of the line; `chat.message.replyTo` labels the quote
row.

## 9. Data needs (domain level — for the API agent)

- **Room list.** Most per-room data comes from the Matrix client:
  - name, avatar, presence;
  - last message: sender, plain body, timestamp, own or not;
  - notification count.
  
  From the app, per room: kind, `ChatRoom.status`, and the context label (project/space name).
  `/api/chat/rooms/kinds` should return status and label along with the kind, batched by Matrix
  room id.
- **Closed tab.** Closed rooms for the current user, paginated (~20), newest activity first.
- **Unread tab count.** Rooms with notification count > 0, excluding closed. The header badge
  keeps the total (`unreadTotal`).
- **Context disclosure.** `GET /api/chat/rooms/{id}` must supply every field in §4, plus `status`
  and the close date:
  - advice: topic, project name, comment;
  - vacancy: vacancy id + title, project name, application date.
- **Close / resolve.** `PUT /api/chat/rooms/{id}/resolve`, returning the new status and close
  date.
- **Message actions, read markers.** Matrix only. No app endpoints.

## 10. Open questions and assumptions

1. **Tab name "Closed" vs "Archived".** The design matches *Close chat*. Confirm.
2. **"Leave" is removed** from the row menu, so direct chats can't be left. Intended?
3. **The info popover** (TLS / Matrix note, `ChatPushStatus` for admins) is dropped. Where does
   push status go?
4. **Who may close** an advice/vacancy chat: assumed both participants.
5. **Emoji picker** for the composer: `frimousse` or a curated grid.
6. **Timestamp contrast.** Tertiary is below AA. Keep, or add a muted role?
7. **Own-message trigger** sits left of the text. Confirm.
8. **Edit / delete time limit.** None assumed.
9. **"Find an expert"** links to the experts catalogue.
10. **The section stays open after a successful close**, so the new status is visible. The
    alternative is to collapse on success.

## 11. Deferred

| Item | What it needs |
|---|---|
| **Expanded / larger panel mode.** Was the header `IconArrowsDiagonal` button (node `YWe34` in `Ut6hz`), removed on review. ~960-wide two-pane layout. | UI only: a size toggle on `ChatPanel`. |
| Attachments folder / room media | Page `m.image`/`m.file` events per room, authenticated media download, thumbnails. |
| File and image sending | `uploadContent`, `m.file`/`m.image` with `info`; progress / cancel / retry UI. |
| Voice messages | `MediaRecorder`, `m.audio` with the MSC3245 voice flag, waveform and playback UI. |
| Typing indicator | `sendTyping` + `RoomMember.typing`; one caption line above the composer. |
| Space filter / grouping (GDHUB-28) | A space id per room and a filter above the list. Rows already carry the label. |
| Full emoji picker for reactions ("+" in the strip) | Same dependency decision as §10.5. |
