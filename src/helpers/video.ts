const LEGACY_YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Returns a player-ready video URL for `react-player`.
 *
 * `project.videoLink` historically stored a bare 11-char YouTube video ID.
 * We now store the full URL of any supported service (YouTube, Vimeo, Twitch,
 * …), but legacy rows still hold a bare ID — convert those to a YouTube watch
 * URL so they keep playing. Anything else (a real URL) is returned unchanged.
 */
export const toPlayableVideoUrl = (value?: string | null): string => {
	const trimmed = value?.trim();
	if (!trimmed) return "";

	if (LEGACY_YOUTUBE_ID_RE.test(trimmed)) {
		return `https://www.youtube.com/watch?v=${trimmed}`;
	}

	return trimmed;
};

const YOUTUBE_HOST_RE = /(^|\.)youtube(-nocookie)?\.com$/;
const YOUTUBE_PATH_ID_RE = /\/(?:embed|shorts|live|v|e)\/([a-zA-Z0-9_-]{11})/;

/** The video id of a youtube.com / youtu.be URL (watch, shorts, embed, live), or null. */
export const youTubeVideoId = (url: string): string | null => {
	try {
		const parsed = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
		const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

		if (host === "youtu.be") {
			const id = parsed.pathname.split("/").filter(Boolean)[0];
			return LEGACY_YOUTUBE_ID_RE.test(id) ? id : null;
		}

		if (YOUTUBE_HOST_RE.test(host)) {
			const fromQuery = parsed.searchParams.get("v");
			if (fromQuery && LEGACY_YOUTUBE_ID_RE.test(fromQuery)) return fromQuery;

			const fromPath = parsed.pathname.match(YOUTUBE_PATH_ID_RE);
			if (fromPath) return fromPath[1];
		}
	} catch {
		// not a parseable URL
	}

	return null;
};

/**
 * Poster image for `react-player`'s `light` mode. YouTube's oEmbed endpoint
 * (which react-player uses to auto-fetch a thumbnail) is CORS-blocked, leaving
 * a black box — so for YouTube we derive the thumbnail directly. Returns
 * `undefined` for other services, where react-player's oEmbed lookup works.
 */
export const getVideoPoster = (value?: string | null): string | undefined => {
	const id = youTubeVideoId(toPlayableVideoUrl(value));
	return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : undefined;
};
