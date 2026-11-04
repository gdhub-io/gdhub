import DOMPurify, {
	type Config,
	type UponSanitizeAttributeHook,
} from "isomorphic-dompurify";

/**
 * Untrusted HTML from authors — editor.js inline markup — is reduced to
 * formatting before it reaches the page: no scripts, no event handlers, no
 * `style`, no `javascript:` links, no iframes.
 */

const ALLOWED_TAGS = [
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
];

const ATTRIBUTES_BY_TAG: Record<string, string[]> = {
	a: ["href", "target", "rel"],
	mark: ["class"],
	code: ["class"],
};

// The classes editor.js's marker and inline-code tools put on their tags.
const CLASSES_BY_TAG: Record<string, string[]> = {
	mark: ["cdx-marker"],
	code: ["inline-code"],
};

const CONFIG: Config = {
	ALLOWED_TAGS,
	ALLOWED_ATTR: ["href", "target", "rel", "class"],
	ALLOW_DATA_ATTR: false,
	ALLOW_ARIA_ATTR: false,
	// http, https and mailto, or a relative URL; protocol-relative `//host` is refused.
	ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|(?![a-z][a-z\d+.-]*:|[/\\]{2}))/i,
};

const scopeAttribute: UponSanitizeAttributeHook = (node, data) => {
	const tag = node.nodeName.toLowerCase();
	if (!ATTRIBUTES_BY_TAG[tag]?.includes(data.attrName)) {
		data.keepAttr = false;
		return;
	}
	if (data.attrName === "class") {
		const allowed = CLASSES_BY_TAG[tag] ?? [];
		data.attrValue = data.attrValue
			.split(/\s+/)
			.filter((name) => allowed.includes(name))
			.join(" ");
		if (!data.attrValue) data.keepAttr = false;
	}
};

const protectNewTab = (node: Element) => {
	if (node.nodeName === "A" && node.getAttribute("target") === "_blank") {
		node.setAttribute("rel", "noopener noreferrer");
	}
};

/** Formatting markup only; anything executable is dropped. */
export const sanitizeHtml = (html: string): string => {
	// The DOMPurify instance is shared with other libraries, so the hooks live only for this call.
	DOMPurify.addHook("uponSanitizeAttribute", scopeAttribute);
	DOMPurify.addHook("afterSanitizeAttributes", protectNewTab);
	try {
		return DOMPurify.sanitize(html, CONFIG);
	} finally {
		DOMPurify.removeHook("afterSanitizeAttributes");
		DOMPurify.removeHook("uponSanitizeAttribute");
	}
};

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
