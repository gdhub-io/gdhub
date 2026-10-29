# Checkpoint standard

What an author and a curator do, on which day, and under which rules. A checkpoint
runs 28 days.

This is the rulebook shown to people. The engineering side is in
[docs/checkpoints.md](checkpoints.md).

## 1. What a checkpoint is

28 days of work on one project with a curator. It has a goal, agreed with the
curator on day 1, and a verdict at the end. A stage of the project takes one checkpoint or several.

The author of the project buys the checkpoint. Five calls are included. The
price comes from the curator's level, so it differs between curators; it is the
same for any team of one to ten people.

**Every checkpoint has a curator, and the curator is either a person or the AI
curator.** Both walk the same five moments. A person says them on a call. The AI
curator writes them, and where a person names what to cut it shows what is not
moving and leaves the choice to the author.

## 2. Who takes part

| Role | What they do |
|---|---|
| **Author** | Buys the checkpoint, answers for the project, brings the team to calls, publishes devlogs. |
| **Team** | Up to ten people, the author included. Does the work and writes into the devlog. The whole team may attend a call. A larger team asks for an offer by email. |
| **Curator** | Runs the checkpoint: five calls, reading devlogs, the verdict. A person has a level and an hourly rate and decides for themselves how many projects to take. Only someone who worked on a game that reached release may curate, and only at the stage they have taken a project through; the platform checks this by hand. |
| **Platform** | Issues certificates, keeps the records, replaces a curator who drops out. |

## 3. Calendar

| Day | What happens | Whose move |
|---|---|---|
| before start | The author describes the project and what already exists. The curator takes the checkpoint. | Author, curator |
| 1 | **Call 1. The goal**, opening sprint 1. The curator reads the outcome list the author bought with, says plainly what will not fit in 28 days, and the two of them cut it to something reachable. Only then is the card fixed. | Curator leads |
| 7 | Devlog for sprint 1. | Author |
| 8 | **Call 2. Risks**, opening sprint 2. The author says how it is going. Then: what is already in the way, and what to do about it. | Curator leads |
| 14 | Devlog for sprint 2. | Author |
| 15 | **Call 3. Scope**, opening sprint 3. The change, so the goal can still be reached: cut what will not land, reword what changed shape, add what the team is ahead on. The only day the outcome list may change. | Curator leads |
| 21 | Devlog for sprint 3. | Author |
| 22 | **Call 4. The run-in**, opening sprint 4. The author shows the state of the work. Then: what has to be true by day 28. | Curator leads |
| 28 | Devlog for sprint 4. | Author |
| 28 | **Call 5. The result.** The checkpoint is reached or it is not. The team shows what exists, the curator says out loud which of the two it is and why. | Curator leads |
| by 30 | **Verdict.** The curator writes the result card and the verdict on the platform. | Curator |

**A devlog closes a sprint and a call opens the next one.** Four sprints, four
calls that start them, and a fifth that decides the checkpoint — five in all.
A call runs 45 minutes and opens with the author saying how it is going, ten
minutes at most: the curator has already read the devlog, so it is a check, not
a report from scratch. The devlog is published at least 24 hours before the call.

The verdict is not announced on call 5 as a formality — it is said there, and
written afterwards so the wording is considered and stays in the record.

The written verdict is discussed on the first call of the next checkpoint, where
it becomes the starting position.

Each team member confirms once a week, in one click, that they are still working
on the project.

## 4. Duties

**Author**

- Attends all five calls and brings the team.
- Publishes four devlogs, each before its call.
- Writes in the devlog: what got done, what is next, what is in the way.
- Attaches the artefact that proves each outcome, as it lands rather than on the
  last day.
- Prepares what to show on call 5.
- May rate the assessment once the verdict is out. Optional, and nothing waits
  on it.

**Curator**

- Reads every devlog before the call and answers it in writing.
- Runs five calls of 45 minutes each: four that open a sprint and one that
  decides the checkpoint.
- Lets the author speak first, then leads.
- On day 1 cuts the goal down to what 28 days hold. A first-time author who
  writes "a finished game" is told so on the call, and leaves with a smaller
  goal they can actually reach — a slice, a loop, one level.
- On day 15 says plainly what is not going to fit, and what to cut.
- On day 28 says out loud whether the checkpoint was reached.
- Writes the result card and the verdict by day 31 (three days after day 28).
- May count an outcome no artefact covers — playtest notes, a conversation with a
  publisher, something shown live on the call — and writes one line saying why.
  It stands beside that outcome for the author to read.
- Takes only as many projects as they can run without missing a call.

One project costs a curator about 7.5 hours over the 28 days for a solo author
and about 9.5 for a team of five, so two to three hours a week.

## 5. What a checkpoint leaves behind

