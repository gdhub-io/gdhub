import { Tooltip } from "antd";
import type { ReactNode } from "react";
import styles from "./style.module.scss";

export type KpiSplitPart = {
	key: string;
	label: ReactNode;
	/** What the legend prints beside the label. */
	value: ReactNode;
	/** The part's share of the bar. */
	count: number;
	/** A `var(--gd-*)` colour for the segment and its legend dot. */
	color: string;
};

export type KpiSplitProps = {
	parts: KpiSplitPart[];
	/** The exact counts, on hover. */
	tooltip?: ReactNode;
	/** Push the legend keys to the card's edges instead of packing them left. */
	spread?: boolean;
};

/** A KpiCard's body as one bar split into parts, with a legend under it. */
export function KpiSplit({ parts, tooltip, spread }: KpiSplitProps) {
	const total = parts.reduce((sum, part) => sum + part.count, 0);

	return (
		<Tooltip title={tooltip}>
			<div className={styles.mix}>
				<div className={styles.split}>
					{total > 0 &&
						parts.map((part) => (
							<span
								key={part.key}
								className={styles.segment}
								style={{ flexGrow: part.count, background: part.color }}
							/>
						))}
				</div>
				<div className={`${styles.legend} ${spread ? styles.spread : ""}`}>
					{parts.map((part) => (
						<span key={part.key} className={styles.key}>
							<i style={{ background: part.color }} />
							{part.label}
							<b>{part.value}</b>
						</span>
					))}
				</div>
			</div>
		</Tooltip>
	);
}
