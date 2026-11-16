# Live studio "Sborka" — UI handoff

Intent: [docs/intent/GDHUB-207-live-sborka-studio.md](../../intent/GDHUB-207-live-sborka-studio.md) ·
route `/live/room/sborka` · canvas row `Row — 03.15 · Live studio · Sborka` (note `t3yza`) in
`docs/design/platform-design.pen`, y ≈ 97000.

## 1. Problem & user

A hub admin (`hub.live_room.manage`) runs the "Sborka" show from one page: opens a Daily room,
lets invited GDHub users in, directs them (name, role, mic, on/off the broadcast, order) and
starts and stops an RTMP broadcast whose picture follows the Sborka composition. Guests are
any signed-in users who have the URL: they wait until the room opens, join with a name and a
role they choose, see who else is in the room, and need to know at a glance whether the
show is on air and whether they are in the picture.

## 2. Frames

Top line — admin. Second line — guest. All app frames are 1265 wide.

| Id | Frame | What it shows |
|---|---|---|
| `YyNTX` | 03.15.1 · Admin · room closed | Pre-join stage (own camera, device selects) with "The room is closed" + white **Open room**; Broadcast settings can be filled ahead ("remembered in this browser"); Guests panel empty ("Nobody here yet"). |
| `G8Fup` | 03.15.2 · Admin · room open, gathering | Call stage (5 tiles, 3 marked On screen), own call controls; Broadcast settings (title, RTMP URL, key — empty); Guests panel; **Start broadcast** disabled with lock + tooltip. |
| `D14pi` | 03.15.3 · Admin · on air | "On air · 12:04", **Stop broadcast**; Program panel with the scaled broadcast composition (`fCrzn`) moved to the top; under it the show title stays editable (pencil), RTMP + key are locked. |
| `fBKWu` | 03.15.4 · Edit name and role | (a) Admin: Popover from the pencil after a guest's name — Display name + Role inputs, Cancel / Save. (b) Guest: the same Popover from the pencil after their own name in People. |
| `o3sfoy` | 03.15.13 · Admin · reordering (drag in progress) | Guests panel only: Mark's row lifted (surface fill, e3 shadow) between Pavel and Olga, a 2px accent drop line above it, an outlined empty slot where it came from. Placed under `fBKWu`. |
| `LOTa2` | 03.15.5 · Admin · End room confirm | `Modal.confirm` danger: "End the room for everyone?" — Cancel / **End room** (filled red, allowed in a confirm). |
| `gzBbw` | 03.15.6 · Admin · broadcast warning (RTMP rejected) | Closable **warning** Alert above the stage (`V35wG`). The call goes on; only the stream didn't start. Status back to "not on air", Start broadcast enabled to retry. |
| `ED2Mq` | 03.15.7 · Admin · guests empty | Room open, only the admin in the call: one large tile; Guests panel lists the admin plus "No guests yet". |
| `EKGST` | 03.15.8 · Loading | Skeleton: header lines, dark stage block, panel lines, people list. |
| `IYA3O` | 03.15.9 · Guest · waiting for the host | Pre-join stage, "Waiting for the host", disabled loading button; the page polls and turns into .10 by itself. |
| `EG8S8` | 03.15.10 · Guest · join | "The room is open", **Your name in the call** (from profile), required **Role** (prefilled with the speciality name, direction icon, helper line), camera/mic selects + toggles, white **Join**. |
| `H4gx7n` | 03.15.11 · Guest · in the room | Stage, "On air · 12:04" + "You're on screen", own controls (mic, camera, share screen, edit), **Leave**; read-only **People** panel (`ukivH`, pencil only after own name); antd `message` "The host muted you". |
| `Yc4CQ` | 03.15.12 · Guest · room ended | EmptyState: "The room has ended" + Go to Hub. |

Admin Guests panels: `QbeVZ` (G8Fup), `hbEZA` (D14pi), `CUHGN` (gzBbw), `QfCQE` (ED2Mq), `uNciC` (fBKWu a), `W6kXVV` (03.15.13). Read-only People panels: `ukivH` (H4gx7n), `jtolY` (fBKWu b).

## 3. Layout

