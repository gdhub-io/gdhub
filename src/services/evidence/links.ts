/**
 * Share links turned into what the AI curator can read (GDHUB-110). Authors paste
 * the link a service gives them for sharing; the file or the text behind it lives
 * at another address, which these rewrite to. Anything not listed is read as is.
 */

export type VideoPage = "youtube" | "vimeo";

export type ReadableLink = {
	/** Where to fetch. */
	url: string;
	/** A video page we cannot sample: read from what the provider publishes. */
	videoPage?: VideoPage;
	/** A Google rewrite that should answer with a file; a page instead means it refused. */
	expectsFile?: boolean;
};

const parse = (link: string) => {
	try {
		return new URL(link);
	} catch {
		return null;
	}
};

/** The id in a Google `/d/ID/` path. */
const googleId = (url: URL) => url.pathname.match(/\/d\/([\w-]+)/)?.[1] ?? null;

export function readableLink(link: string): ReadableLink {
	const url = parse(link);
	if (!url) return { url: link };
	const host = url.hostname.replace(/^www\./, "");

	if (host === "drive.google.com") {
		const id = googleId(url) ?? url.searchParams.get("id");
		if (id) {
			return {
				url: `https://drive.google.com/uc?export=download&id=${id}`,
				expectsFile: true,
			};
		}
	}

	if (host === "docs.google.com") {
		const id = googleId(url);
		if (id && url.pathname.startsWith("/document/")) {
			return {
				url: `https://docs.google.com/document/d/${id}/export?format=txt`,
				expectsFile: true,
			};
		}
		if (id && url.pathname.startsWith("/spreadsheets/")) {
			return {
				url: `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`,
				expectsFile: true,
			};
		}
		if (id && url.pathname.startsWith("/presentation/")) {
			return {
				url: `https://docs.google.com/presentation/d/${id}/export/txt`,
				expectsFile: true,
			};
		}
	}

	if (host === "dropbox.com" || host.endsWith(".dropbox.com")) {
		url.searchParams.set("dl", "1");
		return { url: url.toString() };
	}

	// github.com/owner/repo/blob/branch/path → the raw file.
	if (host === "github.com") {
		const blob = url.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/(.+)$/);
		if (blob) {
			return {
				url: `https://raw.githubusercontent.com/${blob[1]}/${blob[2]}/${blob[3]}`,
			};
		}
	}

	if (
		host === "youtube.com" ||
		host === "m.youtube.com" ||
		host === "youtu.be"
	) {
		return { url: link, videoPage: "youtube" };
	}
	if (host === "vimeo.com" || host === "player.vimeo.com") {
		return { url: link, videoPage: "vimeo" };
	}

	return { url: link };
}

/** What a provider publishes about one of its videos: title and thumbnail. */
export const oembedUrl = (page: VideoPage, link: string) =>
	page === "youtube"
		? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(link)}`
		: `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(link)}`;
