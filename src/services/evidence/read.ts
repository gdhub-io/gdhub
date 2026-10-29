import pdf from "pdf-parse/lib/pdf-parse.js";
import { capped } from "@/lib/checkpoints/curator-text";
import {
	fetchBody,
	type OpenFailure,
} from "@/services/artifact-check/safe-fetch";
import { videoFrames } from "./frames";
import { oembedUrl, readableLink, type VideoPage } from "./links";

/** Limits on what is read (Dmitry, 2026-10-24). */
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_PDF_PAGES = 100;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;
const MAX_PAGE_BYTES = 2 * 1024 * 1024;
/** What the model reads of a document; the rest is said to exist. */
const MAX_TEXT_CHARS = 20_000;

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

/** The words of an HTML page, with its title, and no scripts or styles. */
const pageText = (html: string) => {
	const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
	const body = html
		.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&");
	return `${title ? `Page title: ${title}\n` : ""}${capText(body)}`;
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

/**
 * Read one link for the AI curator: a document as text, an image as an image, a
 * video as frames, a page as its words. Nothing is run and a build is never
 * downloaded — the caller passes only links whose kind is not a build.
 */
export async function readEvidence(
	link: string,
	{
		videoSecondsLeft,
		pageOnly = false,
	}: {
		videoSecondsLeft: number;
		/** A build: its page is read, anything else at the link is not fetched. */
		pageOnly?: boolean;
	},
): Promise<EvidenceContent> {
	const target = readableLink(link);
	if (target.videoPage) return readVideoPage(target.videoPage, link);

	const fetched = await fetchBody(
		target.url,
		pageOnly ? MAX_PAGE_BYTES : MAX_VIDEO_BYTES,
		pageOnly ? (type) => type === "text/html" : undefined,
	);
	if (!fetched.ok) return nothing(FAILED[fetched.reason]);
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
		return textOnly(pageText(decode(bytes)));
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
