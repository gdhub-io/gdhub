import type { Options as MarkdownOptions } from "react-markdown";
import rehypeRaw from "rehype-raw";
import type { Options as SanitizeSchema } from "rehype-sanitize";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

/** GitHub-style sanitation plus the underline, highlight and new-tab links authors use. */
export const markdownSanitizeSchema: SanitizeSchema = {
	...defaultSchema,
	tagNames: [...(defaultSchema.tagNames ?? []), "u", "mark"],
	attributes: {
		...defaultSchema.attributes,
		a: [...(defaultSchema.attributes?.a ?? []), "target", "rel"],
	},
};

/** For react-markdown: raw HTML is parsed, then sanitized. */
export const safeMarkdownRehypePlugins: NonNullable<
	MarkdownOptions["rehypePlugins"]
> = [rehypeRaw, [rehypeSanitize, markdownSanitizeSchema]];
