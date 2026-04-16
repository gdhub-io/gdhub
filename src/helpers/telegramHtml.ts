/**
 * Helpers for Telegram Bot API HTML parse_mode.
 * @see https://core.telegram.org/bots/api#html-style
 *
 * Only a small subset of tags is allowed; arbitrary HTML from Editor.js must be
 * converted to escaped plain text (line breaks preserved) before embedding.
 */

/** Escape text so it is safe inside Telegram HTML messages. */
export function escapeTelegramHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function decodeBasicHtmlEntities(text: string): string {
	return text
		.replace(/&nbsp;/gi, " ")
		.replace(/&#(\d+);/g, (_, code) =>
			String.fromCodePoint(Number.parseInt(code, 10)),
		)
		.replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
			String.fromCodePoint(Number.parseInt(hex, 16)),
		)
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#0?39;/g, "'");
}

/** Strips tags / normalizes breaks; decodes entities. For UI plain text (not Telegram). */
export function htmlFragmentToPlainText(fragment: string): string {
	if (!fragment) return "";

	let s = fragment
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/p>/gi, "\n")
		.replace(/<\/div>/gi, "\n")
		.replace(/<\/h[1-6]>/gi, "\n")
		.replace(/<\/li>/gi, "\n")
		.replace(/<\/tr>/gi, "\n");

	s = s.replace(/<[^>]+>/g, "");
	s = decodeBasicHtmlEntities(s);
	s = s.replace(/\u00a0/g, " ");
	s = s.replace(/\n{3,}/g, "\n\n").trim();

	return s;
}

/**
 * Editor.js / arbitrary HTML snippet to escaped plain text for Telegram HTML parse_mode.
 */
export function htmlFragmentToTelegramPlainText(fragment: string): string {
	return escapeTelegramHtml(htmlFragmentToPlainText(fragment));
}
