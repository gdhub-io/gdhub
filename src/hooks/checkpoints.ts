"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { CheckpointCuratorKind } from "@/config/prisma-enums";
import type { CheckpointItemInput } from "@/schemas/checkpoint";
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
export const useCheckpoints = (projectId?: string, page = 1) =>
	useQuery({
		queryKey: listKey(projectId, page),
		queryFn: async () =>
			(
				await axios.get<CheckpointListResponse>("/api/checkpoint", {
					params: { projectId, page },
				})
			).data,
		enabled: !!projectId,
	});

export const useCheckpoint = (id?: string) =>
	useQuery({
		queryKey: ["checkpoint", id],
		queryFn: async () =>
			(await axios.get<CheckpointDto>(`/api/checkpoint/${id}`)).data,
		enabled: !!id,
	});

/** One side of the goal card, or the sentence. Only a `Draft` accepts it. */
export const useUpdateCheckpoint = (id?: string) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (body: {
			goal?: string;
			curatorKind?: CheckpointCuratorKind;
			inputs?: CheckpointItemInput[];
			outcomes?: CheckpointItemInput[];
		}) => (await axios.put<CheckpointDto>(`/api/checkpoint/${id}`, body)).data,
		onSuccess: (checkpoint) => {
			queryClient.setQueryData(["checkpoint", id], checkpoint);
			queryClient.invalidateQueries({ queryKey: ["project-checkpoints"] });
		},
	});
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
