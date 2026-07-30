import type { Meta, StoryObj } from "@storybook/nextjs";
import {
	MARKDOWN_IMAGES,
	MARKDOWN_INLINE_HTML,
	MARKDOWN_SHOWCASE,
} from "@/mocks/markdown";
import { DevlogPostClient, type Post } from "./DevlogPostClient";

const basePost: Post = {
	id: "post-1",
	title: "Prototype build is live",
	content: MARKDOWN_SHOWCASE,
	coverImage: "/images/new-project.png",
	createdAt: "2026-07-20T09:00:00.000Z",
	applauseCount: 42,
	viewsCount: 1280,
	author: {
		name: "Dima Ivanou",
		image: "/images/team/team-member-1.png",
	},
	project: {
		name: "Mythscape",
		slug: "mythscape",
		coverImage: "/images/new-project.png",
	},
	pageCover: "/images/new-project.png",
	previousPost: { id: "post-0" },
	nextPost: { id: "post-2" },
};

/**
 * Devlog post page. `post.content` is rendered by react-markdown with
 * `rehype-raw` + `rehype-sanitize` and custom `img`/`p`/`ul`/`li`/`u`
 * renderers — the image one decides inline vs block by the source position,
 * which makes this the most upgrade-sensitive markdown in the app.
 */
const meta: Meta<typeof DevlogPostClient> = {
	title: "Pages/Devlog Post",
	component: DevlogPostClient,
	parameters: { layout: "fullscreen" },
	args: { post: basePost },
};

export default meta;

type Story = StoryObj<typeof DevlogPostClient>;

/** Every markdown construct at once. */
export const Default: Story = {};

/** Inline vs block images — `MarkdownImage` switches layout per position. */
export const Images: Story = {
	args: { post: { ...basePost, content: MARKDOWN_IMAGES } },
};

/** Raw HTML inside the post body, kept by `rehype-raw`. */
export const RawHtml: Story = {
	args: { post: { ...basePost, content: MARKDOWN_INLINE_HTML } },
};

/** Post with a video attached above the body. */
export const WithVideo: Story = {
	args: {
		post: {
			...basePost,
			video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
		},
	},
};

/** Editor.js content takes priority over markdown — the fallback is not used. */
export const EditorJsContent: Story = {
	args: {
		post: {
			...basePost,
			contentEditor: {
				time: 1_753_000_000_000,
				version: "2.31.0",
				blocks: [
					{
						type: "header",
						data: { text: "Written in the block editor", level: 2 },
					},
					{
						type: "paragraph",
						data: {
							text: "This post stores structured blocks, so react-markdown never runs.",
						},
					},
				],
			},
		},
	},
};

/** First post of a project — no previous/next navigation. */
export const WithoutNeighbours: Story = {
	args: {
		post: { ...basePost, previousPost: null, nextPost: null },
	},
};