- Shell: `ProtectedShell` (hub top bar, breadcrumb "Hub / Live studio"). No sub-nav entry; the page is URL-only.
- Content: padding 32 / 48 / 64, vertical gap 24. Header: title "Sborka" (24/600) + status in the title row, 13px subtitle, actions on the right.
- Room open (admin and guest): Split — Main (fill) + Sidebar 400, gap 32. Admin Main: [Alert] → [Program, on air only] → Call stage → Broadcast settings; admin Sidebar: Guests (with controls). Guest Main: Call stage; guest Sidebar: People (read-only).
- Before joining (closed / waiting / join): full-width pre-join stage, from `Jatya` (12.08.1): self preview + 320 column.
- Call stage: dark band (`InverseBand density="product"`), radius panel, padding 12, tile rows gap 8, tiles 168 high, controls row of 44 round buttons as in `Ay58j`.
- **Forms:** every `Input`, `Input.Password` and `Select` is antd `variant="filled"` — 40 high, control radius, no border (ui-guidelines §7, reference `00.10 · Forms & settings` `B1kC4y`). The theme's filled background (`colorFillTertiary`) is used as is. On the canvas it is drawn `--gd-neutral-100` on the page-ground panels (where `bg-muted` would disappear), `bg-muted` inside the white popover, and the inverse base fill on the dark stage. A focused input keeps the fill and shows the focus border.
- Below ~1100px the sidebar drops under Main (one column); tile rows become 2 per row. Not drawn: this is a desktop tool.

### Guests / People row anatomy

One compact row, ~56 high: padding 8 / 0, gap 12, a `--gd-color-border` hairline on top.

- **Drag handle** (admin list only): `IconGripVertical` 16, `--gd-color-text-tertiary`, left of the avatar; the cursor is `grab`. People has no handles.
- **Avatar** 32.
- **Two lines** (fill, gap 2, truncate with ellipsis):
  - Line 1 (24 high): name 14/500 (+ " (you)"), then a small pencil right after it — icon 14 in `--gd-color-text-tertiary`, a 24 box padded to a 32 hit area. In the admin list it is on every row; in People only on the viewer's own row. It opens the edit Popover, anchored to the pencil.
  - Line 2, 13 tertiary: direction icon + role · camera icon (on/off) · screen-share icon when sharing · "muted by you" (admin list only). The state words are dropped; the icons carry tooltips.
- **Right side**, vertically centred:
  - Admin: two round icon buttons, 32, `Button shape="circle"`, gap 12:
    - **Mic** (default outlined; muted = red tint + `IconMicrophoneOff`; tooltip "Mute" / "Unmute").
    - **On screen**, the layer-visibility metaphor: off screen = default outlined with `IconEyeOff`, tooltip "Show on broadcast"; on screen = graphite-filled (`type="primary"`, the commit style) with `IconEye`, tooltip "Remove from broadcast". Never red: red means muted.
    - The panel head's "On screen 3 of 5" stays as the counter.
  - People (read-only): mic icon 16 (red when muted) + `IconEye` 16 in the accent when on screen (tooltip "On screen"), not interactive. A guest who is off screen gets an empty slot, so the column stays aligned.
- **Screen-share child row.** While a guest shares their screen, a row of its own sits directly under theirs:
  - ~28 high, with no divider between it and the owner's row (the next row's hairline closes the group);
  - it starts at the owner's name column, not the avatar;
  - a 1px L-shaped tree connector in `--gd-color-border-strong` runs from under the owner's avatar down and right into the row;
  - then a bare `IconScreenShare` 14 and "Screen" (13, secondary). No name repeat, no tile, no avatar, no handle;
  - on the right: an empty mic slot (keeps the column aligned), then its own On screen round button, the same eye toggle, 28 (`size="small"`), centred in the 32 column;
  - in People the same row is read-only (eye in the accent when on screen);
  - it is never dragged on its own and moves with its owner; it disappears when the share stops.
