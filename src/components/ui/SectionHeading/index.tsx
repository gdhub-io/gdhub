import type { ReactNode } from "react";
import styles from "./style.module.scss";

export type SectionHeadingProps = {
	/** Already-translated. */
	title: string;
	description?: string;
	/** Usually a `<ViewAllLink>`, occasionally a single button. */
	action?: ReactNode;
	/** Heading rank. Pick by document structure, not by size. */
	level?: 2 | 3 | 4;
	className?: string;
};

/**
 * Section title with an optional trailing action.
 *
 * Headings are deliberately much larger than body copy — the contrast between
 * 26/19px semibold and 14px regular is what makes a page look composed rather
 * than dense. Rank is a structural choice; the display font and the size come
 * from the theme.
 */
export function SectionHeading({
	title,
	description,
	action,
	level = 2,
	className,
}: SectionHeadingProps) {
	const Title = level === 2 ? "h2" : level === 3 ? "h3" : "h4";

	return (
		<div className={`${styles.heading}${className ? ` ${className}` : ""}`}>
			<div className={styles.text}>
				<Title className={styles.title} data-level={level}>
					{title}
				</Title>
				{description && <p className={styles.description}>{description}</p>}
			</div>
			{action}
		</div>
	);
}
