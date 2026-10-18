# Head for a checkpoint · from the landing to a purchase (GDHUB-88, incl. GDHUB-78)

## 1. Problem & user

An indie author lands on the checkpoint landing page, presses the CTA and should
reach a paid checkpoint run with as little in between as possible — and must
always see what they are buying and at what price. Today registration (onboarding)
and the purchase wizard look like two products, the wizard assumes one existing
project, and the paid screen scatters its pieces.

The path is a **checklist hub** in the light registration look: three items, done
**strictly in order** — tell us about yourself, tell us about your project, your
checkpoint. The first two are short pages that return to the hub; the third opens
the purchase wizard for the chosen project (Goal → Curator → Payment → Paid).

**Wording rule:** a checkpoint is a point the author heads for, reaches, gets to —
never "start a checkpoint". Titles say "Head for your first checkpoint" / "Head for
your next checkpoint"; the paid screen says "You're on your way".

**What's done so far** (GDHUB-78) lives on the Your project page: up to five things
that exist today, each with evidence where possible. The curator measures the 28
days from here, and the next checkpoint begins from what the previous one
delivered.

Flow:

- The landing CTA goes to **`/checkpoint/new`** (the hub).
- Signed out: register or sign in (unchanged pages), `callbackUrl` back to the hub.
- **Hub** — 12.0a new user (nothing done) · 12.0b about you done · 12.0c both done.
  An item is **locked until the one above it is done**. A signed-in user with a
  filled profile lands on 12.0b or 12.0c directly; 12.0c when they have a project
  with at least one "done so far" row (the most recent project is preselected). A
  user who already had a checkpoint sees "Head for your next checkpoint".
- **Item 1 → About you** (12.1): name, avatar, speciality via the existing profile
  and speciality APIs; "Save and go back". Sets Interest = author silently;
  onboarding counts as completed (Resources skipped).
- **Item 2 → Your project** (12.2): rich project Select + "New project" (opens the
  modal 12.2d, the **only** place a stage is chosen); then **What's done so far**
  (1–5 rows). "Save and go back" is disabled until at least one row has text. For a
  project with a previous checkpoint the rows are prefilled (12.2b). No projects →
  12.2c (after "New project" the page becomes 12.2 with one empty row). "Edit" later
  may switch the project; a draft on the previous project stays a draft.
- **Introduction**: a checkpoint is never bought on Introduction. An existing
  project still on Introduction is **moved to Ideation automatically at purchase**
  (earlier stages marked done) — no field for it. New projects choose their stage in
  the modal (Ideation … Preparing a release version).
- **Item 3 → Your checkpoint**: "Set the goal →" opens the wizard at
  `/user/project/[slug]/workflow/cp/new`. A project **with a running checkpoint**:
  the button reads "Go to your checkpoint" and goes to its workflow page.
- **Wizard**: 1 Goal → 2 Curator → 3 Payment → Paid.
- Default stages: Introduction, Ideation, Concepting, Prototyping, Preparing a demo
  version, Taking and analyzing metrics, Preparing a release version, Support,
  Project Completion.

## 2. Frames

`docs/design/platform-design.pen`, **one row**, left to right in the order the user
goes, equal 120 gaps, starting at x −420, y 84780 (under the `11.x · Admin ·
Checkpoints` row). Row note `oGEsy` above the start. Every frame carries the same
**facts row** under the title.

