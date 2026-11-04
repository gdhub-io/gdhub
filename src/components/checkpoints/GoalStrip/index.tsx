"use client";

import { IconInfoCircle, IconTarget } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Card, Flex, Tooltip, Typography } from "antd";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import styles from "./style.module.scss";

export type GoalStripProps = {
	goal: string;
	/** An AI curator holds no calls, so its note names none. */
	curatorKind?: CheckpointCuratorKind;
};

/**
 * The goal on one quiet row, above everything a sprint asks.
 *
 * It repeats on every sprint on purpose — it is what the 28 days are judged
 * against, and a sprint is where an author forgets it. On Inputs it is written
 * out in full instead, above the list that spells it out.
 */
export function GoalStrip({ goal, curatorKind }: GoalStripProps) {
	const { t } = useTranslate();

	return (
		<Card size="small">
			<Flex align="center" gap={8}>
				<IconTarget size={16} className={styles.icon} />
				<Typography.Text className={styles.label}>
					{t("checkpoints.goal.label", "Goal")}
				</Typography.Text>
				<Typography.Text type="secondary" ellipsis className={styles.text}>
					{goal}
				</Typography.Text>
				<Tooltip
					title={
						curatorKind === CheckpointCuratorKind.AI
							? t(
									"checkpoints.goal.infoAdjustAI",
									"Written on day 1 and checked by the AI curator. It can be adjusted on the first day of sprint 3, until the end of that day.",
								)
							: t(
									"checkpoints.goal.infoAdjust",
									"Written on day 1 and agreed with the curator. It can be adjusted on the first day of sprint 3: on the call, where you and the curator look back at the sprints so far, and until the end of that day.",
								)
					}
				>
					<IconInfoCircle size={14} className={styles.icon} />
				</Tooltip>
			</Flex>
		</Card>
	);
}
