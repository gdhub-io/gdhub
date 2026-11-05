import pdf from "pdf-parse/lib/pdf-parse.js";
import { capped } from "@/lib/checkpoints/curator-text";
import { withCassette } from "@/services/ai/cassette";
import type { AiMeter } from "@/services/ai-usage";
import {
	fetchBody,
	type OpenFailure,
} from "@/services/artifact-check/safe-fetch";
import { videoFrames } from "./frames";
import { oembedUrl, readableLink, type VideoPage } from "./links";
import {
	loadNotionBlocks,
	type NotionPage,
	notionPage,
	notionText,
} from "./notion";
import { readViaWebSearch } from "./web-read";

/** Limits on what is read (Dmitry, 2026-10-24). */
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_PDF_PAGES = 100;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;
const MAX_PAGE_BYTES = 2 * 1024 * 1024;
/** What the model reads of a document; the rest is said to exist. */
const MAX_TEXT_CHARS = 20_000;
/** Less than this beside its title, a page is a shell that renders with JavaScript. */
const MIN_PAGE_BODY_CHARS = 25;

export type EvidenceImage = { data: Uint8Array; mediaType: string };

/**
 * What the AI curator gets to look at for one link. `unread` says, in plain
 * words, what it could not read and why — it goes into the prompt as it is.
 */
export type EvidenceContent = {
	text: string | null;
	images: EvidenceImage[];
	/** Seconds of video looked at, charged to the sprint's budget. */
	videoSeconds: number;
	unread: string | null;
};

const nothing = (unread: string): EvidenceContent => ({
	text: null,
	images: [],
	videoSeconds: 0,
	unread,
});

const textOnly = (text: string): EvidenceContent => ({
	text,
	images: [],
	videoSeconds: 0,
	unread: null,
});

const capText = (text: string) =>
	capped(
		text
			.replace(/\s+\n/g, "\n")
			.replace(/[ \t]+/g, " ")
			.trim(),
		MAX_TEXT_CHARS,
	);

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

const JS_SHELL = "the page renders with JavaScript; no text could be read";

/** The words of an HTML page, with its title, and no scripts or styles; null for an empty shell. */
const pageText = (html: string) => {
	const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
	const body = capText(
		html
			.replace(/<(script|style|noscript|title)[\s\S]*?<\/\1>/gi, " ")
			.replace(/<[^>]+>/g, " ")
			.replace(/&nbsp;/g, " ")
			.replace(/&amp;/g, "&"),
	);
	if (body.length < MIN_PAGE_BODY_CHARS) return null;
	return `${title ? `Page title: ${title}\n` : ""}${body}`;
};

const FAILED: Record<OpenFailure | "tooLarge" | "notAccepted", string> = {
	notAccepted:
		"a build file — builds are never downloaded, only their page is read",
	tooLarge: "the file is larger than the curator reads",
	needsLogin: "the link asks for a login",
	notFound: "nothing is at the link",
	timeout: "the link did not answer in time",
	unsafe: "the address cannot be opened from outside",
	tooManyRedirects: "the link redirects too many times",
	unreachable: "the link could not be opened",
};

/** A YouTube or Vimeo page: only the title and the thumbnail the provider publishes. */
async function readVideoPage(
	page: VideoPage,
	link: string,
): Promise<EvidenceContent> {
	const meta = await fetchBody(oembedUrl(page, link), 256 * 1024);
	if (!meta.ok)
		return nothing(`a ${page} video whose details could not be read`);

	const info = JSON.parse(decode(meta.body.bytes)) as {
		title?: string;
		description?: string;
		thumbnail_url?: string;
	};
	const thumb = info.thumbnail_url
		? await fetchBody(info.thumbnail_url, MAX_IMAGE_BYTES)
		: null;

	return {
		text: [
			info.title && `Video title: ${info.title}`,
			info.description && `Description: ${capText(info.description)}`,
		]
			.filter(Boolean)
			.join("\n"),
		images:
			thumb?.ok && thumb.body.contentType.startsWith("image/")
				? [{ data: thumb.body.bytes, mediaType: thumb.body.contentType }]
				: [],
		videoSeconds: 0,
		unread: `a ${page} video: only its title and thumbnail, the video itself was not watched`,
	};
}

/** Refusals a site may give our servers but not a search engine's reader. */
const WEB_SEARCH_RETRIES = new Set<string>(["needsLogin", "timeout"]);

/** A page we could not read ourselves, read through OpenAI's web search; else unread. */
async function viaWebSearch(
	link: string,
	unread: string,
	meter?: AiMeter,
): Promise<EvidenceContent> {
	const read = await readViaWebSearch(link, MAX_TEXT_CHARS, meter);
	if (!read) return nothing(unread);
	return textOnly(
		[
			"Read through web search — a transcription of the page, not the page itself:",
			read.text,
			read.sources.length ? `Sources: ${read.sources.join(", ")}` : "",
		]
			.filter(Boolean)
			.join("\n"),
	);
}

