"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type { ReactNode } from "react";
import { useAccess } from "@/components/access/AccessProvider";
import WorkflowTasksPanel from "@/components/WorkflowContent/WorkflowTasksPanel";
import { useCheckpoint } from "@/hooks/checkpoints";
import type { ProjectWorkflowWithSteps } from "@/types/workflow";
import { ActivityFeed } from "./ActivityFeed";
import { CheckpointAside } from "./CheckpointAside";
import styles from "./style.module.scss";

/** The Workflow tab's own query, so the sidebar and the path share one fetch. */
export const useProjectWorkflow = (projectId: string) =>
	useQuery({
		// VacancyModal caches the raw response under ["project-workflow", id].
		queryKey: ["project-workflow", projectId, "path"],
		queryFn: async () =>
			(
				await axios.get<ProjectWorkflowWithSteps>(
					"/api/user/project/workflow",
					{ params: { projectId } },
				)
			).data,
		refetchOnWindowFocus: false,
	});

/**
 * The Workflow sidebar: the running checkpoint, the stage's tasks and the
 * project's activity. Shown beside the path and beside Curator's Review alike;
 * `children` go first — the people in a call.
 */
export function WorkflowAside({
	projectId,
	checkpointId,
	children,
	withCheckpoint = true,
}: {
	projectId: string;
	checkpointId?: string;
	children?: ReactNode;
	/** Off on Path to Checkpoint, which is the checkpoint itself. */
	withCheckpoint?: boolean;
}) {
	const { can } = useAccess();
	const { data: workflow } = useProjectWorkflow(projectId);
	const { data: detail } = useCheckpoint(checkpointId);
	const current = workflow?.currentStep;

	return (
		<aside className={styles.aside}>
			{children}
			{withCheckpoint && detail && (
				<CheckpointAside
					checkpoint={detail}
					canManage={can("project.checkpoints.manage")}
				/>
			)}
			{current && (
				<WorkflowTasksPanel
					tasks={current.tasks.map((task) => ({
						id: task.id,
						label: task.name || task.description || "",
						description: task.name ? task.description : null,
						required: task.required,
						done: task.done,
					}))}
					showHint={false}
					stageName={current.name ?? undefined}
				/>
			)}
			<ActivityFeed projectId={projectId} sprints={detail?.sprints} />
		</aside>
	);
}
