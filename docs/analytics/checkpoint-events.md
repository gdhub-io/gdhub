# Checkpoint funnel events (GTM / GA4)

GDHUB-95. Every milestone between the checkpoint landing and a paid checkpoint, and how a
running checkpoint is used, pushed to the GTM data layer for GA4.

- Names and params are typed in [`src/config/analytics-events.ts`](../../src/config/analytics-events.ts)
  (`CheckpointEvents`) and sent by `trackCheckpoint` in
  [`src/helpers/gtm.ts`](../../src/helpers/gtm.ts).
- The push is **flat**: `{ event: "checkpoint_paid", checkpoint_id: "…", … }`, so GTM reads
  each param with a Data Layer Variable of the same name.
- Values are ids, enums, counts and booleans only. No name, email, goal text or amount.
- Each event fires once per moment: an in-memory guard for the page, and a `localStorage`
  key (`gd.cp.once.*`) for the ones that must survive a reload (marked *persisted*).
- GTM only loads in production, with a GTM id configured and Google consent given
  (`GoogleTagManager`, `CookieConsent`). Without it `window.dataLayer` does not exist and
  nothing is pushed.
- The container import is [`gtm-checkpoint-events.json`](gtm-checkpoint-events.json); a unit
  test (`tests/checkpoint-analytics.test.ts`) keeps this page, the import and the typed map
  in step.

## Purchase params

Carried by `checkpoint_curator_chosen`, `checkpoint_payment_opened` and `checkpoint_paid`.

| Param | Type | Values |
|---|---|---|
| `checkpoint_id` | string | the checkpoint's id |
| `project_id` | string | the project's id |
| `checkpoint_number` | number | the checkpoint's number through the project: `1` for the first. Counts the earlier checkpoints that ran (not drafts, not cancelled) |
| `curator_kind` | enum | `ai` · `human` |
| `curator_level` | enum \| null | `experienced` · `expert`; null for the AI curator |
| `previous_curator_kind` | enum \| null | the kind of the project's previous checkpoint that ran; null for the first |
| `curator_switch` | enum | `first` · `same` · `ai_to_human` · `human_to_ai` |

`previous_curator_kind` and `checkpoint_number` come from the server with the draft
(`GET /api/checkpoint`, the current row) and the checkpoint detail.

## Purchase journey

