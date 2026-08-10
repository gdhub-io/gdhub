# Auth & Registration — flow inventory

Source of truth: the code as of `dev` (see file references). Laid out at the bottom of
`platform-design.pen` as top-level frames, one per screen, in three rows:

- `y = 26620` — sign in · registration · invitation pages (16 frames)
- `y = 27800` — onboarding (the 7 existing `Onboarding — 00…06` frames)

All page frames are 1512 × 982 (MacBook Pro 14"). One exception: `Onboarding — 03 /
Interests` is 1512 × 1150, because its form does not fit in 982 — that page scrolls in the
browser. The mail and diagram frames keep their own smaller sizes; they are not pages.

Every page carries an instance of the reusable `Log out bar (auth pages)` component — a
borderless text button reading **Log out** in the top-right corner, which ends the current
session so the user can come back as somebody else. Wording matches the app's own "Log in
with…" buttons. **Design only so far; not implemented.** It would call `signOut({ callbackUrl:
"/signin" })`. On the ten unauthenticated screens (sign in 01–04, the expired-link page and
registration 01–05) there is no session to end, so it is a no-op there and should probably be
dropped from those frames.

plus `Auth & Registration — flow map` (header) and `— gaps` panels above and below. Each
frame carries its one-line description in its Pencil `context` property.

Entry points: `/signin`, `/registration`, `/invite/[token]`, plus the middleware redirect in
[src/proxy.ts](src/proxy.ts) that throws any unauthenticated hit on `/hub`, `/profile`,
`/user/*`, `/live/*`, `/admin/*`, `/dev/*` to `/signin?callbackUrl=<path>`.

---

## Row A — Sign in (existing user)

Component: [SigninClient.tsx](src/app/(auth)/signin/SigninClient.tsx). One card, three
internal steps in local state (`loginStep`), no route change between them.

| # | Frame | State / copy |
|---|-------|--------------|
| A1 | `/signin` — choice | Title "Sign in" + "to the gdhub.io platform". Buttons: **Log in with email** (primary), **Log in with Google** (primary, `IconBrandGoogle`), link "Create new account" → `/registration`, ghost "Back to main" → `/`. |
| A2 | `/signin` — email form | Paragraph "We will send a letter to email with a link to log into your account". One filled `Input` "Enter Email" (required, type=email). Buttons: **Send link to email** (primary, has `loading`), link **Back** → A1. |
| A2-err | inline validation | "Please enter Email" under the field. |
| A3 | `/signin` — link sent | **Redesigned — copy differs from the code today.** Envelope mark, heading "Check your email", then "We have sent a sign-in link to" with **{email}** on its own line in bold, then a tinted callout stating the action: "Open the link to finish signing in — you will land straight in the platform. The link works once." + ghost **Return to main**. The old version was one flat paragraph in which the next step was indistinguishable from the rest. |
| A-err1 | toast: session expired | `message.error` "Your session has expired. Please sign in again." — shown when `?error=RefreshTokenExpired`. |
| A-err2 | toast: invalid grant | `message.error` "Invalid authorization. Please sign in again." — `?error=InvalidGrantError` (Google refresh token revoked, thrown from the `session` callback in [src/auth.ts](src/auth.ts)). |

Google branch from A1 → Google consent screen (`prompt: select_account consent`) →
`callbackUrl` (default `/hub`).

## Row B — The magic-link email itself

> **TODO — email templates are not designed.** The frames that mocked these were removed
> from the canvas on 2026-08-09; they represented content, not a real design, and there was
> no point keeping a placeholder that could be mistaken for one. Picking this up means
> deciding first whether the Brevo-hosted bodies move into the repo or stay in Brevo —
> that decides whether they can be designed against [ui-guidelines.md](ui-guidelines.md)
> at all. The invitation mails in `src/templates/emails/` are at least in git; the four auth
> mails are not.

Sent from `sendVerificationRequest` in [src/auth.ts:74](src/auth.ts#L74).
**Two different templates, chosen by whether the user already exists:**

| # | Frame | Content |
|---|-------|---------|
| B1 | Email — sign-in (existing user) | Brevo template `signin`: id 1 (en) / 3 (ru), picked by `user.lang`. Single param `link`. |
| B2 | Email — registration (new user) | Brevo template `registration`: id 2 (en) / 4 (ru). Locale here comes **not** from the user record (there is none) but from the `locale` query param inside `callbackUrl`, falling back to `defaultLocale`. |
| B3 | Email — dev/local | Non-production path sends plain SMTP: subject "Sign in", body `Sign in: <url>`. Worth one small frame so the difference is visible. |

Template ids: [src/config/brevo-templates.ts](src/config/brevo-templates.ts). The visual
design of B1/B2 lives in Brevo, not in the repo — the frames should show the intended
layout so Brevo can be brought in line.

## Row C — What happens when the link is clicked

| # | Frame | State |
|---|-------|-------|
| C1 | Callback (transient) | `GET /api/auth/callback/email?token=…&email=…` — no UI of ours, a redirect. Draw as a thin "system" node. |
| C2 | Link OK → destination | Sign-in: `callbackUrl` (`/hub` or the deep link the middleware stored). Registration: `/registration/onboarding?locale=..&provider=email[&for=..]`. |
| C3 | Link expired / already used | NextAuth's **default** error page at `/api/auth/error?error=Verification` — unstyled, outside our design system. **Gap: we have no custom page for this.** Only `pages.signIn` is overridden in `authConfig`. Draw the frame we want. |
| C4 | Link opened in another browser | Works — the token is server-side, not tied to the tab. But the pre-registration cookie (`auth.email.pre-registration`) is **not** there, so terms/newsletter consent is lost. Worth a note on the frame. |

## Row D — Registration (new user)

Component: [RegistrationClient.tsx](src/app/(auth)/registration/RegistrationClient.tsx).
Same three-step-in-one-card pattern, but the provider is chosen *before* the consent step.

| # | Frame | State / copy |
|---|-------|--------------|
| D1 | `/registration` — choice | Title "Registration" + "on the gdhub.io platform". **Create new account**, **Registration with Google**, link "I already have an account" → `/signin`, ghost "Back to main". |
| D2e | `/registration` — email + consent | "We will send a letter to email with a registration link". Email input + two checkboxes: "By joining, you agree to our **Terms of Service** and **Privacy Policy**" (required) and "Receive platform news" (optional). Buttons **Send registration link**, link **Back**. |
| D2g | `/registration` — Google + consent | Same two checkboxes, no email field. Button **Continue with Google** → Google consent. |
| D2-err | consent not ticked | `notification.error` "You should confirm the accuracy of the information entered" (top-right toast, not an inline field error). |
| D3 | `/registration` — link sent | **Redesigned — copy differs from the code today.** Same shape as A3: heading "Confirm your email", "We have sent a confirmation link to" + **{email}** in bold, callout "Open the link to confirm your address. Registration continues right there — the remaining steps wait for you behind it." + ghost "Back to main". |

Consent + the `?for=` param are stashed in the cookie `auth.email.pre-registration` /
`auth.google.pre-registration` before the redirect, and read back during onboarding.

## Row E — Onboarding (4 steps + welcome + done)

Route `/registration/onboarding`, [OnboardingClient.tsx](src/app/(auth)/registration/onboarding/OnboardingClient.tsx).
Chrome from [OnboardingLayout](src/components/onboarding/OnboardingLayout/index.tsx): gdhub
logo, title "Registration", and an antd `Steps` (Profile · Speciality · Interests ·
Resources) from `md` up — below `md` it degrades to a 4-segment progress bar. The welcome
and completed screens are full-page: centred, no title, no progress.

| # | Frame | Content |
|---|-------|---------|
| E0 | Welcome (step −1) | "Welcome to the Game Developers Hub community!" + paragraph + primary **Fill out the profile** (300px). |
| E1 | Step 1 — User Profile | firstName, lastName, email (prefilled), yearOfBirth (placeholder = now − 16y), country (select), city. Checkbox `confirmUserData`. **Save and continue**. |
| E2 | Step 2 — Speciality | name (with AI-assist), level, workDirection, specialization, jobs/experience, portfolioUrl (CV link), skills, schools/education. Hidden: id, tools, summary. **Back** / **Save and continue**. |
| E3 | Step 3 — Interests | primaryInterest, motivation, preferredGenres, preferredSettings, preferredLevels. **Back** / **Save and continue**. |

`primaryInterest` now shows **four** cards in the design: Author, Specialist, Mentor and the
new **Scout — "I want to find interesting projects for publishing"** (lucide `telescope`).
Design only. Implementing it needs, in order:

1. `Scout` added to the `PrimaryInterest` enum — that enum lives in the Prisma schema inside
   `@gdhub-io/gdhub-prisma`, **not in this repo**, so it is a change to that package plus a
   migration, then `bun run db:generate`.
2. `PrimaryInterest` in [src/config/prisma-enums.ts](src/config/prisma-enums.ts) — it is
   `satisfies Record<PrimaryInterestType, …>`, so it fails to type-check until step 1 lands.
3. A fourth entry in `interestOptions` and a `case "scout"` in the `preSelectedInterest`
   switch in [OnboardingInterestStep](src/components/onboarding/OnboardingInterestStep/index.tsx),
   so `/registration?for=scout` preselects it.
4. Tolgee keys `onboarding.interests.wantToBe.scout` and `onboarding.interests.scout.description`.
| E4 | Step 4 — Resources | timeForWorkMin / timeForWorkMax + "hours a week", `isActive` checkbox, otherResources. **Back** / **Save**. |
| E5 | Completed | "Your profile was successfully completed!" + paragraph + primary **Let's go** → `/hub`. |
| E5-load | Completed, invitation pending | Full-height `Spin` with tip "Processing your invitation…" — shown when `?pendingInvitation=` is set or `/api/user/me` returns pending invitations. Auto-redirects, the user never sees E5. |
| E-err | OnboardingError | `OnboardingError` component. Currently unreachable — `error` state is never set in `OnboardingClient`. Note it on the frame. |

Middleware guard, both directions ([src/proxy.ts](src/proxy.ts)):
`!onboardingDone` anywhere → `/registration/onboarding`; `onboardingDone` on the
onboarding route → `/hub`. Draw as two arrows, not as frames.

## Row F — Team invitation

Component: [InviteClient.tsx](src/app/(auth)/invite/[token]/InviteClient.tsx).
Email templates: `team-invitation.html`, `invitation-accepted.html`,
`invitation-accepted-pending.html`, `invitation-declined.html`,
`invitation-completed.html` in [src/templates/emails/](src/templates/emails/).

| # | Frame | State |
|---|-------|-------|
| F0 | Email — team invitation | `team-invitation.html`, link → `/invite/{token}`. |
| F1 | `/invite/{token}` — loading | Centred `Spin size=large`, full viewport. |
| F2 | Not signed in | Auto-fires `signIn(undefined, { callbackUrl: '/invite/{token}' })` — so the user lands on A1 and comes back here after the magic link. This is the one path where sign-in and invitation interleave. |
| F3 | Invitation card | Card 600px: "Team Invitation" + "You have been invited by {inviter} to join the team of project {project} as a {position}." + "Start Date: {date}". Buttons **Decline** (left) / **Accept Invitation** (right, primary). |
| F4 | Already accepted | `Result status=info` "Invitation Already Accepted" + **Go Home**. |
| F5 | Declined | `Result status=warning` "Invitation Declined" + **Go Home**. |
| F6 | Expired | `Result status=warning` "Invitation Expired" + **Go Home**. |
| F7 | Load/accept error | `Result status=error` "Error" + message from the API + **Go Home**. |
| F8 | New user via invite | Invite → signin → magic link → onboarding with `?pendingInvitation=` → E5-load → project team page. The long path; worth drawing as its own connector chain. |

Follow-up emails after F3: accepted / accepted-pending / declined / completed.

---

## Design-system alignment

All 22 product pages (sign in, registration, invite, onboarding) now follow
[ui-guidelines.md](ui-guidelines.md). What changed, and the rule behind each:

- **Graphite acts, brand orients.** Every committing button is graphite (`$btn-black` /
  role `action`). Filled brand is gone from the product surface — it survives only as the
  step-progress dots, a 2px border, a 4–8% tint (`$accent-subtle`, role `accentSubtle`) and
  icons. The onboarding "Save and continue" buttons and both invite buttons used to be
  filled brand; the selected interest card used to be a solid brand block and is now a tint
  with a 2px brand border.
- **Links use the `link` role** (brand 700, `$link`), not brand 500 — brand 500 on white
  fails contrast for body-size text.
- **One family.** Onboarding ran on Inter, everything else on Onest. All of it is `$font`
  now.
- **No raw hex.** Onboarding carried 14 hardcoded colours (five near-identical greys among
  them); the whole flow is on tokens.
- **One icon set.** Onboarding used lucide, the new frames phosphor — all lucide now. The
  single exception is the Google mark, which no neutral icon set ships; the guidelines
  exempt third-party brand marks.
- **Elevation e0 is the default.** Shadows dropped from the invite cards — a shadow means
  "floats above the page", so it stays only on the toasts and the notification, which do.
- **Radii from the scale** (chip 6 / control 10 / card 12 / panel 16) instead of a flat 8,
  and weights limited to 400/500/600 with 700 for display.
- **One page ground.** All 22 pages are `$surface`; panels separate with a hairline
  `$border`, not with a shadow.
- **State screens are empty states, not cards.** The six invite screens were bordered cards
  wrapping antd `Result` — a different shape from every other page in the flow. They are now
  the same centred 440px column the sign-in and link-sent pages use: a 56px `IconTile`
  (radius 16, `$bg-muted`) instead of a bare 48px glyph, a 26/700 title, one sentence, and
  full-width buttons. Rule 2 sets the tile, rule 4 sets the shape.
- **Tile colour carries the state, the tile itself stays neutral.** `$text-secondary` for
  informational, `$warning` / `$error` for problems, `$brand-primary` for the two screens
  that need the user to go and do something (check your email / confirm your email). This
  applies to the sign-in and registration screens; the invite screens carry the logo
  instead — see below.
- **The invite screens lead with the logo, not an icon.** An invitee arrives from an email
  onto a page they have never seen, so the first thing on it has to say whose page this is.
  Each of the five carries an instance of the `MDNum` logo component (the same one the
  onboarding screens use) where the icon tile was. The trade-off: the three problem states
  (declined, expired, error) no longer have a coloured state marker — the title and the
  sentence are the only signal. Worth revisiting if those screens turn out to be missed.

## Notes for the layout

- Rows A/D are near-identical card layouts with different copy — place them one above the
  other so the divergence (consent checkboxes only in D) reads at a glance.
- Rows B, C1, and F0 are not our UI; keep them visually distinct (dashed frame / different
  fill) so the boundary between the product and the mail is obvious.
- Design gaps found while inventorying, worth marking with a callout on the canvas:
  1. **C3** — magic-link errors fall back to NextAuth's unstyled default page.
  2. **A3 / D3** — no "resend link" and no way back to editing the email; the only exit is
     "Back to main".
  3. **D2-err** — consent failure is a corner toast where every other field error is inline.
  4. **F1/F3–F7** — the invite screens use raw inline styles and `Result`, not the design
     system's `EmptyState` / tokens.
  5. **E-err** — `OnboardingError` is designed but unreachable.
