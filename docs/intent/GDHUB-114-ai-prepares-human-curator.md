# GDHUB-114 — The AI prepares the human curator

[Linear](https://linear.app/gdhub/issue/GDHUB-114) · intent written 2026-10-24

## Want

An industry curator runs five calls and writes the verdict, but between calls
they have to dig through devlogs, links and files to know what the team actually
did. Now the AI does that digging for them. It looks at the evidence on their
checkpoint exactly as it does on an AI one: every artifact against its task,
and every image and video in the devlogs. Before each of calls 2–5 it leaves the
curator a short brief on the call's page:
- what the sprint delivered;
- what each piece of evidence shows, and where it does not match its task;
- what to raise on the call.

When the verdict is due, the verdict window shows the AI's read beside the
curator's own fields: the verdict it would propose and why, built from the
evidence, the devlogs and every call's notes. The curator decides and writes;
the AI only informs. The author sees none of it.

## Why now

The human checkpoint is the expensive one, and the curator's time is what it
sells. GDHUB-110 taught the AI to look inside the evidence, but only for AI
checkpoints. The human curator still reads everything by hand, and nothing tells
them that an attached "core loop one-pager" is a photo of dice.

## Constraints

- **Reuse, do not fork.** The looking is GDHUB-110's (`checkAndLook`,
  `seeDevlogMedia`, the journal, the same caps and the 10-minute video budget per
  sprint). The brief is the AI sprint review's notes (in short, per task,
  questions) addressed to the curator. The verdict read is the AI final report's
  proposal, plus the rule's list of outcomes with no artifact that opens.
- **The curator chooses freely** (GDHUB-77). Their verdict fields start empty.
  No server rule ties their verdict to the AI's.
- **Curator and admins only.** The brief and the verdict read are never in an
  author's payload. Admins see them in the curator journal.
- **Timing** (Dmitry, 2026-10-24). The brief is written in the night before the
  call: the daily checkpoints run (01:00 UTC) writes one for every call 2–5
  starting within the next 24 hours, so a call on the 5th gets its brief at
  about 01:00 on the 5th, and a call before that run gets it the night before.
  It covers the sprint that just ended and the previous call's agreed focus. The verdict read is written when the checkpoint moves to Review
  (day 29). Each one is written once, and a missed run is caught by the next.
- **No new journal kinds** (Dmitry, 2026-10-24): the brief is a `Review` line
  and the AI's read a `Verdict` line whose settled verdict stays empty — the
  checkpoint's curator kind tells them apart.
- **Cost** goes on the checkpoint's AI spend, as now.
- Logic: [checkpoints-human-curator-brief-flow.d2](../checkpoints-human-curator-brief-flow.d2).

## Done when

- [ ] On a human checkpoint, attaching an artifact or posting a devlog puts the
      same journal lines as on an AI one.
- [ ] By the night before calls 2–5, the curator's view of that call's page shows
      "Before the call": what the sprint delivered, what the evidence shows, and
      what to raise. The author's view of the same page does not.
- [ ] From day 29 the verdict window shows the AI's read: the proposed verdict,
      its reasons, and the outcomes with no artifact that opens. The curator's
      verdict and note start empty.
- [ ] Both appear in the admin's curator journal.

## Out of scope

- The AI writing or sending the verdict on a human checkpoint.
- Showing the AI's read to the author.
- Changing call notes (GDHUB-72) or the verdict flow itself (GDHUB-77).
- A queue for the looks (BullMQ when volume asks for it).

## Open questions

- **A brief when the call is moved:** assumed written once, by the first run
  that finds the call within 24 hours, whichever date that is.
