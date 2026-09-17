"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type {
	CheckpointCuratorKind,
	CheckpointItemKind,
} from "@/config/prisma-enums";
import type { CheckpointCurator } from "@/repositories/checkpoint-curators";
import type {
	CheckpointEvidenceBody,
	CheckpointItemInput,
	CheckpointScopeBody,
} from "@/schemas/checkpoint";
import type { GoalCheckResult } from "@/services/checkpoint-curator/types";
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
			curatorId?: string | null;
			acceptedTerms?: boolean;
			inputs?: CheckpointItemInput[];
			outcomes?: CheckpointItemInput[];
			/**
			 * The day the 28 days are meant to start, as `YYYY-MM-DD`: a day rather
			 * than an instant, so the server's UTC midnight is what gets stored.
			 */
			startedAt?: string | null;
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

/**
 * Opens Stripe Checkout for a draft and hands back where to send the author.
 *
 * It starts nothing. The checkpoint leaves `Draft` when Stripe calls the
 * webhook, so an author who closes the tab has spent nothing and still has
 * their draft.
 */
export const useCheckpointCheckout = (id?: string) =>
	useMutation({
		mutationFn: async () =>
			(await axios.post<{ url: string }>(`/api/checkpoint/${id}/pay`)).data,
	});

/**
 * Calling a checkpoint off before it starts, with the money back if any was
 * taken. Refused once the 28 days run.
 */
export const useCancelCheckpoint = (id?: string, projectId?: string) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () =>
			(await axios.post<{ refunded: boolean }>(`/api/checkpoint/${id}/cancel`))
				.data,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["checkpoint", id] });
			queryClient.invalidateQueries({
				queryKey: ["project-checkpoints", projectId],
			});
		},
	});
};

/**
 * The AI curator reading the goal card against the 28 days and the hours the
 * team has.
 *
 * Run when the payment question opens, not from a button: by then everything it
 * judges — what exists, what is promised, who curates, how many hours the team
 * put in — has been answered, and the remark lands where the author can still
 * press Edit. `signature` is those same facts: change any of them and this is a
 * different question, so it is asked again; come back without changing anything
 * and the answer is the one already paid for.
 */
export const useGoalCheck = (id?: string, signature?: string) =>
	useQuery<GoalCheckResult | null>({
		queryKey: ["goal-check", id, signature],
		queryFn: async () =>
			(await axios.post<GoalCheckResult>(`/api/checkpoint/${id}/goal-check`))
				.data,
		enabled: !!id && !!signature,
		staleTime: Number.POSITIVE_INFINITY,
		retry: false,
	});

/** Specialists who have said they take mentees, at an expert level. */
export const useCheckpointCurators = () =>
	useQuery({
		queryKey: ["checkpoint-curators"],
		queryFn: async () =>
			(await axios.get<CheckpointCurator[]>("/api/checkpoint/curators")).data,
	});

/**
 * The curator proposing the lines of the goal card, for an author who does not
 * know what to write. It suggests into the form; nothing is saved until the
 * author leaves the question, and every line is theirs to edit or drop.
 */
export const useSuggestLines = (id?: string) =>
	useMutation({
		mutationFn: async (kind: CheckpointItemKind) =>
			(
				await axios.post<{ lines: string[] }>(`/api/checkpoint/${id}/suggest`, {
					kind,
				})
			).data.lines,
	});

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
