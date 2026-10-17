"use client";

import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";
import type {
	CheckpointCuratorKind,
	CheckpointVerdict,
} from "@/config/prisma-enums";
import type { LegalAcceptanceInput } from "@/lib/legal/accept";
import type { CheckpointCurator } from "@/repositories/checkpoint-curators";
import type { PulseViewDto } from "@/repositories/checkpoint-pulse";
import type { ProjectActivity } from "@/repositories/project-activity.repository";
import type {
	CheckpointEvidenceBody,
	CheckpointItemInput,
} from "@/schemas/checkpoint";
import type { GoalCheckResult } from "@/services/checkpoint-curator/types";
import type {
	AdvisorCheckpointDto,
	AdvisorProjectDto,
	CheckpointDto,
	CheckpointListResponse,
	VerdictContextDto,
} from "@/types/checkpoints";

const listKey = (projectId?: string, page = 1, limit?: number) => [
	"project-checkpoints",
	projectId,
	page,
	limit,
];

/**
 * What is on the go, what is behind, and whether another one can be started —
 * one request, because the tab shows all three at once.
 */
export const useCheckpoints = (projectId?: string, page = 1, limit?: number) =>
	useQuery({
		queryKey: listKey(projectId, page, limit),
		queryFn: async () =>
			(
				await axios.get<CheckpointListResponse>("/api/checkpoint", {
					params: { projectId, page, limit },
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
			// Awaited: the purchase reads the list to decide which steps are open.
			return queryClient.invalidateQueries({
				queryKey: ["project-checkpoints", checkpoint.projectId],
			});
		},
	});
};

/** A POST to one of the checkpoint's sub-routes that answers with the whole checkpoint. */
const useCheckpointPost = <B>(id: string | undefined, path: string) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (body: B) =>
			(await axios.post<CheckpointDto>(`/api/checkpoint/${id}/${path}`, body))
				.data,
		onSuccess: (checkpoint) => {
			queryClient.setQueryData(["checkpoint", id], checkpoint);
			queryClient.invalidateQueries({
				queryKey: ["project-checkpoints", checkpoint.projectId],
			});
		},
	});
};

/** Bind an artifact to the outcomes it proves, or let one go with `artifactId: null`. */
export const useAttachEvidence = (id?: string) =>
	useCheckpointPost<CheckpointEvidenceBody>(id, "evidence");

/**
 * Opens Stripe Checkout for a draft and hands back where to send the author.
 *
 * It starts nothing. The checkpoint leaves `Draft` when Stripe calls the
 * webhook, so an author who closes the tab has spent nothing and still has
 * their draft.
 */
export const useCheckpointCheckout = (id?: string) =>
	useMutation({
		mutationFn: async (legal: LegalAcceptanceInput[]) =>
			(
				await axios.post<{ url: string }>(`/api/checkpoint/${id}/pay`, {
					legal,
				})
			).data,
	});

/**
 * The curator's answer to a checkpoint handed to them. Accepting captures the
 * money that was held and starts the 28 days; turning it down releases it.
 */
export const useAnswerCheckpoint = (id?: string) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (accept: boolean) =>
			(
				await axios.post<{ accepted: boolean }>(
					`/api/checkpoint/${id}/curator`,
					{ accept },
				)
			).data,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["advisor-checkpoints"] });
			queryClient.invalidateQueries({ queryKey: ["advisor-checkpoint", id] });
		},
	});
};

/** One of them, opened. Null for a checkpoint this curator does not run. */
export const useAdvisorCheckpoint = (id?: string) =>
	useQuery({
		queryKey: ["advisor-checkpoint", id],
		queryFn: async () =>
			(await axios.get<AdvisorCheckpointDto>(`/api/advisor/checkpoints/${id}`))
				.data,
		enabled: !!id,
	});

/** The project behind a checkpoint, fetched when the curator opens its card. */
export const useAdvisorProject = (checkpointId?: string, enabled = true) =>
	useQuery({
		queryKey: ["advisor-project", checkpointId],
		queryFn: async () =>
			(
				await axios.get<AdvisorProjectDto>(
					`/api/advisor/checkpoints/${checkpointId}/project`,
				)
			).data,
		enabled: !!checkpointId && enabled,
	});

