# Admin — Open positions, and withdrawing an application (GDHUB-127)

Frames:
- **10.19** `M9agGZ`: the list. **10.19.1** `KPAFv`: none match.
- **10.20** `ESAPb`: a position's applications. **10.20.1** `gcjn6`: none yet.
- **01.10.1** `igLKu`: the job page once you have applied. **01.10.2** `mCNR8`: the withdraw confirm.

Intent: [docs/intent/GDHUB-127-vacancy-applications.md](../../intent/GDHUB-127-vacancy-applications.md).
Logic: [docs/vacancy-applications-flow.d2](../../vacancy-applications-flow.d2).

## What was built

- **`/admin/open-positions`.** Permission `admin.vacancies.view`, read-only.
  - The table is `ModernTable` with the columns Position, Project, Status, Listing, Applications, Published, Relevant until and Views.
  - Position is a 32 direction tile plus the title and the direction under it.
  - Status and Listing are a dot and a word.
  - Counts are right-aligned with `tnum`.
  - Search covers the title and the project name. Filters: position state (draft · published · expired · closed) and listing (free · paid · pending · failed · cancelled · refunded · disputed).
- **Listing payment.** The latest `Payment` of type `VACANCY` decides it, and no payment means free. A paid listing shows the fee as charged ("Paid · €49"). The offered pay is never shown here.
- **Clicking a row** opens `PositionApplicationsModal`, newest first. Each application shows:
  - the candidate: name, which opens their talent card without the offer, plus speciality and level;
  - the status: Submitted, Hired, Rejected or Withdrawn;
  - the date, the message and the contacts allowed;
  - "Viewed by the project <day>". It is set the first time the author or a project admin opens the candidate card. A platform admin opening it does not count;
  - the chat line, from our `ChatRoom` row: when it opened, when the author last read it, and when it closed. The reason it closed is read from the application's outcome, because it is not stored.
- **On the job page and in the position preview,** an open application turns the button into "Withdraw application" and shows "You applied on <date>". `useWithdrawApplication` asks first, then withdraws.

## Departures from the frame

- **Empty states are plain secondary text, not `EmptyState`,** as Dmitry asked for empty tables.
- **The table head follows the shared table style,** the same as the other admin pages, rather than the band drawn in DS · 11.

## The candidate card (04.07 `Ypf6c`)

- **Its own modal on its own endpoint.** `ProjectCandidatePreviewModal` reads `GET /api/user/project/candidate`, which calls `getCandidateCard`. That read has an explicit select, and its contacts are only the ones this application allows. Nothing from the talent card's endpoint reaches it: no other matches, no chat, no hidden email.
- **Shared parts with the talent card** live in `components/person-card/sections.tsx`: header, contact field, portfolio, projects, certificates, About, Professional info, Preferences, footer and skeleton. Each part renders only the data it is handed.
- **Actions:** Message, Reject (danger) and Accept the team. The names are kept for the e2e spec.
- **Departure:** "About" shows the profile's `motivation`, as the old card did. The talent card's `profile.about` does not exist on the model, so that card shows no About.
