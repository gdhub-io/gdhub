# Legal layer — UI handoff (GDHUB-54)

Frames: [`docs/design/platform-design.pen`](../platform-design.pen), row **Legal** from
`y = 67000` (row note `EDVzL`). Model: [docs/legal/legal-layer.md](../../legal/legal-layer.md).
Intent: [docs/intent/GDHUB-54-legal-layer.md](../../intent/GDHUB-54-legal-layer.md).

**Built in the checkpoint branch, not drawn here** (`feature/gdhub-31-add-checkpoints-to-projects`):
the pay step (Purchase Terms + Withdrawal Waiver, two checkboxes) and the curator's accept
step (Checkpoint Standard). Both use `ClickwrapField`.

---

## 1. Problem & user

Whenever someone agrees to something on GDHub — Terms at sign-up, Project Requirements,
the Advisor Agreement, the Expert Services Terms before earning money, a project's
co-development agreement once they hold a share — the platform must later show exactly
which text, which version, when. Visitors read every document at `/legal`; users see their
own documents and certificates in one place; anyone checks a certificate at `/verify`;
admins see and export acceptances.

---

## 2. Frames

| Frame | Node id | What it shows |
|---|---|---|
| Clickwrap checkbox | **rUE26** | Unticked `X55GY`, ticked `ywR1g`, error `XV8kw`, text updated `lmRUq`. |
| Sign-up · Terms of Use / not accepted | **o0tNw** / **r7Xs1y** | Registration with the Terms clickwrap; inline error instead of the old toast. |
| Create Project modal / not accepted | **bjuWB** / **o4O2xq** | Project Requirements clickwrap. |
| Advisor · not accepted / modal / accepted | **ep5EM** / **Opj60** / **isYQT** | `/user/settings/mentorship`: the switch, the Advisor Agreement state, the link into the space — nothing else. |
| Advisor settings · Paid work · not set up / error / set up | **Q8dNW0** / **SyTre** / **S5YkC** | `/advisor/settings` → *Paid work*: Expert Services Terms + payout details first, then paid consultations and curation. |
| Share change · member / accept / author | **S5YiA** / **JE8bI** / **kAKOz** | Team page banner and old → new share; the accept modal; the author's view of who has not accepted. |
| Share change · first share | **CqRJV** | The accept modal when the member had no share: "You were given a share", "— → 5%". |
| Terms prompt · first time / updated / updated, error | **BnOHg** / **wx2Zi** / **qGqSf** | The acceptance prompt over a dimmed `/hub` (cards `d4Q2Wk`, `a27pW`, `p3IKH`). |
| /legal index / current / archived | **CytzX** / **KPEs5** / **W1rro** | Every published document; one version; an archived version. |
| Profile · My documents / states | **CJGPi** / **ZssMc** | Accepted documents and Certificates; loading, empty, error. |
| Verify · checkpoint certificate | **yDe69** | `/verify` for a non-event certificate. |
| Admin · Legal acceptances / states | **A18rpy** / **P5Bfq** | The only admin page; loading, empty, error. |

Removed: `DsjqX`, `xniGa`, `I9vSJT` (paid work belongs in the space); `xajLY`, `mCPjb`
(invites and offers carry no agreement); `yuMw7` (the full-page re-acceptance gate, replaced
by the prompt).

Icons are lucide stand-ins named after their `@tabler/icons-react` component. The canvas
gained one variable, `bg-mask`, mirroring antd `colorBgMask` from `src/config/design/antd.ts`.

---

## 3. Texts and data

As legal-layer.md §2a and §3:

- Each version is `docs/legal/<slug>/v<n>.md`, listed in `src/config/legal` with effective
  date, `materialChange`, the entity it names and the SHA-256 of the text as shown.
  Publishing = a pull request. No admin editor.
- The legal entity comes from `src/config/legal/entities.ts`; texts name it through
  `{{entity.*}}` placeholders filled at render. The design never hardcodes an entity.
- **A project agreement exists only where there are shares.** Equity is optional and an
  invitation carries no share, so **invites and vacancy offers are unchanged and conclude
  nothing**. The agreement starts when the author gives a member a share for the first time
  and moves with every later change; the share-change flow is the only place a member
  accepts it. It is a template filled with the project's title and the member's share; the
  acceptance row keeps `projectId` and the filled values (`params`).
- One table, `LegalAcceptance`: user, code, version, checksum of the text shown, context,
  `checkpointId` or `projectId` + `params`, UTC time, IP, user-agent.
- Rendering: `react-markdown` via `src/components/legal/LegalDocument/` (h1 32/600, h2
  24/600, body 16/1.6, article 760).
- Never accepted, only published: Privacy, Cookie, Refund, Legal Details. Sign-up stores one
  acceptance (Terms).

---

## 4. Screens

