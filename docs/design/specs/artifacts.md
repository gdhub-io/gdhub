# Artifacts — handoff

The project's Artifacts tab, `/user/project/[slug]/artifacts`. Linear: GDHUB-64.

An artifact is something the project produced. It belongs to the project, not to
any feature that reads it: checkpoints use artifacts as evidence, and other
features may too, but nothing here knows about them.

## Frames

In [platform-design.pen](../platform-design.pen):

| Frame | What it is | Built as |
|---|---|---|
| `R7JKH` | The list | `ArtifactsView` |
| `V3HRXh` | Empty (`eEvzk`), loading, error | `ArtifactsView`, by `status` |
| `ZKHiF` | Add artifact | `CreateArtifactModal` |
| `OU183` | Space header with the tab | `ProjectSpace`, unchanged |

## Code

- `src/components/MyProjectArtifacts/` — `index.tsx` fetches, `ArtifactsView.tsx`
  draws, `artifacts.ts` holds the kind map, the sort and the grouping,
  `labels.tsx` the kind and type names.
- `src/components/modals/CreateArtifactModal/`
- `src/app/api/user/project/artifacts/` — the list carries each artifact's stage;
  a new artifact is filed under the stage the project is on.

## Kind and type

The schema has one field, `ProjectArtifact.type`, with nine values. The page
talks in five kinds, derived from it in `artifacts.ts`:

| Kind | Types |
|---|---|
| Video | `PrototypeVideo`, `GameplayVideo` |
| Document | `Concept`, `GDD`, `JDA`, `NDA` |
| Image | `Art` |
| Build | `ExecutableBuild` |
| Other | `Other` |

The form asks for the kind, then for the type when the kind has more than one.
`tests/artifacts.test.ts` holds the form and the filter to the same map.

## Where the code departs from the frames

- **The table is an outlined panel, not a white card.** Asked for after the
  first build. Head and row hairlines use `--gd-color-border` and the stage band
  `--gd-neutral-100`, because the lighter tokens are the page colour.
- **No checkpoint sub-heads, no curator, no stage verdict chip.** Artifacts do
  not know about checkpoints. The column is `Workflow`, not `Stage · Checkpoint`.
- **No file drop in the modal.** There is no storage for uploads; an artifact is
  a link. The `preferred` hint next to Link went with it.
- **A `Type` select under `Kind`**, for Video and Document — the schema needs it.
- **No failure strip and no `Replace the link`.** Nothing writes `checkStatus`
  yet (GDHUB-56), so the Check column shows `—`. The four results render when
  the value is there.
- **A delete button at the end of each row.** Not drawn; it existed before and
  stays, for whoever holds `project.artifacts.manage`.
- **Empty follows `eEvzk`**: a 56 tile (`IconBlocks`, the icon for an artifact of any kind) and one line of 14 regular secondary text
  in an outlined panel, no buttons — the page head already carries
  `Add artifact`. It is laid out here rather than through `EmptyState`, whose
  title is 16/600. A filter or search with no result says `No artifacts match`
  the same way, inside the table.
- **Error uses `EmptyState` as it is** — a 16/600 title where the frame draws
  14 regular.
- **Loading is skeleton rows**, without the stage bands the frame shows: one
  request returns bands and rows together.
- **Grouping and paging happen in the browser**, 25 a page. The API returns the
  whole list, as it did.
- Below `lg` the table drops *Added by* and *When*.
