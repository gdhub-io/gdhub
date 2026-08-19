/**
 * Hosts we are willing to download an image from server-side.
 *
 * Avatars and covers reach the backend as plain URLs and are fetched by the
 * server (Matrix media upload), so an unchecked URL is a server-side request
 * forgery hole — `http://169.254.169.254/...` would be fetched happily.
 *
 * Mirrors `images.remotePatterns` in next.config.js: everything the frontend
 * is allowed to render, and nothing else.
 */
const ALLOWED_HOSTS = new Set([
	"images.unsplash.com",
	"img.youtube.com",
	"lh3.googleusercontent.com",
	"s3.us-west-2.amazonaws.com",
	"cdn.sanity.io",
	"loremflickr.com",
	"avatars.githubusercontent.com",
	"v3.fal.media",
	"placehold.co",
	"matrix.gdhub.io",
	"cdn.jsdelivr.net",
]);

function appHost(): string | null {
	try {
		return new URL(process.env.NEXT_PUBLIC_APP_URL || "").hostname;
	} catch {
		return null;
	}
}

/** HTTPS URL on a known image host — anything else must not be fetched. */
export function isAllowedRemoteImage(url: string): boolean {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return false;
	}

	if (parsed.protocol !== "https:") return false;

	return ALLOWED_HOSTS.has(parsed.hostname) || parsed.hostname === appHost();
}
