# GDHub Chat System

Architecture and rollout plan for all chat types. Based on the current code
(branch `dev`, 2026-07-02). User-flow diagrams: [docs/chat-flows/](chat-flows/)
(render with `d2 <file>.d2 <file>.svg`).

Related: [vacancy-chat-schema.md](vacancy-chat-schema.md) (ChatRoom schema change),
[vacancy-flow.d2](vacancy-flow.d2) (vacancy lifecycle).

## 1. Architecture

Two layers, strictly separated:

| Layer | Role | Where |
|---|---|---|
| **Matrix (Synapse)** | Transport only: rooms, messages, invites, read receipts, push | `src/services/matrix/*`, client via `/api/chat/session` |
| **`ChatRoom` registry (Prisma)** | App semantics: what a chat *is* (kind, context, status), dedup, close | `ChatRoom` / `ChatRoomMember` in `@gdhub-io/gdhub-prisma`, `src/services/chat/*` |

Core pieces:

- **`ensureChatRoom(args)`** ([src/services/chat/ensure-room.ts](../src/services/chat/ensure-room.ts)) —
  idempotent chat creation: upsert `ChatRoom` by `directKey` → if `matrixRoomId`
  already set, return existing → else create the Matrix room from the *initiator's*
  session (fresh SDK client, never the singleton), invite the counterpart,
  best-effort avatar + first message → save `matrixRoomId`, `status=Open`.
- **Provider registry** ([src/services/chat/providers.ts](../src/services/chat/providers.ts)) —
  `chatProviders[ChatRoomKind] = { buildContext, canClose }`. `buildContext`
  returns the typed context the frontend branches on (`type` string + data);
  `canClose` gates archiving. **Adding a chat type = one provider + one invite
  component, no new tables.**
- **Generic routes** (`src/app/api/chat/rooms/…`):
  - `GET rooms/[matrixRoomId]` — context resolution: registry → provider;
    legacy `AdviceRequest.matrixRoomId` fallback; else `{type:"default"}`.
  - `PUT rooms/[matrixRoomId]/resolve` — close/archive: `canClose` gate →
    `status=Closed`, `finishedAt` (legacy branch for AdviceRequest).
  - `POST rooms/[id]/invite-response` — Novu-notify the inviter about
    accept/decline (membership itself changes client-side via Matrix).
- **Frontend** (`src/components/Chat/`): `ChatProvider` (Matrix session, toasts,
  unread badge, push), `ChatModal` (drawer, fetches context), `ChatRooms`
  (sidebar — currently from Matrix `getRooms()`, not DB), `ChatMessages`
  (timeline + invite screen per type), `ChatTopic` (header + archive button),
  `special-messages/*Invite.tsx` (accept/decline per type).

Context `type` strings and their invite components:

| `type` | Kind | Invite component |
|---|---|---|
| `advice-request` | AdviceRequest (legacy path today) | `AdviceRequestInvite.tsx` — removed in Stage 1 (requester is auto-joined) |
| `vacancy-application` | VacancyOffer | `VacancyChatInvite.tsx` — after Stage 3 shown only for talent-pool offers; applied candidates are auto-joined |
| `default` | Direct / unknown | `DefaultInvite.tsx` |

## 2. Chat kinds — current vs target

| Kind | Participants | Initiator | `directKey` | Today | Target |
|---|---|---|---|---|---|
| `AdviceRequest` | requester ↔ expert | expert (on accept) | `advice:{adviceRequestId}` | **Legacy**: room in `AdviceRequest.matrixRoomId`, no `ChatRoom` row, `MatrixService` singleton | Registry: provider + `ensureChatRoom`, dual-write `matrixRoomId` during transition |
| `Direct` (today `AdminDirect`) | **any two users** — creation is admin-gated *for now* | admin (New chat button) | `direct:{minUserId}:{maxUserId}` | Matrix-only, no `ChatRoom` row; provider is dead code | Registry: generic 1:1 DM via `ensureChatRoom`; server-side dedup by `directKey`; opening it to all users later = relaxing the route gate only |
| `VacancyOffer` (apply) | candidate ↔ project author | **author** (from the candidates page) | `vacancy:{vacancyId}:{candidateUserId}` | Registry, but auto-created *by the candidate* on apply | Apply only stores an optional greeting; author opens/creates the chat; shared close helper, close on vacancy close / withdraw |
| `VacancyOffer` (talent pool) | specialist ↔ project author | author (Offer a position) | same as above | Backend ready (`POST rooms/vacancy` + first message), **no UI** | New UI: button + open-position picker + message |
| `ProjectGroup` / `EventGroup` / `CourseGroup` | domain members | system | — | Enum only, nothing implemented | Backlog (out of scope here) |

Two chat families:

- **1:1 request chats** (all four above): created on demand, counterpart lands in
  Matrix membership `invite` and sees an accept/decline screen, lifecycle
  `Open → Closed`.
- **Group chats** (project/event/course): membership mirrors domain membership,
  persistent, no accept step. Not part of this rollout.

## 3. Rollout stages

### Stage 0 — Matrix email notifications for offline users (done 2026-07-02)

