"use client";

import type { ReactNode } from "react";
import { ActivityFeed } from "@/components/WorkflowPath/ActivityFeed";
import styles from "@/components/WorkflowPath/style.module.scss";
import { WorkflowAside } from "@/components/WorkflowPath/WorkflowAside";
import { useCheckpoint } from "@/hooks/checkpoints";
import type { CheckpointCallDto } from "@/types/checkpoint-call";

/**
 * Path to Checkpoint keeps the Workflow sidebar, less the checkpoint it is.
 * A pro curator outside the project gets the people in the call and the
 * project's activity, read through the checkpoint (12.08.10).
 */
export function CuratorAside({
	projectId,
	checkpointId,
	children,
}: {
	projectId: string | null;
	checkpointId: string;
	children?: ReactNode;
}) {
	if (!projectId) {
		return (
			<CuratorActivity checkpointId={checkpointId}>{children}</CuratorActivity>
		);
	}

	return (
		<WorkflowAside
			projectId={projectId}
			checkpointId={checkpointId}
			withCheckpoint={false}
		>
			{children}
		</WorkflowAside>
	);
}

function CuratorActivity({
	checkpointId,
	children,
}: {
	checkpointId: string;
	children?: ReactNode;
}) {
	const { data: detail } = useCheckpoint(checkpointId);

	return (
		<aside className={styles.aside}>
			{children}
			<ActivityFeed source={{ checkpointId }} sprints={detail?.sprints} />
		</aside>
	);
}

/** The project whose sidebar a call's viewer may read: the team's, not a pro curator's. */
export const teamProject = (
	call: Pick<CheckpointCallDto, "role" | "project">,
) => (call.role === "team" ? call.project.id : null);
