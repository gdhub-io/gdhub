import type { ReactNode } from "react";
import styles from "./style.module.scss";

/** The one stroke weight every meta-row glyph is drawn at. */
export const META_ICON_STROKE = 1.75;

/** A tick under 16px inside a box needs a heavier stroke than the default 2 to read. */
export const BOX_TICK_STROKE = 2.4;

export type MetaStatSize = "default" | "large";

export interface MetaStatProps {
	/** A tabler glyph at `size="100%"` — the box below decides how big it lands. */
	icon: ReactNode;
	children: ReactNode;
	size?: MetaStatSize;
	className?: string;
}

/**
 * One reading in a content meta row: a glyph and its value.
 *
 * It carries `ApplauseButton`'s metrics, so a row of these reads as one family
 * whatever it counts. Applause keeps its own markup because it is a button;
 * everything that only reports goes through here.
 */
export function MetaStat({
	icon,
	children,
	size = "default",
	className,
}: MetaStatProps) {
	return (
		<span
			className={[styles.stat, styles[size], className]
				.filter(Boolean)
				.join(" ")}
		>
			<span className={styles.iconWrap}>{icon}</span>
			<span className={styles.value}>{children}</span>
		</span>
	);
}
