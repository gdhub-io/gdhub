# GDHUB-117 — AI curator lab

[Linear](https://linear.app/gdhub/issue/GDHUB-117) · intent written 2026-10-25

## Want

Dmitry opens `/dev/ai-curator`, picks one of the AI curator's calls and a
prepared situation, presses Run and sees, on one screen, what the call was
given, the exact messages the model received, what it answered, and what the
platform made of the answer — for the verdict, the proposed and the settled
verdict and each task's standing (delivered, on trust, partly, not delivered).
He edits the input to try a variant, runs again, and copies the input into the
chat to say what the curator should do differently.

## Why now

Checking a prompt today means walking a checkpoint through 28 days on the e2e
stand: about ten minutes and a Paddle payment per try, for one situation. The
cautious-optimist rule (GDHUB-81) and the devlogs-in-evidence change below both
need many situations seen side by side, and nobody can tell from the run log
alone why the model answered as it did.

## Constraints

- Same code path as production: the lab calls the real services with the same
  model, prompt and schema. The message builders become separate exported
  functions that both the service and the lab use — the lab never has its own
  copy of a prompt.
- Dev only, like `/dev/ai-validation`: the page and its API answer 404 in
  production. Real model calls, real cost; nothing is written to the database
  (no `CheckpointAiUsage` row, no checkpoint), the cost is computed and shown.
- The calls covered: goal check, suggested lines, plan advice, sprint review,
  evidence check, final report with the verdict. The human curator's calls
  (call notes, call brief) are not.
- A sprint review is judged on the sprint's devlogs whole — text and media
  together. Describing a devlog's images and video is a step of that run, shown
  in its messages, not a call of its own in the list.
- The models are shown once, at the top, as `src/config/ai-models.ts` sets them.
- Evidence situations carry prepared content (what a read would return), so a
  case answers the same way next month; one reads a live link. A sprint
  review's media are public, long-lived links read live, as a devlog's are.
- Feedback is copied, never stored: a copy button on the input (Dmitry,
  2026-10-25).
- Antd and Tabler, tokens only; the page is drawn in Pen first.

Also in this issue — **devlogs in evidence judging**: the evidence check is
shown the checkpoint's devlogs next to the artifact. A devlog may help the AI
understand an artifact it can only partly read; it never closes a task on its
own (no artifact is still "missing", in code) and never turns DoesNotMatch into
a match.

## Done when

- [x] Each of the six calls has at least one situation. The evidence check
      has one per answer the model can give (matches, partly, does not match,
      cannot tell) and a live link; the report has one per standing (all
      delivered, behind a login, partly, not about the task, broken link,
      nothing attached, a cut task) — login and broken links are settled by
      the link check before any model sees them.
- [x] Run shows input, messages, raw and parsed answer, settled result, model,
      tokens, cost and time; an edited input runs as edited.
- [x] The copy button on the input puts the input JSON, as it will run, on the
      clipboard.
- [x] A sprint review situation with images in its devlogs shows the media
      descriptions in the review's messages.
- [x] The evidence check sees the checkpoint's devlogs, after the evidence and
      marked as context; a devlog saying the work is done does not turn a
      recipe into playtest notes. A login-locked board with a devlog describing
      it is taken on trust in the report, and a devlog with no artifact leaves
      the task not delivered (the rule, in code).
- [x] `/dev/ai-curator` and its API return 404 when `NODE_ENV=production`.

## Out of scope

- Storing feedback, rating answers, comparing models or prompt versions.
- Running situations in bulk or as a test suite (the e2e suite stays the
  end-to-end check).
- Changing what any call decides, other than the devlogs-in-evidence change.
- The human curator's calls (GDHUB-116).

## Open questions

- **Where situations live:** settled — `src/services/ai-curator-lab/situations/`,
  one file per call, checked against the call's own input type, so a changed
  input type breaks the build rather than the lab.
- **Who may open it:** settled — the dev space's own gate, `dev.tools.use`
  (hub admins and above), and nothing in production.
