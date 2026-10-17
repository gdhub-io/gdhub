# GDHUB-54 — Legal layer

[Linear](https://linear.app/gdhub/issue/GDHUB-54) · intent written 2026-10-17 ·
design: [docs/legal/legal-layer.md](../legal/legal-layer.md)

## Want

Whenever someone on GDHub agrees to something — the Terms at sign-up, the Project
Requirements, the Advisor Agreement, the Expert Services Terms before earning money, the
Checkpoint purchase terms, the Checkpoint Standard as a curator — the platform can show later exactly which text they agreed to,
in which version, and when. Anyone can read every legal document and its past versions at
`/legal`; users see their own documents and certificates in one place; a certificate from
an event, a course or a checkpoint can be checked by anyone at `/verify`.

## Why now

Checkpoint launch is blocked on it (GDHUB-87): without a recorded acceptance of the
purchase terms and a separate waiver of the withdrawal period, a refund cannot keep the
value of calls already given. Today the evidence does not exist anywhere: sign-up stores
a boolean in `User.agreements`, the project checkbox is checked only in the browser, the
checkpoint keeps its own `acceptedTermsAt`, and the texts are rendered live from Notion.

## Constraints

- Texts are markdown files, `docs/legal/<slug>/v<n>.md`, listed in a registry in code with
  effective date, entity and checksum; a new version is a pull request. No admin editor.
  The files must reach the server build, not only the repo.
- One table, `LegalAcceptance`; the `Legal*` tables the app never wrote to are replaced.
  Schema changes go through `../prisma` and a released package.
- Legal entities are configured in `src/config/legal/entities.ts`: each hub space names
  its entity (`default` → the VšĮ), the founder's sole proprietorship is kept alongside,
  and each document names its issuer. A version records the entity it names, so changing
  an issuer never rewrites accepted text.
  The entity also carries the currency: checkpoint prices, Stripe, consultation prices and
  the texts read it from there, and no screen hardcodes `$` or `€`.
- A published file is never edited or deleted; one version in effect per document.
- The server refuses the action without the acceptance, not only the form.
- Ticks, not signatures — the Advisor Agreement included (the Documenso plan in
  `docs/advisor-space.md` is dropped). Issued event certificates keep their signature
  and their `/verify` pages. DocuSeal is removed.
- Old URLs (`/terms`, `/privacy-policy`, …) 308 to `/legal/<slug>`.
- The checkpoint pay step and the curator's accept step live in the checkpoint
  integration branch (`feature/gdhub-31-add-checkpoints-to-projects`); that part lands
  where that code is.

## Done when

- [ ] Paying for a Checkpoint needs two unticked checkboxes (purchase terms; immediate
      start and loss of withdrawal), stores two acceptances with `checkpointId`, and the
      pay endpoint refuses without them — **first, before launch**.
- [ ] A curator accepts the Checkpoint Standard in force for each checkpoint they take.
- [ ] Paid consultations and curation cannot be switched on without the Expert Services
      Terms and payout details. **Deferred (2026-10-17):** `/advisor/settings` does not exist
      yet and the terms have no text; it lands with the advisor settings page and curation
      in the checkpoint branch. `ExpertProfile` and `acceptLegal` are ready for it.
- [ ] The Advisor space does not open without the Advisor Agreement.
- [ ] Sign-up stores one acceptance — the Terms; project creation stores the Project
      Requirements and the server refuses a project without it.
- [ ] After a material change takes effect, users get one email and are asked to accept
      at the next sign-in before going on.
- [ ] Profile → My documents lists what the user accepted (each opens the exact text)
      and the certificates issued to them.
- [ ] Events, courses and checkpoints issue certificates checkable at `/verify/<number>`;
      the existing event certificates still verify.
- [ ] `/legal` lists every document with its current text and archived versions, without
      sign-in. `/admin/legal` lists acceptances with filters and a CSV export written to
      `AuditLog`.
- [ ] Tests prove: one version in effect per document at any moment; a published file
      matches its checksum; no document in effect names an entity other than the current
      one; each endpoint refuses without its acceptance; an outdated version is refused.

## Out of scope

The project co-development agreement (decided 2026-10-17, designed, not built): a project
switches it on in its settings (`Project.usesCoDevelopmentAgreement`); while it is off no
shares are given and the agreement is not mentioned; members accept it when given or
changed a share. See `docs/legal/legal-layer.md` §3. Signatures for agreements,
per-agreement instances and parties, PDF and zip exports,
three-party agreements, user-supplied templates, Lithuanian versions, verifiable badges.
The texts themselves — including bringing the Advisor Agreement and Checkpoint Terms in
line with the product and splitting out the Expert Services Terms — are GDHUB-87.
Workflow step content still read from Notion is GDHUB-97.

## Open questions

- **Free curation** — the Advisor Agreement allows volunteer checkpoints; assumed none for
  now: curation always needs the Expert Services Terms.
- **Payout details** — assumed: the fields the payout by hand needs (holder, IBAN or
  account, invoicing status), stored on the advisor profile; no payment provider account.
- **Existing rows** in the old `Legal*` tables in production — assumed none; checked with
  a count before the schema change.
