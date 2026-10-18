# Checkpoints

How a checkpoint works, what it stores and what has to be built. Grows out of
[docs/intent/GDHUB-31-checkpoints.md](intent/GDHUB-31-checkpoints.md); where the two
disagree, the intent wins.

The rules a curator and an author follow are in
[docs/checkpoint-standard.md](checkpoint-standard.md). This file is the engineering side
of the same thing.

**The page this describes has been redesigned (GDHUB-57).** The checkpoint is now one page
laid out as a path — the purchase, four **sprints**, the checkpoint itself — and the unit
inside it is a sprint of seven days counted from the day it started, never a calendar week.
Where this file still says "week", or describes the action card and the thread, the current
shape is in [docs/design/specs/checkpoints.md](design/specs/checkpoints.md) and that file
wins. What is stored, and §8 of the design spec on what the schema cannot hold yet, are the
two places to read before changing data.

## 1. Vocabulary

- **Checkpoint** — the point at the end of the 28 days where the work is taken or
  not. It is the finish, not the journey.
- **The 28 days** — the way to it. They run; the checkpoint does not.
- **Curator** — who runs the checkpoint. Either a person or **the AI curator**. One
  role, two kinds; `curatorKind` says which.
- **Goal card** — inputs, outcomes and one sentence. Written when the checkpoint
  is bought, **agreed with the curator on day 1**, and fixed from that moment.
- **Pulse** — a member confirming once a week that they are still working.
- **Result card** — the report and the verdict, written at the end.
- **Stage** — `ProjectWorkflowStep`. A stage takes one checkpoint or several.

**The copy follows that split, everywhere.** A checkpoint is a date the project is
heading for, so nothing "runs a checkpoint" or says "the checkpoint is running":
the 28 days run, the team is on day 14 of 28, and the checkpoint is on 28 Sep. A
save point is somewhere you reach — the word only works if the product keeps it
in the future tense until the day it lands.

The stages are the ones that already exist. The `default` workflow, seeded in the
schema package and pointing at the Gamelab pipeline, runs: Introduction, Ideation,
Concepting, Prototyping, Preparing a demo version, Taking and analyzing metrics,
Preparing a release version, Support, Project Completion. Nothing here invents a
ladder of its own — checkpoints run inside those nine.

Note what is already on them: `Request expert advice` is a task on five stages,
carrying the `advice_requests` condition. That is the existing consultation and
the human curator stands beside it, not in place of it.

## 2. Data

Lands in `@gdhub-io/gdhub-prisma` and is released before any code here uses it.

```prisma
model ProjectCheckpoint {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  stepId    String?                      // stage the checkpoint belongs to
  step      ProjectWorkflowStep? @relation(fields: [stepId], references: [id], onDelete: SetNull)
  stageName String                       // snapshot: the stage can be edited or deleted later
  order     Int                          // checkpoint number within the stage

  curatorKind CheckpointCuratorKind          // AI | Human
  curatorId   String?                    // null for the AI curator
  curator     User?    @relation("checkpointCurator", fields: [curatorId], references: [id])

  status    CheckpointStatus @default(Draft) // Draft | Active | Review | Closed | Cancelled
  goal      String
  items     CheckpointItem[]             // inputs and outcomes, each with its evidence

  revisedAt   DateTime?                  // day 14 scope change, if any
  revisedNote String?

  startedAt DateTime?
  dueAt     DateTime?

  midNote   String?                      // day 14 note from the curator
  summary   String?                      // result card
  verdict   CheckpointVerdict?               // StageClosed | GoalMet | GoalMissed
  verdictNote String?
  decidedAt DateTime?
  decidedById String?                    // null when the AI curator decided

  paymentId String?  @unique

  // The ticks before paying are LegalAcceptance rows with this checkpointId
  // (Purchase Terms, Withdrawal Waiver) — see docs/legal/legal-layer.md.

  goalAgreedAt   DateTime?                // consultation 1: the card the 28 days are judged against
  goalAgreedById String?                  // null when the AI curator confirmed it

  pulses  CheckpointPulse[]
  feedback  CheckpointFeedback?
  reports   ProjectReport[]
  documents TeamDocument[]

  @@unique([stepId, order])
  @@index([projectId, status])
  @@index([curatorId, status])
}

model CheckpointItem {
  id           String   @id @default(cuid())
  checkpointId String
  checkpoint   ProjectCheckpoint @relation(fields: [checkpointId], references: [id], onDelete: Cascade)
  kind         CheckpointItemKind         // Input | Outcome
  order        Int
  text         String

  artifactId   String?                    // the evidence, chosen or added on the spot
  artifact     TeamDocument? @relation(fields: [artifactId], references: [id], onDelete: SetNull)

  cut          Boolean  @default(false)   // dropped on day 14; still shown, no longer owed
  originalText String?                    // the wording bought, kept from the first rewrite on day 1 or 14
  addedAt      DateTime?                  // set when the line was added on day 14, not on day 1
  note         String?                    // the author's line about what actually landed
  acceptedNote String?                    // a human curator counting an outcome with no artifact

  @@unique([checkpointId, kind, order])
  @@index([artifactId])
}

model CheckpointPulse {
  id          String   @id @default(cuid())
  checkpointId    String
  checkpoint      ProjectCheckpoint @relation(fields: [checkpointId], references: [id], onDelete: Cascade)
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  week        Int                        // 1..4
  requestedAt DateTime
  confirmedAt DateTime?
  source      String?                    // "email" | "app"

  @@unique([checkpointId, userId, week])
}

model CheckpointFeedback {                   // how the author rated the assessment
  id        String   @id @default(cuid())
  checkpointId  String   @unique
  checkpoint    ProjectCheckpoint @relation(fields: [checkpointId], references: [id], onDelete: Cascade)
  authorId  String
  rating    Int                          // 1..5 — low is disagreement
  comment   String?
  createdAt DateTime @default(now())
}

enum CheckpointItemKind    { Input Outcome }
enum CheckpointCuratorKind { AI Human }
enum CheckpointStatus      { Draft Active Review Closed Cancelled }
enum CheckpointVerdict     { StageClosed GoalMet GoalMissed }
```

