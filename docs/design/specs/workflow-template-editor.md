# Workflow template editor — goals and stage text (GDHUB-97)

Intent: [docs/intent/GDHUB-97-workflow-content-off-notion.md](../../intent/GDHUB-97-workflow-content-off-notion.md) ·
logic: [docs/workflow-step-content-flow.d2](../../workflow-step-content-flow.d2) ·
code: `src/components/admin/workflow/TemplateEditor.tsx`,
`src/components/admin/WorkflowEditor/WorkflowSettingsModal`,
`src/components/admin/workflow/ProjectWorkflowEditor.tsx`,
`src/components/admin/workflow/ResetWorkflowModal`.

## 1. Problem & user

A super admin edits a workflow template in `/admin/workflow/[id]`. Until now a
step's "Description" held only a Notion path (`notion::gamelab-pipeline.ideation`);
the text authors read lived in Notion and the goals the AI curator judges against
lived in code. The admin now writes both where the step is: the **goal** (plain
text, read only by the AI curator) and the **stage text** (Editor.js, what the
author reads). The template gets a **workflow goal** in its Settings. The goal sits
right above the text so one is in view while the other is edited.

A project may differ from its template: in `/admin/project-workflow/[id]` the
admin can give one stage of one project its own goal or its own text, see at a
glance which fields are the project's own, and send them back to the
template's (see **Project overrides** below).

## 2. Frames

All in `docs/design/platform-design.pen`, row `10 · Admin — Workflows`.

| Frame | Node id | What it shows |
|---|---|---|
| 10.09 · Admin — Workflow editor (`/admin/workflow/[id]`) | `c1edm` | Reworked in place. Step 1 renamed "Ideation" and selected; its detail card shows **Goal** (`rr9n1`) and **Stage text** (`ouuf4`, editor `QlUoL`) filled, with the Editor.js "+" toolbar on an empty last line (`EA7KU`). The Description field is gone. |
| 10.09.2 · Admin — Workflow editor · step with no goal and no stage text | `YdiOW` (card `XWYcs`) | New, card only. Step 3 "Vertical slice": goal placeholder, empty editor with its placeholder and "+" toolbar, no tasks. Valid, no error. |
| 10.10.1 · Modal — Workflow settings | `cA3GF` | Reworked in place: **Workflow goal** field (`IDVke`) added after Description. |
| 10.09.1 · Admin — Project workflow editor (`/admin/project-workflow/[id]`) | `Kolrt` | Reworked in place. Expanded step "Prototype" (`CUohP`): **Goal overridden** (`MkuPY`), **Stage text inherited** (`pP6T6`), both in `fields` (`XUv4B`). Header tag now "4 local changes"; the template card's Local changes list gains two lines (`Gb6Cd`, `POEH3`). |
| 10.09.3 · Admin — Project workflow editor · step with goal and stage text from the template | `E9CoNX` (card `u2jP1J`) | New, card only. Step 3 "Vertical slice" with both fields inherited (goal `koBzg`). |
| 10.12 · Modal — Reset project workflow to template | `MxMNC` | Reworked in place: the "What will change" preview lists the overridden fields (`ocuuQ`, `vnSsl`). |

Canvas notes: 10.09 grew from 873 to 1506 high, so 10.09.1 (`Kolrt`) moved out
of its column; it now sits at the right end of row 10 (6750, 47797), with 10.09.3
under it. The original position had no room once 10.09.1 grew too.

## 3. Layout

Template editor: unchanged shell — header, admin menu, breadcrumb, page header
(title, Settings, Save), info alert, then the two panes (rail 320 · detail card
fill). Inside the detail card body, in this order:

1. **Goal** — label, textarea, helper.
2. **Stage text** — label, Editor.js, helper.
3. **Tasks** — unchanged.

The editor grows with its content (no inner scroll); the page scrolls. Editor
blocks sit 52 in from the editor's left edge, the gutter where Editor.js draws
its "+" toolbox and block tunes.

Settings modal body order: Workflow title · System name · Description (optional) ·
**Workflow goal (optional)**.

Project workflow editor: unchanged shell (progress card, collapsible step
panels, template card at the foot). Inside an expanded step panel: **Goal**,
**Stage text**, then the task rows. The two fields sit in one group with 20
between them and 8 extra below, so the tasks read as a separate block.

## 4. Components

