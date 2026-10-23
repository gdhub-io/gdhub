# GDHUB-56 — Every artifact is checked before it counts

[Linear](https://linear.app/gdhub/issue/GDHUB-56) · intent written 2026-10-24

## Want

When an author attaches an artifact, GDHub opens it and says right away whether
the curator will be able to read it: **Checking**, **Ready**, or **Cannot be
opened** with the reason (needs a login, not found, timed out, a page where a
video was promised). The author sees this wherever the artifact appears — the
Artifacts tab and the goal card's items — while there is still time to fix the
link. At the verdict, an outcome counts as delivered only if its artifact could
be opened, and the result says plainly which outcomes had nothing attached and
which had something attached that could not be opened.

## Why now

Only the AI checkpoint is sold (GDHUB-106), so its verdict is the product. The
verdict counts an outcome as delivered only when its artifact is `Readable`, but
nothing ever writes `ProjectArtifact.checkStatus` — every artifact is `null`, so
every checkpoint ends `GoalMissed` whatever the team attached.

## Constraints

- **No schema change:** `checkStatus`, `checkedAt`, `checkNote` and
  `ArtifactCheckStatus` (Pending / Readable / Unreachable / Unsupported) already
  exist. `checkNote` holds the reason in the checker's words, never fetched
  content.
- **SSRF-safe fetcher**, written once and reused by GDHUB-110: http/https only,
  resolve the host and refuse loopback, link-local and private ranges, at most
  three redirects with each target re-checked, a capped body, a timeout.
- **Two questions only** (Dmitry, 2026-10-24): is the link safe to open, and
  does it open. A redirect to a login page (private Drive, Notion) does not
  count as opening. What the page contains is not judged here — a YouTube or
  Drive page is as good as a file. `Unsupported` is not used. The platform never
  runs or downloads a build in full.
- **When:** checked on add and on link edit, and again when the checkpoint
  closes (links rot, permissions change). No new queue infrastructure — the
  existing cron and request lifecycle are enough.
- The verdict guardrail in GDHUB-36 stays as it is; this only gives it real data.

## Done when

- [ ] Adding or editing an artifact sets it to Checking, then within a minute to
      Ready or Cannot be opened, with the reason shown.
- [ ] A public link (a file, a YouTube or Drive page) is Ready; a private Google
      Drive or Notion link is Cannot be opened ("needs a login"); a dead link is
      Cannot be opened.
- [ ] A link to `localhost`, a private IP or a redirect into one is refused and
      never fetched.
- [ ] The status shows on the Artifacts tab and on each goal-card item.
- [ ] When a checkpoint closes, its artifacts are checked again before the
      verdict reads them; a Ready artifact lets its outcome count as delivered.
- [ ] The result distinguishes "nothing attached" from "attached, could not be
      opened".
- [ ] Unit tests cover the fetcher's refusals and the login-page rule.

## Out of scope

- Reading what is inside an artifact and matching it to its task (GDHUB-110).
- The AI curator reading the whole project (GDHUB-111).
- Re-checking or re-running verdicts of checkpoints already closed: they stay
  as they are (Dmitry, 2026-10-24).
- Grouping artifacts by stage and checkpoint (GDHUB-39).

## Open questions

- **Uploaded images (Sanity):** assumed `Readable` on upload without a fetch.
