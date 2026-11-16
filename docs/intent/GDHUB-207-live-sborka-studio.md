# GDHUB-207 — Live studio "Sborka"

[Linear](https://linear.app/gdhub/issue/GDHUB-207/live-studiya-sborka-komnata-liveroomsborka-s-efirom-po-dizajnu) · intent written 2026-11-16

## Want

A hub admin runs the "Sborka" show from one page, `/live/room/sborka`. They open
the room, the invited people — any signed-in GDHub user who has the link — join
it, and the admin directs the call: names and roles for each guest, who is
heard, who is on screen. When the admin is ready, they start the broadcast to
an RTMP target (YouTube or similar); the broadcast picture follows the Sborka
design rather than Daily's stock grid. When the admin leaves, the call and the
broadcast end for everyone.

Guests wait on the page until the admin opens the room, then join. Before
joining, a guest sets their role — prefilled with the name of their GDHub
speciality — and can change their name and role later; the admin can change
anyone's. Everyone in the room sees the list of who is there (name, role, mic,
camera, on screen); only the admin can act on it.

## Why now

The show needs a branded picture and a director's control over it. The current
`/live/room/reports` streams Daily's baseline grid, shows everyone at once,
and is limited to people holding `hub.live_room.use`.

## Constraints

- Video: Daily (`gdhub.daily.co`), already paid for and used by checkpoint calls
  and `/live/room/reports`. Reuse `src/services/daily.ts` for the REST calls.
- The broadcast picture is a custom VCS composition (daily-vcs SDK) uploaded
  with `startLiveStreaming` — the design in Pencil: frames `nE9Pr` (viewer, 4),
  `c3g4r` (1), `C7Fcx` (2), `Nwc9U` (3), `ZZvFs` (5), `JwXxU` (screen share),
  `IjTR3` (video off). The left rail shows an icon per on-screen participant,
  taken from the work direction of their speciality (code, art, sound, …; the
  host gets the mic), and lights up the active speaker's. The role itself is
  free text.
- Only `hub.live_room.manage` opens the room, starts and stops the broadcast,
  and directs guests. Any signed-in user may enter as a guest; no anonymous
  guests.
- No links or menu entries lead to the page; it is reached by URL only.
- No database change: the room's state lives in Daily (room exists = call is
  open; names and roles in participant data).
- Streaming costs per minute: the broadcast runs only between the admin's
  "Start broadcast" and "Stop" / leaving, never with the call alone.
- `/live/room/reports` keeps working as it is.

## Done when

- [ ] A signed-in non-admin opening `/live/room/sborka` before the admin sees a
      waiting screen; it turns into the join screen by itself once the admin
      opens the room.
- [ ] A non-admin cannot open the room, start a broadcast, mute, rename or
      reorder anyone — the API refuses, not only the UI.
- [ ] Everyone in the room sees every participant in a list with name, role,
      mic, camera and on-screen state; only the admin's list has controls.
- [ ] A guest's role is prefilled with their speciality's name and can be
      changed before and after joining.
- [ ] The admin can mute and unmute a guest's microphone.
- [ ] The admin can pick which guests are on the broadcast screen (e.g. 2 of 5);
      the others stay in the call, off screen. No hard cap; the layout is
      designed to stay readable up to 15.
- [ ] The admin drags participants to set the broadcast order; a shared screen
      is listed under its owner, moves with them and has its own on-screen
      toggle; a camera is never drawn under a shared screen.
- [ ] The admin can rename a guest and set their role; a guest can rename
      themselves; the new name shows in the call and on the broadcast.
- [ ] The admin enters the stream title and RTMP URL + key (remembered in the
      admin's browser) and starts the broadcast after the call has gathered;
      the title can be changed on air; the picture follows the design for
      1–5 people, screen share and video-off.
- [ ] When the admin leaves (button or closed tab), everyone is ejected and the
      broadcast stops.

## How to check it on the platform

1. `/dev-signin` as the hub admin → `/live/room/sborka` → "Open room".
2. Second isolated browser context, `/dev-signin` as a member →
   `/live/room/sborka`: waiting screen before step 1, join screen after it.
3. As admin: rename the member, give them a role, mute/unmute, toggle them on
   and off screen; check the member's tab reflects each change.
4. As admin: enter a test RTMP target, "Start broadcast", watch the output;
   leave the room — the member is ejected, the stream ends.

## Out of scope

- Showing the broadcast to viewers on GDHub itself (the RTMP target is external
  for now).
- Guests without a GDHub account, scheduling, invitations, chat, recording.
- Changing `/live/room/reports` or the checkpoint call room.

## Open questions

- Remote unmute: Daily allows owners to unmute others but discourages it.
  Assumed: the admin can unmute; revisit if guests object.
- Daily plan must allow VCS custom compositions (paid plans). Assumed: it does,
  as cloud recording already works.
- The admin's Program preview is the same VCS composition rendered in the
  browser, not the real output stream — accepted.
