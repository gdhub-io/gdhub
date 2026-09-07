# Advisor — Requests (`/advisor/requests`)

Design spec for the first page of the advisor space. Frames live in
[`docs/design/platform-design.pen`](../platform-design.pen), row **Advisor Space**.

Context: [`docs/advisor-space.md`](../../advisor-space.md) is the feature spec,
[`docs/intent/GDHUB-24-advisor-space.md`](../../intent/GDHUB-24-advisor-space.md)
is why it exists and in what order it lands. This file is only the handoff for
the built screen.

---

## 1. Frames

| Frame | Node id | What it shows |
|---|---|---|
| `Advisor — Requests (/advisor/requests)` | **DiaZB** | The loaded inbox: head, toolbar, four cards, `Load more`. |
| `Advisor — Requests · empty` | **iFs6f** | Nothing waiting, with the route out to the expert card. |
| `Modal — Advice request` | **jXYTC** | The whole question and the decision on it. |
| `Advisor — states note` | **D3AT7** | Loading and error behaviour for the list. |
| `Advisor — project popover note` | **HTIIG** | Where the project popover is meant to appear. |

## 2. Anatomy, as built

**Card** (`src/components/advisor/AdviceRequestCard`) — surface fill,
`--gd-radius-card`, 1px `--gd-color-border`, 16px padding, 12px vertical rhythm.

- **Identity.** A 48px disc tinted from the asker's craft, holding that
  direction's icon; then the status chip and relative time, the question's
  subject at 16/700, and two meta lines — *person · role* and *project · stage*.
- **Body.** One line of the question, truncated. The whole of it is in the modal.
- **Foot.** *Asked in <speciality>* on the left, actions on the right: `Decline`
  + `Show details` when new, `Mark done` + `Open chat` once accepted, and
  `Show details` alone when it is finished, declined or withdrawn.

**Toolbar.** antd `Segmented` carrying the four filters with their counts, and a
280px search box. The counts come from the whole inbox and deliberately do not
move with the search — see §4.

**Modal** (`src/components/advisor/AdviceRequestModal`) — the status dot and the
asked-at date sit in the header next to the close button, out of the person
block, because they describe the request and not the asker. Then *Asked by* with
a link to the talent card, the question in the modal's only outlined panel, the
project row plain, and the hint that accepting opens a 1-to-1 chat.

**States.** Loading swaps the list for three skeletons of a card's height, so
the page does not jump; an error replaces the list with an antd `Alert` carrying
a retry; empty is `EmptyState` pointing at `/hub/experts`.

## 3. Where the code departs from the frame

| Frame | Built | Why |
|---|---|---|
| 48px craft disc | Local element, not `IconTile` | `IconTile` is a rounded square (radius 10/12/16); this sits in the avatar position, where the frame makes it a disc. The colours still come from `getWorkDirection`. |
| *Open for requests* dot in the head | Not built | It reads the pause flag, which arrives with `/advisor/settings` in step 5. Until then the space only opens when mentorship is on, so the indicator could only ever be green — an always-true status is noise. |
| `Archive` button in the head | Not built | The `All` filter already shows declined and withdrawn questions. A second route to the same rows can wait for a reason to exist. |
| Project mention opens a popover | Plain link to `/project/<slug>`, new tab | The compact project popover has no component yet. Building one belongs with `/advisor/reviews`, where the same popover is needed on every card. |
| *Asked in <speciality>* on every card | Shown only when the advisor has opened exactly one speciality | `AdviceRequest` stores no `specialityId`; with two open specialities the value would be a guess. Adding the column is step 2. |

## 4. Decisions worth keeping

- **Filter counts ignore the search box.** The numbers say how much work is
  waiting, not how much of it matches what is being typed; a count that moved
  with every keystroke would stop being a fact about the inbox.
- **`Rejected` and `Closed` have no filter of their own.** A question declined
  and one the asker withdrew are history, not work — they appear under `All`.
  The chip still tells them apart: *Declined* and *Withdrawn*.
- **`Mark done` writes `Executed`.** The status already meant "advice given" —
  `person-card`, `skill-capital` and the admin user list all count it — but
  nothing wrote it, so an accepted request stayed in progress for ever.
- **Links inside a question open in a new tab**, and are rendered by splitting
  the text, never by building HTML from it: the text is someone else's.

## 5. Tests

`tests/advisor-space.test.ts` covers what would ship green if it were wrong: the
filter map (a declined request can never surface under *Answered*), the `where`
that scopes one advisor's inbox from every other's, paging arithmetic, the
speciality guess refusing to guess, and `Mark done` refusing a request that was
never accepted or belongs to somebody else.

`AdviceRequestCard.stories.tsx` renders the six states the frame draws or
implies, including a Telegram asker with no account, no craft and no project.
