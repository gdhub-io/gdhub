# Sprints

How a sprint works, what it stores and what has to be built. Grows out of
[docs/intent/GDHUB-31-sprints.md](intent/GDHUB-31-sprints.md); where the two
disagree, the intent wins.

The rules a curator and an author follow are in
[docs/sprint-standard.md](sprint-standard.md). This file is the engineering side
of the same thing.

## 1. Vocabulary

- **Sprint** — 28 days on one project with a stated goal and a verdict at the end.
- **Curator** — who runs the sprint. Either a person or **the AI curator**. One
  role, two kinds; `curatorKind` says which.
- **Goal card** — inputs, outcomes and one sentence, fixed on day 1.
- **Check-in** — a member confirming once a week that they are still working.
- **Result card** — the report and the verdict, written at the end.
- **Stage** — `ProjectWorkflowStep`. A stage takes one sprint or several.

The stages are the ones that already exist. The `default` workflow, seeded in the
schema package and pointing at the Gamelab pipeline, runs: Introduction, Ideation,
Concepting, Prototyping, Preparing a demo version, Taking and analyzing metrics,
Preparing a release version, Support, Project Completion. Nothing here invents a
ladder of its own — sprints run inside those nine.

Note what is already on them: `Request expert advice` is a task on five stages,
carrying the `advice_requests` condition. That is the existing consultation and
the human curator stands beside it, not in place of it.

## 2. Data

Lands in `@gdhub-io/gdhub-prisma` and is released before any code here uses it.

```prisma
model ProjectSprint {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  stepId    String?                      // stage the sprint runs inside
  step      ProjectWorkflowStep? @relation(fields: [stepId], references: [id], onDelete: SetNull)
  stageName String                       // snapshot: the stage can be edited or deleted later
  order     Int                          // sprint number within the stage

  curatorKind SprintCuratorKind          // AI | Human
  curatorId   String?                    // null for the AI curator
  curator     User?    @relation("sprintCurator", fields: [curatorId], references: [id])

  status    SprintStatus @default(Draft) // Draft | Active | Review | Closed | Cancelled
  goal      String
  inputs    Json                         // string[]: what exists at the start
  outcomes  Json                         // string[]: what must exist at the end

  revisedAt   DateTime?                  // day 14 scope change, if any
  revisedNote String?

  startedAt DateTime?
  dueAt     DateTime?

  midNote   String?                      // day 14 note from the curator
  summary   String?                      // result card
  verdict   SprintVerdict?               // StageClosed | GoalMet | GoalMissed
  verdictNote String?
  decidedAt DateTime?
  decidedById String?                    // null when the AI curator decided

  paymentId String?  @unique

  checkIns  SprintCheckIn[]
  feedback  SprintFeedback?
  reports   ProjectReport[]
  documents TeamDocument[]

  @@unique([stepId, order])
  @@index([projectId, status])
  @@index([curatorId, status])
}

model SprintCheckIn {
  id          String   @id @default(cuid())
  sprintId    String
  sprint      ProjectSprint @relation(fields: [sprintId], references: [id], onDelete: Cascade)
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  week        Int                        // 1..4
  requestedAt DateTime
  confirmedAt DateTime?
  source      String?                    // "email" | "app"

  @@unique([sprintId, userId, week])
}

model SprintFeedback {                   // how the author rated the assessment
  id        String   @id @default(cuid())
  sprintId  String   @unique
  sprint    ProjectSprint @relation(fields: [sprintId], references: [id], onDelete: Cascade)
  authorId  String
  rating    Int                          // 1..5 — low is disagreement
  comment   String?
  createdAt DateTime @default(now())
}

enum SprintCuratorKind { AI Human }
enum SprintStatus      { Draft Active Review Closed Cancelled }
enum SprintVerdict     { StageClosed GoalMet GoalMissed }
```

Also in the package: `ProjectReport.sprintId`, `TeamDocument.sprintId` and
`TeamDocument.stepId`, all nullable with an index, `PayableType.SPRINT`, and
`TeamDocumentType.SprintArtifact`.

