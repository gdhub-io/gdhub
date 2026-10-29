"use client";

import { useTranslate } from "@tolgee/react";
import { Skeleton } from "antd";
import { useAccess } from "@/components/access/AccessProvider";
import { SPRINTS_PER_CHECKPOINT } from "@/config/checkpoint";
import { useCheckpoint } from "@/hooks/checkpoints";
import { formatShort } from "./dates";
import { SprintChecklist } from "./SprintChecklist";

/**
 * Curator's Review, the Sprint tab: what the sprint a session opens asks of
 * the team — session 1 opens sprint 1, the final one closes sprint 4 — and,
 * while that sprint runs, the action behind each line, as on the path.
 */
export function SprintTab({
	checkpointId,
	index,
	project,
}: {
	checkpointId: string;
	/** The session picked in the switcher. */
	index: number;
	project: { id: string; name: string; slug: string };
}) {
	const { t } = useTranslate();
	const { can } = useAccess();
	const { data: checkpoint, isPending } = useCheckpoint(checkpointId);
	if (isPending) return <Skeleton active paragraph={{ rows: 4 }} />;

	const number = Math.min(index, SPRINTS_PER_CHECKPOINT);
	const sprint = checkpoint?.sprints?.find((row) => row.number === number);
	if (!checkpoint || !sprint) return null;

	return (
		<SprintChecklist
			checkpoint={checkpoint}
			sprint={sprint}
			project={project}
			canManage={can("project.checkpoints.manage")}
			head={t(
				"workflow.path.check.head-sprint",
				"By the end of Sprint {number} · {date}",
				{ number: String(sprint.number), date: formatShort(sprint.to) },
			)}
		/>
	);
}
