# Checkpoint Room

The page a checkpoint's calls happen on: the video call with the curator, the
checkpoint's goal and tasks beside it, what the team has done since the last
call, and the notes of every call so far.

Status: **designed, not built.** Design lives in
[platform-design.pen](design/platform-design.pen), row "Checkpoints".

Route: `/user/project/[slug]/checkpoints/[id]/room`.

## Frames

| Frame | What it shows |
|-------|---------------|
| `oeaX9` | The room during a live call — the whole page |
| `QapMH` | Note: where each part of the page gets its data |
| `yD1Pj` | Sidebar, Activity tab — scroll, sprint boundaries, loading earlier |
| `k11Hk5` | Call notes after a call, summary not ready yet |
| `bk18D` | Call notes — the structured summary (the target structure) |
| `TJ2dF` | The checkpoint card on the list, with the Call and Chat buttons |

## Entry points

The checkpoint card (`CheckpointCard`, frame `TJ2dF`) carries two buttons
beside the curator:

- **Chat** — opens the Matrix messenger (`useChat().setOpenChatModal(true)`).
  No checkpoint room yet; built.
- **Call** — will open this page. Disabled with "Coming soon" until it exists.

## Layout

Page head: `Checkpoint N · Room` (h3, 20), a `Live · mm:ss` badge while the
call runs, and `Call 3 of 5 · opens Sprint 3 · <stage> · <date, time>`.
Actions: Chat, Copy link, Leave call.

Two columns; the sidebar stretches to the height of the main column.

**Main**
1. Video stage (Daily, see below): participant tiles, speaker outlined in
   success, muted mic in red, camera-off shows the avatar. Control bar: mic,
   camera, share screen, leave; `Recording · transcript on` on the left.
2. Call notes (see *Call notes*).

**Sidebar**
1. **In the room** — curator and every team member. Chips `Curator` and
   `Founder` beside the name. Status is only `Online` or `Offline` — no
   last-seen time. Header: `5 of 6 online`.
2. **Checkpoint goal** — its own card, so it stays in view whichever tab is
   open below.
3. One card with a `Segmented` switch: **Tasks 3/6 | Activity**.
   - *Tasks* — the checkpoint's Outcome items: the
     evidence square (filled / empty / cut / reworded dot, same as the card),
     and the artifacts attached to each item as chips that open the artifact.
     Tasks belong to the checkpoint, not to a sprint; sprints have no goal of
     their own.
   - *Activity* — see below.

## Activity

A reverse-chronological feed of project events, scrolled inside the card, with
earlier events loaded as the list reaches the bottom (`Loading earlier
activity…`). No "show all" link.

Events: devlog published, artifact attached (and to which task), member
joined, member left, vacancy opened, vacancy closed, task reworded or cut on
the day-14 revision. Each: icon tile, one-line title, one-line detail, date.

**Sprint boundaries.** A divider with a flag — `Sprint 3 started · 15 Sep` —
sits under the last event of that sprint. Everything above a divider belongs
to that sprint, everything below to the earlier one. In code: antd `Divider`
with text.

## Data sources

- **Video, recording, transcript** — Daily in *call object* mode with our own
  UI (`@daily-co/daily-react`). Not Daily Prebuilt: it brings its own tiles and
  controls, which would replace this design. Recording and transcription are
  billed by Daily separately from call minutes — price them before turning
  them on for every call.
- **Presence** — the Team block: the curator and the confirmed team, each "In
  the call" or "Away", from Daily's room presence while the room is open
  (GDHUB-90).
- **Chat** — Matrix.
- **Summary** — ours, generated from the Daily transcript after the call.
- **Tasks and artifacts** — `CheckpointItem` (Outcome) and its `artifact`.
- **Activity** — project events; the feed needs a source that covers devlogs,
  artifacts, team membership and vacancies in one ordered list.

## Cost (Daily list prices, Sept 2026)

