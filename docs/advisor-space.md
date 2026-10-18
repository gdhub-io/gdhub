# Advisor space

Spec for the advisor (mentor) workspace: what it is, how a user gets in, what
lives on each page, and what has to be built. Nothing here is implemented yet —
the design is in [`docs/design/platform-design.pen`](design/platform-design.pen),
row **Advisor Space**.

## 1. Why a space and not a page

Today mentorship is scattered: the toggle sits in `/user/settings/mentorship`,
the catalogue in `/hub/experts`, and every request — incoming and outgoing,
active and archived — is squeezed into one 600-line component behind
`/user/advice-requests`, and the reviews an advisor leaves after pitch streams
have nowhere to live at all.

An advisor has a job to do, repeatedly, with its own inbox, its own history and
its own settings. That is a space, the same shape as `scout`.

**The space belongs to the advisor, not to a conversation.** People who ask
questions never enter it and are never added as members — the space would
otherwise duplicate the chat and the project space. The asker's side stays in the
hub: the catalogue at `/hub/experts` and their own sent requests.

## 2. Entry: mentorship toggle + the Advisor Agreement

The switch in `/user/settings/mentorship` is the only entry point, because it is
what creates the space. Turning it on is also accepting the **Advisor Agreement**
— a public offer, the same text for everyone (status, conduct, confidentiality,
volunteering), accepted with a tick, not signed. The legal layer records it
([docs/legal/legal-layer.md](legal/legal-layer.md)): a `LegalAcceptance` row with
the version, the text's checksum, the time, IP and user agent.

1. **Switch on.** The settings card shows the agreement row: *Advisor Agreement
   not accepted* with *Read and accept*, which opens the text in a modal with the
   clickwrap and *Accept and turn on*.
2. **The server holds the line.** `PUT /api/user/profile/mentorship` refuses to
   turn mentorship on without the version in effect accepted, and records the
   acceptance in the same transaction that sets `Speciality.isOpenForMentoring`.
   Until then `Open advisor space` is disabled with a lock.
3. **Accepted.** The row reads *Advisor Agreement accepted · Accepted on {date} ·
   version {n}* with *View document*, and the space link opens.
4. **Switching mentorship off** closes the space and hides the expert card. It
   withdraws nothing: turning it back on later needs no new tick unless a new
   version made a material change.

Paid work — curation today, paid consultations later — is the **Expert Services
Terms**, accepted once before the first paid work. Nothing here is signed
through Documenso; it stays only for the event certificates it already signs.

## 3. Space definition

Single-instance, like `scout` — every advisor works in the same space and sees
their own rows in it. `spaceId` is the literal `"default"`.

```ts
// src/config/spaces/advisor.ts
export const advisorSpace = defineSpace({
  type: "advisor",
  features: {
    requests: ["view", "manage"],   // accept, decline, close
    reviews: ["view", "create", "manage", "delete"],
    settings: ["view", "manage"],
  },
});
```

The adapter answers whether the space exists, the way `scout.space.ts` does:
at least one `Speciality.isOpenForMentoring` → the space resolves; otherwise the
whole `/advisor/*` subtree is a 404. The flag is only ever set together with an
accepted Advisor Agreement (§2), so the speciality alone decides.

**The role is derived there too, not read from `SpaceMember`** — a departure
from an earlier draft of this document, made when the space was built. One fact
in one place: switching mentorship off closes the space in the same write that
hides the expert card, nothing can drift out of step, and the advisors who
already exist need no backfill.

**And it is `Owner`, not `member`.** `manage` and `delete` are not member-class
actions (`CLASS_DEFAULT_ROLES`), so a `Member` advisor could read their own
inbox and change nothing in it — not accept a request, not delete their own
review.

No `team` / `invite` features: an advisor works alone.

## 4. Pages

The space has three tabs: **Requests**, **Reviews**, **Settings**.

### 4.1 `/advisor/requests` — the inbox (default page)

Cards, not a table: each request is a person plus a question, which a row cannot
carry. Card anatomy follows `DS · 08 Cards` — identity strip, body, foot.

- Filter: `New` / `In progress` / `Answered` / `All`, with counts in the labels;
  search by person or project.
- Card: craft-coloured tile, status chip and time, **the question as the card
  title**, meta line 1 — asker name and role, meta line 2 — project and stage,
  question excerpt truncated with an ellipsis, foot — the speciality it was asked
  in, plus actions.
