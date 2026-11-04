import { CURATOR_DEVLOG_MAX_CHARS } from "@/config/checkpoint";

/** A long text cut at `max` characters with a mark saying how much is left. */
export const capped = (text: string, max: number) =>
	text.length > max
		? `${text.slice(0, max)} […${text.length - max} more characters not read]`
		: text;

/** A devlog as the AI curator reads it; a long one is cut with a mark, never silently. */
export const devlogText = (content: string) =>
	capped(content, CURATOR_DEVLOG_MAX_CHARS);

const PARTICIPANT_TAG = "participant_text";
const FENCE = /<\s*\/?\s*participant_text\b[^>]*>?/gi;

/**
 * Text the participant wrote, fenced for a prompt so the model reads it as data
 * (prompt injection). A fence inside it is removed until none is left, so the
 * text can neither close the block early nor rebuild a tag from the pieces.
 */
export const fenced = (text: string | null | undefined) => {
	let inner = text ?? "";
	for (let before = ""; before !== inner; ) {
		before = inner;
		inner = inner.replace(FENCE, "");
	}
	return `<${PARTICIPANT_TAG}>${inner}</${PARTICIPANT_TAG}>`;
};

type ListItem =
	| string
	| { content?: string; text?: string; checked?: boolean; items?: ListItem[] };

type EditorBlock = {
	type: string;
	data?: {
		text?: string;
		caption?: string;
		items?: ListItem[];
		content?: string[][];
		link?: string;
		meta?: { title?: string; description?: string };
		source?: string;
		file?: { url?: string };
	};
};

/** Inline HTML to plain words; a link keeps where it points: "text (url)". */
const plain = (html: string) =>
	html
		.replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, (_, href, text) =>
			text && text !== href ? `${text} (${href})` : href,
		)
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<[^>]+>/g, "")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"');

const listLines = (items: ListItem[] = [], depth = 0): string[] =>
	items.flatMap((item) => {
		if (typeof item === "string") return [`${"  ".repeat(depth)}- ${item}`];
		const mark =
			item.checked === undefined ? "-" : item.checked ? "[x]" : "[ ]";
		return [
			`${"  ".repeat(depth)}${mark} ${item.content ?? item.text ?? ""}`,
			...listLines(item.items, depth + 1),
		];
	});

/** One editor block as the lines a reader would take from it. */
const blockLines = (block: EditorBlock): string[] => {
	const data = block.data ?? {};
	switch (block.type) {
		case "list":
		case "checklist":
			return listLines(data.items);
		case "table":
			return (data.content ?? []).map((row) => `| ${row.join(" | ")} |`);
		case "quote":
			return [
				`> ${data.text ?? ""}`,
				...(data.caption ? [`— ${data.caption}`] : []),
			];
		case "linkTool":
			return [
				[data.meta?.title, data.meta?.description, data.link]
					.filter(Boolean)
					.join(" — "),
			];
		case "embed":
			return [[data.caption, data.source].filter(Boolean).join(" — ")];
		case "image":
			return [
				[`Image${data.caption ? `: ${data.caption}` : ""}`, data.file?.url]
					.filter(Boolean)
					.join(" — "),
			];
		case "delimiter":
			return ["---"];
		default:
			return data.text ? [data.text] : [];
	}
};

/**
 * A devlog's words. The editor keeps a post in its blocks and saves `content`
 * empty, so a post written on the page is read from its blocks — paragraphs,
 * headings, lists, checklists, tables, quotes, links, embeds and image
 * captions, each with where it points; one with plain `content` (an import, a
 * script) is read as it is.
 */
export const devlogWords = (post: {
	content: string;
	contentEditor?: unknown;
}) => {
	if (post.content.trim()) return post.content;
	const blocks =
		(post.contentEditor as { blocks?: EditorBlock[] } | null)?.blocks ?? [];
	return blocks
		.flatMap(blockLines)
		.map(plain)
		.filter((line) => line.trim())
		.join("\n");
};
