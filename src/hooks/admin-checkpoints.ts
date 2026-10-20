"use client";

import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";
import type { CheckpointStatus } from "@/config/prisma-enums";
import type { RefundReason } from "@/lib/checkpoint-refund";
import type {
	AdminCheckpointsPage,
	CheckpointRefundQuote,
} from "@/repositories/checkpoint-refund";

const LIST_KEY = ["admin", "checkpoints", "list"];

const URL = "/api/admin/checkpoints";

export type AdminCheckpointsFilter = {
	status?: CheckpointStatus;
	q?: string;
	page: number;
};

export const useAdminCheckpoints = (filter: AdminCheckpointsFilter) =>
	useQuery({
		queryKey: [...LIST_KEY, filter],
		queryFn: async () =>
			(await axios.get<AdminCheckpointsPage>(URL, { params: filter })).data,
		placeholderData: keepPreviousData,
	});

export const useRefundQuote = (checkpointId?: string) =>
	useQuery({
		queryKey: ["admin", "checkpoints", "refund", checkpointId],
		queryFn: async () =>
			(await axios.get<CheckpointRefundQuote>(`${URL}/${checkpointId}/refund`))
				.data,
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
			queryClient.invalidateQueries({ queryKey: ["admin", "checkpoints"] }),
	});
};
