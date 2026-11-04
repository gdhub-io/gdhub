# Checkpoints: experimental, and the AI can make mistakes (GDHUB-142)

Intent: [GDHUB-142](../../intent/GDHUB-142-checkpoints-experimental.md).

## Components

| Frame | Node | Code |
|---|---|---|
| 12.15.5 · AI note | `m3tGe` | `src/components/checkpoints/AiNote`. `compact` gives the short text for the narrow aside. |
| 12.15.6 · Experimental tag | `wCEJ7` | `src/components/checkpoints/ExperimentalTag` |

The note's link opens `/checkpoint#faq-ai-accuracy` (`AI_ACCURACY_HREF` in `src/components/checkpoints/entry/hrefs.ts`). The landing FAQ opens whichever item a `#faq-<key>` hash names and scrolls it into view.

## Where they sit

**AI note.** It appears only where the AI curator speaks, never under a human curator's words.

- **Checkpoint page.**
  - `CuratorMessage`, when there is no `curator`. Frames 12.10.3 and 12.10.4, the verdict, and 12.10.1b.
  - `ReviewBody`: the written review and the final review. It is not shown while the review is on its way.
  - `CallGoal`: under the goal advice, when there is one. Frame 12.10.1b, `WLMSk`.
- **Workflow path.**
  - `CuratorNote` (aside), compact. Frame 12.10, `ErNgO`.
  - `AfterVerdict` and `ClosedCheckpoint`: under the verdict note.
- **Human curator's call room.** `CallBrief`, at the end. Frame 12.08.10, `vTOVQ`.

**Experimental tag.** It appears whoever the curator is.

- `CuratorHeader`: the checkpoint page header for both AI and human curators. Frame 12.10.3, `buNgB`.
- `EntryShell`: beside the title on every step of the purchase path. Frame 12.12.0c, `JrtsY`.
- The landing hero: beside "Checkpoint". Frame 12.00, `oVUcN`. Here it is not the in-app grey tag but an outlined capsule in the descriptor's type (uppercase, 11, letter-spaced), `ExperimentalTag variant="outlined"`.

**FAQ.** "How accurate is the AI curator?" sits after "What can the AI curator actually see?". Frame 12.00, `Px8TS`.

## Departures from the frames

- The note's gap is `--gd-space-2` (8), not the frame's 6, which is off the spacing scale.
- In the frames, the verdict and plan-check notes sit under the buttons. In code they sit under the actions too, at the end of the message body.
- `SessionBody` (a schedule row on the path) gets no note: it states a date, not the AI's judgement.
