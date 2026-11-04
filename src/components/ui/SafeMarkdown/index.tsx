import ReactMarkdown, { type Options } from "react-markdown";
import { safeMarkdownRehypePlugins } from "@/lib/content/safe-markdown";

export type SafeMarkdownProps = Omit<Options, "rehypePlugins">;

/** Author-written markdown; raw HTML inside it is parsed, then sanitized. */
export const SafeMarkdown = (props: SafeMarkdownProps) => (
	<ReactMarkdown {...props} rehypePlugins={safeMarkdownRehypePlugins} />
);
