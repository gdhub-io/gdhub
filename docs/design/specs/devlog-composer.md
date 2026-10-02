# Devlog composer — handoff

The modal that writes and edits a devlog post, opened from
`/user/project/[slug]/devlog`. Linear: GDHUB-65. Intent:
[GDHUB-65-devlog-composer.md](../../intent/GDHUB-65-devlog-composer.md).

## Frames

In [platform-design.pen](../platform-design.pen):

| Frame | What it is | Story |
|---|---|---|
| `IDeWH` | New post, empty — Post disabled | `Empty` |
| `X0HR8` | With content: heading, paragraph, list, quote | `WithContent` |
| `pGE34` | Editing, the post still loading | `EditLoading` |
| `Hxjri` | Full screen | `FullScreen` |
| `Awrms` | Phone | `Mobile` |

## Code

`src/components/modals/DevLogPostModal/`:

- `index.tsx` — loads the post being edited, saves, and names the author and the
  context line.
- `ComposerView.tsx` — the dialog itself; what the stories render.
- `ComposerToolbar.tsx` — the insert tools.
- `DevLogPostEditor/` — EditorJS, its tools, and `blocks.ts`: where a block is
  inserted and how a video link becomes an embed.

## Rules the frames do not show

- **Context line.** Project, then stage: the project's current stage for a new
  post, the stage the post was filed under for an existing one. A checkpoint
  joins the line when a checkpoint opens the composer (GDHUB-31).
- **Where a block lands.** In place of the block the caret is in when that block
  is empty, after it when it is not, and at the end when the editor never had
  the caret.
- **Text column.** The text starts under the author's name; the 52 gutter on its
  left holds EditorJS's own "+" and block handle. Full screen keeps the text at
  800, the width of the public post page, so a long post is written at the width
  it is read at.
- **The foot never scrolls away.** Only the text scrolls — in the dialog, full
  screen and on a phone.
- **Phone** (below 768): always the whole screen, no gutter, a close button in
  place of the full-screen toggle, and no Cancel in the foot.
- **Post is disabled while the post is empty**, with the reason in a tooltip.
- **Video** takes a link in a popover and accepts whatever the embed tool knows;
  anything else is refused with a message.

## Where the code departs from the frames

- The toolbar's "more" opens a menu (checklist, table, divider, link preview)
  that no frame draws.
- Video and "more" carry a native `title`, not a tooltip: a tooltip would cover
  the popover and the menu they open.
- Saving has no frame: the primary button spins. A failed save is a toast.
- Quote is restyled only in the editor. The public post page still draws its own
  blockquote.

## Not built

Drafts, scheduled posts, emoji and polls — see the intent.

## The devlog page around it

Built on the same branch; the page is `/user/project/[slug]/devlog`.

- **Table** — `DS · 11 Tables` (`oAIFm`), the "on the page" variant, through
  `ModernTable surface="page"`. One leading cell (cover thumbnail and the first
  line), then Views and Applause as right-aligned numbers, then Published.
  Applause is read-only. Row hover is `neutral-100`, not the frame's
  `surface-sunken`: that one is the page colour.
- **Row actions** — "Go to page" as a button, a share button, and a "…" menu with
  Edit and Delete.
- **Share** — frame `j88gi`, `src/components/ShareModal`. It shows the card a
  link to the post unfolds into, and a button per network (LinkedIn, Telegram,
  X, Facebook) that opens that network's own post form with the link in it; the
  author posts from their own account. Nothing is sent by GDHub. Copy link sits
  in the card.
- **One OG card** — the public post page now serves the branded card the admin
  announce posts (`devlogOgImage`), so a link shared by hand looks the same.
  It used to serve the post's bare cover.

## Devlog numbers

A post is "Devlog #15" of its project. The number lives in the database
(`ProjectReport.number`, gdhub-prisma 2.0.0-beta.60): given by
`prisma.projectReport.createNumbered` as one past the highest number the project
still has, and kept through edits. Deleting the newest devlog gives its number
back; deleting an older one leaves a gap. System posts have none. Existing posts
were numbered by the migration in publishing order.

Where it shows:

- the composer's context line — the number a new post will take, or the post's
  own when editing;
- the table's leading cell, as the name over the excerpt; the name opens the
  post for editing;
- the hub and project feeds and the landing's recent devlogs, after the project
  name;
- the public post page: its header, `<title>` and OG title;
- the OG card, the share text and the admin announce messages, as
  "Project — Devlog #15".

In the interface the label is the Tolgee key `devlog.numbered`
(`useDevlogName`); what leaves the site is plain English (`devlogTitle` in
`src/helpers/devlog.ts`).
