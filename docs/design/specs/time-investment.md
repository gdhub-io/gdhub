# Header — time investment (GDHUB-141)

Frame **02.25** `LzCs8`, popover `o6wGCk`. Intent: [docs/intent/GDHUB-141-time-investment-header.md](../../intent/GDHUB-141-time-investment-header.md). Logic: [docs/time-investment-flow.d2](../../time-investment-flow.d2).

## What was built

- **`TimeInvestmentButton`** (`components/TimeInvestment`) sits in `HeaderActions`, left of chat and notifications.
  - It is a text button 32 high showing "{min}–{max} h/wk", or "Set your hours" in secondary when no hours are set.
  - Its tooltip reads "Time you invest each week · Click to change it".
  - Below `xl` it shows the clock icon alone.
- **The popover**, 336 wide inside antd's padding, contains:
  - the title "Your time investment" with an ⓘ tooltip carrying the full description;
  - the subtitle "For your own and others' projects";
  - two filled number inputs (0–80) and "hours a week";
  - the switch "Open to other authors' projects" · "Authors can invite you." (`Profile.isActive`);
  - "Changed {when}", read from the latest history row, with Cancel and Save.
- **Bounds while typing.** The bounds are not reordered while someone types, only on blur and on save. Typing "25" into the upper field passes through "2", and reordering per keystroke used to push the lower bound down.
- **Data.**
  - `GET`/`PUT /api/user/availability`.
  - `saveAvailability` is the single write path for the header, profile settings and onboarding. It writes the profile and one `AvailabilityChange` row only when a value changed.
  - A changed switch is pushed to Brevo, as settings already did.

## Departures from the frame

- The frame draws a custom switch. The code uses antd's `Switch`.
