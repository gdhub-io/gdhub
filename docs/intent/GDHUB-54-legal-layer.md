# GDHUB-54 — Legal layer, stage 1

[Linear](https://linear.app/gdhub/issue/GDHUB-54) · intent written 2026-10-17 ·
architecture draft: [docs/legal/legal-layer.md](../legal/legal-layer.md) (Russian, §12 stage 1)

## Want

When someone on GDHub agrees to something (the Terms at sign-up, an advisor's agreement
when switching on the Advisor space, the purchase terms when buying a Checkpoint), the
platform can show later exactly which text they agreed to, in which version, and when.
Anyone can read every legal document at a stable `/legal` address, including the
versions that came before. An admin can publish a new version without editing the old
one, and can see and download who agreed to what.

## Why now

Checkpoint launch is blocked on it (GDHUB-87). Without a recorded acceptance of the
purchase terms and a separate waiver of the withdrawal period, a refund cannot keep the
value of calls already given. Today nothing is recorded anywhere: the `Legal*` models
exist in the schema but the app never writes to them, and Terms/Privacy/Cookie/Refund
are rendered live from Notion, so there is no version to point an acceptance at.

## Constraints

- Schema changes go through `../prisma` and a released package (two-repo loop).
- A published version is never edited or deleted; a correction is a new version.
- Existing public URLs (`/terms`, `/privacy-policy`, `/cookie-policy`, `/refund-policy`,
  `/legal-details`, `/project-requirements`) keep working — they redirect or render the current version.
- Issued event certificates and `/verify/[number]` keep working unchanged.
- Signatures: Documenso only. DocuSeal is not used — `legal-docuseal.ts` and
  `@docuseal/api` are removed.
- Admin section fits the existing admin space: a `legal` feature with `view`/`manage`
  in `src/config/spaces/admin.ts`, like Roles and Workflows.
- Cookie consent stays a separate mechanism, never folded into a clickwrap.
- Notion was a stopgap for legal text (decided 2026-10-17). Terms, Privacy, Cookie,
  Refund and Project Requirements move into the repo — sources in `docs/legal/*.md`, seeded into
  `LegalDocumentTemplate` — and their pages stop reading Notion.

## Done when

- [ ] Buying a Checkpoint requires two unticked checkboxes (purchase terms; immediate
      start and loss of withdrawal) and stores two acceptances with version, checksum,
      IP, user-agent and context — **first slice, ships before launch**.
- [ ] Sign-up requires accepting the Terms of Use; the acceptance is stored the same way.
- [ ] Creating a project requires accepting the Project Requirements (today the
      checkbox is checked only in the browser and nothing is stored); the acceptance is
      stored and the server refuses a project without it.
- [ ] Switching on the Advisor space requires accepting the Advisor Agreement; the space
      does not switch on without it.
- [ ] `/legal` lists every published document; each has its current text and its past
      versions with effective dates, readable without signing in.
- [ ] Every document is one entry in a code registry (code, audience, trigger, method);
      adding one touches no shared code.
- [ ] The models are space-scoped (`spaceType` + `spaceId`) with `LegalParty`; a
      project's co-development agreement uses the same tables as everything else.
- [ ] Novu sends `legal-acceptance-requested` and `legal-acceptance-completed`.
- [ ] `/admin/legal`: create a version, preview it with test params, publish it (the
      previous one archives); list concluded documents with parties and statuses;
      download a PDF or a filtered zip, each download written to `AuditLog`.
- [ ] Tests prove: only one published version per (code, locale); a published text
      cannot be changed; an acceptance always carries the checksum it was shown.

## Out of scope

Stage 2 and 3 of the draft: certificates moving onto `LegalInstance`, the
re-acceptance gate after a material change, "My documents", Documenso signature for
the co-development agreement, the remaining Novu workflows, user-supplied templates,
Lithuanian versions, verifiable badges. Also out: the **texts** themselves (GDHUB-87),
the seller entity, and the transactional email design. Workflow step content (`/api/notion/page`), the
last Notion reader, is not legal and moves off Notion in its own issue.

## Open questions

- **The seller entity** is undecided (GDHUB-87) — assumed: a template param, filled when
  decided; it does not block the mechanics.
- **Existing rows in `ProjectLegalSnapshot` / `LegalAcceptance` in production** —
  assumed none, since nothing writes them; checked with a count before the migration.
- **Translating `legal-layer.md` to English** — done in this branch, before code, as the
  spec the work is checked against.
