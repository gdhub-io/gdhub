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
import type { ProjectActivity } from "@/repositories/project-activity.repository";
import type {
	CheckpointEvidenceBody,
	CheckpointItemInput,
} from "@/schemas/checkpoint";
import type { CheckoutStart } from "@/services/payments/types";
import type {
	AdvisorCheckpointDto,
	AdvisorProjectDto,
	CheckpointCalendarDto,
	CheckpointCurator,
	CheckpointDto,
	CheckpointListResponse,
	PulseViewDto,
	VerdictContextDto,
} from "@/types/checkpoints";

// One size for every screen, so they all share one cached list and one request.
const LIST_LIMIT = 50;

/**
 * What is on the go, what is behind, and whether another one can be started —
 * one request, because the tab shows all three at once.
 */
export const useCheckpoints = (projectId?: string) =>
	useQuery({
		queryKey: ["project-checkpoints", projectId],
		queryFn: async () =>
			(
				await axios.get<CheckpointListResponse>("/api/checkpoint", {
					params: { projectId, limit: LIST_LIMIT },
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

/** A write to one of the checkpoint's sub-routes that answers with the whole checkpoint. */
const useCheckpointWrite = <B>(
	id: string | undefined,
	path: string,
	method: "post" | "delete" = "post",
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: B) =>
			(
				await axios.request<CheckpointDto>({
					method,
					url: `/api/checkpoint/${id}/${path}`,
					data,
				})
			).data,
		onSuccess: (checkpoint) => {
			queryClient.setQueryData(["checkpoint", id], checkpoint);
			queryClient.invalidateQueries({
				queryKey: ["project-checkpoints", checkpoint.projectId],
			});
		},
	});
};

/** Add an artifact to the outcomes it proves; each keeps the artifacts it has. */
export const useAttachEvidence = (id?: string) =>
	useCheckpointWrite<CheckpointEvidenceBody>(id, "evidence");

/** Let one artifact go from one outcome. */
export const useDetachEvidence = (id?: string) =>
	useCheckpointWrite<{ artifactId: string; itemId: string }>(
		id,
		"evidence",
		"delete",
	);

/**
 * Opens the checkout for a draft and hands back where the author pays: a hosted
 * page, or a Paddle transaction for its overlay.
 *
 * It starts nothing. The checkpoint leaves `Draft` when the provider calls the
 * webhook, so an author who closes the tab has spent nothing and still has
 * their draft.
 */
export const useCheckpointCheckout = (id?: string) =>
	useMutation({
		mutationFn: async (legal: LegalAcceptanceInput[]) =>
			(
				await axios.post<CheckoutStart>(`/api/checkpoint/${id}/pay`, {
					legal,
					startNow: true,
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
		mutationFn: async ({
			accept,
			legal,
		}: {
			accept: boolean;
			legal?: LegalAcceptanceInput[];
		}) =>
			(
				await axios.post<{ accepted: boolean }>(
					`/api/checkpoint/${id}/curator`,
					{ accept, legal },
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

/** The room of the checkpoint's chat; the server opens it on first ask. */
export const useCheckpointChat = (id?: string) =>
	useMutation({
		mutationFn: async () =>
			(await axios.post<{ roomId: string }>(`/api/checkpoint/${id}/chat`)).data,
	});

/** Approved curators at an expert level; with a stage, only those who curate it. */
export const useCheckpointCurators = (stage?: string | null, enabled = true) =>
	useQuery({
		queryKey: ["checkpoint-curators", stage ?? null],
		enabled,
		queryFn: async () =>
			(
				await axios.get<CheckpointCurator[]>("/api/checkpoint/curators", {
					params: { stage },
				})
			).data,
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

/** Whose activity: a project, or the project of a checkpoint its curator reads. */
export type ActivitySource = { projectId: string } | { checkpointId: string };

/** The project's activity, newest first, a page further back on each fetch. */
export const useProjectActivity = (source: ActivitySource) =>
	useInfiniteQuery({
		queryKey: ["project-activity", source],
		queryFn: async ({ pageParam }) =>
			(
				await axios.get<{ events: ProjectActivity[]; next: string | null }>(
					"projectId" in source
						? "/api/user/project/activity"
						: `/api/checkpoint/${source.checkpointId}/activity`,
					{ params: { ...source, before: pageParam ?? undefined } },
				)
			).data,
		initialPageParam: null as string | null,
		getNextPageParam: (page) => page.next,
	});

/** The pulse page's one button; the signed token stands in for a session. */
export const useConfirmPulse = (token: string) =>
	useMutation({
		mutationFn: async () =>
			(await axios.post<PulseViewDto>(`/api/pulse/${token}`)).data,
	});

/** Every date of the checkpoint, for its Calendar tab. */
export const useCheckpointCalendar = (id: string) =>
	useQuery({
		queryKey: ["checkpoint-calendar", id],
		queryFn: async () =>
			(await axios.get<CheckpointCalendarDto>(`/api/checkpoint/${id}/calendar`))
				.data,
	});