`stepId` is nullable and `stageName` is a snapshot because an admin can edit a
project's workflow and delete steps. A closed sprint has to stay readable after
the stage it ran in is gone.

`checkIns` rows are created when the request goes out, not when confirmed, so an
unanswered week is a row with `confirmedAt: null` rather than a missing row. The
report needs the difference.

## 3. Lifecycle

| Status | Means | Leaves it by |
|---|---|---|
| `Draft` | Goal card being written, not paid | Payment succeeds → `Active`; author cancels → `Cancelled` |
| `Active` | The 28 days | Day 28 → `Review` |
| `Review` | Collection stopped, verdict pending | Verdict written → `Closed` |
| `Closed` | Result card stored | Terminal |
| `Cancelled` | Never started | Terminal |

One `Active` or `Review` sprint per project at a time. A new sprint may be
created once the previous one is `Closed`, and its goal card is pre-filled from
that sprint's result card.

## 4. Calendar

Day 1 is `startedAt`. Weeks are days 1–7, 8–14, 15–21, 22–28.

| Day | What happens | Stored |
|---|---|---|
| 1 | Goal card fixed. AI curator checks it is reachable in 28 days and says so. A human curator does this on the call. | `goal`, `inputs`, `outcomes` |
| 4, 11, 18, 25 | Devlog reminder, only if that week has no devlog | — |
| 6, 13, 20, 27 | Check-in request, only to members not already confirmed that week | `SprintCheckIn` rows |
| 7, 21 | Curator answers the week's devlog | comment on `ProjectReport` |
| 14 | Scope moment. See §6. | `midNote`, and `revisedAt` if the author changes the outcomes |
| 26 | Artifact reminder | — |
| 28 | Sprint moves to `Review`, report assembled | `summary` |
| 28–30 | Verdict written | `verdict`, `decidedAt`, `decidedById` |

The author may change `outcomes` only on day 14, and the change is stored as
`revisedNote` beside the original — never over it.

## 5. Weekly check-in

The link in the email carries a token, not a session:

```
token = base64url(sprintId + ":" + userId + ":" + week + ":" + hmac)
hmac  = HMAC-SHA256(sprintId|userId|week, SPRINT_CHECKIN_SECRET)
```

`GET /api/sprint/check-in?t=<token>` resolves the token and renders a page with
one button. The button `POST`s to the same route and writes `confirmedAt`.

**The confirm page is deliberate.** A bare `GET` that writes would be triggered by
the link scanners that most mail providers run, and every member would look
present without opening the mail. The verdict rests on this data, so it must not
be forgeable by a scanner. From the member's side it is still one click in the
mail and one on the page.

The same action sits on the in-app notification, where the session already
identifies the user and no token is needed.

**Work already done counts as the check-in.** Anyone who authored a devlog that
week is confirmed for that week automatically, `source: "devlog"`; so is anyone
who attached an artifact, `source: "artifact"`. They are never asked. Nobody is
made to press a button to say they did the thing they visibly just did.

That is why the request goes out at the end of the week rather than the start:
by day 6 the week's devlog either exists or does not, and only the people it does
not cover are asked. One notification instead of two, and only to those who need
it.

Only real contributions count. A visit, a login or opening the page is not
activity, and treating it as such would make the whole signal worthless.

Rules: the token is valid until the end of its week, and confirming twice is a
no-op.

**A row only covers the weeks a person was actually on the team.** Someone who
joined on day 15 is not absent for weeks one and two — they were not there. Those
cells are blank rather than missed, and the row says when they started: "joined
14 Aug". Requests begin the following week. The same in reverse for someone who
left: the weeks after they went are blank and the row says when.

Getting this wrong is not cosmetic. The verdict reads the matrix, so a member
counted as missing for weeks they had not joined makes a team look like it was
falling apart when it was growing.

## 6. The scope moment, day 14

The AI curator compares `outcomes` against the devlogs written so far and the
artifact if one exists, then writes `midNote`. The note:

- lists the outcomes nothing has been claimed against,
- says how much of the calendar is gone,
- asks the author to decide what to drop.

**It never names the cut.** That judgement belongs to a human curator, and saying
otherwise would sell the AI curator as something it is not. The author changes
the outcome list themselves, or leaves it.

"Behind" is: half the calendar gone and at least one outcome with nothing claimed
against it in any devlog. A quiet week on its own is not the signal.

## 7. The AI curator

Five model calls per sprint, through `src/services/openai`, following the shape
of `src/services/ai-validation` (typed input, typed result, prompts in their own
folder, no free-text parsing):

| When | Input | Output |
|---|---|---|
| Day 1 | Goal card, project stage and its template requirements | Is this reachable in 28 days, and what is missing from the outcome list |
| Days 7, 21 | That week's devlog, goal card | Short answer to the devlog |
| Day 14 | Devlogs so far, outcomes, artifact | `midNote` per §6 |
| Day 28 | Everything below | `summary` and `verdict` |

Report input on day 28, facts only:

- goal card, and the day-14 revision if there was one,
- every devlog of the sprint with dates,
- check-in matrix: member by week,
- the artifact: link, screenshots, the author's description,
- the stage and what the workflow template says it requires.

The model never sees anything the platform cannot show the author.

**Guardrails.** It reads screenshots, text at a public URL, and the author's
description. It does not run builds and no copy may imply it does. It cannot
write `StageClosed` when there is no artifact and no devlog claims an outcome —
that combination is `GoalMissed` regardless of what the model returns.

## 8. Verdict and the workflow

Three values, and every one of them ends the sprint:

| Verdict | Means | Next |
|---|---|---|
| `StageClosed` | Outcomes delivered and the stage's requirements met | The stage can be left |
| `GoalMet` | Outcomes delivered, stage needs more | New sprint on the same stage |
| `GoalMissed` | Outcomes not delivered | New sprint, inputs recomputed from what exists |

The stage is not opened by a button. A new condition source joins the eleven in
`src/schemas/workflowTaskCondition.ts`:

```ts
{ source: "sprint_verdict", verdict: "StageClosed" }
```

```ts
case "sprint_verdict": {
  const count = await prisma.projectSprint.count({
    where: { stepId, verdict: "StageClosed" },
  });
  return count >= 1;
}
```

A required task carrying that condition is seeded into every stage of the
workflow template, worded like the tasks already there — imperative and plain,
"Close the stage with a sprint verdict". `PUT /api/project/move` already recomputes conditions and
refuses to advance while a required task is undone, so nothing in the transition
changes.

The scout project card reads `decidedById` on the sprint that closed the stage
and shows either the AI curator or the person's name.

## 9. Artifacts

### Kinds, and what the AI curator can do with each

An artifact is evidence that an outcome exists. Four kinds, and the platform
never runs anything:

| Kind | How it arrives | What the AI reads |
|---|---|---|
| **Document** | Link to a doc, deck or PDF | The text, if the link is publicly reachable |
| **Image** | Uploaded through `SanityService.uploadImage` | The image itself, with vision |
| **Video** | Link preferred; a short file if there is no link | Frames sampled evenly, plus the speech transcript |
| **Build or page** | Link to itch, Steam, a repository | The page text only. It is never downloaded and never run |

**Video is how the game gets seen without being run.** A gameplay clip or a
trailer says more than a build would, and it costs nothing to look at safely: no
runtime, no operating systems to match, no antivirus, no sandbox. Frames are
sampled server-side with ffmpeg on the queue, and where there is narration the
transcript usually carries the pitch itself. Only the extracted frames are kept;
an uploaded file is dropped afterwards.

This fits what the product already does — `Project.videoLink`, the `video` field
on a devlog, and the existing Concepting task "Add a pitch or gameplay video".

