# GDHUB-141 — Time investment in the header, kept as history

[Linear](https://linear.app/gdhub/issue/GDHUB-141/header-time-investment-set-the-hours-a-week-you-invest-from-the-header) · intent written 2026-11-04

## Want

Whenever someone is signed in, the header shows the hours a week they are ready to invest in game projects, their own or other authors', for example "10–15 h/wk". It sits left of chat and notifications. One click opens a popover where they can:

- change the range;
- turn "Open to other authors' projects" on or off.

Yesterday's 10–15 can be today's 20–25 without going to settings. Every change is kept, so the platform can see how a person's commitment moves over time.

## Why now

The hours live in profile settings, which nobody revisits, so they go stale. Checkpoints plan a team's capacity from those hours (GDHUB-133 pictures, pulse), and so do authors weighing a candidate. Stale hours mislead both. Today there is also no record of how the hours changed: the profile keeps only the last value, and the audit log does not record this field.

## Constraints

- **The current value stays where it is:** `Profile.timeForWork` holds the `[min, max]` hours and `Profile.isActive` the switch. Every existing reader keeps working unchanged: onboarding, profile settings, the Talent Pool, matching, checkpoints.
- **History is its own table, not the audit log.**
  - It is appended to on every change, whichever screen made it: the header, profile settings or onboarding.
  - It is erased with the person and included in their data export.
- **Schema change:** it goes through the two-repo loop.
- **Design:** frame 02.25 (`LzCs8`).
  - The button is text-styled and 32 high.
  - The popover holds the slider (0–60), two number inputs, the switch, Cancel and Save.
  - Wording: "Your time investment" and "Open to other authors' projects".
- **Mobile:** the button is not in the header there. It lives in the avatar menu.

## Done when

- [ ] A signed-in person sees their range in the header, or "Set your hours" if none is set. Hovering shows "Time you invest each week".
- [ ] Saving from the popover updates the header at once, and the same values appear in profile settings.
- [ ] The switch is the same flag as onboarding and settings. Turning it off takes the person out of the Talent Pool, and their hours stay shown.
- [ ] Every change from any of the three places adds one history row with the new min, max, switch and time. Saving without a change adds none.
- [ ] "Changed N days ago" in the popover reads the latest history row.
- [ ] Deleting a user's data removes their history rows, and the data export lists them.

## How to check it on the platform

1. `/dev-signin` → any member. The header shows their hours. Click it, set 20–25, save. The button reads "20–25 h/wk".
2. Open profile settings → Resources: 20–25 is there. Change it to 15–20 there; the header follows after a reload.
3. In the popover, turn "Open to other authors' projects" off and save. `/hub/members` (Talent Pool) no longer lists them.
4. Database: `AvailabilityChange` for that user has three rows in order.

## Out of scope

- Checkpoints reading the hours as of a past date. The history makes it possible, and a follow-up can switch the capacity reads.
- A chart of the dynamics. The admin or user views come later.
- Changing how matching or the Talent Pool use the flag.

## Open questions

- **The first history row.** Assumed: the migration writes one row per existing profile with its current values, dated by the profile's last update, so every person's history has a starting point.
- **A max of 60 h/wk.** Assumed: the popover's slider stops at 60, and the inputs accept up to 80 as onboarding does today.
