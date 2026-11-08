# Platform map

Every surface of GDHub, numbered. The number is the same in the design file
(`docs/design/platform-design.pen`, frame names), in issues and in talk: "12" is
checkpoints, "12.08" is the curator's review, "12.08.3" one state of it.

## How numbers work

- `SS.FF.V` — **SS** the section, **FF** a screen or feature inside it, **V** a
  state or variant of that screen (optional; letters such as `12.11.6b` are kept
  where the checkpoint frames already used them).
- A section number is never reused. New screens take the next free **FF** in
  their section; a new state takes the next **V**.
- Canvas rows are named `Row — SS · …`, so the canvas reads in the same order.
- Numbers that existed before this map were kept: the checkpoint frames were
  `01`–`13` and became `12.01`–`12.13`; artifacts `A01`–`A05` became `04.05`;
  `DS · 08`–`11` became `00.08`–`00.11`.

## A. Public

### 00 · Design system

Tokens, components and the DS pages.

| № | Screen | States |
|---|---|---|
| 00.01 | Design System (DS 01–07) | — |
| 00.08 | Cards — projects & events | — |
| 00.09 | Applause | — |
| 00.10 | Forms & settings | — |
| 00.11 | Tables | — |
| 00.12 | Space bar — breadcrumbs & switcher | — |
| 00.13 | Direction — multiselect (open) | — |
| 00.14 | Experience — multiselect (open) | — |
| 00.15 | tmp tiles | — |

### 01 · Public pages

Landing, about, public project / event / job / course pages, verify, footer, cookie consent.

| № | Screen | States |
|---|---|---|
| 01.01 | Landing — v2 · Desktop | 3 |
| 01.02 | Landing — header & hero | 1 |
| 01.03 | Landing — current · Desktop | 1 |
| 01.04 | About us · Desktop | 1 |
| 01.05 | Footer · Modal — Write to us (Email link) · Desktop | 7 |
| 01.06 | Scouts · Modal — Request access (subject prefilled) · Desktop | 1 |
| 01.07 | Cookie Banner | 5 |
| 01.08 | Project Page — `/project/[slug]` | 1 |
| 01.09 | Event Page — `/event/[slug]` | 3 |
| 01.10 | Job Page v2 — `/job/[id]` | 2 |
| 01.11 | Course Detail Page | — |
| 01.12 | Legal Details Page | — |
| 01.13 | Verify Page - Empty State | 2 |
| 01.14 | Main Footer | — |
| 01.15 | Project Trails — `/lab/project-trails` (experimental) | 5 |

### 02 · Account

Sign-in, registration, invitations, onboarding.

| № | Screen | States |
|---|---|---|
| 02.01 | Log out bar (auth pages) | — |
| 02.02 | Auth & Registration — flow map | — |
| 02.03 | Signin — 01 provider choice | — |
| 02.04 | Signin — 02 email form | — |
| 02.05 | Signin — 03 link sent | — |
| 02.06 | Signin — 04 error toasts | — |
| 02.07 | Signin — magic link expired (NextAuth default) | — |
| 02.08 | Registration — 01 choice | — |
| 02.09 | Registration — 02 email + consent | — |
| 02.10 | Registration — 03 Google + consent | — |
| 02.11 | Registration — 04 consent not ticked | — |
| 02.12 | Registration — 05 link sent | — |
| 02.13 | Invite — 02 invitation card | — |
| 02.14 | Invite — 03 already accepted | — |
| 02.15 | Invite — 04 declined | — |
| 02.16 | Invite — 05 expired | — |
| 02.17 | Invite — 06 error | — |
| 02.18 | Onboarding — 00 / Welcome | — |
| 02.19 | Onboarding — 01 / Profile | — |
| 02.20 | Onboarding — 02 / Speciality | — |
| 02.21 | Onboarding — 03 / Interests | — |
| 02.22 | Onboarding — 04 / Resources | — |
| 02.23 | Onboarding — 05 / Completed | — |
| 02.24 | Onboarding — 06 / Error | — |
| 02.25 | Header — my hours (time I invest per week) | 3 |

## B. Core features — across spaces

### 07 · Chat

The chat launcher, panel and conversations.

| № | Screen | States |
|---|---|---|
| 07.01 | Chat · components | — |
| 07.02 | Chat · Launcher (header icon states) | — |
| 07.03 | Chat · Panel · List · All (hover + row menu) | 7 |
| 07.04 | Chat · Panel · Conversation · Advice (at bottom, delivery states) | 7 |
| 07.05 | Chat · Mobile · List (full screen) | 1 |
| 07.06 | Chat · Message actions · states | 1 |
| 07.07 | Chat · Dialog · Close chat (Modal.confirm) | 1 |
| 07.08 | Chat · Announcements · Member (no composer, reactions, picker open) | 2 |
| 07.09 | Chat · Message content types · Direct (link, preview, image, YouTube) | 3 |

