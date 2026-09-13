"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type {
	CheckpointDto,
	CheckpointListResponse,
} from "@/types/checkpoints";

const listKey = (projectId?: string, page = 1) => [
	"project-checkpoints",
	projectId,
	page,
];

/**
 * What is on the go, what is behind, and whether another one can be started —
 * one request, because the tab shows all three at once.
 */
export const useCheckpoints = (projectId?: string, page = 1) => {
	const query = useQuery({
		queryKey: listKey(projectId, page),
		queryFn: async () =>
			(
				await axios.get<CheckpointListResponse>("/api/checkpoint", {
					params: { projectId, page },
				})
			).data,
		enabled: !!projectId,
	});

	return query;
};

export const useCreateCheckpoint = (projectId?: string) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () =>
			(await axios.post<CheckpointDto>("/api/checkpoint", { projectId })).data,
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["project-checkpoints"] }),
	});
};

export const useDiscardCheckpoint = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => axios.delete(`/api/checkpoint/${id}`),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["project-checkpoints"] }),
	});
};
