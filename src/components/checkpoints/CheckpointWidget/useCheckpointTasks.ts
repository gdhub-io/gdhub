"use client";

import { useTranslate } from "@tolgee/react";
import dayjs from "dayjs";
import { useAccess } from "@/components/access/AccessProvider";
import type { WorkflowTaskItem } from "@/components/WorkflowContent/WorkflowTasksPanel";
import { CheckpointItemKind, CheckpointStatus } from "@/config/prisma-enums";
import { useCheckpoints } from "@/hooks/checkpoints";
import { dateOfDay } from "@/lib/checkpoint-plan";
import { CHECKPOINT_DAYS } from "@/schemas/checkpoint";

/**
 * The running checkpoint's tasks for the Workflow list: the sprint's devlog
 * while it is owed, then every outcome the author promised for day 28 — done
 * once something proves it. Cut outcomes are gone from the promise, so from
 * here too. The same query as the widget above, so no second request.
 */
export const useCheckpointTasks = (projectId: string): WorkflowTaskItem[] => {
	const { t } = useTranslate();
	const { can } = useAccess();
	const allowed = can("project.checkpoints.view");
	const { data } = useCheckpoints(allowed ? projectId : undefined);

	const checkpoint = data?.current;

	if (!checkpoint?.startedAt || checkpoint.status !== CheckpointStatus.Active) {
		return [];
	}

	const { startedAt, next } = checkpoint;
	const on = (day: number) =>
		dayjs.utc(dateOfDay(startedAt, day)).format("ddd, D MMM");
	const by = (day: number) =>
		t("checkpoints.widget.by", "by {date}", { date: on(day) });

	const devlog: WorkflowTaskItem[] =
		next?.kind === "devlog"
			? [
					{
						id: `checkpoint-devlog-${checkpoint.id}-${next.sprint}`,
						label: t(
							"checkpoints.widget.devlog",
							"Publish the sprint {n} devlog",
							{ n: next.sprint },
						),
						required: false,
						done: false,
						due: {
							overdue: next.overdue,
							label: next.overdue
								? t("checkpoints.widget.overdue", "Overdue since {date}", {
										date: on(next.day),
									})
								: by(next.day),
						},
					},
				]
			: [];

	const outcomes = checkpoint.items
		.filter((item) => item.kind === CheckpointItemKind.Outcome && !item.cut)
		.map((item) => ({
			id: `checkpoint-outcome-${item.id}`,
			label: item.text,
			required: false,
			done: !!item.artifact,
			due: { overdue: false, label: by(CHECKPOINT_DAYS) },
		}));

	return [...devlog, ...outcomes];
};