Also in the package: `ProjectReport.checkpointId`, `TeamDocument.checkpointId` and
`TeamDocument.stepId`, all nullable with an index, `PayableType.CHECKPOINT`, and
`TeamDocumentType.CheckpointArtifact`.

`stepId` is nullable and `stageName` is a snapshot because an admin can edit a
project's workflow and delete steps. A closed checkpoint has to stay readable after
the stage it ran in is gone.

`pulses` rows are created when the request goes out, not when confirmed, so an
unanswered week is a row with `confirmedAt: null` rather than a missing row. The
report needs the difference.

**Items are rows, not a `Json` list, because each one points at an artifact.** A
list of strings cannot hold that link: an artifact deleted from the project would
leave an id in a blob nothing checks, and the verdict is computed from those
links. `onDelete: SetNull` turns a deleted artifact back into an unproven item
rather than a dangling reference.

## 3. Lifecycle

| Status | Means | Leaves it by |
|---|---|---|
| `Draft` | Goal card being written, not paid | Payment succeeds → `Active`; author cancels → `Cancelled` |
| `Active` | The 28 days | Day 28 → `Review` |
| `Review` | Collection stopped, verdict pending | Verdict written → `Closed` |
| `Closed` | Result card stored | Terminal |
| `Cancelled` | Never started | Terminal |

One `Active` or `Review` checkpoint per project at a time. A new checkpoint may be
created once the previous one is `Closed`.

**A new checkpoint starts from the last one's result card, and everything in it
can be edited.** The inputs are copied from the previous outcomes — the proven
ones **with the artifact still attached to their line**, so the demo that closed
day 28 is what exists on day 1 without being re-uploaded or re-found. An outcome
that was missed or cut comes across too, as a line with an empty slot, because it
is exactly what the project still does not have. Nothing is locked: every line can
be reworded or deleted, its evidence swapped, and new lines added, before the
checkpoint is paid for. Copying is a starting point, not a verdict about what the
next 28 days are for.

## 4. Calendar

Day 1 is `startedAt`. Weeks are days 1–7, 8–14, 15–21, 22–28.

| Day | What happens | Stored |
|---|---|---|
| 1 | **Consultation 1.** The curator goes through the outcome list with the author and cuts it to what 28 days actually hold. The card is agreed, and only then fixed. | `goal`, `CheckpointItem` rows, `goalAgreedAt` |
| 4, 11, 18, 25 | Devlog reminder, only if that week has no devlog | — |
| 6, 13, 20, 27 | Pulse request, only to members not already confirmed that week | `CheckpointPulse` rows |
| the day after a devlog | The AI curator's feedback on it arrives, with a notification | feedback on `ProjectReport` |
| 7, 21 | A human curator answers the week's devlog on the call | comment on `ProjectReport` |
| 14 | Scope moment. See §7. | `midNote`, and `revisedAt` if the author changes the outcomes |
| 26 | Evidence reminder, naming the outcomes with an empty slot; none if every one is covered | — |
| 28 | Checkpoint moves to `Review`, report assembled | `summary` |
| 28–30 | Verdict written | `verdict`, `decidedAt`, `decidedById` |

