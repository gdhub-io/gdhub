"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { CheckpointCuratorKind } from "@/config/prisma-enums";
import type {
	CheckpointEvidenceBody,
	CheckpointItemInput,
	CheckpointScopeBody,
} from "@/schemas/checkpoint";
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
			acceptedTerms?: boolean;
			inputs?: CheckpointItemInput[];
			outcomes?: CheckpointItemInput[];
			/** The day the 28 days are meant to start; null while it is not chosen. */
			startedAt?: Date | null;
		}) => (await axios.put<CheckpointDto>(`/api/checkpoint/${id}`, body)).data,
		onSuccess: (checkpoint) => {
			queryClient.setQueryData(["checkpoint", id], checkpoint);
			queryClient.invalidateQueries({ queryKey: ["project-checkpoints"] });
		},
	});
};

/**
 * The day-14 answer: cut, reword, add — or none of the three and a reason why
 * the list stands. It lands once, so the whole change is one request.
 */
export const useChangeScope = (id?: string) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (body: CheckpointScopeBody) =>
			(await axios.post<CheckpointDto>(`/api/checkpoint/${id}/scope`, body))
				.data,
		onSuccess: (checkpoint) => {
			queryClient.setQueryData(["checkpoint", id], checkpoint);
			queryClient.invalidateQueries({ queryKey: ["project-checkpoints"] });
		},
	});
};

/** Bind an artifact to the outcomes it proves, or let one go with `artifactId: null`. */
export const useAttachEvidence = (id?: string) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (body: CheckpointEvidenceBody) =>
			(await axios.post<CheckpointDto>(`/api/checkpoint/${id}/evidence`, body))
				.data,
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