### 11 · Legal

Documents, acceptance and signatures, wherever they are asked for.

| № | Screen | States |
|---|---|---|
| 11.01 | Legal · Clickwrap checkbox | — |
| 11.02 | Legal · Sign-up · Terms of Use | — |
| 11.03 | Legal · Sign-up · Terms not accepted | — |
| 11.04 | Legal · Create Project modal · Project Requirements | — |
| 11.05 | Legal · Create Project modal · Requirements not accepted | — |
| 11.06 | Legal · Advisor · switched on, agreement not accepted | 3 |
| 11.07 | Legal · Advisor · Agreement modal | — |
| 11.08 | Legal · Advisor · agreement accepted, space on | — |
| 11.09 | Legal · Public /legal — index | — |
| 11.10 | Legal · Public /legal/terms-of-use — current version | — |
| 11.11 | Legal · Public /legal/terms-of-use/v2 — archived version | — |
| 11.12 | Legal · Share change · member | — |
| 11.13 | Legal · Share change · accept new shares | 1 |
| 11.14 | Legal · Share change · author | — |
| 11.15 | Legal · Terms prompt · first time | 2 |
| 11.16 | Legal · Verify · checkpoint certificate | — |
| 11.17 | Legal · Admin /admin/legal/acceptances | — |
| 11.18 | Legal · Profile · My documents | — |
| 11.19 | Legal · Profile · My documents · loading, empty, error | — |
| 11.20 | Legal · Admin Acceptances · loading, empty, error | — |

### 12 · Checkpoints

The 28-day checkpoint: landing, purchase, path, calls, reviews, verdict, admin, payouts.

| № | Screen | States |
|---|---|---|
| 12.00 | Checkpoint landing | 2 |
| 12.01 | Path · a new project, no checkpoints | — |
| 12.02 | Path · the first checkpoint card, cancelling a draft, moving to the next stage | 6 |
| 12.03 | Purchase · Now | 2 |
| 12.04 | Purchase · Curator | 2 |
| 12.05 | Purchase · Payment | 1 |
| 12.07 | Path · an active checkpoint, results, after the verdict | 9 |
| 12.08 | Path · a session day, and the curator's review (pro) with the call | 12 |
| 12.09 | Path · sprint 2, and the pulse | 5 |
| 12.10 | Path · the AI curator's review day, and its reviews | 7 |
| 12.11 | Admin · Checkpoints — list, promo codes, refunds, verdict, curator, journal — `/admin/checkpoints` | 25 |
| 12.12 | Start and wizard — `/checkpoint/start`, `/user/project/[slug]/workflow/cp/new` | 16 |
| 12.13 | Payouts, earnings, rating, curator onboarding, waitlist — `/admin/payouts`, `/advisor/earnings` | 23 |
| 12.14 | The human curator's verdict window | 2 |
| 12.15 | Components · verdict status, curator badge, pulse cell, plan task | 3 |
| 12.16 | Notes · long content, captions | 2 |
| 12.17 | The old workflow widget (kept for reference) | 6 |
| 12.18 | Dev · AI curator lab — `/dev/ai-curator` | 3 |

### 13 · Emails

Every transactional email, in English only: one layout, sent by Synapse (chat), Brevo (sign-in, registration) and Novu (the rest).

| № | Screen | States |
|---|---|---|
| 13.01 | Email layout — header, body, footer · desktop 600 (+ mobile 375) | 1 |
| 13.02 | Chat · missed messages — one room, several rooms with an image, invite to a room, unread without message content (Synapse) | 4 |
| 13.03 | Sign in (magic link) (Brevo) | — |
| 13.04 | Registration (magic link, new account) (Brevo) | — |
| 13.05 | Team invitation | — |
| 13.06 | Invitation response to the inviter — accepted, waiting for approval, joined, declined | 4 |
| 13.07 | Default message — short, long (generic Novu notification) | 2 |
| 13.08 | Events — registered, new member to the organiser, message from the organiser | 3 |
| 13.09 | Devlog reminder | — |

## C. Spaces and their features

### 03 · Hub

Catalogs, people cards, talent pool.

| № | Screen | States |
|---|---|---|
| 03.01 | Hub Page — `/hub` | 2 |
| 03.02 | Hub Projects Page | — |
| 03.03 | Hub — Events — `/hub/events` | — |
| 03.04 | Hub — Jobs — `/hub/jobs` | — |
| 03.05 | Hub Courses Page | — |
| 03.06 | Talent Pool Page | 2 |
| 03.07 | Job Card | — |
| 03.08 | Note — Hub — Welcome character | — |
| 03.09 | Hub — Welcome hero character | — |
| 03.10 | Talent Card Modal — Redesign | 1 |
| 03.11 | Expert Card Modal | — |
| 03.12 | Popover — Project | 2 |
| 03.13 | Popover — Certificate | — |
| 03.14 | Popover variants note | — |

### 04 · Project space

