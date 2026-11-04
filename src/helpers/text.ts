import trim from "lodash/trim";

export const abbrName = (name: string) => {
	const words = name?.split(" ");

	if (words?.length >= 2) {
		return words[0][0] + words[1][0];
	}

	return name;
};

export const capitalize = (str: string) =>
	str.charAt(0).toUpperCase() + str.slice(1);

const DASHES_ONLY_RE = /^[-‐‑‒–—―−]+$/;

/**
 * Returns a cleaned string for UI, or null if value is not meaningful.
 */
export const getRelevantText = (value: unknown): string | null => {
	if (typeof value !== "string") return null;

	const normalized = trim(
		value
			.replaceAll("\u200B", "") // zero-width space
			.replace(/\s+/g, " "),
	);

	if (!normalized) return null;
	if (DASHES_ONLY_RE.test(normalized)) return null;

	return normalized;
};

const HTML_ESCAPES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

/** User text made safe to drop into an email's HTML. */
export const escapeHtml = (text: string) =>
	text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