| Event | Fires when | Params |
|---|---|---|
| `checkpoint_landing_cta` | A "Plan my next Checkpoint" button on `/checkpoint` is clicked | `section`: `hero` · `pricing` · `final_cta` |
| `checkpoint_signed_up` | "About you" opens for a user who registered with `intent=checkpoint` (read from the pre-registration cookie). Once per user, *persisted* | `provider`: `email` · `google` |
| `checkpoint_signed_in` | The hub opens after a sign-in started with a `callbackUrl` under `/checkpoint/new`. The sign-in page leaves a flag (`gd.cp.signin`, valid 24 h, `localStorage` because a magic link opens a new tab); the hub consumes it | `provider`: `email` · `google` |
| `checkpoint_hub_reached` | The hub's status arrives, before a newcomer is sent on to "About you". Once per page session | `returning` (boolean: paid for a checkpoint before), `projects_count` (number) |
| `checkpoint_about_done` | "About you" is saved | `first_time` (boolean: false when it was reopened from the hub to edit) |
| `checkpoint_project_done` | The project step is saved | `project`: `new` (created in this step) · `existing`; `lines` (number of "done so far" lines); `with_evidence` (lines with an artifact); `carried_over` (lines kept from the previous checkpoint) |
| `checkpoint_goal_set` | The goal step goes on to the curator | `warned` (boolean: went on with "Continue anyway" after the curator's warning) |
| `checkpoint_curator_chosen` | The curator step is saved going forward to payment (not on Back) | purchase params |
| `checkpoint_payment_opened` | The Stripe checkout was created; the push waits for GTM (`eventCallback`, at most 1 s) before the page leaves for Stripe | purchase params, `retry` (boolean: the previous checkout failed or expired) |
| `checkpoint_payment_cancelled` | The payment step opens from Stripe's cancel link (`&cancelled=1`, removed from the address at once) | — |
| `checkpoint_paid` | The paid panel shows the AI checkpoint started, or the expert reserved. Never while the webhook is still on its way, never for a declined one. Once per checkpoint, *persisted* | purchase params, `outcome`: `ai_started` · `expert_reserved`; `promo_used` (boolean: the held price is below the list price) |

## Running and after

| Event | Fires when | Params |
|---|---|---|
| `checkpoint_review_opened` | An AI curator review page loads. Once per checkpoint and session | `session_index` (the session's number in the checkpoint), `curator_kind`: `ai` |
| `checkpoint_call_joined` | Joining a Daily call succeeded. Once per checkpoint and call | `session_index` (the session's number in the checkpoint), `role`: `team` · `curator` |
| `checkpoint_plan_saved` | "Save changes" under the plan is clicked (not typing in a task) | `session_index` |
| `checkpoint_pulse_answered` | A pulse was confirmed from its letter | `sprint` (1–4) |
| `checkpoint_verdict_seen` | The results modal opens. Once per checkpoint, *persisted* | `verdict`: `GoalMet` · `GoalMissed` · `StageClosed`; `curator_kind`: `ai` · `human`; `opened_from`: `button` (View results) · `link` (`?results=` from the notification) |
| `checkpoint_next_planned` | "Plan Checkpoint N" after a verdict, or "Plan this checkpoint" / "Plan Checkpoint N" on the workflow offer | `next_number` (number), `verdict` (the previous checkpoint's, null for a project's first), `previous_curator_kind` (`ai` · `human`, null for a first) |
| `checkpoint_stage_moved` | Moving the project to the next stage succeeded, with or without the equity confirmation | `after_verdict` (boolean: moved from the after-verdict card) |

## The two questions

GA4 only reports an event param once it is registered: **Admin → Custom definitions →
Create custom dimension**, scope *Event*, for at least `checkpoint_number`, `curator_kind`,
`curator_level`, `previous_curator_kind`, `curator_switch`, `outcome`, `promo_used` and
`project_id`. Data is reported from the day a dimension is created, not before.

### Do authors buy another checkpoint after one they paid for?

Explore → Free form. Rows: `checkpoint_number`. Values: *Event count*. Filter: *Event name*
exactly `checkpoint_paid`.

- Repeat purchases are the rows with `checkpoint_number` ≥ 2 (filter `checkpoint_number`
  matches regex `^([2-9]|[1-9][0-9]+)$`).
- Repeat rate: projects with a `checkpoint_paid` at number 2 ÷ projects with one at
  number 1 — use `project_id` as the row and count distinct, or export and divide.
- The same on `checkpoint_curator_chosen` and `checkpoint_payment_opened` shows where a
  second purchase is dropped.
- `checkpoint_next_planned` counts the intent: authors who pressed "Plan Checkpoint N"
  after a verdict, against `checkpoint_paid` with the same number.

### Do they switch between the AI curator and an expert?

Explore → Free form. Rows: `curator_switch`. Values: *Event count*. Filter: *Event name*
exactly `checkpoint_paid`, and `curator_switch` not `first`.

- `ai_to_human` and `human_to_ai` against `same` is the switch rate, either way.
- Break down by `curator_level` to see which expert tier a switch from the AI lands on.
- On `checkpoint_curator_chosen` the same breakdown shows switches that were chosen but
  not paid for.

## The GTM container

[`gtm-checkpoint-events.json`](gtm-checkpoint-events.json) holds, per event, one
*Custom Event* trigger (`CE - <event>`) and one *GA4 Event* tag (`GA4 - <event>`) sending its
params as event parameters; one *Data Layer Variable* (version 2) per param
(`dlv - <param>`); and the constant `GA4 Measurement ID`.

1. GTM → Admin → Import Container → choose the file → *Existing* workspace → **Merge**
   (rename conflicting).
2. Set the `GA4 Measurement ID` constant to the web stream's id (`G-…`).
3. Preview, walk the funnel (below), then Submit and Publish.

## Checking it

GTM is not loaded by `next dev`. Either run a production build locally
(`bun run build && bun run start` with `NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID` set and
cookies accepted) and use GTM **Preview** on `http://localhost:3000`, or, on the dev server,
run `window.dataLayer = []` in the console and read `window.dataLayer` after each step.

Walk: landing CTA → sign up or sign in → hub → About you → project → goal → curator →
payment (cancel once on Stripe, then pay with a test card) → paid panel. Each milestone
should appear once, in that order, with its params. A second checkpoint on the same
project should report `checkpoint_number: 2` and the right `curator_switch`.
