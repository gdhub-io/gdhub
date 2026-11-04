# GDHUB-97 — Workflow step content and goals in the workflow template, off Notion

[Linear](https://linear.app/gdhub/issue/GDHUB-97) · intent written 2026-11-03

## Want

An author opening a stage of their workflow reads its text from GDHub itself, and
an administrator changes that text in `/admin` without leaving GDHub — no Notion
account, no Notion page, no waiting on Notion's API. The goal of each stage and the
goal of the workflow as a whole live in the same template and are edited in the
same place, so the AI curator judges a project against the goals its own workflow
states.

## Why now

Notion was a stopgap (decided 2026-10-17). After GDHUB-54 moved the legal pages
into the repo, workflow stage text is the last thing read from Notion: every time
a stage opens, the page asks `/api/notion/page`, which asks Notion live. It is
slow, it fails silently when Notion is down or the token expires, the text can
only be changed by someone with Notion access, and Notion's image links expire.
The stage goals and the project goal sit in code (`CURATOR_STAGE_GOALS`,
`PROJECT_GOAL`), matched to a stage by its name: rename a stage and its goal
silently disappears from every curator read, and a second template could never
have goals of its own.

## Constraints

- **Where the text lives:** a new `content` field on each step of a workflow
  template — `WorkflowSchema.steps`, already a JSON column — holding Editor.js
  output, the format every other rich text on GDHub uses (devlogs, blog posts,
  events). Only the `PrismaJson.WorkflowStep` type changes in gdhub-prisma; no
  migration.
- **Goals in the template too.** Each template step gets a `goal` (one line,
  next to its `content`, same JSON); the template itself gets a `goal` column for
  the workflow's goal (`WorkflowSchema.goal`, one migration in gdhub-prisma).
  Both are plain text, not Editor.js, and only the AI curator reads them — the
  author never sees a goal. Both are edited in the same template form. The AI curator reads the stage goal
  and the workflow goal from the project's own template; `CURATOR_STAGE_GOALS`
  and `PROJECT_GOAL` leave the code, their texts moved into the Default template.
- **A project may differ from its template** (decided 2026-11-03), the way it
  already may in its steps and tasks: a project's step can hold its own goal and
  its own text (`ProjectWorkflowStep.goal`, `.content`, two nullable columns in
  gdhub-prisma). Empty means "as the template says" — the template's value is
  read, as for every project today. Edited in the project's workflow editor
  (`/admin/project-workflow/[id]`), where an overridden field is marked as
  differing from the template and counts among the project's local changes; a
  reset to the template clears both, and its preview says so. A project's own
  value is never written back into the template.
- **The curator's stage briefs and lens weights stay in code**
  (`CURATOR_STAGE_BRIEFS`, `CURATOR_LENS_WEIGHTS`): they are prompt settings,
  changed with the prompts and checked in the lab (decided 2026-11-03).
- **One text per template step, shared.** A project's stage reads the text from
  its template's step (matched by order), not from its own copy, so an edit in
  `/admin` reaches every project on that template at once.
- **English only**, as the platform is (decided with Dmitry, 2026-11-03). The
  Russian pages in Notion are not moved.
- **The existing template editor** (`/admin/workflow/[id]`) gains the field: an
  Editor.js editor with the admin blog editor's tools
  (`src/components/admin/BlogPostEditor/tools.ts`), images uploaded through
  `/api/file` (Sanity) as there. No new admin screen. Saving keeps its guard
  against an empty steps array.
- **Moving the text:** a one-off script exports the 9 stages of the Default
  template from Notion (`gamelab-pipeline` table, English) as Editor.js blocks and
  writes them into the template's steps. Images are re-uploaded to Sanity, because
  Notion's file links expire within the hour; videos become embed blocks by their
  own link.
- **Rendering** uses `editorjs-blocks-react-renderer` with the shared
  `editorjsRenderers`, as the blog and devlogs do.
- Nothing else in the step changes: name, title, tasks, conditions, order.

## Done when

- [ ] Opening any stage on a project's workflow path shows its text with no
      request to Notion.
- [ ] An administrator edits a stage's text in `/admin/workflow/[id]`, saves, and
      an author sees the new text on that stage at once — on a project created
      before the edit too.
- [ ] A stage whose template step has no text shows a plain empty line, not an
      error or an endless skeleton.
- [ ] The 9 Default stages read as they did in Notion: headings, lists, links,
      images and videos; no image link points at Notion.
- [ ] An administrator changes a stage's goal or the workflow's goal in
      `/admin/workflow/[id]`; the next AI curator read on a project with that
      template states the new goal.
- [ ] Renaming a stage in the template keeps its goal.
- [ ] In a project's workflow editor an administrator gives one stage its own
      goal and its own text: that project's author reads the project's text,
      its AI curator reads the project's goal; other projects on the template
      still read the template's. The field is marked as differing from the
      template, and the project shows one more local change.
- [ ] Clearing a project's own text or goal brings the template's back.
- [ ] Resetting the project to its template lists the overridden goal and text
      in the preview, and afterwards the project reads the template's again.
- [ ] `/api/notion/page`, `src/services/notion.ts`, `@notionhq/client`,
      `@9gustin/react-notion-render` and every `NOTION_*` variable are gone.

## How to check it on the platform

1. `/dev-signin` as an author with a project on the Default workflow → the
   project's Workflow path → open a past, the current and a next stage: each
   shows its text; the network tab shows no `/api/notion/page`.
2. As the super admin → `/admin/workflows` → the Default template → a stage:
   change a sentence, save. Back as the author, reload: the sentence changed.
3. Clear a stage's text in the editor and save: the author sees the stage with
   no text and no error.
4. `/admin/workflows` → a project's workflow → a stage: write its own text and
   goal, save. As that project's author the stage shows the project's text; on
   another project on the same template, the template's. Reset the project to
   its template: the preview names the two fields, and the stage shows the
   template's text again.
5. In the same editor change the Prototyping goal, then in `/dev/ai-curator`
   run a call on a checkpoint at Prototyping (or `bun run checkpoint:review`):
   the prompt (Sent tab) carries the new goal.

## Out of scope

- Russian (or any second language) stage text; translation of the content.
- Rewriting the stage texts themselves — they move as they are.
- Task descriptions, the AI curator's stage briefs (`CURATOR_STAGE_BRIEFS`) and
  the lens weights (`CURATOR_LENS_WEIGHTS`) — stay in code.
- Other templates than Default, unless they also point at Notion — then they move
  the same way.

## Open questions

- Whether any project's own step `description` carries custom text rather than
  the `notion::…` path. Assumed: none do; the export script reports any that do,
  and those are left as they are.
