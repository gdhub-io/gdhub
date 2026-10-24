"use client";

import { IconSparkles } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Flex, Typography } from "antd";
import dayjs from "dayjs";
import { EvidenceMatchTag } from "@/components/checkpoints/EvidenceMatchTag";
import { IconTile } from "@/components/ui";
import type { CheckpointCallDto } from "@/repositories/checkpoint-call";
import styles from "./style.module.scss";

/**
 * Frame 08.10: the AI's read of the sprint behind a call, written the night
 * before it (GDHUB-114). Only the curator is sent it.
 */
export function CallBrief({
	brief,
	tasks,
	sprint,
}: {
	brief: NonNullable<CheckpointCallDto["brief"]>;
	tasks: CheckpointCallDto["plan"]["tasks"];
	sprint: number;
}) {
	const { t } = useTranslate();
	const { notes } = brief;
	const taskText = new Map(tasks.map((task) => [task.id, task.text]));
	const seen = new Map(brief.seen.map((row) => [row.itemId, row]));

	return (
		<section className={styles.brief}>
			<Flex justify="space-between" align="center" gap={12}>
				<Flex gap={12} align="center">
					<IconTile icon={IconSparkles} size="sm" />
					<Flex vertical>
						<Typography.Text strong>
							{t("checkpoints.call.brief.title", "Before the call")}
						</Typography.Text>
						<Typography.Text type="secondary" className={styles.small}>
							{t(
								"checkpoints.call.brief.subtitle",
								"Sprint {sprint} as the AI read it · only you see this",
								{ sprint },
							)}
						</Typography.Text>
					</Flex>
				</Flex>
				<Typography.Text type="secondary" className={styles.small}>
					{t("checkpoints.call.brief.written", "Written {date}", {
						date: dayjs(brief.writtenAt).format("D MMM"),
					})}
				</Typography.Text>
			</Flex>

			<Typography.Text>{notes.inShort}</Typography.Text>

			{notes.discussed.map((row) => {
				const match = seen.get(row.itemId);
				return (
					<Flex key={row.itemId} vertical gap={4} className={styles.briefTask}>
						<Flex gap={8} align="center" wrap>
							<Typography.Text strong>
								{taskText.get(row.itemId)}
							</Typography.Text>
							{match && <EvidenceMatchTag match={match.match} />}
						</Flex>
						<Typography.Text type="secondary" className={styles.small}>
							{row.text}
						</Typography.Text>
					</Flex>
				);
			})}

			{notes.questions.length > 0 && (
				<Flex vertical gap={6} className={styles.briefRaise}>
					<Typography.Text type="secondary" strong className={styles.small}>
						{t("checkpoints.call.brief.raise", "Worth raising")}
					</Typography.Text>
					{notes.questions.map((question) => (
						<Typography.Text key={question} className={styles.small}>
							• {question}
						</Typography.Text>
					))}
				</Flex>
			)}
		</section>
	);
}