**Clickwrap.** 18px checkbox, `--gd-radius-chip`, border `--gd-color-border-strong`, ticked
`colorPrimary`; label 14/1.5; the document name is the link (`--gd-color-link`) and **the
only way to open the text** — no separate "read the document" link next to a checkbox.
Message under the label, indented 26. Never pre-ticked; the link opens the exact version in
a new tab, signed out; ticking is its own action; one box per document.

**Terms prompt** (replaces the full-page gate). After sign-in, a member who has not
accepted the version in effect of a document they are bound by (Terms of Use for everyone;
Advisor Agreement for advisors) gets this prompt over the app. It follows the cookie panel
(`M7q2k`): a compact white card, 460 wide, `--gd-radius-panel`, hairline `--gd-color-border`,
`--gd-shadow-e3`, padding 24, gap 20, centred over the page under the antd mask
(`colorBgMask`).
- Head: 40 `IconTile` (`IconFileText`), title 16/600, one line 14 secondary.
  - *First time* (everyone today): "Please accept our terms" / "We now record which version
    of our terms you accepted. Nothing changes for you."
  - *Updated*: "We updated our terms" / "See what changed and confirm to continue."
- One block per document, separated by a hairline: `ClickwrapField` ("I accept the
  <link>{title}</link>") with "v{n} · {effective date}" 13 tertiary under the label, and for
  an updated document up to three "what changed" bullets (13 secondary, from the registry).
  **No document text in the prompt** — the label link opens the exact version.
- *Accept and continue* (primary, full width) and a quiet *Sign out* text link under it.
- **Non-dismissible:** no close, Esc and mask clicks do nothing; the only ways on are
  accepting every listed document or signing out. Error: an unticked box gets the clickwrap
  error under its label; ticked boxes stay ticked.

**Advisor role (three documents).**
- `/user/settings/mentorship` (ep5EM, Opj60, isYQT): switch → Advisor Agreement modal →
  space opens. Free consultations live here as part of the space.
- `/advisor/settings` gets a fourth section **Paid work** between Requests and Danger zone
  (menu + one form card, rule 7, *Save* under the card). The card starts with an outlined
  **Expert Services** block: account holder, IBAN or account number, invoicing
  (self-employed / company / I accept self-billing), and the Expert Services Terms
  clickwrap. Below it: *Paid consultations* (switch + price per consultation) and *Curation*
  (switch + stages you curate). Both switches are locked (lock icon, tooltip) until the
  block is saved. Set up: the clickwrap is replaced by "Accepted on {date} · version {n}"
  with *View document*.
- `/advisor` Requests stays the consultations inbox, free and paid.
- Checkpoint Standard: accepted by the curator per checkpoint, in the checkpoint branch.

**Project agreement (share given or changed).** The member's Team page shows a
warning-tint banner with *Review*: "You were given a share — review and accept." for a
first share, "Shares changed — review and accept. Your {old} stays in force until you do."
for a change. The table shows old → new share ("—" when there was none) and each member's
agreement status. *Review* opens the modal: an outlined block (tile, "Co-Development
Agreement · v1", Project, Your share old → new), the clickwrap, *Not now* / *Accept*; its
title is "You were given a share" or "Shares changed". The author sees the same table with
"Pending · {n} days" and a banner counting who has not accepted.

**My documents** (`/user/settings/documents`, settings shell): card *Accepted documents*
(document — with project/checkpoint under it where linked —, version, accepted, context,
*Open* → the exact text: `/legal/<slug>/v<n>`, or the filled project agreement) and card
*Certificates* (title, source `Tag`: Event / Course / Checkpoint, number, issued, *Verify*).

**/verify.** The existing result page hardcoded "EVENT" and "digitally signed". The source
card label and fields follow the source (Event: organizer, mentor; Course: teacher;
Checkpoint: curator); the banner says "digitally signed" and the file "Signed PDF" only for
signed (event) certificates.

**/legal.** Index (Platform: Terms, Privacy, Cookie, Refund, Legal Details; Features:
Project Requirements, Advisor Agreement, Expert Services Terms, Checkpoint Terms,
Checkpoint Standard, Withdrawal Waiver), document page, archived page.

**Admin.** One page "Legal acceptances", no tabs: search by user, document, version
(disabled until a document is chosen), context, date range, *Export CSV* (→ `AuditLog`).
Columns: User · Document · Checkpoint / Project ("—" otherwise) · Accepted (UTC) · IP ·
User-agent · Checksum (copy) · Context.

---

## 5. States

- **Clickwrap**: error (unticked on submit); *text updated* (server refused an outdated
  version → unticks, `--gd-warning-on-tint` message). The submit button is never disabled
  by the checkbox.
- **Terms prompt**: default; error per unticked document. While submitting, the button shows
  antd `loading`; a refused outdated version re-fetches the list and unticks (*text updated*).
- **Paid work**: not set up (switches locked); error (field + clickwrap errors); set up.
- **Project agreement**: first share or change; until accepted the previous share ("—" for
  none) is in force everywhere; *Not now* keeps the banner.
- **Lists** (My documents, admin): loading skeleton rows; empty = one line of secondary text
  ("No certificates yet."); error = danger tile, title, *Try again*.
- **Public**: 404 for unknown slug or version; old URLs 308 to `/legal/<slug>`.

---

## 6. Copy (Tolgee keys, new or changed)

| Key | English |
|---|---|
| `legal.clickwrap.<code>.label` | I accept the `<doc>{title}</doc>` (Terms at sign-up adds "and have read the `<privacy>Privacy Policy</privacy>`") |
| `legal.clickwrap.<code>.error` | You need to accept the {title} to continue · …to create a project · …to turn on the advisor space · …to get paid |
| `legal.clickwrap.stale` | The {title} were updated. Please read and accept the current version. |
| `legal.clickwrap.version` | v{version} · {date} |
| `legal.update.first.title` | Please accept our terms |
| `legal.update.first.body` | We now record which version of our terms you accepted. Nothing changes for you. |
| `legal.update.changed.title` | We updated our terms |
| `legal.update.changed.body` | See what changed and confirm to continue. |
| `legal.update.accept` | Accept and continue |
| `legal.update.sign-out` | Sign out |
| `legal.clickwrap.co-development.share-change` | I accept the `<doc>Co-Development Agreement</doc>` with the new shares |
| `advisor.settings.paid-work.title` | Paid work |
| `advisor.settings.paid-work.expert-services` | Expert Services |
| `advisor.settings.paid-work.account-holder` / `.account` / `.invoicing` | Account holder / IBAN or account number / Invoicing |
| `advisor.settings.paid-work.invoicing.*` | Self-employed · Company · I accept self-billing |
| `advisor.settings.paid-work.account.error` | Enter a full IBAN or account number |
| `advisor.settings.paid-work.terms-accepted` | Accepted on {date} · version {version} |
| `advisor.settings.paid-work.consultations` / `.price` | Paid consultations / Price per consultation |
| `advisor.settings.paid-work.curation` / `.stages` | Curation / Stages you curate |
| `advisor.settings.paid-work.locked` | Set up Expert Services first *(tooltip)* |
| `legal.co-development.title` / `.project` / `.your-share` | Co-Development Agreement / Project / Your share |
| `project.team.share-given.member` / `.title` | You were given a share — review and accept. / You were given a share |
| `project.team.shares-changed.member` / `.title` | Shares changed — review and accept. Your {share} stays in force until you do. / Shares changed |
| `project.team.shares-changed.author` | {count, plural, one {# member has} other {# members have}} not accepted the new shares yet. |
| `project.team.shares-changed.review` / `.not-now` / `.accept` | Review / Not now / Accept |
| `profile.documents.title` / `.accepted` / `.certificates` | Documents / Accepted documents / Certificates |
| `profile.documents.open` / `.verify` / `.empty-certificates` | Open / Verify / No certificates yet. |
| `profile.documents.error` | Your documents could not be loaded |
| `verify.source.event` / `.course` / `.checkpoint` | EVENT / COURSE / CHECKPOINT |
| `admin.legal.title` | Legal acceptances |
| `admin.legal.acceptances.column.linked` | CHECKPOINT / PROJECT |
| `admin.legal.acceptances.context.*` | Sign-up · Project create · Advisor switch-on · Expert services on · Share change · Checkpoint purchase · Curator accept · Re-acceptance |

Document titles and "what changed" lines come from the registry; bodies are the markdown files.

---

## 7. Data needs

1. Registry and entity config (in code), including per version up to three "what changed"
   lines.
2. Submit an acceptance inside the gated action (registration, project create, mentorship
   on, paid work save, share accept, prompt *Accept and continue*): `{ code, version }` (+
   `projectId`/`params`, `checkpointId`); refuse an outdated version and the action without
   it.
3. Terms prompt: for the signed-in user, the documents they are bound by whose version in
   effect they have not accepted, with "first time" (never accepted any version) vs
   "updated".
4. Paid work: payout details (holder, account, invoicing status) stored on the advisor
   profile; price per consultation; curation stages.
5. Project agreement: per member, the share in force (or none) and the pending one with its
   date.
6. My documents: the user's acceptances (with linked project/checkpoint) and certificates
   (title, source, number, issued).
7. Certificates: `Certificate` with source and number; `/verify` reads the source.
8. Admin: acceptances with filters, pagination, CSV.

---

## 8. Open questions

1. **Free curation** — assumed none: curation always needs the Expert Services Terms.
2. **Price currency and stages list** — EUR and the existing checkpoint stages assumed.
3. **Prompt trigger** — assumed after a material version takes effect and for the one-time
   "first time" migration; a non-material version asks nothing.
4. **Footer** should link to `/legal`; `Main Footer` not edited.
5. **Locales** — only `en`; file paths have no locale yet.