After day 1 the author may change the outcomes only on day 14. An outcome that
comes off is `cut`, not deleted, and the reason is stored as `revisedNote` beside
the original list — never over it.

## 5. Weekly pulse

The link in the email carries a token, not a session:

```
token = base64url(checkpointId + ":" + userId + ":" + week + ":" + hmac)
hmac  = HMAC-SHA256(checkpointId|userId|week, CHECKPOINT_PULSE_SECRET)
```

`GET /api/checkpoint/pulse?t=<token>` resolves the token and renders a page with
one button. The button `POST`s to the same route and writes `confirmedAt`.

**The confirm page is deliberate.** A bare `GET` that writes would be triggered by
the link scanners that most mail providers run, and every member would look
present without opening the mail. The verdict rests on this data, so it must not
be forgeable by a scanner. From the member's side it is still one click in the
mail and one on the page.

The same action sits on the in-app notification, where the session already
identifies the user and no token is needed.

**Work already done counts as the pulse.** Anyone who authored a devlog that
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

## 6. Day 1: the goal is agreed, not accepted

**What the author buys is a draft.** Someone with no shipped project writes "a
finished game" into the outcome list, pays, and would otherwise spend 28 days
failing at something that was never 28 days of work. Consultation 1 exists to
stop that: the curator reads the list with them and says plainly what will not
fit, and the two of them cut it down to something reachable — a vertical slice
instead of a game, one level instead of five, a playable loop instead of a
release. The card is **agreed**, then fixed.

Until `goalAgreedAt` is set the outcome list is fully editable — cut, reword,
add, in the same modal day 14 uses — and both the author and the curator can
edit it. After it is set, only day 14 can change it. The first wording survives
in `originalText`, so what the author came in wanting is still readable at the
end beside what was actually agreed; a first checkpoint that started as "ship the
game" and became "a playable ten minutes" is the product working, and the record
should say so rather than hide it.

**A human curator says the cut out loud; the AI curator cannot.** It reports what
does not fit — this outcome has no input to build on, this one is four
outcomes' worth of work — and offers the author a smaller version of each to
accept or ignore. It never rewrites the list on its own, and no copy may suggest
it decided. That line is the same one it holds on day 14, and it is the honest
difference between the two kinds of curator: judgement of what a beginner can do
in a month is exactly what a person is being paid for.

The 28 days start at payment either way. Agreement does not move day 1 — a card
still unagreed on day 3 is the curator's problem, and it shows on their list.

## 7. The scope moment, day 14

The AI curator compares the outcomes against the devlogs written so far and
whatever evidence is already attached, then writes `midNote`. The note:

- lists the outcomes with an empty slot and nothing claimed against them,
- says how much of the calendar is gone,
- asks the author to decide what to change.

**It never names the cut.** That judgement belongs to a human curator, and saying
otherwise would sell the AI curator as something it is not. The author changes
the outcome list themselves, or leaves it.

### Day 14 is a scope change, not only a cut

Three things can happen to the list, all on that one day and all in one modal:

| Move | What it is for | Stored |
|---|---|---|
| **Cut** | It will not land in the days left | `cut: true` — the line stays, struck through |
| **Reword** | The shape changed: three tide states became two | `originalText` keeps what was written on day 1; `text` holds the new wording |
| **Add** | The team is ahead and takes on more | a new row with `addedAt` set |

A cut is the common move and a reworded line is the honest version of a cut that
would otherwise be a deletion — "two tide states" is a smaller promise than
"three", and recording it as a rewording says so, where deleting the line and
typing a new one would hide it. Adding is rarer and is what a team running ahead
deserves: the goal card should describe the 28 days that actually happened.

Whatever moves, `revisedAt` and `revisedNote` record the day and the reason once
for the whole change, and nothing is written over: the original text, the cut
flag and the addition date all stay on the row.

### The three questions the record answers

Everything above exists so that a closed checkpoint can answer, without anyone
reconstructing it from memory:

1. **What was planned** — the day-1 list: `originalText` where a line was
   reworded, `text` where it was not, minus the lines with `addedAt`.
2. **What changed** — the day-14 move on each line, and `revisedNote` for why.
3. **What came of it** — the artifact on each line, the author's `note` beside
   it, and, where a curator counted a line no artifact covers, `acceptedNote`.

The result card is those three columns and nothing else needs writing for it.

"Behind" is: half the calendar gone and at least one outcome with nothing claimed
against it in any devlog. A quiet week on its own is not the signal.

## 8. The AI curator

Five model calls per checkpoint, through `src/services/openai`, following the shape
of `src/services/ai-validation` (typed input, typed result, prompts in their own
folder, no free-text parsing):

