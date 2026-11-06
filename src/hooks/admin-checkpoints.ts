"use client";

import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import axios from "axios";
import { WITHDRAWAL_DAYS } from "@/config/checkpoint";
import type {
	CheckpointCuratorKind,
	CheckpointStatus,
	CheckpointVerdict,
} from "@/config/prisma-enums";
import { VERDICT_DAY } from "@/lib/checkpoints/plan";
import type { RefundReason, RefundRowReason } from "@/lib/checkpoints/refund";
import type {
	CuratorJournalViewDto,
	JournalDraftDto,
	JournalDraftTarget,
} from "@/types/checkpoint-journal";
import type {
	AdminCheckpointsPageDto,
	AdvisorCheckpointDto,
	AdvisorProjectDto,
	CheckpointRefundQuoteDto,
	FreeCheckpointProjectDto,
	VerdictContextDto,
} from "@/types/checkpoints";

const ROOT = ["admin", "checkpoints"];
const LIST_KEY = [...ROOT, "list"];
const quoteKey = (checkpointId?: string) => [...ROOT, "refund", checkpointId];

const URL = "/api/admin/checkpoints";

export type AdminCheckpointsFilter = {
	status?: CheckpointStatus;
	stage?: string;
	curatorKind?: CheckpointCuratorKind;
	q?: string;
	page: number;
};

export const useAdminCheckpoints = (filter: AdminCheckpointsFilter) =>
	useQuery({
		queryKey: [...LIST_KEY, filter],
		queryFn: async () =>
			(await axios.get<AdminCheckpointsPageDto>(URL, { params: filter })).data,
		placeholderData: keepPreviousData,
	});

/** Frame 11.10: what the AI curator looked at, wrote and decided. */
export const useCuratorJournal = (checkpointId: string) =>
	useQuery({
		queryKey: [...ROOT, "journal", checkpointId],
		queryFn: async () =>
			(await axios.get<CuratorJournalViewDto>(`${URL}/${checkpointId}/journal`))
				.data,
	});

const draftPath = (checkpointId: string, target: JournalDraftTarget) =>
	"entryId" in target
		? `${URL}/${checkpointId}/journal/${target.entryId}`
		: `${URL}/${checkpointId}/journal/steps/${target.step}`;

/** A draft beside the current answer: regenerated, or the step rebuilt. Nothing is saved. */
export const useJournalDraft = (checkpointId: string) =>
	useMutation({
		mutationFn: async ({
			target,
			hint,
		}: {
			target: JournalDraftTarget;
			hint: string;
		}) =>
			(
				await axios.post<JournalDraftDto>(
					`${draftPath(checkpointId, target)}/${"entryId" in target ? "regenerate" : "rebuild"}`,
					{ hint },
				)
			).data,
	});

/** Replace: the draft becomes the answer, and the journal is read again. */
export const useReplaceJournalDraft = (checkpointId: string) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			target,
			draftKey,
		}: {
			target: JournalDraftTarget;
			draftKey: string;
		}) =>
			(
				await axios.post(`${draftPath(checkpointId, target)}/replace`, {
					draftKey,
				})
			).data,
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: [...ROOT, "journal", checkpointId],
			}),
	});
};

export const useRefundQuote = (checkpointId?: string) =>
	useQuery({
		queryKey: quoteKey(checkpointId),
		queryFn: async () =>
			(
				await axios.get<CheckpointRefundQuoteDto>(
					`${URL}/${checkpointId}/refund`,
				)
			).data,
		enabled: !!checkpointId,
	});

export const useIssueRefund = (checkpointId: string) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (reason: RefundReason) =>
			(
				await axios.post<{ refunded: number }>(
					`${URL}/${checkpointId}/refund`,
					{ reason },
				)
			).data,
		// Refetched whichever way it went: a refusal can mean it was refunded meanwhile.
		onSettled: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: LIST_KEY }),
				queryClient.invalidateQueries({ queryKey: quoteKey(checkpointId) }),
			]),
	});
};

/** Why money went back, in the words the list and the refund dialog both use. */
export const useRefundReasonLabels = (): Record<RefundRowReason, string> => {
	const { t } = useTranslate();

	return {
		withdrawal: t(
			"admin.checkpoints.refund.reason.withdrawal",
			"Withdrawal within {days} days",
			{ days: WITHDRAWAL_DAYS },
		),
		curatorGone: t(
			"admin.checkpoints.refund.reason.curatorGone",
			"Curator gone, no replacement",
		),
		noVerdict: t(
			"admin.checkpoints.refund.reason.noVerdict",
			"No verdict by day {day}",
			{ day: VERDICT_DAY },
		),
		missedCalls: t(
			"admin.checkpoints.refund.reason.missedCalls",
			"Calls never held",
		),
		checkpointCancelled: t(
			"admin.checkpoints.refund.reason.checkpointCancelled",
			"Cancelled before day 1",
		),
		curatorDeclined: t(
			"admin.checkpoints.refund.reason.curatorDeclined",
			"Curator declined",
		),
		stripeRefund: t(
			"admin.checkpoints.refund.reason.stripeRefund",
			"In Stripe",
		),
	};
};

export const useCheckpointProjectOptions = (query: string) =>
	useQuery({
		queryKey: [...ROOT, "projects", query],
		queryFn: async () =>
			(await axios.get<string[]>(`${URL}/projects`, { params: { q: query } }))
				.data,
		placeholderData: keepPreviousData,
	});

export type AdminVerdictDto = {
	checkpoint: AdvisorCheckpointDto;
	context: VerdictContextDto;
	project: AdvisorProjectDto;
	missed: {
		parts: number;
		provided: number;
		refund: number;
	} | null;
};

export const useAdminVerdict = (checkpointId?: string) =>
	useQuery({
		queryKey: [...ROOT, "verdict", checkpointId],
		queryFn: async () =>
			(await axios.get<AdminVerdictDto>(`${URL}/${checkpointId}/verdict`)).data,
		enabled: !!checkpointId,
	});

export const useSendAdminVerdict = (checkpointId: string) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (body: { verdict: CheckpointVerdict; note: string }) =>
			(
				await axios.post<{ refunded: number }>(
					`${URL}/${checkpointId}/verdict`,
					body,
				)
			).data,
		onSettled: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
	});
};

export const useAssignCurator = (checkpointId: string) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (body: {
			kind: CheckpointCuratorKind;
			userId?: string;
			reason: string;
		}) => (await axios.post(`${URL}/${checkpointId}/curator`, body)).data,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
	});
};

/** Deletes a checkpoint given for free. */
export const useDeleteCheckpoint = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (checkpointId: string) =>
			(await axios.delete(`${URL}/${checkpointId}`)).data,
		onSettled: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
	});
};

/** Frame 12.11.12: projects a free checkpoint can start on. */
export const useFreeCheckpointProjects = (query: string) =>
	useQuery({
		queryKey: [...ROOT, "free-projects", query],
		queryFn: async () =>
			(
				await axios.get<FreeCheckpointProjectDto[]>(`${URL}/free`, {
					params: { q: query },
				})
			).data,
		placeholderData: keepPreviousData,
	});

export const useStartFreeCheckpoint = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (body: {
			projectId: string;
			kind: CheckpointCuratorKind;
			userId?: string;
			firstCall?: string;
			reason: string;
		}) => (await axios.post(`${URL}/free`, body)).data,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
	});
};
