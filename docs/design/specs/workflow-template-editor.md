# Workflow template editor — goals and stage text (GDHUB-97)

Intent: [docs/intent/GDHUB-97-workflow-content-off-notion.md](../../intent/GDHUB-97-workflow-content-off-notion.md) ·
logic: [docs/workflow-step-content-flow.d2](../../workflow-step-content-flow.d2) ·
code: `src/components/admin/workflow/TemplateEditor.tsx`,
`src/components/admin/WorkflowEditor/WorkflowSettingsModal`.

## 1. Problem & user

A super admin edits a workflow template in `/admin/workflow/[id]`. Until now a
step's "Description" held only a Notion path (`notion::gamelab-pipeline.ideation`);
the text authors read lived in Notion and the goals the AI curator judges against
lived in code. The admin now writes both where the step is: the **goal** (plain
text, read only by the AI curator) and the **stage text** (Editor.js, what the
author reads). The template gets a **workflow goal** in its Settings. The goal sits
right above the text so one is in view while the other is edited.

## 2. Frames

All in `docs/design/platform-design.pen`, row `10 · Admin — Workflows`.

| Frame | Node id | What it shows |
|---|---|---|
| 10.09 · Admin — Workflow editor (`/admin/workflow/[id]`) | `c1edm` | Reworked in place. Step 1 renamed "Ideation" and selected; its detail card shows **Goal** (`rr9n1`) and **Stage text** (`ouuf4`, editor `QlUoL`) filled, with the Editor.js "+" toolbar on an empty last line (`EA7KU`). The Description field is gone. |
| 10.09.2 · Admin — Workflow editor · step with no goal and no stage text | `YdiOW` (card `XWYcs`) | New, card only. Step 3 "Vertical slice": goal placeholder, empty editor with its placeholder and "+" toolbar, no tasks. Valid, no error. |
| 10.10.1 · Modal — Workflow settings | `cA3GF` | Reworked in place: **Workflow goal** field (`IDVke`) added after Description. |

Canvas note: 10.09 grew from 873 to 1506 high, so `10.09.1 · Project workflow
editor` (`Kolrt`) moved from (1560, 48750) to (3120, 49056), below the settings
modal. Nothing else moved.

## 3. Layout

Unchanged shell: header, admin menu, breadcrumb, page header (title, Settings,
Save), info alert, then the two panes (rail 320 · detail card fill). Inside the
detail card body, in this order:

1. **Goal** — label, textarea, helper.
2. **Stage text** — label, Editor.js, helper.
3. **Tasks** — unchanged.

The editor grows with its content (no inner scroll); the page scrolls. Editor
blocks sit 52 in from the editor's left edge, the gutter where Editor.js draws
its "+" toolbox and block tunes.

Settings modal body order: Workflow title · System name · Description (optional) ·
**Workflow goal (optional)**.

## 4. Components

| Block | Source |
|---|---|
| Goal field | antd `Form.Item` (label "Goal", `extra` = helper) + `Input.TextArea` `autoSize={{ minRows: 2, maxRows: 3 }}`, filled variant. Replaces the current `Description` `Form.Item`. |
| Stage text field | antd `Form.Item` (label "Stage text", `extra` = helper) wrapping an Editor.js instance with the admin blog editor's tools — `src/components/admin/BlogPostEditor/tools.ts` (paragraph, header, list, image via `/api/file` → Sanity, embed for video). Reuse the blog editor's wrapper; if it is not separable, extract it to `src/components/admin/EditorJsField/` (new) and use it from both. |
| Editor "+" toolbox and tunes | Editor.js's own; canvas stand-ins: lucide `plus` → Tabler `IconPlus`, lucide `grip-vertical` → `IconGripVertical`. No custom toolbar. |
| Workflow goal | antd `Form.Item` + `Input.TextArea` `autoSize={{ minRows: 2, maxRows: 3 }}` in `WorkflowSettingsModal`, `extra` = helper, label suffix "(optional)" like Description. |
| Empty tasks | plain secondary `Typography.Text` "No tasks yet." above the dashed "Add task to this step" button (no `EmptyState`, per the plain-empty rule for lists inside a card). |

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

## 7. Copy (Tolgee keys)

The admin editor currently hardcodes English; if it moves to Tolgee, suggested keys:

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

Sample content drawn (not product copy): goal "One idea is chosen and defended:
what the game is, who it is for and why this idea over the others."; workflow
goal "The game is released and people play it."

## 8. Data needs

- Read the template with, per step: `name`, `tasks`, `goal` (string, optional),
  `content` (Editor.js output, optional); and the template's `goal` (string,
  optional) alongside `name`, `title`, `description`.
- Save: the same single PUT for the whole template, now carrying each step's
  `goal` and `content` and the template's `goal`. The empty-steps guard stays.
- Image upload inside the editor: the existing `/api/file` upload the blog
  editor uses.
- The old step `description` is no longer shown or written by this screen.

## 9. Open questions

- The drawn template is the fictional "Indie game launch"; step 1 was renamed
  from "Concept" to "Ideation" (and its three tasks re-worded) so the sample
  stage text fits. The frame's older rail/selection styling was left as it was —
  restyling the rail is not part of this change.
- Goal length: no counter or limit drawn; one or two sentences is guidance. If a
  limit is wanted, add the grey counter suffix to the label.
- Whether a step `description` that is not a `notion::…` path should be shown
  anywhere during migration — assumed not (intent, open question).
- No author-view preview of the stage text; the existing "Preview" button in the
  page header is assumed to cover it.