Server audit found: SMTP in `homeserver.yaml` is configured and reachable
(Brevo), but **`user_threepids` was empty for all 354 users** — the platform
provisions Matrix users via the Admin API without binding an email, and the
old code sent a nonexistent `email` field. Synapse emails missed-message
notifications only to users with BOTH an email threepid and an email pusher,
so nothing was ever sent.

Fix (in [src/services/matrix/admin.ts](../src/services/matrix/admin.ts)):

1. `ensureMatrixUser` now binds the email as a threepid on creation and calls
   `ensureMatrixEmailNotifications` on every provisioning (idempotent,
   best-effort).
2. `ensureMatrixEmailNotifications(localpart, email)` — binds the threepid
   (merging with existing ones) and registers an email pusher
   (`kind:"email"`, `app_id:"m.email"`, `pushkey:<email>`) with a token minted
   for a dedicated `svc_email_pusher` device (so live web-session tokens are
   never rotated).
3. **Profile avatars fixed**: `avatar_url` was set to the platform's HTTP URL,
   which Matrix clients never render — avatars must be `mxc://` media URIs
   (room avatars already worked because `ensure-room.ts` uploads first).
   `ensureMatrixUser` now uploads `User.image` to the media repo and sets the
   resulting mxc URI; existing mxc avatars are kept.
4. Backfill for existing users (threepid + pusher + avatar):
   `node -r dotenv/config scripts/backfill-matrix-email-notifications.mjs`
   (supports `--dry-run`; idempotent) — **run against prod once** (user op).
   Needs the **platform** `DATABASE_URL` (for emails/avatars) + `MATRIX_CHAT_*`;
   the Synapse DB is never accessed directly, only the admin HTTP API.

### Stage 1 — migrate AdviceRequest chat to the registry (code done 2026-07-02;
run `scripts/backfill-advice-chatrooms.mjs` against prod)

Flow: [chat-flows/advice-request-chat.d2](chat-flows/advice-request-chat.d2)

1. **`adviceRequestProvider`** in `providers.ts`: `buildContext` loads the
   `AdviceRequest` from `context.adviceRequestId`, returns the same
   `type:"advice-request"` shape `_helpers.ts` builds today (`isExpert`,
   status, finishedAt) so the frontend doesn't change; `canClose` — either
   participant.
2. **Accept route** (`api/user/advice-request/[id]/accept`): replace the
   `MatrixService` singleton block with `ensureChatRoom` (kind `AdviceRequest`,
   `directKey advice:{id}`, initiator = expert, invitee = requester, avatar =
   project cover). Keep writing `AdviceRequest.matrixRoomId` — `MyAdviceRequests`
   and `UserAdviceArchiveModal` read it.
   **No invite step for the requester**: they already asked for the chat by
   sending the request — the only decision is the expert's accept/decline of
   the advice request itself. New `ensureChatRoom` option
   `autoJoinInvitees: true`: after creating the room, the server joins the
   invitee with *their* Matrix session (`getMatrixUserToken`), so the requester
   opens the chat already joined — no accept/decline screen.
   The expert's decline path is untouched: `[id]/reject` → `Rejected` (and the
   requester's `[id]/cancel` → `Closed`), both Novu-notify and never create a
   chat.
