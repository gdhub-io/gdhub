# Chat registry — required Prisma schema change (external package)

Chats are unified onto the existing `ChatRoom` / `ChatRoomMember` registry instead
of a per-feature table. The change is **additive to `ChatRoom`** — apply it in the
`@gdhub-io/gdhub-prisma` package source, add a migration, then `bun run db:generate`
in the app. (The app's generated client is updated locally for development, but the
canonical change must live in the package.)

## 1. Two new enums

```prisma
enum ChatRoomKind {
  AdminDirect
  AdviceRequest
  VacancyOffer
  ProjectGroup
  EventGroup
  CourseGroup
}

enum ChatRoomStatus {
  Open
  Closed
}
```

## 2. Additive fields on the existing `ChatRoom` model

Add `matrixRoomId`, `kind`, `status`, `finishedAt` (and a `kind` index):

```prisma
model ChatRoom {
  id            String         @id @default(cuid())
  matrixRoomId  String?        @unique          // NEW — maps to the Matrix room
  kind          ChatRoomKind   @default(AdminDirect)  // NEW — drives the app context provider
  status        ChatRoomStatus @default(Open)    // NEW — Open | Closed (groups stay Open)
  isDirect      Boolean        @default(true)
  title         String?
  directKey     String?        @unique           // dedup key, e.g. vacancy:{vacancyId}:{candidateId}
  context       Json?                            // denormalized refs, e.g. { vacancyId, candidateUserId }
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  finishedAt    DateTime?                        // NEW — set when status -> Closed
  lastMessageAt DateTime?

  members ChatRoomMember[]

  @@index([isDirect])
  @@index([lastMessageAt])
  @@index([kind])                                // NEW
}
```

No new table and no changes to `ChatRoomMember`, `TeamMember`, `User`, or
`TeamVacancy` are required. (The earlier `VacancyChat` proposal is dropped.)

## 3. Migrate

In the package repo:

```bash
gdhub-prisma migrate dev --name chatroom_kind_status_matrix
```

Then in the app, after bumping the package:

```bash
bun run db:generate
```

## How the app uses it

- One `ChatRoom` row per logical chat; `matrixRoomId` links to the Matrix room
  (transport). `directKey` dedups (`vacancy:{vacancyId}:{candidateId}` etc.).
- `kind` selects a context provider in `src/services/chat/providers.ts`
  (`buildContext` / `canClose`), so generic chat routes/UI don't branch per type.
- New chat types = one provider + one invite component, no new tables.
