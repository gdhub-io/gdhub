"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type { CheckpointArtifactRef } from "@/types/checkpoints";

/** The project's artifacts, for the evidence pickers on the goal card. */
export const useProjectArtifacts = (projectId?: string) =>
	useQuery({
		queryKey: ["project-artifacts", projectId],
		queryFn: async () =>
			(
				await axios.get<CheckpointArtifactRef[]>(
					"/api/user/project/artifacts",
					{ params: { projectId } },
				)
			).data,
		enabled: !!projectId,
	});