Rates: video $0.004 per participant-minute after 10,000 free a month; audio-only
recording $0.005 and post-call transcription $0.0043 per recorded minute (not
multiplied by people); real-time transcription $0.0059 per unmuted
participant-minute. Video recording ($0.0135/min + storage) is not needed — the
transcript comes from audio.

| Call | Video | + audio recording & post-call transcript | + real-time transcript instead |
|------|------:|------:|------:|
| 2 people · 45 min | $0.36 | $0.78 | $0.89 |
| 5 people · 60 min | $1.20 | $1.76 | $2.97 |
| 15 people · 90 min | $5.40 | $6.24 | $13.37 |

The real-time column is the ceiling: it assumes everyone is unmuted all call.

- A typical checkpoint (5 people, 5 calls of an hour) costs about $9 with the
  post-call transcript, about $15 with the real-time one — before the free
  10,000 minutes, which cover roughly 30 such calls a month.
- Post-call is cheaper and does not grow with the team, but it transcribes the
  mixed recording, so it likely separates voices without knowing whose they
  are. Real-time carries `participantId` — names come free with it. That is
  the trade: names on every line vs. about half the transcript cost.
- Not included: the LLM that turns the transcript into the summary.

## Call notes

A card under the video with a `Segmented` switch of the checkpoint's calls
(`Call 1 · 1 Sep`, `Call 2 · 8 Sep`, `● Call 3 · now`) and tabs **Summary |
Transcript**. Any earlier call can be opened during a live one — the point is
to pick up what was discussed last time.

### States

1. **Live** — the current call has no notes yet; the switch opens on the
   previous call.
2. **Pending** (`k11Hk5`) — the call ended; empty state "The summary is on its
   way — the transcript and summary of this call are added within 24 hours
   after it ends", plus `Recording saved · date · duration · people`.
   Transcript tab disabled.
3. **Ready** (`bk18D`) — the structured summary below.

### Summary structure

A call has two purposes: learn what the team has done (the team reports) and
get the curator's feedback (overall, or on a specific piece of work) — both in
the context of the checkpoint's goal and tasks. The summary is organised
around the tasks, not as a retelling of the conversation.

1. **Curator feedback · overall** — one or two sentences on how the checkpoint
   stands against its goal. First, because it is what the team leaves with.
2. **What was discussed** — the checkpoint goal repeated on the right of the
   heading. One block per topic; a topic that is a checkpoint task carries it
   as a grey tag, nothing more:
   - **team said** — who reported and what;
   - **curator said** — feedback on that piece of work, on an info tint;
   - every line carries a transcript timestamp (`▶ 04:12`) that opens the
     transcript at that moment.
   Tasks not discussed are listed in one line — `Not discussed: …` — so a
   skipped task is visible rather than silently missing.

   The summary is not the task list. Evidence status and artifacts live in the
   sidebar's Tasks tab and are not repeated here; the task tag only says what
   the conversation was about.
3. **Outside the plan** — work reported that belongs to no task.
4. **Agreed for next call** — action items: owner, what, the task it serves
   (or "Outside the plan"), due date.
5. **Open questions** — carried to the next call.

### Speakers

Daily's transcription messages carry a `participantId`, so each line can be
tied to a person and shown with their name. Confirm that the stored WebVTT
transcript (fetched after the call) keeps the speaker as well; if it does not,
lines fall back to their role — Team or Curator — and a line whose speaker is
unknown carries no name at all.

## Open questions

- **Who writes the summary.** If an AI drafts it from the transcript, the
  curator's feedback is a paraphrase of their words. Likely the curator
  confirms or edits the draft before the team sees it.
- **Where the summary data lives.** Calls, transcripts, summaries and their
  per-task lines need a schema in `gdhub-prisma`; none exists yet.
- **"Day 14" vs "call 3".** The revision is described as day 14 in the schema;
  if it actually happens on the third call, the labels change.
- **In call vs online.** The people list shows only Online / Offline; who is
  in the call is visible only in the video tiles. A camera icon beside
  `Online` would tell the two apart if needed.
- **States not drawn yet:** before the call (waiting, Join), and the room
  after the checkpoint is closed.
