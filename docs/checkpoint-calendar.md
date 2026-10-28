# Checkpoint calendar

What happens on each day of a checkpoint, for the curator, the platform and the
team. Read from the code; where a rule lives in a constant, the constant is named
(all of them in [src/config/checkpoint.ts](../src/config/checkpoint.ts) unless
said otherwise). The engineering side is in [checkpoints.md](checkpoints.md).

## How days are counted

- **Day 1 is `startedAt`**, a UTC midnight. Days are counted midnight to midnight
  in UTC (`dayNumberOn`, [src/lib/checkpoint-days.ts](../src/lib/checkpoint-days.ts)),
  so a checkpoint bought at 23:50 is not on day 2 ten minutes later.
- **Four sprints of seven days** (`SPRINT_DAYS`): 1–7, 8–14, 15–21, 22–28. A
  sprint's last day is when its devlog, build and artifacts are due.
- **Five sessions**, on days 1, 8, 15, 22 and 29 (`sessionDay`). Session 3 is the
  day-15 change to the tasks (`SCOPE_SESSION`); session 5 is the final one.
- **The checkpoint is open as soon as it can be worked on**, before day 1 when
  there is a wait:
  - **AI curator** — at payment. `startedAt` is the payment day's midnight, so
    day 1 is the day of payment.
  - **Human curator** — once the curator accepts (`curatorAcceptedAt`). Day 1 is
    the day of call 1; the days between the yes and the call are **day 0**: the
    author sees the curator's welcome, the date of call 1 and how long until it,
    and can already write the tasks.
- **Two scheduled runs.** `/api/cron/checkpoints` daily at 01:00 UTC;
  `/api/cron/checkpoint-calls` every hour.

## AI curator

| Day | Curator (AI) | Platform | Author and team |
|---|---|---|---|
| **1** | At payment: the character it plays, then the first letter — a word on the goal and suggested tasks. When the tasks are sent: **one** check of them; a second is refused. | Letter "day 1". After the check, a letter saying when the plan approves itself. **`AI_APPROVE_HOURS` (12)** after the check, an unapproved plan approves itself (hourly run) and the author is told. | Write one to five tasks and send them for the check, then approve the plan — or let it approve itself. **No deadline for sending the tasks**: goal and tasks stay open until the plan is approved. |
| **2–4** | — | Tasks still not sent: a reminder after **24 h** and after **72 h** from payment (`AI_REMIND_HOURS`), each on the first **10:00 in the author's zone** past the mark (`AI_REMIND_LOCAL_HOUR`). | — |
| **7, 14, 21** | — | 01:00: a devlog reminder if the sprint has none; a pulse request to every confirmed member — the author included — who has no devlog or artifact in the sprint. | **Sprint deadline**: devlog, build, artifacts. Answer the pulse. |
| **8, 22** | Reviews of sprints 1 and 3. Looks at evidence it has not seen first. | 01:00: the review is written; the team is told it is ready. | Read the review. |
| **15** | Review of sprint 2 and advice on changing the tasks — the last change of the checkpoint. | The change opens at 00:00 and closes **`SCOPE_ANSWER_HOURS` (24)** after the review is written (≈ 01:00 on day 16). **`SCOPE_REMIND_BEFORE_HOURS` (4)** before it closes, a reminder (≈ 21:00). | Change the tasks and press **Confirm the tasks** (`scopeConfirmedAt`) before ≈ 01:00 on day 16. |
| **16** | — | ≈ 01:00: the change closes. | Tasks are fixed until the verdict. |
| **any day** | Reads each piece of evidence when it is attached, up to 10 minutes of video a sprint. | Evidence that does not show its task, or shows part of it: a letter to the author. | Attach evidence to the tasks. |
| **26** | — | **`EVIDENCE_REMIND_DAY`**: the author gets the tasks still without evidence. | Attach what is missing. |
| **28** | — | Devlog reminder and pulse, as on every sprint's last day. | **Sprint 4 deadline**: devlog, build, artifacts. |
| **29** | The final session: re-reads the artifacts and evidence, writes the report, the **verdict** and the last letter. | 01:00: the checkpoint moves to `Review`, the verdict is written, the checkpoint closes; the chat closes, the certificate is issued, the author is told. | Read the verdict. |
| **30** | Only if day 29 failed: the run tries again. | — | — |

## Human curator

| Day | Curator | Platform | Author and team |
|---|---|---|---|
| **before** | Accepts or declines within **`CURATOR_ANSWER_DAYS` (3)**. | No answer: the payment hold is released and the author told. | Call 1 is at least **`FIRST_CALL_MIN_DAYS` (3)** days after purchase. |
| **0** — from the yes to call 1 | — | The checkpoint is `Active`. | Sees the welcome, the date of call 1 and how long until it; writes the tasks, with the AI's advice on the draft if wanted. |
| **1** | **Call 1**: the plan is agreed on it. The room opens **`CALL_OPENS_MINUTES` (15)** before and closes **`CALL_CLOSES_MINUTES` (180)** after the start. | 1–2 h before a call, a reminder to the curator and the team. **`CALL_NOTES_DELAY_MINUTES` (30)** after a call ends, its notes are written from the transcript. | Goal and tasks stay open for **`PRO_PLAN_AFTER_CALL_HOURS` (12)** after call 1 ends — or after its room closes, if nobody ended it — then are fixed. |
| **7, 14, 21, 28** | — | Devlog reminder and pulse, as with the AI. The night before calls 2–5: the AI's brief of the sprint, for the curator alone. | **Sprint deadline**: devlog, build, artifacts. |
| **8, 22** | **Calls 2 and 4**, with notes. From day 22 (`VERDICT_DRAFT_FROM_SPRINT`) the curator can keep a verdict draft. | Brief, reminder, notes. | Be on the call. |
| **15** | **Call 3**: the last change to the tasks. | The change is open from the start of call 3 until 24 h after it ends. | Change the tasks within that window. |
| **26** | — | The tasks still without evidence, to the author. | Attach what is missing. |
| **29** | **Call 5**, the final one. The verdict can be sent from the start of the call. | 01:00: the checkpoint moves to `Review`; the curator is told the verdict is due; the AI's read of the evidence is ready for them. | Be on the call. |
| **30** | Sends the verdict. | "Due tomorrow" to the curator if not sent. | Reads the verdict: certificate, the curator's fee, the chat closes. |
| **31–32** | The verdict is due by the end of day 31 (`VERDICT_DUE_DAYS` after day 28). | Day 32, 01:00: administrators are told it is overdue; an administrator can write it and refund the calls that did not happen. | — |

A call the curator never joined shows as missed on the path, in the widget and on
its page, with the call after it. Nothing else happens yet: no letter, no flag for
an administrator.

## Money in the calendar

- Withdrawal within **`WITHDRAWAL_DAYS` (14)** of payment.
- Refunds are issued by an administrator, never on their own. A checkpoint is
  split into parts (`CHECKPOINT_PARTS`): the AI one into four — reviews 2–4 and the
  verdict; the human one into six — five calls and the verdict.

## Where the code still differs from this calendar

- **Day 0 shows the date of call 1, not a countdown** in days, hours and minutes.
- **Call days follow the curator's time zone**, seven days apart there; in UTC a
  call can fall a day off days 1, 8, 15, 22 and 29.
