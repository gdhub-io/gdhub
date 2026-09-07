# Sprint standard

What an author and a curator do, on which day, and under which rules. A sprint
runs 28 days.

This is the rulebook shown to people. The engineering side is in
[docs/sprints.md](sprints.md).

## 1. What a sprint is

28 days of work on one project with a curator. It has a goal, set on day 1, and a
verdict at the end. A stage of the project takes one sprint or several.

The author of the project buys the sprint. Five consultations are included. The
price comes from the curator's hourly rate and the amount of work, so it differs
between curators and grows with the size of the team.

**Every sprint has a curator, and the curator is either a person or the AI
curator.** Both walk the same five moments. A person says them on a call. The AI
curator writes them, and where a person names what to cut it shows what is not
moving and leaves the choice to the author.

## 2. Who takes part

| Role | What they do |
|---|---|
| **Author** | Buys the sprint, answers for the project, brings the team to calls, publishes devlogs. |
| **Team** | Up to eight people besides the author. Does the work and writes into the devlog. Author and up to four others attend a call. |
| **Curator** | Runs the sprint: five consultations, reading devlogs, the verdict. A person has a level and an hourly rate and decides for themselves how many projects to take. |
| **Platform** | Runs the shared gathering, issues certificates, keeps the records, replaces a curator who drops out. |

## 3. Calendar

| Day | What happens | Whose move |
|---|---|---|
| before start | The author describes the project and what already exists. The curator takes the sprint. | Author, curator |
| 1 | **Consultation 1. The goal.** What exists at the start and what must exist at the end are written down. The goal card is fixed. | Curator leads |
| 6 | Devlog for week one. | Author |
| 7 | **Consultation 2. Risks.** The author says how it is going. Then: what is already in the way, and what to do about it. | Curator leads |
| 13 | Devlog for week two. | Author |
| 14 | **Consultation 3. Scope.** The author says how it is going. Then the cut, so the sprint can still land. The only day the goal may change. | Curator leads |
| 20 | Devlog for week three. | Author |
| 21 | **Consultation 4. The run-in.** The author shows the state of the work. Then: what has to be ready for the gathering. | Curator leads |
| 27 | Devlog for week four. | Author |
| 28 | **Shared gathering. Consultation 5.** Every team of the wave says in turn what the goal was, what got done, what had to be cut, and shows whatever exists at their stage: an idea, a build, numbers. The curator answers each of their own teams out loud. | Platform runs it, curator takes part |
| by 30 | **Verdict.** The curator writes the result card and the verdict on the platform. | Curator |

Five consultations: four calls and the gathering. A call runs 45 minutes and
opens with the author saying how it is going, ten minutes at most — the curator
has already read the devlog, so it is a check, not a report from scratch. The
devlog is published at least 24 hours before the call.

The verdict is not announced at the gathering. The curator writes it separately,
so the decision is considered and stays in the record. It is discussed on the
first call of the next sprint, where it becomes the starting position.

Each team member confirms once a week, in one click, that they are still working
on the project.

## 4. Duties

**Author**

- Attends all five consultations and brings the team.
- Publishes four devlogs, each before its call.
- Writes in the devlog: what got done, what is next, what is in the way.
- Prepares what to say at the gathering.
- Rates the assessment once the verdict is out.

**Curator**

- Reads every devlog before the call and answers it in writing.
- Runs four calls of 45 minutes each.
- Lets the author speak first, then leads.
- On day 14 says plainly what is not going to fit, and what to cut.
- Comes to the gathering and answers each of their own teams.
- Writes the result card and the verdict by day 30.
- Takes only as many projects as they can run without missing a call.

One project costs a curator about 7.5 hours over the 28 days for a solo author
and about 9.5 for a team of five, so two to three hours a week.

## 5. What a sprint leaves behind

| Artefact | When | What is in it |
|---|---|---|
| **Goal card** | day 1 | What exists at the start, as a list. What must exist at the end, as a list. The goal in one sentence. Not edited afterwards. |
| **Devlogs** | days 6, 13, 20, 27 | What got done, what is next, what is in the way. Public unless the sprint is private. |
| **Scope change** | day 14, if any | What came off the outcome list and why. Written beside the original, never over it. |
| **Artefact** | by day 26 | A link, screenshots and a short description of what it is. |
| **Result card** | by day 30 | What of the list got done, what was cut, the verdict and the reasoning. |
| **Rating** | after the verdict | The author's rating of the assessment. Internal. |

The result card of one sprint is the starting card of the next. A new curator
reads it instead of asking.

## 6. Verdict

| Verdict | When | What follows |
|---|---|---|
| **Goal met, stage closed** | Everything on the outcome list is done and the stage is complete. | A new sprint on the next stage. The curator may change if the stage asks for a different one. |
| **Goal met, stage open** | The outcome list is done, the stage needs more. | A new sprint on the same stage with a new goal. |
| **Goal missed** | The outcome list is not done. | A new sprint. Start and finish are set again from what actually exists. The author keeps the curator or takes another. |

Every verdict leads to a new sprint, paid separately. There is no extension
inside a sprint: 28 days always end in a verdict.

## 7. Rules

- **Devlog before the call.** No devlog 24 hours before a call and the call moves
  once per sprint. The second time it is gone and is not returned.
- **Moving a call.** Either side may move one call per sprint, with at least 12
  hours' notice.
- **The goal changes once.** Only on consultation 3, and only as a record of the
  change.
- **Silence is not a verdict.** No verdict by day 30 and an administrator closes
  the sprint; money for consultations that did not happen goes back.
- **A curator who disappears.** Two missed calls in a row and the platform
  replaces them inside the sprint and returns the money for what did not happen.
- **An author who disappears.** Two missed calls in a row with no devlogs and the
  sprint closes as goal missed. No refund.
- **Who is on the call.** The author and up to four of the team. The rest read
  the written answer to the devlog. The call stays 45 minutes whatever the size
  of the team.
- **The team roster** changes between sprints, not inside one. Someone joining
  mid-sprint is paid for from the next one.

## 8. Price

Price = sprint hours × the curator's hourly rate + the platform's 40%.

Sprint hours: 7.5 for the author plus 0.5 for each member of the team. Those
hours cover five consultations of 45 minutes, reading and answering four devlogs,
the goal and result cards, and the gathering.

| Curator level | Rate | Author alone | Plus 2 | Plus 4 | Plus 7 |
|---|---|---|---|---|---|
| Middle | 20 | 250 | 283 | 317 | 367 |
| Experienced | 25 | 312 | 354 | 396 | 458 |
| Expert | 30 | 375 | 425 | 475 | 550 |

There is no regional price. The author picks the level of curator their budget
allows. The AI curator has its own, lower, fixed price.

**In the price:** five consultations, written answers to four devlogs, a place at
the gathering, the result card and verdict, and a record of the sprint on every
participant's profile.

**Not in the price:** doing the work — code, art, text; line-by-line code review;
marketing the game; introductions to publishers; legal advice; consultations
beyond the five; the whole team on a call when it is larger than five.

A private sprint costs more. It hides the devlogs and the showing, but the fact
of the sprint, its goal and its verdict stay visible.

## 9. What is recorded for good

**For the curator:** the projects they ran, how many sprints, how many closed as
goal met, the share that ended in "one more sprint", the share that missed the
goal, and the average rating from authors.

**For a participant:** the sprints they were in with dates, the goal and result of
each, their role in the project, and who the curator was.
