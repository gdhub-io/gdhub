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
import { KpiCard } from "@/components/ui";
import {
	CHECKPOINT_MINOR_UNITS,
	CHECKPOINT_PRICE_CURRENCY,
} from "@/config/checkpoint";
import { formatCheckpointMoney } from "@/config/checkpoint-pricing";
import type { AdminCheckpointsPageDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

type Totals = AdminCheckpointsPageDto["totals"];

const AI_RATED_ENOUGH = 5;

/** Money out reads at a glance as a minus. */
const out = (minor: number) =>
	`${minor > 0 ? "−" : ""}${formatCheckpointMoney(Math.round(minor))}`;

const signed = (minor: number) =>
	`${minor < 0 ? "−" : ""}${formatCheckpointMoney(Math.abs(Math.round(minor)))}`;

const wholeDollars = (minor: number) =>
	`${CHECKPOINT_PRICE_CURRENCY}${Math.round(minor / CHECKPOINT_MINOR_UNITS).toLocaleString("en-US")}`;

const cents = (minor: number) =>
	`${CHECKPOINT_PRICE_CURRENCY}${(Math.round(minor) / CHECKPOINT_MINOR_UNITS).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Above the admin checkpoints list: what came in and went out, what was kept, and who curates. */
export function CheckpointKpis({ totals }: { totals: Totals | undefined }) {
	const { t } = useTranslate();
	if (!totals) return null;

	const curated = totals.ai + totals.human;
	const aiShare = curated ? Math.round((totals.ai / curated) * 100) : 0;
	// 13.6g (`bhkcn`): a share only once five AI verdicts are rated.
	const aiHealth =
		totals.aiRated >= AI_RATED_ENOUGH
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
			value: out(totals.refunded),
			note: t("admin.checkpoints.kpi.refundedNote", "Back to authors"),
		},
		{
			key: "fees",
			icon: IconUserDollar,
			name: t("admin.checkpoints.kpi.fees", "Fees"),
			value: out(totals.fees),
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
				value={out(totals.calls + totals.aiCost)}
			>
				<Tooltip
					title={t(
						"admin.checkpoints.kpi.runningCostTooltip",
						"Calls {calls} · AI tokens {ai}",
						{ calls: cents(totals.calls), ai: cents(totals.aiCost) },
					)}
				>
					<div className={styles.costs}>
						<span className={styles.key}>
							<i className={styles.calls} />
							{t("admin.checkpoints.kpi.calls", "Calls")}
							<b>{wholeDollars(totals.calls)}</b>
						</span>
						<span className={styles.key}>
							<i className={styles.ai} />
							{t("admin.checkpoints.kpi.ai", "AI")}
							<b>{wholeDollars(totals.aiCost)}</b>
						</span>
					</div>
				</Tooltip>
			</KpiCard>

			<KpiCard
				icon={IconPigMoney}
				name={t("admin.checkpoints.kpi.margin", "Margin")}
				value={signed(totals.margin)}
				note={t("admin.checkpoints.kpi.marginNote", "On closed checkpoints")}
			/>

			<KpiCard
				icon={IconRobot}
				name={t("admin.checkpoints.kpi.curators", "AI · person")}
			>
				<Tooltip
					title={
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
				>
					<div className={styles.mix}>
						<div className={styles.split}>
							{curated > 0 && (
								<>
									<span className={styles.ai} style={{ flexGrow: totals.ai }} />
									<span
										className={styles.human}
										style={{ flexGrow: totals.human }}
									/>
								</>
							)}
						</div>
						<div className={styles.legend}>
							<span className={styles.key}>
								<i className={styles.ai} />
								{t("admin.checkpoints.kpi.ai", "AI")}
								<b>{curated ? `${aiShare}%` : "—"}</b>
							</span>
							<span className={styles.key}>
								<i className={styles.human} />
								{t("admin.checkpoints.kpi.person", "Person")}
								<b>{curated ? `${100 - aiShare}%` : "—"}</b>
							</span>
						</div>
					</div>
				</Tooltip>
			</KpiCard>
		</div>
	);
}
