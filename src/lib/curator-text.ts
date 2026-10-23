/** A long text cut at `max` characters with a mark saying how much is left. */
export const capped = (text: string, max: number) =>
	text.length > max
		? `${text.slice(0, max)} […${text.length - max} more characters not read]`
		: text;

/** A devlog longer than this is shortened, and says so. */
const DEVLOG_MAX_CHARS = 2500;

/** A devlog as the AI curator reads it; a long one is cut with a mark, never silently. */
export const devlogText = (content: string) =>
	capped(content, DEVLOG_MAX_CHARS);
