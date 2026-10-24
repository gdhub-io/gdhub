"use client";

import { IconFlag } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Flex, Skeleton, Typography } from "antd";
import dayjs from "dayjs";
import { RoadmapChart } from "@/components/RoadmapChart";
import { EmptyState } from "@/components/ui/EmptyState";
import { ActivityFeed } from "../parts";
import styles from "../style.module.scss";
import type { CardActivity, CardStep } from "../types";
import { useCardSection } from "../useSection";

const { Text } = Typography;

export function WorkflowTab({
	projectId,
	startedAt,
}: {
	projectId: string;
	startedAt: string;
}) {
	const { t } = useTranslate();
	const { data, isLoading } = useCardSection<CardStep[]>(projectId, "workflow");

	if (isLoading)
		return <Skeleton active title={false} paragraph={{ rows: 7 }} />;

	if (!data?.length) {
		return (
			<EmptyState
				icon={IconFlag}
				title={t("scout.card.workflow.empty", "No workflow yet")}
				description={t(
					"scout.card.workflow.emptyHint",
					"The project's stages and their dates will appear here once its roadmap is set.",
				)}
			/>
		);
	}

	const currentStep = data.find((step) => step.isCurrent);
	const byOrder = new Map(data.map((step) => [step.order, step]));
	// How the stage before was left: after a checkpoint verdict, or by its tasks.
	const closedNote = (left?: CardStep) => {
		if (!left?.closedBy) return undefined;
		if (left.closedBy === "tasks") {
			return t(
				"scout.card.workflow.closedByTasks",
				"{stage} closed by its own tasks",
				{
					stage: left.name,
				},
			);
		}
		return t(
			"scout.card.workflow.closedByCheckpoint",
			"{stage} closed after the Checkpoint {number} verdict · {curator}",
			{
				stage: left.name,
				number: String(left.closedBy.number),
				curator:
					left.closedBy.curator ??
					t("scout.card.workflow.aiCurator", "AI curator"),
			},
		);
	};

	// Stages the project has actually entered, newest first, with its own start
	// as the last line — a log that begins nowhere reads as truncated.
	//
	// Read from `plannedAt` and not `finishedAt`: moving a project stamps the
	// step's date when it is empty but never writes `finishedAt` or `done`, so
	// filtering on those left every project with an empty log. The date is the
	// one the roadmap shows, which the author can edit — it is when the stage
	// began as the team states it, not an audit stamp.
	//
	// Shaped as activities so the log renders through `ActivityFeed`: the rows
	// are the same rows the Activities tab draws, and one component owns the
	// tile, the label and the date.
	const log: CardActivity[] = data
		.filter(
			(step) =>
				step.order > 0 &&
				(!currentStep || step.order <= currentStep.order) &&
				(step.finishedAt ?? step.plannedAt),
		)
		.map(
			(step): CardActivity => ({
				id: step.id,
				kind: "step",
				subject: step.name,
				author: null,
				at: (step.finishedAt ?? step.plannedAt) as string,
				note: closedNote(byOrder.get(step.order - 1)),
			}),
		)
		.sort((a, b) => dayjs(b.at).valueOf() - dayjs(a.at).valueOf())
		.concat({
			id: "project-created",
			kind: "created",
			subject: null,
			author: null,
			at: startedAt,
		});

	return (
		<Flex vertical gap={20}>
			<Flex vertical gap={12}>
				<Text className={styles.sectionTitle}>
					{t("scout.card.workflow.title", "Workflow")}
				</Text>

				{/* The author's own roadmap, read-only: a scout and the team should
				    be looking at the same picture of where the project is. */}
				{currentStep ? (
					<RoadmapChart workflow={{ projectId, steps: data, currentStep }} />
				) : (
					<Text type="secondary">
						{t("scout.card.workflow.noStage", "No stage set yet")}
					</Text>
				)}
			</Flex>

			<Flex vertical gap={12}>
				<Text className={styles.sectionTitle}>
					{t("scout.card.workflow.log", "Log")}
				</Text>
				<ActivityFeed items={log} />
			</Flex>
		</Flex>
	);
}

/**
 * The "To release" column, opened up.
 *
 * Three numbers a scout weighs against each other — what the team asks for,
 * what finishing would take, what has already gone in — and then the inputs the
 * middle one is built from, because a figure nobody can audit is a rumour.
 */
