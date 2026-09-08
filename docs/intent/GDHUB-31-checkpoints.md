# GDHUB-31 — Checkpoints in projects

[Linear](https://linear.app/gdhub/issue/GDHUB-31/add-sprints-to-projects) · intent written 2026-09-07

## Want

A project author can run a **checkpoint**: 28 days with a stated goal. They write
what the project has now and what it will have at the end, and for those 28 days
the platform keeps the work visible — it reminds the team to post devlogs, asks
each member once a week in one click whether they are still working on it, and
collects the evidence for each line of the goal as it lands. On day 28 the
checkpoint closes itself, a report is
assembled from what actually happened, and a verdict is given. A verdict of
*stage closed* is what opens the next workflow stage.

**Every checkpoint has a curator, and the curator is either a person or the AI
curator.** One product, one role, two kinds. Both walk the same five moments — the
goal is checked for being reachable in 28 days, each devlog gets an answer, day 14
is where scope gets cut, day 21 is the run-in, day 28 is the verdict — and they
differ in how those moments are delivered and in how far the judgement goes. A
human curator says them on a call and names what to cut. The AI curator writes
them, and where a person would name the cut it lists the outcomes nothing has
been claimed against and leaves the choice to the author: it does not know the
game well enough to choose for them.

Which kind closed a stage is recorded and shown. A scout opening the project sees
which stages the AI curator closed and which a named person did, and decides for
themselves what that is worth.

This issue delivers the checkpoint and the **AI curator**. The human curator is the
next issue: choosing them, their rate, their calls and their payout. Everything
else here is shared.

## Why now

The workflow already knows the stages a project passes, but nothing drives a
project through them. The author moves their own project forward, against tasks
they tick themselves, and nobody outside ever looks. Projects go quiet without
anyone noticing: a devlog reminder exists but fires after three months of
silence, by which time the team is gone.

Nothing on the project side earns money either. The checkpoint is the first thing
GDHub can sell to a project author, and the AI curator can be sold without
recruiting a single person — which is exactly what the human curator will depend
on.

## Constraints

- **Workflow stages and `PUT /api/project/move` stay as they are.** The verdict
  reaches the workflow as a task condition, the way `devlog_posts` and
  `estimations` already do. No second path between stages, no change to the
  gate.
- **Devlogs stay `ProjectReport`, documents stay `TeamDocument`.** A checkpoint links
  them; it does not own a copy of them. The project's **Documents** tab is renamed
  **Artifacts** and every artifact says which checkpoint and which stage it came from;
  the model keeps its name.
- **A active checkpoint must not be broken from the admin panel.** An admin can edit
  and reset a project's workflow today, and that deletes steps. While a checkpoint is
  running on a step, both are refused and say which checkpoint blocks them.
- **Reminders reuse the existing cron pattern** — a route under `api/cron/*`
  behind `withAuth({ mode: "vercel_cron" })` wrapped in `runWithCronLog`, sending
  through `NovuService`. No new scheduler and no second notification path.
- **Payments reuse Paddle and the polymorphic `Payment`** with a new
  `PayableType`. Nothing bespoke.
- **The schema is not in this repo.** `ProjectCheckpoint`, `CheckpointPulse`,
  `CheckpointFeedback`, the enums and the `checkpointId` columns on `ProjectReport` and
  `TeamDocument` land in `@gdhub-io/gdhub-prisma` and are released before any
  code here can use them.
- **No file storage is added.** Images can go through the existing
  `SanityService.uploadImage`; builds and documents are links.
- **The design system is the contract.** Tokens, not literals; the four states
  drawn before a screen is called done.

## Done when

- [ ] An author creates a checkpoint on the project's current stage with a goal,
      an input list and an outcome list, and cannot open a second one while that
      28 days are under way.
- [ ] Every team member receives one email a week with a link that records "I am
      working on this" in a single click without logging in, and the checkpoint page
      shows who confirmed which of the four weeks.
- [ ] Devlog reminders fire on the checkpoint's own weekly schedule while a checkpoint
      is running, instead of the three-month project reminder.
- [ ] Each line of the goal card carries its own evidence: the author attaches an
      artifact — a document, images, a video or a build link — to that line, or
      picks one the project already has, and it appears in the team's Artifacts
      tied to that checkpoint. An outcome with nothing attached is what "not
      done" means; nobody grades themselves.
- [ ] The outcome list the author buys with is a draft. On day 1 the curator goes
      through it with them and cuts it to what 28 days hold — a beginner who
      wrote "a finished game" leaves the call with a slice — and only then is the
      card fixed. What was bought stays readable beside what was agreed.
- [ ] Before paying, the author is told what the curator does and does not do —
      not the game itself, and no promise the goal is met — and ticks a box
      accepting it. Payment is refused without the tick, and which version of
      the standard was accepted is stored.
- [ ] An artifact is checked for being openable by the backend when it is added,
      and the author is told there and then if it cannot be read, with the reason.
- [ ] On day 14 a checkpoint whose evidence does not match its outcome list is asked
      to change the scope: the note lists the outcomes nothing has been claimed
      against, says the calendar is half gone, and stops there. It never names
      the cut itself. The author may cut a line, reword it into the smaller
      promise it has become, or add one when the team is ahead — the day-1
      wording is kept beside every change. The note is stored on the checkpoint
      and reaches the author the way the reminders do.
- [ ] On day 28 the checkpoint closes without anyone pressing anything, and a report
      is stored containing what was planned, what changed on day 14, what was
      delivered and what proves it, devlog count and per-member pulses.
- [ ] A verdict of *stage closed* satisfies a required workflow task, so the
      project can move to the next stage; any other verdict leaves it where it is.
- [ ] Every closed stage records which kind of curator closed it, and the project
      card a scout opens shows whether it was the AI curator or a named person.
- [ ] The author rates the assessment after seeing the verdict, and that rating
      is readable by admins only.
- [ ] A checkpoint cannot start until it is paid for.
- [ ] An admin can assign any curator to a checkpoint, including themselves, behind a
      permission a normal user does not hold — this is how a checkpoint is given for
      free.
- [ ] Editing or resetting a project's workflow from the admin panel is refused
      while that project has an active checkpoint, and the refusal names it.
- [ ] The project's artifacts are listed under the stage and checkpoint they belong
      to, and an artifact from before checkpoints exist still shows.

## Out of scope

- **The legal terms of a paid checkpoint.** The pay step states what the curator
  does and does not do and takes a tick, and that tick is stored with the version
  accepted — but the binding document behind it (refunds, a curator who
  disappears, rights to what the team makes) is written separately, beside
  `docs/legal/terms-of-use.md`. Until it exists the tick points at the checkpoint
  standard.
- **The human curator** — choosing one, their rate, their calls, their payout,
  and the author's rating of them. Separate issue; this one ships the
  `curatorKind` field and a nullable curator on the model, so the second kind
  fits without a migration.
- **The shared season gathering** and certificates. Separate issue, built on the
  existing `Event`.
- **File uploads** beyond images.
- **The workflow template editor.** The checkpoint reads stages; it does not change
  how they are authored. It only gains a guard against editing under a running
  checkpoint.
- **The checkpoint history in the scout space** — goals, verdicts and result cards on
  the project card and in the scout's modal. GDHUB-44. This issue ships only the
  provenance line: which kind of curator closed each stage.
- **Ordering artifacts across the whole project.** Grouping by stage and checkpoint
  is in; a considered order of what supersedes what is a later question and is
  written down in the spec, not solved here.
- **Rewriting `/user/project/[slug]/workflow`.** The checkpoint gets its own tab and
  links to the stage; the workflow page keeps working as it does.

## Open questions

- **What can the AI curator actually read of an artifact?** Answered: documents
  as text, images with vision, and **video as sampled frames plus the speech
  transcript**. Video is how the game gets looked at without being run — no
  runtime, no operating systems to match, no antivirus. It never downloads or
  runs a build. Frames show that a thing exists; they do not show how it feels to
  play, and that limit is what the human curator is for.
- **What does the AI curator cost?** Assumed: one fixed price in config for now.
  Rate-based pricing arrives with the human curator.
- **How is "behind" judged on day 14?** Assumed: the outcome list against the
  devlogs written so far and the artifact if it exists, with the author's own
  words weighed above counts. Half the calendar gone with nothing claimed against
  an outcome is the signal; a quiet week on its own is not.
- **Does a checkpoint with no devlogs and no pulses still get a verdict?**
  Assumed: yes. Silence is a finding and belongs in the report, not an error
  state that hides it.
- **Who may create a checkpoint?** Assumed: a new `project.checkpoints` feature on the
  project space, granted to Owner and Admin, so a co-owner is not blocked.
- **What happens to an active checkpoint if the project changes stage by other
  means?** Assumed: nothing automatic; the checkpoint keeps its own stage reference
  and the report says the project moved.
- **Is `TeamDocument` renamed too?** Assumed: no. The tab, the route and the copy
  become Artifacts; the model keeps its name so the rename costs one release
  instead of touching every usage. Renaming it is a later, separate change.
