/** A devlog longer than this is shortened, and says so. */
const DEVLOG_MAX_CHARS = 2500;

/** A devlog as the AI curator reads it; a long one is cut with a mark, never silently. */
export const devlogText = (content: string) =>
	content.length > DEVLOG_MAX_CHARS
		? `${content.slice(0, DEVLOG_MAX_CHARS)} […shortened, ${content.length - DEVLOG_MAX_CHARS} more characters]`
		: content;
