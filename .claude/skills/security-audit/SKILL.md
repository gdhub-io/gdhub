---
name: security-audit
description: Security audit of the current change — OWASP Top 10, payment integrity, GDPR Art. 32 and this repository's own security rules. Use before opening a pull request, when asked for a security check, and with `release` before a dev → main promotion.
---

# Security audit

Run by hand before a pull request, and on request. It looks for problems; it
does not fix them. The fixes are a separate decision, so the result is a ranked list,
not a diff.

The first full audit, and the rules below that came out of it, is
[GDHUB-146](https://linear.app/gdhub/issue/GDHUB-146) — read its findings for what each
class of hole looked like here.

## Scope

**Default — the change itself**, the way `/simplify` reviews a diff:

```sh
base=$(git merge-base HEAD origin/dev)   # or the integration branch the PR targets
git diff "$base"                          # committed on the branch + uncommitted
git ls-files --others --exclude-standard  # new files not yet added
```

A path, a PR number or a range passed as an argument replaces this.

- **What the change touches** is in scope too: a changed helper puts its callers in
  scope; a new field on a model puts every route that returns that model in scope;
  a changed status or flow puts every reader of that status in scope (the draft
  vacancy that leaked in GDHUB-146 was readable through a route the change never
  touched).

**`release` — before dev → main.** The changes were audited one by one; this run is
the net for what slipped between them. Do not read the whole `main...dev` diff:

1. the whole-repo sweeps below, against their known lists;
2. `bun audit`, reachable production dependencies only;
3. a short list of what `main...dev` adds — new routes, webhooks, env vars, prompts,
   dependencies (`git diff --stat` and `--name-status` filtered to those paths) —
   and a check of only those against the areas below.

## How

- Check the load first (`uptime`, `memory_pressure`). Everything here is reading:
  no build, no e2e, no dev server.
- A small change does not need agents: read it yourself against the four areas. For
  a large one, split the scope over **at most 4 read-only agents**, one per area below. Give each
  the diff range, its checklist and the rules section; ask for file, line, what an
  attacker does, and the impact.
- **Verify every High and Critical yourself** in the code before reporting it. Mark
  what you verified and what only an agent read.
- `bun audit` for dependencies: report what is reachable from production code, not
  the raw count.

## Areas

### 1. Access control
- Every new route under `src/app/api` has `withAuth`, and a route that reads or writes
  a project, team, course, event or user's rows has `withSpaceGuard` (or an explicit
  owner `where`). An id from the request is never trusted on its own.
- Mass assignment: bodies go through a Zod whitelist; `status`, `authorId`, `userId`,
  `isFeatured`, role fields are never taken from a non-staff body.
- Responses select fields; no full `User` row (email, telegram, tokens) to someone
  who is not that user.
- Drafts, unpaid and unpublished things are not readable through a public page or API.
- `mode: "any"` and `mode: "public_api"` routes: is anonymous access intended?

### 2. Payments and webhooks
- Paddle: a payment settles only for one item at the payable's catalog price
  (`soldAtOurPrice`) and the payable in custom data matches the `Payment` row.
- Every webhook verifies its signature on the raw body, with no environment that
  skips it, and runs its work through `oncePerEvent`.
- Refunds: one in flight per payment; recorded only once the provider approves.
- Providers never cross: a Paddle event never touches a Stripe row (`paymentOf`).
- Prices and fees live in `src/config` and match the provider's catalog.

### 3. Untrusted content
- HTML from users renders only through `SafeBlocks` (editor.js), `SafeMarkdown`
  (markdown with raw HTML) or `sanitizeHtml`. No new `rehypeRaw`,
  `dangerouslySetInnerHTML` or `html-react-parser` on user data.
- Outbound fetches of user URLs go through `safe-fetch`; OG images through `ogCover`.
- Sanity GROQ, Typesense filters and any query string are parametrised, never
  interpolated.
- Uploads: type and size checked on the server.
- AI prompts: every user-written field is wrapped in `fenced()` and the system prompt
  carries `PARTICIPANT_DATA`. Check new prompts and new fields in old ones.

### 4. Configuration and privacy
- Security headers in `next.config.js` still present; CORS on `/api` is our origin.
- New env vars: secrets are not `NEXT_PUBLIC_*`; read through `env()`; an unset secret
  denies access instead of granting it.
- Costly or abusable routes (email sending, AI calls, invites) have a rate limit
  (`src/lib/rate-limit.ts`, numbers in `src/config/rate-limits.ts`).
- New personal data: is it covered by account erasure (`src/services/privacy`) and the
  Privacy Policy?
- Errors reach the client as generic messages; `error.message` stays in the log.

## Whole-repo sweeps

```sh
# routes with no auth wrapper: compare with the known list below
grep -rLE "withAuth|withDevOnly|verify|isBackendCall|isDailyWebhook|stripeEvent" src/app/api --include='route.ts' | sed 's#src/app/api/##; s#/route.ts##' | sort
# raw HTML: only the known places below may appear
grep -rnE "rehypeRaw|dangerouslySetInnerHTML|from \"html-react-parser\"" src --include='*.tsx' | grep -v "lib/content\|ui/Safe"
# interpolated GROQ / queries: expect nothing
grep -rnE 'query: `.*\$\{' src
# NEXT_PUBLIC_ keys: compare with the known list below
grep -rhoE "NEXT_PUBLIC_[A-Z_]*(SECRET|TOKEN|ADMIN|PRIVATE|KEY)[A-Z_]*" src .env.example | sort -u
# error details sent to clients: expect nothing
grep -rnE "json\(\{[^}]*error(\?)?\.message" src/app/api
```

A hit is a lead, not a finding: read it before reporting it. Anything not in the
known lists is new — that is where to look first. When a new entry is right, add it
here in the same pull request.

**Known public routes** (as of GDHUB-146): public content — `blog`, `blog/[slug]`,
`courses`, `courses/[slug]`, `devlogs`, `devlog/[projectReportId]`, `legal/[slug]`,
`projects/latest`, `project/team`, `project/reports`, `project/vacancies`, `vacancies`,
`dictionary/*`; applause (`devlog/.../applause`, `project/.../applause`); signed links
(`calendar/[token]`, `pulse/[token]`, `verify/[number]` and its `pdf`/`download`);
`auth/[...nextauth]` (rate-limited magic links); `novu` (Novu's own bridge); `dev/*`
(each refuses in production or outside the e2e stand).

**Known raw HTML:** `app/layout.tsx` and `GoogleTagManager` (our own inline scripts),
`TextWithLineBreak` (sanitised before parsing), `helpers/editorjs-renderers.tsx`
(reached only through `SafeBlocks`).

**Known public keys:** `NEXT_PUBLIC_API_KEY` (never accepted by cron or backend
routes), Firebase API and VAPID keys, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` (client-side by
design), `NEXT_PUBLIC_TOLGEE_API_KEY` (check its scope is read-only),
`NEXT_PUBLIC_TYPESENSE_API_KEY` (to be removed once `TYPESENSE_SEARCH_API_KEY` is
live in production).

## Report

In chat, in Russian, short:

1. **Critical** — anyone can do it now. **High** — any signed-in user, or money.
   **Medium**, **Low**.
2. Per finding: where, what an attacker does, impact, verified by hand or not.
3. **Checked and OK** — the areas that came out clean, so the next audit knows.

Then offer to put the findings into a Linear issue; do not open one unasked.
