"use client";

import { IconArrowDownRight, IconArrowUpRight } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Tooltip } from "antd";
import { IconTile } from "@/components/ui";
import { formatCount } from "@/helpers/format";
import type { ViewReportSubject } from "@/types/admin-views";
import { DASH, deltaPercent, formatDelta } from "./format";
import styles from "./ViewsKpiCard.module.scss";
import { viewSubjectMeta } from "./viewSubjects";

type ViewsKpiCardProps = {
	subject: ViewReportSubject;
	total: number;
	/** `null` when the preceding window falls outside retention. */
	previousTotal: number | null;
	loading?: boolean;
};

/**
 * One content type in the selected period: a tile, the name, the total and how
 * it moved.
 *
 * The delta is derived here rather than passed in so the card can also say *why*
 * it is a dash — "we have no previous window" and "the previous window was zero"
 * print the same mark and are not the same fact.
 *
 * The movement is neutral on purpose: red is destructive and failed, and a red
 * KPI on an operator's dashboard reads as "something broke" rather than "fewer
 * people opened the blog last week".
 */
export function ViewsKpiCard({
	subject,
	total,
	previousTotal,
	loading,
}: ViewsKpiCardProps) {
	const { t } = useTranslate();
	const meta = viewSubjectMeta(subject);
	const delta = deltaPercent(total, previousTotal);
	const Arrow =
		delta !== null && delta < 0 ? IconArrowDownRight : IconArrowUpRight;

	const dashReason =
		previousTotal === null
			? t(
					"admin.views.kpi.delta.unknown",
					"The previous period is outside the 90-day window, so there is nothing to compare with.",
				)
			: t(
					"admin.views.kpi.delta.fromZero",
					"The previous period counted no views, so there is no percentage to show.",
				);

	return (
		<div className={styles.card}>
			<div className={styles.head}>
				<IconTile
					icon={meta.icon}
					size="sm"
					tint="var(--gd-neutral-100)"
					ink="var(--gd-color-text-secondary)"
				/>
				<span className={styles.name}>{t(meta.labelKey, meta.label)}</span>
			</div>
			{loading ? (
				<div className={styles.figures}>
					<span className={styles.skeletonTotal} />
					<span className={styles.skeletonDelta} />
				</div>
			) : (
				<div className={styles.figures}>
					<span className={styles.total}>{formatCount(total)}</span>
					{delta === null ? (
						<Tooltip title={dashReason}>
							<span className={styles.delta}>{DASH}</span>
						</Tooltip>
					) : (
						<span className={styles.delta}>
							{delta !== 0 && <Arrow size={14} stroke={2} />}
							{formatDelta(delta)}
						</span>
					)}
				</div>
			)}
		</div>
	);
}
