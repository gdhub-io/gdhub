import { CHAT_IMAGE_MAX_BYTES } from "@/config/chat";

export type TextSegment = { type: "text" | "link"; value: string };

const LINK_RE = /https?:\/\/[^\s<>"]+/gi;
const TRAILING_PUNCTUATION = /[.,;:!?'"\]}>*_]$/;

/** Sentence punctuation after a URL is not part of it; a `)` only when unbalanced. */
function trimLink(raw: string): string {
	let link = raw;
	for (;;) {
		if (TRAILING_PUNCTUATION.test(link)) {
			link = link.slice(0, -1);
		} else if (
			link.endsWith(")") &&
			link.split(")").length > link.split("(").length
		) {
			link = link.slice(0, -1);
		} else {
			return link;
		}
	}
}

/** Plain text split into text and http(s) link runs, in order. */
export function textSegments(text: string): TextSegment[] {
	const segments: TextSegment[] = [];
	let cursor = 0;
	for (const match of text.matchAll(LINK_RE)) {
		const link = trimLink(match[0]);
		if (!/^https?:\/\/[^/]+\.[^/]/i.test(link)) continue;
		const start = match.index;
		if (start > cursor) {
			segments.push({ type: "text", value: text.slice(cursor, start) });
		}
		segments.push({ type: "link", value: link });
		cursor = start + link.length;
	}
	if (cursor < text.length) {
		segments.push({ type: "text", value: text.slice(cursor) });
	}
	return segments;
}

export function firstLink(text: string): string | null {
	return textSegments(text).find((s) => s.type === "link")?.value ?? null;
}

/** Scales a box down to fit, keeping the aspect; never scales up. */
export function fitWithin(
	width: number,
	height: number,
	maxWidth: number,
	maxHeight: number = maxWidth,
): { width: number; height: number } {
	const scale = Math.min(1, maxWidth / width, maxHeight / height);
	return {
		width: Math.max(1, Math.round(width * scale)),
		height: Math.max(1, Math.round(height * scale)),
	};
}

/** Small images go up untouched (a GIF stays animated); the rest are re-encoded. */
export function needsShrink(
	width: number,
	height: number,
	bytes: number,
	maxSide: number,
	maxBytes: number = CHAT_IMAGE_MAX_BYTES,
): boolean {
	return Math.max(width, height) > maxSide || bytes > maxBytes;
}

export function exceedsChatImageLimit(
	bytes: number,
	maxBytes: number = CHAT_IMAGE_MAX_BYTES,
): boolean {
	return bytes > maxBytes;
}

/** `shot.png` re-encoded as WebP becomes `shot.webp`. */
export function renameForType(name: string, mimetype: string): string {
	const ext = mimetype === "image/jpeg" ? "jpg" : mimetype.split("/")[1];
	const base = name.replace(/\.[^./]+$/, "") || "image";
	return `${base}.${ext}`;
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function parseMxc(
	mxc: string,
): { serverName: string; mediaId: string } | null {
	const match = /^mxc:\/\/([^/]+)\/([A-Za-z0-9_-]+)$/.exec(mxc);
	return match ? { serverName: match[1], mediaId: match[2] } : null;
}

export type LinkPreview = {
	siteName?: string;
	title?: string;
	description?: string;
	/** Synapse stores the og:image itself; anything not on our server is dropped. */
	imageMxc?: string;
};

/** Synapse's og:* answer → a card, or null when there is nothing to show. */
export function parseLinkPreview(
	raw: Record<string, unknown> | null | undefined,
): LinkPreview | null {
	if (!raw) return null;
	const str = (key: string) => {
		const value = raw[key];
		return typeof value === "string" && value.trim() ? value.trim() : undefined;
	};
	const image = str("og:image");
	const preview: LinkPreview = {
		siteName: str("og:site_name"),
		title: str("og:title"),
		description: str("og:description"),
		imageMxc: image && parseMxc(image) ? image : undefined,
	};
	return preview.title || preview.imageMxc ? preview : null;
}

export type ChatImageRef = {
	url: string;
	name: string;
	mimetype: string;
	size: number;
	w: number;
	h: number;
};

/**
 * One `m.image` event, captioned the Matrix 1.10 way: `filename` names the file
 * and `body` is the caption, so a picture and its text stay one message.
 */
export function imageMessageContent(image: ChatImageRef, caption?: string) {
	const text = caption?.trim();
	return {
		msgtype: "m.image",
		body: text || image.name,
		filename: image.name,
		url: image.url,
		info: {
			w: image.w,
			h: image.h,
			size: image.size,
			mimetype: image.mimetype,
		},
	};
}

/** What a composer sends: text, a picture, or a picture with its caption. */
export type ChatMessagePayload = { text?: string; image?: ChatImageRef };

/** The `m.room.message` content for a payload: a captioned picture, or text. */
export function messageContent({ text, image }: ChatMessagePayload) {
	return image
		? imageMessageContent(image, text)
		: { msgtype: "m.text", body: text ?? "" };
}

/** An `m.replace` edit of `eventId` to `next`, with the `* ` fallback body. */
export function editContent(eventId: string, next: { body: string }) {
	return {
		...next,
		body: `* ${next.body}`,
		"m.new_content": next,
		"m.relates_to": { rel_type: "m.replace", event_id: eventId },
	};
}

/** The caption of an `m.image`: `body` when a separate `filename` names the file. */
export function imageCaptionOf(
	content: Record<string, unknown>,
): string | undefined {
	const { body, filename } = content;
	if (typeof filename !== "string" || typeof body !== "string")
		return undefined;
	return body !== filename && body.trim() ? body : undefined;
}