| When | Input | Output |
|---|---|---|
| Day 1 | Goal card, project stage and its template requirements | Is this reachable in 28 days, and what is missing from the outcome list |
| The day after each devlog | The devlog and the goal card | Feedback: what reads as progress, which outcomes it moves, what is still untouched |
| Day 14 | The summaries so far, outcomes, artifact | `midNote` per §7 |
| Day 28 | Everything below | `summary` and `verdict` |

Seven calls per checkpoint, then — one on day 1, four pieces of feedback, the day-14
note, the day-28 report.

**Feedback arrives the day after the devlog, not the moment it is posted.** It
runs in the same daily cron as everything else, so there is no second queue path,
and the author is told: the curator has read your devlog, here is what they said.
An answer three seconds after publishing reads as a machine reflex and gets
skimmed; the next morning it reads as something that was looked at, and it brings
the author back to the checkpoint a day later, which is the point.

The fourth devlog is the exception. Its feedback would land on day 28 alongside
the report, so it is folded into the report instead — one message that day, not
two saying overlapping things.

**Feedback answers, it does not grade.** It says what reads as progress, which
outcomes the post moves, and which are still untouched — all of it checkable
against the goal card. It does not say whether the work is any good. That is the
same line as the day-14 note: the AI curator reports what it can see, a human
curator judges.

It never replaces what the author wrote. It sits under the devlog, the post stays
whole above it, and the author can ignore it.

Report input on day 28, facts only:

- goal card, and the day-14 revision if there was one,
- every outcome with the artifact attached to it, or the fact that none is,
- every devlog of the checkpoint with dates,
- pulse matrix: member by week,
- each artifact: link, screenshots, the author's description,
- the stage and what the workflow template says it requires.

The model never sees anything the platform cannot show the author.

**Guardrails.** It reads screenshots, text at a public URL, and the author's
description. It does not run builds and no copy may imply it does. It cannot
write `StageClosed` or `GoalMet` while an outcome that was not cut has no
readable artifact — that is `GoalMissed` regardless of what the model returns,
and the AI curator has no way to waive it.

## 9. Verdict and the workflow

Three values, and every one of them ends the checkpoint:

| Verdict | Means | Next |
|---|---|---|
| `StageClosed` ("Ready for the next stage") | Outcomes delivered and the stage's requirements met | Next unlocks; the author moves on when ready |
| `GoalMet` | Outcomes delivered, stage needs more | New checkpoint on the same stage |
| `GoalMissed` | Outcomes not delivered | New checkpoint, inputs recomputed from what exists |

"Delivered" is not a judgement call: every outcome that was not cut on day 14
carries a readable artifact. Missing one, the verdict is `GoalMissed`.

**A human curator may count an outcome the artifact does not cover, and has to
say why.** Playtest notes on paper, a conversation with a publisher, a fix only
visible in the running build they were shown on the call — real results that no
link proves. They tick the item and write one line into `acceptedNote`, which
stands beside that outcome in the result card for the author to read. It is a
person putting their name on a claim, which is what the author is paying them
for. The AI curator has no such tick: it can only see what it can open.

The next checkpoint's inputs are pre-filled from the outcomes that were proven,
carrying their artifacts across — the demo that proved day 28 is what exists on
day 1 of the next one, already attached.

The verdict is a green light, not a move. The curator says the stage can be
closed; the project stays on it until the author presses Next, because the team
may still want to finish something inside the stage first.

The stage is not opened by a button. A new condition source joins the eleven in
`src/schemas/workflowTaskCondition.ts`:

```ts
{ source: "checkpoint_verdict", verdict: "StageClosed" }
```

```ts
case "checkpoint_verdict": {
  const count = await prisma.projectCheckpoint.count({
    where: { stepId, verdict: "StageClosed" },
  });
  return count >= 1;
}
```

A required task carrying that condition is seeded into every stage of the
workflow template, worded like the tasks already there — imperative and plain,
"Close the stage with a checkpoint verdict". `PUT /api/project/move` already recomputes conditions and
refuses to advance while a required task is undone, so nothing in the transition
changes.

The scout project card reads `decidedById` on the checkpoint that closed the stage
and shows either the AI curator or the person's name.

## 10. Artifacts

### One artifact per item, and that is what "done" means

An artifact is evidence that one item exists, and it hangs on that item rather
than on the checkpoint as a whole. A concept is proven by the concept document; a
demo, by the video of it running. Both sides of the goal card carry the same
slot:

| Side | When it is attached | Whether it is required |
|---|---|---|
| **Inputs** — what exists today | While the goal card is written, on day 1 | No. An idea in someone's head is a real starting point and there is nothing to attach to it |
| **Outcomes** — what will exist on day 28 | Any day, usually the last week | It is the evidence the verdict reads |

