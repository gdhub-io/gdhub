"use client";

import {
	IconCash,
	IconPigMoney,
	IconReceiptRefund,
	IconRobot,
	IconServerCog,
	IconUserDollar,
	IconWallet,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Tooltip } from "antd";
import { KpiCard, KpiSplit } from "@/components/ui";
import { RATINGS_BEFORE_AVERAGE } from "@/config/checkpoint";
import {
	formatCheckpointMoney,
	formatMoneyCents,
	formatMoneyWhole,
	moneyOut,
	signedMoney,
} from "@/config/checkpoint-pricing";
import type { AdminCheckpointsPageDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

type Totals = AdminCheckpointsPageDto["totals"];

/** Above the admin checkpoints list: what came in and went out, what was kept, and who curates. */
export function CheckpointKpis({ totals }: { totals: Totals | undefined }) {
	const { t } = useTranslate();
	if (!totals) return null;

	const curated = totals.ai + totals.human;
	const aiShare = curated ? Math.round((totals.ai / curated) * 100) : 0;
	// 13.6g (`bhkcn`): a share only once five AI verdicts are rated.
	const aiHealth =
		totals.aiRated >= RATINGS_BEFORE_AVERAGE
			? t(
					"admin.checkpoints.kpi.aiRatedLow",
					"AI verdicts rated 1–2: {share}% of {count} rated",
					{
						share: Math.round((totals.aiRatedLow / totals.aiRated) * 100),
						count: totals.aiRated,
					},
				)
			: totals.aiRated > 0
				? t(
						"admin.checkpoints.kpi.aiRatedFew",
						"{count, plural, one {# AI verdict rated} other {# AI verdicts rated}} — too few to say",
						{ count: totals.aiRated },
					)
				: null;
	const money = [
		{
			key: "net",
			icon: IconWallet,
			name: t("admin.checkpoints.kpi.net", "Net"),
			value: formatCheckpointMoney(totals.net),
			note: t("admin.checkpoints.kpi.netNoteShort", "Paid less refunded"),
		},
		{
			key: "paid",
			icon: IconCash,
			name: t("admin.checkpoints.kpi.paid", "Paid"),
			value: formatCheckpointMoney(totals.paid),
			note: t("admin.checkpoints.kpi.paidNoteShort", "Captured, not holds"),
		},
		{
			key: "refunded",
			icon: IconReceiptRefund,
			name: t("admin.checkpoints.kpi.refunded", "Refunded"),
			value: moneyOut(totals.refunded),
			note: t("admin.checkpoints.kpi.refundedNote", "Back to authors"),
		},
		{
			key: "fees",
			icon: IconUserDollar,
			name: t("admin.checkpoints.kpi.fees", "Fees"),
			value: moneyOut(totals.fees),
			note: t("admin.checkpoints.kpi.feesNote", "Earned by curators"),
		},
	];

	return (
		<div className={styles.grid}>
			{money.map((card) => (
				<KpiCard
					key={card.key}
					icon={card.icon}
					name={card.name}
					value={card.value}
					note={card.note}
				/>
			))}

			<KpiCard
				icon={IconServerCog}
				name={t("admin.checkpoints.kpi.runningCost", "Running cost")}
				value={moneyOut(totals.calls + totals.aiCost)}
			>
				<Tooltip
					title={t(
						"admin.checkpoints.kpi.runningCostTooltip",
						"Calls {calls} · AI tokens {ai}",
						{
							calls: formatMoneyCents(totals.calls),
							ai: formatMoneyCents(totals.aiCost),
						},
					)}
				>
					<div className={styles.costs}>
						<span className={styles.key}>
							<i className={styles.calls} />
							{t("admin.checkpoints.kpi.calls", "Calls")}
							<b>{formatMoneyWhole(totals.calls)}</b>
						</span>
						<span className={styles.key}>
							<i className={styles.ai} />
							{t("admin.checkpoints.kpi.ai", "AI")}
							<b>{formatMoneyWhole(totals.aiCost)}</b>
						</span>
					</div>
				</Tooltip>
			</KpiCard>

			<KpiCard
				icon={IconPigMoney}
				name={t("admin.checkpoints.kpi.margin", "Margin")}
				value={signedMoney(totals.margin)}
				note={t("admin.checkpoints.kpi.marginNote", "On closed checkpoints")}
			/>

			<KpiCard
				icon={IconRobot}
				name={t("admin.checkpoints.kpi.curators", "AI · person")}
			>
				<KpiSplit
					spread
					tooltip={
						<div className={styles.tip}>
							<span>
								{t(
									"admin.checkpoints.kpi.curatorsCount",
									"{ai} with the AI curator · {human} with a person",
									{ ai: totals.ai, human: totals.human },
								)}
							</span>
							{aiHealth && <span className={styles.health}>{aiHealth}</span>}
						</div>
					}
					parts={[
						{
							key: "ai",
							label: t("admin.checkpoints.kpi.ai", "AI"),
							value: curated ? `${aiShare}%` : "—",
							count: totals.ai,
							color: "var(--gd-chart-series-1)",
						},
						{
							key: "person",
							label: t("admin.checkpoints.kpi.person", "Person"),
							value: curated ? `${100 - aiShare}%` : "—",
							count: totals.human,
							color: "var(--gd-chart-series-2)",
						},
					]}
				/>
			</KpiCard>
		</div>
	);
}
