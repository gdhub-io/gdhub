# GDHUB-127 — Vacancy applications in their own table, and an admin page for open positions

[Linear](https://linear.app/gdhub/issue/GDHUB-127/team-move-vacancy-applications-out-of-teammember-into-their-own-table) · intent written 2026-11-03

## Want

**For the people using GDHub, nothing about applying or hiring changes:**

- a specialist applies to a vacancy with a message and the contacts they allow;
- the author sees the candidate, chats with them, then hires or rejects them;
- a hired person joins the team.

**One thing is new for the candidate: they can withdraw their own application** from the
vacancy page and the vacancy preview, where today they only read "You have already
responded".

**Under that, an application stops being a team member.** An application becomes its own
record: the candidate, the vacancy, the message, the allowed contacts, its status and
dates. The team holds only the people who really were on it: founders, hired and fired.
Hiring creates the team member from the application and links the two, so the history
stays.

**Hub admins get a read-only `/admin/open-positions` page.**

- Every open position on the platform, with its project, status, dates, pay, views and the state
  of its listing payment: free, paid, pending, failed, cancelled or refunded.
- For each vacancy, its applications: who applied, when, the status, and the message.
  Each one also says whether the author reached the candidate through the vacancy chat:
  when the chat opened, when the author last read it, and whether it is closed. This
  comes from our `ChatRoom` row. Message counts live only in Matrix and are not shown.
  It also says whether **the project viewed the candidate**: the first time the project's
  author or one of its admins opened the candidate card. A platform admin opening it
  counts for nothing. Only platform admins see this; the candidate and the team do not.
- Links lead to the vacancy page, the project and the candidate's talent card.

## Why now

Every "who is on the team" query has to remember to filter out applicants and rejected
candidates, and the queries keep forgetting. GDHUB-76 phase 5 (PR #448) found seven that
showed members-only things to applicants:

- the project page by slug;
- the event project pickers;
- the roles shown in advisor requests.

Patching each one does not stop the next query from making the same mistake. With
applications in a separate table, `TeamMember` cannot hold an applicant at all.

Today there is also no place where an admin can see vacancies and their responses across
projects. Answering a support question means reading the database.

## Constraints

- **Two-repo loop.**
  1. The schema change and the data migration go into `gdhub-prisma`, and the package is
     released.
  2. Only then is the app adapted.
- **Every existing application moves**, active and rejected, with its own dates. No
  application is lost, and nobody who was on a team stops being on it.
- **A hired member keeps a link to the application they came from**, wherever that
  application exists.
- **Every place that links to an application follows it:** chat context, notifications,
  the relevant-vacancies cron, and anything storing a `teamMemberId` that meant an
  application.
- **Behaviour is unchanged for users:**
  - existing routes and URLs keep working;
  - the vacancy chat's auto-join still applies only to an active application;
  - a rejected or hired application never reopens a chat.
- **Admin:**
  - the page is read-only and has no actions;
  - it uses a new admin feature `vacancies` with permission `view` (the page itself is named
    "Open positions", as the product calls vacancies), granted like the
    other admin read pages;
  - every visible column comes from data that already exists.
- **Design.** Admin tables follow the design system: outlined tables, plain empty states.
  The page is drawn in Pencil before it is built.

## Done when

- [ ] `TeamMember` has no applicant or rejected rows, and its statuses are only `Founder`,
      `Hired` and `Fired`. The migration moves every former applicant and rejected row
      into the new table; local row counts before and after match.
- [ ] A specialist can apply, and the author can open the chat, hire and reject exactly as
      before. The candidates list shows the same people, and the e2e vacancy-candidate
      spec still passes.
- [ ] Hiring creates a `TeamMember` linked to its application, and the application reads
      as hired.
- [ ] An applicant never appears anywhere a member does: the team, the project page,
      event pickers, advisor roles, the checkpoint pulse. This holds by construction, and
      a test still covers it.
- [ ] `/admin/open-positions` lists every open position, filterable by status and project. Opening
      one shows its applications with candidate, date, status and message.
- [ ] A candidate with an active application sees "Withdraw application" on the vacancy
      page and in the vacancy preview. Withdrawing asks first, then marks the application
      withdrawn, closes the vacancy chat with a line saying so, and drops them from the
      author's candidates. They may apply again later as a new application.
- [ ] The admin list shows each vacancy's listing payment as recorded: free, paid, pending,
      failed, cancelled or refunded.
- [ ] Opening a candidate's card as the project's author or a project admin stamps the
      application as viewed, once. A platform admin opening it stamps nothing. Only `/admin/open-positions` shows it.
- [ ] A user without the admin `vacancies.view` permission gets no page and no data.

## How to check it on the platform

1. `/dev-signin` → a specialist persona → open a published vacancy `/job/<id>` → apply with
   a message.
2. Sign in as the project's author → My Team → Candidates: the applicant is listed. Open the
   chat: the greeting is in it. Hire them: they join the team. Repeat with a second
   applicant and reject them: they leave the list and the chat closes.
3. Open the project page and the advisor request role picker: the rejected candidate is
   not on the team.
4. Sign in as a hub admin → `/admin/open-positions`. The vacancy is listed. Open it: both
   applications, one hired and one rejected, with their messages and dates.
5. As a third specialist, apply, then press "Withdraw application" on `/job/<id>` and
   confirm. The author's candidates list no longer shows them, and the chat says they
   withdrew. The admin page lists the application as withdrawn.
6. Sign in as a plain member and request `/admin/open-positions` and its API: both are refused.

## Out of scope

- A "my applications" list for the candidate. Withdrawing happens where the candidate
  already sees that they applied.
- Admin actions on vacancies or applications: unpublish, archive, reject.
- Vacancy notifications, and the Paddle listing flow itself. The admin page only reads
  the payment rows.
- New e2e scenarios. Those belong to GDHUB-128; this task only keeps the existing ones
  green.
- The guard-test alternative from the issue: the table split makes it unnecessary.

## Open questions

- **The `withdraw` route deletes the row today**, and the vacancy's manager is the one who
  calls it. Assumed: on an application it now sets status `Withdrawn` rather than
  deleting, so the history stays. On a hired member it keeps doing what it does now.
- **Application statuses.** Assumed: `Submitted`, `Hired`, `Rejected`, `Withdrawn`. "Hired"
  is kept on the application so that the admin page and the history read without a join.
- **Listing payment on the admin list.** Assumed: the latest `Payment` of type `VACANCY`
  for the vacancy decides the shown state, and no payment means free. The offered pay
  comes from the vacancy.
- **Who is told when a candidate withdraws.** Assumed: a system line in the vacancy chat,
  if one exists. No new email or notification template.
