"use client";

import { IconInfoCircle, IconTarget } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Tooltip, Typography } from "antd";
import styles from "./style.module.scss";

export type GoalStripProps = {
	goal: string;
};

/**
 * The goal on one quiet row, above everything a sprint asks.
 *
 * It repeats on every sprint on purpose — it is what the 28 days are judged
 * against, and a sprint is where an author forgets it. It is deliberately absent
 * from Inputs, where the outcome list is already the subject.
 */
export function GoalStrip({ goal }: GoalStripProps) {
	const { t } = useTranslate();

	return (
		<div className={styles.strip}>
			<IconTarget size={16} className={styles.icon} />
			<Typography.Text className={styles.label}>
				{t("checkpoints.goal.label", "Goal")}
			</Typography.Text>
			<Typography.Text type="secondary" ellipsis className={styles.text}>
				{goal}
			</Typography.Text>
			<Tooltip
				title={t(
					"checkpoints.goal.info",
					"Written on day 1 and agreed with the curator. It does not change for the rest of the checkpoint.",
				)}
			>
				<IconInfoCircle size={14} className={styles.icon} />
			</Tooltip>
		</div>
	);
}
