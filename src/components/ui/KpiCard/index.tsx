import type { Icon } from "@tabler/icons-react";
import type { ReactNode } from "react";
import kpi from "@/components/admin/Views/ViewsKpiCard.module.scss";
import { IconTile } from "../IconTile";

export type KpiCardProps = {
	icon: Icon;
	name: string;
	/** The big figure; leave out to lay out `children` yourself (a split bar). */
	value?: ReactNode;
	/** The caption under the figure. */
	note?: ReactNode;
	children?: ReactNode;
};

/** One metric card — the admin tabs' and the advisor's earnings alike. */
export function KpiCard({ icon, name, value, note, children }: KpiCardProps) {
	return (
		<div className={kpi.card}>
			<div className={kpi.head}>
				<IconTile
					icon={icon}
					size="sm"
					tint="var(--gd-neutral-100)"
					ink="var(--gd-color-text-secondary)"
				/>
				<span className={kpi.name}>{name}</span>
			</div>
			<div className={kpi.figures}>
				{value !== undefined && <span className={kpi.total}>{value}</span>}
				{note !== undefined && <span className={kpi.delta}>{note}</span>}
				{children}
			</div>
		</div>
	);
}
