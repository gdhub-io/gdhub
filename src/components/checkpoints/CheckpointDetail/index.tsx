"use client";

import { useTranslate } from "@tolgee/react";
import { Collapse, Flex, Skeleton, Typography } from "antd";
import { useParams } from "next/navigation";
import { Error404 } from "@/components/Error404";
import { CheckpointItemKind } from "@/config/prisma-enums";
import { useCheckpoint } from "@/hooks/checkpoints";
import { GoalCard } from "../GoalCard";
import styles from "./style.module.scss";

/**
 * A checkpoint that has been paid for and is on its way to a verdict.
 *
 * A draft never reaches this page — it lives in the start flow, at the step it
 * was left on. The action card, the pulse matrix and the thread arrive with the
 * cron and the AI curator, which is where their data comes from.
 */
export function CheckpointDetail() {
	const { t } = useTranslate();
	const params = useParams();

	const {
		data: checkpoint,
		isLoading,
		isError,
	} = useCheckpoint(params?.id as string | undefined);

	if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} />;
	if (isError || !checkpoint) return <Error404 />;

	const claimed = checkpoint.items.filter(
		(item) =>
			item.kind === CheckpointItemKind.Outcome && !item.cut && item.artifact,
	).length;
	const owed = checkpoint.items.filter(
		(item) => item.kind === CheckpointItemKind.Outcome && !item.cut,
	).length;

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
										{ claimed, owed },
									)}`}
								</Typography.Text>
							</Flex>
						),
						children: <GoalCard items={checkpoint.items} />,
					},
				]}
			/>

			{checkpoint.midNote && (
				<Typography.Paragraph className={styles.note}>
					{checkpoint.midNote}
				</Typography.Paragraph>
			)}
		</Flex>
	);
}
