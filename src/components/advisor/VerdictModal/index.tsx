"use client";

import { IconDeviceGamepad2 } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Alert, Flex, Modal, Skeleton, Typography } from "antd";
import dayjs from "dayjs";
import { dayRange } from "@/components/checkpoints/CheckpointCard/SprintTrack";
import { IconTile, StatusDot } from "@/components/ui";
import { formatShort } from "@/components/WorkflowPath/dates";
import { VERDICT_DRAFT_FROM_SPRINT } from "@/config/checkpoint";
import type { CheckpointVerdict } from "@/config/prisma-enums";
import { useAdvisorProject, useVerdictContext } from "@/hooks/checkpoints";
import {
	verdictDueBy,
	verdictOverdue,
	verdictSendOpensAt,
} from "@/lib/checkpoints/verdict-window";
import type {
	AdvisorCheckpointDto,
	AdvisorProjectDto,
	VerdictContextDto,
} from "@/types/checkpoints";
import { AiRead } from "./AiRead";
import { Devlogs } from "./Devlogs";
import { GoalCard } from "./GoalCard";
import { LastBuild } from "./LastBuild";
import { DirectionStrip, RunDifference } from "./RunChange";
import styles from "./style.module.scss";
import { TeamPulse } from "./TeamPulse";
import { VerdictForm } from "./VerdictForm";

const { Text } = Typography;

export type VerdictModalProps = {
	checkpoint: AdvisorCheckpointDto;
	onClose: () => void;
};

/**
 * An administrator writing the verdict a curator never sent (frames 11.8,
 * 11.8b): no draft, sending is open, and the refund for calls never held is
 * shown above the button.
 */
export type AdminVerdict = {
	missed: { provided: number; parts: number; refund: number } | null;
	send: (input: {
		verdict: CheckpointVerdict;
		note: string;
	}) => Promise<unknown>;
	sending: boolean;
};

/**
 * The human curator's verdict (frames `vC7gn`, `F041BL`): the evidence on the
 * left, the choice and its reasoning on the right. A draft can be kept from
 * sprint 4; sending opens with the final call and cannot be undone.
 */
export function VerdictModal({ checkpoint, onClose }: VerdictModalProps) {
	const { data: context } = useVerdictContext(checkpoint.id);
	const { data: project } = useAdvisorProject(checkpoint.id);

	return (
		<VerdictModalView
			checkpoint={checkpoint}
			context={context}
			project={project}
			onClose={onClose}
		/>
	);
}

export function VerdictModalView({
	checkpoint,
	context,
	project,
	onClose,
	admin,
}: VerdictModalProps & {
	context: VerdictContextDto | undefined;
	project: AdvisorProjectDto | undefined;
	admin?: AdminVerdict;
}) {
	const { t } = useTranslate();

	const stageName = (stage: { name: string; key: string | null }) =>
		stage.key ? t(stage.key, stage.name) : stage.name;

	return (
		<Modal
			open
			onCancel={onClose}
			footer={null}
			width={1048}
			centered
			classNames={{
				container: styles.container,
				header: styles.header,
				body: styles.body,
			}}
			title={
				<Flex vertical gap={8}>
					<Flex align="center" gap={12} wrap>
						<Text className={styles.title}>
							{t("advisor.verdict.title", "Write the verdict")}
						</Text>
						{context && <StageChip checkpoint={checkpoint} context={context} />}
					</Flex>
					<Flex align="center" gap={8} className={styles.meta}>
						<IconTile icon={IconDeviceGamepad2} size="xs" />
						<Text strong>{checkpoint.project.name}</Text>
						<Text type="secondary" className={styles.small}>
							{[
								t("checkpoints.number", "Checkpoint {number}", {
									number: checkpoint.number ?? checkpoint.order,
								}),
								context
									? stageName(context.currentStage)
									: checkpoint.stageName,
								checkpoint.startedAt && checkpoint.dueAt
									? dayRange(
											checkpoint.startedAt,
											checkpoint.dueAt,
											"D MMM YYYY",
										)
									: null,
							]
								.filter(Boolean)
								.join(" · ")}
						</Text>
					</Flex>
				</Flex>
			}
		>
			{!context || !project ? (
				<div className={styles.loading}>
					<Skeleton active paragraph={{ rows: 10 }} />
				</div>
			) : (
				<>
					{admin && (
						<Alert
							type="warning"
							showIcon
							className={styles.adminAlert}
							title={t(
								"admin.checkpoints.verdict.alert",
								"The curator did not send the verdict. You sign it as an administrator; the author sees it as the checkpoint's verdict.",
							)}
						/>
					)}
					<div className={styles.split}>
						<div className={styles.left}>
							{context.aiRead && <AiRead read={context.aiRead} />}
							<GoalCard checkpoint={checkpoint} />
							<DirectionStrip run={context.run} />
							{context.run.difference && (
								<RunDifference
									difference={context.run.difference}
									final={context.stage !== "draft"}
								/>
							)}
							<LastBuild checkpoint={checkpoint} build={context.lastBuild} />
							<Devlogs devlogs={project.devlogs} />
							<TeamPulse team={project.team} />
						</div>
						<div className={styles.right}>
							{admin ||
							context.stage === "draft" ||
							context.stage === "send" ? (
								<VerdictForm
									checkpoint={checkpoint}
									context={context}
									admin={admin}
									stages={
										context.nextStage
											? {
													from: stageName(context.currentStage),
													to: stageName(context.nextStage),
												}
											: null
									}
									onSent={onClose}
								/>
							) : (
								<Text type="secondary">
									{context.stage === "early"
										? t(
												"advisor.verdict.opensIn",
												"The verdict opens in sprint {n}.",
												{ n: VERDICT_DRAFT_FROM_SPRINT },
											)
										: t("advisor.verdict.alreadySent", "The verdict is sent.")}
								</Text>
							)}
						</div>
					</div>
				</>
			)}
		</Modal>
	);
}

function StageChip({
	checkpoint,
	context,
}: {
	checkpoint: AdvisorCheckpointDto;
	context: VerdictContextDto;
}) {
	const { t } = useTranslate();

	if (context.stage === "draft" && checkpoint.startedAt)
		return (
			<StatusDot
				tone="warning"
				label={t("advisor.verdict.chipDraft", "Draft · final call {date}", {
					date: dayjs(
						verdictSendOpensAt(checkpoint.startedAt, context.finalCall),
					).format("D MMM"),
				})}
			/>
		);

	if (context.stage === "send" && context.dueAt)
		return (
			<StatusDot
				tone="warning"
				label={
					verdictOverdue(context.dueAt)
						? t("advisor.verdict.chipOverdue", "Verdict overdue")
						: t("advisor.verdict.chipDue", "Verdict due by {date}", {
								date: formatShort(verdictDueBy(context.dueAt).toISOString()),
							})
				}
			/>
		);

	return null;
}
