"use client";

import { IconCalendar, IconTarget, IconUser } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Typography } from "antd";
import { Fragment, type ReactNode } from "react";
import {
	CHECKPOINT_AI_PRICE,
	CHECKPOINT_DAYS,
	CHECKPOINT_PRICE_CURRENCY,
} from "@/config/checkpoint";
import styles from "./EntryFacts.module.scss";

/** "from" until a curator is chosen, then the amount; the paid screens say what happened to it. */
export type EntryPrice = {
	kind: "from" | "chosen" | "paid" | "reserved";
	amount: number;
};

export type EntryFactsProps = {
	price?: EntryPrice;
};

/** What is being bought, on every page of the way in — the project is not part of it. */
export function EntryFacts({
	price = { kind: "from", amount: CHECKPOINT_AI_PRICE },
}: EntryFactsProps) {
	const { t } = useTranslate();
	const amount = `${CHECKPOINT_PRICE_CURRENCY}${price.amount}`;

	const priceLabel = () => {
		switch (price.kind) {
			case "chosen":
				return t("checkpointEntry.fact.priceChosen", "{price}", {
					price: amount,
				});
			case "paid":
				return t("checkpointEntry.fact.pricePaid", "{price} paid", {
					price: amount,
				});
			case "reserved":
				return t("checkpointEntry.fact.priceReserved", "{price} reserved", {
					price: amount,
				});
			default:
				return t("checkpointEntry.fact.priceFrom", "from {price}", {
					price: amount,
				});
		}
	};

	const facts: { key: string; node: ReactNode }[] = [
		{
			key: "days",
			node: (
				<span className={styles.fact}>
					<IconCalendar size={16} />
					{t("checkpointEntry.fact.days", "{days} days", {
						days: CHECKPOINT_DAYS,
					})}
				</span>
			),
		},
		{
			key: "goal",
			node: (
				<span className={styles.fact}>
					<IconTarget size={16} />
					{t("checkpointEntry.fact.goal", "One goal")}
				</span>
			),
		},
		{
			key: "curator",
			node: (
				<span className={styles.fact}>
					<IconUser size={16} />
					{t("checkpointEntry.fact.curator", "Expert or AI curator")}
				</span>
			),
		},
		{
			key: "price",
			node: <span className={styles.price}>{priceLabel()}</span>,
		},
	];

	return (
		<Typography.Text className={styles.facts}>
			{facts.map((fact, index) => (
				<Fragment key={fact.key}>
					{index > 0 && (
						<span className={styles.separator} aria-hidden>
							·
						</span>
					)}
					{fact.node}
				</Fragment>
			))}
		</Typography.Text>
	);
}
