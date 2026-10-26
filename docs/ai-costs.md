# What the AI features cost to run

Every model call the platform makes, what it sends, and what it costs. Written so
a price change or a new feature is a line to edit rather than a spreadsheet to
rebuild.

**Input tokens are measured, not estimated.** They come from rendering each
prompt with representative data and counting with `js-tiktoken`. Output tokens
are estimates from the word limits each schema states — the model is told "under
300 words", so the ceiling is known even when the answer comes back shorter.

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

## One checkpoint

Six calls over 28 days: the day-1 goal check, an answer under each of the first
three devlogs, the day-14 scope note, and the day-28 report. The fourth devlog's
answer folds into the report, so it costs nothing extra.

Measured against a representative checkpoint: a four-outcome goal card, a
four-task stage template, devlogs of ~250 words, five members in the pulse
matrix, two artifacts attached, four of the five members having stated the hours
a week they have.

| Call | Times | Input each | Output each | Input total | Output total |
|---|---|---|---|---|---|
| Day 1 — goal check | 1 | 967 | ~300 | 967 | 300 |
| Devlog answer | 3 | 926 | ~120 | 2 778 | 360 |
| Day 14 — scope note | 1 | 895 | ~170 | 895 | 170 |
| Day 28 — report | 1 | 1 714 | ~480 | 1 714 | 480 |
| **Total** | **6** | | | **6 354** | **1 310** |

| Model | Input | Output | **Per checkpoint** |
|---|---|---|---|
| `gpt-5.6-luna` | $0.0013 | $0.0016 | **$0.0028** |
| `gpt-5.6-terra` | $0.0127 | $0.0157 | **$0.0284** |
| `gpt-5.6-sol` | $0.0318 | $0.0393 | **$0.0711** |
| **Luna, report on Terra** | | | **$0.0111** |

The goal check grew from 782 to 967 tokens when it started weighing the card
against the team's stated hours: 109 for the paragraph telling it how to use
them (including what unknown hours mean), 54 for the hours themselves, 22 for
the two schema descriptions that changed. The team block is 27 tokens where
nobody stated anything, so the case that carries no information also costs the
least.

**A third of a cent on Luna, seven cents on Sol.** Against a checkpoint priced
from a curator's hourly rate, the model is not a cost centre — it is rounding.
That is the number to hold when someone proposes economising here: the saving is
invisible and the quality is not.

**The mixed row is the recommendation.** Luna for the goal check, the devlog
answers and the scope note; Terra for the day-28 report, which is the one call
that carries a verdict, closes a stage and follows money. One cent per checkpoint
to put the better model where the decision is.

### What moves it

The report is the only call whose input scales with the team's activity: it
carries every devlog of the 28 days. Four devlogs of 250 words are ~1 600 of its
1 714 tokens — the rest is ~600 tokens of instructions and the goal card. A team
writing 1 000-word devlogs quadruples that one call to ~6 000 input tokens, which
on Terra is $0.012 instead of $0.003.

The goal check does not scale with the team: the hours reach it summed, as two
sentences, whether the team is two people or twenty.

**Prompt caching is not worth chasing.** The prefix every prompt shares is the
~250-token curator stance, and at six calls spread over 28 days there is nothing
to amortise. Cache writes cost 1.25×, so switching it on would cost more than it
saves at this volume.

### If the review becomes per item

The pending redesign — one review per sprint instead of per devlog, with a line
per outcome — adds output, not input.

| | Input | Output | Luna | Luna + Terra report |
|---|---|---|---|---|
| Now | 6 354 | 1 310 | $0.0028 | $0.0111 |
| Per-item reviews | ~7 100 | ~2 140 | **$0.0040** | **$0.0141** |

Still under two cents. The design decision is not a cost decision, and should not
be argued as one.

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
| 100 checkpoints, Luna | $0.28 |
| 100 checkpoints, Luna + Terra report | $1.11 |
| 100 checkpoints, Sol throughout | $7.11 |
| 1 000 onboarding validations | $0.23 |
| 1 000 CVs parsed | $0.94 |

A thousand checkpoints a month with the report on Terra is $11. The AI curator
does not need a budget line; it needs a quality decision.

---

## What the code still points at

Three defaults are behind, and one of them is costing five times what it needs to.

| Where | Now | Should be | Why |
|---|---|---|---|
| `checkpoint-curator` | `gpt-6-luna` | — | current (24 Oct 2026); no longer reads `OPENAI_API_MODEL` |
| curator review, evidence, call notes | `gpt-6.1-sol` | — | current (24 Oct 2026): `gpt-6-sol`'s price, a newer model |
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