**An outcome with no artifact is an outcome that did not happen.** Nothing has to
be marked undone: what was not finished has nothing attached to it, and the
result card shows exactly that. This is the whole reason the slot exists — it
replaces asking the author to grade themselves, and it is why the day-26
reminder counts empty slots rather than nagging about "the artifact".

Attaching is one press from the item: pick an artifact the project already has,
or add a new one, which lands in the Artifacts tab like any other. One artifact
may prove several items — a build video that is both "the demo runs" and "the
level is finished" is one upload, chosen twice.

An item cut on day 14 keeps its text, is struck through, and is never counted as
missing evidence.

### Kinds, and what the AI curator can do with each

Four kinds, and the platform never runs anything:

| Kind | How it arrives | What the AI reads |
|---|---|---|
| **Document** | Link to a doc, deck or PDF | The text, if the link is publicly reachable |
| **Image** | Uploaded through `SanityService.uploadImage` | The image itself, with vision |
| **Video** | Link preferred; a short file if there is no link | Frames sampled evenly, plus the speech transcript |
| **Build** | Link to a playable build — an itch page, a build on a drive, a repository release | The page text only. It is never downloaded and never run |

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

The check is repeated once when the checkpoint closes, because links rot and
permissions change mid-checkpoint.

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

Each artifact may name the checkpoint and the stage it came from. Both are nullable —
everything uploaded before checkpoints existed has neither, and stays listed.

The list groups by stage in workflow order, then by checkpoint number, then by date.
Artifacts with no stage sit in an "Unsorted" group at the end.

**Left for later, deliberately.** Which artifact supersedes which — a build from
checkpoint 3 replacing the one from checkpoint 2, a design document that is still current
two stages on — is a real question and this is not the change that answers it.
The grouping above is enough to read the history; superseding needs its own
thinking and its own issue.

## 11. Admin

**Assigning a curator.** An admin can set the curator on a checkpoint to any user,
including themselves, and can set `curatorKind` to `Human` without a payment.
That is how a checkpoint is given for free. Behind `admin.checkpoints.manage`; nothing on
the project space grants it. Every assignment writes an `AuditLog` row.

**Not breaking an active checkpoint.** Today `PUT /api/admin/project-workflow/[id]`
deletes steps through `plan.deleteIds`, and `POST .../reset` re-applies a
template. Either one, run on a project with a checkpoint in `Active` or `Review`,
would pull the stage out from under it.

Both refuse while such a checkpoint exists, and the refusal names the checkpoint and its
end date. The reset's `dryRun` plan reports the same thing instead of a plan, so
an admin sees it before confirming rather than after.

The `checkpoint_verdict` task seeded into each stage is what gates the workflow. An
admin removing it from a template silently ungates every project on that
template, so the template editor marks it and asks for a second confirmation
before it goes.

## 12. Money

`PayableType.CHECKPOINT`, `payableId` = checkpoint id, the existing Paddle flow. The
checkpoint stays `Draft` until the payment webhook lands, then becomes `Active` with
`startedAt` at that moment.

### What is bought, said before it is bought

The last step states what the money buys and what it does not, and the author
ticks a box before the pay button does anything:

- **Bought:** five consultations and a verdict written by day 31, after the
  final call on day 29.
- **Not bought:** the game. The team builds it; the curator holds the 28 days to
  the goal and cannot reach it for them.
- **Not promised:** that the goal is met. A checkpoint where the work did not
  happen ends in `GoalMissed`, and that is the product working, not failing.

This protects both sides of the same sentence. An author who paid does not get to
treat the curator as a contractor who owes them a finished demo; a curator whose
team went quiet does not carry the blame for a verdict that says so.

`POST /api/checkpoint/[id]/pay` takes the two ticks with the click — the
Checkpoint Purchase Terms and the Withdrawal Waiver — and refuses without them
(400 `legal.required`, 409 `legal.outdated`), so a client that hides a checkbox
still cannot start a checkout. Each is recorded as a `LegalAcceptance` with the
version, the text's checksum and the `checkpointId`: a dispute a year later is
about the text that was on screen that day, not today's.

**The three lines on that screen are product copy, not the agreement.** What the
checkbox has to point at is a real document — the terms of a paid checkpoint,
sitting beside [docs/legal/terms-of-use/v1.md](legal/terms-of-use/v1.md) and covering
who owes what, what a refund is, what happens when a curator disappears and who
holds the rights to what the team makes: the
[Checkpoint Purchase Terms](legal/checkpoint-purchase-terms/v1.md), with the
[Withdrawal Waiver](legal/withdrawal-waiver/v1.md) beside it. A curator takes a
checkpoint on under the [Expert Services Terms](legal/expert-services-terms/v1.md),
asked once before the first one.