| Block | Source |
|---|---|
| Goal field | antd `Form.Item` (label "Goal", `extra` = helper) + `Input.TextArea` `autoSize={{ minRows: 2, maxRows: 3 }}`, filled variant. Replaces the current `Description` `Form.Item`. |
| Stage text field | antd `Form.Item` (label "Stage text", `extra` = helper) wrapping an Editor.js instance with the admin blog editor's tools — `src/components/admin/BlogPostEditor/tools.ts` (paragraph, header, list, image via `/api/file` → Sanity, embed for video). Reuse the blog editor's wrapper; if it is not separable, extract it to `src/components/admin/EditorJsField/` (new) and use it from both editors. |
| Editor "+" toolbox and tunes | Editor.js's own; canvas stand-ins: lucide `plus` → Tabler `IconPlus`, lucide `grip-vertical` → `IconGripVertical`. No custom toolbar. |
| Workflow goal | antd `Form.Item` + `Input.TextArea` `autoSize={{ minRows: 2, maxRows: 3 }}` in `WorkflowSettingsModal`, `extra` = helper, label suffix "(optional)" like Description. |
| Empty tasks | plain secondary `Typography.Text` "No tasks yet." above the dashed "Add task to this step" button (no `EmptyState`, per the plain-empty rule for lists inside a card). |
| Inherited value (project) | Read-only, not a disabled input: goal as `Typography.Paragraph type="secondary"`, stage text through the shared `editorjsRenderers` (the author's renderer), both in a filled box. New component `src/components/admin/workflow/InheritedField/` holding the box, the "From the template" line and the action. |
| Override marker | `<StatusDot>` (warning tone) + "Differs from template", from `src/components/ui`. |
| Actions | antd `Button type="link" size="small"`: "Write this project's own" with `IconPencil`; "Use the template's" with `IconArrowBackUp` (canvas lucide `undo-2`). "From the template" line icon: `IconTemplate` (canvas lucide `layout-template`). |

## 5. Tokens

- Labels: 14 regular `--gd-color-text`; helpers: 14 `--gd-color-text-secondary`;
  placeholders: `--gd-color-text-tertiary`.
- Textarea: the theme's filled input (canvas `$page-bg`), control radius
  (canvas `$radius-sm`), padding `--gd-space-3`.
- Editor box: transparent, 1px `--gd-color-border`, control radius, padding
  `--gd-space-4` top/bottom and `--gd-space-6` right; block gap `--gd-space-3`;
  list item gap `--gd-space-1`; min height 160.
- Editor type: heading 20/600 (lh 1.3), paragraph and list 16/400 (lh 1.5),
  caption 13 `--gd-color-text-secondary` — the blog/devlog editor's look.
- Image block: control radius, Sanity image, caption `--gd-space-2` under it.
- Inside a field: `--gd-space-2` between label, control and helper. Between
  fields: antd `Form.Item`'s own margin from the theme — do not set one.
- Inherited box: the same filled-input fill, control radius, padding
  `--gd-space-3` (goal) / `--gd-space-4` `--gd-space-6` (text); all text in it
  `--gd-color-text-secondary`, rendered text at 14 (heading 16/600).
- "From the template" line: 13 `--gd-color-text-secondary`, icon 14
  `--gd-color-text-tertiary`. Link actions: `--gd-color-link`.
- Local-change sign for an own value: `--gd-neutral-100` fill, `--gd-color-text-secondary` glyph.

## 6. States

- **Filled** (10.09): goal text and Editor.js blocks as saved.
- **Empty** (10.09.2): goal shows its placeholder; the editor shows one empty
  paragraph with placeholder "Write the stage text…" and the "+" toolbox. Saving
  is allowed — empty goal and empty text are valid, no validation message. An
  empty editor saves as no `content` (or an empty blocks array — the reader must
  treat both as "no text").
- **Loading**: unchanged — the whole editor is the existing `Skeleton` until the
  template loads. While Editor.js mounts, the box keeps its min height (160) so
  the tasks below do not jump.
- **Image upload failed**: the Editor.js image tool's own error inside the block;
  the rest of the form is unaffected.
- **Save error**: the existing error path; "Unsaved changes" stays on.
- **Permission denied**: unchanged — `/admin` is super-admin only.
- Switching step in the rail keeps the previous step's unsaved edits (as names
  and tasks already do); goal and text edits turn the "Unsaved changes" dot on.

## 7. Project overrides (`/admin/project-workflow/[id]`)

Each expanded step shows Goal and Stage text, each in one of two states.

**Inherited** (default; 10.09.3 both fields, 10.09.1 stage text):
- Label on the left, "Write this project's own" link button on the right.
- The template's value read-only in a filled box, greyed (secondary text). The
  stage text is rendered, not editable — the author's view of it.
- Under it: `IconTemplate` + "From the template · {template title}".
- Helper line as in the template editor.
- If the template step has no value: the box shows "The template has no goal
  for this stage." / "The template has no text for this stage." in tertiary;
  the action stays.

**Overridden** (10.09.1 goal):
- Label, then `StatusDot` warning + "Differs from template"; "Use the
  template's" link button on the right.
- Editable: `Input.TextArea` for the goal, the Editor.js field for the text.
- "Write this project's own" switches to this state prefilled with the
  template's value (deep copy of the blocks for the text) and marks the page
  dirty; nothing is stored until Save.
