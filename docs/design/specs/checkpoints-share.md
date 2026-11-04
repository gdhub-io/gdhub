# Share the verdict as a card (GDHUB-144)

Intent: [GDHUB-144](../../intent/GDHUB-144-share-verdict.md). Logic: [checkpoints-share-flow.d2](../../checkpoints-share-flow.d2).

## Frames

| Frame | Node | What it is |
|---|---|---|
| 12.20 | `n3Pen` | The card, 1200×630: StageClosed, character, cover |
| 12.20a | `z8U8j` | Goal met; the AI curator without a character (robot, "AI curator · GDHub") |
| 12.20b | `Q9QbZ` | Goal missed: "done", never "passed" |
| 12.20c | `X6Csvs` | The first checkpoint: "The first checkpoint passed…" |
| 12.20d | `N0cU7` | No project cover: the red glow, the line at full width |
| 12.20.1 | `Tb2oP` | The "Share the result" window |

## Code

- **Card image:** `GET /api/checkpoint/[id]/share/image` (`next/og`). The address carries `?v=`, a hash of what the card shows plus `DRAWING` in `hooks/checkpoint-share.ts`. Bump `DRAWING` whenever the card is drawn differently.
- **Card content:** `GET /api/checkpoint/[id]/share`, built by `services/checkpoints/flows/share.ts`. The first request writes `ProjectCheckpoint.shareLine` with `writeShareLine` (`ai-curator/share-line.ts`), from the settled verdict; later requests read the stored line back.
- **Window:** `components/checkpoints/ShareResultModal`, opened by "Share the result" in the AI verdict letter (`CuratorReview/Message.tsx`).
- **Words:** `lib/checkpoints/share-card.ts` holds `roadLine` and `sharePost`.
- **Lab:** the call "Share card line" in `/dev/ai-curator` runs any checkpoint of E2E Test Game's road.

## Departures from the frames

- **The window:** the link checkbox, the hint and the four network buttons were dropped after the first live look. The link sits inside the text, and Share uses the system's share sheet (image and text). Where the browser cannot share files, the Share button is absent. The frame is updated to match.
- **Avatars:** the curators' avatars are WebP, which the image renderer does not read, so the route converts them to PNG with `sharp`.
- **Dot colours** are the semantic solids (`semantic.*.solid`), not the brighter dots of the frame.
