# GDHUB-144 — Share the AI curator's verdict as a card

[Linear](https://linear.app/gdhub/issue/GDHUB-144/checkpoints-share-the-ai-curators-verdict-and-letter-to-social) · intent written 2026-11-04 · design approved: Pen 12.20

## Want

When an AI checkpoint closes, its author can show the world how it went. "Share the result" opens a window with:

- **A card image (1200×630).** It reads like a chat message: the curator character's avatar and name, the curator's line about the team's work, and the date. Under them: "Checkpoint N passed on the road to the release", the verdict, the project and the GDHub logo. The project's cover sits behind it on the right; a project with no cover gets the red glow.
- **A ready post text** the author can edit, with the project's public link inside it.

"Share" hands the image and the text together to the system's share sheet, where the author picks LinkedIn, X, Telegram or any other app. Where the browser cannot share a file (Firefox on a desktop), "Download image" and "Copy text" do it by hand. A network's share link takes no picture, so there are no per-network buttons.

## Why now

A closed checkpoint is the moment an indie team has something to tell, and today it stays inside GDHub. Each card is a post about the game, its road to the release, and GDHub.

## Constraints

- **The card line is its own text**, not the verdict note. The note is written to the team: it opens with the stage's expectation and says "I accepted…", which reads badly to strangers.
  - The line is two sentences, at most 200 characters, in the character's voice. The first sentence is a playful, evaluative reaction to what the team did, with one concrete detail of the game. The second is a wish for the project's next steps.
  - It stays honest about a missed goal and avoids stage jargon, hashtags and emoji.
  - Checked by hand on E2E Test Game's road; it works.
- **Written once, on demand.** The line is written the first time the author opens the share window, from the settled verdict (after the rule), never from the model's proposal: a line praising a verdict the rule overturned would be a lie. It is then kept on the checkpoint.
- **An image, not a page.** No public verdict page, and no `/verify` link. The certificate page keeps showing only the goal and the verdict (Purchase Terms §8). The letter leaves GDHub only when the author posts it.
- **Every verdict can be shared**, a missed goal too.
- **AI checkpoints only.** A human curator's verdict is theirs to share.
- **Schema change:** one nullable field on `ProjectCheckpoint`, through the two-repo loop.

## Done when

- [ ] On a closed AI checkpoint, the verdict letter's "Share the result" opens the window: the card, the post text with the project's link, Share (where the browser shares files), Download image and Copy text.
- [ ] The card shows the character (or the robot and "AI curator"), the line, the date, "Checkpoint N passed / done on the road to the release · verdict", the project's name and the logo; the cover or, without one, the red glow.
- [ ] The first open writes the line once; later opens read it back with no model call.
- [ ] Downloading gives a 1200×630 PNG. Share opens the system's sheet with the image and the text together.
- [ ] Nobody but the project's own team can open the card or write the line.

## How to check it on the platform

1. `/dev-signin` → an author with a closed AI checkpoint. Open the checkpoint and its verdict letter, then "Share the result".
   - The card shows the verdict, the character and the line.
   - Close the window and open it again: the same line appears, with no new model call in the curator journal.
2. Download the image: it is a 1200×630 PNG. Share (Chrome or Safari) opens the system's sheet with the picture attached.
3. Sign in as a stranger and request `GET /api/checkpoint/<id>/share` → 403/404.

## Out of scope

- A public verdict page.
- Sharing a human curator's verdict.
- Posting on the author's behalf through any network's API.
- Changing the verdict note or the certificate.

## Open questions

- **Regenerating the line.** Assumed: no button for now. The author edits the post text, and the card keeps its line.
- **Fonts in the image.** Assumed: Onest, loaded into the image route the way the existing `/api/og*` routes load their fonts.
