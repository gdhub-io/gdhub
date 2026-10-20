"use client";

import {
	type Icon,
	IconCash,
	IconReceiptRefund,
	IconRobot,
	IconWallet,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Tooltip } from "antd";
import type { ReactNode } from "react";
import kpi from "@/components/admin/Views/ViewsKpiCard.module.scss";
import { IconTile } from "@/components/ui";
import { formatCheckpointMoney } from "@/config/checkpoint-pricing";
import type { AdminCheckpointsPageDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

type Totals = AdminCheckpointsPageDto["totals"];

function Card({
	icon,
	name,
	children,
}: {
	icon: Icon;
	name: string;
	children: ReactNode;
}) {
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
			<div className={kpi.figures}>{children}</div>
		</div>
	);
}

/** Above the admin checkpoints list: what was kept, what came in and went back, and who curates. */
export function CheckpointKpis({ totals }: { totals: Totals | undefined }) {
	const { t } = useTranslate();
	if (!totals) return null;

	const curated = totals.ai + totals.human;
	const aiShare = curated ? Math.round((totals.ai / curated) * 100) : 0;
	const money = [
		{
			key: "net",
			icon: IconWallet,
			name: t("admin.checkpoints.kpi.net", "Net"),
			value: totals.net,
			note: t(
				"admin.checkpoints.kpi.netNote",
				"Paid less refunded, before curators' fees",
			),
		},
		{
			key: "paid",
			icon: IconCash,
			name: t("admin.checkpoints.kpi.paid", "Paid"),
			value: totals.paid,
			note: t(
				"admin.checkpoints.kpi.paidNote",
				"Taken from cards; holds aside",
			),
		},
		{
			key: "refunded",
			icon: IconReceiptRefund,
			name: t("admin.checkpoints.kpi.refunded", "Refunded"),
			value: totals.refunded,
			note: t("admin.checkpoints.kpi.refundedNote", "Back to authors"),
		},
	];

	return (
		<div className={styles.grid}>
			{money.map((card) => (
				<Card key={card.key} icon={card.icon} name={card.name}>
					<span className={kpi.total}>
						{/* What goes back is money out: read at a glance as a minus. */}
						{card.key === "refunded" && card.value > 0 ? "−" : ""}
						{formatCheckpointMoney(card.value)}
					</span>
					<span className={kpi.delta}>{card.note}</span>
				</Card>
			))}

			<Card
				icon={IconRobot}
				name={t("admin.checkpoints.kpi.curators", "AI · person")}
			>
				<Tooltip
					title={t(
						"admin.checkpoints.kpi.curatorsCount",
						"{ai} with the AI curator · {human} with a person",
						{ ai: totals.ai, human: totals.human },
					)}
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
			</Card>
		</div>
	);
}
