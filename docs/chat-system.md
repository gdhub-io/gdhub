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
   `yarn db:generate`.
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
   `node_modules`), then `yarn db:generate`.
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
