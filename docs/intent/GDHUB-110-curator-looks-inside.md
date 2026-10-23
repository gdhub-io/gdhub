# GDHUB-110 — The AI curator looks at what the evidence shows

[Linear](https://linear.app/gdhub/issue/GDHUB-110) · intent written 2026-10-24

## Want

When the AI curator reviews a sprint or gives the verdict, it has looked at what
the team attached, not only at its name: it read the document, looked at the
image, watched sampled frames of the video — for checkpoint artifacts and for the
images and videos linked from devlogs. For each artifact on a task it says how
well it matches what the task expects (matches / partly / does not / cannot
tell) with a short note on what it saw, and the review speaks from that. For
gameplay or prototype video it says what is shown that can count as the task's
solution (the mechanic, the level, the boss on screen) and says plainly that it
did not judge how the game plays.

## Why now

Only the AI checkpoint is sold, so its reviews are the product. Since GDHUB-56 an
artifact counts when it opens; since GDHUB-111 the curator reads the whole
project. It still cannot tell a level from a menu screenshot.

## Constraints

- **Only links that open** (GDHUB-56 Ready) are analysed, through the same safe
  fetcher. Login-walled links stay "cannot tell".
- **Never run or download a build**; a build's page is read as a page.
- **Cost caps** (Dmitry, 2026-10-24): at most 12 frames per video and 10 minutes
  of video per sprint; usage logged per checkpoint (AI usage, GDHUB-74). Each
  artifact is analysed once; a new link means a new analysis.
- **The verdict rule does not change** (Dmitry, 2026-10-24): the match is written
  into the reviews and the report, but an outcome still counts when its artifact
  opens. Turning "does not match" into "not done" is a later decision, once the
  curator's judgement has been seen on real checkpoints.
- Runs off the request path (the daily checkpoints cron, before the reviews).

## Done when

- [ ] A sprint review mentions what an attached image or document actually shows
      and whether it fits its task.
- [ ] A video artifact (a direct file) is described from its frames, within the caps.
- [ ] An image or a video linked from a devlog in the sprint is looked at the same way.
- [ ] Each analysed artifact stores its match and note; it is not analysed twice.
- [ ] The final report names any outcome whose evidence does not match, without
      changing the verdict.
- [ ] Token cost per checkpoint is logged.

## Out of scope

- Changing the verdict on a mismatch (later, see Constraints).
- Running, downloading or installing builds; judging how a game feels to play.
- Private links that need a login.

## Open questions

- **Videos on YouTube, Vimeo or Drive** (decided, Dmitry 2026-10-24): only direct
  video files are sampled into frames; a provider video is read from what the
  provider publishes (title, thumbnail) and is "cannot tell" when that is not
  enough. Watching YouTube through Gemini is its own issue, later.
- **Where the match is shown:** assumed only inside the curator's reviews and the
  report, not as a badge on the Artifacts tab.
