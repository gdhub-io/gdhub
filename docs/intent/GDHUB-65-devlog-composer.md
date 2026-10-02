# GDHUB-65 — Devlog composer

[Linear](https://linear.app/gdhub/issue/GDHUB-65) · intent written 2026-10-02

## Want

An author who presses "Add post" on their project's devlog gets a composer, not
a form: their own face and name, the project and the stage the post will be
filed under, and an empty page to write on. What can be inserted — an image, a
video, a heading, a list, a quote — sits in one row under the text, next to
Cancel and Post.

## Why now

The modal is a bare EditorJS in a default antd dialog: no word on who is posting
or where, and every block type is hidden behind the editor's own "+", which
nobody finds. It is the one screen an author is asked to come back to every
week.

## Constraints

- GDHub design system only. The reference (a Substack-style note composer)
  supplies the layout, not the looks.
- Frames first: `IDeWH`, `X0HR8`, `pGE34` in `docs/design/platform-design.pen`.
- EditorJS and its block set stay. Saved posts keep their `contentEditor` shape,
  and `/api/user/project/report` keeps its contract.
- The toolbar offers only what the editor can already do.

## Done when

- [ ] The modal shows the author's avatar and name, and under it the project
      name and the stage — the project's current one for a new post, the post's
      own for an existing one.
- [ ] Each toolbar button inserts its block at the caret; on an empty paragraph
      it replaces it. "More" holds checklist, table, delimiter and link.
- [ ] Image opens the file picker and inserts the uploaded picture. Video takes
      a link and refuses one no embed service recognises.
- [ ] Post is disabled while the post is empty and says why on hover.
- [ ] Editing shows a skeleton until the post has loaded, and the button reads
      Save.
- [ ] A button in the head takes the composer full screen and back. Full screen
      keeps the text at the width of the public post page, and the toolbar and
      Post stay at the bottom of the screen however long the post is.
- [ ] On a phone the composer is the whole screen, with a close button in place
      of Cancel.
- [ ] A quote reads as a quote — a bar, the text, its caption — not as two
      boxed inputs.

## Out of scope

- Drafts and scheduled posts: `ProjectReport.publishedAt` is required, there is
  no draft status, and the feeds do not hide a future-dated post.
- Checkpoint and day in the context line — checkpoints are not in the app on
  `dev`; that part lands with GDHUB-31.
- Emoji and polls.
- The feed and the public post page.

## Open questions

- The old wall (`DevLogWall`, its `PostForm`, `EditPostModal`) was asked to move
  onto the composer. Nothing imports it, so it is deleted instead.
- `PUT` and `DELETE` on `/api/user/project/report` do not check that the caller
  owns the post. Assumed: a separate issue, not fixed here.
