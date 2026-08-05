import { IconChevronRight } from "@tabler/icons-react";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./sidebarRow.module.scss";

export type HubSectionRowProps = {
	href: string;
	/** The 32px square on the left — an IconTile, an avatar, a cover swatch. */
	media?: ReactNode;
	/** Already-translated. */
	title: string;
	/** Already-translated. Omitted when there is nothing useful to say. */
	/** ReactNode so a row can carry something richer than text — a level meter,
	 * a status dot — without every card re-implementing the row. */
	subtitle?: ReactNode;
	target?: string;
};

/**
 * A row in a hub sidebar card: square, two lines, chevron.
 *
 * Every card was rendering its own version of this, which is how the titles
 * drifted to three different sizes. The square is a slot rather than a fixed
 * element because what it holds differs — a direction tile, a member avatar, a
 * project cover — but its size does not.
 */
export function HubSectionRow({
	href,
	media,
	title,
	subtitle,
	target,
}: HubSectionRowProps) {
	return (
		<Link href={href} target={target} className={styles.row}>
			<div className={styles.left}>
				{media}
				<div className={styles.text}>
					<div className={styles.primary} title={title}>
						{title}
					</div>
					{subtitle && (
						<div
							className={styles.secondary}
							title={typeof subtitle === "string" ? subtitle : undefined}
						>
							{subtitle}
						</div>
					)}
				</div>
			</div>
			<IconChevronRight size={14} className={styles.chevron} />
		</Link>
	);
}
