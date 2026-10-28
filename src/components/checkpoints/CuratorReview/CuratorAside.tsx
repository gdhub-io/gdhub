"use client";

import type { ReactNode } from "react";
import { WorkflowAside } from "@/components/WorkflowPath/WorkflowAside";
import type { CheckpointCallDto } from "@/repositories/checkpoint-call";

/**
 * Path to Checkpoint keeps the Workflow sidebar, less the checkpoint it is.
 * It is the team's to read: a pro curator outside the project gets the people
 * in the call alone.
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
	if (!projectId) return children ? <aside>{children}</aside> : null;

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

/** The project whose sidebar a call's viewer may read: the team's, not a pro curator's. */
export const teamProject = (
	call: Pick<CheckpointCallDto, "role" | "project">,
) => (call.role === "team" ? call.project.id : null);
