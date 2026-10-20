# GDHUB-95 — GTM events across the checkpoint funnel

[GDHUB-95](https://linear.app/gdhub/issue/GDHUB-95) · intent written 2026-10-21

## Want

Whoever builds reports can see, in Google Analytics through Tag Manager, where people drop
off between the checkpoint landing and a paid checkpoint, and how a running checkpoint is
used: the landing CTA they pressed, sign-up with the checkpoint intent, each wizard step
reached (hub, about you, project, goal, curator, payment opened, paid, cancelled, promo code),
and, once running, a review or call opened, the plan saved, a pulse answered, the verdict
seen, the next checkpoint planned, the move to the next stage.

## Why now

Checkpoints are about to go on sale. Without milestones in the data layer nobody can tell a
landing that does not convert from a wizard step that loses people, or whether teams use the
calls, pulses and the verdict at all.

## Constraints

- Milestones only, not every click. One typed map of event names and params
  (`src/config/analytics-events.ts`), sent through the existing `gtmEventTrigger`; ids, enums,
  counts and booleans only — no names, emails, goal text or amounts tied to a person.
- Events go through the existing GTM container and the cookie consent already in place
  (`CookieConsent`); nothing is sent that consent would not allow today.
- Server-side facts are reported from the page that shows them: "paid" from the return page
  after Stripe, "verdict seen" when the results open. No server-to-GA call.
- Each event fires once per moment (not on every re-render or refetch).
- `docs/analytics/checkpoint-events.md` lists every event, when it fires and its params, and
  an importable GTM container file (`docs/analytics/gtm-checkpoint-events.json`: one GA4
  event tag + custom-event trigger per event, data-layer variables for the params) so the
  container change is a single import.

## Done when

- [ ] Walking the funnel on localhost with the GTM preview on shows each milestone once, in
      order, with its params.
- [ ] No event carries a name, email, free text or a person-linked amount.
- [ ] The events doc and the container import file exist and match the typed map.

## Out of scope

- Publishing the container in GTM (Dmitry imports and publishes it; the file is the deliverable).
- Server-side tagging, GA4 Measurement Protocol, ad-platform conversions.
- Reworking the existing non-checkpoint events (`job`, `project_create`, …).
- Dashboards in GA4.

## Open questions

- Event naming: assumed snake_case with a `checkpoint_` prefix (`checkpoint_payment_opened`),
  params snake_case; GA4 reserved names avoided.
- Amounts: the paid event carries the price tier (`ai` / `experienced` / `expert`) and whether a
  promo code was used, not the sum — assumed enough for funnel reports.
