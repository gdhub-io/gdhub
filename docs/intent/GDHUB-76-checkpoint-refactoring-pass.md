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

- **Behaviour, API shapes, DTOs and data do not change.** The exceptions are
  the three race and bypass bugs fixed in phase 2 and the membership work in
  phase 5. No schema change.
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
2. **Status.** `lib/checkpoint-status.ts` and
   [docs/checkpoints-status-flow.d2](../checkpoints-status-flow.d2), approved
   2026-10-29.
   - Named sets and predicates. The table of allowed moves has 11 edges.
   - Every status write spreads `checkpointMove(from, to)` into an
     `updateMany`, so the expected status is in the WHERE and a lost race
     writes nothing. `tests/checkpoint-status.test.ts` fails on any other
     status write.
   - Bugs fixed:
     - The curator's answer and the silence cron could both win.
     - A paid draft handed to the AI skipped `startAiCheckpoint`: no
       sessions and no first letter.
     - An admin refund could overwrite a verdict that was just sent.
   - Moved to phase 4: the draft-state helpers (`isDeclined`, `isSettling`),
     which also read payment fields and differ between screens.
3. **Layers.** Done 2026-10-29.
   - The checkpoint domain moved into `repositories/checkpoints/`,
     `services/checkpoints/` and `lib/checkpoints/`: 79 files, all imports
     rewritten. The curator files are now `curator-catalog`,
     `curator-approval`, `ai-curator-context` and `ai-curator`.
   - Flows (notifying, paying, calling the AI or Daily) moved to
     `services/checkpoints/flows/<area>.ts`. They read and write through the
     repository of the same area. `tests/checkpoint-layers.test.ts` fails if a
     checkpoint repository imports a service at runtime.
   - `appUrl`, `reviewUrl` and the AI curator's character catalogue moved to
     `lib/checkpoints/`, the curator's types to `types/checkpoint-curator.ts`.
   - Checkpoint routes call repositories and flows; none imports Prisma.
   - Cancelling now deletes only a pending checkpoint, so it cannot race a
     curator accepting.
   - The DTOs the screens read moved to `types/checkpoints.ts`,
     `types/checkpoint-call.ts` and `types/checkpoint-journal.ts`. No component
     imports a checkpoint repository.
   - Flows still call Prisma directly in places. Moving every one of those
     queries into a repository is left for when a flow is next touched.
4. **Big files and load.** Done 2026-10-29.
   - Split every checkpoint file over about 600 lines:
     - `repositories/checkpoints/checkpoint.ts`: the detail builder moved to
       `detail.ts`, and the shared selects to `select.ts`.
     - `services/checkpoints/notifications.ts`: the scheduled reminders moved
       to `reminders.ts`.
     - `journal-view.ts`: the text helpers moved to `lib/checkpoints/journal-text.ts`.
     - Six components (`VerdictModal`, `CheckpointsTable`, `AiReview`,
       `RunningCheckpoint`, `CallPlan`, `PaidWorkSection`) are split into
       files in their own folders.
     - `types/checkpoints.ts` stays whole: it holds only types.
   - Load:
     - `GET /api/checkpoint` takes the blocker from the current row when that
       row is open. Every screen shares one cached list.
     - `PUT /api/checkpoint/[id]` reads the payment once and runs its
       independent checks at once. It still judges them in the same order.
     - The curator's card reads the checkpoint without the author-only reads.
     - Opening the chat answers from the room row when the room exists.
     - The curator's yes no longer waits for Matrix (`after()`).
     - The author's checkpoint no longer carries the devlog bodies.
   - The draft states are written once, as `isFreshDraft` and `isDeclined` in
     `lib/checkpoints/draft.ts`.
   - Left on purpose: the space guard's one-column read of an `[id]` route's
     project. Folding it into the handler would change the guard for every
     route, to save a primary-key lookup.
5. **Team membership.** This is a behaviour fix.
   - Add `currentMembership()` and `reconcileCheckpointRooms()`.
   - Add `setCurrentStep(from, to)`, which stamps or clears `finishedAt` for
     every stage it crosses.

## Done when

- [ ] Every phase leaves lint, type-check, the unit tests and the GDHUB-79
      checkpoint e2e scenarios green, and no screen differs.
- [ ] No set of checkpoint statuses lives outside the status module. A
      comparison with a single status is fine. An illegal transition is
      refused, with a test for each refusal.
- [x] No file under `repositories/checkpoints/` imports a notification, payment,
      chat or AI service. A test enforces this.
- [x] No checkpoint route under `app/api` imports Prisma.
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