The AI curator has one price in config for now. The human curator's price is
computed from their hourly rate and lands with that issue.

No refunds are automated. A checkpoint that a curator abandoned is an admin action.

## 13. Permissions

New feature on the project space:

```ts
// project space
checkpoints: ["view", "create", "manage"],
// admin space
checkpoints: ["manage"],   // assign a curator, close a stuck checkpoint
```

- `create` and `manage` — Owner and Admin.
- `view` — every member; Guests see nothing.
- The human curator gets `view` plus the right to write the result card, granted
  for the life of the checkpoint and revoked when it closes. That arrives with the
  human-curator issue.

## 14. Screens

**The rule for all of them: show what has to happen now, and put the rest in a
thread.** A checkpoint is 28 days of events, not a dashboard of panels. The first
draft of this section was a wall — header, goal card, matrix, devlogs, artifact,
note, calls, all at once — and in a wall nobody finds the one thing they are
supposed to do.

`/user/project/[slug]/checkpoints`, a new tab beside Workflow and Artifacts.

| Screen | Holds |
|---|---|
| Checkpoint list | One row per checkpoint: stage, number, dates, verdict or day counter. The running one is a card, the past ones are rows. |
| Start a checkpoint | One step per page, each with its own route: what exists now, what will exist in 28 days, who curates, pay. |
| Checkpoint page | A short header, **one action card**, then the thread. |
| Verdict | The curator's own focused screen, reached from their list. Not a section on the project's page. |
| Artifacts | The renamed Documents tab, grouped by stage and checkpoint |

### The checkpoint page

Three things, in this order:

1. **Header, one line high.** Stage, checkpoint number and the dates as one meta
   line — "Prototyping · Checkpoint 1 · 1–28 Aug 2026" — with the curator and the
   status beneath. The status slot has three faces: the day counter while the
   28 days run, "awaiting verdict" between day 28 and the decision, the verdict
   once it lands. Nothing else in the header.
2. **The action card — the next task, its deadline, and the button.** Not "what
   is owed today": a card that only appears on the day a thing is due tells the
   author nothing for the six days before it, and the whole product is a
   deadline. It always names what comes next — `Devlog for week 3`, `Due 20 Sep ·
   in 3 days` — and carries the button that does it, so anything that can be done
   early can be done early. Three faces: **due today**, **due later** (button
   live), and **not open yet** (button disabled, the date it opens on the card) —
   the day-14 scope change is the only task of the third kind.
3. **The thread — the road already travelled, collapsed.** Every event in time,
   **one line each**: the day, the date and the title, with the body behind a
   chevron. It is a record, not a working surface; the work is on the card above
   it. Devlogs open to show the post, the rest
   are usually read as a list and never opened.

**Money is shown once, before it is spent, and never again.** The price belongs
on the last step of starting a checkpoint, where the decision is made. After that the
checkpoint says nothing about what it cost: the opening entry in the thread is
"Checkpoint started" and the curator's name, not a sum. Anyone wanting the amount has
`/user/settings/payments`, where every payment already lives.

**Every action is one press, on the spot, in a modal.** Nothing is reached by
navigating somewhere else and coming back. An entry in the thread that can still
be acted on keeps its own button, so an artifact that was never attached can be
attached from the artifact entry, and a verdict from a week ago can still be
rated from the verdict entry.

| Moment | Action | Opens |
|---|---|---|
| Any week | Write the devlog | Modal |
| Weekly | I am working on this | No modal — one press |
| Day 14 | Change the scope | Modal: the outcome list — tick what comes off, reword a line, add one |
| Any day, from the outcome | Attach the evidence | Modal: pick an artifact the project has, or add one — kind, link or upload, description |
| Human curator | Join the call | Button with the link, live around the time |
| After the verdict | Rate the assessment | Modal: stars and a comment |

The curator's verdict is the same shape as everything else: a modal, opened from
their own list. It is a wide one — 820, with the body scrolling — because the
goal card and the devlogs have to stay readable while it is written, but it is
not a drawer. Every other action in the product is a modal, and one screen
reaching for a different container to say "this one is important" teaches the
reader nothing except that the rules bend.

Everything that was a panel becomes either a thread entry or a collapsed line:

- The goal card collapses to the sentence plus "3 of 5 outcomes proven", and
  opens with `DisclosureSection`.
- The pulse matrix is one compact row per member with four dots, not a table.
- Artifacts show as a count and a link; they live in their own tab.

### Starting a checkpoint