3. **Close sync**: add optional `onClose(room)` to the provider interface;
   `adviceRequestProvider.onClose` sets `AdviceRequestStatus.Closed`. The PUT
   `resolve` registry branch calls it, so domain status stays in sync.
   **Either side, any time**: `canClose` allows both participants; "Question
   Resolved" in `ChatTopic` and leaving the room from the sidebar stay
   available to both throughout the chat's life. Closing also makes the Matrix
   room read-only (decision #3 in §5) and Novu-notifies the other participant
   (§6 — generic in PUT `resolve`, so all closable kinds get it).
4. **Legacy fallback REMOVED** (2026-07-02, post-review cleanup): `rooms/[id]`
   GET and `resolve` PUT are registry-only; `_helpers.ts` deleted.
   **Backfill**: `scripts/backfill-advice-chatrooms.mjs` creates `ChatRoom`
   rows for existing `AdviceRequest.matrixRoomId` rooms. ⚠️ **Re-run it right
   after deploying this branch** — advice requests accepted on prod between
   the first backfill run and the deploy still created legacy-only rooms.
5. **Remove `AdviceRequestInvite.tsx`** and its branch in `ChatMessages.tsx` —
   with auto-join there is no `invite` membership state for advice chats (the
   earlier idea of adding an `invite-response` call here is obsolete).

### Stage 2 — generic 1:1 Direct chat (admin-gated creation for now) — code done 2026-07-02

Flow: [chat-flows/direct-chat.d2](chat-flows/direct-chat.d2)

The admin chat is remodeled as a plain DM between **any two platform users**.
"Only admins can start one" is a *permission* on the creation route, not a
property of the chat — opening DMs to everyone later means relaxing that gate
(and un-hiding the "New chat" button), nothing else.

1. **Schema**: rename `ChatRoomKind.AdminDirect` → `Direct` in the
   `@gdhub-io/gdhub-prisma` package (safe — zero `ChatRoom` rows were ever
   persisted with that kind; also change the column default), then
   `bun run db:generate`.
2. **`rooms/direct`**: replace the bare Matrix-room creation with
   `ensureChatRoom` (kind `Direct`, `directKey direct:{minUserId}:{maxUserId}`,
   initiator = caller). The `roles:[Admin]` gate **stays for now**. Novu invite
   notification stays.
3. **Dedup moves server-side**: `ensureChatRoom` is idempotent, so new DMs are
   deduped by `directKey`. The client-side Matrix-room scan in `NewChatModal`
   is *kept* as a safety net for legacy admin DMs created before Stage 2 —
   they have no `ChatRoom` row, so the registry can't dedup them.
4. `directProvider` (renamed from `adminDirectProvider`) becomes live (context
   stays `default`, `canClose:false`). The counterpart still confirms via
   `DefaultInvite` (accept/decline) — unlike advice, a DM can arrive
   unsolicited. The admin "New chat" button in `ChatModal` / `NewChatModal`
   keeps working as is.

### Stage 3 — VacancyOffer rework (candidate ↔ author) — done 2026-07-02
(incl. the `applicationMessage` greeting: apply form → candidate card → quoted
as the chat's first message)

Flow: [chat-flows/vacancy-application-chat.d2](chat-flows/vacancy-application-chat.d2)

Already registry-based, but the initiation direction changes: **apply no longer
auto-creates the chat — the author starts it** from the page listing applicants
for their open positions. Internal chat is available by default for every
applicant (no extra option in the contact-type zone).

1. **Apply route**: remove the `ensureVacancyOfferChat` auto-create block (also
   drops `matrix-js-sdk` from that route's bundle). The Novu "New job response"
   notification deep-links to the project's candidates page instead of a chat.
2. **Apply form** (`VacancyPreviewModal` → speciality/contacts step): add an
   optional greeting textarea ("welcome message"). Stored as
   `TeamMember.applicationMessage String?` — **additive schema change in the
   external `@gdhub-io/gdhub-prisma` package** (never edit the schema in
   `node_modules`), then `bun run db:generate`.
3. **Author opens/creates the chat**: on the candidates page
   (`MyProjectCandidates` → `ProjectCandidatePreviewModal`, "Open chat" already
   wired to `POST rooms/vacancy`) — `ensureVacancyOfferChat` with
   `initiator = author`, invite = candidate. The candidate's greeting is shown
   in the candidate preview and quoted in the chat's first message.
   **Candidate is auto-joined** (`autoJoinInvitees`, same mechanism as advice):
   they applied and are awaiting a reply — an accept-invite screen is a
   redundant step. `VacancyChatInvite` remains only for talent-pool offers
   (Stage 4), where the person never applied and their consent is the point.
   Rule in `rooms/vacancy`: an application (`TeamMember`) exists → auto-join;
   no application → normal invite.
4. **One chat per application**: the same user may apply to several vacancies
   of one project or across one author's projects — each application gets its
   own chat. `directKey vacancy:{vacancyId}:{candidateUserId}` already
   guarantees this (per-vacancy, even for the same author↔candidate pair).
   Edge case: re-apply to the same vacancy after a withdraw finds the old
   Closed room — `ensureVacancyOfferChat` reopens it (`status=Open`,
   `finishedAt=null`) so history continues in one place.
5. **`src/services/chat/vacancy-keys.ts`** (new, *no matrix imports* so CRUD
   routes and crons don't pull `matrix-js-sdk` into their bundles): move
   `vacancyChatDirectKey` there, add
   `closeVacancyChats(vacancyId, candidateUserId?)` — `updateMany` on
   `directKey startsWith vacancy:{vacancyId}:` (or the exact key), `status
   Open → Closed`, then best-effort `makeRoomReadOnly` per room (plain-HTTP
   helper, see decision #3 in §5). Replace the inlined `updateMany` in
   `candidate/reject`.
6. **Close chats when the vacancy closes**: call `closeVacancyChats(vacancyId)`
   from vacancy `DELETE`, `PUT → Closed`, and the `relevant-vacancies` cron.
7. **Close the chat on candidate withdraw** (`vacancy/withdraw`) — today the
   chat silently stays Open after the `TeamMember` row is deleted.
8. **Close the chat on hire too** (`candidate/hire`): the vacancy conversation
   is over — the room stays visible for reference (Closed hides `ChatInput`,
   so it's read-only), but writing moves to the future team group chat
   (`ProjectGroup`, backlog). So a VacancyOffer chat closes on **reject,
   withdraw, hire, or vacancy close** — it never outlives the application.

### Stage 4 — Talent-pool "Offer a position" chat (new UI) — done 2026-07-02
(`GET /api/user/project/vacancies/my` + `OfferPositionModal` + button in
`SpecialistPreviewModal`, shown when the viewer has Published vacancies and
isn't viewing their own card)

Flow: [chat-flows/talent-pool-offer-chat.d2](chat-flows/talent-pool-offer-chat.d2)

Backend (`POST /api/chat/rooms/vacancy`, author-initiated, optional first
`message`) is ready; the entire UI is missing:

1. **`SpecialistPreviewModal`**: add an "Offer a position" action (Tolgee key),
   visible when the viewer has at least one Published vacancy.
2. **Offer dialog**: picker over *my* open positions (author's Published
   vacancies across their projects) + optional message textarea. Submits
   `{vacancyId, candidateUserId, message}` to `rooms/vacancy`.
3. **Specialist side**: Novu "invited to chat" with deep-link
   `/hub?chat=1&roomId=…`; in the chat they see `VacancyChatInvite`
   (accept/decline → `invite-response` → Novu back to the author).
4. **Chat-only by design**: no `TeamMember`/candidate row is created (decided
   2026-06-30). If the author wants the person as a formal candidate, they drop
   the vacancy apply link in chat; apply doesn't touch chats (Stage 3), and the
   room for this pair already exists (same `directKey`), so the conversation
   continues seamlessly.
5. Closing follows Stage 3 rules (vacancy closed → chat closed; reject → closed
   if they became a candidate).

### Stage 5 — grouped chat list in the drawer — done 2026-07-02
(`GET /api/chat/rooms/kinds` + `groupable` Conversations in `ChatRooms.tsx`;
groups render once the kind mapping loads, unknown rooms → Direct)

`ChatRooms.tsx` currently renders a flat list straight from Matrix
`getRooms()` and knows nothing about chat kinds. Target — three groups:

| Group (Tolgee key) | Kinds |
|---|---|
| **Experts** («Эксперты») | `AdviceRequest` |
| **Open positions** («Открытые позиции») | `VacancyOffer` |
| **Direct** («Direct чаты») | `Direct` + rooms unknown to the registry (fallback) |

1. **Kind mapping endpoint**: `GET /api/chat/rooms/kinds?matrixRoomIds=…`
   (batch) — returns `{ [matrixRoomId]: ChatRoomKind }` from the registry for
   the caller's rooms. Cheap `findMany` on the `matrixRoomId @unique` index; no
   per-room requests.
2. **`ChatRooms.tsx`**: fetch the mapping via TanStack Query, group the Matrix
   rooms into the three sections (headers with Tolgee keys), keep the existing
   recency sort inside each group, hide empty groups. Unknown rooms → Direct.
3. Depends on Stages 1–2 (advice + admin chats registered) and the Stage 1
   backfill; until then old rooms would land in Direct.
4. Future group-chat kinds (`ProjectGroup`/…) get their own section when they
   ship — the mapping already carries `kind`, so it's a frontend-only addition.

### Stage 6 — delete chats when a platform user is deleted — done 2026-07-02
(chats are collected *before* `deletePersonalData` — the lookup needs domain
rows — and deleted after it succeeds, then the Matrix account is erased)

Today user deletion (`POST /api/user/privacy` `action:"delete-personal-data"` →
package-level `prisma.user.deletePersonalData`) never touches Matrix: the
Matrix account, its rooms, and the message history all survive. Target — a
deleted user takes their chats with them:

1. **`deleteUserChats(userId)`** (new, `src/services/chat/`): find the user's
   1:1 `ChatRoom` rows — by `directKey` patterns (`direct:…{id}…`,
   `vacancy:*:{id}`, advice via `AdviceRequest`) and `context` fields; once the
   backlog `ChatRoomMember` sync lands, simply by membership. For each room:
   Synapse admin `DELETE /_synapse/admin/v2/rooms/{roomId}` (block + purge —
   **the counterpart loses the history too**, by design), then delete the
   `ChatRoom` row (`ChatRoomMember` cascades via the schema).
2. **`deactivateMatrixUser(userId)`** (new, `services/matrix/admin.ts`):
   `POST /_synapse/admin/v1/deactivate/{mxid}` with `erase: true` — revokes
   tokens, removes pushers/threepids, wipes displayname/avatar. Run *after*
   room deletion.
3. **Hook** both into the privacy route right after `deletePersonalData`
   succeeds — best-effort with logging (a Matrix failure must not roll back
   the platform deletion; the script-side cleanup can be re-run).
4. Group chats (future kinds): remove the membership only, the room itself
   stays for the remaining members.

## 4. Cross-cutting backlog (not in stages 1–6)

- **`ChatRoomMember` is never written** — start creating rows in
  `ensureChatRoom` + on join; unlocks a DB-backed sidebar, `lastReadAt`
  server-side unread, `notificationsMuted`, per-room aliases.
- **Sidebar fully from DB**: Stage 5 only adds a kind mapping on top of the
  Matrix room list; a fully registry-backed list (titles, ordering,
  `lastMessageAt`, unread from `lastReadAt`) is a separate later step.
- **Route naming**: `PUT rooms/[id]/resolve` actually *closes* a chat while
  `GET rooms/[id]` *resolves* context — rename to `/close` when convenient
  (breaking, needs a coordinated frontend change).
- **Centralized chat notifications**: Novu calls are scattered across 6 routes;
  extract a `notifyChatEvent(kind, event, …)` helper.
- **Group chats** (`ProjectGroup`/`EventGroup`/`CourseGroup`): provider +
  membership sync with the domain table (`syncMembership` hook), no accept step.

## 5. Decisions (resolved 2026-07-02)

1. **`Direct` chats are not archivable** — `canClose:false` stays; leaving the
   room remains possible.
2. **Talent-pool offer picker** lists vacancies of the *author's own projects*
   (current ownership model).
3. **Closing a chat makes the Matrix room read-only**, not just hides
   `ChatInput`. Mechanism: a `makeRoomReadOnly(matrixRoomId)` helper in
   `src/services/matrix/admin.ts` sends an `m.room.power_levels` state event
   (`events_default` above member level) over plain HTTP with the room
   creator's token — no `matrix-js-sdk` import, so CRUD routes and crons can
   call it. Invoked from every close path: PUT `resolve` (registry branch) and
   `closeVacancyChats` (reject / withdraw / hire / vacancy close). Best-effort:
   a Matrix failure must not block the domain close.

## 6. Notifications

Two independent channels: **Novu** (in-app bell + push/email, `default-message`
template) for domain events, and **Matrix push** (Sygnal gateway → Firebase →
browser push) for chat messages when the user is not online.

### Novu coverage (verified in code, 2026-07-02)

| Event | Recipient | Status |
|---|---|---|
| Advice request created | expert | ✅ `advice-request/route.ts` "You have a new advice request" |
| Advice accepted | requester | ✅ `accept/route.ts` "Advice request accepted" (Stage 1: deep-link into the chat) |
| Advice rejected / canceled | requester / expert | ✅ `reject`, `cancel` routes |
| Direct chat invitation | counterpart | ✅ `rooms/direct` "New chat invitation" |
| Invite accepted/declined | initiator | ✅ `rooms/[id]/invite-response` (stays for Direct + talent pool; obsolete for auto-joined flows) |
| Vacancy application | author | ✅ `apply/route.ts` "New job response" (Stage 3: deep-link → candidates page) |
| Author opened the application chat | candidate | ✅ `rooms/vacancy` (sent only on first creation) |
| Talent-pool offer | specialist | ✅ `rooms/vacancy` (same route) |
| Hire / reject / withdraw / fire | counterpart | ✅ candidate routes (see vacancy-flow.d2 §5) |
| **Chat closed / question resolved** | counterpart | ⚠️ **missing** — PUT `resolve` sends nothing; add a best-effort Novu to the other participant (Stage 1, generic for all closable kinds) |

### Matrix push for offline users

Infrastructure exists and is wired: `ChatProvider` → `useFirebaseMessagingToken`
(browser permission + FCM token) → `useMatrixPushRegistration` →
`POST /_matrix/client/v3/pushers/set` ([matrix-pushers.ts](../src/helpers/matrix-pushers.ts));
diagnostics surface in the chat info popover (`ChatPushStatus`). Mentions are
covered by Synapse's default push rules (`.m.rule.is_user_mention`,
`.m.rule.contains_display_name`) once a pusher exists; invites by
`.m.rule.invite_for_me`.

Known gaps (test of 2026-06-29 showed users with **0 pushers**):

1. **A pusher appears only after** the user opens the app, grants browser
   notification permission, and FCM registers. Until then an offline user gets
   *no* signal about new Matrix messages.
2. **Prod env vars must be set**, otherwise registration throws "Matrix push
   configuration is incomplete": `NEXT_PUBLIC_MATRIX_CHAT_BASE_URL`,
   `NEXT_PUBLIC_MATRIX_PUSH_GATEWAY_URL`, `NEXT_PUBLIC_MATRIX_PUSH_APP_ID`
   (+ `NEXT_PUBLIC_FIREBASE_VAPID_KEY` for the FCM token). *(Couldn't verify
   `.env.example` from this session — check it's in sync.)*
3. **Fallback for users without push permission — Synapse missed-message
   emails**: SMTP was already configured in `homeserver.yaml`, but no user had
   an email threepid or an email pusher, so no email ever went out. Fixed in
   Stage 0 (provisioning binds both; backfill script for existing users) —
   after the backfill runs, offline users get "you have missed messages"
   emails from Synapse.
4. Nudge UX: prompt users to enable notifications when they first open the
   chat drawer (permission request currently happens silently in
   `ChatProvider`).

## 7. Sessions, tokens and access control (2026-08-19)

An audit of the integration turned up three things that were wrong by design
rather than by accident. All three are fixed in code; one of them needs a
homeserver change to take full effect.

### 7.1 Access tokens

`POST /_synapse/admin/v1/users/{id}/login` — the endpoint every Matrix session
used to come from — accepts **only** `valid_until_ms`, returns **only**
`access_token`, creates **no device**, and by default hands out tokens that
**never expire**. Every page load therefore minted another permanent
credential, and nothing ever revoked one.

Now, in [src/services/matrix/session.ts](../src/services/matrix/session.ts):

- Tokens are cached in Redis per `(user, device)` — one token per browser,
  reused across requests and tabs instead of one per page load.
- The admin-login fallback always sends `valid_until_ms` (12 h).
- `DELETE /api/chat/session` revokes the token via `/_matrix/client/v3/logout`
  and drops the cache — the browser hands its own token along, so revocation
  never hinges on Redis still holding the key; every sign-out path goes through `signOutWithChat`
  ([src/components/Chat/session.ts](../src/components/Chat/session.ts)), which
  also stops the client, clears the IndexedDB timeline, the device id and the
  pusher bookkeeping.
- The client listens for `HttpApiEvent.SessionLoggedOut` and pulls a fresh
  session instead of silently dying when a token is rejected.

**Legacy tokens already issued never expire.** Purging them is a one-off
server-side operation — `POST /_synapse/admin/v1/reset_password/{user_id}`
drops a user's tokens (the passwords are random UUIDs nobody holds), and
`/logout/all` on the admin account drops every puppet token at once, including
`MATRIX_CHAT_SYNAPSE_ADMIN_TOKEN` itself, which then has to be re-issued.
Verify on staging first.

### 7.2 Real devices via an application service

The `device_id` the browser generates was fiction: the admin API ignored it,
so the SDK believed in a device the homeserver had never heard of, and none of
the `svc_*` device ids did what their comments claimed.

`getMatrixUserToken` now prefers a **real** login when
`MATRIX_CHAT_APPSERVICE_TOKEN` is set: `POST /_matrix/client/v3/login` with
`m.login.application_service`. That produces a genuine device — visible in
`/devices`, revocable with `/logout`, and owning its pushers.

Verified against the local stack (Synapse latest, 2026-08-19): the login
returns `device_id`, the device shows up in `/devices`, `/logout` kills both
the device and its tokens, and the appservice is refused (`M_FORBIDDEN`) when
it tries to log in as `@admin` — the namespace regex holds. Re-logging in with
the same `device_id` does **not** invalidate the previous token, so the Redis
cache is what keeps token count down; the `svc_*` device ids exist so that
revoking a browser session and revoking backend access stay independent.

Rollout (the code falls back to admin login until step 3, so deploy order is
free):

1. Install a registration file on the homeserver, e.g.
   `/etc/matrix-synapse/gdhub-appservice.yaml`:

   ```yaml
   id: gdhub
   url: null                      # pull-only: Synapse never pushes to us
   as_token: "<long random secret>"
   hs_token: "<another long random secret>"
   sender_localpart: gdhub_appservice
   rate_limited: false
   namespaces:
     users:
       # Platform users are cuids: "c" + lowercase alphanumerics. Deliberately
       # narrower than @.*  — the AS must not be able to log in as the admin.
       - exclusive: false
         regex: "@c[a-z0-9]+:matrix\\.gdhub\\.io"
     aliases: []
     rooms: []
   ```

2. Reference it from `homeserver.yaml` (`app_service_config_files:`) and
   restart Synapse.
3. Set `MATRIX_CHAT_APPSERVICE_TOKEN` to the `as_token` value in the app's
   environment. **Add it to `.env.example` too.**
4. Once prod runs on it, delete `adminLogin` from `session.ts`.

Note the namespace regex has to keep matching the platform's id format — it is
tied to `User.id` being a cuid.

The local dev stack (`matrix-chat-server`) already has this installed:
`synapse/gdhub-appservice.yaml` plus `app_service_config_files` in
`homeserver.yaml`. Its `as_token` is the value for `MATRIX_CHAT_APPSERVICE_TOKEN`
in `.env`.

### 7.3 Who may read a chat

`GET /api/chat/rooms/[matrixRoomId]` returned the chat context — advice topic
and comment, vacancy title, offered amount, project — to **any** signed-in
caller, and room ids travel in Novu deep links. `invite-response` notified the
members of any room id it was handed, and `rooms/kinds` confirmed which room
ids exist.

[src/services/chat/participation.ts](../src/services/chat/participation.ts) is
now the single answer to "does this user belong to this chat": `directKey`
segments and context fields, plus one batched query for the author side of a
vacancy chat, and — for a single room, once the cheap checks fail — Matrix
membership itself. The fallback is not optional: a vacancy chat may be opened
by any project admin (the route gates on `project.vacancies.manage`), and the
registry has no idea who that is. `invite-response` accepts registry participation *or* current
Matrix membership — a decline leaves the room before calling, so membership
alone would silence the notification.

This stays a stopgap until `ChatRoomMember` is actually written (§4) — that
row is what would make membership a single indexed lookup.

### 7.4 Client bootstrap

- `IndexedDBStore` per Matrix user + `lazyLoadMembers` + `initialSyncLimit`:
  a page load resumes the sync instead of replaying a full one.
- The sync listener uses `on`, not `once` — the first sync event is `ERROR`
  whenever the homeserver is unreachable at boot, and consuming it left the
  drawer stuck on its loader for the rest of the session.
- Pusher registration is cached per **account**, not per device: the device id
  and the FCM token survive a sign-out, so the next account on the same
  browser used to skip registration while the pusher still pointed at the
  previous one.
- Rooms are created with an explicit `preset`, `history_visibility: invited`
  and `guest_access: forbidden`. **The homeserver must not set
  `encryption_enabled_by_default_for_room_type`** — the web client runs
  without crypto, and server-side puppeting is incompatible with E2EE.
- Server-side image fetches (profile avatar, room avatar) go through an
  allowlist ([src/helpers/remote-image.ts](../src/helpers/remote-image.ts)),
  mirroring `images.remotePatterns` in next.config.js.
- `POST /api/dev/push-test` was unauthenticated: anyone could push arbitrary
  notifications to any known pushkey through our gateway. It now requires a
  session and 404s in production.

### 7.5 Where the notification emails link

Synapse's "you have missed messages" emails linked to **matrix.to** — a third
party running a client we do not use. The destination is a homeserver setting,
`email.client_base_url`, and the URL shape it produces is fixed:

```
{client_base_url}/#/room/{roomId}          # the room
{client_base_url}/#/room/{roomId}/{eventId} # a single notification
```

Templates cannot help: the mailer hands them a finished `link` and no room id.

So `client_base_url` points at `https://gdhub.io/chat` (locally
`http://localhost:3000/chat`), and [src/app/chat](../src/app/chat) turns that
shape into `/hub?chat=1&roomId=…`. The room id lives in the URL *fragment*,
which never reaches the server, so the page is a client-side redirect —
[deep-link.ts](../src/app/chat/deep-link.ts) holds the mapping and is unit
tested.

`src/proxy.ts` now keeps the query string in `callbackUrl`: without it a
signed-out reader following a chat link landed on the hub with no chat open.

Also on the server side: `notif_mail.html` still carried the matrix.org logo
(`_base.html` had already been switched to gdhub's), and the appservice
namespace regex had to widen — seeded dev users are `@user-author-1`, not
cuids, so a cuid-shaped regex 500'd their `/api/chat/session`. It still
excludes `@admin` and the appservice's own account.


## 8. Spaces and chats (design, 2026-08-19)

Where a chat belongs, who may read it, and how it looks in a third-party
Matrix client. Supersedes the "`ChatRoomMember` is never written" and
"sidebar fully from DB" items in §4 — they are stages here now.

### 8.1 Two families, one access rule

```
kind == Group  →  participant = SpaceMember(spaceType, spaceId)
otherwise      →  participant = ChatRoomMember
```

That is the whole rule, and it needs no special case for a conversation whose
two sides live in different places. A scout talking to a project author, an
advisor talking to a user, a recruiter talking to a candidate — in each of them
one side acts from within a space and the other is an outsider, and none of
them is a chat *of* a space. They are 1:1 chats with a subject attached, the
shape `AdviceRequest` has had in production all along.

It replaces [src/services/chat/participation.ts](../src/services/chat/participation.ts),
which infers participation from `directKey` segments and context fields
because nothing better exists yet (§7.3).

### 8.2 The space on a chat is its SUBJECT, not its initiator

Storing the initiator's space would file a scout's deal chat under the scout
cabinet for the project author — a place they are not in and should not see.
Storing the subject makes one field serve both sides:

| Chat | `spaceType/spaceId` | Insider | Outsider |
|---|---|---|---|
| Scout deal | `project/{projectId}` | author — under their project | scout — "Deals" bucket |
| Vacancy offer | `project/{projectId}` | author, recruiter | candidate — "Offers" |
| Advice request | `project/{id}` or `hub/default` | author, when it is about a project | expert — "Experts" |
| Advisor session | `hub/default`, or the project | — | both — "Advisors" |
| Team / course / event chat | the space itself | everyone | — |

Drawer rule, one line: **a chat shows under its space when you are a member of
that space, and in a `kind` bucket otherwise.** So `kind-groups.ts` does not
disappear — it becomes the fallback for the outside party.

Permission to *create* such a chat comes from the initiator's own space and is
checked on the route, the way `rooms/vacancy` already composes
`hub.talent_pool.contact` with `project.vacancies.manage`.

Schema:

```prisma
model ChatRoom {
  spaceType String                       // "project" | "course" | "event" | "hub" | …
  spaceId   String @default("default")   // entity id; "default" for single-instance spaces
  kind      ChatRoomKind                 // Group | Direct | AdviceRequest | VacancyOffer | ScoutDeal
  parentId  String?                      // course study-group rooms hang under the course room
  @@index([spaceType, spaceId])
}
```

`ProjectGroup` / `EventGroup` / `CourseGroup` collapse into a single `Group`:
with `spaceType` present they only differed by it, and no row was ever created
with any of them. `ChatRoomMember` starts being written — for 1:1 chats it is
the access list, for group chats it only carries per-room state (`lastReadAt`,
`notificationsMuted`, and the alias columns).

**Scout deals wait for the domain.** `scoutSpace` declares
`deals: ["view", "create", "manage"]`, but there is no `ScoutDeal` model — the
scout space is still being built. Every other kind hangs off a domain row
(`TeamVacancy`, `AdviceRequest`) that its provider loads, gates `canClose` on
and syncs on close; the deal chat gets built when that row exists, not before.
The alias columns on `ChatRoomMember` find their first real user here: a fund
often does not want to reveal itself in the first message.

A scout cabinet is personal (`ScoutCabinet.userId @unique`) while the scout
space is single-instance, so a colleague does not see someone else's deal chat.
If a fund's team ever should, that is extra `ChatRoomMember` rows — not a space
rule.

### 8.3 Membership sync

Group chats mirror `SpaceMember` into Matrix membership. The single write path
already exists — `joinSpace` / `revokeSpaceMember` / `deleteSpaceMembership` in
[src/services/access/membership.ts](../src/services/access/membership.ts) — but
those take a transaction client, so a Matrix call must not happen inside them.
Enqueue after commit (BullMQ; today `src/queues` has only `matching` and
`telegram`), and run a reconcile job: Matrix calls fail, and without one the
drift accumulates silently.

Matrix has no way to keep someone in a room. A user can leave from any client,
so reconcile re-invites rather than force-joins, and the platform shows "not in
the chat" instead of pretending otherwise.

Power levels follow the space role: Owner/Admin → 50, Member → 0. A read-only
Guest cannot be expressed by a power level alone (it would mean raising
`events_default` to 25 and putting members at 25) — decide before rooms exist,
because changing it later means rewriting state in every room.

### 8.4 Third-party clients

The goal is that people can talk from Element while the platform stays the
control plane: it creates rooms, syncs membership, closes them.

**Nobody can log in today.** Accounts are provisioned with a
`crypto.randomUUID()` password that is never shown, and the platform itself has
no passwords (Google OAuth + magic link). The practical fix is an app password:
a "connect a chat app" section in profile settings that generates one, sets it
via `PUT /_synapse/admin/v2/users/{id}`, and shows it once together with the
user's `@id:matrix.gdhub.io` and the homeserver URL. OIDC is the textbook
answer and a poor fit here — mapping a Google token onto an existing cuid
localpart needs a custom Synapse mapping module, and magic-link users have no
Google identity at all.

**Structure in Element comes from `m.space`.** One space room per platform
space, group chats as `m.space.child`. 1:1 chats get no parent and instead need
`m.direct` account data on both sides — currently `is_direct: true` is passed to
`createRoom`, which only marks the invite, so Element would file them as
ordinary rooms rather than under People.

Deal chats may be hung under the scout cabinet's space room so the scout gets a
pipeline view; the outsider, not being in that space, sees the room in Home.
Do **not** write the reciprocal `m.space.parent` into the chat room then — it
would point the outsider at a space they must not see. Verify the Home
behaviour in a real Element before relying on it.

**Power levels stop being cosmetic.** In Element a default-power member can
invite anyone, rename the room and enable encryption — and `SpaceMember` turns
into a lie. Group rooms need `invite: 50`, `kick: 50`, `ban: 50`,
`state_default: 50`, members at 0.

The application service (§7.2) is the natural owner: let
`@gdhub_appservice` create group rooms and hold PL 100, instead of "whoever
happened to initiate". Today the creator is the initiating user, which is why
`makeRoomReadOnly` has to look the creator up through the admin API and mint a
token as them. The bot shows up in the member list — give it a display name and
an avatar.

Federation is off (`federation_domain_whitelist: []` plus the removed listener
resource), so no outsider can be pulled in and rooms cannot leak to another
server. If a scout space ever needs an external investor with their own Matrix
account, federation has to open — and then `invite: 50` is the only thing left
holding the line.

### 8.5 Invariants

1. **Matrix membership is written by the platform only.** Clients may leave;
   they may not add anyone. Enforced by power levels, not by convention.
2. **Rooms are never encrypted.** E2EE breaks server-side sending
   (`sendRoomMessageAs`, opening messages) and the web client, which runs
   without crypto. `state_default: 50` keeps members from turning it on, and
   the homeserver must not set
   `encryption_enabled_by_default_for_room_type`.
3. **The registry is the source of truth for what a chat *is*;** Matrix is the
   transport and the delivery ACL. Both have to agree, and the reconcile job is
   what makes them.

### 8.6 Gaps

| | |
|---|---|
| 1 | `ChatRoom.spaceType/spaceId/parentId` — a chat has no place in the model |
| 2 | No `chat` feature in project/event/course/scout; `hub.chat.use` is declared and never checked |
| 3 | Group chats do not exist: enum values, no provider, no creation, no lifecycle |
| 4 | Nothing syncs `SpaceMember` into Matrix membership, and nothing reconciles |
| 5 | `ChatRoomMember` is never written — no server-side unread, mute or aliases |
| 6 | No `SpaceRole` → power level mapping |
| 7 | Archiving a project, finishing a course, ending an event does nothing to its chat |
| 8 | Room name, topic and avatar are set once at creation and never follow the entity |
| 9 | No queue for best-effort Matrix work — it is inline with `console.error` |
| 10 | No way to sign in from a third-party client |
| 11 | No `m.space` rooms, no `m.space.child` — Element would show a flat list |
| 12 | Power levels are open: a member can invite, rename and enable encryption |
| 13 | `m.direct` is not written, so 1:1 chats do not look like DMs |
| 14 | Leaving a room from another client is not handled anywhere |
| 15 | Creating a Direct chat is gated by `admin.users.manage`, a stand-in for `hub.chat.use` |

### 8.7 Staging

1. **Schema** — `spaceType` / `spaceId` / `parentId`, collapse the three group
   kinds into `Group`, index. In `@gdhub-io/gdhub-prisma`, so it starts there.
2. **Permissions** — `chat: ["view", "post", "manage"]` on project/event/course/
   scout; enforce `hub.chat.use` and drop the `admin.users.manage` stand-in.
3. **Access rule** — replace `participation.ts` with §8.1; start writing
   `ChatRoomMember`.
4. **Power levels and the encryption lock** — before anyone signs into Element,
   otherwise every existing room has to be rewritten afterwards.
5. **Group chats** — `ensureSpaceChat(spaceType, spaceId)`, a provider, the
   project team chat first.
6. **Membership sync** — queue plus reconcile job (§8.3).
7. **App password** — independent of everything above, can ship any time.
8. **`m.space` mirroring** — after stage 1, when the mapping is a straight
   read of the registry.
9. **Lifecycle and metadata** — freeze/purge on space events, name and avatar
   following the entity.