**The honest limit.** Frames and a transcript show that a thing exists and
roughly what it is: a level, a character, a UI, a menu. They do not show how it
feels to play. Nobody can tell from a clip that the jump is floaty. That
judgement is what the human curator sells, and no copy in the product may blur
the line.

### Every artifact is checked before it counts

An artifact the backend cannot open is not evidence. It is checked when it is
added, not at the end — a failure found on day 28 is a failure the author can no
longer fix.

The check runs on the queue and stores its result on the artifact:

| Result | Means | Shown as |
|---|---|---|
| `readable` | Fetched, the type matches what was claimed, within the size limit | Ready |
| `unreachable` | Timed out, refused, 404, or needs a login | Cannot be opened, with the reason |
| `unsupported` | Fetched, but nothing here reads this type | Saved, but the curator sees only the description |
| `pending` | Not checked yet | Checking |

`200` alone proves nothing. A private Google Drive or Notion link answers `200`
with an HTML login page, so the check compares the actual content type against
the kind the author chose: HTML where a video or a PDF was promised is
`unreachable`, not `readable`. For a video the platform needs either a direct
file or a provider it can extract frames from; a page that merely embeds a player
is a page, and is recorded as one.

The check is repeated once when the sprint closes, because links rot and
permissions change mid-sprint.

**Fetching a URL a user supplied is a way into the network,** so the fetcher
refuses anything that is not http or https, resolves the host first and rejects
loopback, link-local and private ranges, follows at most three redirects and
re-checks the target of each, caps the body, and times out. This is the same
class of hole as an image proxy and it gets the same treatment.

An unreadable artifact counts as no artifact for the `StageClosed` guardrail, but
the report says which of the two it was. "You attached a build we could not open"
and "you attached nothing" are different things to tell an author who paid.

### The tab


The project's **Documents** tab becomes **Artifacts**: same model, new name,
route `/user/project/[slug]/artifacts` with a redirect from the old one. The i18n
keys move with it.

Each artifact may name the sprint and the stage it came from. Both are nullable —
everything uploaded before sprints existed has neither, and stays listed.

The list groups by stage in workflow order, then by sprint number, then by date.
Artifacts with no stage sit in an "Unsorted" group at the end.

**Left for later, deliberately.** Which artifact supersedes which — a build from
sprint 3 replacing the one from sprint 2, a design document that is still current
two stages on — is a real question and this is not the change that answers it.
The grouping above is enough to read the history; superseding needs its own
thinking and its own issue.

## 10. Admin

**Assigning a curator.** An admin can set the curator on a sprint to any user,
including themselves, and can set `curatorKind` to `Human` without a payment.
That is how a sprint is given for free. Behind `admin.sprints.manage`; nothing on
the project space grants it. Every assignment writes an `AuditLog` row.

**Not breaking a running sprint.** Today `PUT /api/admin/project-workflow/[id]`
deletes steps through `plan.deleteIds`, and `POST .../reset` re-applies a
template. Either one, run on a project with a sprint in `Active` or `Review`,
would pull the stage out from under it.

Both refuse while such a sprint exists, and the refusal names the sprint and its
end date. The reset's `dryRun` plan reports the same thing instead of a plan, so
an admin sees it before confirming rather than after.

The `sprint_verdict` task seeded into each stage is what gates the workflow. An
admin removing it from a template silently ungates every project on that
template, so the template editor marks it and asks for a second confirmation
before it goes.

## 11. Money

`PayableType.SPRINT`, `payableId` = sprint id, the existing Paddle flow. The
sprint stays `Draft` until the payment webhook lands, then becomes `Active` with
`startedAt` at that moment.

The AI curator has one price in config for now. The human curator's price is
computed from their hourly rate and lands with that issue.

No refunds are automated. A sprint that a curator abandoned is an admin action.

## 12. Permissions

New feature on the project space:

```ts
// project space
sprints: ["view", "create", "manage"],
// admin space
sprints: ["manage"],   // assign a curator, close a stuck sprint
```

