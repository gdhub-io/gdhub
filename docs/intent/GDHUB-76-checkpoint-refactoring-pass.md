# GDHUB-76 — Checkpoints: refactoring pass

[Linear](https://linear.app/gdhub/issue/GDHUB-76) · intent written 2026-10-28

## Want

Nobody using GDHub should notice anything, except that the dates on a project's
workflow stages stop going stale. What changes is for whoever works on
checkpoints next. Each rule, such as "running", "cancellable" or "paid", is
written once. Each number lives in the config. A repository reads and writes
rows and nothing else. Today a 34k-line domain is spread across five
top-level folders, and the copies have already started to disagree.

## Why now

The feature has settled; GDHUB-124 is merged into the integration branch.
Every task since GDHUB-31 has paid for the same copies. "Running" means Active,
Active+Review or Active+Review+Closed depending on the file. Status sets are
redefined in 7 places. "14 days" and "28 days" are typed into copy instead of
read from config. Repositories send notifications, charge payments and call the
AI. The full list is in the issue: the 2026-10-09 simplify findings and the
2026-10-28 architecture review.

## Constraints

- **Behaviour, API shapes, DTOs and data do not change**, except in phase 5,
  where changing them is the point. No schema change.
- **Same folder scheme as the rest of the app.** A `checkpoints/` subfolder
  goes under `repositories/`, `services/` and `lib/`. There is no new
  `features/` tree. `components/checkpoints/` stays where it is.
- **Every number stays in one config file**, as the checkpoint settings rule
  requires.
- **Stripe and Paddle never cross.** Every money path keeps going through
  `gatewayFor` and `paymentOf`.
- **One PR per phase, each straight into
  `feature/gdhub-31-add-checkpoints-to-projects`.** No stacked PRs. Each phase
  is cut fresh from the integration branch.

## Phases

1. **Config.** Move the scattered limits into config, and interpolate
   `WITHDRAWAL_DAYS` and the checkpoint length into copy and prompts.
   - Left as literals on purpose:
     - The landing's marketing copy, because `CHECKPOINT_DAYS` is the product.
     - The legal clickwrap, which quotes Purchase Terms 5.2.
     - Technical limits (file sizes, timeouts, page sizes).
   - `getJournal` stays: `scripts/checkpoint-review.ts` uses it.
   - The curator renames moved to phase 3, so each file moves only once.
2. **Status.**
   - One module of named sets and predicates, with a table of allowed
     transitions.
   - Every status write goes through one `transition()`.
   - Draft states move into the same module.
3. **Layers.**
   - Move the files into the `checkpoints/` subfolders, renaming the four
     curator files after what each one does.
   - Split each repository into data (Prisma only) and flows (notify, pay, AI,
     cron).
   - Routes call a flow instead of Prisma.
   - DTOs move into `types/`.
4. **Big files and load.**
   - Split the files over about 600 lines.
   - Clear the duplicate reads, round trips and caches from the issue's "Load"
     list.
5. **Team membership.** This is a behaviour fix.
   - Add `currentMembership()` and `reconcileCheckpointRooms()`.
   - Add `setCurrentStep(from, to)`, which stamps or clears `finishedAt` for
     every stage it crosses.

## Done when

- [ ] Every phase leaves lint, type-check, the unit tests and the GDHUB-79
      checkpoint e2e scenarios green, and no screen differs.
- [ ] No status set and no `status ===` comparison on a checkpoint lives
      outside the status module. An illegal transition is refused, with a test
      for each refusal.
- [ ] No file under `repositories/checkpoints/` imports a notification, payment,
      chat or AI service. A lint rule enforces this.
- [ ] No checkpoint route under `app/api` imports Prisma.
- [ ] "14 days", "28 days" and the call length appear nowhere as literals in
      code, copy or prompts.
- [ ] Moving a project across several stages, from the admin or in one jump,
      leaves each crossed stage with a correct `finishedAt`. A test covers it.

## Out of scope

- The same problems outside checkpoints:
  - Prisma in other routes
  - Novu calls across the app
  - the AI call boilerplate
  - the `components/` root folder
  - query keys
  - tables

  These are listed in the issue for a separate task.
- New features, UI changes and copy rewrites. Copy changes only where a literal
  becomes an interpolated config value.
- `AIAgentDrawer` and anything langgraph.
- Schema changes in `gdhub-prisma`.

## Open questions

- *Does the data/flows split need its own folder names?* Assumed: flows go in
  `services/checkpoints/`, and data stays in `repositories/checkpoints/`.
- *Should phase 4's load work wait for GDHUB-94?* Assumed: no. These are
  checkpoint routes and they are fixed here. GDHUB-94 keeps `auth()` and
  everything platform-wide.
