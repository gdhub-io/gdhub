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
- Runs off the request path: when an artifact is attached or relinked and when a
  devlog is posted or edited (after the response), and again before each review
  for anything missed. The 10-minute video budget is per sprint, across both.

## Links the curator can read (Dmitry, 2026-10-24)

We keep no storage of our own, so evidence arrives as links. **Any public link is
accepted**; the add-artifact form says, for the chosen kind, which ones the AI
curator can actually read — the others are kept and shown, and the curator says
it could not read them ("cannot tell").

| Kind | Read by the curator | Kept, content not read |
|---|---|---|
| Image | a direct `.png/.jpg/.webp/.gif` link · a public Google Drive file · Dropbox · Imgur | a page around the image (ArtStation, Behance): title only |
| Video | a direct `.mp4/.webm/.mov` link · a public Google Drive file · Dropbox · a GitHub release asset — up to 12 frames | YouTube, Vimeo: title and thumbnail only |
| Document | public Google Docs / Sheets / Slides (as text or PDF) · a direct PDF · a public Notion page · a GitHub file · Dropbox | Figma, Miro: title only |
| Build | its page on itch.io, Steam, GitHub Releases, Google Play, the App Store — never downloaded | — |

- Share links are turned into direct ones by us: Drive `…/file/d/ID/view` →
  direct download, Docs → text, Sheets and Slides → PDF, Dropbox `?dl=0` → `?dl=1`.
- Images uploaded into a devlog live in our Sanity and are always read; links
  inside a devlog follow the table. Artifacts have no upload of their own.
- Limits: a video up to 50 MB (Drive serves larger files only behind a page:
  cannot tell), a document up to 100 pages of text.

## Done when

- [ ] A sprint review mentions what an attached image or document actually shows
      and whether it fits its task.
- [ ] A video artifact (a direct file) is described from its frames, within the caps.
- [ ] An image or a video linked from a devlog in the sprint is looked at the same way.
- [ ] Each analysed artifact stores its match and note; it is not analysed twice.
- [ ] The final report names any outcome whose evidence does not match, without
      changing the verdict.
- [ ] Token cost per checkpoint is logged.
- [ ] Admins see a **curator journal** per AI checkpoint (frame 11.10, reached from
      the row menu in /admin/checkpoints): every link looked at — what was read,
      what was not and why, the match — every review with its input, and the
      verdict proposed vs settled (Dmitry, 2026-10-24). Text only; the author
      never sees it. Logic: [checkpoints-curator-journal-flow.d2](../checkpoints-curator-journal-flow.d2).

## Out of scope

- Changing the verdict on a mismatch (later, see Constraints).
- Running, downloading or installing builds; judging how a game feels to play.
- Private links that need a login.
- A chat-style agent thread (LangGraph) for the curator: the journal in our DB is
  the memory; reviews read its short findings (Dmitry, 2026-10-24).
- Testing the AI's judgement in e2e: the flow (attach → a journal line appears)
  goes to the GDHUB-79 list; the judgement is checked with `checkpoint:review`.

## Open questions

- **Videos on YouTube, Vimeo or Drive** (decided, Dmitry 2026-10-24): only direct
  video files are sampled into frames; a provider video is read from what the
  provider publishes (title, thumbnail) and is "cannot tell" when that is not
  enough. Watching YouTube through Gemini is not planned for now.
- **Where the match is shown:** assumed only inside the curator's reviews and the
  report, not as a badge on the Artifacts tab.