async function readNotionPage(page: NotionPage): Promise<EvidenceContent> {
	const loaded = await loadNotionBlocks(page);
	// Web search cannot help here: Notion answers its reader with a 404.
	if (!loaded.ok) return nothing(FAILED[loaded.reason]);
	const { text, images } = notionText(loaded.blocks, page.pageId);
	if (!text) return nothing("the Notion page is not shared to the web");
	return {
		text: `Notion page:\n${capped(text, MAX_TEXT_CHARS)}`,
		images: [],
		videoSeconds: 0,
		unread: images
			? `the page's images and videos (${images}) were not looked at`
			: null,
	};
}

/**
 * Read one link for the AI curator: a document as text, an image as an image, a
 * video as frames, a page as its words. Nothing is run and a build is never
 * downloaded — the caller passes only links whose kind is not a build.
 */
export const readEvidence = (
	link: string,
	options: {
		videoSecondsLeft: number;
		/** A build: its page is read, anything else at the link is not fetched. */
		pageOnly?: boolean;
		/** Whose AI spend a web-search read is charged to. */
		meter?: AiMeter;
	},
): Promise<EvidenceContent> => {
	const { meter: _, ...recorded } = options;
	// On the e2e stand a page reads as it was recorded: a live one changes its counters.
	return withCassette("evidence", { link, ...recorded }, () =>
		readLive(link, options),
	);
};

async function readLive(
	link: string,
	{
		videoSecondsLeft,
		pageOnly = false,
		meter,
	}: { videoSecondsLeft: number; pageOnly?: boolean; meter?: AiMeter },
): Promise<EvidenceContent> {
	const notion = notionPage(link);
	if (notion) return readNotionPage(notion);

	const target = readableLink(link);
	if (target.videoPage) return readVideoPage(target.videoPage, link);

	const fetched = await fetchBody(
		target.url,
		pageOnly ? MAX_PAGE_BYTES : MAX_VIDEO_BYTES,
		pageOnly ? (type) => type === "text/html" : undefined,
	);
	if (!fetched.ok) {
		return WEB_SEARCH_RETRIES.has(fetched.reason)
			? viaWebSearch(link, FAILED[fetched.reason], meter)
			: nothing(FAILED[fetched.reason]);
	}
	const { contentType, bytes } = fetched.body;

	if (contentType.startsWith("image/")) {
		return bytes.byteLength > MAX_IMAGE_BYTES
			? nothing(FAILED.tooLarge)
			: {
					text: null,
					images: [{ data: bytes, mediaType: contentType }],
					videoSeconds: 0,
					unread: null,
				};
	}

	if (contentType.startsWith("video/")) {
		if (videoSecondsLeft <= 0) {
			return nothing("a video over the sprint's video budget");
		}
		const { frames, seconds } = await videoFrames(bytes, videoSecondsLeft);
		return frames.length
			? {
					text: `Video, ${Math.round(seconds)} seconds looked at, ${frames.length} frames spread evenly:`,
					images: frames.map((data) => ({ data, mediaType: "image/jpeg" })),
					videoSeconds: seconds,
					unread: null,
				}
			: nothing("a video the curator could not take frames from");
	}

	if (contentType === "application/pdf") {
		if (bytes.byteLength > MAX_DOCUMENT_BYTES) return nothing(FAILED.tooLarge);
		const parsed = await pdf(Buffer.from(bytes), { max: MAX_PDF_PAGES });
		return textOnly(
			`PDF, ${parsed.numpages} pages${parsed.numpages > MAX_PDF_PAGES ? ` (the first ${MAX_PDF_PAGES} read)` : ""}:\n${capText(parsed.text)}`,
		);
	}

	if (contentType === "text/html") {
		if (bytes.byteLength > MAX_PAGE_BYTES) return nothing(FAILED.tooLarge);
		// A Google export answering with a page refused: the file is too large to
		// hand over directly, or it is not open to anyone.
		if (target.expectsFile) {
			return nothing(
				"Google did not hand the file over: it is too large, or not open to anyone",
			);
		}
		const text = pageText(decode(bytes));
		return text ? textOnly(text) : viaWebSearch(link, JS_SHELL, meter);
	}

	if (
		contentType.startsWith("text/") ||
		contentType === "application/json" ||
		contentType === "application/xml"
	) {
		if (bytes.byteLength > MAX_DOCUMENT_BYTES) return nothing(FAILED.tooLarge);
		return textOnly(capText(decode(bytes)));
	}

	return nothing(
		`a file of a kind the curator cannot read (${contentType || "unknown"})`,
	);
}