| Frame | Node id | What it shows |
|---|---|---|
| 12.0a · Hub — new user | `Eqem3` | Title, facts row; checklist: 1 active ("Fill in"); 2 and 3 locked. Log out bar. |
| 12.0b · Hub — about you done | `fM7Z9` | 1 done ("Anna Petrova · Game designer", "Edit"); 2 active; 3 locked. |
| 12.0c · Hub — ready | `AfQSr` | 1 and 2 done (2: cover · "Lantern Keeper · Ideation stage · 3 things done so far"); 3 "Your checkpoint" active: primary "Set the goal →". |
| 12.1 · About you | `TV9y5` | "Tell us about yourself": avatar + first/last name; country + work direction; speciality + skill level. Foot: Cancel · "Save and go back". |
| 12.2 · Your project | `u7wrRw` | "Tell us about your project": rich Select (cover · name · stage) + "New project"; **What's done so far** (`FZPa3`): help line, three rows (two with evidence, one "Attach evidence"), "Add item". Foot: Cancel · "Save and go back". |
| 12.2a · project Select open | `w3daF` | Fragment: options with cover / placeholder, name, stage; current ticked. |
| 12.2b · done so far carried over | `zxs1L` | Title "Head for your next checkpoint"; the list (`ZG26o`) prefilled with 5 rows under the caption "Carried over from Checkpoint 2 — remove what no longer applies."; "Add item" hidden at 5. |
| 12.2c · no project yet | `K0fIiv` | Outlined row "You have no project yet" / "A checkpoint is reached with a project — create one to head for it." + primary "New project"; "Save and go back" disabled with a lock (tooltip "Create a project first"). |
| 12.2d · Modal — New project | `d1mY0Z` | Project name; What's the game about (→ `Project.description`); Genre + Where is the project now? (default Ideation, help); the two agreement checkboxes of `CreateProjectModal`; Cancel / Create project. |
| 12.3 · Wizard 1 Goal | `mfAfN` | Stepper Goal · Curator · Payment (Goal current); "Your goal"; Work resource; "What do you want to have in 28 days?"; "Next — curator". |
| 12.4 · Wizard 2 Curator | `BhCEd` | Content of `04 · Curator` (`Ha8mK`). |
| 12.5 · Wizard 3 Payment | `msGNN` | Content of `05 · Payment` (`ffbRA`); facts price "$475"; button **"Pay $475"**. |
| 12.6 · Paid — AI curator | `hl76Z` | Stepper all done, facts price "$19 paid". "You're on your way", "Day 1 of 28 · Checkpoint 1 · AI curator", money line + Receipt, "Go to the workflow". |
| 12.7 · Paid — human curator | `YgVnb` | Stepper all done, facts price "$475 reserved". "Payment reserved" / "Charged when the curator accepts.", email promise, curator, money line + Receipt, "Go to the workflow" + "Fill in your project", quiet "Replace the curator" / "Cancel and refund". |

