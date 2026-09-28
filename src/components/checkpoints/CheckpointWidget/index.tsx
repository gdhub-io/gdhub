"use client";

import { IconFlag, IconPhoneCall } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Card, Flex, Skeleton, Typography } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { useAccess } from "@/components/access/AccessProvider";
import { IconTile, ViewAllLink } from "@/components/ui";
import { CheckpointStatus } from "@/config/prisma-enums";
import { useCheckpoints } from "@/hooks/checkpoints";
import { dateOfDay, VERDICT_DAY } from "@/lib/checkpoint-plan";
import { sprintDayRange, sprintOfDay } from "@/lib/checkpoint-sprints";
import type { CheckpointDto } from "@/types/checkpoints";
import { CheckpointStatusSlot } from "../CheckpointStatusSlot";
import { CuratorBadge } from "../CuratorBadge";
import { StartCheckpointButton } from "../StartCheckpointButton";
import styles from "./style.module.scss";

const { Text } = Typography;

export type CheckpointWidgetProps = {
	projectId: string;
	projectSlug: string;
};

/**
 * The checkpoint on the Workflow page — frame `TfVJG` in `IUy75`, states
 * `kSXbn` … `YOhx7`. It says where the 28 days stand and when the next call
 * is; what the author owes by a date is a task in the list below it.
 *
 * Secondary to the task list below it, so an error hides it rather than
 * putting a failure above the work.
 */
export function CheckpointWidget({
	projectId,
	projectSlug,
}: CheckpointWidgetProps) {
	const { can } = useAccess();
	const allowed = can("project.checkpoints.view");
	const { data, isPending, isError } = useCheckpoints(
		allowed ? projectId : undefined,
	);

	if (!allowed || isError) return null;

	if (isPending) {
		return (
			<Card className={styles.card}>
				<Skeleton active avatar={{ shape: "square" }} paragraph={{ rows: 1 }} />
			</Card>
		);
	}

	return (
		<CheckpointWidgetView
			checkpoint={data?.current ?? null}
			projectId={projectId}
			projectSlug={projectSlug}
		/>
	);
}

export type CheckpointWidgetViewProps = CheckpointWidgetProps & {
	checkpoint: CheckpointDto | null;
};

/** The widget for one state, apart from fetching it — what the stories draw. */
export function CheckpointWidgetView({
	checkpoint,
	projectId,
	projectSlug,
}: CheckpointWidgetViewProps) {
	const { t } = useTranslate();
	const base = `/user/project/${projectSlug}/checkpoints`;

	if (!checkpoint) {
		return (
			<Card className={styles.card}>
				<Flex vertical gap={16}>
					<Flex gap={12} align="center">
						<IconTile icon={IconFlag} size="sm" />
						<Flex vertical gap={4}>
							<Text className={styles.title}>
								{t("checkpoints.widget.title", "Checkpoint")}
							</Text>
							<Text type="secondary" className={styles.meta}>
								{t(
									"checkpoints.widget.none",
									"Plan the next 28 days with a curator.",
								)}
							</Text>
						</Flex>
					</Flex>
					<div>
						<StartCheckpointButton
							projectId={projectId}
							projectSlug={projectSlug}
							label={t("checkpoints.widget.plan", "Plan a checkpoint")}
						/>
					</div>
				</Flex>
			</Card>
		);
	}

	const href = `${base}/${checkpoint.id}`;
	const { startedAt, day, status } = checkpoint;
	const date = (dayNumber: number, format = "ddd, D MMM") =>
		startedAt ? dayjs.utc(dateOfDay(startedAt, dayNumber)).format(format) : "";

	const running = status === CheckpointStatus.Active && !!startedAt && !!day;
	const sprint = running ? sprintOfDay(day) : null;
	const sprintLine =
		sprint &&
		t("checkpoints.widget.sprint", "Sprint {n} · {from} – {to}", {
			n: sprint,
			from: date(sprintDayRange(sprint).firstDay, "D MMM"),
			to: date(sprintDayRange(sprint).lastDay, "D MMM"),
		});

	// A call is not ticked off, so it stays here; a devlog is a task in the list.
	const call =
		running && checkpoint.next?.kind === "call" ? checkpoint.next : null;

	return (
		<Card className={styles.card}>
			<Flex vertical gap={16}>
				<Flex gap={12} align="center">
					<IconTile icon={IconFlag} size="sm" />
					<Flex vertical gap={4} className={styles.head}>
						<Text className={styles.title} ellipsis>
							{t("checkpoints.widget.named", "Checkpoint {n} · {stage}", {
								n: checkpoint.order,
								stage: checkpoint.stageName,
							})}
						</Text>
						<Flex gap={8} align="center" wrap>
							<CheckpointStatusSlot checkpoint={checkpoint} />
							{sprintLine && (
								<Text type="secondary" className={styles.meta}>
									{sprintLine}
								</Text>
							)}
						</Flex>
						{call && (
							<Flex gap={6} align="center">
								<IconPhoneCall size={14} className={styles.callIcon} />
								<Text type="secondary" className={styles.meta}>
									{t(
										"checkpoints.widget.callOn",
										"Call {n} with the curator · {date}",
										{ n: call.call, date: date(call.day) },
									)}
								</Text>
							</Flex>
						)}
					</Flex>
				</Flex>

				{status === CheckpointStatus.Draft && (
					<div>
						<Link href={href}>
							<Button type="primary">
								{t("checkpoints.widget.continue", "Continue preparing")}
							</Button>
						</Link>
					</div>
				)}

				{status === CheckpointStatus.AwaitingCurator && (
					<CuratorBadge
						kind={checkpoint.curatorKind}
						curator={checkpoint.curator}
					/>
				)}

				{status === CheckpointStatus.Review && (
					<Text type="secondary">
						{t(
							"checkpoints.widget.verdictBy",
							"The curator writes it by {date}.",
							{ date: date(VERDICT_DAY, "D MMM") },
						)}
					</Text>
				)}

				{status !== CheckpointStatus.Draft && (
					<Flex justify="flex-end">
						<ViewAllLink
							href={href}
							label={t("checkpoints.open", "Open checkpoint")}
						/>
					</Flex>
				)}
			</Flex>
		</Card>
	);
}
