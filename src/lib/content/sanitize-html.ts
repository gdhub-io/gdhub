import sanitize from "sanitize-html";

/**
 * Untrusted HTML from authors — editor.js inline markup — is reduced to
 * formatting before it reaches the page: no scripts, no event handlers, no
 * `style`, no `javascript:` links, no iframes.
 *
 * sanitize-html and not DOMPurify: it needs no DOM, so it runs the same in the
 * browser and in server rendering, where jsdom fails to load on Vercel.
 */
const OPTIONS: sanitize.IOptions = {
	allowedTags: [
		"a",
		"b",
		"strong",
		"i",
		"em",
		"u",
		"s",
		"del",
		"mark",
		"code",
		"pre",
		"br",
		"p",
		"span",
		"sub",
		"sup",
		"ul",
		"ol",
		"li",
		"blockquote",
	],
	allowedAttributes: {
		a: ["href", "target", "rel"],
		mark: ["class"],
		code: ["class"],
	},
	// The classes editor.js's marker and inline-code tools put on their tags.
	allowedClasses: { mark: ["cdx-marker"], code: ["inline-code"] },
	// http, https and mailto, or a relative URL; protocol-relative `//host` is refused.
	allowedSchemes: ["http", "https", "mailto"],
	allowProtocolRelative: false,
	disallowedTagsMode: "discard",
	transformTags: {
		a: (tagName, attribs) => ({
			tagName,
			attribs:
				attribs.target === "_blank"
					? { ...attribs, rel: "noopener noreferrer" }
					: attribs,
		}),
	},
};

/** Formatting markup only; anything executable is dropped. */
export const sanitizeHtml = (html: string): string => sanitize(html, OPTIONS);

/** An absolute http(s) URL or a same-site path; anything else becomes "". */
export const safeUrl = (url: string): string => {
	const trimmed = url.trim();
	if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
	try {
		const { protocol } = new URL(trimmed);
		return protocol === "https:" || protocol === "http:" ? trimmed : "";
	} catch {
		return "";
	}
};

// editor.js block fields the renderer feeds to html-react-parser, and the ones it puts in href/src.
const HTML_FIELDS = new Set([
	"text",
	"caption",
	"html",
	"content",
	"items",
	"header",
	"footer",
]);
const URL_FIELDS = new Set(["link", "embed", "source", "url"]);

const cleanValue = (value: unknown, key: string, inHtml: boolean): unknown => {
	if (typeof value === "string") {
		if (URL_FIELDS.has(key)) return safeUrl(value);
		return inHtml ? sanitizeHtml(value) : value;
	}
	if (Array.isArray(value)) {
		return value.map((item) => cleanValue(item, key, inHtml));
	}
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).map(([k, v]) => [
				k,
				cleanValue(v, k, inHtml || HTML_FIELDS.has(k)),
			]),
		);
	}
	return value;
};

/** editor.js output with every HTML field sanitized and every link/embed URL checked. */
export const sanitizeEditorJsData = <T>(data: T): T =>
	cleanValue(data, "", false) as T;