Not drawn: the Save-disabled state of 12.2 with an empty list (one empty row,
"Save and go back" disabled with a lock, tooltip "Add at least one thing that's
done").

## 3. Layout

**Shell (every page, paid included):** page `--gd-color-surface` (the registration
look), column 800 centred, page padding 48/80/64. Header: logo; title 32/700; the
**facts row** — `IconCalendar` 16 + "28 days" · `IconTarget` + "One goal" ·
`IconUser` + "Expert or AI curator" · price 14/600, gap 12, `·` separators. Price
reads "from $19" until a curator is chosen, then the amount; on the paid screens
"$X paid" / "$X reserved". The project is not in the facts row.

- **Hub** checklist: one outlined panel (hairline, radius panel), rows separated by
  a top hairline; row padding 16/24, gap 16, same height in every state:
  - **active**: status circle 24, 1px `--gd-color-text` outline + number 13/600;
    title 14/600; line 14 secondary; default "Fill in" (item 3: primary "Set the
    goal" with `IconArrowRight`);
  - **done**: circle filled `--gd-success-tint`, check 14 `--gd-success-on-tint`;
    the summary as the line (project row with a 20 cover); default "Edit";
  - **locked** (items 2 and 3 alike): `--gd-color-border-strong` outline +
    tertiary number; title secondary; line tertiary; `IconLock` 16 tertiary in
    place of the button; no tooltip.
- **Sub-pages (12.1, 12.2*)**: heading 24/700 + subtitle, body (gap 32), foot with
  a top hairline: Cancel · "Save and go back", right-aligned.
- **Your project body**: project row = Select 56 (cover 40 at radius 8, name 14/500
  over stage 13 secondary) + "New project" 40, gap 12; then **What's done so far**:
  label 14 + help 14 secondary (gap 4); optional caption (history 14 + 13
  secondary); rows gap 8, each 40: input (fills) · evidence slot 240×32 · remove 32;
  "Add item" text button (hidden at 5). No box around the list, no row hairlines.
- **Wizard (12.3–12.7)**: facts row, stepper (Goal · Curator · Payment; onboarding
  look: dot 8 + label 13, brand for done/current; all done on the paid screens),
  heading, body, foot (Back · primary · "Saved as a draft"). Paid screens: no foot;
  one centred column 480, gap 24.
- Inputs on white use the `DS · 10` fill. Below 600 px: checklist actions drop under
  the text; the facts row wraps; a done-so-far row wraps its evidence slot under the
  input; the stepper collapses to "Step N of 3 · <name>".

## 4. Components

| Block | Source |
|---|---|
| Light shell | New `src/components/checkpoints/entry/EntryShell.tsx` (logo, title, facts row, optional stepper, body, foot), styled after the onboarding layout. Replaces `StartLayout` on this path, paid screens included. |
| Facts row | New `EntryFacts.tsx` (same folder), `price` prop: from / chosen / paid / reserved. |
| Hub page | New `EntryHub.tsx` for `/checkpoint/new`. antd `List` (`actions` = button or lock) or `Flex` rows; new `ChecklistStatus` (`active` / `done` / `locked`) — not `StatusDot`. A locked row has no link and no hover. |
| About you | The existing profile and speciality form parts and APIs (antd `Form`, `Input`, `Select`, `Upload` for the avatar). |
| Project Select | antd `Select` with a shared `ProjectOption` (`AppImage` cover 40 or `IconTile md` + `IconDeviceGamepad2`, name, stage) for `optionRender` and `labelRender`. Proposed `ProjectPicker.tsx`. |
| What's done so far | New `DoneSoFar.tsx` (same folder): antd `Form.List` (max 5, min 1), `Input` + `EvidenceSlot` (`src/components/checkpoints/EvidenceSlot`, `vFBkk`) + `Button type="text"` `IconTrash`; "Add item" `Button type="text"` `IconPlus`, not rendered at 5; new file/link via `AttachEvidenceModal` (`IRJ2D`). |
| New project modal | Extend `src/components/modals/CreateProjectModal`: relabel `description` as "What's the game about", add `genre` and `stage`; `variant="checkpoint"`; `onCreated(project)` instead of `router.push`. |
| Wizard stepper | antd `Steps` (`size="small"`, `progressDot`) restyled, or the onboarding stepper made data-driven. `PrepareNav.tsx` gets Goal · Curator · Payment. |
| Goal / Curator / Payment | Existing `NowStep.tsx` (without the project block), `CuratorStep.tsx`, `PaymentStep.tsx` (button "Pay {amount}"). |
| Disabled actions | Outside the hub: antd `Button` disabled + `IconLock` + `Tooltip` with the reason. |
| Paid | `PaidPanel` as a centred column inside `EntryShell`; `MoneyNotice` centred inline with "Receipt"; `IconTile` tint/ink; `CuratorBadge`. |

Icons (Tabler): `IconCalendar`, `IconTarget`, `IconUser`, `IconCheck`, `IconLock`,
`IconArrowRight`, `IconCamera`, `IconDeviceGamepad2`, `IconPlus`, `IconTrash`,
`IconHistory`, `IconPaperclip` (+ artifact types), `IconChevronDown`, `IconReceipt`,
`IconPencil`, `IconMail`, `IconHourglassHigh`. Sizes 14/16/20.

## 5. Tokens

- Colour: `--gd-color-surface`, `--gd-color-surface-sunken` (input fills),
  `--gd-color-border` (hairlines, future stepper dots, disabled fill),
  `--gd-color-border-strong` (default buttons, locked status, checkboxes),
  `--gd-color-border-focus`, `--gd-neutral-100` (placeholders), `--gd-color-accent`
  (stepper progress), `--gd-color-accent-subtle` (selected option),
  `--gd-color-text`, `--gd-color-text-secondary`, `--gd-color-text-tertiary`,
  `--gd-color-link`, `--gd-success-tint` / `--gd-success-on-tint`, `--gd-info-*`,
  `colorPrimary`. Tooltip and disabled colours come from the antd theme.
- Spacing: `--gd-space-1` (4) … `--gd-space-16` (64) on the 4/8/12/16/24/32/48/64
  scale. Checklist rows 16/24.
- Radius: control, 6 / 8 for 20 / 40 covers, card, panel, pill for status circles
  and the avatar (`corner-shape: round`).
- Controls: 40; project Select 56; status circle 24; evidence slot and icon buttons
  32.
- Type: 32/700 title, 24/700 headings, 14 body and facts, 13 stepper, stage,
  captions, status numbers.

## 6. States

- **Loading** (any page): title and facts render; the body shows `Skeleton` rows.
- **Hub order rule**: 12.0a — 1 active, 2 and 3 locked; 12.0b — 1 done, 2 active, 3
  locked; 12.0c — 1 and 2 done, 3 active. Item 2 counts as done only with a project
  and at least one "done so far" row. Status fetch failed: inline in the panel,
  "Could not load your progress" + "Try again".
- **Running checkpoint on the chosen project**: item 3's button "Go to your
  checkpoint".
- **Facts price**: "from $19" → chosen amount → "$X paid" / "$X reserved".
- **About you**: required — first name, last name, country, work direction,
  speciality, skill level; avatar optional; save failed → `message.error`.
- **Your project**: switching disables the Select with `loading`; no cover →
  placeholder; no projects → 12.2c. **What's done so far**: one empty row for a
  project without history; carried over (12.2b) with the caption; 1–5 rows; "Add
  item" hidden at 5; empty → "Save and go back" disabled with a lock and the
  tooltip "Add at least one thing that's done"; a row without evidence is allowed;
  a deleted artifact → "Attach evidence"; switching the project reloads the list
  for that project.
- **Modal**: required name, description (pitch), genre, stage, both agreements; AI
  validation as today; failure → `message.error`, values kept; genres failed →
  Select `status="error"`. After creation the project is selected and the list has
  one empty row.
- **Payment failed**: existing `05.1` content in the shell.
- **Paid**: settling and declined branches as today, in the centred column.
- **Permission denied**: the Select lists only projects where the user may buy a
  checkpoint.

## 7. Copy (Tolgee keys, English defaults)

| Key | Default |
|---|---|
| `checkpointEntry.title.first` / `.next` | Head for your first checkpoint / Head for your next checkpoint |
| `checkpointEntry.fact.days` | {days} days |
| `checkpointEntry.fact.goal` | One goal |
| `checkpointEntry.fact.curator` | Expert or AI curator |
| `checkpointEntry.fact.priceFrom` / `.priceChosen` / `.pricePaid` / `.priceReserved` | from {price} / {price} / {price} paid / {price} reserved |
| `checkpointEntry.about.title` | Tell us about yourself |
| `checkpointEntry.about.todo` | Your name and speciality — about a minute. |
| `checkpointEntry.about.done` | {name} · {speciality} |
| `checkpointEntry.about.hint` | So the curator knows who they work with. The rest of your profile can wait. |
| `checkpointEntry.project.title` | Tell us about your project |
| `checkpointEntry.project.todo` | Pick a project or create one, and where it is now. |
| `checkpointEntry.project.done` | {project} · {stage} stage · {count, plural, one {# thing} other {# things}} done so far |
| `checkpointEntry.project.hint` | Pick the project this checkpoint is for, or create one. |
| `checkpointEntry.checkpoint.title` | Your checkpoint |
| `checkpointEntry.checkpoint.line` | Set the goal for {days} days, show what you have today and choose a curator. |
| `checkpointEntry.checkpoint.button` | Set the goal |
| `checkpointEntry.checkpoint.running` | Go to your checkpoint |
| `checkpointEntry.fillIn` / `.edit` | Fill in / Edit |
| `checkpointEntry.loadFailed` | Could not load your progress |
| `checkpointEntry.saveBack` / `.cancel` | Save and go back / Cancel |
| `checkpointEntry.done.label` | What's done so far |
| `checkpointEntry.done.help` | Up to {max} things that exist today — the curator measures the {days} days from here. |
| `checkpointEntry.done.placeholder` | e.g. a playable greybox, a design doc, sketches |
| `checkpointEntry.done.carried` | Carried over from Checkpoint {number} — remove what no longer applies. |
| `checkpointEntry.done.add` / `.remove` | Add item / Remove |
| `checkpointEntry.done.required` | Add at least one thing that's done |
| `checkout.step.goal` / `curator` / `payment` | Goal / Curator / Payment |
| `checkout.goal.title` / `.hint` | Your goal / One goal for the 28 days, and the hours your team can give. |
| `checkout.curator.hint` | An expert on calls, or the AI curator in writing. |
| `checkout.payment.hint` / `.pay` | Nothing is charged until you confirm. / Pay {amount} |
| `checkpoints.now.newProject` | New project |
| `checkpoints.now.noProject` / `.noProjectHint` | You have no project yet / A checkpoint is reached with a project — create one to head for it. |
| `checkpoints.now.createFirst` | Create a project first |
| `checkpoints.now.stageWhere` / `.stageWhereHelp` | Where is the project now? / We'll set the project on this stage; earlier stages are marked done. (modal only) |
| `modal.create-project.checkpoint.title` / `.ok` | New project / Create project |
| `modal.create-project.field.description.pitch` | What's the game about |
| `modal.create-project.field.genre.label` / `.failed` | Genre / Genres could not be loaded |
| `checkpoints.paid.onYourWay` / `.onYourWayLine` | You're on your way / Day 1 of {days} · Checkpoint {number} · AI curator |
| `checkpoints.paid.reservedTitle` / `.reservedSub` | Payment reserved / Charged when the curator accepts. |
| `checkpoints.paid.emailWhenAnswers` | We'll email you when {curator} answers — usually within 3 days. |
| `checkpoints.paid.receipt` / `.toWorkflow` / `.fillProject` | Receipt / Go to the workflow / Fill in your project |
| existing | profile/speciality labels, `checkpoints.now.next` ("Next — curator"), `checkpoints.evidence.attach`, `modal.create-project.field.not-ai.*` / `agree.*`, `checkpoints.paid.held` / `replace` / `cancel` |

Existing copy that says "start" for a checkpoint (`checkpoints.paid.starting`, any
"Pay and start") is reworded on this path: "Payment received — getting you on your
way", "Pay {amount}".

## 8. Data needs

- **Hub status** (one read): profile complete enough (first/last name, country,
  speciality with work direction and skill level) + summary (name, speciality); the
  selected project (id, slug, name, cover, stage) and its "done so far" count;
  running or drafted checkpoint on it; whether the user ever had a checkpoint
  (first/next title); the minimum price ($19, AI curator). The order rule is applied
  on the client.
- **About you submit**: the existing profile and speciality APIs with
  `from=checkpoint` (Interest = author, onboarding completed without Resources).
- **Projects for the Select**: id, slug, name, cover (nullable), current stage. No
  pagination (cap ~50, by last activity).
- **What's done so far — storage (no schema change)**: `CheckpointItem` rows of
  `kind = Input` on the project's checkpoint **draft** (created or reused when the
  project is saved on item 2), `order`, `text`, optional `artifactId`; 1–5 rows
  enforced on the server. Saving item 2 = project choice + these rows.
- **Carry-over (12.2b)**: when the draft is created for a project with a previous
  checkpoint, prefill with that checkpoint's `Input` items plus its delivered
  `Outcome` items (readable artifact, not `cut`), capped at 5 (Outcomes first, then
  Inputs — open question 1); the caption needs the previous number.
- **Introduction**: at purchase, a project still on Introduction is moved to
  Ideation, earlier stages marked done — server side, no field.
- **Create project (modal)**: name, description (pitch), genre id, stage id, both
  confirmations; returns id, slug, name, cover, stage.
- **Stage list** (Ideation … Preparing a release version, modal only), **genre
  catalogue**.
- **Evidence**: project artifacts (id, name, type, link); "Add new" from a file or a
  link.
- **Wizard**: the existing draft (goal, hours), curator, payment.
- **Facts price**: minimum, chosen, paid/held amount and whether charged or held.
- **Paid**: unchanged checkpoint DTO plus the checkpoint's number.

## 9. Decisions and open questions

Decided: About you via the existing profile/speciality APIs; $19 is the AI price and
the minimum; paid screens in the light shell; pitch = `Project.description`; "Edit"
can switch the project, the old draft stays a draft; no sentence under the hub
title; hub items unlock strictly in order; one facts row on every page, no project
in it; the stage is set only in the New project modal, Introduction projects move
to Ideation at purchase; "What's done so far" (1–5 rows) is part of Your project,
the wizard is Goal · Curator · Payment.

Open:

1. Carry-over can exceed 5 rows (Inputs + delivered Outcomes). Assumed: delivered
   Outcomes first, then Inputs, cut at 5 — confirm the order.

---

## v2 (GDHUB-96) — purchase path, items 1–3

Intent: [docs/intent/GDHUB-96-purchase-path.md](../../intent/GDHUB-96-purchase-path.md).
The approved frames are reworked **in place**; sections 1–9 above stay true except where
this section says otherwise.

### What changed on the frames

| Frame | Change |
|---|---|
| 12.1 About you `TV9y5` | First and last name are one field **Name** (prefilled from the session: Google or the registration name), with **Year of birth** beside it (a select, as in onboarding; required; under 18 the field shows "You need to be 18 or over to head for a checkpoint" and the step does not save). **Country is replaced by Time zone**: a select of IANA zones shown as "Europe/Tallinn · UTC+3", prefilled from the browser (`Intl.DateTimeFormat().resolvedOptions().timeZone`) and editable; stored on the profile. Work direction, speciality and the skill-level select stay as they were. **New: "Briefly about your experience"** — a textarea under them (up to 500 characters, counter), help text "So your project's curator can learn a little more about you before the start."; optional; stored in `Speciality.specialization`. The subtitle no longer says the curator sees who you are: "Your speciality and level help the curator pitch their advice. The rest of your profile can wait." The primary button is **Save and continue**. |
| 12.2 Your project `u7wrRw` | The primary button is **Save and continue**: it leads on to the goal. |
| 12.3 Goal `mfAfN` | **Unchanged.** The author states their own hours; the team is the registered members. More people come in by invitation after payment. |

### The straight line

- A new user goes about you → your project → goal → curator → payment, each **Save and
  continue** leading to the next.
- The hub (12.0) stays the screen people come back to: a profile or a project already
  exists, or they left half-way. From the hub the steps behave as before.
- Signing up from the landing keeps `?project=` through registration.

### Data

- `Profile.yearOfBirth` (exists). The about step and the pay endpoint refuse when
  `currentYear − year < 18`.
- `Profile.timezone` (IANA name). Call reminders to the team are written in it instead of
  UTC; the curator's brief shows it.
- No team numbers on the checkpoint. The author's side, the curator's card and the AI goal
  check count the same members (`TEAM_ROSTER_STATUSES` without former members).

### Copy (Tolgee keys, English defaults)

| Key | Default |
|---|---|
| `checkpointEntry.about.name` | Name |
| `checkpointEntry.about.timezone` | Time zone |
| `yearOfBirth` | Year of birth (existing onboarding key) |
| `checkpointEntry.about.underage` | You need to be 18 or over to head for a checkpoint |
| `checkpointEntry.about.experience` | Briefly about your experience |
| `checkpointEntry.about.experienceHelp` | So your project's curator can learn a little more about you before the start. |
| `checkpointEntry.about.hint` | Your speciality and level help the curator pitch their advice. The rest of your profile can wait. |
| `checkpointEntry.saveContinue` | Save and continue |

### Open questions

1. Inviting the team after payment: a link to the project's team page on the paid screens
   (12.6 / 12.7) — not drawn yet.
