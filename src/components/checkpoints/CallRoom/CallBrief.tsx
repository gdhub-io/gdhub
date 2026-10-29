"use client";

import { IconFlag, IconSparkles } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Alert, Flex, Typography } from "antd";
import dayjs from "dayjs";
import { EvidenceMatchTag } from "@/components/checkpoints/EvidenceMatchTag";
import { IconTile } from "@/components/ui";
import type {
	CallBrief as CallBriefData,
	CheckpointCallDto,
} from "@/types/checkpoint-call";
import { AdviceLine } from "./PlanForm";
import styles from "./style.module.scss";

/**
 * Frame 12.08.10, the "Before the call" tab: the AI's read of the sprint behind
 * a call, written the night before it (GDHUB-114), with the goal checked
 * against its stage and each task against the goal (GDHUB-125). Only the
 * curator is sent it.
 */
export function CallBrief({
	brief,
	tasks,
}: {
	brief: CallBriefData;
	tasks: CheckpointCallDto["plan"]["tasks"];
}) {
	const { t } = useTranslate();
	const { notes } = brief;
	const taskText = new Map(tasks.map((task) => [task.id, task.text]));
	const seen = new Map(brief.seen.map((row) => [row.itemId, row]));
	const offGoal = new Map(
		(brief.advice?.tasks ?? [])
			.filter((row) => row.kind === "offGoal")
			.map((row) => [row.itemId, row.note]),
	);
	const discussed = new Set(brief.notes.discussed.map((row) => row.itemId));
	const stage = brief.goal?.stage;

	const goalCheck = (itemId: string) =>
		offGoal.has(itemId) && <AdviceLine>{offGoal.get(itemId)}</AdviceLine>;

	return (
		<Flex vertical gap={12} className={styles.brief}>
			<Flex justify="space-between" align="center" gap={12}>
				<Flex gap={12} align="center">
					<IconTile icon={IconSparkles} size="sm" />
					<Typography.Text type="secondary" className={styles.small}>
						{t(
							"checkpoints.call.brief.subtitle",
							"Sprint {sprint} as the AI read it · only you see this",
							{ sprint: brief.index - 1 },
						)}
					</Typography.Text>
				</Flex>
				<Typography.Text type="secondary" className={styles.small}>
					{t("checkpoints.call.brief.written", "Written {date}", {
						date: dayjs(brief.writtenAt).format("D MMM"),
					})}
				</Typography.Text>
			</Flex>

			<Typography.Text>{notes.inShort}</Typography.Text>

			{stage && !stage.inside && (
				<Alert
					type="warning"
					showIcon
					icon={<IconFlag size={14} />}
					title={stage.note}
				/>
			)}

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
						{goalCheck(row.itemId)}
					</Flex>
				);
			})}

			{[...offGoal.keys()]
				.filter((itemId) => !discussed.has(itemId))
				.map((itemId) => (
					<Flex key={itemId} vertical gap={4} className={styles.briefTask}>
						<Typography.Text strong>{taskText.get(itemId)}</Typography.Text>
						{goalCheck(itemId)}
					</Flex>
				))}

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
		</Flex>
	);
}
