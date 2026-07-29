/**
 * Markdown fixtures for Storybook.
 *
 * They cover every construct the app renders through react-markdown: inline and
 * block images, lists, raw HTML (enabled via `rehype-raw`) and GFM tables (only
 * the event views pass `remark-gfm`, elsewhere a table stays plain text).
 */

/** Full showcase — use it to eyeball a react-markdown upgrade. */
export const MARKDOWN_SHOWCASE = `## Prototype build is live

We shipped the **first playable** and it already _feels_ like a game.

- Core loop: scout, craft, defend
- 12 enemy archetypes
- Co-op lobby (experimental)

1. Download the build
2. Play the tutorial
3. Send feedback

An inline image ![sprite](/images/empty-projects.svg) sits inside this sentence.

![Level overview](/images/new-project.png)

> Playtesters called the night phase "genuinely tense".

Details are in the [devlog](https://gdhub.io), the build script is \`bun run dev\`.

| Platform | Status |
| --- | --- |
| PC | Alpha |
| Steam Deck | Verified |

<div style="padding:8px;border:1px solid #d9d9d9;border-radius:8px">
Raw HTML block, rendered because <code>rehype-raw</code> is enabled.
</div>
`;

/** Short paragraph with emphasis and a link — the common description case. */
export const MARKDOWN_SHORT = `A **turn-based tactics** roguelite about salvaging a dead colony ship.
Every run rewrites the deck of rooms you fight through — see the [pitch](https://gdhub.io).`;

/** Raw HTML mixed into markdown, the reason `rehype-raw` is in the pipeline. */
export const MARKDOWN_INLINE_HTML = `Schedule note: <b>doors open 30 minutes earlier</b>.
<br />Bring a laptop — <u>the workshop is hands-on</u>.`;

/** Image-only content — checks the custom \`img\` renderers. */
export const MARKDOWN_IMAGES = `Block image below:

![Team photo](/images/team/team-member-1.png)

And an inline one ![icon](/images/empty-projects.svg) inside a line of text.`;
