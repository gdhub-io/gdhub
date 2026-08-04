import type { Icon } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { IconTile } from "@/components/ui/IconTile";
import styles from "./style.module.scss";

export type EmptyStateProps = {
	icon: Icon;
	/** Already-translated. One short affirmative line — "You're all caught up". */
	title: string;
	/** Already-translated. One sentence saying what will appear here and when. */
	description?: string;
	/** A single primary action at most. */
	action?: ReactNode;
	tint?: string;
	ink?: string;
	className?: string;
};

/**
 * An empty state is a screen, not an apology.
 *
 * A tile, a title and one sentence explaining what will show up here — the
 * cheapest place to raise perceived quality, and the reason to use this instead
 * of antd's `<Empty>` with its default grey illustration.
 */
export function EmptyState({
	icon,
	title,
	description,
	action,
	tint,
	ink,
	className,
}: EmptyStateProps) {
	return (
		<div className={`${styles.empty}${className ? ` ${className}` : ""}`}>
			<IconTile icon={icon} size="lg" tint={tint} ink={ink} />
			<div className={styles.text}>
				<p className={styles.title}>{title}</p>
				{description && <p className={styles.description}>{description}</p>}
			</div>
			{action}
		</div>
	);
}
