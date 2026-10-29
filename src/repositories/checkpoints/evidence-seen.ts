import type { EvidenceContent } from "@/services/evidence/read";
export const readable = (content: EvidenceContent) =>
	!!content.text || content.images.length > 0;

type EditorBlock = { type?: string; data?: Record<string, unknown> };

const MEDIA_LINK =
	/https?:\/\/[^\s)"'<>]+\.(?:png|jpe?g|gif|webp|mp4|webm|mov)(?:\?[^\s)"'<>]*)?|https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|vimeo\.com|drive\.google\.com|dropbox\.com)\/[^\s)"'<>]+/gi;

/** The images and videos a devlog carries: uploads, embeds, its video and media links in the text. */
export const devlogMediaLinks = (post: {
	content: string;
	video: string | null;
	contentEditor: unknown;
}) => {
	const blocks =
		(post.contentEditor as { blocks?: EditorBlock[] } | null)?.blocks ?? [];
	const fromBlocks = blocks.flatMap((block) => {
		const data = block.data ?? {};
		if (block.type === "image") {
			const url = (data.file as { url?: string } | undefined)?.url;
			return url ? [url] : [];
		}
		if (block.type === "embed" && typeof data.source === "string") {
			return [data.source];
		}
		return [];
	});
	const fromText = post.content.match(MEDIA_LINK) ?? [];

	return [
		...new Set([
			...(post.video ? [post.video] : []),
			...fromBlocks,
			...fromText,
		]),
	];
};

/** One devlog image or video as the sprint review reads it. */
export const mediaLine = (
	link: string | null,
	shows: string | null,
	unread: string | null,
) =>
	shows
		? `- ${link}: ${shows}${unread ? ` (${unread})` : ""}`
		: `- ${link}: not read — ${unread ?? "nothing readable"}`;
