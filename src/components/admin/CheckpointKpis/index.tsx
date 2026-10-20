"use client";

import {
	type Icon,
	IconCash,
	IconReceiptRefund,
	IconRobot,
	IconWallet,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import kpi from "@/components/admin/Views/ViewsKpiCard.module.scss";
import { IconTile } from "@/components/ui";
import { formatCheckpointMoney } from "@/config/checkpoint-pricing";
import type { AdminCheckpointsPageDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

type Totals = AdminCheckpointsPageDto["totals"];

/** Above the admin checkpoints list: what came in, what went back, and who curates. */
export function CheckpointKpis({ totals }: { totals: Totals | undefined }) {
	const { t } = useTranslate();
	const curated = totals ? totals.ai + totals.human : 0;

	const cards: {
		key: string;
		icon: Icon;
		name: string;
		value: string;
		note: string;
	}[] = totals
		? [
				{
					key: "paid",
					icon: IconCash,
					name: t("admin.checkpoints.kpi.paid", "Paid"),
					value: formatCheckpointMoney(totals.paid),
					note: t(
						"admin.checkpoints.kpi.paidNote",
						"Taken from cards; holds aside",
					),
				},
				{
					key: "refunded",
					icon: IconReceiptRefund,
					name: t("admin.checkpoints.kpi.refunded", "Refunded"),
					value: formatCheckpointMoney(totals.refunded),
					note: t("admin.checkpoints.kpi.refundedNote", "Back to authors"),
				},
				{
					key: "net",
					icon: IconWallet,
					name: t("admin.checkpoints.kpi.net", "Net"),
					value: formatCheckpointMoney(totals.net),
					note: t(
						"admin.checkpoints.kpi.netNote",
						"Paid less refunded, before curators' fees",
					),
				},
				{
					key: "curators",
					icon: IconRobot,
					name: t("admin.checkpoints.kpi.curators", "AI · person"),
					value: `${totals.ai} · ${totals.human}`,
					note: t(
						"admin.checkpoints.kpi.curatorsNote",
						"{share}% with the AI curator",
						{
							share: curated ? Math.round((totals.ai / curated) * 100) : 0,
						},
					),
				},
			]
		: [];

	return (
		<div className={styles.grid}>
			{cards.map((card) => (
				<div key={card.key} className={kpi.card}>
					<div className={kpi.head}>
						<IconTile
							icon={card.icon}
							size="sm"
							tint="var(--gd-neutral-100)"
							ink="var(--gd-color-text-secondary)"
						/>
						<span className={kpi.name}>{card.name}</span>
					</div>
					<div className={kpi.figures}>
						<span className={kpi.total}>{card.value}</span>
						<span className={kpi.delta}>{card.note}</span>
					</div>
				</div>
			))}
		</div>
	);
}