- Actions: `Show details` (opens the request modal, where Accept lives),
  `Decline`; for an accepted request `Open chat` and `Mark done`; for a closed
  one `Show details`.
- Long lists end with a `Load more` button (`Button block type="text"`), the
  same pattern as `/scout/games`.

**Request modal** — the full question: the status dot and the asked-at date sit
in the modal header next to the close button (deliberately out of the person
block), then the *Asked by* block (name, role on the project, **View talent
card**), the question in its own outlined panel, the project row plain — no fill,
no border — and the footer with `Decline` / `Accept & open chat`. Modal surfaces
stay white; nothing inside them is tinted.

- URLs inside the question text render as links and open in a new tab.
- Attachments are not part of the first version.
- Accepting opens a **1-to-1 chat with the person who asked** — not a team chat.
  There is no separate "my projects" page in the space: the project a question
  came from is named on the request itself and behind its popover.

**Project mentions open a popover.** Anywhere a project is named in the space —
the modal's project row, the project line on a request card, the project on a
review card — hovering it opens the compact
project popover. Use the variant **without** the "I'm there" block
(`Popover — Project (no user link)` in the design file): that section is a user
context from the talent card, and an advisor is not on the team. `Open project`
still leads to the full project page.

### 4.2 `/advisor/reviews` — reviews left after pitch streams

Experts score projects they hear pitched at streams and demo days. The advisor
owns these rows and can create, edit and delete them (CRUD).

**The rows already exist**: `ProjectEstimation` (`projectId`, `expertId`,
`notes`, `isApproved`, `data`) is what the scout project card already reads in
`getProjectCardReviews`, and what `evaluateTaskCondition` counts. This page is
the author's side of the same table — not a new entity.

- Filters: stage, stream, search by project; `Load more` at the end.
- Card: project tile and name, stage chip, date, star rating with the score,
  the review text, and in the foot — when it was edited, plus `Edit` / `Delete`.
- **Draft or published, no visibility switch.** A published review is simply
  visible on the project card — there is nothing to toggle. An unfinished one is
  a **draft**: it carries a `Draft` chip, reads *only you can see it*, and gets a
  `Publish` action next to `Edit` / `Delete`.
- **Review modal** (create and edit in one form): project, stage at the time of
  the review, optional stream/event, rating 1–5 and the text. A draft shows the
  `Draft` chip beside the title; the footer is `Delete review` on the left and
  `Save as draft` / `Publish review` on the right.
- One review per (advisor, project, stage) — a later stage is a new review, which
  is what makes the history readable on the project card.
- **Today a review needs no request behind it**: hearing the project pitched is
  enough, and the stream is an optional field. The direction is to tighten this
  later — a review only inside a specific pitch event the advisor took part in —
  so keep `eventId` on the row from day one even while it is optional.

### 4.3 `/advisor/settings`

Same shape as scout settings: a 300px section menu plus a form card.

- **General** — the mentorship form moved out of the profile: speciality,
  *a list of questions that can be addressed to you* (the dynamic row list the
  profile form already uses), query response rate, and **the workflow stages the
  advisor can help on** — a multi-select over the nine stages of the `default`
  `WorkflowSchema`, not free text: they are what the Checkpoint landing shows under
  a curator card, and a hand-typed stage matches nothing.
- **Requests** — auto-decline after N days without an answer, pause new requests.
  **Pausing hides the advisor from `/hub/experts` entirely** — no *Paused* badge,
  no disabled ask button: a card nobody can act on is noise in a catalogue.
  Requests already accepted are unaffected.
- **Danger zone** — stop being an advisor: closes the space and hides the card.

`/user/settings/mentorship` keeps only the switch, the agreement state and a link
into the space. One flag, two honest entry points: turn it on in the profile,
leave from the space.

## 5. Data

Existing, unchanged: `AdviceRequest` (already carries `fromUserId`, `toUserId`,
`projectId`, `status`, `matrixRoomId`), `Speciality.isOpenForMentoring`,
`Speciality.openForQuestions`, `Speciality.timeForMentoring`.

Schema changes (in `@gdhub-io/gdhub-prisma`, not in this repo) — one model
extended:

