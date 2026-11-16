# Live studio "Sborka"

[GDHUB-207](https://linear.app/gdhub/issue/GDHUB-207) · intent: [docs/intent/GDHUB-207-live-sborka-studio.md](../intent/GDHUB-207-live-sborka-studio.md) ·
design: frames 03.15.1–20 in `docs/design/platform-design.pen`, handoff [docs/design/specs/live-sborka.md](../design/specs/live-sborka.md) ·
flow: [sborka-flow.d2](sborka-flow.d2)

A hub admin runs a show from `/live/room/sborka`: opens a Daily room, lets
guests in, directs who is on the broadcast and streams it to an RTMP target in
the Sborka design. No link on the platform leads to the page.

## Who may do what

| | any signed-in user | `hub.live_room.manage` |
|---|---|---|
| See whether the studio is open, wait, join | yes | yes |
| Open / end the room | — | yes (`POST` / `DELETE /api/live/sborka`) |
| Mute, rename, reorder, put on screen, broadcast | — | yes, as the Daily room's owner |
| Rename themselves | yes | yes |

## Where the state lives

No database. Daily holds all of it:

- **Room exists = studio open.** `POST` creates the room `sborka` (12 h expiry),
  `DELETE` deletes it, which ejects everyone.
- **Guests' names and roles** — Daily `user_name` and `userData` (`role`, `direction`).
  The host renames someone by an app message the guest's browser accepts only
  from the room owner.
- **The host's decisions** — Daily meeting session data, `SborkaDirection`
  (`order`, `onScreen`, `title`) in `src/lib/live/sborka.ts`. Guests read it.
  A guest could overwrite it from the console; it would only change what the
  guests see — the broadcast is built from the host's browser.
- **Stream target** — the host's `localStorage`.

## The show ends with its host

The host's "End room" and the tab's `pagehide` both delete the room. If the
tab dies without either, one guest's browser (the lowest session id left) sees
the owner leave and calls `POST /api/live/sborka/host-left`; the server asks Daily who is present and
deletes the room only when none of them may host.

## Broadcasting is switched on per environment

`DAILY_LIVE_STREAMING=1` allows "Start broadcast"; without it the button stays
locked with the reason. Set it only where the Daily domain's live streaming is
set up and paid for — never on `gdhub-dev.daily.co`. Every minute in a room is
billed, streaming on top: close a test room as soon as the check is done.

## The broadcast picture

Daily's `daily:baseline` VCS composition with our `components/VideoGrid.js`
uploaded as a session asset (`public/vcs/sborka/VideoGrid.js`), plus PNG art
(logos, editor grid, the direction icons — `bun scripts/live-sborka-assets.ts`
regenerates the icons and the grid). Parameters are flat strings, set by
`streamStartLayout` / `streamUpdateLayout`; every change while on air is sent
again with the participant filter, which Daily otherwise resets.

Daily fetches the assets from the app's origin, so a broadcast only works from
a deployment Daily can reach — not from `localhost` (use the ngrok tunnel to
try it locally). Fonts are Daily's: Roboto, since Onest is not on its servers.

The admin's Program preview (`ProgramPreview.tsx`) draws the same layout in the
browser from the same `tileFrames()`.

## Not done

- Showing the broadcast on GDHub itself; guests without an account.
- The broadcast picture for more than 15 cameras is not designed (the grid rule
  still applies).
- The e2e stand's emulated Daily does not implement live streaming or meeting
  session data; there is no e2e spec yet.
