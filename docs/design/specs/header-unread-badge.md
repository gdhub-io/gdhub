# Header unread dot — chat and notifications (GDHUB-92)

## 1. Problem & user

Every signed-in user sees two unread signals in the app header: on the chat launcher
and on the notifications button. Both say the same thing: something new is waiting for
you. So they become one signal, a **graphite dot** that is the same on both icons. The
header only says that something is new. The number lives in the panel the button opens.

The two icons also change. Chat becomes Tabler `IconMessageDots` and notifications
becomes Tabler `IconInbox`. Both buttons share one hover look and one pressed look. The
avatar beside them gets an outline in the icons' colour and stroke weight.

## 2. Frames

In `docs/design/platform-design.pen`, row `Row — 07 · Chat · redesign`:

| Frame | Node | What |
|---|---|---|
| `07.02 · Chat · Launcher (header icon states)` | `lfXrv` | Four states: No unread; Unread, with a dot on both (`amgXU` notifications, `YPbmE` chat); Chat open (`V3e0W`); Notifications open (`ojRO5`). Outlined avatars: `H9xYG7`, `eCvSt`, `LFr0s`, `u0K8pF`. |
| `07.02.1 · Chat · Launcher · Unread dot — one dot for chat and notifications` | `KipY7` | The dot component, the icon note, and the states: 0 / 3 / 99+ (the same dot) / Chat open · 3 / Notifications open · 3 (`MRr6e`). Every state includes the outlined avatar. |
| `Header / Unread dot` (reusable) | `Wt114` | The dot. Every dot on the canvas is an instance of it. |

The canvas has no Tabler set, so the icons are drawn with the closest lucide shapes:
`message-square-more` stands in for `IconMessageDots`, and `inbox` for `IconInbox`.
Build them with Tabler.

The icons and the avatar outlines use the canvas variable `$ant-color-text`
(neutral-900 at 88%), which mirrors antd's `--ant-color-text`. It was added for this
work because the file had no such token.

## 3. Layout

- Each header button is a **32px circle** with a **20px** Tabler icon centred in it
  (icon box at 6,6). The gap between the buttons stays 8 (`<Space size={8}>` in
  `HeaderActions`).
- The dot wraps the **icon**, not the button. Its centre sits **2px inside** the icon's
  top-right corner, at (icon right − 2, icon top + 2). In the 32px box, the 6px dot sits
  at x 21, y 5, so its centre is at 24, 8. It partly covers the icon's stroke, and the
  ring separates the two. In antd: `offset={[-2, 2]}`.
- The avatar follows the buttons: 32px, with an **inside** outline.
- Breakpoints change nothing. Below `xl` the two buttons swap order; the dot stays in
  the same place on each icon.

## 4. Components

- **New: `src/components/ui/UnreadDot/`.** A thin wrapper over antd
  `<Badge dot={hasUnread} color={token.colorPrimary} offset={[-2, 2]}>` around its
  child icon. antd draws a 1px ring around the dot. Widen it to 2px of
  `--gd-color-surface` (`box-shadow: 0 0 0 2px var(--gd-color-surface)` on the dot).
  The ring stays white in every state (idle, hover and open), so on the grey fill it
  reads as a white ring. Ship the component with a story that has two states: no unread
  and unread.
- `ChatButton` (`src/components/ChatButton`):
  - Wrap the icon, not the `Button`:
    `icon={<UnreadDot …><IconMessageDots size={20} stroke={1.75} /></UnreadDot>}`.
  - Use `size="small"` (32px).
- `NotificationsBell` (`src/components/NotificationsBell`), in `renderBell`:
  - Keep `IconInbox` (20, stroke 1.75).
  - Wrap it in `UnreadDot` instead of the count badge.
  - Drop the bell's own `offset`.
- **Icon colour:** `--ant-color-text` on both icons, in every state.
- **Hover and open fill, both buttons:** `--gd-fill-strong`. The notifications trigger
  from Novu has no open attribute and no `onOpenChange`, so set its open fill in CSS.
  While the popover is open, the Inbox's popover content (our `popoverContent` class)
  carries `data-open="true"`:

  ```scss
  :global(body):has(.popoverContent[data-open="true"]) .popoverTrigger {
  	background-color: var(--gd-fill-strong);
  }
  ```

- **Avatar** (the header's user avatar, in `HeaderActions`): a 1.75px inside outline in
  `--ant-color-text`, the same colour and weight as the icon strokes. Draw it inside the
  32px circle (an inset `box-shadow`, or `outline-offset: -1.75px`) so the avatar does
  not grow. Write `corner-shape: round` under its radius.

## 5. Tokens

- Dot: fill `colorPrimary` (`roles.action`, `--gd-color-action`, solid neutral-900), 6px,
  pill radius.
- Dot ring: 2px `--gd-color-surface`, in every state.
- Icons: `--ant-color-text` (antd `colorText`, neutral-900 at 88%), 20px, stroke 1.75.
  Tabler `IconMessageDots` (chat) and `IconInbox` (notifications).
- Avatar outline: 1.75px `--ant-color-text`, inside.
- Hover and open fill, both buttons: `--gd-fill-strong` (`$neutral-100` on the canvas).
- Button: 32 (`controlHeightSm`, via `size="small"`).

## 6. States

| State | What the user sees |
|---|---|
| 0 unread | No dot. |
| 1 or more unread | One dot, whatever the number. |
| Hover | The button takes `--gd-fill-strong`. The dot keeps its white ring. |
| Chat panel open | The chat button takes `--gd-fill-strong`. The dot stays until the chats are read. |
| Notifications popover open | The same, on the notifications button. The dot stays until the notifications are read. |
| Loading | No dot until the count arrives. |
| Error fetching the count | No dot. |
| Permission denied | Not applicable: both buttons exist only for signed-in users. |

## 7. Copy

The dot itself carries no text, so each button's accessible name carries the count.
These are the keys the code already uses:

- `chat.panel.title` — "Messages"; `chat.panel.titleUnread` — "Messages, {count} unread"
- `notifications.bell.title` — "Notifications"; `notifications.bell.unread` — "Notifications, {count} unread"

Use the unread form when the count is above 0. Use the plain form at 0, while the count
is loading, and when loading it failed.

## 8. Data needs

None new. Chat keeps `unreadTotal`, and notifications keeps Novu's `unreadCount.total`.
The dot only needs to know whether the count is above 0. The aria label needs the
number itself.

## 9. Open questions

- **Chat button at 32.** This is the minimum size the guidelines allow for an icon
  button. It is accepted here because the header is dense chrome, and because it
  matches the notifications button.
- **Other screens.** The header mockups on other screens (03, 05, 06, 08–12…) still
  show the old bell and chat-circle icons, with no dots and no avatar outline. They
  were not touched.
