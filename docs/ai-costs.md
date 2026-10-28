# What the AI features cost to run

Every model call the platform makes, what it sends, and what it costs. Written so
a price change or a new feature is a line to edit rather than a spreadsheet to
rebuild.

**Tokens are measured, not estimated.** The checkpoint numbers come from running
every call of the AI curator lab (`/dev/ai-curator`) on its prepared situations
on 27 October 2026 — the production prompt, the production model, the usage the
API reported. The other features' numbers are older counts with `js-tiktoken`.

Rates checked **14 September 2026** (the GPT-6 rows on 24 October 2026) against
[OpenAI's pricing page](https://developers.openai.com/api/docs/pricing). They are
the only numbers here that go stale; everything else is arithmetic on them.

| Model | Input / 1M | Cached read / 1M | Output / 1M |
|---|---|---|---|
| [`gpt-6.1-sol`](https://developers.openai.com/api/docs/models/gpt-6.1-sol) | $2.00 | $0.10 | $10.00 |
| [`gpt-6-luna`](https://developers.openai.com/api/docs/models/gpt-6-luna) | $0.10 | $0.01 | $0.50 |
| [`gpt-5.6-sol`](https://developers.openai.com/api/docs/models/gpt-5.6-sol) | $5.00 | $0.50 | $30.00 |
| [`gpt-5.6-terra`](https://developers.openai.com/api/docs/models/gpt-5.6-terra) | $2.00 | $0.20 | $12.00 |
| [`gpt-5.6-luna`](https://developers.openai.com/api/docs/models/gpt-5.6-luna) | $0.20 | $0.02 | $1.20 |
| `text-embedding-3-small` | $0.02 | — | — |
| `omni-moderation-latest` | free | — | free |

Terra and Luna dropped on 30 July 2026 (Luna by 80%); Sol carries a promotional
cut of over 20% until at least 21 November 2026, so the Sol row is a ceiling.
Cache *reads* take a 90% discount, cache *writes* cost 1.25× the uncached rate.

**Luna is the right default here** and is cheaper than the `gpt-4.1-mini` the code
still falls back to. See [What the code still points at](#what-the-code-still-points-at).

---

## One AI checkpoint

What runs over the 28 days, in order (GDHUB-117):

| Call | When | Model | Times | Input | Output | Each |
|---|---|---|---|---|---|---|
| Character — the role made the author's own | day 1, at payment | Luna | 1 | 365 | ~345 | $0.0002 |
| Goal read — word on the goal, suggested tasks | day 1, at payment | Luna | 1 | ~2 790 | ~360 | $0.0005 |
| Tasks check — the one check of the sent tasks | day 1 | Sol | 1 | ~1 950 | ~840 | $0.0123 |
| Plan letter — the plan approved, read through sprint 1 | day 1, at approval | Luna | 1 | ~2 100 | ~680 | $0.0006 |
| Sprint review | days 8, 15, 22, 29 | Sol | 4 | ~2 020 | ~710 | $0.0112 |
| Media in the sprint's devlogs, described | with each review | Sol | 0–6 a sprint | 360–610 | ~45 | $0.0014 |
| Plan advice — the last change to the tasks | day 15 | Sol | 1 | ~2 000 | ~580 | $0.0098 |
| Evidence — does the artifact show the task | once per link | Sol | ~1 per task | ~500 | ~50 | $0.0015 |
| Report and proposed verdict | day 29 | Luna | 1 | ~2 670 | ~175 | $0.0004 |

A typical run — four tasks, two images or videos in each sprint's devlogs:

| | Calls | Cost |
|---|---|---|
| Luna: character, goal read, plan letter, report | 4 | $0.0017 |
| Sol: tasks check, four reviews, plan advice | 6 | $0.0670 |
| Sol: eight media descriptions | 8 | $0.0112 |
| Sol: four evidence checks | 4 | $0.0060 |
| **One AI checkpoint** | **22** | **≈ $0.086** |

**Under nine cents, and nine tenths of it is Sol.** The three Luna calls cost a
tenth of a cent together. The letters the author reads every week — the sprint
reviews, the tasks check, the day-15 advice — are where the money is, and they
are where the quality shows, so this is the right place to spend it.

### What moves it

- **Media.** Each image or video in a sprint's devlogs is described once, up to
  six a sprint and ten minutes of video: at most about $0.035 more a checkpoint.
- **Evidence.** A link is judged again only when it changes. A page read live
  (an itch.io build page) carries its text: ~1 500 input tokens, $0.0035.
- **Devlog length.** The sprint review carries the sprint's devlogs; the measured
  ~2 000 tokens are a ~250-word devlog. A 1 000-word devlog adds ~1 000 tokens,
  $0.002 a review.
- **Not the team.** The team, its roles and hours reach every call as a few
  lines, whether it is two people or twenty.

**Prompt caching is still not worth it.** Each call runs once in a week or more;
there is nothing to keep warm.

### A pro checkpoint

A human curator runs the calls; the AI writes around them. The goal read and the
plan advice before call 1 are as above. On top of them:

| Call | When | Model | Input | Output | Each |
|---|---|---|---|---|---|
| Brief before a call | the night before calls 2–5 | Sol | ~915 | ~1 040 | $0.0122 |
| Call notes from the transcript | after each call | Sol | the transcript | ~800 | ~$0.02–0.05 |
| The AI's read of the verdict | day 29 | Luna | ~2 700 | ~180 | $0.0004 |

The brief is from the usage log, not the lab; the call notes scale with how long
the call ran and are not measured yet. Around **$0.15–0.30** a pro checkpoint —
against the curator's hours it is invisible.

---

## The other AI features

Costed on Luna, which is what they should all be moved to.

| Feature | Where | Input | Output | Per call |
|---|---|---|---|---|
| Field moderation | `ai-validation` | — | — | **free** |
| Field relevance, 7 fields | `ai-validation` | 766 | ~60 | $0.00023 |
| CV parsing | `openai.parseCV` | 1 117 + the CV | ~400 | $0.00094 |
| Specialist ↔ project match | `openai.matchingSpecAndProj` | 733 + two texts | ~150 | $0.00045 |
| Embedding | `openai.createEmbedding` | the document | — | $0.00002 / 1k |

The two `openai` service calls carry a static prompt plus user content — 1 117 and
733 tokens of instructions and JSON schema, measured from the source. A 900-word
CV adds ~1 200 tokens; the two texts a match compares add ~600.

Moderation is free and batched: one request covers every field of a form, however
many. It should never be skipped to save anything, because it saves nothing.

---

## At scale

| Volume | Cost |
|---|---|
| 100 AI checkpoints | ≈ $8.50 |
| 1 000 AI checkpoints | ≈ $85 |
| 1 000 onboarding validations | $0.23 |
| 1 000 CVs parsed | $0.94 |

A thousand AI checkpoints a month is under a hundred dollars. The AI curator
needs a quality decision, not a budget line.

---

## What the code still points at

Three defaults are behind, and one of them is costing five times what it needs to.

| Where | Now | Should be | Why |
|---|---|---|---|
| goal read, report, character | `gpt-6-luna` | — | current (27 Oct 2026) |
| tasks check, reviews, plan advice, evidence, media, call notes, briefs | `gpt-6.1-sol` | — | current (27 Oct 2026) |
| `ai-validation` relevance | `gpt-4.1-mini` | `gpt-5.6-luna` | two generations back, and dearer: $0.40/$1.60 against $0.20/$1.20 |
| `openai.parseCV`, `matchingSpecAndProj` | `gpt-4o-mini` | `gpt-5.6-luna` | three generations back |
| `openai.createEmbedding` | `text-embedding-ada-002` | `text-embedding-3-small` | **$0.10 against $0.02 — five times the price** for a worse embedding |

All four read `OPENAI_API_MODEL` first, so the three chat calls move together with
one environment variable; the embedding model is hard-coded and needs an edit.
Changing the embedding model invalidates every stored vector, so it is a
migration, not a swap — which is why it is written here rather than done.

---

## Re-measuring after a prompt change

Only the rate table at the top is external. Token counts move when a prompt
moves, and a prompt moving is a code review. To recount:

```ts
import { encodingForModel } from "js-tiktoken";
const enc = encodingForModel("gpt-4o");
const tokens = messages.reduce((n, m) => n + enc.encode(m.content).length, 0);
```

The JSON schema of the forced tool call is billed as input too, and on the
smaller calls it is a third of the prompt — worth remembering before adding a
field "just in case".
