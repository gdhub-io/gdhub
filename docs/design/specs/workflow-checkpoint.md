# Workflow page — checkpoint widget and checkpoint tasks

Frames in `docs/design/platform-design.pen`, page `IUy75` ("Project — Workflow"),
right column `j2p5MJ`.

## Widget — `TfVJG`

`src/components/checkpoints/CheckpointWidget/index.tsx`. The one white block in
the column (`--gd-color-surface`, 1px `--gd-color-border`, radius 12, padding 16);
the task list under it is outline-only. States:

| State | Frame | Code |
|---|---|---|
| None | `kSXbn` | "Plan a checkpoint" — `CheckpointOffer` |
| Draft | `jnZ3d` | "Continue preparing" |
| Waiting for the curator | `l3dPO` | `CuratorBadge` |
| Active | `TfVJG` | day chip, current sprint dates |
| Active · next call | `oDDJm` | a call line under the title |
| Awaiting verdict | `OKro2` | "The curator writes it by …" (day 30) |
| Loading | `YOhx7` | antd `Skeleton` |

An error hides the widget: it is secondary to the task list.

## Checkpoint tasks — `m11cX`, `G2bg4o`

`useCheckpointTasks` puts the running checkpoint's tasks at the top of the stage
list (`WorkflowTasksPanel`), because they carry a deadline:

- the sprint's devlog while it is owed — `authorNextStep` in
  `src/lib/checkpoints/plan.ts`, due on the devlog day, "Overdue since …" (danger
  dot) until the next call;
- every outcome the author promised ("What must exist by day 28"), due day 28,
  done once an artifact is attached; cut outcomes are left out.

They wear a "Checkpoint" chip instead of Required/Optional and are not counted
in "N of M required" — the stage gate is the stage's own tasks.

## Departures from the frames

- `ViewAllLink` "Open checkpoint" sits in the card foot, not its header: at 380
  the tile, the title and a header link do not fit (ui-guidelines rule 6).
- Chips in the task list use `--gd-neutral-100`, not the theme's sunken fill,
  which vanishes on an outlined panel (ui-guidelines rule 1).