/** The draft, the times and the last build the verdict modal reads. */
export const useVerdictContext = (checkpointId?: string) =>
	useQuery({
		queryKey: ["verdict-context", checkpointId],
		queryFn: async () =>
			(
				await axios.get<VerdictContextDto>(
					`/api/advisor/checkpoints/${checkpointId}/verdict`,
				)
			).data,
		enabled: !!checkpointId,
	});

export type VerdictBody = { verdict: CheckpointVerdict | null; note: string };

export const useSaveVerdictDraft = (checkpointId?: string) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (body: VerdictBody) =>
			(
				await axios.put(
					`/api/advisor/checkpoints/${checkpointId}/verdict`,
					body,
				)
			).data,
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: ["verdict-context", checkpointId],
			}),
	});
};

/** Sending is final: it closes the checkpoint and tells the author. */
export const useSendVerdict = (checkpointId?: string) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (body: { verdict: CheckpointVerdict; note: string }) =>
			(
				await axios.post(
					`/api/advisor/checkpoints/${checkpointId}/verdict`,
					body,
				)
			).data,
		// The modal closes on success; its context is never read again.
		onSuccess: () => {
			queryClient.removeQueries({
				queryKey: ["verdict-context", checkpointId],
			});
			return queryClient.invalidateQueries({
				queryKey: ["advisor-checkpoints"],
			});
		},
	});
};

/** The checkpoints handed to the signed-in curator, in three groups. */
export const useAdvisorCheckpoints = () =>
	useQuery({
		queryKey: ["advisor-checkpoints"],
		queryFn: async () =>
			(
				await axios.get<{
					asked: AdvisorCheckpointDto[];
					running: AdvisorCheckpointDto[];
					closed: AdvisorCheckpointDto[];
					declined: AdvisorCheckpointDto[];
				}>("/api/advisor/checkpoints")
			).data,
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
 * The curator reads the goal against the team's hours when the author moves on
 * from Now. The server keeps the read while nothing behind it changed, so asking
 * twice costs one model call.
 */
export const useCheckGoal = (id?: string) =>
	useMutation({
		mutationFn: async () =>
			(await axios.post<GoalCheckResult>(`/api/checkpoint/${id}/goal-check`))
				.data,
	});

/** The room of the checkpoint's chat; the server opens it on first ask. */
export const useCheckpointChat = (id?: string) =>
	useMutation({
		mutationFn: async () =>
			(await axios.post<{ roomId: string }>(`/api/checkpoint/${id}/chat`)).data,
	});

/** Specialists who have said they take mentees, at an expert level. */
export const useCheckpointCurators = () =>
	useQuery({
		queryKey: ["checkpoint-curators"],
		queryFn: async () =>
			(await axios.get<CheckpointCurator[]>("/api/checkpoint/curators")).data,
	});

export const useCreateCheckpoint = (projectId?: string) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () =>
			(await axios.post<CheckpointDto>("/api/checkpoint", { projectId })).data,
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: ["project-checkpoints", projectId],
			}),
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

/** The team opened the previous checkpoint's verdict; ticks sprint 1's first line. */
export const useMarkVerdictRead = (id?: string) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			await axios.post(`/api/checkpoint/${id}/verdict-read`);
		},
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["checkpoint", id] }),
	});
};

/** The project's activity, newest first, a page further back on each fetch. */
export const useProjectActivity = (projectId?: string) =>
	useInfiniteQuery({
		queryKey: ["project-activity", projectId],
		queryFn: async ({ pageParam }) =>
			(
				await axios.get<{ events: ProjectActivity[]; next: string | null }>(
					"/api/user/project/activity",
					{ params: { projectId, before: pageParam ?? undefined } },
				)
			).data,
		initialPageParam: null as string | null,
		getNextPageParam: (page) => page.next,
		enabled: !!projectId,
	});

/** The pulse page's one button; the signed token stands in for a session. */
export const useConfirmPulse = (token: string) =>
	useMutation({
		mutationFn: async () =>
			(await axios.post<PulseViewDto>(`/api/pulse/${token}`)).data,
	});
