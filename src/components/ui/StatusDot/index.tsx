import type { ReactNode } from "react";
import styles from "./style.module.scss";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export type StatusDotProps = {
	tone: StatusTone;
	/** Already-translated label. */
	label: ReactNode;
	className?: string;
};

/**
 * A status as a dot and a word.
 *
 * Lists carry many statuses at once, and filled pills turn a table into
 * confetti. The dot supplies the colour, the word supplies the meaning, and the
 * row stays readable — so prefer this over a `<Tag>` anywhere statuses repeat.
 */
export function StatusDot({ tone, label, className }: StatusDotProps) {
	return (
		<span
			className={`${styles.status}${className ? ` ${className}` : ""}`}
			data-tone={tone}
		>
			<span className={styles.dot} />
			{label}
		</span>
	);
}
