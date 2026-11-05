# GDHUB-155 — Announcements channel, rich messages and mute in chat

[Linear](https://linear.app/gdhub/issue/GDHUB-155) · intent written 2026-11-05

## Want

Every GDHub user finds an **Announcements** chat pinned at the top of their chat
list. Posts there come from **GDHub** itself — the founder and hub admins write
them, but they appear under the GDHub name and logo; everyone else reads and
reacts with emoji, and is notified — push and the "you missed messages" email — exactly
as for any other chat. Nobody can leave it, but anyone can mute it.

Alongside, every chat gets what Matrix already offers: links are clickable and
show a preview, images can be attached, a YouTube link plays inline, and any chat
can be muted.

## Why now

There is no way to tell all users something inside the product: news goes out by
hand, outside the platform, and nobody sees it where they work. Chat today is
plain text only — a link is not even clickable — which is too poor for news and
already awkward in ordinary conversations.

## Constraints

- Matrix does the work: the room's power levels decide who posts, reacts or
  attaches; Synapse push rules and the existing email pusher send the
  notifications. No parallel permission or notification system in the app.
- Posts are sent by a dedicated GDHub Matrix account (name "GDHub", the logo as
  avatar), never by the admin's own account. The admin writes in the app; the
  server checks the role and posts as GDHub through the application service, so
  the GDHub account is the only one with the power level to post. Everyone else
  is at 0; `m.reaction` and `m.room.redaction` are open at 0 so a reader can add
  and remove their own reaction. No replies or threads for readers.
- The room lives in the `ChatRoom` registry as a new kind `Announcements` — a
  change in `gdhub-prisma`, released before this branch uses it.
- Existing chat kinds and flows, Novu notifications and the email pusher setup
  stay as they are.
- Link previews come from Synapse's `preview_url`; it must be switched on in the
  server config (`url_preview_enabled`) — Dmitry's operation.
- YouTube plays from youtube-nocookie.com and loads only on click, so nothing
  reaches Google before the user asks.
- Synapse purges media nobody has opened for a year (`media_retention`, set in
  matrix-chat-server together with `max_upload_size: 10M` and the preview
  settings). Profile avatars are Synapse media too, so the app marks each one it
  uploads as protected; otherwise a quiet user's avatar disappears.
- Images are compressed in the browser before upload (longest side 2560 px), so
  a phone photo fits well under the 10 MB limit.

## Done when

- [ ] A new user, after first sign-in, has Announcements at the top of the chat
      list without accepting an invite; existing users have it after the backfill.
- [ ] A member sees no message composer in Announcements, can add and remove a
      reaction, and has no "leave" action.
- [ ] A hub admin and the founder can post there, and the post shows as GDHub
      (name and logo), not as them; a member promoted to hub admin can post, one
      demoted cannot.
- [ ] A post notifies members by push, and by the missed-messages email if unread;
      a reaction notifies nobody.
- [ ] In any chat: a URL is clickable and shows a preview card; an image can be
      attached and opens full size; a YouTube link shows a player that loads on
      click.
- [ ] Any chat can be muted and unmuted; a muted chat sends neither push nor email.
- [ ] An attached phone photo arrives compressed (longest side ≤ 2560 px), and
      a user's Matrix avatar is protected from the yearly media purge.

## How to check it on the platform

1. `/dev-signin` as a member → open chat → Announcements is first; no composer;
   add a 👍 to a post, remove it; the room menu has Mute, not Leave.
2. As the super admin (founder) and as a hub admin → post text with a link, an
   image and a YouTube link → preview card, thumbnail, click-to-play player.
3. Back as the member (isolated context) → the post arrives with a toast; leave
   it unread → the missed-messages email arrives (Synapse email delay).
4. Member mutes Announcements → founder posts again → no toast, no email.
5. Any Direct chat → send a link and an image → same rendering as in step 2.

## Out of scope

- Uploading video files — YouTube links only.
- Replies, threads or comments under announcements, and threads in any chat —
  Matrix supports them, but they are not wanted.
- Several channels, per-space or per-hub announcements, scheduling posts.
- Novu for chat messages — notifications stay with Synapse.
- Group chats for projects, events and courses.

## Open questions

- Brevo budget: one post emails every user who does not read it within Synapse's
  delay, out of the Starter plan's 10,000 emails a month shared with all other
  mail (about 50 sent in early November). *Assumed:* a few posts a month fit;
  watch the credit after the first ones and raise the plan if they do not.
- Image size limit. *Assumed:* Synapse's `max_upload_size` as configured; the
  composer shows the server's limit when a file is too big.
- Who may post as GDHub. *Assumed:* super admin and hub admin roles, checked by
  the app on every post; nobody but the GDHub account holds a posting power level.
