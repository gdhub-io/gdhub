# Announcements, rich messages and mute

Spec for [GDHUB-155](https://linear.app/gdhub/issue/GDHUB-155). The goal and its
limits are in the intent, [docs/intent/GDHUB-155-chat-announcements.md](../intent/GDHUB-155-chat-announcements.md);
this file says how it works. Frames: `docs/design/platform-design.pen`, 07.03 (row
and menu states), 07.08 (Announcements), 07.09 (message content types).

Diagrams: [announcements-flow.d2](announcements-flow.d2),
[rich-messages-flow.d2](rich-messages-flow.d2).

## Announcements

**The GDHub account.** A dedicated Matrix user, `@gdhub:<domain>`, display name
"GDHub", the brand mark as avatar. It is not a platform user. The app acts as it
through the application service (the appservice namespace already covers it), so
no password exists for it.

**The room.** Created once, by the GDHub account, and recorded as a `ChatRoom`
row with `kind = Announcements` and `directKey = "announcements"`. Asking again
returns the same room. Power levels:

| What | Level |
|---|---|
| GDHub account | 100 |
| everyone else (`users_default`) | 0 |
| `events_default` (posting, attaching) | 100 |
| `m.reaction`, `m.room.redaction` | 0 — a member adds and removes their own reaction |
| `redact` (removing someone else's event) | 100 |
| state events, invite, kick, ban | 100 |

The room is not public and not in the directory; join rule `invite`.

**Membership.** The GDHub account invites a user and the app joins them at once
(`autoJoinRoom`, as for checkpoint rooms) — no invite screen. This happens:

- when the user's chat session starts (`POST /api/chat/session`), after the
  response, best-effort. A confirmed membership is remembered for a day, so the
  usual cost is one Redis read;
- for existing users, once, by `bun run chat:announcements-backfill`
  (`--dry-run`; `:prod` for production), which also protects every existing
  Matrix avatar from the media purge.

Leave is not offered in the UI. A user who leaves through another Matrix client
is joined back on a chat session start a day later at most.

**Posting.** The composer in Announcements is shown only to a super admin or a
hub admin. It does not send through the browser's Matrix session. It calls
`POST /api/chat/announcements` with the text and, for an image, the `mxc://` URI
the browser has already uploaded. The route checks the role on every call, then
sends the event as the GDHub account. A post is never sent from the admin's own
account, so an admin using another Matrix client still cannot post.

**Editing and deleting.** For the same admins, GDHub's posts are `manageable` in
the timeline: Edit (text, or an image's caption), Replace image and Delete. They
go through `PATCH` and `DELETE /api/chat/announcements/{eventId}`, which re-check
the role and act as GDHub — an `m.replace` edit, or a redaction scoped to the
Announcements room. Members see Copy only.

**Timeline.** Membership events ("joined", "was invited") are hidden: everyone
joins, and a line per newcomer would bury the news. Every post shows the GDHub
mark from `/favicon.svg`; the Matrix avatar (a 512 px PNG,
`public/images/gdhub-mark-512.png`) is for push, email and other clients.

**Notifications.** Nothing new. Synapse's default `.m.rule.message` notifies on
messages in group rooms. Push goes out through the existing pusher and the
missed-messages email through the existing email pusher. Reactions do not
notify. The in-app toast already fires on `m.room.message`; it shows "GDHub ·
Announcements" because the sender is the GDHub account.

**List.** Announcements is sorted first, whatever its last activity, with the pin
mark and a hairline under it (07.03). The row menu has Mark as read and Mute only.

## Rich messages, in every chat

- **Links** in a text body become clickable (opening in a new tab). The first
  link gets a preview card. The card data comes from Synapse
  `GET /_matrix/client/v1/media/preview_url`, so the reader's browser does not
  contact the linked site. No card if the server returns nothing.
- **Images.** The browser shrinks the image (longest side 2560 px, JPEG/WebP)
  before uploading it to the Matrix media repository. It then sends `m.image`
  with `info` (w, h, size, mimetype). Over 10 MB after shrinking, the chip shows
  "File too large (max 10 MB)" and nothing is sent.
- **Captions.** Text typed with an image is its caption, in the same event — the
  Matrix 1.10 form: `filename` names the file, `body` holds the caption. The
  bubble shows the picture with the caption under it. Edit on an image edits the
  caption; Replace image (own images in any chat, GDHub's for admins) swaps the
  picture and keeps the caption.
- **Media download is authenticated.** Synapse serves new media only with an
  access token, so an `<img src>` cannot point at it directly. The client fetches
  the thumbnail and the full image with the token and shows them as blob URLs,
  cached per `mxc://` URI.
- **YouTube.** A youtube.com or youtu.be link in the body gets a cover with a
  play button. The cover image comes from the same Synapse preview, never from
  `i.ytimg.com`. A click replaces it with a `youtube-nocookie.com` iframe.
- **Avatar protection.** Each avatar `ensureMatrixUser` uploads is marked
  protected (`POST /_synapse/admin/v1/media/protect/{mediaId}`), so the yearly
  `media_retention` purge keeps it. The GDHub account's avatar too.

## Mute, in every chat

Mute is a Matrix push rule on the user's account, not app state, so it holds for
push and email too:

- Mute: a room-specific `override` rule for the room with no notify action.
- Unmute: delete that rule.

The client reads the same rule to:

- skip the in-app toast;
- show the bell-off mark;
- grey the unread count;
- leave the room out of the launcher badge. It still shows under the Unread tab.

## Data

One schema change, in `gdhub-prisma`: `Announcements` is added to `enum
ChatRoomKind`. The room is one `ChatRoom` row:

| Field | Value |
|---|---|
| `kind` | `Announcements` |
| `directKey` | `"announcements"` (the unique key that keeps it single) |
| `isDirect` | `false` |
| `title` | `"Announcements"` |
| `status` | `Open` |
| `context` | `null` |

Not stored in the app database, on purpose:

- **Membership.** Every user is a member, so `ChatRoomMember` rows would only
  copy the user table. Matrix holds it.
- **Mute.** The push rule is the truth. `ChatRoomMember.notificationsMuted` stays
  unused, because two sources of truth for mute would disagree.
- **Posts and media.** Matrix only, as for every chat.

Configuration (`src/config`): the image limit (10 MB), the shrink size (2560 px)
and the GDHub account's localpart (`gdhub`).

## Departures from the frames

- The chat panel is pinned to the viewport's right edge (8 px) and framed like
  the notifications inbox: `border-subtle` hairline, card radius, `e3` shadow,
  with antd's own `drop-shadow` filter switched off. The chat-redesign spec had
  its right edge meet the avatar.
- The add-reaction chip shows in Announcements and under messages that already
  have reactions, not under every message.
