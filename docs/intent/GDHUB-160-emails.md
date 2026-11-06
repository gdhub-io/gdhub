# GDHUB-160 — Emails

[Linear](https://linear.app/gdhub/issue/GDHUB-160) · intent written 2026-11-06

## Want

Every email GDHub sends looks like GDHub: one minimal layout in the design
system's style, the same logo, type and button everywhere. A link in an email
lands where it says. "Open the conversation" opens that conversation in the chat
drawer, not the bare hub. Every picture in an email shows up, including the
sender's avatar and the image someone posted in the chat.

## Why now

The chat notification emails still carry Element/Riot's stock template, with
matrix.org, riot.im and element.io logos and riot.im placeholder avatars. Their
links point at `/hub#/room/…`, which nothing reads, so the reader lands on the
hub with no chat open. Avatars and message images point at `matrix.gdhub.io`
media, which answers 404 to an unauthenticated mail client (Synapse serves
authenticated media only). The sign-in and registration emails are the first
thing a new user sees. They are authored in Brevo's UI, are not in git and have
never been designed.

## Constraints

- **Design first.** One email layout and every email are drawn in
  `docs/design/platform-design.pen` and approved before code. The style is
  minimal, built from the design system's tokens (`src/config/design`).
- **Email clients are not browsers.** Tables and inline styles, a light
  background, no web fonts or CSS variables, a 600px column. Tokens are resolved
  to literal values at build time, never hand-typed.
- **The four senders stay.** Synapse sends chat notifications, Novu sends product
  notifications (`default-message`, team invitations, events, project news),
  Brevo sends sign-in and registration, and SMTP to MailHog is used in dev.
  This work changes what they send, not who sends it.
- **Bodies live in git.** Novu workflows move to code (`@novu/framework` +
  `@react-email/components`, both already installed). Sign-in and registration
  are rendered by the app and sent through Brevo's transactional API, which
  retires the Brevo-hosted templates 1–4. Synapse templates stay Jinja in
  `matrix-chat-server`.
- **Old links keep working.** Emails already sent link to `/hub#/room/…`; that
  shape opens the right room too, alongside `/chat#/room/…`.
- **Media proxy is not a hole.** Images reach the mail client through an app
  endpoint that accepts only a signed, expiring URL for one media id and size.
  It never serves an unsigned id, so the media store does not become public.
- **English only.** Every email is in English, whatever the reader's locale;
  the Brevo ru templates (3, 4) retire with the en ones.

## Done when

- [ ] A chat notification email shows the GDHub layout, with no Element, Riot
      or matrix.org branding anywhere in it.
- [ ] Its "open" link opens the chat drawer on that room, for a signed-in reader
      and for a signed-out one after sign-in.
- [ ] An old `/hub#/room/<id>` link opens the same room.
- [ ] The sender's avatar, the room avatar and a posted image render in Gmail
      with images enabled. A sender without an avatar shows initials, not a
      riot.im placeholder.
- [ ] An unsigned or expired media proxy URL answers 403 or 404.
- [ ] Sign-in and registration emails (English only) come out of the repo in the
      same layout, and the magic link signs the reader in.
- [ ] Every Novu email the app triggers (10 workflows) is rendered from code in
      the same layout, and its links point at real pages.

## How to check it on the platform

- **Chat:** at `/dev-signin`, sign in as two personas in isolated contexts.
  A sends B a message with an image, and B stays offline. When the Synapse
  notification email arrives in local MailHog (`:8025`), check the layout, the
  avatars and the image, then click "open". It should open the drawer on A's
  conversation.
- **Old link:** open `http://localhost:3000/hub#/room/<roomId>` while signed in.
  The drawer should open on that room.
- **Proxy:** `GET /api/chat/media/<id>?…` with the signature removed should
  answer 403.
- **Auth:** sign out, request a magic link on `/signin`, check the
  email in MailHog and follow the link.
- **Novu:** the Novu dev studio (`npx novu dev`) previews each workflow. Trigger
  one for real, for example a team invitation from the project team page, and
  check it in MailHog.

## Out of scope

- New notifications or new triggers. Only the emails that are already sent.
- Digest and batching rules, unsubscribe preferences, and the in-app inbox.
- Push notifications and their copy.
- Dark-mode-specific email variants beyond not breaking in dark clients.
- Synapse's account pages (password reset, SSO, registration HTML). Our users
  never see them.

## Open questions

- Does Brevo stay the sender for auth, or does Novu take it? *Assumed: Brevo
  stays; only the body moves into the repo.*
- Chat email decisions (2026-11-06): every room keeps its own primary button,
  the rooms are equal; message times are server time with the zone shown
  ("14:32 UTC"); an email without message bodies (for example an encrypted
  room) is its own state, "you have unread messages", with no text.
- How long does a signed media URL live? *Assumed: 30 days, long enough for a
  notification to be read.*

## Before release — remind Dmitry

- [ ] Production Synapse: `email.client_base_url: "https://gdhub.io/chat"` in
      `homeserver.yaml`, then restart Synapse. Dmitry does this on the server.
- [ ] Deploy the new Synapse templates from `matrix-chat-server` to the server.
