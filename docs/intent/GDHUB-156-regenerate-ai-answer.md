# GDHUB-156 — Regenerate an AI answer or rebuild a step's input; read Notion; devlogs at the start

[Linear](https://linear.app/gdhub/issue/GDHUB-156) · intent written 2026-11-05

## Want

In the admin curator journal, every answer the AI curator wrote has a
**Regenerate** action. The admin can add a hint in a textarea ("the concept is on
this Notion page — read the whole page", "the build is in the second link") and
the AI writes that answer again as a **draft**: the admin sees the current answer
and the new one side by side and chooses **Replace** or **Keep current**. Nothing
changes for the team until Replace. A replaced answer the team has already seen (a
letter, a sprint review) shows the new text marked "updated". Each Replace is kept
in the entry's history — the old answer, the hint, the new answer — so it can
later show where the AI misses on the first try and what fixed it. This is the
admin's tool for fixing one project's answer without touching the prompts.

Each step of the current checkpoint (day one, the current sprint) also has
**Rebuild input**: the AI reads again everything that step looks at — artifacts,
links, devlogs — ignoring what it already saw, then writes that step's answers
again — also as drafts, compared and confirmed the same way. Only the current step can be rebuilt or regenerated; a step that is done
and fixed stays as it is.

Alongside, the AI stops missing what is in front of it: public Notion pages are
read for their real text, and on day one the AI also reads the project's devlogs
written before the checkpoint — all of them before the first checkpoint — in
date order, so it knows what came after what ("What the team named at the
start").

## Why now

A real checkpoint: the team's "Game Design Document" is a public Notion page with
the whole concept, and the AI wrote "The provided text shows a page titled
'Notion'. No game content…". Notion pages render with JavaScript, our reader
gets an empty shell and still counts it as read; every AI answer is written once
and never again, so a wrong one stays wrong. The artifact hint in the product
already promises the curator reads "a Notion page open to anyone".

## Constraints

- Regenerate goes through the same producers and prompts the scheduled runs use
  — no second prompt path. The admin hint is one extra input, shown in the
  journal next to the new answer.
- Admin only: `admin.checkpoints.manage`, re-checked on the server.
- Only an open step: an answer no later AI answer has built on yet, on a
  checkpoint that is not closed. A closed checkpoint — with its report and
  verdict — is read-only.
- A draft is not stored in the database: it lives in a short-lived server cache
  (about an hour) under a one-time key, and Replace sends only that key, so the
  server writes exactly what it generated. Closing it, or Keep current, forgets
  it; nothing about it is kept.
- Replace updates the journal entry in place and writes the team-facing copy
  where the scheduled run writes it, in the same shape. No new journal rows, no
  schema change; the entry's JSON gains a `revisions` history (old answer, hint,
  mode, who, when). Downstream facts that came from it (an evidence match, a
  looked-at line feeding a review) follow the new answer.
- Replace never moves the checkpoint along: statuses, "already checked" flags,
  hashes and dates stay as they are, so no scheduled job re-runs or skips.
- Notion is read through the public page data of `*.notion.site` / public
  `notion.so` pages, no login and no headless browser. A page that still yields
  no text is "unread", not "read and empty".
- Day-one devlogs: at the project's first checkpoint, every devlog before its
  start; at a later checkpoint, the devlogs since the previous one. Oldest first,
  each with its date, text plus media, the way sprint devlogs are already read.
- AI spend of every generation counts like any other call, replaced or not
  (it is metered per call, apart from the journal).

## Done when

- [ ] Every AI answer on an open step of the admin curator journal has
      Regenerate with an optional hint; the result is a draft shown next to the
      current answer, with Replace and Keep current. Replace makes it the answer
      and records the old one, the hint and the new one in the entry's history;
      Keep current leaves everything as it was and records nothing.
- [ ] Replacing a letter or a sprint review changes what the team sees, with an "updated" mark (before Replace the team sees no change); regenerating a look or evidence check
      updates the match it fed.
- [ ] Rebuild input on the current step reads its artifacts, links and devlogs
      again (a fixed Notion page now yields text) and writes that step's answers
      again; done steps offer neither action.
- [ ] A non-admin cannot call either action.
- [ ] A public Notion page artifact is read for its text; a page that cannot be
      read is marked unread instead of "read: Notion".
- [ ] The day-one goal check and first letter take the devlogs before the
      checkpoint into account in date order (all of them before the first
      checkpoint), and the journal shows them under "What the team named at the
      start".

## How to check it on the platform

1. `/dev-signin` as the super admin → Admin → Checkpoints → a checkpoint with an
   artifact that is a public Notion page → Curator's journal.
2. The "Looked at the sprint artifact" entry → Regenerate → hint "this is the
   concept document, read it all" → a draft appears next to the current answer
   and describes the concept → Replace → the draft becomes the answer and the
   entry shows its history (old answer, hint). Repeat, then Keep current →
   nothing changes and no history is added.
3. Regenerate a sprint review with a hint → as the project's author the page
   still shows the old review → Replace → it shows the new review marked
   "updated".
4. On the current step press Rebuild input → the looks are redone from the
   sources and the step's answer is written again; an earlier, finished sprint
   shows no Regenerate or Rebuild.
5. As a member (not admin) call
   `POST /api/admin/checkpoints/{id}/journal/{entryId}/regenerate` → 403.
6. Start a checkpoint for a project with recent devlogs → day one: the journal's
   start section lists those devlogs and the first letter refers to them.

## Out of scope

- Editing an answer by hand (the admin writes the text) — regenerate only.
- Changing prompts globally from the admin; the lab at `/dev/ai-curator` stays
  the place for that.
- Reading other JavaScript-rendered sites (Miro, Figma, etc.).
- Regenerating rule-based rows (pulse counts, platform messages).
- Reopening a finished step, a closed checkpoint or its verdict.
- A screen that collects all revisions across checkpoints for prompt tuning;
  the history is stored now, the analysis view comes later.

## Open questions

- Notifying the team about a replaced letter. *Assumed:* no new notification;
  the "updated" mark is enough.
- Notion pages with sub-pages. *Assumed:* the page itself and its blocks only,
  not linked sub-pages.
- A long devlog history. *Assumed:* every devlog's text goes in, oldest first;
  media is looked at for the most recent ones only, within the existing
  per-sprint look budget, so a project with years of devlogs does not explode
  the day-one cost.