One step per page, each on its own route under `/checkpoints/new`, not a wizard
inside one screen. Every step writes to the `Draft` checkpoint as it is left, so the
back button works, a refresh loses nothing, and a half-filled checkpoint is still
there tomorrow. `CheckpointStatus.Draft` exists for exactly this; it is not a state
invented for the payment gap.

The steps: what exists now, what will exist in 28 days, who curates, then a
summary with the price and the payment. Progress across the top, back and next at
the bottom, and leaving is not losing.

**Paying ends on a screen of its own**, not by dropping the author back into a
list. It confirms the checkpoint has started and sends them to it. What it carries is
dates, not congratulation: the 28 days run to such a date, the first devlog is due
on such a date, the curator answers the day after each one.

That screen has to work **before the webhook lands**. Paddle returns the author
faster than it calls us, and the checkpoint only becomes `Active` on the webhook, so
for a few seconds there is a paid checkpoint that is still `Draft`. The screen shows
that as starting rather than as an error, and settles by itself. Never treat the
redirect as proof of payment — the webhook is the only authority, and a screen
that believes the URL is a screen that can be forged by typing it.

**Leaving is not cancelling, and cancelling asks first.** Closing the tab keeps
the draft; there is a `Cancel` on every step that throws it away, and it opens a
confirm because typed work is lost and nothing else on the page can undo it. The
confirm is the one place a filled red button is allowed.

Only a `Draft` can be cancelled. Once a checkpoint is paid for and running it goes to
a verdict — a team that stops working ends at `GoalMissed`, not at a cancelled
checkpoint. A deadline you can call off is not a deadline, which is the whole thing
being sold. An admin can still close a stuck checkpoint; an author cannot.

**The first step arrives filled in.** What the project has now is largely known
already: the stage it is on, the artifacts attached to it, the result card of the
last checkpoint. Show that as the inputs list, ready to be corrected, instead of
asking a question the platform can answer. The step people dread is the empty
one. Where a line came from an artifact — the concept document, last checkpoint's
demo video — it arrives with that artifact already attached to it.

**Each line has a slot for its evidence, on both steps.** On step one it is
optional and mostly pre-filled: pick an artifact the project already has, add a
new one, or leave a line bare because there is nothing to show yet. On step two
the slot is visibly empty and stays that way until the work exists — that is what
the author is being sold, and seeing four empty slots on day 1 is a clearer
statement of the deal than any copy about deadlines.

This is also the answer to whether the whole flow should be a modal instead of
four pages. It should not — a modal has no URL, and a draft that can be resumed
at the step it was left on needs one, as do back and refresh, and Paddle opens
its own overlay on the last step. The flow feels heavy because of how much it
asks, not because of the container it asks in. Ask less.

**The one-sentence goal is generated, not typed.** The author has already said
what exists and what will exist; asking them to summarise their own two lists is
asking the same question a third time. It is written from those lists, shown
back so it is never a surprise, and can be edited by hand before payment. Once
the checkpoint starts it is frozen with the rest of the goal card.

The same applies anywhere else a field would restate what has already been
entered: derive it, show it, let it be corrected, and do not make anyone type it.

### Where a review and a rating are written

Neither gets its own destination, because a destination is a thing people fail to
find.

- **The verdict** is written by the curator from their own list, in a wide modal
  holding the goal card, the devlogs and the three buttons. One press from the
  row, no navigation, and roomy enough to write in. That is their whole job on
  that day; it should not be a section of somebody else's page.
- **The author's rating** appears in the thread as an entry the moment the verdict
  lands: the verdict, and directly under it "was this assessment any use?" with
  the rating inline. It is answered where it is read.

  Stars and a comment, nothing else. There is no separate "do you agree" control:
  a low rating is disagreement, and the comment says what was wrong with it.

  **It is optional and most people will skip it.** Nothing waits on it: the checkpoint
  closes, the stage opens and the next checkpoint starts whether or not it was
  answered. No modal, no blocking step, no reminder. The entry simply stays
  unanswered in the thread, and a past checkpoint can still be rated later.

  Absence is a value, not a zero. Anywhere a rating is shown, the number of
  answers is shown beside it, and no average is displayed below five answers —
  two five-star ratings must not outrank forty averaging 4.6. The share of AI
  verdicts rated one or two is the number that says whether the AI curator can be
  trusted with a stage, and it is a share of the ones that were rated. Read it
  knowing the sample leans unhappy: people who disagree answer more often.

## 15. Notifications

New Novu workflows beside the existing ones:

| Key | To | When |
|---|---|---|
| `checkpoint-pulse-request` | Each member | Days 3, 10, 17, 24 |
| `checkpoint-devlog-reminder` | Author and publishers | Days 7, 14, 21, 28 — the sprint's last day, when its devlog is due — if the week has no devlog |
| `checkpoint-devlog-feedback` | Author | The day after a devlog, when the curator's answer lands |
| `checkpoint-mid-note` | Author | Day 14 |
| `checkpoint-evidence-reminder` | Author | Day 26, only if an outcome has an empty slot |
| `checkpoint-closed` | Author and members | When the verdict is written |

One cron route, `api/cron/checkpoints`, daily, behind `withAuth({ mode: "vercel_cron" })`
and wrapped in `runWithCronLog`. It walks `Active` checkpoints, computes the day
number from `startedAt`, and dispatches. Heavy work — the day-14 note and the
day-28 report — goes onto a BullMQ queue, not into the request.

## 16. Tests

Money changes hands here and a verdict moves a project forward, so this is not a
feature that ships on manual checks.

**Unit — Vitest.** What can be wrong silently:

- Day arithmetic across a timezone and across a month boundary.
- The pulse token: wrong week, wrong user, tampered payload, expired.
- The pulse matrix when a member joins or leaves mid-checkpoint.
- A devlog author is confirmed for that week without pressing anything, and is
  not sent a request.
- `checkpoint_verdict` condition: a `GoalMet` verdict must not open the stage.
- The guardrail: an outcome that was not cut and has no readable artifact cannot
  produce `StageClosed` or `GoalMet`, whatever the model returned.
- A cut outcome is not counted as missing evidence, and a `GoalMissed` checkpoint
  where every remaining outcome is proven cannot happen.
- Deleting an artifact from the Artifacts tab leaves its items unproven rather
  than pointing at a row that is gone.
- One artifact attached to two outcomes proves both, and is counted once in the
  Artifacts tab.
- A human curator's `acceptedNote` counts an outcome with no artifact; the AI
  curator has no such path.
- A reworded outcome keeps `originalText`, and rewording it twice does not
  overwrite the day-1 wording with the day-14 one.
- An outcome added on day 14 is owed evidence like any other; a cut one is not.
- The scope modal refuses on any day but 14 once `goalAgreedAt` is set, and
  refuses a second change on day 14.
- Before `goalAgreedAt`, both the author and the curator can edit the outcome
  list; after it, neither can until day 14.
- The first wording survives an edit on day 1 and a rewording on day 14 — one
  `originalText`, written once.
- Paying is refused without the Purchase Terms and the Withdrawal Waiver in
  the request, even when it comes straight to the API.
- The artifact check: a login page answering `200` is `unreachable`, not
  `readable`; a content type that contradicts the chosen kind is refused.
- The fetcher refuses loopback, link-local and private addresses, and refuses a
  redirect that lands on one.
- Only one `Active` checkpoint per project.
- A checkpoint stays `Draft` until the payment webhook lands.
- The payment webhook is idempotent: the same event twice starts one checkpoint.
- Opening the success URL by hand does not start a checkpoint.
- A checkpoint closes and the next one starts with no feedback at all.
- No average rating is shown below five answers.
- A closed checkpoint still reads correctly after its stage is deleted.
- The admin workflow edit and reset both refuse under an active checkpoint.
- Only an admin can assign a curator; a project Owner cannot.

**E2E — Playwright, `tests/e2e`, authed.** The paths where a failure costs a
customer money or a wrong stage:

1. Author creates a checkpoint, pays, the checkpoint starts and the project shows it.
2. Payment fails or is abandoned — the checkpoint stays `Draft` and nothing was
   charged.
3. A member opens the pulse link from the mail, confirms, and the matrix shows
   the week filled.
4. A checkpoint closes with `StageClosed` and the project can then move to the next
   stage; with `GoalMet` it cannot.
5. The author attaches a video to one outcome, leaves another empty, and the
   result card shows one proven and one not.
6. An admin assigns a curator without payment and the 28 days start.
7. An admin tries to reset the workflow under an active checkpoint and is refused.

The model is stubbed in tests; the AI curator's output is fed in as a fixture so
the assertions are about what the platform does with a verdict, not about what
the model wrote.
## 17. Order of work

1. Schema release in `../prisma`.
2. Checkpoint object, tab, list, goal card with the evidence slot and its day-1
   agreement, permissions.
3. Cron route, pulse tokens and page, devlog reminders, attaching evidence.
4. AI curator: the five calls, `midNote`, report, verdict.
5. `checkpoint_verdict` condition, seeded task, scout card.
6. Paddle.
7. Documents renamed to Artifacts, with the stage and checkpoint links.
8. Admin: curator assignment, and the guards on workflow edit and reset.