- `create` and `manage` — Owner and Admin.
- `view` — every member; Guests see nothing.
- The human curator gets `view` plus the right to write the result card, granted
  for the life of the sprint and revoked when it closes. That arrives with the
  human-curator issue.

## 13. Screens

**The rule for all of them: show what has to happen now, and put the rest in a
thread.** A sprint is 28 days of events, not a dashboard of panels. The first
draft of this section was a wall — header, goal card, matrix, devlogs, artifact,
note, calls, all at once — and in a wall nobody finds the one thing they are
supposed to do.

`/user/project/[slug]/sprints`, a new tab beside Workflow and Artifacts.

| Screen | Holds |
|---|---|
| Sprint list | One row per sprint: stage, number, dates, verdict or day counter. The running one is a card, the past ones are rows. |
| Start a sprint | One step per page, each with its own route: what exists now, what will exist in 28 days, who curates, pay. |
| Sprint page | A short header, **one action card**, then the thread. |
| Verdict | The curator's own focused screen, reached from their list. Not a section on the project's page. |
| Artifacts | The renamed Documents tab, grouped by stage and sprint |

### The sprint page

Three things, in this order:

1. **Header, one line high.** Stage, sprint number and the dates as one meta
   line — "Prototyping · Sprint 1 · 1–28 Aug 2026" — with the curator and the
   status beneath. The status slot has three faces: the day counter while the
   sprint runs, "awaiting verdict" between day 28 and the decision, the verdict
   once it lands. Nothing else in the header.
2. **The action card.** What is owed right now, with the button on it. Usually
   one; when nothing is owed there is no card.
3. **The thread.** Every event of the sprint in time, one row each: devlogs with
   the curator's answer beneath them, the day-14 note, check-in weeks as they
   close, the artifact when it lands, the verdict at the end.

**Every action is one press, on the spot, in a modal.** Nothing is reached by
navigating somewhere else and coming back. An entry in the thread that can still
be acted on keeps its own button, so an artifact that was never attached can be
attached from the artifact entry, and a verdict from a week ago can still be
rated from the verdict entry.

| Moment | Action | Opens |
|---|---|---|
| Any week | Write the devlog | Modal |
| Weekly | I am working on this | No modal — one press |
| Day 14 | Decide what to drop | Modal: the outcome list, tick what comes off |
| By day 26 | Attach the artifact | Modal: kind, link or upload, description |
| Human curator | Join the call | Button with the link, live around the time |
| After the verdict | Rate the assessment | Modal: stars and a comment |

The one exception is the curator writing a verdict. It needs the goal card and
the devlogs visible while it is written, which a modal cannot hold, so it is a
drawer over their own list — still one press, still no navigation.

Everything that was a panel becomes either a thread entry or a collapsed line:

- The goal card collapses to the sentence plus "3 of 5 outcomes claimed", and
  opens with `DisclosureSection`.
- The check-in matrix is one compact row per member with four dots, not a table.
- Artifacts show as a count and a link; they live in their own tab.

### Starting a sprint

One step per page, each on its own route under `/sprints/new`, not a wizard
inside one screen. Every step writes to the `Draft` sprint as it is left, so the
back button works, a refresh loses nothing, and a half-filled sprint is still
there tomorrow. `SprintStatus.Draft` exists for exactly this; it is not a state
invented for the payment gap.

The steps: what exists now, what will exist in 28 days, who curates, then a
summary with the price and the payment. Progress across the top, back and next at
the bottom, and leaving is not losing.

### Where a review and a rating are written

Neither gets its own destination, because a destination is a thing people fail to
find.

- **The verdict** is written by the curator from their own list, in a drawer
  holding the goal card, the devlogs and the three buttons. One press from the
  row, no navigation, and roomy enough to write in. That is their whole job on
  that day; it should not be a section of somebody else's page.
