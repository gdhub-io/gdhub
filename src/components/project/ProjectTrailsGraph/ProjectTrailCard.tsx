"use client";

import { IconExternalLink } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	Badge,
	Button,
	Divider,
	Flex,
	Progress,
	Tooltip,
	Typography,
} from "antd";
import { initials } from "@/components/project/cards/parts";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { CHECKPOINT_DAYS } from "@/config/checkpoint";
import { checkpointProgress } from "@/lib/checkpoints/days";
import type { TrailPoint } from "@/lib/workflow/project-trails";
import type { ProjectTrailDto } from "@/types/project-trails";
import styles from "./ProjectTrailCard.module.scss";
import {
	CHECKPOINT_COLOR,
	TRAIL_STATUS_COLOR,
	useTrailStatusLabels,
} from "./status";

/**
 * Frame 01.15.5 (component HezEl): what the clicked point means comes first,
 * the project it belongs to is a compact row underneath.
 */
export function ProjectTrailCard({
	project,
	point,
	now = new Date(),
}: {
	project: ProjectTrailDto;
	/** The point that was clicked on the project's road. */
	point: Pick<TrailPoint, "kind" | "stage" | "stageIndex" | "checkpoint">;
	now?: Date;
}) {
	const { t } = useTranslate();
	const statusLabels = useTrailStatusLabels();
	const statusColor = TRAIL_STATUS_COLOR[project.status];
	const stage = point.stage ?? "";
	const index = point.stageIndex ?? 0;
	const checkpoint = point.checkpoint;
	const order = checkpoint?.order;
	const { day, daysLeft } = checkpointProgress(
		checkpoint?.startedAt ? new Date(checkpoint.startedAt) : null,
		now,
	);
	const isCurrent = index === project.stages.length - 1;
	const next = isCurrent ? project.nextStage : project.stages[index + 1]?.name;
	const withNext = (line: string) =>
		next
			? `${line} · ${t("lab.projectTrails.next", "next: {stage}", { stage: next })}`
			: line;
	const position = t("lab.projectTrails.stageOf", "Stage {n} of {count}", {
		n: project.stages[index]?.number ?? index + 1,
		count: project.stageCount,
	});

	const meaning = (): { title: string; line: string } => {
		switch (point.kind) {
			case "now":
				return {
					title: t(
						"lab.projectTrails.card.checkpointDay",
						"Checkpoint {order} · day {day} of {total}",
						{ order, day: day ?? 1, total: CHECKPOINT_DAYS },
					),
					line: stage,
				};
			case "checkpointEnd":
				return {
					title: t(
						"lab.projectTrails.card.checkpointEnds",
						"Checkpoint {order} ends in {left} days",
						{ order, left: daysLeft ?? CHECKPOINT_DAYS },
					),
					line: stage,
				};
			case "checkpoint":
				return checkpoint?.status === "review"
					? {
							title: t(
								"lab.projectTrails.card.checkpointReview",
								"Checkpoint {order} · in review",
								{ order },
							),
							line: t(
								"lab.projectTrails.card.reviewLine",
								"{total} days done, waiting for the verdict",
								{ total: CHECKPOINT_DAYS },
							),
						}
					: {
							title: t(
								"lab.projectTrails.card.checkpointClosed",
								"Checkpoint {order} · closed",
								{ order },
							),
							line: `${stage} · ${t("lab.projectTrails.card.days", "{total} days", { total: CHECKPOINT_DAYS })}`,
						};
			case "stageGoal":
				return {
					title: t("lab.projectTrails.card.stageDone", "{stage} done", {
						stage,
					}),
					line: withNext(
						t("lab.projectTrails.card.stageGoal", "The goal of this stage"),
					),
				};
			default:
				return isCurrent
					? {
							title: t(
								"lab.projectTrails.card.workingOn",
								"Working on {stage}",
								{
									stage,
								},
							),
							line: position,
						}
					: {
							title: t(
								"lab.projectTrails.card.completed",
								"{stage} · completed",
								{
									stage,
								},
							),
							line: withNext(position),
						};
		}
	};
	const { title, line } = meaning();

	return (
		<Flex vertical gap={12} className={styles.card}>
			<Flex vertical gap={4}>
				<Flex align="center" gap={8}>
					{/* ui-guard-ignore the point's glyph on the graph, drawn in frame 01.15.5 */}
					<span
						className={styles.marker}
						// Where the project stands draws hollow, as on the graph.
						data-marker={
							point.kind === "stage" && isCurrent ? "now" : point.kind
						}
						style={{
							color:
								checkpoint && point.kind !== "now"
									? CHECKPOINT_COLOR
									: statusColor,
						}}
					/>
					<Typography.Text strong className={styles.title}>
						{title}
					</Typography.Text>
				</Flex>
				<Typography.Text type="secondary">{line}</Typography.Text>
				{point.kind === "now" && (
					<Progress
						size="small"
						strokeColor={CHECKPOINT_COLOR}
						percent={Math.round(((day ?? 1) / CHECKPOINT_DAYS) * 100)}
					/>
				)}
			</Flex>

			<Divider style={{ margin: 0 }} />

			<Flex align="center" gap={12}>
				<AppAvatar
					shape="square"
					size={40}
					src={project.coverImage ?? undefined}
					style={{ flex: "0 0 auto", borderRadius: "var(--gd-radius-control)" }}
				>
					{initials(project.name)}
				</AppAvatar>
				<Flex vertical className={styles.project}>
					<Typography.Text strong ellipsis>
						{project.name}
					</Typography.Text>
					<Badge
						color={statusColor}
						text={
							<Typography.Text type="secondary" className={styles.status}>
								{statusLabels[project.status]}
							</Typography.Text>
						}
					/>
				</Flex>
				<Tooltip title={t("lab.projectTrails.openProject", "Open project")}>
					<Button
						size="small"
						href={`/project/${project.slug}`}
						target="_blank"
						rel="noopener"
						icon={<IconExternalLink size={14} />}
						aria-label={t("lab.projectTrails.openProject", "Open project")}
					/>
				</Tooltip>
			</Flex>
		</Flex>
	);
}
