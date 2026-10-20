"use client";

import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import axios from "axios";
import type {
	CheckpointCuratorKind,
	CheckpointStatus,
	CheckpointVerdict,
} from "@/config/prisma-enums";
import type { RefundReason, RefundRowReason } from "@/lib/checkpoint-refund";
import type {
	AdminCheckpointsPageDto,
	AdvisorCheckpointDto,
	AdvisorProjectDto,
	CheckpointRefundQuoteDto,
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
			"Withdrawal within 14 days",
		),
		curatorGone: t(
			"admin.checkpoints.refund.reason.curatorGone",
			"Curator gone, no replacement",
		),
		noVerdict: t(
			"admin.checkpoints.refund.reason.noVerdict",
			"No verdict by day 31",
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
		part: number;
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