- **Names never wrap or overflow.** Every name and role — tile labels on the broadcast and in the call stage, list rows, the header, popovers — is one line, truncated with an ellipsis (`text-overflow: ellipsis`, `min-width: 0` on the flex parent; antd `Typography.Text ellipsis` with the full value in a tooltip in the app UI). On a tile the label shrinks first, the speaking/mic icon keeps its place.
- **Panel rows run edge to edge** (ui-guidelines §8): the panel has no side padding, the head keeps 24, each row is 56 high with 24 inner padding and a `--gd-color-border` hairline on top. Panels (Guests, People, Broadcast, Program) are outlined in `--gd-color-card-border`, like the hub's right-column widgets (`uchcU`: Scout Cabinet, Incoming requests) — `border-subtle` was invisible on the page ground. Hover on an admin row fills it with `--gd-neutral-100` (`G8Fup`, Olga's row) — a neutral fill inside a panel reads against the page, so `surface-sunken` would vanish. Read-only People rows have no hover except the guest's own. The panel clips its rows to its radius.
- **On-screen counter** counts people only; a shared screen has its own eye in its child row and is not in "N of M".
- **Reordering** (`o3sfoy`). Dragging a row lifts it: surface fill, card radius, e3 shadow, handle in `--gd-color-text`. A 2px `--gd-color-accent` line marks the drop position, and the origin keeps a flat `--gd-neutral-100` band, edge to edge, until drop. Keyboard: focus the handle, Space to lift, arrows to move, Space to drop, Esc to cancel (dnd-kit's defaults).

## 4. Broadcast composition

- Broadcast frames, in the 03.15 row (third line, y 99900), drawn in our design — Onest, the studio cast with photos, `Name · Role` labels: `H2Xyge` 03.15.15 (1), `ptS10` 03.15.16 (2), `XAchW` 03.15.17 (3, last row centred), `DKDu4` 03.15.18 (5 = 3 + 2), `a4W1A9` 03.15.19 (screen share), `g2TtM` 03.15.20 (cameras off, 2 × 2 with initials). Any other count follows the grid rule below; the 4-person viewer frame was removed as redundant.
- The admin's Program preview (`fCrzn` in `D14pi`) is a 1:0.359 scaled copy of `XAchW`. It keeps the editor grid background, the "Шапка" top bar (СБОРКА logo, Onest bold title, gdhub logo), the "Панель ролей" rail, the label plates and the 2 + 1 tile layout. At runtime it is the same VCS composition rendered in the browser.
- **Order.** The admin drags rows in the Guests panel. The list order is the order of the tiles on the broadcast and of the rail icons. The default is join order. Off-screen rows keep their place in the list and are skipped in the picture.
- **Accent colour.** The orange in the source frames stands for the speaker's direction tint at runtime: `directionColors[slug].tint` (via `getWorkDirection(speciality)`). On the dark broadcast it is used for the speaker's tile editing frame (2px outline + square corner handles) and for the speaker's rail circle (tint hairline, ~18% tint fill, tint icon). In the preview: Olga Kim, development, `#DCE9FB`. The same editing frame marks the speaker in the screen-share side column (`HJjxP` in 03.15.19, 3px outline, 12px handles); the shared screen itself is never highlighted, only people's cameras. Label plates stay neutral for everyone.
- **Host.** The host has no speciality colour: their icon is the microphone and their accent is the brand accent.
- **Tile corners.** Broadcast video tiles use the card radius, 16 at 1920 (5.7 in the 0.359 preview); the speaker's editing frame appears only when 3 or more cameras are on screen (with 1–2 the speaker is obvious; the rail still selects their direction); it is square (radius 0) like an editor's selection box, drawn on the tile's bounds with square handles on its corners. The broadcast frames draw 16 too, with the every-direction rail and the speaker in the development tint.
- **Rail.** Lists every work direction, always, in `WORK_DIRECTIONS` order with the host's mic first (19 icons). Two states only: **selected** — the active speaker's direction: a circle filled with the direction's **vivid** colour, a ring in its `tint`, a glow in the vivid colour, the icon white; **not selected** — every other icon, bare `#A1A1AA` at 70%. Being on screen does not light an icon. Nobody speaking → nothing selected. Width 24 at preview scale, 60 at 1920; buttons 44, icons 28 at 1920. Every direction in both states: `eVth2` (03.15.14).
- **Vivid direction colours (new token).** The tints sit at L≈93 and read grey on the dark broadcast, so the selected state needs a saturated colour per direction: same hue as the tint, S≈62%, L≈46% and darker where needed so a white icon keeps 3:1 (game writer, learning, technical art, qa, investment); management S≈45%, other S≈8%. Shipped as `directionColors[slug].vivid` (read by `RAIL_PALETTE` in `src/lib/live/sborka.ts`), guarded by `tests/design-system.test.ts`. Token `directionColors[slug].vivid` in `src/config/design/tokens.ts` (exposed through `getWorkDirection`), values as drawn in `eVth2`: development `#2D6ABE`, web-development `#2D9ABE`, game-design `#4D2DBE`, 2d-art-animation `#BE362D`, 3d-art-animation `#BE6D2D`, management `#416CAA`, game-writer `#A18F26`, learning `#26A17A`, technical-art `#709924`, music-sound `#2D80BE`, marketing `#BE5B2D`, vfx `#7F2DBE`, qa `#26A14B`, hr `#BE2D73`, video-editing `#BE2DB1`, backend-development `#2D47BE`, investment `#26A151`, other `#7F776C`; host = brand `#F15541`.
- **Layout grid.** The broadcast stage sits on the editor grid (20px cells, 100px majors, origin at the stage's top-left). Stage padding 20, every gap 20, rail 60 wide (padding 24/8, icons 4 apart, exactly the stage height), tiles start at the stage top. All tiles in a layout are the same size; an incomplete last row is centred. Screen share: share 1480 wide, side column 300 with its cameras splitting the full height (gap 20).
- **Rail shape.** A slim dark capsule in the video tiles' language: `#1C1D1F` at 90%, radius 999, hairline `#4C4E52` like the tiles, soft drop shadow; host's selected colour is the brand `#F15541`; no speciality → `other`.
- **Fallback.** A guest without a speciality falls back to direction "other" (`IconShape`, neutral tint).
- **Plates.** Each plate reads "Name · Role".
- **Screen share.** A share is a source of its own, listed as a child row of its owner, with its own on-screen toggle; it moves with the owner. When a share is on screen, the composition switches to the screen-share layout (`a4W1A9` / `JwXxU`): the share takes the main area, and the on-screen cameras go to the side column in list order. A camera is never drawn under or behind the share (this was a bug in older versions).
- **Grid for any count.** Same rule as for 1–5, with no cap:
  - `cols = ceil(sqrt(n))`, `rows = ceil(n / cols)`;
  - every row but the last is full, and the last row is centred;
  - examples: 1 and 2 = one row; 3 = 2 + 1; 4 = 2 + 2; 5 = 3 + 2; 7 = 3 + 3 + 1; 10 = 4 + 4 + 2; 15 = 4 + 4 + 4 + 3.
  - Tiles keep the source frames' plate, gap and editing-frame styling at every count. No separate frames are needed.

## 5. Components

| Block | Source |
|---|---|
| Page shell, top bar | existing `ProtectedShell` |
| Status in title row | `StatusDot`: "Room closed" (disabled), "Room open · not on air" / "Room open" (success), "Waiting for the host" (warning). On air uses the call room's red dot + 600 word, as in `Ay58j`. |
| Call stage, tiles, controls | Daily call (`@daily-co/daily-react`) in a new `src/components/live/LiveStage/` on `InverseBand`; tile label = scrim chip "Name · Role". |
| Pre-join | checkpoint pre-join pattern; antd `Select` / `Input` (`variant="filled"`; role required), `Button` (white with ink label on the dark band). |
| Broadcast settings | antd `Form` (vertical), `Input`, `Input.Password` (key), all `variant="filled"`. New `src/components/live/BroadcastSettings/`. On air: the title becomes `Typography.Text editable` (applies live on save); RTMP + key read-only with a lock. |
| Program preview | new `src/components/live/ProgramPreview/` — the VCS composition rendered in the browser. Its colours are broadcast art, allowlisted in the tokens guard. |
| Guests / People panel | new `src/components/live/ParticipantsPanel/` with `readOnly`: antd `List`, `AppAvatar`, `Button shape="circle"` (mic, on screen), `Tooltip`; sortable rows (dnd-kit, already used in the repo if present, otherwise the lightest sortable list) with share rows grouped under their owner; anatomy above. |
| Edit name and role | one `Popover` (`EditIdentityPopover`) with `Input` × 2 (`variant="filled"`) + `Button`s, shared by admin rows, the guest's own row and the guest's stage pencil. |
| Direction icon | `getWorkDirection(speciality)` from `src/components/DirectionBadge/directions.ts`; host = microphone; no speciality = "other". |
| Empty guests / room ended | `EmptyState` + `IconTile` (neutral). |
| RTMP rejected | antd `Alert type="warning" showIcon closable`. |
| End room | `Modal.confirm` with `okButtonProps={{ danger: true }}`. |
| Muted notice | antd `message.warning` (top). |
| Loading | antd `Skeleton` / `SkeletonLine`, `PageLoading` pattern. |

Icons (Tabler; the canvas uses lucide stand-ins): host `IconMicrophone2`; directions from the config (e.g. development `IconCode`, 3D art `IconBox`, sound `IconHeadphones`, game design `IconPuzzle`, other `IconShape`); mic `IconMicrophone` / `IconMicrophoneOff`; on screen `IconEye` / `IconEyeOff`; drag `IconGripVertical`; camera `IconVideo` / `IconVideoOff`; screen share (state icon and the child row's label) `IconScreenShare`; panel counter / tile badge `IconCast`; edit `IconPencil`; start `IconBroadcast`; stop `IconPlayerStopFilled`; end / leave `IconPhoneOff` / `IconLogout`; open room `IconDoor`, closed `IconDoorOff`; waiting `IconHourglass`; disabled `IconLock`; warning `IconAlertTriangle`; RTMP `IconLink`; key `IconKey`; remembered `IconDeviceDesktopCheck`.

## 6. Tokens

- Colour: `--gd-color-bg` (page), `--gd-color-border` (panel outline, row separators), `--gd-color-border-strong` (outlined buttons, share-row tree connector, origin slot while dragging), `--gd-color-surface` (popover, modal, message, default round buttons, lifted row), `--gd-color-text` / `-text-secondary` / `-text-tertiary`, `--gd-color-action` + `--gd-color-on-action` (Start/Stop broadcast, Save, active On screen button), `--gd-color-accent` (2px On screen tile outline, read-only on-screen eye, drop line), `--gd-color-border-focus` (focused input), antd `colorFillTertiary` (filled inputs), `--gd-danger-solid` / `-tint` / `-on-tint` (End room, muted mic, on-air word), `--gd-warning-solid` / `-tint` (RTMP warning Alert, waiting dot; the Alert border is antd's `colorWarningBorder`), `--gd-success-solid` (room open dot), `--gd-neutral-100` (IconTile, skeleton, disabled button fill), `--gd-scrim-chip` (tile labels), `--gd-direction-<slug>-tint` (broadcast accent only). Dark stage: inverse roles via `InverseBand`, inverse `--gd-fill-base` for round controls and pre-join inputs.
- Space: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 only.
- Video overlays (tile labels, on-screen badges, name pills on the self-preview) use `$scrim-chip` (`scrim.chip`, 70% neutral-950). Input/Select inner padding 12 (theme `Input.paddingInline = space[3]`). Mic level bars are pills.
- Hit targets: the row pencil (24 visual) and the drag handle (16 visual) extend their hit area to 32×32 (padding + negative margin) — the visuals stay small to keep rows compact; every round button is 32.
- Radius: chip 8 (tile labels, tooltip, row pencil), control 14 = `$radius-md` (inputs, selects, buttons, origin slot; the `00.10` reference still draws 10 — stale), card 16 (tiles, popover, modal, lifted row), panel 20 (stage, panels), pill (avatars, round buttons, drop line).
- Controls: 40 header buttons and inputs; 32 round buttons in rows (28 on the share row) and popover buttons; 44 round call controls (as in the call room); 48 Join / Open room.
- Elevation: e3 for popover, modal, message and the lifted row; e0 everywhere else.

## 7. States

| State | Admin | Guest |
|---|---|---|
| Loading | `EKGST` | `EKGST` |
| Room closed | `YyNTX` | `IYA3O` — polls; becomes `EG8S8` when the room opens |
| Gathering | `G8Fup`; Start broadcast disabled until RTMP URL + key are filled (lock + tooltip) | `H4gx7n` with "Room open" instead of On air |
| On air | `D14pi`; title editable, RTMP + key locked | `H4gx7n` |
| Reordering | `o3sfoy`; the broadcast reorders on drop, not during the drag | People reorders on drop |
| Sharing screen | child row under the owner with its own eye toggle | read-only child row |
| Off screen (guest) | — | title row shows `IconCastOff` + "You're off screen"; no eye in their People row |
| Muted by host | row mic button red tint, "muted by you" on line 2 | `message.warning` "The host muted you", own mic button red, mic-off in People; the guest may unmute |
| Role empty at join | — | Join disabled until Role has text; a guest without a speciality starts empty |
| Guests empty | `ED2Mq` | — |
| RTMP rejected (warning) | `gzBbw` — warning Alert, the call continues, retry with Start broadcast | nothing changes for guests (not on air) |
| Room ended | admin returns to `YyNTX` | `Yc4CQ` — also when the admin's tab closes |
| Load error | `LoadError` in place of the stage ("Couldn't reach the room" + Retry) | same |
| Not signed in | auth redirect (no anonymous guests) | same |
| No camera permission | pre-join camera tile shows `IconVideoOff` + "Allow camera access in the browser"; Join works audio-only | same |

## 8. Copy (English defaults, Tolgee keys suggested)

| Key | Text |
|---|---|
| `live.sborka.title` | Sborka |
| `live.sborka.crumb` | Live studio |
| `live.sborka.status.closed` | Room closed |
| `live.sborka.status.open` | Room open · not on air |
| `live.sborka.status.openGuest` | Room open |
| `live.sborka.status.waiting` | Waiting for the host |
| `live.sborka.status.onAir` | On air · {time} |
| `live.sborka.sub.closed` | Live studio · nobody can join until you open the room |
| `live.sborka.sub.inCall` | Live studio · {count} in the call |
| `live.sborka.sub.onAir` | Live studio · {count} in the call · {onScreen} on the broadcast |
| `live.sborka.sub.hostedBy` | Live studio · {count} in the call · hosted by {name} |
| `live.sborka.closed.title` / `.line` | The room is closed / Guests waiting on this page can join once you open it. |
| `live.sborka.action.openRoom` / `.endRoom` / `.startBroadcast` / `.stopBroadcast` / `.leave` | Open room / End room / Start broadcast / Stop broadcast / Leave |
| `live.sborka.startDisabled` | Add the RTMP URL and stream key to start the broadcast. |
| `live.sborka.stage.notOnAir` / `.onAir` | Not on air / On air |
| `live.sborka.tile.onScreen` | On screen |
| `live.sborka.broadcast.title` / `.notOnAir` | Broadcast / Not on air |
| `live.sborka.broadcast.showTitle` / `.showTitleHelp` | Show title / Shown in the top bar of the broadcast. |
| `live.sborka.broadcast.rtmpUrl` / `.streamKey` / `.streamKeyPlaceholder` | RTMP URL / Stream key / From YouTube Studio or similar |
| `live.sborka.broadcast.remembered` | RTMP URL, key and title are remembered in this browser. |
| `live.sborka.broadcast.keyHidden` / `.lockedOnAir` | key hidden / locked on air |
| `live.sborka.program.title` | Program |
| `live.sborka.guests.title` / `live.sborka.people.title` | Guests / People |
| `live.sborka.guests.onScreen` | On screen {count} of {total} |
| `live.sborka.guests.you` | (you) |
| `live.sborka.guests.cameraOn` / `.cameraOff` / `.sharing` / `.mutedByYou` | Camera on / Camera off / Sharing screen / muted by you (the first three as icon tooltips) |
| `live.sborka.guests.mute` / `.unmute` / `.edit` / `.drag` | Mute / Unmute / Edit name and role / Drag to reorder (tooltips, aria) |
| `live.sborka.guests.showOnBroadcast` / `.removeFromBroadcast` / `.onScreenTip` | Show on broadcast / Remove from broadcast / On screen (tooltips) |
| `live.sborka.guests.screen` | Screen |
| `live.sborka.role.host` | Host |
| `live.sborka.edit.name` / `.role` / `.help` | Display name / Role / Both show in the call and on the broadcast. |
| `common.cancel` / `common.save` | Cancel / Save |
| `live.sborka.guests.empty.closedTitle` / `.closedLine` | Nobody here yet / Guests appear here once you open the room. |
| `live.sborka.guests.empty.title` / `.line` | No guests yet / Guests appear here as they join. |
| `live.sborka.endConfirm.title` | End the room for everyone? |
| `live.sborka.endConfirm.content` | All {count} people leave the call and the broadcast stops. You can open the room again later. |
| `live.sborka.warning.title` / `.rtmp` | The broadcast didn't start / The streaming server refused the connection. Check the RTMP URL and stream key, then start again. |
| `live.sborka.waiting.title` / `.line` / `.button` | Waiting for the host / This page updates by itself when the room opens. / Waiting for the host… |
| `live.sborka.join.title` / `.line` / `.name` / `.button` | The room is open / {host} and {count} others are in the call. / Your name in the call / Join |
| `live.sborka.join.role` / `.roleHelp` | Role / Shown on the broadcast. Defaults to your speciality. |
| `live.sborka.me.onScreen` / `.offScreen` | You're on screen / You're off screen |
| `live.sborka.mutedByHost` | The host muted you |
| `live.sborka.ended.title` / `.line` / `.button` | The room has ended / The host closed the room. Thanks for taking part. / Go to Hub |

The show title, names and roles are user content (the show title is Russian on air), not keys.

## 9. Data needs (domain level)

- Room state: open or closed; broadcast state (off / starting / on air since {time} / failed with reason).
- Participants (live, from the call, visible to everyone in the room): id, GDHub user id, display name, role (free text), work direction slug (icon and broadcast tint; host → mic + brand; none → "other"), position in the list, on screen (camera), mic on, camera on, sharing screen + share on screen, is admin, is active speaker.
- Current user before joining: display name from the profile; speciality name (role default) and its work direction.
- Admin actions: open room; end room; set a guest's name and role; set camera / share on screen; set the list order; mute / unmute a guest; start broadcast (show title, RTMP URL, stream key); change the show title on air; stop broadcast. Refused server-side without `hub.live_room.manage` — except a guest changing their own name and role.
- Push or short polling: the waiting screen, the people list and its order, on-screen flags and the mute notice change without reload.
- Stream settings (title, RTMP URL, key) are kept in the admin's browser only, not on the server.

## 10. Decisions and open questions

Decisions:

- **Role is free text, prefilled from the speciality.** The direction derived from it gives the icon in the lists and the rail, and the speaker's accent on the broadcast. The host gets the mic and the brand accent.
- **Compact rows with an inline pencil.** The pencil sits right after the name, so editing belongs to the person, not to the row's control column. One Popover edits name and role, for the admin on any row and for a guest on their own.
- **On screen is a round eye toggle**, the layer-visibility metaphor, the same shape as the mic. Active = graphite fill (commit style), so it never reads as the red "muted". The stage marks on-screen tiles with a 2px accent outline + "On screen" badge. There is no cap.
- **One list drives the picture.** Drag order = tile order = rail order, so the admin never has to set order in two places. A screen share is a compact child row (tree connector, "Screen", its own eye) that moves with its owner.
- **Everyone sees the list.** Guests get the same panel read-only (no handles), with on-screen shown as an eye (a state, so not a Tag).
- **The admin is a row in the list** (Host, on screen by default).
- **On air:** Program moves to the top; the show title stays editable inline; RTMP and key are locked.
- **RTMP rejected is a warning, not an error.** The call is unaffected; only the stream failed to start.
- **Forms are `variant="filled"` everywhere**, per §7 of the guidelines.
- **Stop broadcast is the graphite primary**, not red. **End room** is red (outlined in the header, filled only in the confirm).
- **Open room / Join are white buttons on the dark stage**, per the InverseBand rule.
- No hub sub-nav item: the page is reached by URL only.

Resolved: the title is editable on air; RTMP URL, key and title are remembered in the admin's browser; roles are free text; remote unmute is allowed; there is no on-screen cap; the Program preview is the in-browser VCS render (accepted); the order is set by dragging rows (default join order); any count uses the grid rule in §4, so no 6–15 frames are needed.

Still open: none.

- **Original / Preview tabs.** Everyone's stage is two antd `Tabs`: *Original* — the call itself with its controls; *Preview* — the Program picture, available at any time, on air or not (03.15.3 drew it stacked above the call, on air only). The picture is set up before the stream starts, and where streaming is off it is the only way to see it. Guests get the same tabs: the order, who is on screen and the title come to them through the meeting session data, and they already receive every video in the call.
