import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./style.module.scss";

/** A legal text exactly as it was published — markdown, no raw HTML. */
export function LegalDocument({ text }: { text: string }) {
	return (
		<article className={styles.article}>
			<ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
		</article>
	);
}
