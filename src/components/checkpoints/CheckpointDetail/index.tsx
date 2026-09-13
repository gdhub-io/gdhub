"use client";

import { useTranslate } from "@tolgee/react";
import { Collapse, Flex, Typography } from "antd";
import { CheckpointItemKind } from "@/config/prisma-enums";
import type { CheckpointDto } from "@/types/checkpoints";
import { CheckpointThread } from "../CheckpointThread";
import { GoalCard } from "../GoalCard";
import styles from "./style.module.scss";

export type CheckpointDetailProps = {
	checkpoint: CheckpointDto;
};

/**
 * A checkpoint that has been paid for and is on its way to a verdict.
 *
 * A draft never reaches this page — it lives in the start flow, at the step it
 * was left on. The action card, the pulse matrix and the thread arrive with the
 * cron and the AI curator, which is where their data comes from.
 */
export function CheckpointDetail({ checkpoint }: CheckpointDetailProps) {
	const { t } = useTranslate();

	const outcomes = checkpoint.items.filter(
		(item) => item.kind === CheckpointItemKind.Outcome && !item.cut,
	);
	const claimed = outcomes.filter((item) => item.artifact).length;

	return (
		<Flex vertical gap={16}>
			<Collapse
				items={[
					{
						key: "goal",
						// One line: what these 28 days are for, and how much of it is
						// already proven. The card itself is behind the chevron — the
						// page is for what has to happen now, not for re-reading.
						label: (
							<Flex gap={8} align="center" className={styles.summary}>
								<Typography.Text strong>
									{t("checkpoints.goal.section", "Goal")}
								</Typography.Text>
								<Typography.Text type="secondary" ellipsis>
									{checkpoint.goal}
								</Typography.Text>
								<Typography.Text type="secondary" className={styles.claimed}>
									{`· ${t(
										"checkpoints.goal.claimed",
										"{claimed} of {owed} outcomes claimed",
										{ claimed, owed: outcomes.length },
									)}`}
								</Typography.Text>
							</Flex>
						),
						children: <GoalCard items={checkpoint.items} />,
					},
				]}
			/>

			<CheckpointThread checkpoint={checkpoint} />
		</Flex>
	);
}
