import type { Icon } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { IconTile } from "../IconTile";
import styles from "./style.module.scss";

export type KpiCardProps = {
	icon: Icon;
	name: string;
	/** The big figure; leave out to lay out `children` yourself (a split bar). */
	value?: ReactNode;
	/** The caption under the figure. */
	note?: ReactNode;
	/** Bars the size of the figure and the caption, so nothing reflows when data lands. */
	loading?: boolean;
	children?: ReactNode;
};

/** One metric card — the admin tabs' and the advisor's earnings alike. */
export function KpiCard({
	icon,
	name,
	value,
	note,
	loading,
	children,
}: KpiCardProps) {
	return (
		<div className={styles.card}>
			<div className={styles.head}>
				<IconTile
					icon={icon}
					size="sm"
					tint="var(--gd-neutral-100)"
					ink="var(--gd-color-text-secondary)"
				/>
				<span className={styles.name}>{name}</span>
			</div>
			<div className={styles.figures}>
				{loading ? (
					<>
						<span className={styles.skeletonTotal} />
						<span className={styles.skeletonDelta} />
					</>
				) : (
					<>
						{value !== undefined && (
							<span className={styles.total}>{value}</span>
						)}
						{note !== undefined && <span className={styles.delta}>{note}</span>}
						{children}
					</>
				)}
			</div>
		</div>
	);
}
