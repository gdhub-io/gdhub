"use client";

import { CheckpointStatus } from "@/config/prisma-enums";
import { useCheckpoints } from "@/hooks/checkpoints";
import { useCurrentProject } from "@/hooks/project";

/**
 * The draft the start flow is editing, resolved from the project's one
 * unfinished checkpoint.
 *
 * Every step needs the same three things and the same loading rule: a disabled
 * TanStack query reports `isPending`, not `isLoading`, so gating on the wrong
 * one flashes the empty state before the project id has even arrived.
 */
export const useCheckpointDraft = () => {
	const { project, isLoading: projectLoading } = useCurrentProject();
	const { data, isPending } = useCheckpoints(project?.id);

	return {
		project,
		loading: projectLoading || isPending,
		draft:
			data?.current?.status === CheckpointStatus.Draft ? data.current : null,
		base: `/user/project/${project?.slug}/checkpoints`,
	};
};