Workflow, tasks, roadmap, vacancies, artifacts, devlog.

| № | Screen | States |
|---|---|---|
| 04.01 | Project — Workflow | 1 |
| 04.02 | Task Row | 1 |
| 04.03 | Roadmap chart · Full | 1 |
| 04.04 | Vacancy Modal — Create | 1 |
| 04.05 | Artifacts — `/user/project/[slug]/artifacts` | 4 |
| 04.06 | Modal — Devlog composer · empty | 5 |
| 04.07 | Candidate Card Modal (redesign on the Talent Card) | — |

### 05 · Course space

Courses, curriculum, cohorts, students, payments, settings.

| № | Screen | States |
|---|---|---|
| 05.01 | My Courses Page | 1 |
| 05.02 | Course — Curriculum | 1 |
| 05.03 | Course — Cohorts | 1 |
| 05.04 | Course — Students | — |
| 05.05 | Course — Classroom | — |
| 05.06 | Course — Payments | — |
| 05.07 | Course — Student Payments | — |
| 05.08 | Course — Settings · General | — |
| 05.09 | Course — Settings · Certification | — |
| 05.10 | Course — Settings · Teachers | — |
| 05.11 | Course — Settings · Payouts | — |
| 05.12 | Course — Settings · Danger zone | — |

### 06 · Event space

Events, schedule, content, members, settings.

| № | Screen | States |
|---|---|---|
| 06.01 | My Events Page — `/user/events` | — |
| 06.02 | Event — Schedule — `/user/event/[id]/schedule` | — |
| 06.03 | Event — Content — `/user/event/[id]/content` | — |
| 06.04 | Event — Members — `/user/event/[id]/members` | — |
| 06.05 | Event — Settings · General (conference / gamelab) | 1 |
| 06.06 | Event — Settings · Certification | — |
| 06.07 | Event — Settings · Danger | — |
| 06.08 | Modal — Schedule Item | 1 |

### 08 · Advisor space

Requests, reviews, calendar, checkpoints, settings.

| № | Screen | States |
|---|---|---|
| 08.01 | Advisor — Requests — `/advisor/requests` | 1 |
| 08.02 | Modal — Advice request | — |
| 08.03 | Advisor — Reviews — `/advisor/reviews` | 1 |
| 08.04 | Modal — Review (create / edit) | — |
| 08.05 | Advisor — Calendar | — |
| 08.06 | Modal — Cancel a consultation | — |
| 08.07 | Advisor — Checkpoints — `/advisor/checkpoints` | 1 |
| 08.08 | Advisor — Settings · General | — |
| 08.09 | Advisor — Settings · Requests | — |
| 08.10 | Advisor — Settings · Availability | — |
| 08.11 | User Settings — Mentorship (switch only) | 2 |
| 08.12 | Modal — Advisor agreement | — |
| 08.13 | Advisor — project popover note | — |
| 08.14 | Advisor — states note | — |

### 09 · Scout space

Games, the project card, settings.

| № | Screen | States |
|---|---|---|
| 09.01 | Scout — Games (rebuilt) | — |
| 09.02 | Scout — Settings · General (rebuilt) | — |
| 09.03 | Scout — Settings · Investment Focus (rebuilt) | — |
| 09.04 | Scout — Settings · Alerts (rebuilt) | — |
| 09.05 | Scout — Settings · Danger zone (rebuilt) | — |
| 09.06 | Scout Cabinet — states | — |
| 09.07 | Project Modal — Hollow Tide (rebuilt) | 8 |

### 10 · Admin

Users and roles, workflows, audit log, views.

| № | Screen | States |
|---|---|---|
| 10.01 | Admin — Users — `/admin/users` | 1 |
| 10.02 | Modal — User roles | 1 |
| 10.03 | Modal — New custom role | — |
| 10.04 | Modal — Role permissions | — |
| 10.05 | Modal — Role permissions · confirm save | — |
| 10.06 | Popover — Users filters | — |
| 10.07 | Modal — Sync all users with Brevo | — |
| 10.08 | Admin — Workflows · Templates — `/admin/workflows` | 1 |
| 10.09 | Admin — Workflow editor — `/admin/workflow/[id]` | 1 |
| 10.10 | Modal — New workflow template | 1 |
| 10.11 | Modal — New step | 1 |
| 10.12 | Modal — Reset project workflow to template | 1 |
| 10.13 | Menu — Template row actions | 1 |
| 10.14 | Dialog — Workflow locked by an active checkpoint (admin) | — |
| 10.15 | Admin — Audit log — `/admin/audit-logs` | — |
| 10.16 | Dialog — Audit entry detail | 1 |
| 10.17 | Popover — Audit filters | 1 |
| 10.18 | Admin — Views — `/admin/views` | 6 |
| 10.19 | Admin — Open positions — `/admin/open-positions` | 1 |
| 10.20 | Dialog — Position applications (read-only) | 1 |