```prisma
// Reviews are ProjectEstimation, which already exists and is already read by the
// scout project card. What the page needs on top of today's columns:
model ProjectEstimation {
  id         String   @id @default(cuid())
  projectId  String
  expertId   String
  notes      String   // the review text
  isApproved Boolean  // the verdict scouts see
  data       Json     // criteria breakdown, free-form

  // added for the advisor space:
  stage      String                    // the project's stage when it was written
  eventId    String?                   // the stream / demo day it was heard at
  rating     Int                       // 1..5, the stars on the card
  status     ProjectEstimationStatus @default(Draft) // Draft | Published
  createdAt  DateTime @default(now())  // the model has no timestamps today
  updatedAt  DateTime @updatedAt       // the card shows "Edited …"

  expert  User    @relation(fields: [expertId], references: [id])
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  event   Event?  @relation(fields: [eventId], references: [id])

  @@unique([expertId, projectId, stage])
  @@index([projectId, status])
  @@index([expertId, updatedAt(sort: Desc)])
}
```

**Consequence to handle in the same change:** every existing reader must filter
`status: Published` — `getProjectCardReviews` in `src/repositories/scout.project-card.ts`
and the estimation count in `src/services/workflow/evaluateTaskCondition.ts` —
otherwise a draft would show on the project card and satisfy a workflow task.

Also needed: advisor preferences (auto-decline window, paused). Either two
columns on `Speciality` next to the mentorship fields, or a small
`AdvisorSettings` row keyed by user — the second is cleaner once the settings
page grows.

And `curatorStages String[]` on `Speciality`, beside `openForQuestions`: the
stages the advisor takes checkpoints on, stored as names from the `default`
`WorkflowSchema`. `CheckpointCuratorsSection` on the Checkpoint landing is the
first reader and today shows nothing in their place — see
[checkpoint-landing.md](design/specs/checkpoint-landing.md).

## 6. API surface

| Route | Purpose |
|---|---|
| `PUT /api/user/profile/mentorship` | the switch; turning it on carries the Advisor Agreement tick |
| `GET /api/advisor/requests` | incoming requests, filtered by status |
| `PUT /api/user/advice-request/[id]/accept` \| `/reject` | exist already; accept also opens the 1-to-1 chat |
| `GET/POST /api/advisor/reviews`, `PUT/DELETE /api/advisor/reviews/[id]` | CRUD over `ProjectEstimation` rows owned by the advisor; `status` decides draft vs published |
| `GET/PUT /api/advisor/settings` | speciality, questions, response rate, auto-decline, pause |

All handlers follow the `withAuth` / `withValidation` pipeline in
`src/lib/api-handlers.ts`, and every write checks the `advisor.*` permission.

## 7. Design references

Frames in `docs/design/platform-design.pen`, row **Advisor Space**:

- `Advisor — Requests (/advisor/requests)`, `Advisor — Requests · empty`
- `Advisor — Reviews (/advisor/reviews)`, `Advisor — Reviews · empty`
- `Advisor — Settings · General`, `Advisor — Settings · Requests`
- `Modal — Advice request`, `Modal — Review (create / edit)`,
  `Modal — Advisor agreement`
- `Popover — Project (no user link)` — reused for every project mention
- `Advisor — states note` — loading and error behaviour for both lists
- `Legal · Advisor · agreement accepted, space on` (`isYQT`),
  `Legal · Advisor · switched on, agreement not accepted` (`ep5EM`),
  `Legal · Advisor · Agreement modal` (`Opj60`)

## 8. Decisions and what is still open

Settled:

- **The Advisor Agreement is a tick, not a signature** (decided 2026-10-18): it is a
  public offer, and the recorded acceptance is the evidence (§2).
- **A review needs no request today** — a pitch stream is enough. Later it is
  meant to be scoped to a specific pitch event (§4.2).
- **A paused advisor disappears from `/hub/experts`**, rather than staying with a
  badge (§4.3).

Still open — **the mentor fund** (`ProjectEquity.mentorFundShare`). Two documents
pull in different directions and both have to exist before this becomes a page:

- the advisor ↔ platform agreement says plainly that helping a project earns no
  share of it — that is what keeps the volunteer framing honest;
- a separate advisor ↔ author agreement would be what actually allocates
  something from the project's mentor fund, at the author's discretion.

Until the second one exists there is nothing to pay out and nothing to show, so
the space stays without an equity page. Whoever picks this up decides first which
document grants what, then designs the page.
