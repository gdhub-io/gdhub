"use client";

import { useTranslate } from "@tolgee/react";
import { Grid, Steps, Typography } from "antd";
import styles from "./PurchaseSteps.module.scss";

export type PurchaseStepsProps = {
	/** Index of the open question; past the last one, every step reads done. */
	current: number;
};

/**
 * Goal · Curator · Payment, in the onboarding look: a dot and a label per step,
 * the accent on what is done and what is open. Below 600px it folds into one
 * line, "Step 2 of 3 · Curator".
 */
export function PurchaseSteps({ current }: PurchaseStepsProps) {
	const { t } = useTranslate();
	const screens = Grid.useBreakpoint();

	const titles = [
		t("checkout.step.goal", "Goal"),
		t("checkout.step.curator", "Curator"),
		t("checkout.step.payment", "Payment"),
	];

	if (!screens.sm) {
		if (current >= titles.length) return null;

		return (
			<Typography.Text className={styles.compact}>
				{t("checkout.step.ofTotal", "Step {current} of {total} · {name}", {
					current: current + 1,
					total: titles.length,
					name: titles[current],
				})}
			</Typography.Text>
		);
	}

	return (
		<Steps
			size="small"
			current={current}
			className={styles.steps}
			items={titles.map((title, index) => ({
				title,
				icon: (
					<span
						className={styles.dot}
						data-reached={index <= current || undefined}
					/>
				),
			}))}
		/>
	);
}
