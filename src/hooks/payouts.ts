"use client";

import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";
import type { ExpertInvoicing } from "@/config/prisma-enums";
import type { LegalAcceptanceInput } from "@/lib/legal/accept";
import type {
	AdminPayoutsDto,
	CuratorEarningsDto,
	PaidWorkDto,
	PayoutDetailsDto,
} from "@/types/checkpoints";

const ADMIN = ["admin", "payouts"];
const ADMIN_URL = "/api/admin/payouts";

/** `month` as `YYYY-MM`; the server's default (last month) when omitted. */
export const useAdminPayouts = (month?: string) =>
	useQuery({
		queryKey: [...ADMIN, "list", month ?? "default"],
		queryFn: async () =>
			(await axios.get<AdminPayoutsDto>(ADMIN_URL, { params: { month } })).data,
		placeholderData: keepPreviousData,
	});

export const usePayoutDetails = (curatorId?: string) =>
	useQuery({
		queryKey: [...ADMIN, "details", curatorId],
		queryFn: async () =>
			(
				await axios.get<PayoutDetailsDto>(`${ADMIN_URL}/details`, {
					params: { curatorId },
				})
			).data,
		enabled: !!curatorId,
		// Read fresh each time the dialog opens: what was seen is what is paid to.
		staleTime: 0,
		gcTime: 0,
	});

export type MarkPaidBody = {
	curatorId: string;
	month: string;
	paidOn: string;
	reference: string;
	detailsSeenAt: string;
};

export const useMarkPayoutPaid = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (body: MarkPaidBody) =>
			(await axios.post<{ amount: number }>(ADMIN_URL, body)).data,
		// Refetched whichever way it went: a refusal can mean another admin paid it.
		onSettled: () => queryClient.invalidateQueries({ queryKey: ADMIN }),
	});
};

export const useSavePayoutNote = (payoutId: string) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (note: string) =>
			(
				await axios.patch<{ note: string | null }>(`${ADMIN_URL}/${payoutId}`, {
					note,
				})
			).data,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN }),
	});
};

export const useCuratorEarnings = () =>
	useQuery({
		queryKey: ["advisor", "earnings"],
		queryFn: async () =>
			(await axios.get<CuratorEarningsDto>("/api/advisor/earnings")).data,
	});

const PAID_WORK = ["advisor", "paid-work"];

export const usePaidWork = () =>
	useQuery({
		queryKey: PAID_WORK,
		queryFn: async () =>
			(await axios.get<PaidWorkDto>("/api/advisor/paid-work")).data,
	});

export type PaidWorkBody = {
	holder: string;
	account?: string;
	invoicing: ExpertInvoicing;
	legal?: LegalAcceptanceInput[];
};

export const useSavePaidWork = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (body: PaidWorkBody) =>
			(await axios.put<PaidWorkDto>("/api/advisor/paid-work", body)).data,
		onSuccess: (saved) => {
			queryClient.setQueryData(PAID_WORK, saved);
			return queryClient.invalidateQueries({
				queryKey: ["advisor", "earnings"],
			});
		},
	});
};