- **The author's rating** appears in the thread as an entry the moment the verdict
  lands: the verdict, and directly under it "was this assessment any use?" with
  the rating inline. It is answered where it is read.

  Stars and a comment, nothing else. There is no separate "do you agree" control:
  a low rating is disagreement, and the comment says what was wrong with it.

  **It is optional and most people will skip it.** Nothing waits on it: the sprint
  closes, the stage opens and the next sprint starts whether or not it was
  answered. No modal, no blocking step, no reminder. The entry simply stays
  unanswered in the thread, and a past sprint can still be rated later.

  Absence is a value, not a zero. Anywhere a rating is shown, the number of
  answers is shown beside it, and no average is displayed below five answers —
  two five-star ratings must not outrank forty averaging 4.6. The share of AI
  verdicts rated one or two is the number that says whether the AI curator can be
  trusted with a stage, and it is a share of the ones that were rated. Read it
  knowing the sample leans unhappy: people who disagree answer more often.

## 14. Notifications

New Novu workflows beside the existing ones:

| Key | To | When |
|---|---|---|
| `sprint-checkin-request` | Each member | Days 3, 10, 17, 24 |
| `sprint-devlog-reminder` | Author and publishers | Days 6, 13, 20, 27, if the week has no devlog |
| `sprint-mid-note` | Author | Day 14 |
| `sprint-artifact-reminder` | Author | Day 26 |
| `sprint-closed` | Author and members | When the verdict is written |

One cron route, `api/cron/sprints`, daily, behind `withAuth({ mode: "vercel_cron" })`
and wrapped in `runWithCronLog`. It walks `Active` sprints, computes the day
number from `startedAt`, and dispatches. Heavy work — the day-14 note and the
day-28 report — goes onto a BullMQ queue, not into the request.

## 15. Tests

Money changes hands here and a verdict moves a project forward, so this is not a
feature that ships on manual checks.

**Unit — Vitest.** What can be wrong silently:

- Day arithmetic across a timezone and across a month boundary.
- The check-in token: wrong week, wrong user, tampered payload, expired.
- The check-in matrix when a member joins or leaves mid-sprint.
- A devlog author is confirmed for that week without pressing anything, and is
  not sent a request.
- `sprint_verdict` condition: a `GoalMet` verdict must not open the stage.
- The guardrail: no artifact and no claimed outcome cannot produce `StageClosed`,
  whatever the model returned.
- The artifact check: a login page answering `200` is `unreachable`, not
  `readable`; a content type that contradicts the chosen kind is refused.
- The fetcher refuses loopback, link-local and private addresses, and refuses a
  redirect that lands on one.
- Only one `Active` sprint per project.
- A sprint stays `Draft` until the payment webhook lands.
- The payment webhook is idempotent: the same event twice starts one sprint.
- A sprint closes and the next one starts with no feedback at all.
- No average rating is shown below five answers.
- A closed sprint still reads correctly after its stage is deleted.
- The admin workflow edit and reset both refuse under a running sprint.
- Only an admin can assign a curator; a project Owner cannot.

**E2E — Playwright, `tests/e2e`, authed.** The paths where a failure costs a
customer money or a wrong stage:

1. Author creates a sprint, pays, the sprint starts and the project shows it.
2. Payment fails or is abandoned — the sprint stays `Draft` and nothing was
   charged.
3. A member opens the check-in link from the mail, confirms, and the matrix shows
   the week filled.
4. A sprint closes with `StageClosed` and the project can then move to the next
   stage; with `GoalMet` it cannot.
5. An admin assigns a curator without payment and the sprint runs.
6. An admin tries to reset the workflow under a running sprint and is refused.

The model is stubbed in tests; the AI curator's output is fed in as a fixture so
the assertions are about what the platform does with a verdict, not about what
the model wrote.
## 16. Order of work

1. Schema release in `../prisma`.
2. Sprint object, tab, list, goal card, permissions.
3. Cron route, check-in tokens and page, devlog reminders, artifact.
4. AI curator: the five calls, `midNote`, report, verdict.
5. `sprint_verdict` condition, seeded task, scout card.
6. Paddle.
7. Documents renamed to Artifacts, with the stage and sprint links.
8. Admin: curator assignment, and the guards on workflow edit and reset.