| Artefact | When | What is in it |
|---|---|---|
| **Goal card** | day 1 | What exists at the start, as a list, each line with the artefact that proves it where there is one. What must exist at the end, as a list, each line with an empty slot for its artefact. The goal in one sentence. What the author bought with is kept beside anything the call changed. Not edited after the call, except on day 15. |
| **Devlogs** | days 7, 14, 21, 28, the last day of each sprint | What got done, what is next, what is in the way. Seen by the team and the curator only. |
| **Scope change** | day 15, if any | What came off, what was reworded — with the day-1 wording kept beside it — what was added, and why. Written beside the original, never over it. |
| **Artefacts** | by day 26 | One per line of the outcome list: a link or an upload, screenshots and a short description. A line with nothing attached is a line that did not get done. |
| **Result card** | by day 31 | What of the list got done and what proves it, what was cut, the verdict and the reasoning. |
| **Rating** | after the verdict, if the author wants to | Stars and a comment on the assessment. Optional and internal; a checkpoint closes and the next one starts without it. |

The result card of one checkpoint is the starting card of the next. A new curator
reads it instead of asking.

**Every line of the goal card carries its own proof.** A concept is a document
you can open, a demo is a video of it running, a build is a link. On day 1 the
author attaches what already exists — an artefact the project has, or a new one —
and lines with nothing to show stay bare; an idea in someone's head is a fair
starting point. On the outcome list the slot starts empty and is filled as the
work lands. Nothing else is asked at the end: what was finished has an artefact
against it, what was not has nothing, and neither the author nor the curator has
to argue about which is which.

## 6. Verdict

| Verdict | When | What follows |
|---|---|---|
| **Goal met, stage closed** | Everything on the outcome list is done and the stage is complete. | A new checkpoint on the next stage. The curator may change if the stage asks for a different one. |
| **Goal met, stage open** | The outcome list is done, the stage needs more. | A new checkpoint on the same stage with a new goal. |
| **Goal missed** | The outcome list is not done. | A new checkpoint. Start and finish are set again from what actually exists. The author keeps the curator or takes another. |

Every verdict leads to a new checkpoint, paid separately. There is no extension
inside a checkpoint: 28 days always end in a verdict.

## 7. Rules

- **Devlog before the call.** No devlog 24 hours before a call and the call moves
  once per checkpoint. The second time it is gone and is not returned.
- **Moving a call.** Either side may move one call per checkpoint, with at least 12
  hours' notice.
- **The goal is agreed before it is binding.** What the author wrote when buying
  is a draft; call 1 turns it into the card the verdict is measured
  against. Cutting it there is the curator doing their job, not a failure.
- **After that the goal changes once.** Only on call 3. A line may come off, be
  reworded into the smaller promise it has become, or be added when the team is
  ahead — and every one of those is recorded, with the day-1 wording kept. A line
  is never quietly deleted and retyped.
- **What is not attached is not done.** An outcome with nothing against it on day
  28 counts as missed, unless the curator counts it themselves and writes why.
- **Silence is not a verdict.** No verdict by day 31 and an administrator closes
  the checkpoint; money for calls that did not happen goes back.
- **A curator who disappears.** Two missed calls in a row and the platform
  replaces them inside the checkpoint. A curator is paid only for a whole
  checkpoint — every call and the verdict — so one who disappears is paid nothing,
  the calls they held included. The replacement is paid for the calls they hold and
  the verdict. With no replacement the checkpoint closes and the author gets back the
  price less the calls already held.
- **An author who disappears.** Two missed calls in a row with no devlogs and the
  checkpoint closes as goal missed. No refund.
- **Who is on the call.** The author and up to four of the team. The rest read
  the written answer to the devlog. The call stays 45 minutes whatever the size
  of the team.
- **The team roster** may change during the checkpoint, up to ten people; the
  price does not move.

## 8. Price

One price per curator level for a team of one to ten people, the author included.
People join and leave during the 28 days, so a price that moved with the team
could not hold. A team larger than ten writes to info@gdhub.io for an offer.

| Curator level | Team of 1–10 | Over 10 |
|---|---|---|
| Experienced | 300 | On request |
| Expert | 450 | On request |

There is no regional price. The author picks the level of curator their budget
allows. The AI curator has its own, far lower, fixed price and is the way in for
a project that cannot carry a person's rate.

**In the price:** five calls, written answers to four devlogs, the result card and
verdict, and a record of the checkpoint on every participant's profile.

**Not in the price:** doing the work — code, art, text; line-by-line code review;
marketing the game; introductions to publishers; legal advice; calls
beyond the five.

Every checkpoint is private: the devlogs and the work stay inside it, and only the
certificate — the fact of the checkpoint, its goal and its verdict — is public.

## 9. What is recorded for good

**For the curator:** the projects they ran, how many checkpoints, how many closed as
goal met, the share that ended in "one more checkpoint", the share that missed the
goal, and the rating from authors with the number of people who gave one. Rating
is optional and often skipped, so the count is shown next to it and no average
appears until five people have answered.

**For a participant:** the checkpoints they were in with dates, the goal and result of
each, their role in the project, and who the curator was.