- "Use the template's" clears the project's value (sets it to null) and goes
  back to Inherited, no confirm — Save is the commit and the page shows
  "Unsaved changes". After Save, the overridden field counts as one local change.
- An override that is emptied by hand stays an override with an empty value
  only if the admin saves it so — open question below; designed default: an
  empty own value is treated as "use the template's" on save.

Local changes:
- Header tag counts each overridden field: 10.09.1 shows "4 local changes"
  (2 structural + own goal on Prototype + own text on Release).
- Template card list lines: "“Prototype” has its own goal", "“Release” has its
  own stage text", sign "≠" on a neutral square.

Reset modal (10.12): the "What will change" preview adds one line per
overridden field, sign "↺": "“Prototype”: own goal → template's",
"“Release”: own stage text → template's". Every reset mode clears them (intent:
a reset clears both), so the lines appear in each mode.

## 8. Copy (Tolgee keys)

The admin editors currently hardcode English; if they move to Tolgee, suggested keys:

| Key | English |
|---|---|
| `admin.workflow.step.goal.label` | Goal |
| `admin.workflow.step.goal.placeholder` | The result this stage must leave the project at, in one or two sentences |
| `admin.workflow.step.goal.help` | For the AI curator — the author never sees it. |
| `admin.workflow.step.content.label` | Stage text |
| `admin.workflow.step.content.placeholder` | Write the stage text… |
| `admin.workflow.step.content.help` | What the author reads when they open the stage. |
| `admin.workflow.settings.goal.label` | Workflow goal |
| `admin.workflow.settings.goal.help` | For the AI curator: where every stage leads. |
| `admin.workflow.step.tasks.empty` | No tasks yet. |
| `admin.projectWorkflow.field.fromTemplate` | From the template · {template} |
| `admin.projectWorkflow.field.override` | Write this project's own |
| `admin.projectWorkflow.field.useTemplate` | Use the template's |
| `admin.projectWorkflow.field.differs` | Differs from template |
| `admin.projectWorkflow.field.templateNoGoal` | The template has no goal for this stage. |
| `admin.projectWorkflow.field.templateNoContent` | The template has no text for this stage. |
| `admin.projectWorkflow.change.ownGoal` | “{step}” has its own goal |
| `admin.projectWorkflow.change.ownContent` | “{step}” has its own stage text |
| `admin.workflow.reset.preview.ownGoal` | “{step}”: own goal → template's |
| `admin.workflow.reset.preview.ownContent` | “{step}”: own stage text → template's |

Sample content drawn (not product copy): goal "One idea is chosen and defended:
what the game is, who it is for and why this idea over the others."; workflow
goal "The game is released and people play it."; Prototype's own goal "A build
anyone on the team can download and play end to end, tried by five players,
with what they did written down."

## 9. Data needs

- Read the template with, per step: `name`, `tasks`, `goal` (string, optional),
  `content` (Editor.js output, optional); and the template's `goal` (string,
  optional) alongside `name`, `title`, `description`.
- Save: the same single PUT for the whole template, now carrying each step's
  `goal` and `content` and the template's `goal`. The empty-steps guard stays.
- Image upload inside the editor: the existing `/api/file` upload the blog
  editor uses.
- The old step `description` is no longer shown or written by this screen.
- Project editor read: per project step its own `goal` and `content` (nullable)
  and the matching template step's `goal` and `content` (matched as the reader
  matches: by name, then position), plus the template title for the "From the
  template" line. `localChanges` includes one entry per non-null own field,
  with the step name and which field.
- Project editor save: the existing PUT, per step `goal` and `content` — null
  for inherited.
- Reset preview: the overridden fields of the project, by step and field.

## 10. Open questions

- The drawn template is the fictional "Indie game launch"; step 1 was renamed
  from "Concept" to "Ideation" (and its three tasks re-worded) so the sample
  stage text fits. The frames' older styling (blue selection, literal colours)
  was left as it was — restyling is not part of this change.
- "Differs from template" is drawn as a StatusDot and a word, not a Tag: it is a
  state, and the UI guidelines reserve chips for labels. The existing "Not in
  template" / "Custom step" tags are the same kind of state; they were left
  untouched.
- An own value cleared to empty: treated as "use the template's" on save
  (assumed). If a project must be able to say "no text here" against a
  template that has one, the field needs an explicit empty override.
- Collapsed step headers show no override marker; the local-changes list and
  the header count carry it. Add a dot to the panel header if admins miss it.
- 10.12.1 (full reset selected) was not changed; its preview should carry the
  same lines in code.
- Goal length: no counter or limit drawn; one or two sentences is guidance. If a
  limit is wanted, add the grey counter suffix to the label.
- Whether a step `description` that is not a `notion::…` path should be shown
  anywhere during migration — assumed not (intent, open question).
- No author-view preview of the stage text in the template editor; the existing
  "Preview" button in the page header is assumed to cover it.
